import { Asyncify } from './asyncify'
import type { AsyncifyOptions } from './asyncify'

async function fetchWasm (urlOrBuffer: string | URL, imports?: WebAssembly.Imports): Promise<WebAssembly.WebAssemblyInstantiatedSource> {
  const response = await fetch(urlOrBuffer)
  const buffer = await response.arrayBuffer()
  const source = await WebAssembly.instantiate(buffer, imports)
  return source
}

/** @public */
export async function load (
  urlOrBuffer: string | URL | BufferSource,
  imports?: WebAssembly.Imports,
  asyncify?: AsyncifyOptions
): Promise<WebAssembly.WebAssemblyInstantiatedSource> {
  if (imports && typeof imports !== 'object') {
    throw new TypeError('imports must be an object or undefined')
  }
  imports = imports ?? {}

  let asyncifyHelper: Asyncify
  let source: WebAssembly.WebAssemblyInstantiatedSource

  if (asyncify) {
    asyncifyHelper = new Asyncify()
    imports = asyncifyHelper.wrapImports(imports)
  }

  if (urlOrBuffer instanceof ArrayBuffer || ArrayBuffer.isView(urlOrBuffer)) {
    source = await WebAssembly.instantiate(urlOrBuffer, imports)
    if (asyncify) {
      const memory: any = source.instance.exports.memory || imports.env?.memory
      return { module: source.module, instance: asyncifyHelper!.init(memory, source.instance, asyncify) }
    }
    return source
  }

  if (typeof urlOrBuffer !== 'string' && !(urlOrBuffer instanceof URL)) {
    throw new TypeError('Invalid source')
  }

  if (typeof WebAssembly.instantiateStreaming === 'function') {
    try {
      source = await WebAssembly.instantiateStreaming(fetch(urlOrBuffer), imports)
    } catch (_) {
      source = await fetchWasm(urlOrBuffer, imports)
    }
  } else {
    source = await fetchWasm(urlOrBuffer, imports)
  }
  if (asyncify) {
    const memory: any = source.instance.exports.memory || imports.env?.memory
    return { module: source.module, instance: asyncifyHelper!.init(memory, source.instance, asyncify) }
  }
  return source
}

/** @public */
export function loadSync (
  buffer: BufferSource,
  imports?: WebAssembly.Imports,
  asyncify?: AsyncifyOptions
): WebAssembly.WebAssemblyInstantiatedSource {
  if ((buffer instanceof ArrayBuffer) && !ArrayBuffer.isView(buffer)) {
    throw new TypeError('Invalid source')
  }

  if (imports && typeof imports !== 'object') {
    throw new TypeError('imports must be an object or undefined')
  }
  imports = imports ?? {}

  let asyncifyHelper: Asyncify

  if (asyncify) {
    asyncifyHelper = new Asyncify()
    imports = asyncifyHelper.wrapImports(imports)
  }

  const module = new WebAssembly.Module(buffer)
  const instance = new WebAssembly.Instance(module, imports)
  const source = { instance, module }
  if (asyncify) {
    const memory: any = source.instance.exports.memory || imports.env?.memory
    return { module: source.module, instance: asyncifyHelper!.init(memory, instance, asyncify) }
  }
  return source
}
