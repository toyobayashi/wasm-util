include(../test.cmake)

find_program(WASM_OPT "wasm-opt")

test("asyncify" "asyncify.c" "")

add_custom_command(TARGET asyncify POST_BUILD
  COMMAND ${WASM_OPT} "--asyncify" "--pass-arg=asyncify-imports@env.async_sleep" "$<TARGET_FILE:asyncify>" "-o" "$<TARGET_FILE:asyncify>")
