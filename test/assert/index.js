/// <reference path="../../dist/wasm-util.d.ts" />

describe('assert', function () {
  

  it('assert false', async function () {
    const wasi = new wasmUtil.WASI({
      returnOnExit: true
    })
    const { instance } = await wasmUtil.load('/test/assert/assert_false.wasm', wasi.getImportObject())

    assertThrow(() => {
      wasi.start(instance)
    }, WebAssembly.RuntimeError, /unreachable/)
  })

  it('assert true', async function () {
    const wasi = new wasmUtil.WASI({
      returnOnExit: true
    })
    const { instance } = await wasmUtil.load('/test/assert/assert_true.wasm', wasi.getImportObject())

    wasi.start(instance)
  })
})
