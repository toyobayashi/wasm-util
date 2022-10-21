import { WASI as _WASI } from './preview1'
import type { exitcode } from './types'

import {
  validateObject,
  validateArray,
  validateBoolean,
  validateFunction,
  validateUndefined,
  validateInt32
} from './util'

const kEmptyObject = Object.freeze(Object.create(null))
const kExitCode = Symbol('kExitCode')
const kSetMemory = Symbol('kSetMemory')
const kStarted = Symbol('kStarted')
const kInstance = Symbol('kInstance')

function setupInstance (self: WASI, instance: WebAssembly.Instance): void {
  validateObject(instance, 'instance')
  validateObject(instance.exports, 'instance.exports')

  self[kInstance] = instance
  self[kSetMemory](instance.exports.memory as any)
}

/** @public */
export interface WASIOptions {
  args?: string[] | undefined
  env?: Record<string, string> | undefined
  preopens?: Record<string, string> | undefined

  /**
   * @defaultValue `false`
   */
  returnOnExit?: boolean | undefined

  /**
   * @defaultValue `0`
   */
  stdin?: number | undefined

  /**
   * @defaultValue `1`
   */
  stdout?: number | undefined

  /**
   * @defaultValue `2`
   */
  stderr?: number | undefined
}

/** @public */
export class WASI {
  private [kSetMemory]: (m: WebAssembly.Memory) => void
  private [kStarted]: boolean
  private [kExitCode]: number
  private [kInstance]: WebAssembly.Instance | undefined

  public readonly wasiImport: Record<string, any>

  constructor (options: WASIOptions = kEmptyObject) {
    validateObject(options, 'options')

    if (options.args !== undefined) {
      validateArray(options.args, 'options.args')
    }
    const args = (options.args ?? []).map(String)

    const env: string[] = []
    if (options.env !== undefined) {
      validateObject(options.env, 'options.env')
      Object.entries(options.env).forEach(({ 0: key, 1: value }) => {
        if (value !== undefined) {
          env.push(`${key}=${value}`)
        }
      })
    }

    const preopens: string[] = []
    if (options.preopens !== undefined) {
      validateObject(options.preopens, 'options.preopens')
      Object.entries(options.preopens).forEach(
        ({ 0: key, 1: value }) =>
          preopens.push(String(key), String(value))
      )
    }

    const { stdin = 0, stdout = 1, stderr = 2 } = options
    validateInt32(stdin, 'options.stdin', 0)
    validateInt32(stdout, 'options.stdout', 0)
    validateInt32(stderr, 'options.stderr', 0)
    const stdio = [stdin, stdout, stderr] as const

    const wrap = new _WASI(args, env, preopens, stdio)

    for (const prop in wrap) {
      wrap[prop] = wrap[prop].bind(wrap)
    }

    if (options.returnOnExit !== undefined) {
      validateBoolean(options.returnOnExit, 'options.returnOnExit')
      if (options.returnOnExit) { wrap.proc_exit = wasiReturnOnProcExit.bind(this) }
    }

    this[kSetMemory] = wrap._setMemory
    delete wrap._setMemory
    this.wasiImport = wrap
    this[kStarted] = false
    this[kExitCode] = 0
    this[kInstance] = undefined
  }

  // Must not export _initialize, must export _start
  start (instance: WebAssembly.Instance): number | undefined | Promise<number> | Promise<undefined> {
    if (this[kStarted]) {
      throw new Error('WASI instance has already started')
    }
    this[kStarted] = true

    setupInstance(this, instance)

    const { _start, _initialize } = this[kInstance]!.exports

    validateFunction(_start, 'instance.exports._start')
    validateUndefined(_initialize, 'instance.exports._initialize')

    let ret
    try {
      ret = (_start as () => any)()
    } catch (err) {
      if (err !== kExitCode) {
        throw err
      }
    }

    if (ret instanceof Promise) {
      return ret.then(
        () => this[kExitCode],
        (err) => {
          if (err !== kExitCode) {
            throw err
          }
          return this[kExitCode]
        }
      )
    }
    return this[kExitCode]
  }

  // Must not export _start, may optionally export _initialize
  initialize (instance: WebAssembly.Instance): void | Promise<void> {
    if (this[kStarted]) {
      throw new Error('WASI instance has already started')
    }
    this[kStarted] = true

    setupInstance(this, instance)

    const { _start, _initialize } = this[kInstance]!.exports

    validateUndefined(_start, 'instance.exports._start')
    if (_initialize !== undefined) {
      validateFunction(_initialize, 'instance.exports._initialize')
      return (_initialize as () => any)()
    }
  }
}

function wasiReturnOnProcExit (this: WASI, rval: exitcode): exitcode {
  this[kExitCode] = rval
  // eslint-disable-next-line @typescript-eslint/no-throw-literal
  throw kExitCode
}
