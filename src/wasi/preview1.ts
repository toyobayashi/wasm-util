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
  WasiFileType
} from './types'

import type {
  Pointer,
  u8,
  u16,
  size,
  filesize,
  Handle,
  filedelta,
  exitcode
} from './types'

import { FileDescriptorTable, concatBuffer, toFileType } from './fd'
import type { FileDescriptor } from './fd'
import { WasiError } from './error'
import { isPromiseLike } from './util'
import { getRights } from './rights'

function debug (...args: any[]): void {
  if (process.env.NODE_DEBUG_NATIVE === 'wasi') {
    console.debug(...args)
  }
}

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

interface MemoryTypedArrays {
  HEAPU8: Uint8Array
  HEAPU16: Uint16Array
  HEAP32: Int32Array
  HEAPU32: Uint32Array
  HEAPU64: BigUint64Array
}

interface WrappedData {
  fds: FileDescriptorTable
  args: string[]
  argvBuf: Uint8Array
  env: string[]
  envBuf: Uint8Array
  fs?: IFs
}

export interface Preopen {
  mappedPath: string
  realPath: string
}

const _memory = new WeakMap<WASI, WebAssembly.Memory>()
const _wasi = new WeakMap<WASI, WrappedData>()

function getMemory (wasi: WASI): MemoryTypedArrays {
  const memory = _memory.get(wasi)!
  return {
    HEAPU8: new Uint8Array(memory.buffer),
    HEAPU16: new Uint16Array(memory.buffer),
    HEAP32: new Int32Array(memory.buffer),
    HEAPU32: new Uint32Array(memory.buffer),
    HEAPU64: new BigUint64Array(memory.buffer)
  }
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

function syscallWrap<T extends (this: any, ...args: any[]) => WasiErrno | PromiseLike<WasiErrno>> (f: T): T {
  return function (this: any) {
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
  } as unknown as T
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

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
      argvBuf: encoder.encode(args.join('\0') + '\0'),
      env,
      envBuf: encoder.encode(env.join('\0') + '\0'),
      fs
    })

    if (preopens.length > 0) {
      if (!filesystem || !fs) throw new Error('filesystem is disabled')
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
    _memory.set(this, m)
  }

  args_get = syscallWrap(function (argv: Pointer<Pointer<u8>>, argv_buf: Pointer<u8>): WasiErrno {
    debug('args_get(%d, %d)', argv, argv_buf)
    argv = Number(argv)
    argv_buf = Number(argv_buf)
    if (argv === 0 || argv_buf === 0) {
      return WasiErrno.EINVAL
    }
    const { HEAPU8, HEAP32 } = getMemory(this)
    HEAP32[argv >> 2] = argv_buf
    const wasi = _wasi.get(this)!
    const args = wasi.args
    for (let i = 1; i < args.length; ++i) {
      HEAP32[(argv >> 2) + i] = argv_buf + encoder.encode(args.slice(0, i).join('\0') + '\0').length
    }
    HEAPU8.set(wasi.argvBuf, argv_buf)
    return WasiErrno.ESUCCESS
  })

  args_sizes_get = syscallWrap(function (argc: Pointer<size>, argv_buf_size: Pointer<size>): WasiErrno {
    debug('args_sizes_get(%d, %d)', argc, argv_buf_size)
    argc = Number(argc)
    argv_buf_size = Number(argv_buf_size)
    if (argc === 0 || argv_buf_size === 0) {
      return WasiErrno.EINVAL
    }
    const { HEAP32, HEAPU32 } = getMemory(this)
    const wasi = _wasi.get(this)!
    const args = wasi.args
    HEAP32[argc >> 2] = args.length
    HEAPU32[argv_buf_size >> 2] = wasi.argvBuf.length
    return WasiErrno.ESUCCESS
  })

  environ_get = syscallWrap(function (environ: Pointer<Pointer<u8>>, environ_buf: Pointer<u8>): WasiErrno {
    debug('environ_get(%d, %d)', environ, environ_buf)
    environ = Number(environ)
    environ_buf = Number(environ_buf)
    if (environ === 0 || environ_buf === 0) {
      return WasiErrno.EINVAL
    }
    const { HEAPU8, HEAP32 } = getMemory(this)
    HEAP32[environ >> 2] = environ_buf
    const wasi = _wasi.get(this)!
    const env = wasi.env
    for (let i = 1; i < env.length; ++i) {
      HEAP32[(environ >> 2) + i] = environ_buf + encoder.encode(env.slice(0, i).join('\0') + '\0').length
    }
    HEAPU8.set(wasi.envBuf, environ_buf)
    return WasiErrno.ESUCCESS
  })

  environ_sizes_get = syscallWrap(function (len: Pointer<size>, buflen: Pointer<size>): WasiErrno {
    debug('environ_sizes_get(%d, %d)', len, buflen)
    len = Number(len)
    buflen = Number(buflen)
    if (len === 0 || buflen === 0) {
      return WasiErrno.EINVAL
    }
    const { HEAP32, HEAPU32 } = getMemory(this)
    const wasi = _wasi.get(this)!
    HEAP32[len >> 2] = wasi.env.length
    HEAPU32[buflen >> 2] = wasi.envBuf.length
    return WasiErrno.ESUCCESS
  })

  fd_close = syscallWrap(function (fd: Handle): WasiErrno {
    debug('fd_close(%d)', fd)
    const wasi = _wasi.get(this)!
    const fileDescriptor = wasi.fds.get(fd, BigInt(0), BigInt(0))
    wasi.fs!.closeSync(fileDescriptor.fd)
    wasi.fds.remove(fd)
    return WasiErrno.ESUCCESS
  })

  fd_fdstat_get = syscallWrap(function (fd: Handle, fdstat: Pointer): WasiErrno {
    debug('fd_fdstat_get(%d, %d)', fd, fdstat)
    fdstat = Number(fdstat)
    if (fdstat === 0) {
      return WasiErrno.EINVAL
    }
    const wasi = _wasi.get(this)!
    const fileDescriptor = wasi.fds.get(fd, BigInt(0), BigInt(0))
    const { HEAPU16, HEAPU64 } = getMemory(this)
    HEAPU16[fdstat >> 1] = fileDescriptor.type
    HEAPU16[(fdstat + 2) >> 1] = 0
    HEAPU64[(fdstat + 8) >> 3] = fileDescriptor.rightsBase
    HEAPU64[(fdstat + 16) >> 3] = fileDescriptor.rightsInheriting
    return WasiErrno.ESUCCESS
  })

  fd_seek = syscallWrap(function (fd: Handle, offset: filedelta, whence: WasiWhence, newOffset: Pointer<filesize>): WasiErrno {
    debug('fd_seek(%d, %d, %d, %d)', fd, offset, whence, newOffset)
    newOffset = Number(newOffset)
    if (newOffset === 0) {
      return WasiErrno.EINVAL
    }
    const wasi = _wasi.get(this)!
    const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_SEEK, BigInt(0))
    const r = fileDescriptor.seek(offset, whence)
    const { HEAPU64 } = getMemory(this)
    HEAPU64[newOffset >> 2] = r
    return WasiErrno.ESUCCESS
  })

  fd_read = syscallWrap(function (fd: Handle, iovs: Pointer, iovslen: size, size: Pointer<size>): WasiErrno {
    debug('fd_read(%d, %d, %d, %d)', fd, iovs, iovslen, size)
    iovs = Number(iovs)
    size = Number(size)
    if (iovs === 0 || size === 0) {
      return WasiErrno.EINVAL
    }
    const { HEAPU8, HEAP32, HEAPU32 } = getMemory(this)

    const wasi = _wasi.get(this)!
    const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_READ, BigInt(0))

    let totalSize = 0
    const ioVecs = Array.from({ length: Number(iovslen) }, (_, i) => {
      const buf = HEAP32[((iovs as number) + (i * 8)) >> 2]
      const bufLen = HEAPU32[(((iovs as number) + (i * 8)) >> 2) + 1]
      totalSize += bufLen
      return HEAPU8.subarray(buf, buf + bufLen)
    })

    let buffer: Uint8Array
    let nread: number = 0
    if (fd === 0) {
      buffer = (fileDescriptor as any).stream?.read()
      nread = buffer ? copyMemory(ioVecs, buffer) : 0
    } else {
      buffer = new Uint8Array(totalSize)
      ;(buffer as any)._isBuffer = true
      const bytesRead = wasi.fs!.readSync(fileDescriptor.fd, buffer, 0, buffer.length, Number(fileDescriptor.pos))
      nread = buffer ? copyMemory(ioVecs, buffer.subarray(0, bytesRead)) : 0
      fileDescriptor.pos += BigInt(nread)
    }

    HEAPU32[size >> 2] = nread
    return WasiErrno.ESUCCESS
  })

  fd_write = syscallWrap(function (fd: Handle, iovs: Pointer, iovslen: size, size: Pointer<size>): WasiErrno {
    debug('fd_write(%d, %d, %d, %d)', fd, iovs, iovslen, size)
    iovs = Number(iovs)
    size = Number(size)
    if (iovs === 0 || size === 0) {
      return WasiErrno.EINVAL
    }
    const { HEAPU8, HEAP32, HEAPU32 } = getMemory(this)

    const wasi = _wasi.get(this)!
    const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_WRITE, BigInt(0))

    const buffer = concatBuffer(Array.from({ length: Number(iovslen) }, (_, i) => {
      const buf = HEAP32[((iovs as number) + (i * 8)) >> 2]
      const bufLen = HEAPU32[(((iovs as number) + (i * 8)) >> 2) + 1]
      return HEAPU8.subarray(buf, buf + bufLen)
    }))
    let nwritten: number
    if (fd === 1 || fd === 2) {
      nwritten = (fileDescriptor as any).stream?.write(buffer) ?? 0
    } else {
      nwritten = wasi.fs!.writeSync(fileDescriptor.fd, buffer, 0, buffer.length, Number(fileDescriptor.pos))
      fileDescriptor.pos += BigInt(nwritten)
    }

    HEAPU32[size >> 2] = nwritten
    return WasiErrno.ESUCCESS
  })

  random_get = typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function'
    ? syscallWrap(function (buf: Pointer<u8>, buf_len: size): WasiErrno {
      debug('random_get(%d, %d)', buf, buf_len)
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
    : syscallWrap(function (buf: Pointer<u8>, buf_len: size): WasiErrno {
      debug('random_get(%d, %d)', buf, buf_len)
      buf = Number(buf)
      if (buf === 0) {
        return WasiErrno.EINVAL
      }
      buf_len = Number(buf_len)

      const { HEAPU8 } = getMemory(this)
      for (let i = buf; i < buf + buf_len; ++i) {
        HEAPU8[i] = Math.floor(Math.random() * 256)
      }

      return WasiErrno.ESUCCESS
    })

  fd_prestat_get = function (this: WASI, fd: Handle, prestat: Pointer): WasiErrno {
    debug('fd_prestat_get(%d, %d)', fd, prestat)
    prestat = Number(prestat)
    if (prestat === 0) {
      return WasiErrno.EINVAL
    }
    const { HEAPU32 } = getMemory(this)

    const wasi = _wasi.get(this)!
    let fileDescriptor: FileDescriptor
    try {
      fileDescriptor = wasi.fds.get(fd, BigInt(0), BigInt(0))
    } catch (err) {
      if (err instanceof WasiError) return err.errno
      throw err
    }
    if (fileDescriptor.preopen !== 1) return WasiErrno.EINVAL
    // preopen type is dir(0)
    HEAPU32[prestat >> 2] = 0
    HEAPU32[(prestat + 4) >> 2] = encoder.encode(fileDescriptor.path).length + 1
    return WasiErrno.ESUCCESS
  }

  fd_prestat_dir_name = syscallWrap(function (fd: Handle, path: Pointer<u8>, path_len: size): WasiErrno {
    debug('fd_prestat_dir_name(%d, %d, %d)', fd, path, path_len)
    path = Number(path)
    path_len = Number(path_len)
    if (path === 0) {
      return WasiErrno.EINVAL
    }
    const { HEAPU8 } = getMemory(this)

    const wasi = _wasi.get(this)!
    const fileDescriptor = wasi.fds.get(fd, BigInt(0), BigInt(0))
    if (fileDescriptor.preopen !== 1) return WasiErrno.EBADF
    const buffer = encoder.encode(fileDescriptor.path + '\0')
    const size = buffer.length
    if (size > path_len) return WasiErrno.ENOBUFS
    HEAPU8.set(buffer, path)
    return WasiErrno.ESUCCESS
  })

  path_filestat_get = syscallWrap(function (fd: Handle, flags: number, path: Pointer<u8>, path_len: size, filestat: Pointer): WasiErrno {
    debug('path_filestat_get(%d, %d, %d, %d, %d)', fd, flags, path, path_len, filestat)
    path = Number(path)
    path_len = Number(path_len)
    filestat = Number(filestat)
    if (path === 0 || filestat === 0) {
      return WasiErrno.EINVAL
    }
    const { HEAPU8, HEAPU64 } = getMemory(this)

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

    HEAPU64[filestat >> 3] = stat.dev
    HEAPU64[(filestat + 8) >> 3] = stat.ino
    HEAPU64[(filestat + 16) >> 3] = BigInt(toFileType(stat))
    HEAPU64[(filestat + 24) >> 3] = stat.nlink
    HEAPU64[(filestat + 32) >> 3] = stat.size
    HEAPU64[(filestat + 40) >> 3] = stat.atimeMs * BigInt(1000000)
    HEAPU64[(filestat + 48) >> 3] = stat.mtimeMs * BigInt(1000000)
    HEAPU64[(filestat + 56) >> 3] = stat.ctimeMs * BigInt(1000000)
    return WasiErrno.ESUCCESS
  })

  fd_fdstat_set_flags = function (fd: Handle, flags: number): WasiErrno {
    debug('fd_fdstat_set_flags(%d, %d)', fd, flags)
    return WasiErrno.ENOSYS
  }

  path_open = syscallWrap(function (
    dirfd: Handle,
    dirflags: number,
    path: Pointer<u8>,
    path_len: size,
    o_flags: u16,
    fs_rights_base: bigint,
    fs_rights_inheriting: bigint,
    fs_flags: u16,
    fd: Pointer<Handle>
  ): WasiErrno {
    debug('path_open(%d, %d, %d, %d, %d, %d, %d, %d, %d)',
      dirfd,
      dirflags,
      path,
      path_len,
      o_flags,
      fs_rights_base,
      fs_rights_inheriting,
      fs_flags,
      fd
    )
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
    const { HEAPU8, HEAP32 } = getMemory(this)
    const pathString = decoder.decode(HEAPU8.subarray(path, path + path_len))
    const resolved_path = resolve(fileDescriptor.realPath, pathString)
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
    HEAP32[fd >> 2] = wrap.id

    return WasiErrno.ESUCCESS
  })

  proc_exit = syscallWrap(function (rval: exitcode): WasiErrno {
    debug(`proc_exit(${rval})`)
    return WasiErrno.ESUCCESS
  })
}
