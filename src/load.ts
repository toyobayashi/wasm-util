import { Asyncify, Instance } from './asyncify'

/** @public */
export async function load (
  urlOrBuffer: string | URL | BufferSource,
  imports?: WebAssembly.Imports,
  asyncify = false
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
    if (asyncify) asyncifyHelper!.init(imports, source.instance)
    return source
  }

  if (typeof urlOrBuffer !== 'string' && !(urlOrBuffer instanceof URL)) {
    throw new TypeError('Invalid source')
  }

  if (typeof WebAssembly.instantiateStreaming === 'function') {
    try {
      source = await WebAssembly.instantiateStreaming(fetch(urlOrBuffer), imports)
      if (asyncify) asyncifyHelper!.init(imports, source.instance)
      return source
    } catch (_) {}
  }
  const response = await fetch(urlOrBuffer)
  const buffer = await response.arrayBuffer()
  source = await WebAssembly.instantiate(buffer, imports)
  if (asyncify) asyncifyHelper!.init(imports, source.instance)
  return source
}

/** @public */
export function loadSync (
  buffer: BufferSource,
  imports?: WebAssembly.Imports,
  asyncify = false
): WebAssembly.WebAssemblyInstantiatedSource {
  if ((buffer instanceof ArrayBuffer) && !ArrayBuffer.isView(buffer)) {
    throw new TypeError('Invalid source')
  }

  if (imports && typeof imports !== 'object') {
    throw new TypeError('imports must be an object or undefined')
  }
  imports = imports ?? {}

  const module = new WebAssembly.Module(buffer)
  const instance = asyncify ? new Instance(module, imports) : new WebAssembly.Instance(module, imports)
  return { instance, module }
}
