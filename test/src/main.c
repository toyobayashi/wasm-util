#include <unistd.h>
#include <stdio.h>

extern char **environ;

void call_js(void (*)());

void print() {
  char buf[128];
  scanf("%s", buf);
  printf("Hello");
  printf(" %s\n", buf);
}

int main(int argc, char** argv) {
  for (int i = 0; i < argc; ++i) {
    printf("%d: %s\n", i, *(argv + i));
  }

  int i = 0;
  while (environ[i]) {
    printf("%s\n", environ[i++]); // prints in form of "variable=value"
  }

  call_js(print);
  return 0;
}
