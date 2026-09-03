package com.shortsblocker.response

import android.accessibilityservice.AccessibilityService
import com.shortsblocker.data.BlockEvent
import com.shortsblocker.data.BlockEventLog
import com.shortsblocker.data.SettingsRepository
import kotlinx.coroutines.delay
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ResponseEngine @Inject constructor(
    private val eventLog: BlockEventLog,
    private val settingsRepository: SettingsRepository
) {
    /**
     * Executes a graduated response when a Shorts screen is detected:
     * Attempts back navigation multiple times with delays, and escalates to HOME if still blocked.
     *
     * @param service The active AccessibilityService instance.
     * @param ytVersion The package version of the YouTube app.
     * @param isStillShortsActive Callback to re-evaluate if Shorts are still present on screen.
     */
    suspend fun respond(
        service: AccessibilityService,
        ytVersion: String,
        isStillShortsActive: () -> Boolean
    ) {
        val delayMs = settingsRepository.cachedBackDelayMs
        val maxAttempts = settingsRepository.cachedMaxBackAttempts

        for (attempt in 1..maxAttempts) {
            // Re-evaluate: if user has already exited Shorts, stop the escalation loop
            if (!isStillShortsActive()) {
                return
            }

            // Attempt back navigation
            var success = service.performGlobalAction(AccessibilityService.GLOBAL_ACTION_BACK)
            var actionTaken = "BACK"

            if (!success) {
                // If standard BACK action fails, try swipe-back gesture simulation
                success = GestureBackFallback.dispatchSwipeBack(service)
                actionTaken = "GESTURE_BACK"
            }

            eventLog.logEvent(
                BlockEvent(
                    detectionRule = "Escalation BACK",
                    actionTaken = if (success) actionTaken else "${actionTaken}_FAILED",
                    attemptNumber = attempt,
                    latencyMs = 0,
                    youtubeVersion = ytVersion
                )
            )

            settingsRepository.incrementBlockedCount()

            // Delay before the next verification check
            delay(delayMs)
        }

        // Escalation to HOME if still on Shorts after max back navigation attempts
        if (isStillShortsActive()) {
            val success = service.performGlobalAction(AccessibilityService.GLOBAL_ACTION_HOME)
            eventLog.logEvent(
                BlockEvent(
                    detectionRule = "Escalation HOME",
                    actionTaken = if (success) "HOME" else "HOME_FAILED",
                    attemptNumber = maxAttempts + 1,
                    latencyMs = 0,
                    youtubeVersion = ytVersion
                )
            )
            settingsRepository.incrementBlockedCount()
        }
    }
}
