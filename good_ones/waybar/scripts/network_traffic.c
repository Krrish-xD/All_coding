#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

char cached_iface[64] = {0};

void get_default_iface(char* out) {
    FILE* f = fopen("/proc/net/route", "r");
    if (!f) return;
    char line[256];
    while(fgets(line, sizeof(line), f)) {
        char iface[64], dest[64];
        if (sscanf(line, "%s %s", iface, dest) == 2) {
            if (strcmp(dest, "00000000") == 0) { // default route
                strcpy(out, iface);
                fclose(f);
                return;
            }
        }
    }
    fclose(f);
    out[0] = '\0';
}

unsigned long long get_bytes(const char* dir) {
    char path[256];
    sprintf(path, "/sys/class/net/%s/statistics/%s", cached_iface, dir);
    FILE* f = fopen(path, "r");
    if (!f) {
        get_default_iface(cached_iface);
        if (cached_iface[0] == '\0') return 0;
        
        sprintf(path, "/sys/class/net/%s/statistics/%s", cached_iface, dir);
        f = fopen(path, "r");
        if (!f) return 0;
    }
    unsigned long long b = 0;
    if (fscanf(f, "%llu", &b) != 1) b = 0;
    fclose(f);
    return b;
}

void format_speed(unsigned long long bytes, char* out) {
    unsigned long long bits = bytes * 8ULL;
    if (bits >= 1000000ULL) {
        sprintf(out, "%lluM", bits / 1000000ULL);
    } else if (bits >= 1000ULL) {
        sprintf(out, "%lluk", bits / 1000ULL);
    } else {
        sprintf(out, "%llu", bits);
    }
}

int main() {
    get_default_iface(cached_iface);
    unsigned long long rx1 = get_bytes("rx_bytes");
    unsigned long long tx1 = get_bytes("tx_bytes");
    
    while(1) {
        sleep(1);
        
        if (cached_iface[0] == '\0') {
            get_default_iface(cached_iface);
        }
        
        if (cached_iface[0] == '\0') {
            printf("{\"text\": \"Offline\", \"class\": \"disconnected\"}\n");
            fflush(stdout);
            continue;
        }

        unsigned long long rx2 = get_bytes("rx_bytes");
        unsigned long long tx2 = get_bytes("tx_bytes");
        
        unsigned long long rx_rate = rx2 >= rx1 ? rx2 - rx1 : 0;
        unsigned long long tx_rate = tx2 >= tx1 ? tx2 - tx1 : 0;
        
        char down[32], up[32];
        format_speed(rx_rate, down);
        format_speed(tx_rate, up);
        
        printf("{\"text\": \"↓%s ↑%s\", \"class\": \"connected\"}\n", down, up);
        fflush(stdout);
        
        rx1 = rx2;
        tx1 = tx2;
    }
    return 0;
}
