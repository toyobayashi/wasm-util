/// <reference path="../../dist/wasm-util.d.ts" />

describe('stdout', function () {
  it('stdout', async function () {
    const wasi = new wasmUtil.WASI({
      returnOnExit: true
    })
    const { instance } = await wasmUtil.load('/test/stdout/stdout.wasm', {
      wasi_snapshot_preview1: wasi.wasiImport
    })

    assert(0 === wasi.start(instance))
  })

  it('stderr', async function () {
    const wasi = new wasmUtil.WASI({
      returnOnExit: true
    })
    const { instance } = await wasmUtil.load('/test/stdout/stderr.wasm', {
      wasi_snapshot_preview1: wasi.wasiImport
    })

    assert(0 === wasi.start(instance))
  })
})
