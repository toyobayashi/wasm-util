var ENVIRONMENT_IS_NODE = typeof process === 'object' && process !== null && typeof process.versions === 'object' && process.versions !== null && typeof process.versions.node === 'string'
if (ENVIRONMENT_IS_NODE) {
  const nodeWorkerThreads = require('worker_threads')

  const parentPort = nodeWorkerThreads.parentPort

  parentPort.on('message', (data) => {
    onmessage({ data })
  })

  const fs = require('fs')

  Object.assign(global, {
    self: global,
    require,
    // Module,
    location: {
      href: __filename
    },
    Worker: nodeWorkerThreads.Worker,
    importScripts: function (f) {
      // eslint-disable-next-line no-eval
      (0, eval)(fs.readFileSync(f, 'utf8') + '//# sourceURL=' + f)
    },
    postMessage: function (msg) {
      parentPort.postMessage(msg)
    },
    performance: global.performance || {
      now: function () {
        return Date.now()
      }
    }
  })
}

/// <reference path="../../dist/wasm-util.d.ts" />

importScripts('../../dist/wasm-util.js')

async function instantiate (wasmMemory, request, tid, arg) {
  const wasi = wasmUtil.WASI.createSync({ returnOnExit: true })
  const buffer = await (await (fetch(request))).arrayBuffer()
  let { instance } = await WebAssembly.instantiate(buffer, {
    wasi_snapshot_preview1: wasi.wasiImport,
    env: {
      memory: wasmMemory,
    },
    wasi: {
      'thread-spawn': function (startArg) {
        const threadIdBuffer = new SharedArrayBuffer(4)
        const id = new Int32Array(threadIdBuffer)
        Atomics.store(id, 0, -1)
        postMessage({ cmd: 'thread-spawn', startArg, threadId: id })
        Atomics.wait(id, 0, -1)
        const tid = Atomics.load(id, 0)
        return tid
      }
    }
  })

  const noop = () => {}
  const exportsProxy = new Proxy({}, {
    get (t, p, r) {
      if (p === 'memory') {
        return wasmMemory
      }
      if (p === '_initialize') {
        return noop
      }
      return Reflect.get(instance.exports, p, r)
    }
  })
  const instanceProxy = new Proxy(instance, {
    get (target, p, receiver) {
      if (p === 'exports') {
        return exportsProxy
      }
      return Reflect.get(target, p, receiver)
    }
  })

  wasi.initialize(instanceProxy)
  postMessage({ cmd: 'loaded', success: true })
  instance.exports.wasi_thread_start(tid, arg)
}

self.onmessage = function (e) {
  if (e.data.cmd === 'load') {
    instantiate(e.data.wasmMemory, e.data.request, e.data.tid, e.data.arg).catch(err => {
      postMessage({ cmd: 'loaded', success: false, message: err.message, stack: err.stack })
    })
  }
}
