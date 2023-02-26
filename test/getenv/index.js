/// <reference path="../../dist/wasm-util.d.ts" />

describe('getenv', function () {
  it('getenv', async function () {
    const wasi = new wasmUtil.WASI({
      returnOnExit: true,
      env: {
        PRESENT: '1'
      }
    })
    const { instance } = await wasmUtil.load('/test/getenv/getenv.wasm', wasi.getImportObject())

    wasi.start(instance)
  })
})
