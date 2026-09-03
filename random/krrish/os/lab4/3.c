#include <stdio.h>
#include <pthread.h>
#include <unistd.h>
#include <stdlib.h>

void* coder(void* id){
    int idi = (int)(long)id;
    printf("Thread %d started\n", idi);
}

int main(){
    pthread_t coders[10];
    for(int i=0; i<10; i++){
        pthread_create(&coders[i], 0, &coder, &i);
    }
    sleep(0.3);

}