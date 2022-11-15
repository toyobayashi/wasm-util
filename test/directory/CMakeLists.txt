include(../test.cmake)

find_program(WASM_OPT "wasm-opt")

test("directory" "directory.c" "")
test("directory_asyncify" "directory.c" "")
test("directory_jspi" "directory.c" "")

add_custom_command(TARGET "directory_asyncify" POST_BUILD
  COMMAND ${WASM_OPT}
  "--asyncify"
  "--pass-arg=asyncify-imports@@${CMAKE_SOURCE_DIR}/wasi_snapshot_preview1.txt"
  "$<TARGET_FILE:directory_asyncify>"
  "-o"
  "$<TARGET_FILE:directory_asyncify>"
)

add_custom_command(TARGET "directory_jspi" POST_BUILD
  COMMAND ${WASM_OPT}
  "--enable-reference-types"
  "--jspi"
  "--pass-arg=jspi-imports@@${CMAKE_SOURCE_DIR}/wasi_snapshot_preview1.txt"
  "--pass-arg=jspi-exports@_start"
  "$<TARGET_FILE:directory_jspi>"
  "-o"
  "$<TARGET_FILE:directory_jspi>"
)
