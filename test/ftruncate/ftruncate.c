#include <sys/stat.h>
#include <assert.h>
#include <fcntl.h>
#include <unistd.h>

int main() {
  struct stat st;
  int fd;

  fd = open("ftruncate.dir/ftruncate.txt", O_CREAT | O_WRONLY, 0666);
  assert(fd != -1);

  assert(0 == fstat(fd, &st));
  assert(st.st_size == 0);
  assert(0 == lseek(fd, 0, SEEK_CUR));

  assert(0 == ftruncate(fd, 500));
  assert(0 == fstat(fd, &st));
  assert(st.st_size == 500);
  assert(0 == lseek(fd, 0, SEEK_CUR));

  assert(0 == ftruncate(fd, 300));
  assert(0 == fstat(fd, &st));
  assert(st.st_size == 300);
  assert(0 == lseek(fd, 0, SEEK_CUR));

  assert(0 == close(fd));
  return 0;
}
