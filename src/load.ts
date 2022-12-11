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

async function fetchWasm (urlOrBuffer: string | URL, imports?: WebAssembly.Imports): Promise<WebAssembly.WebAssemblyInstantiatedSource> {
  if (typeof wx !== 'undefined' && typeof __wxConfig !== 'undefined') {
    return await _WebAssembly.instantiate(urlOrBuffer as any, imports)
  }
  const response = await fetch(urlOrBuffer)
  const buffer = await response.arrayBuffer()
  const source = await _WebAssembly.instantiate(buffer, imports)
  return source
}

/** @public */
export async function load (
  urlOrBuffer: string | URL | BufferSource,
  imports?: WebAssembly.Imports
): Promise<WebAssembly.WebAssemblyInstantiatedSource> {
  validateImports(imports)
  imports = imports ?? {}

  let source: WebAssembly.WebAssemblyInstantiatedSource

  if (urlOrBuffer instanceof ArrayBuffer || ArrayBuffer.isView(urlOrBuffer)) {
    source = await _WebAssembly.instantiate(urlOrBuffer, imports)
    return source
  }

  if (typeof urlOrBuffer !== 'string' && !(urlOrBuffer instanceof URL)) {
    throw new TypeError('Invalid source')
  }

  if (typeof _WebAssembly.instantiateStreaming === 'function') {
    try {
      source = await _WebAssembly.instantiateStreaming(fetch(urlOrBuffer), imports)
    } catch (_) {
      source = await fetchWasm(urlOrBuffer, imports)
    }
  } else {
    source = await fetchWasm(urlOrBuffer, imports)
  }
  return source
}

/** @public */
export async function asyncifyLoad (
  asyncify: AsyncifyOptions,
  urlOrBuffer: string | URL | BufferSource,
  imports?: WebAssembly.Imports
): Promise<WebAssembly.WebAssemblyInstantiatedSource> {
  validateImports(imports)
  imports = imports ?? {}

  const asyncifyHelper = new Asyncify()
  imports = asyncifyHelper.wrapImports(imports)

  const source = await load(urlOrBuffer, imports)

  const memory: any = source.instance.exports.memory || imports.env?.memory
  return { module: source.module, instance: asyncifyHelper.init(memory, source.instance, asyncify) }
}

/** @public */
export function loadSync (
  buffer: BufferSource,
  imports?: WebAssembly.Imports
): WebAssembly.WebAssemblyInstantiatedSource {
  if ((buffer instanceof ArrayBuffer) && !ArrayBuffer.isView(buffer)) {
    throw new TypeError('Invalid source')
  }

  validateImports(imports)
  imports = imports ?? {}

  const module = new _WebAssembly.Module(buffer)
  const instance = new _WebAssembly.Instance(module, imports)
  const source = { instance, module }

  return source
}

/** @public */
export function asyncifyLoadSync (
  asyncify: AsyncifyOptions,
  buffer: BufferSource,
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
