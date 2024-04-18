#!/bin/bash

rm -rf ./build

mkdir -p ./build

cmake -DCMAKE_TOOLCHAIN_FILE=$WASI_SDK_PATH/share/cmake/wasi-sdk-pthread.cmake \
      -DWASI_SDK_PREFIX=$WASI_SDK_PATH \
      -DCMAKE_VERBOSE_MAKEFILE=ON \
      -DCMAKE_BUILD_TYPE=Debug \
      -H. -Bbuild -G Ninja

cmake --build build

rm -rf ./build

mkdir -p ./build

cmake -DCMAKE_TOOLCHAIN_FILE=$WASI_SDK_PATH/share/cmake/wasi-sdk.cmake \
      -DWASI_SDK_PREFIX=$WASI_SDK_PATH \
      -DCMAKE_VERBOSE_MAKEFILE=ON \
      -DCMAKE_BUILD_TYPE=Debug \
      -H. -Bbuild -G Ninja

cmake --build build
