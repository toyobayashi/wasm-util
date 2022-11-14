/** @public */
export interface StatsBase<T> {
  isFile(): boolean
  isDirectory(): boolean
  isBlockDevice(): boolean
  isCharacterDevice(): boolean
  isSymbolicLink(): boolean
  isFIFO(): boolean
  isSocket(): boolean

  dev: T
  ino: T
  mode: T
  nlink: T
  uid: T
  gid: T
  rdev: T
  size: T
  blksize: T
  blocks: T
  atimeMs: T
  mtimeMs: T
  ctimeMs: T
  birthtimeMs: T
  atime: Date
  mtime: Date
  ctime: Date
  birthtime: Date
}

/** @public */
export interface Stats extends StatsBase<number> {}
/** @public */
export interface BigIntStats extends StatsBase<bigint> {}

/** @public */
export interface StatOptions {
  bigint?: boolean
}

/** @public */
export type PathLike = string | Uint8Array | URL

/** @public */
export type BufferEncoding = 'ascii' | 'utf8' | 'utf-8' | 'utf16le' | 'ucs2' | 'ucs-2' | 'base64' | 'base64url' | 'latin1' | 'binary' | 'hex'

/** @public */
export type BufferEncodingOption = 'buffer' | { encoding: 'buffer' }

/** @public */
export interface BaseEncodingOptions {
  encoding?: BufferEncoding
}

/** @public */
export type OpenMode = number | string

/** @public */
export type Mode = number | string

/** @public */
export interface ReadSyncOptions {
  offset?: number
  length?: number
  position?: number
}

/** @public */
export interface IDirent {
  isFile(): boolean
  isDirectory(): boolean
  isBlockDevice(): boolean
  isCharacterDevice(): boolean
  isSymbolicLink(): boolean
  isFIFO(): boolean
  isSocket(): boolean
  name: string
}

/** @public */
export interface MakeDirectoryOptions {
  recursive?: boolean
  mode?: Mode
}

/** @public */
export interface RmDirOptions {
  maxRetries?: number
  recursive?: boolean
  retryDelay?: number
}

/** @public */
export interface FileHandle {
  readonly fd: number
  datasync (): Promise<void>
  sync (): Promise<void>
  read<TBuffer extends Uint8Array> (buffer: TBuffer, offset?: number, length?: number, position?: number): Promise<{ bytesRead: number; buffer: TBuffer }>

  stat (opts?: StatOptions & { bigint?: false }): Promise<Stats>
  stat (opts: StatOptions & { bigint: true }): Promise<BigIntStats>
  stat (opts?: StatOptions): Promise<Stats | BigIntStats>

  truncate (len?: number): Promise<void>

  utimes (atime: string | number | Date, mtime: string | number | Date): Promise<void>

  write<TBuffer extends Uint8Array> (buffer: TBuffer, offset?: number, length?: number, position?: number): Promise<{ bytesWritten: number; buffer: TBuffer }>
  write (data: string | Uint8Array, position?: number, encoding?: BufferEncoding): Promise<{ bytesWritten: number; buffer: string }>

  close (): Promise<void>
}

/** @public */
export interface IFsPromises {
  stat (path: PathLike, options?: StatOptions & { bigint?: false }): Promise<Stats>
  stat (path: PathLike, options: StatOptions & { bigint: true }): Promise<BigIntStats>
  stat (path: PathLike, options?: StatOptions): Promise<Stats | BigIntStats>

  lstat (path: PathLike, options?: StatOptions & { bigint?: false }): Promise<Stats>
  lstat (path: PathLike, options: StatOptions & { bigint: true }): Promise<BigIntStats>
  lstat (path: PathLike, options?: StatOptions): Promise<Stats | BigIntStats>

  utimes (path: PathLike, atime: string | number | Date, mtime: string | number | Date): Promise<void>

  open (path: PathLike, flags: OpenMode, mode?: Mode): Promise<FileHandle>

  read<TBuffer extends Uint8Array>(
    handle: FileHandle,
    buffer: TBuffer,
    offset?: number,
    length?: number,
    position?: number,
  ): Promise<{ bytesRead: number; buffer: TBuffer }>

  write<TBuffer extends Uint8Array>(
    handle: FileHandle,
    buffer: TBuffer,
    offset?: number,
    length?: number, position?: number
  ): Promise<{ bytesWritten: number; buffer: TBuffer }>

  readlink (path: PathLike, options?: BaseEncodingOptions | BufferEncoding): Promise<string>
  readlink (path: PathLike, options: BufferEncodingOption): Promise<Uint8Array>
  readlink (path: PathLike, options?: BaseEncodingOptions | string): Promise<string | Uint8Array>

  realpath (path: PathLike, options?: BaseEncodingOptions | BufferEncoding): Promise<string>
  realpath (path: PathLike, options: BufferEncodingOption): Promise<Uint8Array>
  realpath (path: PathLike, options?: BaseEncodingOptions | string): Promise<string | Uint8Array>

