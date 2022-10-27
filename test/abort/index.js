/// <reference path="../../dist/wasm-util.d.ts" />

describe('abort', function () {
  it('should throw RuntimeError', async function () {
    const wasi = new wasmUtil.WASI({
      returnOnExit: true
    })
    const { instance } = await wasmUtil.load('/test/abort/abort.wasm', {
      wasi_snapshot_preview1: wasi.wasiImport
    })

    assertThrow(() => {
      wasi.start(instance)
    }, WebAssembly.RuntimeError, /unreachable/)
  })
})
