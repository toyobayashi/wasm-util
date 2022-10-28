#include <stddef.h>
#include <stdlib.h>

void js_log(void* n, size_t s);

int main() {
  int* p = malloc(sizeof(int));
  *p = 233;
  js_log(p, sizeof(int));
  free(p);
  return 0;
}
