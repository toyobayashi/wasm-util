#include <stdio.h>
#include <stdlib.h>

int main(void) {
  if (fputs("Hello, stderr!\n", stderr) == 0) {
		return ferror(stdout);
	}
  return 0;
}
