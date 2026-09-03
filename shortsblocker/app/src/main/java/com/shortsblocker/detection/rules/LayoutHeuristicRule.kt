package com.shortsblocker.detection.rules

import com.shortsblocker.detection.DetectionResult
import com.shortsblocker.util.NodeWrapper
import com.shortsblocker.util.traverseTree

class LayoutHeuristicRule : DetectionRule {
    override val name = "Layout Heuristics"
    override val id = "layout_heuristic"

    override fun evaluate(rootNode: NodeWrapper): DetectionResult {
        var score = 0
        val indicators = mutableListOf<String>()

        var hasSeekBar = false

        rootNode.traverseTree { node ->
            val className = node.className?.toString() ?: ""
            val desc = node.contentDescription?.toString() ?: ""

            // Deduct score or flag if seek bar is visible (Shorts rarely has a standard seek bar in standard view)
            if (className.contains("SeekBar", ignoreCase = true) || className.contains("ProgressBar", ignoreCase = true)) {
                hasSeekBar = true
            }

            // Look for right-side action buttons by content description
            val isLikeButton = desc.contains("like this video", ignoreCase = true)
            val isDislikeButton = desc.contains("dislike this video", ignoreCase = true)
            val isCommentButton = desc.contains("comment", ignoreCase = true) && 
                                  (className.contains("button", ignoreCase = true) || node.childCount == 0)
            val isShareButton = desc.contains("share", ignoreCase = true) && 
                                (className.contains("button", ignoreCase = true) || node.childCount == 0)
            val isSubscribeButton = desc.contains("subscribe", ignoreCase = true)

            if (isLikeButton) {
                score += 1
                indicators.add("like_button")
            }
            if (isDislikeButton) {
                score += 1
                indicators.add("dislike_button")
            }
            if (isCommentButton) {
                score += 1
                indicators.add("comment_button")
            }
            if (isShareButton) {
                score += 1
                indicators.add("share_button")
            }
            if (isSubscribeButton) {
                score += 2
                indicators.add("subscribe_button")
            }

            false // Continue full traversal
        }

        // If we found a seekbar, reduce the confidence
        val finalScore = if (hasSeekBar) score - 2 else score

        val isDetected = finalScore >= 4 // Threshold is 4 (e.g. Subscribe (2) + Like (1) + Dislike (1) = 4)

        return if (isDetected) {
            DetectionResult.detected(
                ruleName = name,
                ruleId = id,
                confidence = finalScore / 6.0f,
                metadata = mapOf(
                    "score" to finalScore.toString(),
                    "indicators" to indicators.joinToString(","),
                    "has_seekbar" to hasSeekBar.toString()
                )
            )
        } else {
            DetectionResult.notDetected(name, id)
        }
    }
}
