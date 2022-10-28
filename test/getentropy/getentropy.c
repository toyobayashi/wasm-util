#include <assert.h>
#include <stdlib.h>
#include <unistd.h>

int main() {
  char buf[256] = {0};
  assert(getentropy(buf, 256) == 0);

  for (int i = 0; i < 256; i++) {
    if (buf[i] != 0) {
      return EXIT_SUCCESS;
    }
  }

  return EXIT_FAILURE;
}
