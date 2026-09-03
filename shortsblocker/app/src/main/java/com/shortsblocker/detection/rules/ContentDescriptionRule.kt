package com.shortsblocker.detection.rules

import com.shortsblocker.detection.DetectionResult
import com.shortsblocker.util.NodeWrapper
import com.shortsblocker.util.traverseTree

class ContentDescriptionRule : DetectionRule {
    override val name = "Content Description Match"
    override val id = "content_description"

    override fun evaluate(rootNode: NodeWrapper): DetectionResult {
        var isDetected = false
        var matchedDesc = ""

        rootNode.traverseTree { node ->
            val desc = node.contentDescription?.toString() ?: ""
            
            // Check for explicit "Shorts" content description (excluding bottom bar elements which are handled by Rule 1)
            // But we should ignore matches that are clearly video titles or headers if they are not selected tabs or action buttons.
            // On the Shorts player screen, the primary player container or swipe view might have description "Shorts".
            val viewId = node.viewIdResourceName ?: ""
            
            if (desc.equals("Shorts", ignoreCase = true) && !viewId.contains("pivot_bar") && !viewId.contains("bottom_bar")) {
                isDetected = true
                matchedDesc = desc
                return@traverseTree true // Stop traversal
            }
            false
        }

        return if (isDetected) {
            DetectionResult.detected(
                ruleName = name,
                ruleId = id,
                confidence = 1.0f,
                metadata = mapOf("matched_desc" to matchedDesc)
            )
        } else {
            DetectionResult.notDetected(name, id)
        }
    }
}
