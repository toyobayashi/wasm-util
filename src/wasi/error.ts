import { WasiErrno } from './types'

export function strerror (errno: WasiErrno): string {
  switch (errno) {
    case WasiErrno.ESUCCESS: return 'No error occurred. System call completed successfully.'
    case WasiErrno.E2BIG: return 'Argument list too long.'
    case WasiErrno.EACCES: return 'Permission denied.'
    case WasiErrno.EADDRINUSE: return 'Address in use.'
    case WasiErrno.EADDRNOTAVAIL: return 'Address not available.'
    case WasiErrno.EAFNOSUPPORT: return 'Address family not supported.'
    case WasiErrno.EAGAIN: return 'Resource unavailable, or operation would block.'
    case WasiErrno.EALREADY: return 'Connection already in progress.'
    case WasiErrno.EBADF: return 'Bad file descriptor.'
    case WasiErrno.EBADMSG: return 'Bad message.'
    case WasiErrno.EBUSY: return 'Device or resource busy.'
    case WasiErrno.ECANCELED: return 'Operation canceled.'
    case WasiErrno.ECHILD: return 'No child processes.'
    case WasiErrno.ECONNABORTED: return 'Connection aborted.'
    case WasiErrno.ECONNREFUSED: return 'Connection refused.'
    case WasiErrno.ECONNRESET: return 'Connection reset.'
    case WasiErrno.EDEADLK: return 'Resource deadlock would occur.'
    case WasiErrno.EDESTADDRREQ: return 'Destination address required.'
    case WasiErrno.EDOM: return 'Mathematics argument out of domain of function.'
    case WasiErrno.EDQUOT: return 'Reserved.'
    case WasiErrno.EEXIST: return 'File exists.'
    case WasiErrno.EFAULT: return 'Bad address.'
    case WasiErrno.EFBIG: return 'File too large.'
    case WasiErrno.EHOSTUNREACH: return 'Host is unreachable.'
    case WasiErrno.EIDRM: return 'Identifier removed.'
    case WasiErrno.EILSEQ: return 'Illegal byte sequence.'
    case WasiErrno.EINPROGRESS: return 'Operation in progress.'
    case WasiErrno.EINTR: return 'Interrupted function.'
    case WasiErrno.EINVAL: return 'Invalid argument.'
    case WasiErrno.EIO: return 'I/O error.'
    case WasiErrno.EISCONN: return 'Socket is connected.'
    case WasiErrno.EISDIR: return 'Is a directory.'
    case WasiErrno.ELOOP: return 'Too many levels of symbolic links.'
    case WasiErrno.EMFILE: return 'File descriptor value too large.'
    case WasiErrno.EMLINK: return 'Too many links.'
    case WasiErrno.EMSGSIZE: return 'Message too large.'
    case WasiErrno.EMULTIHOP: return 'Reserved.'
    case WasiErrno.ENAMETOOLONG: return 'Filename too long.'
    case WasiErrno.ENETDOWN: return 'Network is down.'
    case WasiErrno.ENETRESET: return 'Connection aborted by network.'
    case WasiErrno.ENETUNREACH: return 'Network unreachable.'
    case WasiErrno.ENFILE: return 'Too many files open in system.'
    case WasiErrno.ENOBUFS: return 'No buffer space available.'
    case WasiErrno.ENODEV: return 'No such device.'
    case WasiErrno.ENOENT: return 'No such file or directory.'
    case WasiErrno.ENOEXEC: return 'Executable file format error.'
    case WasiErrno.ENOLCK: return 'No locks available.'
    case WasiErrno.ENOLINK: return 'Reserved.'
    case WasiErrno.ENOMEM: return 'Not enough space.'
    case WasiErrno.ENOMSG: return 'No message of the desired type.'
    case WasiErrno.ENOPROTOOPT: return 'Protocol not available.'
    case WasiErrno.ENOSPC: return 'No space left on device.'
    case WasiErrno.ENOSYS: return 'Function not supported.'
    case WasiErrno.ENOTCONN: return 'The socket is not connected.'
    case WasiErrno.ENOTDIR: return 'Not a directory or a symbolic link to a directory.'
    case WasiErrno.ENOTEMPTY: return 'Directory not empty.'
    case WasiErrno.ENOTRECOVERABLE: return 'State not recoverable.'
    case WasiErrno.ENOTSOCK: return 'Not a socket.'
    case WasiErrno.ENOTSUP: return 'Not supported, or operation not supported on socket.'
    case WasiErrno.ENOTTY: return 'Inappropriate I/O control operation.'
    case WasiErrno.ENXIO: return 'No such device or address.'
    case WasiErrno.EOVERFLOW: return 'Value too large to be stored in data type.'
    case WasiErrno.EOWNERDEAD: return 'Previous owner died.'
    case WasiErrno.EPERM: return 'Operation not permitted.'
    case WasiErrno.EPIPE: return 'Broken pipe.'
    case WasiErrno.EPROTO: return 'Protocol error.'
    case WasiErrno.EPROTONOSUPPORT: return 'Protocol not supported.'
    case WasiErrno.EPROTOTYPE: return 'Protocol wrong type for socket.'
    case WasiErrno.ERANGE: return 'Result too large.'
    case WasiErrno.EROFS: return 'Read-only file system.'
    case WasiErrno.ESPIPE: return 'Invalid seek.'
    case WasiErrno.ESRCH: return 'No such process.'
    case WasiErrno.ESTALE: return 'Reserved.'
    case WasiErrno.ETIMEDOUT: return 'Connection timed out.'
    case WasiErrno.ETXTBSY: return 'Text file busy.'
    case WasiErrno.EXDEV: return 'Cross-device link.'
    case WasiErrno.ENOTCAPABLE: return 'Extension: Capabilities insufficient.'
    default: return 'Unknown error.'
  }
}

export class WasiError extends Error {
  constructor (message: string, public errno: WasiErrno) {
    super(message)
  }

  getErrorMessage (): string {
    return strerror(this.errno)
  }
}

export type Result<T> = { value: T; errno: WasiErrno.ESUCCESS } | { value: undefined; errno: Exclude<WasiErrno, WasiErrno.ESUCCESS> }
