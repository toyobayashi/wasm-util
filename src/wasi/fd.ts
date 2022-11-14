import type { IFs, BigIntStats } from './fs'
import {
  WasiErrno,
  FileControlFlag,
  WasiFileType,
  WasiWhence
} from './types'
import { getRights } from './rights'
import { WasiError } from './error'

export function concatBuffer (buffers: Uint8Array[], size?: number): Uint8Array {
  let total = 0
  if (typeof size === 'number' && size >= 0) {
    total = size
  } else {
    for (let i = 0; i < buffers.length; i++) {
      const buffer = buffers[i]
      total += buffer.length
    }
  }
  let pos = 0
  const ret = new Uint8Array(total)
  for (let i = 0; i < buffers.length; i++) {
    const buffer = buffers[i]
    ret.set(buffer, pos)
    pos += buffer.length
  }
  return ret
}

export class FileDescriptor {
  public pos = BigInt(0)
  public size = BigInt(0)

  constructor (
    public id: number,
    public fd: number,
    public path: string,
    public realPath: string,
    public type: WasiFileType,
    public rightsBase: bigint,
    public rightsInheriting: bigint,
    public preopen: number
  ) {}

  seek (offset: bigint, whence: WasiWhence): bigint {
    if (whence === WasiWhence.SET) {
      this.pos = BigInt(offset)
    } else if (whence === WasiWhence.CUR) {
      this.pos += BigInt(offset)
    } else if (whence === WasiWhence.END) {
      this.pos = BigInt(this.size) - BigInt(offset)
    } else {
      throw new WasiError('Unknown whence', WasiErrno.EIO)
    }
    return this.pos
  }
}

export class StandardOutput extends FileDescriptor {
  private readonly _log: (str: string) => void
  private _buf: Uint8Array | null
  constructor (
    log: (str: string) => void,
    id: number,
    fd: number,
    path: string,
    realPath: string,
    type: WasiFileType,
    rightsBase: bigint,
    rightsInheriting: bigint,
    preopen: number
  ) {
    super(id, fd, path, realPath, type, rightsBase, rightsInheriting, preopen)
    this._log = log
    this._buf = null
  }

  write (buffer: Uint8Array): number {
    const originalBuffer = buffer
    if (this._buf) {
      buffer = concatBuffer([this._buf, buffer])
      this._buf = null
    }

    if (buffer.indexOf(10) === -1) {
      this._buf = buffer
      return originalBuffer.byteLength
    }

    let written = 0
    let lastBegin = 0
    let index
    while ((index = buffer.indexOf(10, written)) !== -1) {
      const str = new TextDecoder().decode(buffer.subarray(lastBegin, index))
      this._log(str)
      written += index - lastBegin + 1
      lastBegin = index + 1
    }

    if (written < buffer.length) {
      this._buf = buffer.slice(written)
    }

    return originalBuffer.byteLength
  }
}

export function toFileType (stat: BigIntStats): WasiFileType {
  if (stat.isBlockDevice()) return WasiFileType.BLOCK_DEVICE
  if (stat.isCharacterDevice()) return WasiFileType.CHARACTER_DEVICE
  if (stat.isDirectory()) return WasiFileType.DIRECTORY
  if (stat.isSocket()) return WasiFileType.SOCKET_STREAM
  if (stat.isFile()) return WasiFileType.REGULAR_FILE
  if (stat.isSymbolicLink()) return WasiFileType.SYMBOLIC_LINK
  return WasiFileType.UNKNOWN
}

export function toFileStat (view: DataView, buf: number, stat: BigIntStats): void {
  view.setBigUint64(buf, stat.dev, true)
  view.setBigUint64(buf + 8, stat.ino, true)
  view.setBigUint64(buf + 16, BigInt(toFileType(stat)), true)
  view.setBigUint64(buf + 24, stat.nlink, true)
  view.setBigUint64(buf + 32, stat.size, true)
  view.setBigUint64(buf + 40, stat.atimeMs * BigInt(1000000), true)
  view.setBigUint64(buf + 48, stat.mtimeMs * BigInt(1000000), true)
  view.setBigUint64(buf + 56, stat.ctimeMs * BigInt(1000000), true)
}

export interface FileDescriptorTableOptions {
  size: number
  in: number
  out: number
  err: number
  fs?: IFs
  print?: (str: string) => void
  printErr?: (str: string) => void
}

