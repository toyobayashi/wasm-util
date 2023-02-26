/// <reference path="../../dist/wasm-util.d.ts" />

describe('clock', function () {
  it('clock', async function () {
    const wasi = new wasmUtil.WASI({
      returnOnExit: true
    })
    const { instance } = await wasmUtil.load('/test/clock/clock.wasm', wasi.getImportObject())

    wasi.start(instance)
  })
})
