/// <reference path="../../dist/wasm-util.d.ts" />

describe('stdin', function () {
  it('stdin', async function () {
    this.timeout = Infinity
    const prompt = window.prompt
    window.prompt = function (message, defaultValue) {
      return prompt.call(window, 'Test stdin', 'Hello, stdin!')
    }
    const wasi = new wasmUtil.WASI({
      returnOnExit: true
    })
    const { instance } = await wasmUtil.load('/test/stdin/stdin.wasm', wasi.getImportObject())

    assert(0 === wasi.start(instance))
    window.prompt = prompt
  })
})
