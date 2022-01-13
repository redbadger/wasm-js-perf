# Comparison of JS and WASM Performance

A collection of programs that compare the performance of JS and WASM when performing the same task.

* Vector Dot (or Scalar) Product

## Local Testing

* Ensure that you are using Node 14 or higher
* Clone the repo into some suitable directory

### Vector Dot Product

Functionality

* Allocate a block of shared memory
* Within shared memory, create two i32 arrays of length 16384
* Fill these arrays with random numbers (0 < n < 16384)
* JavaScript calculates their dot product
* WASM calculates their dot product
* Show execution time difference

The dot product of two vectors (arrays) is calculated as:

<code>
u . v => (u<sub><i>1</i></sub> * v<sub><i>1</i></sub>) + (u<sub><i>2</i></sub> * v<sub><i>2</i></sub>) + &hellip; + (u<sub><i>n</i></sub> * v<sub><i>n</i></sub>)
</code><br>

Performance is calculated as a ratio with WASM being the 1.

Due to the fact that after multiplying two i32s, JavaScript cannot then store the result as a BigInt (i64), the random numbers in the shared memory arrays are duplicated into two JavaScript `BigUint64Array`s.  This avoids unnecessary type conversion at runtime that would skew the performance results.

```sh
$ node vector.js
Dot product of 2, 16384 dimensional i32 vectors
 JavaScript: Result = 1098614033350 calculated in 2.470ms
WebAssembly: Result = 1098614033350 calculated in 0.035ms

JavaScript : WASM performance ratio = 71.427:1
```

The performance ratio can vary quite significantly from that shown above.
