#include <unistd.h>
#include <sys/types.h>
#include <stdio.h>
#include <string.h>

int main(){
    int fd[2];
    char buf[100], msg[100];

    pipe(fd);
    pid_t pid = fork();

    if(pid == 0){            // child
        close(fd[1]);
        int n = read(fd[0], buf, sizeof(buf)-1);
        buf[n] = '\0';
        printf("%s\n", buf);
    }
    else{                    // parent
        close(fd[0]);
        strcpy(msg, "Hello from parent");
        write(fd[1], msg, strlen(msg)+1);
    }
}