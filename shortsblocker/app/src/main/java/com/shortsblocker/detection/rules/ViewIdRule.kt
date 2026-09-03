package com.shortsblocker.detection.rules

import com.shortsblocker.detection.DetectionResult
import com.shortsblocker.util.Constants
import com.shortsblocker.util.NodeWrapper

class ViewIdRule(private val customViewIds: Set<String> = emptySet()) : DetectionRule {
    override val name = "View ID Match"
    override val id = "view_id"

    override fun evaluate(rootNode: NodeWrapper): DetectionResult {
        // Exclude bottom navigation bar container from view id matches that trigger blocking,
        // because bottom nav id matches are expected and handled specifically in BottomNavRule.
        val targetIds = (Constants.DEFAULT_SHORTS_VIEW_IDS + customViewIds).filter {
            !it.contains("pivot_bar") && !it.contains("bottom_bar_container")
        }

        for (targetId in targetIds) {
            val matchedNodes = rootNode.findByViewId(targetId)
            if (matchedNodes.isNotEmpty()) {
                // Recycle the retrieved node wrappers to prevent leaks
                matchedNodes.forEach { it.recycle() }
                return DetectionResult.detected(
                    ruleName = name,
                    ruleId = id,
                    confidence = 1.0f,
                    metadata = mapOf("matched_id" to targetId)
                )
            }
        }

        return DetectionResult.notDetected(name, id)
    }
}
