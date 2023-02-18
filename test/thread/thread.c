#include <stddef.h>
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <errno.h>
#include <time.h>
#include <pthread.h>

int nanosleep(const struct timespec *, struct timespec *);

void uv_sleep(unsigned int msec) {
  struct timespec timeout;
  int rc;

  timeout.tv_sec = msec / 1000;
  timeout.tv_nsec = (msec % 1000) * 1000 * 1000;

  do
    rc = nanosleep(&timeout, &timeout);
  while (rc == -1 && errno == EINTR);

  assert(rc == 0);
}

static int val = 0;
static pthread_mutex_t mutex = PTHREAD_MUTEX_INITIALIZER;
static void* child_thread_execute(void* arg) {
	uv_sleep(1000);
	printf("sleep: %d\n", 1000);
  pthread_mutex_lock(&mutex);
  val = 1;
  pthread_mutex_unlock(&mutex);
	return NULL;
}

#define WASI_EXPORT __attribute__((visibility("default")))

WASI_EXPORT
void sleep_in_child_thread() {
	pthread_t t;
	pthread_create(&t, NULL, child_thread_execute, NULL);
}

WASI_EXPORT
int get_value() {
  return val;
}
