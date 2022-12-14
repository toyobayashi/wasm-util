/// <reference path="../../dist/wasm-util.d.ts" />

describe('clock', function () {
  it('clock', async function () {
    const wasi = wasmUtil.WASI.createSync({
      returnOnExit: true
    })
    const { instance } = await wasmUtil.load('/test/clock/clock.wasm', {
      wasi_snapshot_preview1: wasi.wasiImport
    })

    wasi.start(instance)
  })
})
