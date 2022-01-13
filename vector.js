import { readFileSync } from "fs"
import { performance } from "perf_hooks"

const VEC_I32_SIZE = 16384
const VEC_BYTES = VEC_I32_SIZE * 4

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Tools to allow the WASM module to issue debug/trace messages directly to the JS console
 */
const i32AsTypedString = n => `${n < 0 ? "-" : ""}0x${i32AsString(n)}`
const i32AsString      = n => Math.abs(n).toString(16).padStart(8, "0")

// Debug messages the WASM module can issue
const WASM_LOG_MSGS = [
  {
    msg: "wasmVec1[%0] * wasmVec2[%0] = %1 * %2",
    fmt: [
      {asHex: false, typed: false},
      {asHex: false, typed: false},
      {asHex: false, typed: false}
    ]},
  {
    msg: "i64 result: %0%1",
    fmt: [
      {asHex: true, typed: false},
      {asHex: true, typed: false},
     ]},
]

const logger = (idx, ...vals) => {
  let msg = WASM_LOG_MSGS[idx].
    fmt.
    map((f, idx2) =>
      f.asHex
      ? f.typed
        ? i32AsTypedString(vals[idx2])
        : i32AsString(vals[idx2])
      : vals[idx2]
    ).reduce((acc,v,i) => acc.replace(new RegExp(`%${i}`, 'g'), v), WASM_LOG_MSGS[idx].msg)

  console.log(msg)
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Build test data in WASM shared memory
 */
const wasmMemory = new WebAssembly.Memory({ initial: 3 })
let wasmMem32 = new Uint32Array(wasmMemory.buffer)
let wasmMem64 = new BigUint64Array(wasmMemory.buffer)

// Initialise both i32 arrays in WASM memory with random numbers
// Vectors are adjacent in memory, so we can loop to VEC_I32_SIZE * 2
for (let i = 0; i < VEC_I32_SIZE * 2; i++) {
  wasmMem32[i] = parseInt(Math.random() * 16383)
}

let wasmVec1 = wasmMem32.slice(0, VEC_I32_SIZE)
let wasmVec2 = wasmMem32.slice(VEC_I32_SIZE, VEC_I32_SIZE * 2)

let jsVec1 = new BigUint64Array(VEC_I32_SIZE)
let jsVec2 = new BigUint64Array(VEC_I32_SIZE)

// For an accurate performance comparison, JavaScript must work with a native BigInt array rather than converting each
// i32 element in WASM shared memory to a BigInt.  Without these duplicate arrays, JS will run about 3 times slower
for (let i=0; i<VEC_I32_SIZE; i++) {
  jsVec1[i] = BigInt(wasmVec1[i])
  jsVec2[i] = BigInt(wasmVec2[i])
}

// 'result' is the i64 result calculated by WebAssembly and is stored immediately after the two i32 arrays of size
// VEC_BYTES.  So the position of 'result' in the wasmMem64 array is Math.ceil((VEC_BYTES * 2) / 8)
let result_offset = Math.ceil(VEC_BYTES / 4)

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Performance measurement stuff
 */
const times = {
  wasm : { start : 0, end : 0 },
  js   : { start : 0, end : 0 },
}

const performance_ratio = t => {
  let ratio = ((t.js.end - t.js.start) / (t.wasm.end - t.wasm.start)).toFixed(3)
  console.log(`\nJavaScript : WASM performance ratio = ${ratio}:1`)
}

const log_result = (runtime, res, t) =>
  console.log(`${runtime}: Result = ${res} calculated in ${(t.end - t.start).toFixed(3)}ms`)

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Host environment shared with WASM
 */
const host_env = {
  js: {
    shared_mem: wasmMemory,
    "console.log": logger,
  },
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * JS implementation of dot product
 */
const dot_product_js = (vec1, vec2) => vec1.reduce((acc, v1, idx) => acc + v1 * vec2[idx], BigInt(0))

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Interface to WASM implementation of dot product
 */
const dot_product_wasm = async () => {
  const wasmBin = readFileSync("./vector.wasm")
  const wasmObj = await WebAssembly.instantiate(wasmBin, host_env)

  times.wasm.start = performance.now()
  wasmObj.instance.exports.dot_product(VEC_I32_SIZE, 0, VEC_BYTES, VEC_BYTES * 2)
  times.wasm.end = performance.now()

  log_result("WebAssembly", wasmMem64[result_offset], times.wasm)
  performance_ratio(times)
}

// ---------------------------------------------------------------------------------------------------------------------
// Off we go...
// ---------------------------------------------------------------------------------------------------------------------
console.log(`Dot product of 2, ${VEC_I32_SIZE} dimensional i32 vectors`)

// JavaScript calculates the answer first
times.js.start = performance.now()
let res = dot_product_js(jsVec1, jsVec2)
times.js.end = performance.now()

log_result(" JavaScript", res, times.js)

// Then WASM
dot_product_wasm()
