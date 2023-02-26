/// <reference path="../../dist/wasm-util.d.ts" />
/// <reference path="../../node_modules/memfs-browser/index.d.ts" />

describe('ftruncate', function () {
  it('ftruncate', async function () {
    const vol = memfs.Volume.fromJSON({
      '/ftruncate.dir': null
    })
    const wasi = new wasmUtil.WASI({
      returnOnExit: true,
      preopens: {
        'ftruncate.dir': 'ftruncate.dir'
      },
      fs: memfs.createFsFromVolume(vol)
    })
    const { instance } = await wasmUtil.load('/test/ftruncate/ftruncate.wasm', wasi.getImportObject())

    wasi.start(instance)
  })

  it('ftruncate asyncify', async function () {
    const vol = memfs.Volume.fromJSON({
      '/ftruncate.dir': null
    })
    const asyncify = new wasmUtil.Asyncify()
    const wasi = await wasmUtil.createAsyncWASI({
      returnOnExit: true,
      preopens: {
        'ftruncate.dir': 'ftruncate.dir'
      },
      fs: memfs.createFsFromVolume(vol),
      asyncify: asyncify
    })
    const { instance } = await wasmUtil.load('/test/ftruncate/ftruncate_asyncify.wasm', wasi.getImportObject())
    const wrappedInstance = asyncify.init(instance.exports.memory, instance, {})

    await wasi.start(wrappedInstance)
  })

  it('ftruncate jspi', async function () {
    const vol = memfs.Volume.fromJSON({
      '/ftruncate.dir': null
    })
    const wasi = await wasmUtil.createAsyncWASI({
      returnOnExit: true,
      preopens: {
        'ftruncate.dir': 'ftruncate.dir'
      },
      fs: memfs.createFsFromVolume(vol)
    })
    const { instance } = await wasmUtil.load('/test/ftruncate/ftruncate_jspi.wasm', wasi.getImportObject())
    const wrappedInstance = Object.create(WebAssembly.Instance.prototype)
    Object.defineProperty(wrappedInstance, 'exports', { value: wasmUtil.wrapExports(instance.exports, ['_start']) })

    await wasi.start(wrappedInstance)
  })
})
