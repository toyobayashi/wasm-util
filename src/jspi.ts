import type { AsyncifyExportFunction, Callable } from './asyncify'
import { wrapInstanceExports } from './wasi/util'
import { _WebAssembly } from './webassembly'

function checkWebAssemblyFunction (): any {
  const WebAssemblyFunction = (_WebAssembly as any).Function
  if (typeof WebAssemblyFunction !== 'function') {
    throw new Error(
      'WebAssembly.Function is not supported in this environment.' +
      ' If you are using V8 based browser like Chrome, try to specify' +
      ' --js-flag="--wasm-staging --experimental-wasm-stack-switching"'
    )
  }
  return WebAssemblyFunction
}

/** @public */
export function wrapAsyncImport (
  f: Function,
  parameterType: WebAssembly.ValueType[],
  returnType: WebAssembly.ValueType[]
): Function {
  const WebAssemblyFunction = checkWebAssemblyFunction()
  if (typeof f !== 'function') {
    throw new TypeError('Function required')
  }
  const parameters = parameterType.slice(0)
  parameters.unshift('externref')
  return new WebAssemblyFunction(
    { parameters, results: returnType },
    f,
    { suspending: 'first' }
  )
}

/** @public */
export function wrapAsyncExport<T extends Function = any> (
  f: Function
): T {
  const WebAssemblyFunction = checkWebAssemblyFunction()
  if (typeof f !== 'function') {
    throw new TypeError('Function required')
  }
  return new WebAssemblyFunction(
    { parameters: [...WebAssemblyFunction.type(f).parameters.slice(1)], results: ['externref'] },
    f,
    { promising: 'first' }
  )
}

/** @public */
export type PromisifyExports<T, U> = T extends Record<string, any>
  ? {
      [P in keyof T]: T[P] extends Callable
        ? U extends Array<keyof T>
          ? P extends U[number]
            ? AsyncifyExportFunction<T[P]>
            : T[P]
          : AsyncifyExportFunction<T[P]>
        : T[P]
    }
  : T

/** @public */
export function wrapExports<T extends WebAssembly.Exports> (exports: T): PromisifyExports<T, void>
/** @public */
export function wrapExports<T extends WebAssembly.Exports, U extends Array<keyof T>> (exports: T, needWrap: U): PromisifyExports<T, U>
/** @public */
export function wrapExports<T extends WebAssembly.Exports, U extends Array<keyof T>> (exports: T, needWrap?: U): PromisifyExports<T, U> {
  return wrapInstanceExports(exports, (exportValue, name) => {
    let ignore = typeof exportValue !== 'function'
    if (Array.isArray(needWrap)) {
      ignore = ignore || (needWrap.indexOf(name as any) === -1)
    }
    return ignore ? exportValue : wrapAsyncExport(exportValue as any)
  }) as PromisifyExports<T, U>
}
