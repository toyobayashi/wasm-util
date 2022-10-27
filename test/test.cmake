function(test TARGET SRCLIST LINKOPTIONS)
  add_executable(${TARGET} ${SRCLIST})
  set_target_properties(${TARGET} PROPERTIES SUFFIX ".wasm")
  set_target_properties(${TARGET} PROPERTIES RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}")

  target_link_options(${TARGET} PRIVATE
    "-v"
    "-Wl,--initial-memory=16777216,--export-dynamic,--import-undefined"
    ${LINKOPTIONS}
  )

  if(CMAKE_BUILD_TYPE STREQUAL "Release")
    target_link_options(${TARGET} PRIVATE
      "-Wl,--strip-debug"
    )
  endif()
endfunction(test)
