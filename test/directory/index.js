/// <reference path="../../dist/wasm-util.d.ts" />
/// <reference path="../../node_modules/memfs-browser/index.d.ts" />

describe('directory', function () {
  it('directory', async function () {
    const vol = memfs.Volume.fromJSON({
      '/fopen-directory-parent-directory.dir': null
    })
    const wasi = wasmUtil.WASI.createSync({
      returnOnExit: true,
      preopens: {
        'fopen-directory-parent-directory.dir': 'fopen-directory-parent-directory.dir'
      },
      fs: memfs.createFsFromVolume(vol)
    })
    const { instance } = await wasmUtil.load('/test/directory/directory.wasm', {
      wasi_snapshot_preview1: wasi.wasiImport
    })

    wasi.start(instance)
  })
})
