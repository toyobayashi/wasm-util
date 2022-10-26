// import { vol } from 'memfs-browser'
import type { IFs } from 'memfs-browser'
import { resolve } from './path'

import {
  WasiErrno,
  WasiRights,
  WasiWhence,
  FileControlFlag,
  WasiFileControlFlag,
  WasiFdFlag,
  WasiFileType,
  WasiClockid,
  WasiFstFlag
} from './types'

import type {
  Pointer,
  u8,
  u16,
  u64,
  size,
  filesize,
  fd,
  filedelta,
  exitcode
} from './types'

import { FileDescriptorTable, concatBuffer, toFileStat } from './fd'
import type { FileDescriptor, StandardOutput } from './fd'
import { WasiError } from './error'
import { isPromiseLike } from './util'
import { getRights } from './rights'
import type { Memory } from '../memory'
import { extendMemory } from '../memory'

function copyMemory (targets: Uint8Array[], src: Uint8Array): number {
  if (targets.length === 0 || src.length === 0) return 0
  let copied = 0
  let left = src.length - copied
  for (let i = 0; i < targets.length; ++i) {
    const target = targets[i]
    if (left < target.length) {
      target.set(src.subarray(copied, copied + left), 0)
      copied += left
      left = 0
      return copied
    }

    target.set(src.subarray(copied, copied + target.length), 0)
    copied += target.length
    left -= target.length
  }
  return copied
}

interface WrappedData {
  fds: FileDescriptorTable
  args: string[]
  env: string[]
  fs?: IFs
}

interface Dirent {
  name: string
  isDirectory(): boolean
  isFile(): boolean
  isBlockDevice(): boolean
  isCharacterDevice(): boolean
  isSymbolicLink(): boolean
  isFIFO(): boolean
  isSocket(): boolean
}

export interface Preopen {
  mappedPath: string
  realPath: string
}

const _memory = new WeakMap<WASI, Memory>()
const _wasi = new WeakMap<WASI, WrappedData>()

function getMemory (wasi: WASI): Memory {
  return _memory.get(wasi)!
}

function handleError (err: Error & { code?: string }): WasiErrno {
  if (err instanceof WasiError) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(err)
    }
    return err.errno
  }

  switch (err.code) {
    case 'ENOENT': return WasiErrno.ENOENT
    case 'EBADF': return WasiErrno.EBADF
    case 'EINVAL': return WasiErrno.EINVAL
    case 'EPERM': return WasiErrno.EPERM
    case 'EPROTO': return WasiErrno.EPROTO
    case 'EEXIST': return WasiErrno.EEXIST
    case 'ENOTDIR': return WasiErrno.ENOTDIR
    case 'EMFILE': return WasiErrno.EMFILE
    case 'EACCES': return WasiErrno.EACCES
    case 'EISDIR': return WasiErrno.EISDIR
    case 'ENOTEMPTY': return WasiErrno.ENOTEMPTY
    case 'ENOSYS': return WasiErrno.ENOSYS
  }

  throw err
}

function defineName<T extends Function> (name: string, f: T): T {
  Object.defineProperty(f, 'name', { value: name })
  return f
}

function syscallWrap<T extends (this: WASI, ...args: any[]) => WasiErrno | PromiseLike<WasiErrno>> (name: string, f: T): T {
  return defineName(name, function (this: any) {
    if (process.env.NODE_DEBUG_NATIVE === 'wasi') {
      const args = Array.prototype.slice.call(arguments)
      let debugArgs = [`${name}(${Array.from({ length: arguments.length }).map(() => '%d').join(', ')})`]
      debugArgs = debugArgs.concat(args)
      console.debug.apply(console, debugArgs)
    }
    let r: WasiErrno | PromiseLike<WasiErrno>
    try {
      r = f.apply(this, arguments as any)
    } catch (err: any) {
      return handleError(err)
    }

    if (isPromiseLike(r)) {
      return r.then(_ => _, handleError)
    }
    return r
  }) as unknown as T
}

