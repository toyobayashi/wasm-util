/// <reference path="../../dist/wasm-util.d.ts" />

describe('stdin', function () {
  it('stdin', async function () {
    this.timeout = Infinity
    const prompt = window.prompt
    window.prompt = function (message, defaultValue) {
      return prompt.call(window, 'Test stdin', 'Hello, stdin!')
    }
    const wasi = wasmUtil.WASI.createSync({
      returnOnExit: true
    })
    const { instance } = await wasmUtil.load('/test/stdin/stdin.wasm', {
      wasi_snapshot_preview1: wasi.wasiImport
    })

    assert(0 === wasi.start(instance))
    window.prompt = prompt
  })
})
