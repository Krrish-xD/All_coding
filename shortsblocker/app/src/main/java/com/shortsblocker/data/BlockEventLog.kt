package com.shortsblocker.data

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.concurrent.ConcurrentLinkedQueue
import javax.inject.Inject
import javax.inject.Singleton

data class BlockEvent(
    val timestamp: Long = System.currentTimeMillis(),
    val detectionRule: String,
    val actionTaken: String,
    val attemptNumber: Int,
    val latencyMs: Long,
    val youtubeVersion: String
)

@Singleton
class BlockEventLog @Inject constructor() {
    private val maxBufferSize = 200
    private val buffer = ConcurrentLinkedQueue<BlockEvent>()
    private val _events = MutableStateFlow<List<BlockEvent>>(emptyList())
    val events: StateFlow<List<BlockEvent>> = _events.asStateFlow()

    fun logEvent(event: BlockEvent) {
        buffer.add(event)
        while (buffer.size > maxBufferSize) {
            buffer.poll()
        }
        // Update flow
        _events.value = buffer.toList().reversed() // Return newest first
    }

    fun clear() {
        buffer.clear()
        _events.value = emptyList()
    }
}
