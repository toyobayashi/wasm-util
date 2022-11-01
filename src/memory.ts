import { _WebAssembly } from './webassembly'

/** @public */
export const WebAssemblyMemory = _WebAssembly.Memory

/** @public */
export class Memory extends WebAssemblyMemory {
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor (descriptor: WebAssembly.MemoryDescriptor) {
    super(descriptor)
  }

  public get HEAP8 (): Int8Array { return new Int8Array(super.buffer) }
  public get HEAPU8 (): Uint8Array { return new Uint8Array(super.buffer) }
  public get HEAP16 (): Int16Array { return new Int16Array(super.buffer) }
  public get HEAPU16 (): Uint16Array { return new Uint16Array(super.buffer) }
  public get HEAP32 (): Int32Array { return new Int32Array(super.buffer) }
  public get HEAPU32 (): Uint32Array { return new Uint32Array(super.buffer) }
  public get HEAP64 (): BigInt64Array { return new BigInt64Array(super.buffer) }
  public get HEAPU64 (): BigUint64Array { return new BigUint64Array(super.buffer) }
  public get HEAPF32 (): Float32Array { return new Float32Array(super.buffer) }
  public get HEAPF64 (): Float64Array { return new Float64Array(super.buffer) }
  public get view (): DataView { return new DataView(super.buffer) }
}

/** @public */
export function extendMemory (memory: WebAssembly.Memory): Memory {
  if (Object.getPrototypeOf(memory) === _WebAssembly.Memory.prototype) {
    Object.setPrototypeOf(memory, Memory.prototype)
  }
  return memory as Memory
}
