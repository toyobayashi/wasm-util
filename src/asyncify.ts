import { _WebAssembly } from './webassembly'
import { isPromiseLike, wrapInstanceExports } from './wasi/util'

const ignoreNames = [
  'asyncify_get_state',
  'asyncify_start_rewind',
  'asyncify_start_unwind',
  'asyncify_stop_rewind',
  'asyncify_stop_unwind'
]

// const wrappedExports = new WeakMap<WebAssembly.Exports, WebAssembly.Exports>()

const enum AsyncifyState {
  NONE,
  UNWINDING,
  REWINDING,
}

/** @public */
export type AsyncifyExportName =
  'asyncify_get_state' |
  'asyncify_start_unwind' |
  'asyncify_stop_unwind' |
  'asyncify_start_rewind' |
  'asyncify_stop_rewind'

type AsyncifiedExports = {
  asyncify_get_state: () => AsyncifyState
  asyncify_start_unwind: (p: number | bigint) => void
  asyncify_stop_unwind: () => void
  asyncify_start_rewind: (p: number | bigint) => void
  asyncify_stop_rewind: () => void
  [x: string]: WebAssembly.ExportValue
}

/** @public */
export type Callable = (...args: any[]) => any

/** @public */
export type AsyncifyExportFunction<T> = T extends Callable ? (...args: Parameters<T>) => Promise<ReturnType<T>> : T

/** @public */
export type AsyncifyExports<T, U> = T extends Record<string, any>
  ? {
      [P in keyof T]: T[P] extends Callable
        ? U extends Array<Exclude<keyof T, AsyncifyExportName>>
          ? P extends U[number]
            ? AsyncifyExportFunction<T[P]>
            : T[P]
          : AsyncifyExportFunction<T[P]>
        : T[P]
    }
  : T

/** @public */
export interface AsyncifyOptions {
  wasm64?: boolean
  tryAllocate?: boolean | {
    size?: number
    name?: string
  }
  wrapExports?: string[]
}

interface AsyncifyDataAddress {
  wasm64: boolean
  dataPtr: number
  start: number
  end: number
}

function tryAllocate (instance: WebAssembly.Instance, wasm64: boolean, size: number, mallocName: string): AsyncifyDataAddress {
  if (typeof instance.exports[mallocName] !== 'function' || size <= 0) {
    return {
      wasm64,
      dataPtr: 16,
      start: wasm64 ? 32 : 24,
      end: 1024
    }
  }
  const malloc = instance.exports[mallocName] as Function
  const dataPtr: number = wasm64 ? Number(malloc(BigInt(16) + BigInt(size))) : malloc(8 + size)
  if (dataPtr === 0) {
    throw new Error('Allocate asyncify data failed')
  }
  return wasm64
    ? { wasm64, dataPtr, start: dataPtr + 16, end: dataPtr + 16 + size }
    : { wasm64, dataPtr, start: dataPtr + 8, end: dataPtr + 8 + size }
}

/** @public */
export class Asyncify {
  private value: any = undefined
  private exports: AsyncifiedExports | undefined = undefined
  private dataPtr: number = 0

  public init<T extends WebAssembly.Exports, U extends Array<Exclude<keyof T, AsyncifyExportName>>> (
    memory: WebAssembly.Memory,
    instance: { readonly exports: T },
    options: AsyncifyOptions
  ): { readonly exports: AsyncifyExports<T, U> } {
    if (this.exports) {
      throw new Error('Asyncify has been initialized')
    }
    if (!(memory instanceof _WebAssembly.Memory)) {
      throw new TypeError('Require WebAssembly.Memory object')
    }
    const exports = instance.exports
    for (let i = 0; i < ignoreNames.length; ++i) {
      if (typeof exports[ignoreNames[i]] !== 'function') {
        throw new TypeError('Invalid asyncify wasm')
      }
    }
    let address: AsyncifyDataAddress
    const wasm64 = Boolean(options.wasm64)

    if (!options.tryAllocate) {
      address = {
        wasm64,
        dataPtr: 16,
        start: wasm64 ? 32 : 24,
        end: 1024
      }
    } else {
      if (options.tryAllocate === true) {
        address = tryAllocate(instance, wasm64, 4096, 'malloc')
      } else {
        address = tryAllocate(instance, wasm64, options.tryAllocate.size ?? 4096, options.tryAllocate.name ?? 'malloc')
      }
    }
    this.dataPtr = address.dataPtr
    if (wasm64) {
      new BigInt64Array(memory.buffer, this.dataPtr).set([BigInt(address.start), BigInt(address.end)])
    } else {
      new Int32Array(memory.buffer, this.dataPtr).set([address.start, address.end])
    }
    this.exports = this.wrapExports(exports, options.wrapExports as any) as any
    const asyncifiedInstance = Object.create(_WebAssembly.Instance.prototype)
    Object.defineProperty(asyncifiedInstance, 'exports', { value: this.exports })
    // Object.setPrototypeOf(instance, Instance.prototype)
    return asyncifiedInstance
  }

