#include <stdio.h>
#include <stdlib.h>
#include <sys/types.h>
#include <sys/ipc.h>
#include <sys/shm.h>
#include <string.h>
#include <unistd.h>

int main() {
    int shmid;
    char *data;

    // create shared memory
    shmid = shmget(IPC_PRIVATE, 1024, 0666 | IPC_CREAT);

    pid_t pid = fork();

    if (pid == 0) {
        // CHILD → read
        data = (char*) shmat(shmid, NULL, 0);
        printf("Child read: %s\n", data);
        shmdt(data);
    } 
    else {
        // PARENT → write
        data = (char*) shmat(shmid, NULL, 0);
        strcpy(data, "Hello via shared memory");
        shmdt(data);
    }

    return 0;
}