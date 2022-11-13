cmake_minimum_required(VERSION 3.13.0)

project(wasitest)

set(TARGET_TEST_EXE a)

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

if(CMAKE_BUILD_TYPE STREQUAL "Release")
  # https://github.com/WebAssembly/wasi-sdk/issues/254
  target_link_options(${TARGET_TEST_EXE} PRIVATE
    "-Wl,--strip-debug"
  )
endif()

add_subdirectory("memory")
add_subdirectory("abort")
add_subdirectory("assert")
add_subdirectory("clock")
add_subdirectory("exit")
add_subdirectory("directory")
add_subdirectory("ftruncate")
add_subdirectory("getentropy")
add_subdirectory("getenv")
add_subdirectory("stdout")
add_subdirectory("stdin")
add_subdirectory("asyncify")
add_subdirectory("jspi")
