#include <assert.h>
#include <errno.h>
#include <stdio.h>

int main() {
  FILE* file = fopen("fopen-directory-parent-directory/..", "r");
  assert(file == NULL);
  assert(errno == ENOENT);

  file = fopen("..", "r");
  assert(file == NULL);
  assert(errno == ENOENT);

  file = fopen("fopen-working-directory.c", "r");
  assert(file == NULL);
  assert(errno == ENOENT);

  return 0;
}
