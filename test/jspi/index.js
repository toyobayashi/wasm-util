/// <reference path="../../dist/wasm-util.d.ts" />

describe('jspi', function () {
  it('sleep 200ms', async function () {
    const wasi = new wasmUtil.WASI({
      returnOnExit: true
    })

    const imports = {
      env: {
        async_sleep: wasmUtil.wrapAsyncImport(function (ms) {
          return new Promise((resolve) => {
            setTimeout(resolve, ms)
          })
        }, ['i32'], [])
      },
      ...wasi.getImportObject()
    }
    const bytes = await (await fetch('/test/jspi/jspi.wasm')).arrayBuffer()
    const { instance } = await WebAssembly.instantiate(bytes, imports)
    const promisifiedInstance = Object.create(WebAssembly.Instance.prototype)
    Object.defineProperty(promisifiedInstance, 'exports', { value: wasmUtil.wrapExports(instance.exports, ['_start']) })
    const p = wasi.start(promisifiedInstance)
    console.log(p)
    const now = Date.now()
    assert(0 === await p)
    assert(Date.now() - now >= 200)
  })
})
