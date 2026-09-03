#include <stdio.h>
#include <stdlib.h>
#include <sys/types.h>
#include <sys/ipc.h>
#include <sys/msg.h>
#include <string.h>
#include <unistd.h>


struct msgbuf{
    long msg_type;
    char msg_text[100];
};
int main(){
    struct msgbuf msg;
    int msgid;

    msgid = msgget(111, 0666 | IPC_CREAT);

    pid_t pid = fork();
    
    if (pid == 0) {
        // CHILD → receive
        msgrcv(msgid, &msg, sizeof(msg.msg_text), 1, 0);
        printf("Child received: %s\n", msg.msg_text);
    } 
    else {
        // PARENT → send
        msg.msg_type = 1;
        strcpy(msg.msg_text, "Hello via message queue");

        msgsnd(msgid, &msg, sizeof(msg.msg_text), 0);
    }

    return 0;
}