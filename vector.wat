 (module
  (import "js" "shared_mem" (memory 3))
  ;; (import "js" "console.log" (func $log2 (param i32) (param i32) (param i32)))
  ;; (import "js" "console.log" (func $log3 (param i32) (param i32) (param i32) (param i32)))

  (func (export "dot_product")
        (param $vec_size   i32)
        (param $vec1_start i32)
        (param $vec2_start i32)
        (param $res_offset i32)

    (local $idx i32)
    (local $result i64)

    (loop $next
      (if (i32.gt_u (local.get $vec_size) (local.get $idx))
        (then
          ;; (call $log3
          ;;   (i32.const 0)
          ;;   (local.get $idx)
          ;;   (i32.load (local.get $vec1_start))
          ;;   (i32.load (local.get $vec2_start))
          ;; )
          (local.set $result (i64.add (local.get $result) (i64.mul (i64.load32_u (local.get $vec1_start)) (i64.load32_u (local.get $vec2_start)))))

          (local.set $vec1_start (i32.add (local.get $vec1_start) (i32.const 4)))
          (local.set $vec2_start (i32.add (local.get $vec2_start) (i32.const 4)))
          (local.set $idx        (i32.add (local.get $idx)        (i32.const 1)))

          br $next
        )
      )
    )

    (i64.store (local.get $res_offset) (local.get $result))
    ;; (call $log2
    ;;   (i32.const 1)
    ;;   (i32.load (i32.add (local.get $res_offset) (i32.const 4)))
    ;;   (i32.load (local.get $res_offset))
    ;; )
  )
)
