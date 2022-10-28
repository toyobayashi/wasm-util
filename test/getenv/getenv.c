#include <assert.h>
#include <stdlib.h>
#include <string.h>

int main(void) {
  assert(getenv("ABSENT") == NULL);
  assert(strcmp(getenv("PRESENT"), "1") == 0);
  return 0;
}
