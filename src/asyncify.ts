function isPromise (obj: any): obj is PromiseLike<any> {
  return !!(obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function')
}

const ignoreNames = [
  'asyncify_get_state',
  'asyncify_start_rewind',
  'asyncify_start_unwind',
  'asyncify_stop_rewind',
  'asyncify_stop_unwind'
]

const wrappedExports = new WeakMap<WebAssembly.Exports, WebAssembly.Exports>()

const enum AsyncifyState {
  NONE,
  UNWINDING,
  REWINDING,
}

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
export type AsyncifyExports<T> = T extends Record<string, any>
  ? {
      [P in keyof T]: T[P] extends Callable ? AsyncifyExportFunction<T[P]> : T[P]
    }
  : T

/** @public */
export interface AsyncifyDataAddress {
  wasm64: boolean
  dataPtr: number
  start: number
  end: number
}

/** @public */
export class Asyncify {
  private value: any = undefined
  private exports: AsyncifiedExports | undefined = undefined
  private dataPtr: number = 0

  public tryAllocate (instance: WebAssembly.Instance, size = 4096, mallocName = 'malloc', wasm64 = false): AsyncifyDataAddress | undefined {
    if (typeof instance.exports[mallocName] !== 'function') return
    const malloc = instance.exports[mallocName] as Function
    const dataPtr: number = wasm64 ? Number(malloc(BigInt(16))) : malloc(8)
    const buffer: number = wasm64 ? Number(malloc(BigInt(size))) : malloc(size)
    return { wasm64, dataPtr, start: buffer, end: buffer + size }
  }

  public init (imports: WebAssembly.Imports, instance: WebAssembly.Instance, address?: AsyncifyDataAddress): void {
    if (instance instanceof Instance) return
    const exports = instance.exports
    const memory = exports.memory || (imports.env?.memory)
    if (!(memory instanceof WebAssembly.Memory)) {
      throw new TypeError('Require WebAssembly.Memory object')
    }
    for (let i = 0; i < ignoreNames.length; ++i) {
      if (typeof exports[ignoreNames[i]] !== 'function') {
        throw new TypeError('Invalid asyncify wasm')
      }
    }
    if (!address) {
      address = {
        wasm64: false,
        dataPtr: 16,
        start: 24,
        end: 1024
      }
    }
    this.dataPtr = address.dataPtr
    if (address.wasm64) {
      new BigInt64Array(memory.buffer, this.dataPtr).set([BigInt(address.start), BigInt(address.end)])
    } else {
      new Int32Array(memory.buffer, this.dataPtr).set([address.start, address.end])
    }
    this.exports = this.wrapExports(exports) as any
    Object.setPrototypeOf(instance, Instance.prototype)
  }

  private assertState (): void {
    if (this.exports!.asyncify_get_state() !== AsyncifyState.NONE) {
      throw new Error('Asyncify state error')
    }
  }

  public wrapImportFunction<T extends Function> (f: T): T {
    return ((...args: Array<number | bigint>) => {
      // eslint-disable-next-line no-unreachable-loop
      while (this.exports!.asyncify_get_state() === AsyncifyState.REWINDING) {
        this.exports!.asyncify_stop_rewind()
        return this.value
      }
      this.assertState()
      const v = f(...args)
      if (!isPromise(v)) return v
      this.exports!.asyncify_start_unwind(this.dataPtr)
      this.value = v
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
    return (async (...args: Array<number | bigint>) => {
      this.assertState()
      let ret = f(...args)

      while (this.exports!.asyncify_get_state() === AsyncifyState.UNWINDING) {
        this.exports!.asyncify_stop_unwind()
        this.value = await this.value
        this.assertState()
        this.exports!.asyncify_start_rewind(this.dataPtr)
        ret = f()
      }

      this.assertState()
      return ret
    }) as any
  }

  public wrapExports<T extends WebAssembly.Exports> (exports: T): AsyncifyExports<T> {
    const newExports = Object.create(null)
    Object.keys(exports).forEach(name => {
      const exportValue = exports[name]
      const ignore = ignoreNames.indexOf(name) !== -1 || typeof exportValue !== 'function'
      Object.defineProperty(newExports, name, {
        enumerable: true,
        value: ignore ? exportValue : this.wrapExportFunction(exportValue as any)
      })
    })

    wrappedExports.set(exports, newExports)
    return newExports
  }
}

/** @public */
export class Instance extends WebAssembly.Instance {
  constructor (module: WebAssembly.Module, importObject: WebAssembly.Imports) {
    const asyncify = new Asyncify()
    super(module, asyncify.wrapImports(importObject))
    asyncify.init(importObject, this)
  }

  get exports (): WebAssembly.Exports {
    return wrappedExports.get(super.exports)!
  }
}
Object.defineProperty(Instance.prototype, 'exports', { enumerable: true })
