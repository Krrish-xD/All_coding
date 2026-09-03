package com.shortsblocker.detection.rules

import com.shortsblocker.detection.DetectionResult
import com.shortsblocker.util.NodeWrapper
import com.shortsblocker.util.traverseTree

class UrlPatternRule : DetectionRule {
    override val name = "URL Pattern Match"
    override val id = "url_pattern"

    override fun evaluate(rootNode: NodeWrapper): DetectionResult {
        var isDetected = false
        var matchedUrl = ""

        rootNode.traverseTree { node ->
            val text = node.text?.toString() ?: ""
            val desc = node.contentDescription?.toString() ?: ""

            val hasShortsUrlText = text.contains("youtube.com/shorts/") || text.contains("/shorts/")
            val hasShortsUrlDesc = desc.contains("youtube.com/shorts/") || desc.contains("/shorts/")

            if (hasShortsUrlText || hasShortsUrlDesc) {
                isDetected = true
                matchedUrl = if (hasShortsUrlText) text else desc
                return@traverseTree true // Stop traversal
            }
            false
        }

        return if (isDetected) {
            DetectionResult.detected(
                ruleName = name,
                ruleId = id,
                confidence = 1.0f,
                metadata = mapOf("matched_url" to matchedUrl)
            )
        } else {
            DetectionResult.notDetected(name, id)
        }
    }
}
