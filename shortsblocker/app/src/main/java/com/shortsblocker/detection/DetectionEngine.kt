package com.shortsblocker.detection

import android.os.SystemClock
import com.shortsblocker.detection.rules.*
import com.shortsblocker.util.NodeWrapper
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DetectionEngine @Inject constructor() {

    /**
     * Evaluates all enabled detection rules in priority order (cheapest first).
     * Short-circuits on the first match.
     *
     * @param rootNode The root NodeWrapper of the active window.
     * @param enabledRuleIds The set of rule IDs that are currently enabled in settings.
     * @param customViewIds User-defined custom view IDs to extend ViewIdRule.
     * @return DetectionResult containing detection state and metrics.
     */
    fun evaluate(
        rootNode: NodeWrapper,
        enabledRuleIds: Set<String>,
        customViewIds: Set<String>
    ): DetectionResult {
        val startTime = SystemClock.elapsedRealtime()

        // Rules instantiated in priority order
        val rules = listOf(
            BottomNavRule(),
            ContentDescriptionRule(),
            TextLabelRule(),
            UrlPatternRule(),
            ViewIdRule(customViewIds),
            LayoutHeuristicRule(),
            ShelfDetectionRule()
        )

        for (rule in rules) {
            if (enabledRuleIds.contains(rule.id)) {
                val result = try {
                    rule.evaluate(rootNode)
                } catch (e: Exception) {
                    DetectionResult.notDetected(rule.name, rule.id)
                }

                if (result.isDetected) {
                    val latency = SystemClock.elapsedRealtime() - startTime
                    val updatedMetadata = result.metadata.toMutableMap().apply {
                        put("latency_ms", latency.toString())
                    }
                    return result.copy(metadata = updatedMetadata)
                }
            }
        }

        val latency = SystemClock.elapsedRealtime() - startTime
        return DetectionResult(
            isDetected = false,
            ruleName = "None",
            ruleId = "none",
            confidence = 0.0f,
            metadata = mapOf("latency_ms" to latency.toString())
        )
    }
}
