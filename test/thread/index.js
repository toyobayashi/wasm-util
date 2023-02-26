/// <reference path="../../dist/wasm-util.d.ts" />

describe('thread', function () {
  it('thread', async function main() {
    this.timeout = Infinity

    let nextTid = 1
    const spawnThread = function (startArg, threadId) {
      const worker = new Worker('/test/thread/worker.js')
      // wasmUtil.WASI.addWorkerListener(worker)

      worker.onmessage = function (e) {
        if (e.data.cmd === 'loaded') {
          if (typeof worker.unref === 'function') {
            worker.unref()
          }
          if (!e.data.success) {
            console.error(e.data.message)
            console.error(e.data.stack)
          }
        } else if (e.data.cmd === 'thread-spawn') {
          spawnThread(e.data.startArg, e.data.threadId)
        }
      }
      worker.onerror = (e) => {
        console.log(e)
        throw e
      }

      const tid = nextTid
      nextTid++
      const payload = {
        cmd: 'load',
        request: '/test/thread/thread.wasm',
        tid,
        arg: startArg,
        wasmMemory
      }
      // console.log(payload)
      if (threadId) {
        Atomics.store(threadId, 0, tid)
        Atomics.notify(threadId, 0)
      }
      worker.postMessage(payload)
      return tid
    }

    const wasmMemory = new WebAssembly.Memory({
      initial: 16777216 / 65536,
      maximum: 2147483648 / 65536,
      shared: true
    })

    const wasi = new wasmUtil.WASI({
      returnOnExit: true
    })
    let { instance } = await wasmUtil.load('/test/thread/thread.wasm', {
      ...wasi.getImportObject(),
      env: {
        memory: wasmMemory
      },
      wasi: {
        'thread-spawn' (startArg) {
          return spawnThread(startArg)
        }
      }
    })
    instance = {
      exports: {
        ...instance.exports,
        memory: wasmMemory
      }
    }
    wasi.initialize(instance)
    instance.exports.sleep_in_child_thread()
    const start = Date.now()
    return new Promise((resolve, reject) => {
      const check = () => {
        const value = instance.exports.get_value()
        console.log('get_value: ' + value)
        if (value) {
          resolve()
        } else {
          if (Date.now() - start > 1500) {
            reject(new Error('timeout'))
          } else {
            setTimeout(check, 100)
          }
        }
      }
      setTimeout(check, 100)
    })
  })
})

// main()
