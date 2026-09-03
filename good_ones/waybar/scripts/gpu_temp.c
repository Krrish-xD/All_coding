#include <stdio.h>
#include <stdlib.h>
#include <dlfcn.h>
#include <unistd.h>

typedef enum nvmlReturn_enum {
    NVML_SUCCESS = 0,
} nvmlReturn_t;

int main() {
    void* lib = dlopen("libnvidia-ml.so", RTLD_NOW);
    if (!lib) {
        lib = dlopen("libnvidia-ml.so.1", RTLD_NOW);
    }
    
    if (!lib) {
        while(1) {
            printf("{\"text\": \" --°C\"}\n");
            fflush(stdout);
            sleep(2);
        }
    }

    nvmlReturn_t (*nvmlInit)(void) = dlsym(lib, "nvmlInit_v2");
    nvmlReturn_t (*nvmlDeviceGetHandleByIndex)(unsigned int, void**) = dlsym(lib, "nvmlDeviceGetHandleByIndex_v2");
    nvmlReturn_t (*nvmlDeviceGetTemperature)(void*, int, unsigned int*) = dlsym(lib, "nvmlDeviceGetTemperature");

    if (!nvmlInit || !nvmlDeviceGetHandleByIndex || !nvmlDeviceGetTemperature) {
        while(1) {
            printf("{\"text\": \" --°C\"}\n");
            fflush(stdout);
            sleep(2);
        }
    }

    if (nvmlInit() != NVML_SUCCESS) {
        while(1) {
            printf("{\"text\": \" --°C\"}\n");
            fflush(stdout);
            sleep(2);
        }
    }

    void* device;
    if (nvmlDeviceGetHandleByIndex(0, &device) != NVML_SUCCESS) {
        while(1) {
            printf("{\"text\": \" --°C\"}\n");
            fflush(stdout);
            sleep(2);
        }
    }

    while(1) {
        unsigned int temp;
        if (nvmlDeviceGetTemperature(device, 0, &temp) == NVML_SUCCESS) {
            printf("{\"text\": \"%u°C\", \"tooltip\": \"GPU Temperature: %u°C\"}\n", temp, temp);
        } else {
            printf("{\"text\": \"--°C\", \"tooltip\": \"GPU Temperature: N/A\"}\n");
        }
        fflush(stdout);
        sleep(2);
    }
    return 0;
}
