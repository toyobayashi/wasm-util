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
      filesystem: {
        type: 'memfs',
        fs: memfs.createFsFromVolume(vol)
      }
    })
    const { instance } = await wasmUtil.load('/test/ftruncate/ftruncate.wasm', {
      wasi_snapshot_preview1: wasi.wasiImport
    })

    wasi.start(instance)
  })
})