#include <assert.h>
#include <stdlib.h>
#include <time.h>

int main() {
	struct timespec ts1;
	assert(clock_getres(CLOCK_MONOTONIC, &ts1) == 0);
  struct timespec ts2;
	assert(clock_getres(CLOCK_REALTIME, &ts2) == 0);
  struct timespec ts3;
  assert(clock_gettime(CLOCK_MONOTONIC, &ts3) == 0);
  struct timespec ts4;
  assert(clock_gettime(CLOCK_REALTIME, &ts4) == 0);
  long long milliseconds = (ts4.tv_sec * 1000) + (ts4.tv_nsec / 1000000);
  printf("now: %lld\n", milliseconds);
  return EXIT_SUCCESS;
}
