@echo off

set WASI_SDK_PATH=%WASI_SDK_PATH:\=/%

rd /s /q build

cmake -DCMAKE_TOOLCHAIN_FILE=%WASI_SDK_PATH%/share/cmake/wasi-sdk.cmake^
      -DWASI_SDK_PREFIX=%WASI_SDK_PATH%^
      -DCMAKE_VERBOSE_MAKEFILE=ON^
      -DCMAKE_BUILD_TYPE=Debug^
      -H. -Bbuild -G "MinGW Makefiles"

cmake --build build
