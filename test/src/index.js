/* eslint-disable camelcase */
import { load } from '@tybys/wasm-util'

/* function wrap (wasm) {
  const {
    memory,
    malloc,
    free,
    base64_encode,
    base64_decode
  } = wasm

  function getMemory () {
    return {
      HEAPU8: new Uint8Array(memory.buffer),
      HEAPU16: new Uint16Array(memory.buffer),
      HEAP32: new Int32Array(memory.buffer),
      HEAPU32: new Uint32Array(memory.buffer)
    }
  }

  function b64Encode (data) {
    let buffer
    if (typeof data === 'string') {
      buffer = new TextEncoder().encode(data)
    } else if (ArrayBuffer.isView(data)) {
      buffer = new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    } else {
      throw new TypeError('Invalid data')
    }

    const buf = malloc(buffer.length)
    if (buf === 0) throw new Error('malloc failed')
    const { HEAPU8 } = getMemory()
    HEAPU8.set(buffer, buf)
    let size = base64_encode(buf, buffer.length, 0)
    if (size === 0) {
      free(buf)
      throw new Error('encode failed')
    }
    const res = malloc(size)
    if (res === 0) {
      free(buf)
      throw new Error('malloc failed')
    }
    size = base64_encode(buf, buffer.length, res)
    free(buf)
    const str = new TextDecoder().decode(HEAPU8.subarray(res, res + size))
    free(res)
    return str
  }

  function b64Decode (str) {
    const buffer = new TextEncoder().encode(str)
    const buf = malloc(buffer.length)
    if (buf === 0) throw new Error('malloc failed')
    const { HEAPU8 } = getMemory()
    HEAPU8.set(buffer, buf)
    let size = base64_decode(buf, buffer.length, 0)
    if (size === 0) {
      free(buf)
      throw new Error('decode failed')
    }
    const res = malloc(size)
    if (res === 0) {
      free(buf)
      throw new Error('malloc failed')
    }
    size = base64_decode(buf, buffer.length, res)
    free(buf)
    const arr = HEAPU8.slice(res, res + size)
    free(res)
    return arr
  }

  return {
    b64Encode,
    b64Decode
  }
} */

let wasm

const imports = {
  env: {
    call_js (f, data) {
      console.log(data)
      wasm.__indirect_function_table.get(f)(data)
    }
  }
}

const wasiOptions = {
  args: ['node', 'a.wasm'],
  env: {
    NODE_ENV: 'development',
    WASI_SDK_PATH: '/tmp/wasi-sdk'
  }
}

if (typeof __webpack_public_path__ !== 'undefined') {
  // webpack
  const wasmUrl = (await import('../build/a.wasm')).default
  const { WASI } = await import('@tybys/wasm-util')
  const wasi = new WASI(wasiOptions)
  const { instance } = await load(wasmUrl, { ...imports, wasi_snapshot_preview1: wasi.wasiImport })
  wasm = instance.exports
  await wasi.start(instance)
} else {
  const isNodeJs = !!(typeof process === 'object' && process.versions && process.versions.node)

  const url = new URL('../build/a.wasm', import.meta.url)
  const { WASI } = isNodeJs ? await import('node:wasi') : await import('@tybys/wasm-util')
  const wasi = new WASI(wasiOptions)
  const { instance } = await load(isNodeJs ? await (await import('node:fs/promises')).readFile(url) : url, { ...imports, wasi_snapshot_preview1: wasi.wasiImport })
  wasm = instance.exports
  await wasi.start(instance)
}

// async function main (wrappedExports) {
//   const {
//     b64Encode,
//     b64Decode
//   } = wrappedExports

//   const input = 'Hello wasi\n'
//   const b64Str = b64Encode(input)
//   console.log(b64Str)
//   const origin = b64Decode(b64Str)
//   const originStr = new TextDecoder().decode(origin)
//   console.log(originStr === input)
// }

// await main(wrap(wasm))
