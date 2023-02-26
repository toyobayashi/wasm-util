import { _WebAssembly } from './webassembly'
import { Asyncify } from './asyncify'
import type { AsyncifyOptions } from './asyncify'

declare const wx: any
declare const __wxConfig: any

function validateImports (imports: unknown): void {
  if (imports && typeof imports !== 'object') {
    throw new TypeError('imports must be an object or undefined')
  }
}

function fetchWasm (urlOrBuffer: string | URL, imports?: WebAssembly.Imports): Promise<WebAssembly.WebAssemblyInstantiatedSource> {
  if (typeof wx !== 'undefined' && typeof __wxConfig !== 'undefined') {
    return _WebAssembly.instantiate(urlOrBuffer as any, imports)
  }
  return fetch(urlOrBuffer)
    .then(response => response.arrayBuffer())
    .then(buffer => _WebAssembly.instantiate(buffer, imports))
}

/** @public */
export function load (
  wasmInput: string | URL | BufferSource | WebAssembly.Module,
  imports?: WebAssembly.Imports
): Promise<WebAssembly.WebAssemblyInstantiatedSource> {
  validateImports(imports)
  imports = imports ?? {}

  let source: Promise<WebAssembly.WebAssemblyInstantiatedSource>

  if (wasmInput instanceof ArrayBuffer || ArrayBuffer.isView(wasmInput)) {
    return _WebAssembly.instantiate(wasmInput, imports)
  }

  if (wasmInput instanceof _WebAssembly.Module) {
    return _WebAssembly.instantiate(wasmInput, imports).then((instance) => {
      return { instance, module: wasmInput }
    })
  }

  if (typeof wasmInput !== 'string' && !(wasmInput instanceof URL)) {
    throw new TypeError('Invalid source')
  }

  if (typeof _WebAssembly.instantiateStreaming === 'function') {
    let responsePromise: Promise<Response>
    try {
      responsePromise = fetch(wasmInput)
      source = _WebAssembly.instantiateStreaming(responsePromise, imports).catch(() => {
        return fetchWasm(wasmInput, imports)
      })
    } catch (_) {
      source = fetchWasm(wasmInput, imports)
    }
  } else {
    source = fetchWasm(wasmInput, imports)
  }
  return source
}

/** @public */
export function asyncifyLoad (
  asyncify: AsyncifyOptions,
  urlOrBuffer: string | URL | BufferSource | WebAssembly.Module,
  imports?: WebAssembly.Imports
): Promise<WebAssembly.WebAssemblyInstantiatedSource> {
  validateImports(imports)
  imports = imports ?? {}

  const asyncifyHelper = new Asyncify()
  imports = asyncifyHelper.wrapImports(imports)

  return load(urlOrBuffer, imports).then(source => {
    const memory: any = source.instance.exports.memory || imports!.env?.memory
    return { module: source.module, instance: asyncifyHelper.init(memory, source.instance, asyncify) }
  })
}

/** @public */
export function loadSync (
  wasmInput: BufferSource | WebAssembly.Module,
  imports?: WebAssembly.Imports
): WebAssembly.WebAssemblyInstantiatedSource {
  validateImports(imports)
  imports = imports ?? {}

  let module: WebAssembly.Module

  if ((wasmInput instanceof ArrayBuffer) || ArrayBuffer.isView(wasmInput)) {
    module = new _WebAssembly.Module(wasmInput)
  } else if (wasmInput instanceof WebAssembly.Module) {
    module = wasmInput
  } else {
    throw new TypeError('Invalid source')
  }

  const instance = new _WebAssembly.Instance(module, imports)
  const source = { instance, module }

  return source
}

/** @public */
export function asyncifyLoadSync (
  asyncify: AsyncifyOptions,
  buffer: BufferSource | WebAssembly.Module,
  imports?: WebAssembly.Imports
): WebAssembly.WebAssemblyInstantiatedSource {
  validateImports(imports)
  imports = imports ?? {}

  const asyncifyHelper = new Asyncify()
  imports = asyncifyHelper.wrapImports(imports)

  const source = loadSync(buffer, imports)

  const memory: any = source.instance.exports.memory || imports.env?.memory
  return { module: source.module, instance: asyncifyHelper.init(memory, source.instance, asyncify) }
}
