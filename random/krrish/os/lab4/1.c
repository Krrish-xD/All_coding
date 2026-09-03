#include <pthread.h>
#include <stdio.h>
#include <unistd.h>

void* thread_code(void* params){
    sleep(2);
    printf("Hello World!\n");
    return NULL;
}

int main(){
    pthread_t thread;
    pthread_create(&thread, 0, &thread_code, 0);
    pthread_join(thread, NULL);
    printf("\nMain Thread");
}