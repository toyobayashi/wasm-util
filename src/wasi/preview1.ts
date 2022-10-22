import { vol } from 'memfs-browser'
import type { Volume } from 'memfs-browser'

import {
  WasiErrno,
  WasiFileType,
  WasiRights,
  WasiWhence
} from './types'

import type {
  Pointer,
  u8,
  size,
  filesize,
  Handle,
  filedelta,
  exitcode
} from './types'

import { FileDescriptorTable, concatBuffer } from './fd'

function debug (...args: any[]): void {
  if (typeof process === 'undefined' || (process as any).type === 'renderer' || (process as any).browser === true || (process as any).__nwjs) {
    console.debug(...args)
  } else {
    if (process.env.DEBUG) {
      console.debug(...args)
    }
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

function toFileType (stat: ReturnType<InstanceType<typeof Volume>['statSync']>): bigint {
  if (stat!.isBlockDevice()) return BigInt(WasiFileType.BLOCK_DEVICE)
  if (stat!.isCharacterDevice()) return BigInt(WasiFileType.CHARACTER_DEVICE)
  if (stat!.isDirectory()) return BigInt(WasiFileType.DIRECTORY)
  if (stat!.isSocket()) return BigInt(WasiFileType.SOCKET_STREAM)
  if (stat!.isFile()) return BigInt(WasiFileType.REGULAR_FILE)
  if (stat!.isSymbolicLink()) return BigInt(WasiFileType.SYMBOLIC_LINK)
  return BigInt(WasiFileType.UNKNOWN)
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
}

/** @class */
// eslint-disable-next-line spaced-comment, @typescript-eslint/no-redeclare
const WASI = /*#__PURE__*/ (function () {
  const _memory = new WeakMap<any, WebAssembly.Memory>()
  const _wasi = new WeakMap<any, WrappedData>()

  vol.fromJSON({}, '/')

  function getMemory (wasi: any): MemoryTypedArrays {
    const memory = _memory.get(wasi)!
    return {
      HEAPU8: new Uint8Array(memory.buffer),
      HEAPU16: new Uint16Array(memory.buffer),
      HEAP32: new Int32Array(memory.buffer),
      HEAPU32: new Uint32Array(memory.buffer),
      HEAPU64: new BigUint64Array(memory.buffer)
    }
  }

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  const WASI: new (args: string[], env: string[], _preopens: string[], stdio: readonly [number, number, number]) => any =
    function WASI (this: any, args: string[], env: string[], _preopens: string[], stdio: readonly [number, number, number]): void {
      _wasi.set(this, {
        fds: new FileDescriptorTable({
          size: 3,
          in: stdio[0],
          out: stdio[1],
          err: stdio[2]
        }),
        args,
        argvBuf: encoder.encode(args.join('\0') + '\0'),
        env,
        envBuf: encoder.encode(env.join('\0') + '\0')
      })

      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const _this = this
      this._setMemory = function _setMemory (m: WebAssembly.Memory) {
        if (!(m instanceof WebAssembly.Memory)) {
          throw new TypeError('"instance.exports.memory" property must be a WebAssembly.Memory')
        }
        _memory.set(_this, m)
      }
    } as any

  WASI.prototype.args_get = function args_get (argv: Pointer<Pointer<u8>>, argv_buf: Pointer<u8>): WasiErrno {
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
  }

  WASI.prototype.args_sizes_get = function args_sizes_get (argc: Pointer<size>, argv_buf_size: Pointer<size>): WasiErrno {
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
  }

  WASI.prototype.environ_get = function environ_get (environ: Pointer<Pointer<u8>>, environ_buf: Pointer<u8>): WasiErrno {
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
  }

  WASI.prototype.environ_sizes_get = function environ_sizes_get (len: Pointer<size>, buflen: Pointer<size>): WasiErrno {
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
  }

  WASI.prototype.fd_close = function fd_close (fd: Handle): WasiErrno {
    debug('fd_close(%d)', fd)
    return WasiErrno.ESUCCESS
  }

  WASI.prototype.fd_fdstat_get = function fd_fdstat_get (fd: Handle, fdstat: Pointer): WasiErrno {
    debug('fd_fdstat_get(%d, %d)', fd, fdstat)
    fdstat = Number(fdstat)
    if (fdstat === 0) {
      return WasiErrno.EINVAL
    }
    const wasi = _wasi.get(this)!
    const { value: fileDescriptor, errno } = wasi.fds.get(fd, BigInt(0), BigInt(0))
    if (errno !== WasiErrno.ESUCCESS) {
      return errno
    }
    const { HEAPU16, HEAPU64 } = getMemory(this)
    HEAPU16[fdstat >> 1] = fileDescriptor.type
    HEAPU16[(fdstat + 2) >> 1] = 0
    HEAPU64[(fdstat + 8) >> 3] = fileDescriptor.rightsBase
    HEAPU64[(fdstat + 16) >> 3] = fileDescriptor.rightsInheriting
    return WasiErrno.ESUCCESS
  }

  WASI.prototype.fd_seek = function fd_seek (fd: Handle, offset: filedelta, whence: WasiWhence, size: filesize): WasiErrno {
    debug('fd_seek(%d, %d, %d, %d)', fd, offset, whence, size)
    return WasiErrno.ESUCCESS
  }

  WASI.prototype.fd_read = function fd_read (fd: Handle, iovs: Pointer, iovslen: size, size: Pointer<size>): WasiErrno {
    debug('fd_read(%d, %d, %d, %d)', fd, iovs, iovslen, size)
    iovs = Number(iovs)
    size = Number(size)
    if (iovs === 0 || size === 0) {
      return WasiErrno.EINVAL
    }
    const { HEAPU8, HEAP32, HEAPU32 } = getMemory(this)

    const wasi = _wasi.get(this)!
    const { value: fileDescriptor, errno } = wasi.fds.get(fd, WasiRights.FD_READ, BigInt(0))
    if (errno !== WasiErrno.ESUCCESS) {
      HEAPU32[size >> 2] = 0
      return errno
    }

    const buffer = (fileDescriptor as any).stream.read()
    const ioVecs = Array.from({ length: Number(iovslen) }, (_, i) => {
      const buf = HEAP32[((iovs as number) + (i * 8)) >> 2]
      const bufLen = HEAPU32[(((iovs as number) + (i * 8)) >> 2) + 1]
      return HEAPU8.subarray(buf, buf + bufLen)
    })
    const nread = copyMemory(ioVecs, buffer)

    HEAPU32[size >> 2] = nread
    return WasiErrno.ESUCCESS
  }

  WASI.prototype.fd_write = function fd_write (fd: Handle, iovs: Pointer, iovslen: size, size: Pointer<size>): WasiErrno {
    debug('fd_write(%d, %d, %d, %d)', fd, iovs, iovslen, size)
    iovs = Number(iovs)
    size = Number(size)
    if (iovs === 0 || size === 0) {
      return WasiErrno.EINVAL
    }
    const { HEAPU8, HEAP32, HEAPU32 } = getMemory(this)

    const wasi = _wasi.get(this)!
    const { value: fileDescriptor, errno } = wasi.fds.get(fd, WasiRights.FD_WRITE, BigInt(0))
    if (errno !== WasiErrno.ESUCCESS) {
      HEAPU32[size >> 2] = 0
      return errno
    }

    const buffer = concatBuffer(Array.from({ length: Number(iovslen) }, (_, i) => {
      const buf = HEAP32[((iovs as number) + (i * 8)) >> 2]
      const bufLen = HEAPU32[(((iovs as number) + (i * 8)) >> 2) + 1]
      return HEAPU8.subarray(buf, buf + bufLen)
    }))
    const nwritten = (fileDescriptor as any).stream.write(buffer)

    HEAPU32[size >> 2] = nwritten
    return WasiErrno.ESUCCESS
  }

  WASI.prototype.random_get = typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function'
    ? function random_get (this: any, buf: Pointer<u8>, buf_len: size): WasiErrno {
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
    }
    : function random_get (this: any, buf: Pointer<u8>, buf_len: size): WasiErrno {
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
    }

  WASI.prototype.fd_prestat_get = function fd_prestat_get (fd: Handle, prestat: Pointer): WasiErrno {
    debug('fd_prestat_get(%d, %d)', fd, prestat)
    prestat = Number(prestat)
    if (prestat === 0) {
      return WasiErrno.EINVAL
    }
    const { HEAPU32 } = getMemory(this)

    const wasi = _wasi.get(this)!
    const { value: fileDescriptor, errno } = wasi.fds.get(fd, BigInt(0), BigInt(0))
    if (errno !== WasiErrno.ESUCCESS) return errno
    if (fileDescriptor.preopen !== 1) return WasiErrno.EINVAL
    HEAPU32[prestat] = 0
    HEAPU32[prestat + 1] = encoder.encode(fileDescriptor.path).length + 1
    return WasiErrno.ESUCCESS
  }

  WASI.prototype.fd_prestat_dir_name = function fd_prestat_dir_name (fd: Handle, path: Pointer<u8>, path_len: size): WasiErrno {
    debug('fd_prestat_dir_name(%d, %d, %d)', fd, path, path_len)
    path = Number(path)
    path_len = Number(path_len)
    if (path === 0) {
      return WasiErrno.EINVAL
    }
    const { HEAPU8 } = getMemory(this)

    const wasi = _wasi.get(this)!
    const { value: fileDescriptor, errno } = wasi.fds.get(fd, BigInt(0), BigInt(0))
    if (errno !== WasiErrno.ESUCCESS) return errno
    if (fileDescriptor.preopen !== 1) return WasiErrno.EBADF
    const buffer = encoder.encode(fileDescriptor.path + '\0')
    const size = buffer.length
    if (size > path_len) return WasiErrno.ENOBUFS
    HEAPU8.set(buffer, path)
    return WasiErrno.ESUCCESS
  }

  WASI.prototype.path_filestat_get = function path_filestat_get (fd: Handle, flags: number, path: Pointer<u8>, path_len: size, filestat: Pointer): WasiErrno {
    debug('path_filestat_get(%d, %d, %d, %d, %d)', fd, flags, path, filestat)
    path = Number(path)
    path_len = Number(path_len)
    filestat = Number(filestat)
    if (path === 0 || filestat === 0) {
      return WasiErrno.EINVAL
    }
    const { HEAPU8, HEAPU64 } = getMemory(this)

    const wasi = _wasi.get(this)!
    const { /* value: fileDescriptor, */ errno } = wasi.fds.get(fd, WasiRights.PATH_FILESTAT_GET, BigInt(0))
    if (errno !== WasiErrno.ESUCCESS) return errno
    const pathString = decoder.decode(HEAPU8.subarray(path, path + path_len))

    // TODO

    let stat
    if ((flags & 1) === 1) {
      stat = vol.statSync(pathString, { bigint: true })
    } else {
      stat = vol.lstatSync(pathString, { bigint: true })
    }

    HEAPU64[filestat] = stat.dev
    HEAPU64[filestat + 8] = stat.ino
    HEAPU64[filestat + 16] = toFileType(stat)
    HEAPU64[filestat + 24] = stat.nlink
    HEAPU64[filestat + 32] = stat.size
    HEAPU64[filestat + 40] = stat.atimeMs * BigInt(1000000)
    HEAPU64[filestat + 48] = stat.mtimeMs * BigInt(1000000)
    HEAPU64[filestat + 56] = stat.ctimeMs * BigInt(1000000)
    return WasiErrno.ESUCCESS
  }

  WASI.prototype.proc_exit = function proc_exit (rval: exitcode): WasiErrno {
    debug(`proc_exit(${rval})`)
    return WasiErrno.ESUCCESS
  }

  return WASI
})()

export { WASI }