export class FileDescriptorTable {
  public used: number
  public size: number
  public fds: FileDescriptor[]
  public stdio: [number, number, number]
  public print?: (str: string) => void
  public printErr?: (str: string) => void
  private readonly fs: IFs | undefined
  constructor (options: FileDescriptorTableOptions) {
    this.used = 0
    this.size = options.size
    this.fds = Array(options.size)
    this.stdio = [options.in, options.out, options.err]
    this.fs = options.fs
    this.print = options.print
    this.printErr = options.printErr

    this.insertStdio(options.in, 0, '<stdin>')
    this.insertStdio(options.out, 1, '<stdout>')
    this.insertStdio(options.err, 2, '<stderr>')
  }

  private insertStdio (
    fd: number,
    expected: number,
    name: string
  ): FileDescriptor {
    const type = WasiFileType.CHARACTER_DEVICE
    const { base, inheriting } = getRights(this.stdio, fd, FileControlFlag.O_RDWR, type)
    const wrap = this.insert(fd, name, name, type, base, inheriting, 0)
    if (wrap.id !== expected) {
      throw new WasiError(`id: ${wrap.id} !== expected: ${expected}`, WasiErrno.EBADF)
    }
    return wrap
  }

  insert (
    fd: number,
    mappedPath: string,
    realPath: string,
    type: WasiFileType,
    rightsBase: bigint,
    rightsInheriting: bigint,
    preopen: number
  ): FileDescriptor {
    let index = -1
    if (this.used >= this.size) {
      const newSize = this.size * 2
      this.fds.length = newSize
      index = this.size
      this.size = newSize
    } else {
      for (let i = 0; i < this.size; ++i) {
        if (this.fds[i] == null) {
          index = i
          break
        }
      }
    }

    let entry: FileDescriptor
    if (mappedPath === '<stdout>') {
      entry = new StandardOutput(
        this.print ?? console.log,
        index,
        fd,
        mappedPath,
        realPath,
        type,
        rightsBase,
        rightsInheriting,
        preopen
      )
    } else if (mappedPath === '<stderr>') {
      entry = new StandardOutput(
        this.printErr ?? console.error,
        index,
        fd,
        mappedPath,
        realPath,
        type,
        rightsBase,
        rightsInheriting,
        preopen
      )
    } else {
      entry = new FileDescriptor(
        index,
        fd,
        mappedPath,
        realPath,
        type,
        rightsBase,
        rightsInheriting,
        preopen
      )
    }

    this.fds[index] = entry
    this.used++
    return entry
  }

  getFileTypeByFd (fd: number): WasiFileType {
    const stat: any = this.fs!.fstatSync(fd)
    return toFileType(stat)
  }

  insertPreopen (fd: number, mappedPath: string, realPath: string): FileDescriptor {
    const type = this.getFileTypeByFd(fd)
    if (type !== WasiFileType.DIRECTORY) {
      throw new WasiError(`Preopen not dir: ["${mappedPath}", "${realPath}"]`, WasiErrno.ENOTDIR)
    }
    const result = getRights(this.stdio, fd, 0, type)
    return this.insert(fd, mappedPath, realPath, type, result.base, result.inheriting, 1)
  }

  get (id: number, base: bigint, inheriting: bigint): FileDescriptor {
    if (id >= this.size) {
      throw new WasiError('Invalid fd', WasiErrno.EBADF)
    }

    const entry = this.fds[id]
    if (!entry || entry.id !== id) {
      throw new WasiError('Bad file descriptor', WasiErrno.EBADF)
    }

    /* Validate that the fd has the necessary rights. */
    if ((~entry.rightsBase & base) !== BigInt(0) || (~entry.rightsInheriting & inheriting) !== BigInt(0)) {
      throw new WasiError('Capabilities insufficient', WasiErrno.ENOTCAPABLE)
    }
    return entry
  }

  remove (id: number): void {
    if (id >= this.size) {
      throw new WasiError('Invalid fd', WasiErrno.EBADF)
    }

    const entry = this.fds[id]
    if (!entry || entry.id !== id) {
      throw new WasiError('Bad file descriptor', WasiErrno.EBADF)
    }

    this.fds[id] = undefined!
    this.used--
  }

  renumber (dst: number, src: number): void {
    if (dst === src) return
    if (dst >= this.size || src >= this.size) {
      throw new WasiError('Invalid fd', WasiErrno.EBADF)
    }
    const dstEntry = this.fds[dst]
    const srcEntry = this.fds[src]
    if (!dstEntry || !srcEntry || dstEntry.id !== dst || srcEntry.id !== src) {
      throw new WasiError('Invalid fd', WasiErrno.EBADF)
    }
    this.fs!.closeSync(dstEntry.fd)
    this.fds[dst] = this.fds[src]
    this.fds[dst].id = dst
    this.fds[src] = undefined!
    this.used--
  }
}
