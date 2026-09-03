#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <string.h>
#include <fcntl.h>

#define FIFO_NAME "myfifo"

int main(){
    char buf[100];
    char msg[] = "Hello from parent printed inside child";

    mkfifo(FIFO_NAME, 0666);
    pid_t pid = fork();

    if(pid == 0){
        int fd = open(FIFO_NAME, O_RDONLY);
        int n = read(fd, buf, sizeof(buf)-1);
        buf[n] = '\0';
        printf("%s\n", buf);
        sleep(10);
        close(fd);
    }
    else{
        // PARENT → write
        int fd = open(FIFO_NAME, O_WRONLY);
        sleep(10);
        write(fd, msg, strlen(msg) + 1);

        close(fd);
    }

    return 0;
}