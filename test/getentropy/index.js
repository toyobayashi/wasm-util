/// <reference path="../../dist/wasm-util.d.ts" />

describe('getentropy', function () {
  it('getentropy', async function () {
    const wasi = new wasmUtil.WASI({
      returnOnExit: true
    })
    const { instance } = await wasmUtil.load('/test/getentropy/getentropy.wasm', {
      wasi_snapshot_preview1: wasi.wasiImport
    })

    wasi.start(instance)
  })
})
