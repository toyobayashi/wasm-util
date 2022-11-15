include(../test.cmake)

test("ftruncate" "ftruncate.c" "")
test("ftruncate_asyncify" "ftruncate.c" "")
test("ftruncate_jspi" "ftruncate.c" "")

add_custom_command(TARGET "ftruncate_asyncify" POST_BUILD
  COMMAND ${WASM_OPT}
  "--asyncify"
  "--pass-arg=asyncify-imports@@${CMAKE_SOURCE_DIR}/wasi_snapshot_preview1.txt"
  "$<TARGET_FILE:ftruncate_asyncify>"
  "-o"
  "$<TARGET_FILE:ftruncate_asyncify>"
)

add_custom_command(TARGET "ftruncate_jspi" POST_BUILD
  COMMAND ${WASM_OPT}
  "--enable-reference-types"
  "--jspi"
  "--pass-arg=jspi-imports@@${CMAKE_SOURCE_DIR}/wasi_snapshot_preview1.txt"
  "--pass-arg=jspi-exports@_start"
  "$<TARGET_FILE:ftruncate_jspi>"
  "-o"
  "$<TARGET_FILE:ftruncate_jspi>"
)