function resolvePath (wasi: WrappedData, fileDescriptor: FileDescriptor, path: string, flags: number): string {
  let resolvedPath = resolve(fileDescriptor.realPath, path)
  if ((flags & 1) === 1) {
    try {
      resolvedPath = wasi.fs!.readlinkSync(resolvedPath) as string
    } catch (err: any) {
      if (err.code !== 'EINVAL' && err.code !== 'ENOENT') {
        throw err
      }
    }
  }
  return resolvedPath
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function readStdin (): Uint8Array {
  const value = window.prompt()
  if (value === null) return new Uint8Array()
  const buffer = new TextEncoder().encode(value + '\n')
  return buffer
}

export class WASI {
  constructor (args: string[], env: string[], preopens: Preopen[], stdio: readonly [number, number, number], filesystem: false | { type: 'memfs'; fs: IFs }) {
    const fs = filesystem ? filesystem.fs : undefined
    const fds = new FileDescriptorTable({
      size: 3,
      in: stdio[0],
      out: stdio[1],
      err: stdio[2],
      fs
    })
    _wasi.set(this, {
      fds,
      args,
      env,
      fs
    })

    if (preopens.length > 0) {
      if (!filesystem) throw new Error('filesystem is disabled, can not preopen directory')
      if (!fs) throw new Error('Node.js fs like implementation is not provided, can not preopen directory')
      for (let i = 0; i < preopens.length; ++i) {
        const realPath = fs.realpathSync(preopens[i].realPath, 'utf8') as string
        const fd = fs.openSync(realPath, 'r', 0o666)
        fds.insertPreopen(fd, preopens[i].mappedPath, realPath)
      }
    }
  }

  _setMemory?: (m: WebAssembly.Memory) => void = function _setMemory (this: WASI, m: WebAssembly.Memory) {
    if (!(m instanceof WebAssembly.Memory)) {
      throw new TypeError('"instance.exports.memory" property must be a WebAssembly.Memory')
    }
    _memory.set(this, extendMemory(m))
  }

  args_get = syscallWrap('args_get', function (argv: Pointer<Pointer<u8>>, argv_buf: Pointer<u8>): WasiErrno {
    argv = Number(argv)
    argv_buf = Number(argv_buf)
    if (argv === 0 || argv_buf === 0) {
      return WasiErrno.EINVAL
    }
    const { HEAPU8, view } = getMemory(this)
    const wasi = _wasi.get(this)!
    const args = wasi.args

    for (let i = 0; i < args.length; ++i) {
      const arg = args[i]

      view.setInt32(argv, argv_buf, true)
      argv += 4
      const data = encoder.encode(arg + '\0')
      HEAPU8.set(data, argv_buf)
      argv_buf += data.length
    }

    return WasiErrno.ESUCCESS
  })

  args_sizes_get = syscallWrap('args_sizes_get', function (argc: Pointer<size>, argv_buf_size: Pointer<size>): WasiErrno {
    argc = Number(argc)
    argv_buf_size = Number(argv_buf_size)
    if (argc === 0 || argv_buf_size === 0) {
      return WasiErrno.EINVAL
    }
    const { view } = getMemory(this)
    const wasi = _wasi.get(this)!
    const args = wasi.args
    view.setUint32(argc, args.length, true)
    view.setUint32(argv_buf_size, encoder.encode(args.join('\0') + '\0').length, true)
    return WasiErrno.ESUCCESS
  })

  environ_get = syscallWrap('environ_get', function (environ: Pointer<Pointer<u8>>, environ_buf: Pointer<u8>): WasiErrno {
    environ = Number(environ)
    environ_buf = Number(environ_buf)
    if (environ === 0 || environ_buf === 0) {
      return WasiErrno.EINVAL
    }
    const { HEAPU8, view } = getMemory(this)
    const wasi = _wasi.get(this)!
    const env = wasi.env

    for (let i = 0; i < env.length; ++i) {
      const pair = env[i]
      view.setInt32(environ, environ_buf, true)
      environ += 4
      const data = encoder.encode(pair + '\0')
      HEAPU8.set(data, environ_buf)
      environ_buf += data.length
    }

    return WasiErrno.ESUCCESS
  })

  environ_sizes_get = syscallWrap('environ_sizes_get', function (len: Pointer<size>, buflen: Pointer<size>): WasiErrno {
    len = Number(len)
    buflen = Number(buflen)
    if (len === 0 || buflen === 0) {
      return WasiErrno.EINVAL
    }
    const { view } = getMemory(this)
    const wasi = _wasi.get(this)!
    view.setUint32(len, wasi.env.length, true)
    view.setUint32(buflen, encoder.encode(wasi.env.join('\0') + '\0').length, true)
    return WasiErrno.ESUCCESS
  })

  clock_res_get = syscallWrap('clock_res_get', function (id: WasiClockid, resolution: Pointer<u64>): WasiErrno {
    resolution = Number(resolution)
    if (resolution === 0) {
      return WasiErrno.EINVAL
    }
    const { view } = getMemory(this)

    switch (id) {
      case WasiClockid.REALTIME:
        view.setBigUint64(resolution, BigInt(1000000), true)
        return WasiErrno.ESUCCESS
      case WasiClockid.MONOTONIC:
      case WasiClockid.PROCESS_CPUTIME_ID:
      case WasiClockid.THREAD_CPUTIME_ID:
        view.setBigUint64(resolution, BigInt(1000), true)
        return WasiErrno.ESUCCESS
      default: return WasiErrno.EINVAL
    }
  })

  clock_time_get = syscallWrap('clock_time_get', function (id: WasiClockid, _percision: u64, time: Pointer<u64>): WasiErrno {
    time = Number(time)
    if (time === 0) {
      return WasiErrno.EINVAL
    }
    const { view } = getMemory(this)

    switch (id) {
      case WasiClockid.REALTIME:
        view.setBigUint64(time, BigInt(Date.now()) * BigInt(1000000), true)
        return WasiErrno.ESUCCESS
      case WasiClockid.MONOTONIC:
      case WasiClockid.PROCESS_CPUTIME_ID:
      case WasiClockid.THREAD_CPUTIME_ID: {
        const t = performance.now()
        const s = Math.trunc(t)
        const ms = Math.floor((t - s) * 1000)

        const result = BigInt(s) * BigInt(1000000000) + BigInt(ms) * BigInt(1000000)

        view.setBigUint64(time, result, true)
        return WasiErrno.ESUCCESS
      }
      default: return WasiErrno.EINVAL
    }
  })

  fd_advise = syscallWrap('fd_advise', function (_fd: fd, _offset: filesize, _len: filesize, _advice: u8): WasiErrno {
    return WasiErrno.ENOSYS
  })

  fd_allocate = syscallWrap('fd_allocate', function (fd: fd, offset: filesize, len: filesize): WasiErrno {
    const wasi = _wasi.get(this)!
    const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_ALLOCATE, BigInt(0))
    const stat = wasi.fs!.fstatSync(fileDescriptor.fd, { bigint: true })
    if (stat.size < offset + len) {
      wasi.fs!.truncateSync(fileDescriptor.fd, Number(offset + len))
    }
    return WasiErrno.ESUCCESS
  })

  fd_close = syscallWrap('fd_close', function (fd: fd): WasiErrno {
    const wasi = _wasi.get(this)!
    const fileDescriptor = wasi.fds.get(fd, BigInt(0), BigInt(0))
    wasi.fs!.closeSync(fileDescriptor.fd)
    wasi.fds.remove(fd)
    return WasiErrno.ESUCCESS
  })

  fd_datasync = syscallWrap('fd_datasync', function (fd: fd): WasiErrno {
    const wasi = _wasi.get(this)!
    const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_DATASYNC, BigInt(0))
    wasi.fs!.fdatasyncSync(fileDescriptor.fd)
    return WasiErrno.ESUCCESS
  })

  fd_fdstat_get = syscallWrap('fd_fdstat_get', function (fd: fd, fdstat: Pointer): WasiErrno {
    fdstat = Number(fdstat)
    if (fdstat === 0) {
      return WasiErrno.EINVAL
    }
    const wasi = _wasi.get(this)!
    const fileDescriptor = wasi.fds.get(fd, BigInt(0), BigInt(0))
    const { view } = getMemory(this)
    view.setUint16(fdstat, fileDescriptor.type, true)
    view.setUint16(fdstat + 2, 0, true)
    view.setBigUint64(fdstat + 8, fileDescriptor.rightsBase, true)
    view.setBigUint64(fdstat + 16, fileDescriptor.rightsInheriting, true)
    return WasiErrno.ESUCCESS
  })

  fd_fdstat_set_flags = syscallWrap('fd_fdstat_set_flags', function (_fd: fd, _flags: number): WasiErrno {
    return WasiErrno.ENOSYS
  })

  fd_fdstat_set_rights = syscallWrap('fd_fdstat_set_rights', function (fd: fd, rightsBase: bigint, rightsInheriting: bigint): WasiErrno {
    const wasi = _wasi.get(this)!
    const fileDescriptor = wasi.fds.get(fd, BigInt(0), BigInt(0))
    if ((rightsBase | fileDescriptor.rightsBase) > fileDescriptor.rightsBase) {
      return WasiErrno.ENOTCAPABLE
    }

    if ((rightsInheriting | fileDescriptor.rightsInheriting) >
        fileDescriptor.rightsInheriting) {
      return WasiErrno.ENOTCAPABLE
    }

    fileDescriptor.rightsBase = rightsBase
    fileDescriptor.rightsInheriting = rightsInheriting
    return WasiErrno.ESUCCESS
  })

  fd_filestat_get = syscallWrap('fd_filestat_get', function (fd: fd, buf: Pointer): WasiErrno {
    buf = Number(buf)
    if (buf === 0) return WasiErrno.EINVAL
    const wasi = _wasi.get(this)!
    const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_FILESTAT_GET, BigInt(0))
    const stat = wasi.fs!.fstatSync(fileDescriptor.fd, { bigint: true })
    const { view } = getMemory(this)
    toFileStat(view, buf, stat)
    return WasiErrno.ESUCCESS
  })

  fd_filestat_set_size = syscallWrap('fd_filestat_set_size', function (fd: fd, size: filesize): WasiErrno {
    const wasi = _wasi.get(this)!
    const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_FILESTAT_SET_SIZE, BigInt(0))
    wasi.fs!.ftruncateSync(fileDescriptor.fd, Number(size))
    return WasiErrno.ESUCCESS
  })

  fd_filestat_set_times = syscallWrap('fd_filestat_set_times', function (fd: fd, atim: bigint, mtim: bigint, flags: WasiFstFlag): WasiErrno {
    const wasi = _wasi.get(this)!
    const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_FILESTAT_SET_TIMES, BigInt(0))
    if ((flags & WasiFstFlag.SET_ATIM_NOW) === WasiFstFlag.SET_ATIM_NOW) {
      atim = BigInt(Date.now() * 1000000)
    }

    if ((flags & WasiFstFlag.SET_MTIM_NOW) === WasiFstFlag.SET_MTIM_NOW) {
      mtim = BigInt(Date.now() * 1000000)
    }
    wasi.fs!.futimesSync(fileDescriptor.fd, Number(atim), Number(mtim))
    return WasiErrno.ESUCCESS
  })

  fd_pread = syscallWrap('fd_pread', function (fd: fd, iovs: Pointer, iovslen: size, offset: filesize, size: Pointer<size>): WasiErrno {
    iovs = Number(iovs)
    size = Number(size)
    if (iovs === 0 || size === 0) {
      return WasiErrno.EINVAL
    }
    const { HEAPU8, view } = getMemory(this)

    const wasi = _wasi.get(this)!
    const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_READ | WasiRights.FD_SEEK, BigInt(0))

    let totalSize = 0
    const ioVecs = Array.from({ length: Number(iovslen) }, (_, i) => {
      const offset = (iovs as number) + (i * 8)
      const buf = view.getInt32(offset, true)
      const bufLen = view.getUint32(offset + 4, true)
      totalSize += bufLen
      return HEAPU8.subarray(buf, buf + bufLen)
    })

    let nread: number = 0

    const buffer = new Uint8Array(totalSize)
    ;(buffer as any)._isBuffer = true
    const bytesRead = wasi.fs!.readSync(fileDescriptor.fd, buffer, 0, buffer.length, Number(offset))
    nread = buffer ? copyMemory(ioVecs, buffer.subarray(0, bytesRead)) : 0

    view.setUint32(size, nread, true)
    return WasiErrno.ESUCCESS
  })

  fd_prestat_get = syscallWrap('fd_prestat_get', function (this: WASI, fd: fd, prestat: Pointer): WasiErrno {
    prestat = Number(prestat)
    if (prestat === 0) {
      return WasiErrno.EINVAL
    }

    const wasi = _wasi.get(this)!
    let fileDescriptor: FileDescriptor
    try {
      fileDescriptor = wasi.fds.get(fd, BigInt(0), BigInt(0))
    } catch (err) {
      if (err instanceof WasiError) return err.errno
      throw err
    }
    if (fileDescriptor.preopen !== 1) return WasiErrno.EINVAL
    const { view } = getMemory(this)
    // preopen type is dir(0)
    view.setUint32(prestat, 0, true)
    view.setUint32(prestat + 4, encoder.encode(fileDescriptor.path).length + 1, true)
    return WasiErrno.ESUCCESS
  })

  fd_prestat_dir_name = syscallWrap('fd_prestat_dir_name', function (fd: fd, path: Pointer<u8>, path_len: size): WasiErrno {
    path = Number(path)
    path_len = Number(path_len)
    if (path === 0) {
      return WasiErrno.EINVAL
    }

    const wasi = _wasi.get(this)!
    const fileDescriptor = wasi.fds.get(fd, BigInt(0), BigInt(0))
    if (fileDescriptor.preopen !== 1) return WasiErrno.EBADF
    const buffer = encoder.encode(fileDescriptor.path + '\0')
    const size = buffer.length
    if (size > path_len) return WasiErrno.ENOBUFS
    const { HEAPU8 } = getMemory(this)
    HEAPU8.set(buffer, path)
    return WasiErrno.ESUCCESS
  })

  fd_pwrite = syscallWrap('fd_pwrite', function (fd: fd, iovs: Pointer, iovslen: size, offset: filesize, size: Pointer<size>): WasiErrno {
    iovs = Number(iovs)
    size = Number(size)
    if (iovs === 0 || size === 0) {
      return WasiErrno.EINVAL
    }
    const { HEAPU8, view } = getMemory(this)

    const wasi = _wasi.get(this)!
    const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_WRITE | WasiRights.FD_SEEK, BigInt(0))

    const buffer = concatBuffer(Array.from({ length: Number(iovslen) }, (_, i) => {
      const offset = (iovs as number) + (i * 8)
      const buf = view.getInt32(offset, true)
      const bufLen = view.getUint32(offset + 4, true)
      return HEAPU8.subarray(buf, buf + bufLen)
    }))

    const nwritten = wasi.fs!.writeSync(fileDescriptor.fd, buffer, 0, buffer.length, Number(offset))

    view.setUint32(size, nwritten, true)
    return WasiErrno.ESUCCESS
  })

  fd_read = syscallWrap('fd_read', function (fd: fd, iovs: Pointer, iovslen: size, size: Pointer<size>): WasiErrno {
    iovs = Number(iovs)
    size = Number(size)
    if (iovs === 0 || size === 0) {
      return WasiErrno.EINVAL
    }
    const { HEAPU8, view } = getMemory(this)

    const wasi = _wasi.get(this)!
    const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_READ, BigInt(0))

    let totalSize = 0
    const ioVecs = Array.from({ length: Number(iovslen) }, (_, i) => {
      const offset = (iovs as number) + (i * 8)
      const buf = view.getInt32(offset, true)
      const bufLen = view.getUint32(offset + 4, true)
      totalSize += bufLen
      return HEAPU8.subarray(buf, buf + bufLen)
    })

    let buffer: Uint8Array
    let nread: number = 0
    if (fd === 0) {
      buffer = readStdin()
      nread = buffer ? copyMemory(ioVecs, buffer) : 0
    } else {
      buffer = new Uint8Array(totalSize)
      ;(buffer as any)._isBuffer = true
      const bytesRead = wasi.fs!.readSync(fileDescriptor.fd, buffer, 0, buffer.length, Number(fileDescriptor.pos))
      nread = buffer ? copyMemory(ioVecs, buffer.subarray(0, bytesRead)) : 0
      fileDescriptor.pos += BigInt(nread)
    }

    view.setUint32(size, nread, true)
    return WasiErrno.ESUCCESS
  })

  fd_seek = syscallWrap('fd_seek', function (fd: fd, offset: filedelta, whence: WasiWhence, newOffset: Pointer<filesize>): WasiErrno {
    newOffset = Number(newOffset)
    if (newOffset === 0) {
      return WasiErrno.EINVAL
    }
    if (fd === 0 || fd === 1 || fd === 2) return WasiErrno.ESUCCESS
    const wasi = _wasi.get(this)!
    const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_SEEK, BigInt(0))
    const r = fileDescriptor.seek(offset, whence)
    const { view } = getMemory(this)
    view.setBigUint64(newOffset, r, true)
    return WasiErrno.ESUCCESS
  })

  fd_readdir = syscallWrap('fd_readdir', function (fd: fd, buf: Pointer, buf_len: size, cookie: bigint, bufused: Pointer): WasiErrno {
    buf = Number(buf)
    buf_len = Number(buf_len)
    bufused = Number(bufused)

    if (buf === 0 || bufused === 0) return WasiErrno.ESUCCESS
    const wasi = _wasi.get(this)!
    const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_READDIR, BigInt(0))
    const entries = wasi.fs!.readdirSync(fileDescriptor.realPath, { withFileTypes: true }) as Dirent[]
    const { HEAPU8, view } = getMemory(this)
    let bufferUsed = 0
    for (let i = Number(cookie); i < entries.length; i++) {
      const nameData = encoder.encode(entries[i].name)

      const entryInfo = wasi.fs!.statSync(
        resolve(fileDescriptor.realPath, entries[i].name),
        { bigint: true }
      )
      const entryData = new Uint8Array(24 + nameData.byteLength)
      const entryView = new DataView(entryData.buffer)

      entryView.setBigUint64(0, BigInt(i + 1), true)
      entryView.setBigUint64(
        8,
        BigInt(entryInfo.ino ? entryInfo.ino : 0),
        true
      )
      entryView.setUint32(16, nameData.byteLength, true)

      let type: number
      if (entries[i].isFile()) {
        type = WasiFileType.REGULAR_FILE
      } else if (entries[i].isDirectory()) {
        type = WasiFileType.DIRECTORY
      } else if (entries[i].isSymbolicLink()) {
        type = WasiFileType.SYMBOLIC_LINK
      } else if (entries[i].isCharacterDevice()) {
        type = WasiFileType.CHARACTER_DEVICE
      } else if (entries[i].isBlockDevice()) {
        type = WasiFileType.BLOCK_DEVICE
      } else if (entries[i].isSocket()) {
        type = WasiFileType.SOCKET_STREAM
      } else {
        type = WasiFileType.UNKNOWN
      }

      entryView.setUint8(20, type)
      entryData.set(nameData, 24)

      const data = entryData.slice(
        0,
        Math.min(entryData.length, buf_len - bufferUsed)
      )
      HEAPU8.set(data, buf + bufferUsed)
      bufferUsed += data.byteLength
    }

    view.setUint32(bufused, bufferUsed, true)
    return WasiErrno.ESUCCESS
  })

  fd_renumber = syscallWrap('fd_renumber', function (from: fd, to: fd): WasiErrno {
    const wasi = _wasi.get(this)!
    wasi.fds.renumber(to, from)
    return WasiErrno.ESUCCESS
  })

  fd_sync = syscallWrap('fd_sync', function (fd: fd): WasiErrno {
    const wasi = _wasi.get(this)!
    const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_SYNC, BigInt(0))
    wasi.fs!.fsyncSync(fileDescriptor.fd)
    return WasiErrno.ESUCCESS
  })

  fd_tell = syscallWrap('fd_tell', function (fd: fd, offset: Pointer): WasiErrno {
    const wasi = _wasi.get(this)!
    const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_TELL, BigInt(0))
    const pos = BigInt(fileDescriptor.pos)
    const { view } = getMemory(this)
    view.setBigUint64(Number(offset), pos, true)
    return WasiErrno.ESUCCESS
  })

  fd_write = syscallWrap('fd_write', function (fd: fd, iovs: Pointer, iovslen: size, size: Pointer<size>): WasiErrno {
    iovs = Number(iovs)
    size = Number(size)
    if (iovs === 0 || size === 0) {
      return WasiErrno.EINVAL
    }
    const { HEAPU8, view } = getMemory(this)

    const wasi = _wasi.get(this)!
    const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_WRITE, BigInt(0))

    const buffer = concatBuffer(Array.from({ length: Number(iovslen) }, (_, i) => {
      const offset = (iovs as number) + (i * 8)
      const buf = view.getInt32(offset, true)
      const bufLen = view.getUint32(offset + 4, true)
      return HEAPU8.subarray(buf, buf + bufLen)
    }))
    let nwritten: number
    if (fd === 1 || fd === 2) {
      nwritten = (fileDescriptor as StandardOutput).write(buffer)
    } else {
      nwritten = wasi.fs!.writeSync(fileDescriptor.fd, buffer, 0, buffer.length, Number(fileDescriptor.pos))
      fileDescriptor.pos += BigInt(nwritten)
    }

    view.setUint32(size, nwritten, true)
    return WasiErrno.ESUCCESS
  })

  path_create_directory = syscallWrap('path_create_directory', function (fd: fd, path: Pointer<u8>, path_len: size): WasiErrno {
    path = Number(path)
    path_len = Number(path_len)
    if (path === 0) {
      return WasiErrno.EINVAL
    }
    const { HEAPU8 } = getMemory(this)

    const wasi = _wasi.get(this)!
    const fileDescriptor = wasi.fds.get(fd, WasiRights.PATH_CREATE_DIRECTORY, BigInt(0))
    let pathString = decoder.decode(HEAPU8.subarray(path, path + path_len))

    pathString = resolve(fileDescriptor.realPath, pathString)
    wasi.fs!.mkdirSync(pathString)
    return WasiErrno.ESUCCESS
  })

  path_filestat_get = syscallWrap('path_filestat_get', function (fd: fd, flags: number, path: Pointer<u8>, path_len: size, filestat: Pointer): WasiErrno {
    path = Number(path)
    path_len = Number(path_len)
    filestat = Number(filestat)
    if (path === 0 || filestat === 0) {
      return WasiErrno.EINVAL
    }
    const { HEAPU8, view } = getMemory(this)

    const wasi = _wasi.get(this)!
    const fileDescriptor = wasi.fds.get(fd, WasiRights.PATH_FILESTAT_GET, BigInt(0))
    let pathString = decoder.decode(HEAPU8.subarray(path, path + path_len))

    pathString = resolve(fileDescriptor.realPath, pathString)

    let stat
    if ((flags & 1) === 1) {
      stat = wasi.fs!.statSync(pathString, { bigint: true })
    } else {
      stat = wasi.fs!.lstatSync(pathString, { bigint: true })
    }

    toFileStat(view, filestat, stat)
    return WasiErrno.ESUCCESS
  })

  path_filestat_set_times = syscallWrap('path_filestat_set_times', function (fd: fd, flags: number, path: Pointer<u8>, path_len: size, atim: bigint, mtim: bigint, fst_flags: WasiFstFlag): WasiErrno {
    path = Number(path)
    path_len = Number(path_len)
    if (path === 0) return WasiErrno.EINVAL
    if ((fst_flags) & ~(WasiFstFlag.SET_ATIM |
                        WasiFstFlag.SET_ATIM_NOW |
                        WasiFstFlag.SET_MTIM |
                        WasiFstFlag.SET_MTIM_NOW)) {
      return WasiErrno.EINVAL
    }
    const { HEAPU8 } = getMemory(this)
    const wasi = _wasi.get(this)!
    const fileDescriptor = wasi.fds.get(fd, WasiRights.PATH_FILESTAT_SET_TIMES, BigInt(0))
    const resolvedPath = resolvePath(wasi, fileDescriptor, decoder.decode(HEAPU8.subarray(path, path + path_len)), flags)
    if ((fst_flags & WasiFstFlag.SET_ATIM_NOW) === WasiFstFlag.SET_ATIM_NOW) {
      atim = BigInt(Date.now() * 1000000)
    }

    if ((fst_flags & WasiFstFlag.SET_MTIM_NOW) === WasiFstFlag.SET_MTIM_NOW) {
      mtim = BigInt(Date.now() * 1000000)
    }
    wasi.fs!.utimesSync(resolvedPath, Number(atim), Number(mtim))
    return WasiErrno.ESUCCESS
  })

  path_link = syscallWrap('path_link', function (old_fd: fd, old_flags: number, old_path: Pointer<u8>, old_path_len: size, new_fd: fd, new_path: Pointer<u8>, new_path_len: size): WasiErrno {
    old_path = Number(old_path)
    old_path_len = Number(old_path_len)
    new_path = Number(new_path)
    new_path_len = Number(new_path_len)
    if (old_path === 0 || new_path === 0) {
      return WasiErrno.EINVAL
    }
    const wasi = _wasi.get(this)!
    let oldWrap: FileDescriptor
    let newWrap: FileDescriptor
    if (old_fd === new_fd) {
      oldWrap = newWrap = wasi.fds.get(old_fd, WasiRights.PATH_LINK_SOURCE | WasiRights.PATH_LINK_TARGET, BigInt(0))
    } else {
      oldWrap = wasi.fds.get(old_fd, WasiRights.PATH_LINK_SOURCE, BigInt(0))
      newWrap = wasi.fds.get(new_fd, WasiRights.PATH_LINK_TARGET, BigInt(0))
    }
    const { HEAPU8 } = getMemory(this)
    const resolvedOldPath = resolvePath(wasi, oldWrap, decoder.decode(HEAPU8.subarray(old_path, old_path + old_path_len)), old_flags)
    const resolvedNewPath = resolve(newWrap.realPath, decoder.decode(HEAPU8.subarray(new_path, new_path + new_path_len)))

    wasi.fs!.linkSync(resolvedOldPath, resolvedNewPath)

    return WasiErrno.ESUCCESS
  })

  path_open = syscallWrap('path_open', function (
    dirfd: fd,
    dirflags: number,
    path: Pointer<u8>,
    path_len: size,
    o_flags: u16,
    fs_rights_base: bigint,
    fs_rights_inheriting: bigint,
    fs_flags: u16,
    fd: Pointer<fd>
  ): WasiErrno {
    path = Number(path)
    fd = Number(fd)
    if (path === 0 || fd === 0) {
      return WasiErrno.EINVAL
    }
    path_len = Number(path_len)
    fs_rights_base = BigInt(fs_rights_base)
    fs_rights_base = BigInt(fs_rights_base)

    const read = (fs_rights_base & (WasiRights.FD_READ |
          WasiRights.FD_READDIR)) !== BigInt(0)
    const write = (fs_rights_base & (WasiRights.FD_DATASYNC |
          WasiRights.FD_WRITE |
          WasiRights.FD_ALLOCATE |
          WasiRights.FD_FILESTAT_SET_SIZE)) !== BigInt(0)
    let flags = write ? read ? FileControlFlag.O_RDWR : FileControlFlag.O_WRONLY : FileControlFlag.O_RDONLY
    let needed_base = WasiRights.PATH_OPEN
    let needed_inheriting = fs_rights_base | fs_rights_inheriting

    if ((o_flags & WasiFileControlFlag.O_CREAT) !== 0) {
      flags |= FileControlFlag.O_CREAT
      needed_base |= WasiRights.PATH_CREATE_FILE
    }
    if ((o_flags & WasiFileControlFlag.O_DIRECTORY) !== 0) {
      flags |= FileControlFlag.O_DIRECTORY
    }
    if ((o_flags & WasiFileControlFlag.O_EXCL) !== 0) {
      flags |= FileControlFlag.O_EXCL
    }
    if ((o_flags & WasiFileControlFlag.O_TRUNC) !== 0) {
      flags |= FileControlFlag.O_TRUNC
      needed_base |= WasiRights.PATH_FILESTAT_SET_SIZE
    }

    if ((fs_flags & WasiFdFlag.APPEND) !== 0) {
      flags |= FileControlFlag.O_APPEND
    }
    if ((fs_flags & WasiFdFlag.DSYNC) !== 0) {
      // flags |= FileControlFlag.O_DSYNC;
      needed_inheriting |= WasiRights.FD_DATASYNC
    }
    if ((fs_flags & WasiFdFlag.NONBLOCK) !== 0) { flags |= FileControlFlag.O_NONBLOCK }
    if ((fs_flags & WasiFdFlag.RSYNC) !== 0) {
      flags |= FileControlFlag.O_SYNC
      needed_inheriting |= WasiRights.FD_SYNC
    }
    if ((fs_flags & WasiFdFlag.SYNC) !== 0) {
      flags |= FileControlFlag.O_SYNC
      needed_inheriting |= WasiRights.FD_SYNC
    }
    if (write && (flags & (FileControlFlag.O_APPEND | FileControlFlag.O_TRUNC)) === 0) {
      needed_inheriting |= WasiRights.FD_SEEK
    }

    const wasi = _wasi.get(this)!
    const fileDescriptor = wasi.fds.get(dirfd, needed_base, needed_inheriting)
    const memory = getMemory(this)
    const HEAPU8 = memory.HEAPU8
    const pathString = decoder.decode(HEAPU8.subarray(path, path + path_len))
    const resolved_path = resolvePath(wasi, fileDescriptor, pathString, dirflags)
    const r = wasi.fs!.openSync(resolved_path, flags, 0o666)
    const filetype = wasi.fds.getFileTypeByFd(r)
    if ((o_flags & WasiFileControlFlag.O_DIRECTORY) !== 0 && filetype !== WasiFileType.DIRECTORY) {
      return WasiErrno.ENOTDIR
    }
    const { base: max_base, inheriting: max_inheriting } = getRights(wasi.fds.stdio, r, flags, filetype)
    const wrap = wasi.fds.insert(r, resolved_path, resolved_path, filetype, fs_rights_base & max_base, fs_rights_inheriting & max_inheriting, 0)
    const stat = wasi.fs!.fstatSync(r, { bigint: true })
    if (stat.isFile()) {
      wrap.size = stat.size
      if ((flags & FileControlFlag.O_APPEND) !== 0) {
        wrap.pos = stat.size
      }
    }
    const view = memory.view
    view.setInt32(fd, wrap.id, true)

    return WasiErrno.ESUCCESS
  })

  path_readlink = syscallWrap('path_readlink', function (fd: fd, path: Pointer<u8>, path_len: size, buf: Pointer, buf_len: size, bufused: Pointer): WasiErrno {
    path = Number(path)
    path_len = Number(path_len)
    buf = Number(buf)
    buf_len = Number(buf_len)
    bufused = Number(bufused)
    if (path === 0 || buf === 0 || bufused === 0) {
      return WasiErrno.EINVAL
    }
    const { HEAPU8, view } = getMemory(this)

    const wasi = _wasi.get(this)!
    const fileDescriptor = wasi.fds.get(fd, WasiRights.PATH_READLINK, BigInt(0))
    let pathString = decoder.decode(HEAPU8.subarray(path, path + path_len))

    pathString = resolve(fileDescriptor.realPath, pathString)

    const link = wasi.fs!.readlinkSync(pathString) as string
    const linkData = encoder.encode(link)
    const len = Math.min(linkData.length, buf_len)
    if (len >= buf_len) return WasiErrno.ENOBUFS
    HEAPU8.set(linkData.subarray(0, len), buf)
    HEAPU8[buf + len] = 0
    view.setUint32(bufused, len + 1, true)

    return WasiErrno.ESUCCESS
  })

  path_remove_directory = syscallWrap('path_remove_directory', function (fd: fd, path: Pointer<u8>, path_len: size): WasiErrno {
    path = Number(path)
    path_len = Number(path_len)
    if (path === 0) {
      return WasiErrno.EINVAL
    }
    const { HEAPU8 } = getMemory(this)

    const wasi = _wasi.get(this)!
    const fileDescriptor = wasi.fds.get(fd, WasiRights.PATH_REMOVE_DIRECTORY, BigInt(0))
    let pathString = decoder.decode(HEAPU8.subarray(path, path + path_len))

    pathString = resolve(fileDescriptor.realPath, pathString)

    wasi.fs!.rmdirSync(pathString)

    return WasiErrno.ESUCCESS
  })

  path_rename = syscallWrap('path_rename', function (old_fd: fd, old_path: Pointer<u8>, old_path_len: size, new_fd: fd, new_path: Pointer<u8>, new_path_len: size): WasiErrno {
    old_path = Number(old_path)
    old_path_len = Number(old_path_len)
    new_path = Number(new_path)
    new_path_len = Number(new_path_len)
    if (old_path === 0 || new_path === 0) {
      return WasiErrno.EINVAL
    }
    const wasi = _wasi.get(this)!
    let oldWrap: FileDescriptor
    let newWrap: FileDescriptor
    if (old_fd === new_fd) {
      oldWrap = newWrap = wasi.fds.get(old_fd, WasiRights.PATH_RENAME_SOURCE | WasiRights.PATH_RENAME_TARGET, BigInt(0))
    } else {
      oldWrap = wasi.fds.get(old_fd, WasiRights.PATH_RENAME_SOURCE, BigInt(0))
      newWrap = wasi.fds.get(new_fd, WasiRights.PATH_RENAME_TARGET, BigInt(0))
    }
    const { HEAPU8 } = getMemory(this)
    const resolvedOldPath = resolve(oldWrap.realPath, decoder.decode(HEAPU8.subarray(old_path, old_path + old_path_len)))
    const resolvedNewPath = resolve(newWrap.realPath, decoder.decode(HEAPU8.subarray(new_path, new_path + new_path_len)))

    wasi.fs!.renameSync(resolvedOldPath, resolvedNewPath)

    return WasiErrno.ESUCCESS
  })

  path_symlink = syscallWrap('path_symlink', function (old_path: Pointer<u8>, old_path_len: size, fd: fd, new_path: Pointer<u8>, new_path_len: size): WasiErrno {
    old_path = Number(old_path)
    old_path_len = Number(old_path_len)
    new_path = Number(new_path)
    new_path_len = Number(new_path_len)
    if (old_path === 0 || new_path === 0) {
      return WasiErrno.EINVAL
    }
    const { HEAPU8 } = getMemory(this)

    const wasi = _wasi.get(this)!
    const fileDescriptor = wasi.fds.get(fd, WasiRights.PATH_SYMLINK, BigInt(0))
    const oldPath = decoder.decode(HEAPU8.subarray(old_path, old_path + old_path_len))
    let newPath = decoder.decode(HEAPU8.subarray(new_path, new_path + new_path_len))

    newPath = resolve(fileDescriptor.realPath, newPath)

    wasi.fs!.symlinkSync(oldPath, newPath)

    return WasiErrno.ESUCCESS
  })

  path_unlink_file = syscallWrap('path_unlink_file', function (fd: fd, path: Pointer<u8>, path_len: size): WasiErrno {
    path = Number(path)
    path_len = Number(path_len)
    if (path === 0) {
      return WasiErrno.EINVAL
    }
    const { HEAPU8 } = getMemory(this)

    const wasi = _wasi.get(this)!
    const fileDescriptor = wasi.fds.get(fd, WasiRights.PATH_UNLINK_FILE, BigInt(0))
    let pathString = decoder.decode(HEAPU8.subarray(path, path + path_len))

    pathString = resolve(fileDescriptor.realPath, pathString)

    wasi.fs!.unlinkSync(pathString)

    return WasiErrno.ESUCCESS
  })

  poll_oneoff = syscallWrap('poll_oneoff', function (_in: Pointer, _out: Pointer, _sub: size, _nevents: Pointer): WasiErrno {
    return WasiErrno.ENOSYS
  })

  proc_exit = syscallWrap('proc_exit', function (_rval: exitcode): WasiErrno {
    return WasiErrno.ESUCCESS
  })

  proc_raise = syscallWrap('proc_raise', function (_sig: number): WasiErrno {
    return WasiErrno.ENOSYS
  })

  sched_yield = syscallWrap('sched_yield', function (): WasiErrno {
    return WasiErrno.ESUCCESS
  })

  random_get = typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function'
    ? syscallWrap('random_get', function (buf: Pointer<u8>, buf_len: size): WasiErrno {
      buf = Number(buf)
      if (buf === 0) {
        return WasiErrno.EINVAL
      }
      buf_len = Number(buf_len)

      const { HEAPU8 } = getMemory(this)
      let pos: number
      const stride = 65536

      for (pos = 0; pos + stride < buf_len; pos += stride) {
        crypto.getRandomValues(HEAPU8.subarray(buf + pos, buf + pos + stride))
      }
      crypto.getRandomValues(HEAPU8.subarray(buf + pos, buf + buf_len))

      return WasiErrno.ESUCCESS
    })
    : syscallWrap('random_get', function (buf: Pointer<u8>, buf_len: size): WasiErrno {
      buf = Number(buf)
      if (buf === 0) {
        return WasiErrno.EINVAL
      }
      buf_len = Number(buf_len)

      const { view } = getMemory(this)
      for (let i = buf; i < buf + buf_len; ++i) {
        view.setUint8(i, Math.floor(Math.random() * 256))
      }

      return WasiErrno.ESUCCESS
    })

  sock_recv = syscallWrap('sock_recv', function (): WasiErrno {
    return WasiErrno.ENOTSUP
  })

  sock_send = syscallWrap('sock_send', function (): WasiErrno {
    return WasiErrno.ENOTSUP
  })

  sock_shutdown = syscallWrap('sock_shutdown', function (): WasiErrno {
    return WasiErrno.ENOTSUP
  })
}
