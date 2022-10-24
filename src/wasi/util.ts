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
