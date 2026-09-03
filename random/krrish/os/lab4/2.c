#include <stdio.h>
#include <sys/types.h>
#include <unistd.h>
#include <stdlib.h>
#include <sys/wait.h>

int main(){
    pid_t pid;
    pid = fork();
    if(pid == 0){
        printf("\n\nChild process\n");
        sleep(1);
        execl("/bin/ls", "ls", NULL);
        exit(0);
    }
    else{
        wait(NULL);
        sleep(1);
        printf("Parent process");
    }
    return 0;
}