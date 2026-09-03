#include <stdio.h>
#include <stdlib.h>
#include <dlfcn.h>
#include <unistd.h>

// Basic NVML Types
typedef enum nvmlReturn_enum {
    NVML_SUCCESS = 0,
    // other values ignored
} nvmlReturn_t;

typedef struct nvmlUtilization_st {
    unsigned int gpu;
    unsigned int memory;
} nvmlUtilization_t;

int main() {
    void* lib = dlopen("libnvidia-ml.so", RTLD_NOW);
    if (!lib) {
        lib = dlopen("libnvidia-ml.so.1", RTLD_NOW);
    }
    
    if (!lib) {
        while(1) {
            printf("{\"text\": \"󰢮 0%%\"}\n");
            fflush(stdout);
            sleep(2);
        }
    }

    nvmlReturn_t (*nvmlInit)(void) = dlsym(lib, "nvmlInit_v2");
    nvmlReturn_t (*nvmlDeviceGetHandleByIndex)(unsigned int, void**) = dlsym(lib, "nvmlDeviceGetHandleByIndex_v2");
    nvmlReturn_t (*nvmlDeviceGetUtilizationRates)(void*, nvmlUtilization_t*) = dlsym(lib, "nvmlDeviceGetUtilizationRates");

    if (!nvmlInit || !nvmlDeviceGetHandleByIndex || !nvmlDeviceGetUtilizationRates) {
        while(1) {
            printf("{\"text\": \"󰢮 0%%\"}\n");
            fflush(stdout);
            sleep(2);
        }
    }

    if (nvmlInit() != NVML_SUCCESS) {
        while(1) {
            printf("{\"text\": \"󰢮 0%%\"}\n");
            fflush(stdout);
            sleep(2);
        }
    }

    void* device;
    if (nvmlDeviceGetHandleByIndex(0, &device) != NVML_SUCCESS) {
        while(1) {
            printf("{\"text\": \"󰢮 0%%\"}\n");
            fflush(stdout);
            sleep(2);
        }
    }

    while(1) {
        nvmlUtilization_t util;
        if (nvmlDeviceGetUtilizationRates(device, &util) == NVML_SUCCESS) {
            printf("{\"text\": \"󰢮 %u%%\"}\n", util.gpu);
            fflush(stdout);
            if (util.gpu > 0) {
                usleep(700000);
            } else {
                sleep(2);
            }
        } else {
            printf("{\"text\": \"󰢮 0%%\"}\n");
            fflush(stdout);
            sleep(2);
        }
    }
    return 0;
}
