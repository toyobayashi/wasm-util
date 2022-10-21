#ifndef SRC_BASE64_H_
#define SRC_BASE64_H_

#include <stddef.h>

#define WASI_EXPORT __attribute__((visibility("default")))

#ifdef __cplusplus
extern "C" {
#endif

WASI_EXPORT size_t base64_encode(const unsigned char* src, size_t len, char* dst);
WASI_EXPORT size_t base64_decode(const char* src, size_t len, unsigned char* dst);

#ifdef __cplusplus
}
#endif

#endif  // SRC_BASE64_H_
