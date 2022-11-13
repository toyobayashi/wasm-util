#define WASI_EXPORT __attribute__((visibility("default")))

void async_sleep(int ms);

int main() {
  async_sleep(200);
  return 0;
}
