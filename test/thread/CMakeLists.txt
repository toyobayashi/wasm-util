include(../test.cmake)

test("thread" "thread.c" "-mexec-model=reactor;-Wl,--import-memory,--max-memory=2147483648")
