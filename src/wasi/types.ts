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

export const WasiRights = {
  FD_DATASYNC: (BigInt(1) << BigInt(0)) as 1n,
  FD_READ: (BigInt(1) << BigInt(1)) as 2n,
  FD_SEEK: (BigInt(1) << BigInt(2)) as 4n,
  FD_FDSTAT_SET_FLAGS: (BigInt(1) << BigInt(3)) as 8n,
  FD_SYNC: (BigInt(1) << BigInt(4)) as 16n,
  FD_TELL: (BigInt(1) << BigInt(5)) as 32n,
  FD_WRITE: (BigInt(1) << BigInt(6)) as 64n,
  FD_ADVISE: (BigInt(1) << BigInt(7)) as 128n,
  FD_ALLOCATE: (BigInt(1) << BigInt(8)) as 256n,
  PATH_CREATE_DIRECTORY: (BigInt(1) << BigInt(9)) as 512n,
  PATH_CREATE_FILE: (BigInt(1) << BigInt(10)) as 1024n,
  PATH_LINK_SOURCE: (BigInt(1) << BigInt(11)) as 2048n,
  PATH_LINK_TARGET: (BigInt(1) << BigInt(12)) as 4092n,
  PATH_OPEN: (BigInt(1) << BigInt(13)) as 8192n,
  FD_READDIR: (BigInt(1) << BigInt(14)) as 16384n,
  PATH_READLINK: (BigInt(1) << BigInt(15)) as 32768n,
  PATH_RENAME_SOURCE: (BigInt(1) << BigInt(16)) as 65536n,
  PATH_RENAME_TARGET: (BigInt(1) << BigInt(17)) as 131072n,
  PATH_FILESTAT_GET: (BigInt(1) << BigInt(18)) as 262144n,
  PATH_FILESTAT_SET_SIZE: (BigInt(1) << BigInt(19)) as 524288n,
  PATH_FILESTAT_SET_TIMES: (BigInt(1) << BigInt(20)) as 1048576n,
  FD_FILESTAT_GET: (BigInt(1) << BigInt(21)) as 2097152n,
  FD_FILESTAT_SET_SIZE: (BigInt(1) << BigInt(22)) as 4194304n,
  FD_FILESTAT_SET_TIMES: (BigInt(1) << BigInt(23)) as 8388608n,
  PATH_SYMLINK: (BigInt(1) << BigInt(24)) as 16777216n,
  PATH_REMOVE_DIRECTORY: (BigInt(1) << BigInt(25)) as 33554432n,
  PATH_UNLINK_FILE: (BigInt(1) << BigInt(26)) as 67108864n,
  POLL_FD_READWRITE: (BigInt(1) << BigInt(27)) as 134217728n,
  SOCK_SHUTDOWN: (BigInt(1) << BigInt(28)) as 268435456n,
  SOCK_ACCEPT: (BigInt(1) << BigInt(29)) as 536870912n
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

export type u8 = number
export type u16 = number
export type u32 = number
export type s64 = bigint
export type u64 = bigint
export type Handle = number
export type filedelta = s64
export type filesize = u64
export type size = u32 | u64
export type exitcode = u32
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type Pointer<_T = any> = number | bigint
