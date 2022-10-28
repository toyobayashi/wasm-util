#include <stdio.h>
#include <stdlib.h>

int main(void) {
  if (fputs("Hello, stdout!\n", stdout) == 0) {
		return ferror(stdout);
	}
  return 0;
}
