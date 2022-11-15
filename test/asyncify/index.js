/// <reference path="../../dist/wasm-util.d.ts" />

describe('asyncify', function () {
  it('sleep 200ms', async function () {
    const wasi = wasmUtil.WASI.createSync({
      returnOnExit: true
    })

    const asyncify = new wasmUtil.Asyncify()

    const imports = {
      env: {
        async_sleep: asyncify.wrapImportFunction(function (ms) {
          return new Promise((resolve) => {
            setTimeout(resolve, ms)
          })
        })
      },
      wasi_snapshot_preview1: wasi.wasiImport
    }
    const bytes = await (await fetch('/test/asyncify/asyncify.wasm')).arrayBuffer()
    const { instance } = await WebAssembly.instantiate(bytes, imports)
    const asyncifedInstance = asyncify.init(instance.exports.memory, instance, {
      wrapExports: ['_start']
    })

    const p = wasi.start(asyncifedInstance)
    assert(typeof p.then === 'function')
    const now = Date.now()
    assert(0 === await p)
    assert(Date.now() - now >= 200)
  })
})
