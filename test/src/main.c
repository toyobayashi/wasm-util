#include <stddef.h>
#include <errno.h>
#include <sys/random.h>
#include <unistd.h>
#include <stdio.h>
#include <sys/stat.h>

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
  // scanf("%s", buf);
  printf("Hello");
  // printf(" %s\n", buf);

  get_random_values(buf, 1);
  printf("%d\n", buf[0]);
  printf("%llu\n", data);
}

int main(int argc, char** argv) {
  char cwd[256] = { 0 };
  getcwd(cwd, 256);
  printf("CWD: %s\n", cwd);
  mkdir("./node_modules", 0666);
  int r = chdir("./node_modules");
  if (r != 0) {
    fprintf(stderr, "chdir: %d\n", errno);
  } else {
    getcwd(cwd, 256);
    printf("CWD: %s\n", cwd);
  }

  FILE* f = fopen("./.npmrc", "w");
  if (f == NULL) {
    fprintf(stderr, "fopen: %d\n", errno);
  } else {
    fprintf(f, "file\n");
    fclose(f);
    f = fopen("./.npmrc", "r");
    char content[256] = { 0 };
    fread(content, 1, 256, f);
    printf(".npmrc: %s\n", content);
    fclose(f);
  }

  struct stat st;
  lstat(cwd, &st);

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
