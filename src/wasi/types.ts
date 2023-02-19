/* eslint-disable spaced-comment */
export const enum WasiErrno {
  ESUCCESS = 0,
  E2BIG = 1,
  EACCES = 2,
  EADDRINUSE = 3,
  EADDRNOTAVAIL = 4,
  EAFNOSUPPORT = 5,
  EAGAIN = 6,
  EALREADY = 7,
  EBADF = 8,
  EBADMSG = 9,
  EBUSY = 10,
  ECANCELED = 11,
  ECHILD = 12,
  ECONNABORTED = 13,
  ECONNREFUSED = 14,
  ECONNRESET = 15,
  EDEADLK = 16,
  EDESTADDRREQ = 17,
  EDOM = 18,
  EDQUOT = 19,
  EEXIST = 20,
  EFAULT = 21,
  EFBIG = 22,
  EHOSTUNREACH = 23,
  EIDRM = 24,
  EILSEQ = 25,
  EINPROGRESS = 26,
  EINTR = 27,
  EINVAL = 28,
  EIO = 29,
  EISCONN = 30,
  EISDIR = 31,
  ELOOP = 32,
  EMFILE = 33,
  EMLINK = 34,
  EMSGSIZE = 35,
  EMULTIHOP = 36,
  ENAMETOOLONG = 37,
  ENETDOWN = 38,
  ENETRESET = 39,
  ENETUNREACH = 40,
  ENFILE = 41,
  ENOBUFS = 42,
  ENODEV = 43,
  ENOENT = 44,
  ENOEXEC = 45,
  ENOLCK = 46,
  ENOLINK = 47,
  ENOMEM = 48,
  ENOMSG = 49,
  ENOPROTOOPT = 50,
  ENOSPC = 51,
  ENOSYS = 52,
  ENOTCONN = 53,
  ENOTDIR = 54,
  ENOTEMPTY = 55,
  ENOTRECOVERABLE = 56,
  ENOTSOCK = 57,
  ENOTSUP = 58,
  ENOTTY = 59,
  ENXIO = 60,
  EOVERFLOW = 61,
  EOWNERDEAD = 62,
  EPERM = 63,
  EPIPE = 64,
  EPROTO = 65,
  EPROTONOSUPPORT = 66,
  EPROTOTYPE = 67,
  ERANGE = 68,
  EROFS = 69,
  ESPIPE = 70,
  ESRCH = 71,
  ESTALE = 72,
  ETIMEDOUT = 73,
  ETXTBSY = 74,
  EXDEV = 75,
  ENOTCAPABLE = 76
}

export const enum WasiFileType {
  UNKNOWN = 0,
  BLOCK_DEVICE = 1,
  CHARACTER_DEVICE = 2,
  DIRECTORY = 3,
  REGULAR_FILE = 4,
  SOCKET_DGRAM = 5,
  SOCKET_STREAM = 6,
  SYMBOLIC_LINK = 7
}

const FD_DATASYNC = (/*#__PURE__*/ BigInt(1) << /*#__PURE__*/ BigInt(0)) as 1n
const FD_READ = (/*#__PURE__*/ BigInt(1) << /*#__PURE__*/ BigInt(1)) as 2n
const FD_SEEK = (/*#__PURE__*/ BigInt(1) << /*#__PURE__*/ BigInt(2)) as 4n
const FD_FDSTAT_SET_FLAGS = (/*#__PURE__*/ BigInt(1) << /*#__PURE__*/ BigInt(3)) as 8n
const FD_SYNC = (/*#__PURE__*/ BigInt(1) << /*#__PURE__*/ BigInt(4)) as 16n
const FD_TELL = (/*#__PURE__*/ BigInt(1) << /*#__PURE__*/ BigInt(5)) as 32n
const FD_WRITE = (/*#__PURE__*/ BigInt(1) << /*#__PURE__*/ BigInt(6)) as 64n
const FD_ADVISE = (/*#__PURE__*/ BigInt(1) << /*#__PURE__*/ BigInt(7)) as 128n
const FD_ALLOCATE = (/*#__PURE__*/ BigInt(1) << /*#__PURE__*/ BigInt(8)) as 256n
const PATH_CREATE_DIRECTORY = (/*#__PURE__*/ BigInt(1) << /*#__PURE__*/ BigInt(9)) as 512n
const PATH_CREATE_FILE = (/*#__PURE__*/ BigInt(1) << /*#__PURE__*/ BigInt(10)) as 1024n
const PATH_LINK_SOURCE = (/*#__PURE__*/ BigInt(1) << /*#__PURE__*/ BigInt(11)) as 2048n
const PATH_LINK_TARGET = (/*#__PURE__*/ BigInt(1) << /*#__PURE__*/ BigInt(12)) as 4092n
const PATH_OPEN = (/*#__PURE__*/ BigInt(1) << /*#__PURE__*/ BigInt(13)) as 8192n
const FD_READDIR = (/*#__PURE__*/ BigInt(1) << /*#__PURE__*/ BigInt(14)) as 16384n
const PATH_READLINK = (/*#__PURE__*/ BigInt(1) << /*#__PURE__*/ BigInt(15)) as 32768n
const PATH_RENAME_SOURCE = (/*#__PURE__*/ BigInt(1) << /*#__PURE__*/ BigInt(16)) as 65536n
const PATH_RENAME_TARGET = (/*#__PURE__*/ BigInt(1) << /*#__PURE__*/ BigInt(17)) as 131072n
const PATH_FILESTAT_GET = (/*#__PURE__*/ BigInt(1) << /*#__PURE__*/ BigInt(18)) as 262144n
const PATH_FILESTAT_SET_SIZE = (/*#__PURE__*/ BigInt(1) << /*#__PURE__*/ BigInt(19)) as 524288n
const PATH_FILESTAT_SET_TIMES = (/*#__PURE__*/ BigInt(1) << /*#__PURE__*/ BigInt(20)) as 1048576n
const FD_FILESTAT_GET = (/*#__PURE__*/ BigInt(1) << /*#__PURE__*/ BigInt(21)) as 2097152n
const FD_FILESTAT_SET_SIZE = (/*#__PURE__*/ BigInt(1) << /*#__PURE__*/ BigInt(22)) as 4194304n
const FD_FILESTAT_SET_TIMES = (/*#__PURE__*/ BigInt(1) << /*#__PURE__*/ BigInt(23)) as 8388608n
const PATH_SYMLINK = (/*#__PURE__*/ BigInt(1) << /*#__PURE__*/ BigInt(24)) as 16777216n
const PATH_REMOVE_DIRECTORY = (/*#__PURE__*/ BigInt(1) << /*#__PURE__*/ BigInt(25)) as 33554432n
const PATH_UNLINK_FILE = (/*#__PURE__*/ BigInt(1) << /*#__PURE__*/ BigInt(26)) as 67108864n
const POLL_FD_READWRITE = (/*#__PURE__*/ BigInt(1) << /*#__PURE__*/ BigInt(27)) as 134217728n
const SOCK_SHUTDOWN = (/*#__PURE__*/ BigInt(1) << /*#__PURE__*/ BigInt(28)) as 268435456n
const SOCK_ACCEPT = (/*#__PURE__*/ BigInt(1) << /*#__PURE__*/ BigInt(29)) as 536870912n