  truncate (path: PathLike, len?: number): Promise<void>
  ftruncate (handle: FileHandle, len?: number): Promise<void>
  fdatasync (handle: FileHandle): Promise<void>
  futimes (handle: FileHandle, atime: string | number | Date, mtime: string | number | Date): Promise<void>

  readdir (path: PathLike, options?: { encoding: BufferEncoding | null; withFileTypes?: false } | BufferEncoding): Promise<string[]>
  readdir (path: PathLike, options: { encoding: 'buffer'; withFileTypes?: false } | 'buffer'): Promise<Uint8Array[]>
  readdir (path: PathLike, options?: BaseEncodingOptions & { withFileTypes?: false } | BufferEncoding): Promise<string[] | Uint8Array[]>
  readdir (path: PathLike, options: BaseEncodingOptions & { withFileTypes: true }): Promise<IDirent[]>

  fsync (handle: FileHandle): Promise<void>

  mkdir (path: PathLike, options: MakeDirectoryOptions & { recursive: true }): Promise<string | undefined>
  mkdir (path: PathLike, options?: Mode | (MakeDirectoryOptions & { recursive?: false })): Promise<void>
  mkdir (path: PathLike, options?: Mode | MakeDirectoryOptions): Promise<string | undefined>

  rmdir (path: PathLike, options?: RmDirOptions): Promise<void>

  link (existingPath: PathLike, newPath: PathLike): Promise<void>
  unlink (path: PathLike): Promise<void>
  rename (oldPath: PathLike, newPath: PathLike): Promise<void>
  symlink (target: PathLike, path: PathLike, type?: 'dir' | 'file' | 'junction'): Promise<void>
}

/** @public */
export interface IFs {
  fstatSync (fd: number, options?: StatOptions & { bigint?: false }): Stats
  fstatSync (fd: number, options: StatOptions & { bigint: true }): BigIntStats
  fstatSync (fd: number, options?: StatOptions): Stats | BigIntStats

  statSync (path: PathLike, options?: StatOptions & { bigint?: false }): Stats
  statSync (path: PathLike, options: StatOptions & { bigint: true }): BigIntStats
  statSync (path: PathLike, options?: StatOptions): Stats | BigIntStats

  lstatSync (path: PathLike, options?: StatOptions & { bigint?: false }): Stats
  lstatSync (path: PathLike, options: StatOptions & { bigint: true }): BigIntStats
  lstatSync (path: PathLike, options?: StatOptions): Stats | BigIntStats

  utimesSync (path: PathLike, atime: string | number | Date, mtime: string | number | Date): void

  openSync (path: PathLike, flags: OpenMode, mode?: Mode): number

  readSync (fd: number, buffer: ArrayBufferView, offset: number, length: number, position: number | null): number
  readSync (fd: number, buffer: ArrayBufferView, opts?: ReadSyncOptions): number

  writeSync (fd: number, buffer: ArrayBufferView, offset?: number, length?: number, position?: number): number
  writeSync (fd: number, string: string, position?: number, encoding?: BufferEncoding): number

  closeSync (fd: number): void

  readlinkSync (path: PathLike, options?: BaseEncodingOptions | BufferEncoding): string
  readlinkSync (path: PathLike, options: BufferEncodingOption): Uint8Array
  readlinkSync (path: PathLike, options?: BaseEncodingOptions | string): string | Uint8Array

  realpathSync (path: PathLike, options?: BaseEncodingOptions | BufferEncoding): string
  realpathSync (path: PathLike, options: BufferEncodingOption): Uint8Array
  realpathSync (path: PathLike, options?: BaseEncodingOptions | string): string | Uint8Array

  truncateSync (path: PathLike, len?: number): void
  ftruncateSync (fd: number, len?: number): void
  fdatasyncSync (fd: number): void
  futimesSync (fd: number, atime: string | number | Date, mtime: string | number | Date): void

  readdirSync (path: PathLike, options?: { encoding: BufferEncoding | null; withFileTypes?: false } | BufferEncoding): string[]
  readdirSync (path: PathLike, options: { encoding: 'buffer'; withFileTypes?: false } | 'buffer'): Uint8Array[]
  readdirSync (path: PathLike, options?: BaseEncodingOptions & { withFileTypes?: false } | BufferEncoding): string[] | Uint8Array[]
  readdirSync (path: PathLike, options: BaseEncodingOptions & { withFileTypes: true }): IDirent[]

  fsyncSync (fd: number): void

  mkdirSync (path: PathLike, options: MakeDirectoryOptions & { recursive: true }): string | undefined
  mkdirSync (path: PathLike, options?: Mode | (MakeDirectoryOptions & { recursive?: false })): void
  mkdirSync (path: PathLike, options?: Mode | MakeDirectoryOptions): string | undefined

  rmdirSync (path: PathLike, options?: RmDirOptions): void

  linkSync (existingPath: PathLike, newPath: PathLike): void
  unlinkSync (path: PathLike): void
  renameSync (oldPath: PathLike, newPath: PathLike): void
  symlinkSync (target: PathLike, path: PathLike, type?: 'dir' | 'file' | 'junction'): void
}
