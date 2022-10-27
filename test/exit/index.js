/// <reference path="../../dist/wasm-util.d.ts" />

describe('exit', function () {
  

  it('exit failure', async function () {
    const wasi = new wasmUtil.WASI({
      returnOnExit: true
    })
    const { instance } = await wasmUtil.load('/test/exit/exit_failure.wasm', {
      wasi_snapshot_preview1: wasi.wasiImport
    })

    const code = wasi.start(instance)
    assert(code === 1)
  })

  it('exit success', async function () {
    const wasi = new wasmUtil.WASI({
      returnOnExit: true
    })
    const { instance } = await wasmUtil.load('/test/exit/exit_success.wasm', {
      wasi_snapshot_preview1: wasi.wasiImport
    })

    const code = wasi.start(instance)
    assert(code === 0)
  })
})
