#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/wait.h>
#include <assert.h>

int main(){
    int fd[2];
    pid_t pid;
    pipe(fd);
    pid = fork();
    if(pid == 0){
        close(fd[0]);
        char* msg = "Hello World!";
        write(fd[1], msg, strlen(msg)+1);
        exit(0);
    }
    else if(pid >= 1){
        close(fd[1]);
        sleep(1);
        char buffer[100];
        read(fd[0], buffer, sizeof(buffer));
        printf("Received: %s\n", buffer);
        wait(NULL);
    }
    return 0;
}