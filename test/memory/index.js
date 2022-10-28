/// <reference path="../../dist/wasm-util.d.ts" />

describe('memory', function () {
  it('import memory', async function () {
    const wasi = new wasmUtil.WASI({
      returnOnExit: true
    })

    const memory = new WebAssembly.Memory({ initial: 256 })

    wasmUtil.extendMemory(memory)
    console.log(memory instanceof wasmUtil.Memory)
    console.log(memory instanceof WebAssembly.Memory)
    const { HEAP32, view } = memory

    const { instance } = await wasmUtil.load('/test/memory/memory_import.wasm', {
      env: {
        memory,
        js_log (ptr, size) {
          console.log(ptr, size)
          ptr = Number(ptr)
          size = Number(size)
          assert(ptr !== 0)
          assert(size === 4)
          assert(HEAP32[ptr >> 2] === 233)
          assert(view.getInt32(ptr, true) === 233)
        }
      },
      wasi_snapshot_preview1: wasi.wasiImport
    })

    const exportsProxy = new Proxy(instance.exports, {
      get (target, p, receiver) {
        if (p === 'memory') return memory
        return Reflect.get(target, p, receiver)
      }
    })

    const instanceProxy = new Proxy(instance, {
      get (target, p, receiver) {
        if (p === 'exports') return exportsProxy
        return Reflect.get(target, p, receiver)
      }
    })

    wasi.start(instanceProxy)
  })

  it('export memory', async function () {
    const wasi = new wasmUtil.WASI({
      returnOnExit: true
    })

    const { instance } = await wasmUtil.load('/test/memory/memory_export.wasm', {
      env: {
        js_log (ptr, size) {
          console.log(ptr, size)
          ptr = Number(ptr)
          size = Number(size)
          assert(ptr !== 0)
          assert(size === 4)
          assert(HEAP32[ptr >> 2] === 233)
          assert(view.getInt32(ptr, true) === 233)
        }
      },
      wasi_snapshot_preview1: wasi.wasiImport
    })

    const memory = instance.exports.memory

    wasmUtil.extendMemory(memory)
    console.log(memory instanceof wasmUtil.Memory)
    console.log(memory instanceof WebAssembly.Memory)
    const { HEAP32, view } = memory

    wasi.start(instance)
  })
})
