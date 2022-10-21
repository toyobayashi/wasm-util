#include <stddef.h>
#include <errno.h>
#include <sys/random.h>
#include <unistd.h>
#include <stdio.h>

int get_random_values(void* buf, size_t buflen) {
  size_t pos;
  size_t stride;

  /* getentropy() returns an error for requests > 256 bytes. */
  for (pos = 0, stride = 256; pos + stride < buflen; pos += stride)
    if (getentropy((char*) buf + pos, stride))
      return errno;

  if (getentropy((char*) buf + pos, buflen - pos))
    return errno;

  return 0;
}

extern char **environ;

void call_js(void (*)(uint64_t data), uint64_t data);

void print(uint64_t data) {
  char buf[128];
  scanf("%s", buf);
  printf("Hello");
  printf(" %s\n", buf);

  get_random_values(buf, 1);
  printf("%u\n", buf[0]);
  printf("%llu\n", data);
}

int main(int argc, char** argv) {
  for (int i = 0; i < argc; ++i) {
    printf("%d: %s\n", i, *(argv + i));
  }

  int i = 0;
  while (environ[i]) {
    printf("%s\n", environ[i++]); // prints in form of "variable=value"
  }

  call_js(print, 18446744073709551615ULL);
  return 0;
}
