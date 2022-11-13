include(../test.cmake)

find_program(WASM_OPT "wasm-opt")

test("jspi" "jspi.c" "")
# target_link_options("jspi" PRIVATE "-mexec-model=reactor")

add_custom_command(TARGET jspi POST_BUILD
  COMMAND ${WASM_OPT}
          "--enable-reference-types"
          "--jspi"
          "--pass-arg=jspi-imports@env.async_sleep"
          "--pass-arg=jspi-exports@_start"
          "$<TARGET_FILE:jspi>"
          "-o"
          "$<TARGET_FILE:jspi>"
)
