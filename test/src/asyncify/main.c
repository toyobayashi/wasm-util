#include <stdio.h>

#define WASI_EXPORT __attribute__((visibility("default")))

void async_sleep(int ms);

int main() {
  printf("before\n");
  async_sleep(2000);
  printf("after\n");
  return 0;
}
