import { WASI as WASIPreview1 } from './preview1'
import type { Preopen } from './preview1'
import type { exitcode } from './types'

import {
  validateObject,
  validateArray,
  validateBoolean,
  validateFunction,
  validateUndefined,
  validateString
} from './util'
import type { IFs, IFsPromises } from './fs'
import type { Asyncify } from '../asyncify'

// eslint-disable-next-line spaced-comment
const kEmptyObject = /*#__PURE__*/ Object.freeze(/*#__PURE__*/ Object.create(null))
const kExitCode = Symbol('kExitCode')
const kSetMemory = Symbol('kSetMemory')
const kStarted = Symbol('kStarted')
const kInstance = Symbol('kInstance')
const kBindingName = Symbol('kBindingName')

function setupInstance (self: WASI, instance: WebAssembly.Instance): void {
  validateObject(instance, 'instance')
  validateObject(instance.exports, 'instance.exports')

  self[kInstance] = instance
  self[kSetMemory](instance.exports.memory as any)
}

/** @public */
export interface WASIOptions {
  version?: 'unstable' | 'preview1'
  args?: string[] | undefined
  env?: Record<string, string> | undefined
  preopens?: Record<string, string> | undefined

  /**
   * @defaultValue `false`
   */
  returnOnExit?: boolean | undefined

  // /**
  //  * @defaultValue `0`
  //  */
  // stdin?: number | undefined

  // /**
  //  * @defaultValue `1`
  //  */
  // stdout?: number | undefined

  // /**
  //  * @defaultValue `2`
  //  */
  // stderr?: number | undefined

  print?: (str: string) => void
  printErr?: (str: string) => void
}

/** @public */
export interface SyncWASIOptions extends WASIOptions {
  fs?: IFs
}

/** @public */
export interface AsyncWASIOptions extends WASIOptions {
  fs: { promises: IFsPromises }
  asyncify?: Asyncify
}

function validateOptions (this: WASI, options: WASIOptions & { fs?: IFs | { promises: IFsPromises } }): {
  args: string[]
  env: string[]
  preopens: Preopen[]
  stdio: readonly [0, 1, 2]
  _WASI: any
} {
  validateObject(options, 'options')

  let _WASI: any
  if (options.version !== undefined) {
    validateString(options.version, 'options.version')
    switch (options.version) {
      case 'unstable':
        _WASI = WASIPreview1
        this[kBindingName] = 'wasi_unstable'
        break
      case 'preview1':
        _WASI = WASIPreview1
        this[kBindingName] = 'wasi_snapshot_preview1'
        break
      default:
        throw new TypeError(`unsupported WASI version "${options.version as string}"`)
    }
  } else {
    _WASI = WASIPreview1
    this[kBindingName] = 'wasi_snapshot_preview1'
  }

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

  const preopens: Preopen[] = []
  if (options.preopens !== undefined) {
    validateObject(options.preopens, 'options.preopens')
    Object.entries(options.preopens).forEach(
      ({ 0: key, 1: value }) =>
        preopens.push({ mappedPath: String(key), realPath: String(value) })
    )
  }

  if (preopens.length > 0) {
    if (options.fs === undefined) {
      throw new Error('filesystem is disabled, can not preopen directory')
    }
    try {
      validateObject(options.fs, 'options.fs')
    } catch (_) {
      throw new TypeError('Node.js fs like implementation is not provided')
    }
  }

  // if (options.filesystem !== undefined) {
  //   validateObject(options.filesystem, 'options.filesystem')
  //   validateString(options.filesystem.type, 'options.filesystem.type')
  //   if (options.filesystem.type !== 'memfs' && options.filesystem.type !== 'file-system-access-api') {
  //     throw new Error(`Filesystem type ${(options.filesystem as any).type as string} is not supported, only "memfs" and "file-system-access-api" is supported currently`)
  //   }
  //   try {
  //     validateObject(options.filesystem.fs, 'options.filesystem.fs')
  //   } catch (_) {
  //     throw new Error('Node.js fs like implementation is not provided')
  //   }
  // }

  if (options.print !== undefined) validateFunction(options.print, 'options.print')
  if (options.printErr !== undefined) validateFunction(options.printErr, 'options.printErr')

  if (options.returnOnExit !== undefined) {
    validateBoolean(options.returnOnExit, 'options.returnOnExit')
  }

  // const { stdin = 0, stdout = 1, stderr = 2 } = options
  // validateInt32(stdin, 'options.stdin', 0)
  // validateInt32(stdout, 'options.stdout', 0)
  // validateInt32(stderr, 'options.stderr', 0)
  // const stdio = [stdin, stdout, stderr] as const
  const stdio = [0, 1, 2] as const

  return {
    args,
    env,
    preopens,
    stdio,
    _WASI
  }
}

