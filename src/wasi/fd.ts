import {
  WasiErrno,
  WasiFileType,
  WasiWhence
} from './types'
import { getRights } from './rights'
import { WasiError } from './error'
import type { Result } from './error'

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

class FileDescriptor {
  public stream: Stream = undefined!

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
}

class Stream {
  protected _pos: number
  protected _size: number
  constructor (size: number) {
    this._pos = 0
    this._size = size || 0
  }

  seek (offset: number, whence: WasiWhence): void {
    if (whence === WasiWhence.SET) {
      this._pos = offset
    } else if (whence === WasiWhence.CUR) {
      this._pos += offset
    } else if (whence === WasiWhence.END) {
      this._pos = this._size - offset
    }
  }
}

class StandardInput extends Stream {
  constructor () {
    super(0)
  }

  seek (_offset: number, _whence: WasiWhence): void {}

  read (): Uint8Array {
    const value = window.prompt()
    if (value === null) return new Uint8Array()
    const buffer = new TextEncoder().encode(value + '\n')
    return buffer
  }
}

class StandardOutput extends Stream {
  private readonly _print: (str: string) => void
  private _buf: Uint8Array | null
  constructor (print: (str: string) => void) {
    super(0)
    this._print = print
    this._buf = null
  }

  seek (_offset: number, _whence: WasiWhence): void {}

  write (buffer: Uint8Array): number {
    if (this._buf) {
      buffer = concatBuffer([this._buf, buffer])
      this._buf = null
    }
    let written = 0
    let lastBegin = 0
    let index
    while ((index = buffer.indexOf(10, written)) !== -1) {
      const str = new TextDecoder().decode(buffer.subarray(lastBegin, index))
      this._print(str)
      written += index - lastBegin + 1
      lastBegin = index + 1
    }

    if (written < buffer.length) {
      this._buf = buffer.slice(written)
    }

    return written
  }
}

function insertStdio (
  table: FileDescriptorTable,
  fd: number,
  expected: number,
  name: string,
  stream: StandardInput | StandardOutput
): FileDescriptor {
  const type = WasiFileType.CHARACTER_DEVICE
  const { base, inheriting } = getRights(fd, 2, type)
  const wrap = table.insert(fd, name, name, type, base, inheriting, 0, stream)
  if (wrap.id !== expected) {
    throw new WasiError(`id: ${wrap.id} !== expected: ${expected}`, WasiErrno.EBADF)
  }
  return wrap
}

export interface FileDescriptorTableOptions {
  size: number
  in: number
  out: number
  err: number
}

export class FileDescriptorTable {
  public used: number
  public size: number
  public fds: FileDescriptor[]
  constructor (options: FileDescriptorTableOptions) {
    this.used = 0
    this.size = options.size
    this.fds = Array(options.size)

    insertStdio(this, options.in, 0, '<stdin>', new StandardInput())
    insertStdio(this, options.out, 1, '<stdout>', new StandardOutput(console.log))
    insertStdio(this, options.err, 2, '<stderr>', new StandardOutput(console.error))
  }

  insert (
    fd: number,
    mappedPath: string,
    realPath: string,
    type: WasiFileType,
    rightsBase: bigint,
    rightsInheriting: bigint,
    preopen: number,
    stream: Stream
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

    const entry = new FileDescriptor(
      index,
      fd,
      mappedPath,
      realPath,
      type,
      rightsBase,
      rightsInheriting,
      preopen
    )
    entry.stream = stream
    this.fds[index] = entry
    this.used++
    return entry
  }

  get (id: number, base: bigint, inheriting: bigint): Result<FileDescriptor> {
    if (id > this.size) {
      return { value: undefined, errno: WasiErrno.EBADF }
    }

    const entry = this.fds[id]
    if (!entry || entry.id !== id) {
      return { value: undefined, errno: WasiErrno.EBADF }
    }

    /* Validate that the fd has the necessary rights. */
    if ((~entry.rightsBase & base) !== BigInt(0) || (~entry.rightsInheriting & inheriting) !== BigInt(0)) {
      return { value: undefined, errno: WasiErrno.ENOTCAPABLE }
    }
    return { value: entry, errno: WasiErrno.ESUCCESS }
  }
}
