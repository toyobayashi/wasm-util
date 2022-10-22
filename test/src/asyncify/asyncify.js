import { load } from '@tybys/wasm-util'

// let wasm

const imports = {
  env: {
    async_sleep (ms) {
      return new Promise(resolve => {
        setTimeout(resolve, ms)
      })
    }
  }
}

const wasiOptions = {
  args: ['node', 'b.wasm'],
  env: {
    NODE_ENV: 'development',
    WASI_SDK_PATH: '/tmp/wasi-sdk'
  }
}

const asyncifyOptions = {
  tryAllocate: true
}

if (typeof __webpack_public_path__ !== 'undefined') {
  // webpack
  const wasmUrl = (await import('../../build/b.wasm')).default
  const { WASI } = await import('@tybys/wasm-util')
  const wasi = new WASI(wasiOptions)
  const { instance } = await load(wasmUrl, { ...imports, wasi_snapshot_preview1: wasi.wasiImport }, asyncifyOptions)
  // wasm = instance.exports
  await wasi.start(instance)
} else {
  const isNodeJs = !!(typeof process === 'object' && process.versions && process.versions.node)

  const url = new URL('../../build/b.wasm', import.meta.url)
  const { WASI } = isNodeJs ? await import('node:wasi') : await import('@tybys/wasm-util')
  const wasi = new WASI(wasiOptions)
  const { instance } = await load(isNodeJs ? await (await import('node:fs/promises')).readFile(url) : url, { ...imports, wasi_snapshot_preview1: wasi.wasiImport }, asyncifyOptions)
  // wasm = instance.exports
  await wasi.start(instance)
}
