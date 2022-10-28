/// <reference path="../../dist/wasm-util.d.ts" />

describe('stdin', function () {
  it('stdin', async function () {
    this.timeout = Infinity
    const wasi = new wasmUtil.WASI({
      returnOnExit: true
    })
    const { instance } = await wasmUtil.load('/test/stdin/stdin.wasm', {
      wasi_snapshot_preview1: wasi.wasiImport
    })

    assert(0 === wasi.start(instance))
  })
})
