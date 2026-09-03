#include <stdio.h>
#include <pthread.h>
#include <semaphore.h>
#include <unistd.h>

sem_t mutex, wrt;
int readcount = 0;

void* reader(void* arg) {
    int id = *(int*)arg;

    sem_wait(&mutex);
    readcount++;
    if (readcount == 1)
        sem_wait(&wrt);   // first reader blocks writer
    sem_post(&mutex);

    printf("Reader %d is reading\n", id);
    sleep(1);

    sem_wait(&mutex);
    readcount--;
    if (readcount == 0)
        sem_post(&wrt);   // last reader allows writer
    sem_post(&mutex);

    return NULL;
}

void* writer(void* arg) {
    int id = *(int*)arg;

    sem_wait(&wrt);

    printf("Writer %d is writing\n", id);
    sleep(1);

    sem_post(&wrt);

    return NULL;
}

int main() {
    pthread_t r[3], w[2];
    int id[5];

    sem_init(&mutex, 0, 1);
    sem_init(&wrt, 0, 1);

    // create readers
    for (int i = 0; i < 3; i++) {
        id[i] = i + 1;
        pthread_create(&r[i], NULL, reader, &id[i]);
    }

    // create writers
    for (int i = 0; i < 2; i++) {
        id[i+3] = i + 1;
        pthread_create(&w[i], NULL, writer, &id[i+3]);
    }

    // join
    for (int i = 0; i < 3; i++)
        pthread_join(r[i], NULL);

    for (int i = 0; i < 2; i++)
        pthread_join(w[i], NULL);

    return 0;
}