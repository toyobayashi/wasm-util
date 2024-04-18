/* eslint-disable spaced-comment */
export function validateObject (value: unknown, name: string): void {
  if (value === null || typeof value !== 'object') {
    throw new TypeError(`${name} must be an object. Received ${value === null ? 'null' : typeof value}`)
  }
}

export function validateArray (value: unknown, name: string): void {
  if (!Array.isArray(value)) {
    throw new TypeError(`${name} must be an array. Received ${value === null ? 'null' : typeof value}`)
  }
}

export function validateBoolean (value: unknown, name: string): void {
  if (typeof value !== 'boolean') {
    throw new TypeError(`${name} must be a boolean. Received ${value === null ? 'null' : typeof value}`)
  }
}

export function validateString (value: unknown, name: string): void {
  if (typeof value !== 'string') {
    throw new TypeError(`${name} must be a string. Received ${value === null ? 'null' : typeof value}`)
  }
}

export function validateFunction (value: unknown, name: string): void {
  if (typeof value !== 'function') {
    throw new TypeError(`${name} must be a function. Received ${value === null ? 'null' : typeof value}`)
  }
}

export function validateUndefined (value: unknown, name: string): void {
  if (value !== undefined) {
    throw new TypeError(`${name} must be undefined. Received ${value === null ? 'null' : typeof value}`)
  }
}

export function validateInt32 (value: unknown, name: string, min = -2147483648, max = 2147483647): void {
  if (typeof value !== 'number') {
    throw new TypeError(`${name} must be a number. Received ${value === null ? 'null' : typeof value}`)
  }
  if (!Number.isInteger(value)) {
    throw new RangeError(`${name} must be a integer.`)
  }
  if (value < min || value > max) {
    throw new RangeError(`${name} must be >= ${min} && <= ${max}. Received ${value}`)
  }
}

export function isPromiseLike (obj: any): obj is PromiseLike<any> {
  return !!(obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function')
}

export function wrapInstanceExports (exports: WebAssembly.Exports, mapFn: (value: WebAssembly.ExportValue, key: string) => WebAssembly.ExportValue): WebAssembly.Exports {
  const newExports = Object.create(null)
  Object.keys(exports).forEach(name => {
    const exportValue = exports[name]
    Object.defineProperty(newExports, name, {
      enumerable: true,
      value: mapFn(exportValue, name)
    })
  })

  return newExports
}

declare const __webpack_public_path__: string
declare const __non_webpack_require__: any

const _require = /*#__PURE__*/ (function () {
  let nativeRequire

  if (typeof __webpack_public_path__ !== 'undefined') {
    nativeRequire = (function () {
      return typeof __non_webpack_require__ !== 'undefined' ? __non_webpack_require__ : undefined
    })()
  } else {
    nativeRequire = (function () {
      return typeof __webpack_public_path__ !== 'undefined' ? (typeof __non_webpack_require__ !== 'undefined' ? __non_webpack_require__ : undefined) : (typeof require !== 'undefined' ? require : undefined)
    })()
  }

  return nativeRequire
})()

export const isMainThread: boolean = /*#__PURE__*/ (function () {
  let worker_threads
  try {
    worker_threads = _require('worker_threads')
  } catch (_) {}
  if (!worker_threads) {
    return typeof importScripts === 'undefined'
  }
  return worker_threads.isMainThread
})()

export const postMsg = isMainThread
  ? () => {}
  : /*#__PURE__*/ (function () {
      let worker_threads: undefined | typeof import('worker_threads')
      try {
        worker_threads = _require('worker_threads')
      } catch (_) {}
      if (!worker_threads) {
        return postMessage
      }
      return function postMessage (data: any) {
        worker_threads!.parentPort!.postMessage({ data })
      }
    })()

export function sleepBreakIf (delay: number, breakIf: () => boolean): boolean {
  const start = Date.now()
  const end = start + delay
  let ret = false
  while (Date.now() < end) {
    if (breakIf()) {
      ret = true
      break
    }
  }
  return ret
}

export function unsharedSlice (view: Uint8Array, start: number, end?: number): Uint8Array {
  return ((typeof SharedArrayBuffer === 'function' && view.buffer instanceof SharedArrayBuffer) || (Object.prototype.toString.call(view.buffer.constructor) === '[object SharedArrayBuffer]'))
    ? view.slice(start, end)
    : view.subarray(start, end)
}
