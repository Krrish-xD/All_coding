#include <pthread.h>
#include <semaphore.h>
#include <stdio.h>
#include <unistd.h>

sem_t empty, full, limit;
int buffer = 0;

void* producer(void* arg) {
    while (1) {
        sem_wait(&empty);   // space in buffer
        sem_wait(&limit);   // limit: max 10 ahead

        buffer++;
        printf("Produced: %d\n", buffer);

        sem_post(&full);
    }
}

void* consumer(void* arg) {
    while (1) {
        sem_wait(&full);

        printf("Consumed: %d\n", buffer);
        buffer--;

        sem_post(&limit);   // allow producer to go ahead again
        sem_post(&empty);
    }
}

int main() {
    pthread_t p, c;

    sem_init(&empty, 0, 100);  // buffer size
    sem_init(&full, 0, 0);
    sem_init(&limit, 0, 10);   // ⭐ key: max 10 ahead

    pthread_create(&p, NULL, producer, NULL);
    pthread_create(&c, NULL, consumer, NULL);

    sleep(5);

    return 0;
}