  private assertState (): void {
    if (this.exports!.asyncify_get_state() !== AsyncifyState.NONE) {
      throw new Error('Asyncify state error')
    }
  }

  public wrapImportFunction<T extends Function> (f: T): T {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _this = this
    return (function (this: any) {
      // eslint-disable-next-line no-unreachable-loop
      while (_this.exports!.asyncify_get_state() === AsyncifyState.REWINDING) {
        _this.exports!.asyncify_stop_rewind()
        return _this.value
      }
      _this.assertState()
      const v = f.apply(this, arguments)
      if (!isPromiseLike(v)) return v
      _this.exports!.asyncify_start_unwind(_this.dataPtr)
      _this.value = v
    }) as any
  }

  public wrapImports<T extends WebAssembly.Imports> (imports: T): T {
    const importObject: any = {}
    Object.keys(imports).forEach(k => {
      const mod = imports[k]
      const newModule: any = {}
      Object.keys(mod).forEach(name => {
        const importValue = mod[name]
        if (typeof importValue === 'function') {
          newModule[name] = this.wrapImportFunction(importValue as any)
        } else {
          newModule[name] = importValue
        }
      })
      importObject[k] = newModule
    })
    return importObject
  }

  public wrapExportFunction<T extends Function> (f: T): AsyncifyExportFunction<T> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _this = this
    return (async function (this: any) {
      _this.assertState()
      let ret = f.apply(this, arguments)

      while (_this.exports!.asyncify_get_state() === AsyncifyState.UNWINDING) {
        _this.exports!.asyncify_stop_unwind()
        _this.value = await _this.value
        _this.assertState()
        _this.exports!.asyncify_start_rewind(_this.dataPtr)
        ret = f.call(this)
      }

      _this.assertState()
      return ret
    }) as any
  }

  public wrapExports<T extends WebAssembly.Exports> (exports: T): AsyncifyExports<T, void>
  public wrapExports<T extends WebAssembly.Exports, U extends Array<Exclude<keyof T, AsyncifyExportName>>> (exports: T, needWrap: U): AsyncifyExports<T, U>
  public wrapExports<T extends WebAssembly.Exports, U extends Array<Exclude<keyof T, AsyncifyExportName>>> (exports: T, needWrap?: U): AsyncifyExports<T, U> {
    return wrapInstanceExports(exports, (exportValue, name) => {
      let ignore = ignoreNames.indexOf(name) !== -1 || typeof exportValue !== 'function'
      if (Array.isArray(needWrap)) {
        ignore = ignore || (needWrap.indexOf(name as any) === -1)
      }
      return ignore ? exportValue : this.wrapExportFunction(exportValue as any)
    }) as AsyncifyExports<T, U>
  }
}

// /** @public */
// export class Instance extends WebAssembly.Instance {
//   constructor (options: AsyncifyOptions, module: WebAssembly.Module, importObject?: WebAssembly.Imports) {
//     importObject = importObject ?? {}
//     const asyncify = new Asyncify()
//     super(module, asyncify.wrapImports(importObject))
//     asyncify.init(importObject, this, options)
//   }

//   get exports (): WebAssembly.Exports {
//     return wrappedExports.get(super.exports)!
//   }
// }
// Object.defineProperty(Instance.prototype, 'exports', { enumerable: true })