function initWASI (this: WASI, setMemory: (m: WebAssembly.Memory) => void, wrap: any): void {
  this[kSetMemory] = setMemory;
  (this as any).wasiImport = wrap
  this[kStarted] = false
  this[kExitCode] = 0
  this[kInstance] = undefined
}

/** @public */
export class WASI {
  /* addWorkerListener (worker: any): void {
    if (worker && !worker._tybysWasmUtilWasiListener) {
      worker._tybysWasmUtilWasiListener = function _tybysWasmUtilWasiListener (e: any) {
        const data = e.data
        const msg = data.__tybys_wasm_util_wasi__
        if (msg) {
          const type = msg.type
          const payload = msg.payload
          if (type === 'set-timeout') {
            const buffer = payload.buffer
            setTimeout(() => {
              const arr = new Int32Array(buffer)
              Atomics.store(arr, 0, 1)
              Atomics.notify(arr, 0)
            }, payload.delay)
          }
        }
      }
      if (typeof worker.on === 'function') {
        worker.on('message', worker._tybysWasmUtilWasiListener)
      } else {
        worker.addEventListener('message', worker._tybysWasmUtilWasiListener, false)
      }
    }
  } */

  private [kSetMemory]!: (m: WebAssembly.Memory) => void
  private [kStarted]!: boolean
  private [kExitCode]!: number
  private [kInstance]: WebAssembly.Instance | undefined
  private [kBindingName]!: string

  public readonly wasiImport!: Record<string, any>

  public constructor (options: SyncWASIOptions = kEmptyObject) {
    const {
      args,
      env,
      preopens,
      stdio,
      _WASI
    } = validateOptions.call(this, options)

    const wrap = _WASI.createSync(
      args,
      env,
      preopens,
      stdio,
      options.fs,
      options.print,
      options.printErr
    )

    const setMemory = wrap._setMemory!
    delete wrap._setMemory
    initWASI.call(this, setMemory, wrap)
    if (options.returnOnExit) { wrap.proc_exit = wasiReturnOnProcExit.bind(this) }
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

  getImportObject (): Record<string, Record<string, any>> {
    return { [this[kBindingName]]: this.wasiImport }
  }
}

function wasiReturnOnProcExit (this: WASI, rval: exitcode): exitcode {
  this[kExitCode] = rval
  // eslint-disable-next-line @typescript-eslint/no-throw-literal
  throw kExitCode
}

/** @public */
export async function createAsyncWASI (options: AsyncWASIOptions = kEmptyObject): Promise<WASI> {
  const _this = Object.create(WASI.prototype)
  const {
    args,
    env,
    preopens,
    stdio,
    _WASI
  } = validateOptions.call(_this, options)

  if (options.asyncify !== undefined) {
    validateObject(options.asyncify, 'options.asyncify')
    validateFunction(options.asyncify.wrapImportFunction, 'options.asyncify.wrapImportFunction')
  }

  const wrap = await _WASI.createAsync(
    args,
    env,
    preopens,
    stdio,
    options.fs,
    options.print,
    options.printErr,
    options.asyncify
  )

  const setMemory = wrap._setMemory!
  delete wrap._setMemory
  initWASI.call(_this,
    setMemory,
    wrap
  )

  if (options.returnOnExit) { wrap.proc_exit = wasiReturnOnProcExit.bind(_this) }

  return _this
}
