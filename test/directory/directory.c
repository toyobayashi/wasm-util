#include <assert.h>
#include <errno.h>
#include <stdio.h>

int main() {
  FILE* file = fopen("fopen-directory-parent-directory/..", "r");
  assert(file == NULL);
  assert(errno == ENOTCAPABLE);

  file = fopen("..", "r");
  assert(file == NULL);
  assert(errno == ENOTCAPABLE);

  file = fopen("fopen-working-directory.c", "r");
  assert(file == NULL);
  assert(errno == ENOTCAPABLE);

  return 0;
}
