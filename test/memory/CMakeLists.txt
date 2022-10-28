include(../test.cmake)

test("memory_import" "memory.c" "-Wl,--import-memory")
test("memory_export" "memory.c" "-Wl,--initial-memory=16777216")
