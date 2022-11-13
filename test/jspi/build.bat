@echo off

clang -O3 -o jspi.wasm --target=wasm32-unknown-wasi jspi.c -Wl,--import-undefined,--export-dynamic
wasm-opt -O3 --enable-reference-types --jspi --pass-arg=jspi-imports@env.async_sleep --pass-arg=jspi-exports@_start -o jspi.wasm jspi.wasm
wasm2wat -o jspi.wat jspi.wasm
