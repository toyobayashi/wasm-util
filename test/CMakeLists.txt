cmake_minimum_required(VERSION 3.13.0)

find_program(WASM_OPT "wasm-opt")

project(wasitest)

set(TARGET_TEST_EXE a)
set(TARGET_ASYNCIFY_EXE b)

add_executable(${TARGET_TEST_EXE} "src/base64.c" "src/main.c")
set_target_properties(${TARGET_TEST_EXE} PROPERTIES SUFFIX ".wasm")

target_link_options(${TARGET_TEST_EXE} PRIVATE
  "-v"
  # "-mexec-model=reactor"
  # "-nostartfiles"
  # "-Wl,--no-entry"
  # "-Wl,--import-memory"
  "-Wl,--initial-memory=16777216,--export-dynamic,--export=malloc,--export=free,--import-undefined,--export-table"
)

add_executable(${TARGET_ASYNCIFY_EXE} "src/asyncify/main.c")
set_target_properties(${TARGET_ASYNCIFY_EXE} PROPERTIES SUFFIX ".wasm")

target_link_options(${TARGET_ASYNCIFY_EXE} PRIVATE
  "-v"
  "-Wl,--initial-memory=16777216,--export-dynamic,--import-undefined"
)

set(ASYNCIFY_FLAGS "--asyncify" "--pass-arg=asyncify-imports@env.async_sleep")

if(CMAKE_BUILD_TYPE STREQUAL "Release")
  # https://github.com/WebAssembly/wasi-sdk/issues/254
  target_link_options(${TARGET_TEST_EXE} PRIVATE
    "-Wl,--strip-debug"
  )
  target_link_options(${TARGET_ASYNCIFY_EXE} PRIVATE
    "-Wl,--strip-debug"
  )
  list(APPEND ASYNCIFY_FLAGS "-O")
else()
  list(APPEND ASYNCIFY_FLAGS "-g")
endif()

add_custom_command(TARGET ${TARGET_ASYNCIFY_EXE} POST_BUILD
  COMMAND ${WASM_OPT} ${ASYNCIFY_FLAGS} "$<TARGET_FILE:${TARGET_ASYNCIFY_EXE}>" "-o" "$<TARGET_FILE:${TARGET_ASYNCIFY_EXE}>")