export const WasiRights = {
  FD_DATASYNC,
  FD_READ,
  FD_SEEK,
  FD_FDSTAT_SET_FLAGS,
  FD_SYNC,
  FD_TELL,
  FD_WRITE,
  FD_ADVISE,
  FD_ALLOCATE,
  PATH_CREATE_DIRECTORY,
  PATH_CREATE_FILE,
  PATH_LINK_SOURCE,
  PATH_LINK_TARGET,
  PATH_OPEN,
  FD_READDIR,
  PATH_READLINK,
  PATH_RENAME_SOURCE,
  PATH_RENAME_TARGET,
  PATH_FILESTAT_GET,
  PATH_FILESTAT_SET_SIZE,
  PATH_FILESTAT_SET_TIMES,
  FD_FILESTAT_GET,
  FD_FILESTAT_SET_SIZE,
  FD_FILESTAT_SET_TIMES,
  PATH_SYMLINK,
  PATH_REMOVE_DIRECTORY,
  PATH_UNLINK_FILE,
  POLL_FD_READWRITE,
  SOCK_SHUTDOWN,
  SOCK_ACCEPT
}

export const enum WasiWhence {
  SET = 0,
  CUR = 1,
  END = 2
}

export const enum FileControlFlag {
  O_RDONLY = 0,
  O_WRONLY = 1,
  O_RDWR = 2,
  O_CREAT = 64,
  O_EXCL = 128,
  O_NOCTTY = 256,
  O_TRUNC = 512,
  O_APPEND = 1024,
  O_DIRECTORY = 65536,
  O_NOATIME = 262144,
  O_NOFOLLOW = 131072,
  O_SYNC = 1052672,
  O_DIRECT = 16384,
  O_NONBLOCK = 2048
}

export const enum WasiFileControlFlag {
  O_CREAT = (1 << 0),
  O_DIRECTORY = (1 << 1),
  O_EXCL = (1 << 2),
  O_TRUNC = (1 << 3)
}

export const enum WasiFdFlag {
  APPEND = (1 << 0),
  DSYNC = (1 << 1),
  NONBLOCK = (1 << 2),
  RSYNC = (1 << 3),
  SYNC = (1 << 4)
}

export const enum WasiClockid {
  REALTIME = 0,
  MONOTONIC = 1,
  PROCESS_CPUTIME_ID = 2,
  THREAD_CPUTIME_ID = 3
}

export const enum WasiFstFlag {
  SET_ATIM = (1 << 0),
  SET_ATIM_NOW = (1 << 1),
  SET_MTIM = (1 << 2),
  SET_MTIM_NOW = (1 << 3)
}

export const enum WasiEventType {
  CLOCK = 0,
  FD_READ = 1,
  FD_WRITE = 2
}

export const enum WasiSubclockflags {
  ABSTIME = (1 << 0)
}

export interface Subscription<T extends WasiEventType = WasiEventType> {
  userdata: bigint
  type: T
  u: {
    clock: {
      clock_id: number
      timeout: bigint
      precision: bigint
      flags: WasiSubclockflags
    }
    fd_readwrite: {
      fd: number
    }
  }
}

export type FdEventSubscription = Subscription<WasiEventType.FD_READ | WasiEventType.FD_WRITE>

export type u8 = number
export type u16 = number
export type u32 = number
export type s64 = bigint
export type u64 = bigint
export type fd = number
export type filedelta = s64
export type filesize = u64
export type size = u32 | u64
export type exitcode = u32
export type Pointer<T extends (number | bigint) = number | bigint> = number | bigint | T
