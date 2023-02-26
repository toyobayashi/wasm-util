/// <reference path="../../dist/wasm-util.d.ts" />
/// <reference path="../../node_modules/memfs-browser/index.d.ts" />

describe('directory', function () {
  it('directory', async function () {
    const vol = memfs.Volume.fromJSON({
      '/fopen-directory-parent-directory.dir': null
    })
    const wasi = new wasmUtil.WASI({
      returnOnExit: true,
      preopens: {
        'fopen-directory-parent-directory.dir': 'fopen-directory-parent-directory.dir'
      },
      fs: memfs.createFsFromVolume(vol)
    })
    const { instance } = await wasmUtil.load('/test/directory/directory.wasm', wasi.getImportObject())

    wasi.start(instance)
  })

  it('directory asyncify', async function () {
    const vol = memfs.Volume.fromJSON({
      '/fopen-directory-parent-directory.dir': null
    })
    const asyncify = new wasmUtil.Asyncify()
    const wasi = await wasmUtil.createAsyncWASI({
      returnOnExit: true,
      preopens: {
        'fopen-directory-parent-directory.dir': 'fopen-directory-parent-directory.dir'
      },
      fs: memfs.createFsFromVolume(vol),
      asyncify: asyncify
    })
    const { instance } = await wasmUtil.load('/test/directory/directory_asyncify.wasm', wasi.getImportObject())
    const wrappedInstance = asyncify.init(instance.exports.memory, instance, {
      wrapExports: ['_start']
    })

    await wasi.start(wrappedInstance)
  })

  it('directory jspi', async function () {
    const vol = memfs.Volume.fromJSON({
      '/fopen-directory-parent-directory.dir': null
    })
    const wasi = await wasmUtil.createAsyncWASI({
      returnOnExit: true,
      preopens: {
        'fopen-directory-parent-directory.dir': 'fopen-directory-parent-directory.dir'
      },
      fs: memfs.createFsFromVolume(vol)
    })
    const { instance } = await wasmUtil.load('/test/directory/directory_jspi.wasm', wasi.getImportObject())
    const wrappedInstance = { exports: wasmUtil.wrapExports(instance.exports, ['_start']) }

    await wasi.start(wrappedInstance)
  })
})
