#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(void) {
	char data[32];
	assert(fgets(data, sizeof(data), stdin) != NULL);
	assert(strcmp(data, "Hello, stdin!\n") == 0);

	return EXIT_SUCCESS;
}
