package com.shortsblocker.service

import android.accessibilityservice.AccessibilityService
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.SystemClock
import android.view.accessibility.AccessibilityEvent
import androidx.core.app.NotificationCompat
import com.shortsblocker.R
import com.shortsblocker.data.BlockEvent
import com.shortsblocker.data.BlockEventLog
import com.shortsblocker.data.SettingsRepository
import com.shortsblocker.detection.DetectionEngine
import com.shortsblocker.response.ResponseEngine
import com.shortsblocker.ui.MainActivity
import com.shortsblocker.util.AndroidNodeWrapper
import com.shortsblocker.util.Constants
import com.shortsblocker.debug.OverlayManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class ShortsAccessibilityService : AccessibilityService() {

    @Inject
    lateinit var settingsRepository: SettingsRepository

    @Inject
    lateinit var detectionEngine: DetectionEngine

    @Inject
    lateinit var responseEngine: ResponseEngine

    @Inject
    lateinit var serviceStateManager: ServiceStateManager

    @Inject
    lateinit var eventLog: BlockEventLog

    private val serviceScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var youtubeVersion = "Unknown"
    private var lastBlockTimestamp = 0L
    private var overlayManager: OverlayManager? = null

    companion object {
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "shorts_blocker_service_channel"
    }

    override fun onCreate() {
        super.onCreate()
        try {
            val packageInfo = packageManager.getPackageInfo(Constants.YOUTUBE_PACKAGE, 0)
            youtubeVersion = packageInfo.versionName ?: "Unknown"
        } catch (e: Exception) {
            youtubeVersion = "Unknown"
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        serviceStateManager.setServiceRunning(true)
        startForegroundServiceCompat()

        overlayManager = OverlayManager(this)
        serviceScope.launch {
            settingsRepository.debugOverlayEnabled.collect { enabled ->
                if (enabled) {
                    overlayManager?.showDebugOverlay()
                } else {
                    overlayManager?.hideDebugOverlay()
                }
            }
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        // Only process events from YouTube
        if (event.packageName != Constants.YOUTUBE_PACKAGE) {
            return
        }

        // Apply cooldown debouncing
        val currentTime = SystemClock.elapsedRealtime()
        val cooldownMs = settingsRepository.cachedCooldownMs
        if (currentTime - lastBlockTimestamp < cooldownMs) {
            return
        }

        val root = rootInActiveWindow ?: return
        val rootWrapper = AndroidNodeWrapper(root)

        val enabledRules = getEnabledRuleIds()
        if (enabledRules.isEmpty()) {
            rootWrapper.recycle()
            return
        }

        // Run detection engine
        val result = try {
            detectionEngine.evaluate(
                rootWrapper,
                enabledRules,
                settingsRepository.cachedCustomViewIds
            )
        } catch (e: Exception) {
            null
        } finally {
            rootWrapper.recycle()
        }

        // Update debug overlay text with current status
        if (settingsRepository.cachedDebugOverlayEnabled && result != null) {
            val ruleText = if (result.isDetected) result.ruleName else "none"
            val actionText = if (result.isDetected) "TRIGGER_ESC" else "listening"
            val latency = result.metadata["latency_ms"] ?: "0"
            overlayManager?.updateText(
                "📦 pkg: ${event.packageName}\n🎬 rule: $ruleText\n⚡ action: $actionText\n⏱️ latency: ${latency}ms"
            )
        }

        if (result != null && result.isDetected) {
            lastBlockTimestamp = currentTime

            // Log the initial detection
            val latency = result.metadata["latency_ms"]?.toLongOrNull() ?: 0L
            eventLog.logEvent(
                BlockEvent(
                    detectionRule = result.ruleName,
                    actionTaken = "TRIGGER_ESC",
                    attemptNumber = 0,
                    latencyMs = latency,
                    youtubeVersion = youtubeVersion
                )
            )

            // Trigger escalation response in a coroutine
            serviceScope.launch {
                responseEngine.respond(
                    service = this@ShortsAccessibilityService,
                    ytVersion = youtubeVersion,
                    isStillShortsActive = {
                        val currentRoot = rootInActiveWindow
                        if (currentRoot != null) {
                            val wrapper = AndroidNodeWrapper(currentRoot)
                            val evalResult = detectionEngine.evaluate(
                                wrapper,
                                getEnabledRuleIds(),
                                settingsRepository.cachedCustomViewIds
                            )
                            wrapper.recycle()
                            evalResult.isDetected
                        } else {
                            false
                        }
                    }
                )
            }
        }
    }

    private fun getEnabledRuleIds(): Set<String> {
        val enabled = mutableSetOf<String>()
        if (settingsRepository.cachedRuleBottomNav) enabled.add("bottom_nav")
        if (settingsRepository.cachedRuleContentDescription) enabled.add("content_description")
        if (settingsRepository.cachedRuleTextLabel) enabled.add("text_label")
        if (settingsRepository.cachedRuleUrlPattern) enabled.add("url_pattern")
        if (settingsRepository.cachedRuleViewId) enabled.add("view_id")
        if (settingsRepository.cachedRuleLayoutHeuristic) enabled.add("layout_heuristic")
        if (settingsRepository.cachedRuleShelfDetection) enabled.add("shorts_shelf")
        return enabled
    }

    private fun startForegroundServiceCompat() {
        createNotificationChannel()

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        // Using standard application icon as launcher drawable reference
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Shorts Blocker Active")
            .setContentText("Monitoring YouTube to block Shorts content.")
            .setSmallIcon(android.R.drawable.sym_def_app_icon)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(Notification.CATEGORY_SERVICE)
            .setContentIntent(pendingIntent)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                CHANNEL_ID,
                "Shorts Blocker Service Channel",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps the Shorts Blocker accessibility service running in foreground."
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(serviceChannel)
        }
    }

    override fun onInterrupt() {
        // Required override - no-op
    }

    override fun onDestroy() {
        overlayManager?.hideDebugOverlay()
        serviceStateManager.setServiceRunning(false)
        serviceScope.cancel()
        super.onDestroy()
    }
}
