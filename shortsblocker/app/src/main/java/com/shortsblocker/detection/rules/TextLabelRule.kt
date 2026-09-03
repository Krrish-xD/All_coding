package com.shortsblocker.detection.rules

import com.shortsblocker.detection.DetectionResult
import com.shortsblocker.util.Constants
import com.shortsblocker.util.NodeWrapper
import com.shortsblocker.util.traverseTree

class TextLabelRule : DetectionRule {
    override val name = "Text Label Match"
    override val id = "text_label"

    override fun evaluate(rootNode: NodeWrapper): DetectionResult {
        var isDetected = false
        var matchedText = ""

        rootNode.traverseTree { node ->
            val text = node.text?.toString() ?: ""
            val viewId = node.viewIdResourceName ?: ""

            // Exclude common text elements that might contain the word "Shorts" but are not the player or feed
            val isExcludedView = viewId.contains("video_title") || 
                                 viewId.contains("desc") || 
                                 viewId.contains("comment") || 
                                 viewId.contains("search") ||
                                 viewId.contains("results")

            if (!isExcludedView) {
                val matchesLabel = Constants.SHORTS_LABELS.any { label ->
                    text.equals(label, ignoreCase = true)
                }

                if (matchesLabel) {
                    // Check if it's not part of standard feed titles.
                    // Usually the Shorts screen itself has a static title/label "Shorts" in the header or toolbar.
                    isDetected = true
                    matchedText = text
                    return@traverseTree true // Stop traversal
                }
            }
            false
        }

        return if (isDetected) {
            DetectionResult.detected(
                ruleName = name,
                ruleId = id,
                confidence = 1.0f,
                metadata = mapOf("matched_text" to matchedText)
            )
        } else {
            DetectionResult.notDetected(name, id)
        }
    }
}
