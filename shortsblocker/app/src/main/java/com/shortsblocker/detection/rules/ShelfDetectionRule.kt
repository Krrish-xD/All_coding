package com.shortsblocker.detection.rules

import com.shortsblocker.detection.DetectionResult
import com.shortsblocker.util.NodeWrapper
import com.shortsblocker.util.traverseTree

class ShelfDetectionRule : DetectionRule {
    override val name = "Shorts Shelf Detection"
    override val id = "shorts_shelf"

    override fun evaluate(rootNode: NodeWrapper): DetectionResult {
        var isDetected = false
        var matchedDetail = ""

        // If the main window itself is showing a grid of Shorts (some YouTube updates have a dedicated Shorts shelf or tab view),
        // we can detect it.
        rootNode.traverseTree { node ->
            val viewId = node.viewIdResourceName ?: ""
            val desc = node.contentDescription?.toString() ?: ""
            val text = node.text?.toString() ?: ""

            // Look for Shorts shelf elements
            val isShelfHeader = viewId.contains("shorts_shelf_header") || 
                                (text.equals("Shorts", ignoreCase = true) && viewId.contains("title_container"))

            if (isShelfHeader) {
                // If we detect the user clicked or focused on the shelf itself, or if it occupies the whole content
                // Note: Simply having the shelf visible on home screen should not block the home screen,
                // but clicking "Shorts" shelf or entering a view that is purely the shelf content will trigger block.
                // We'll return false here to prevent blocking the home screen just because the shelf is visible.
            }

            // If the layout is a grid of Shorts videos (e.g. viewId is reel_grid or similar)
            if (viewId.contains("shorts_shelf_recycler") && node.isSelected) {
                isDetected = true
                matchedDetail = "Selected item in Shorts shelf"
                return@traverseTree true
            }

            false
        }

        return if (isDetected) {
            DetectionResult.detected(
                ruleName = name,
                ruleId = id,
                confidence = 1.0f,
                metadata = mapOf("detail" to matchedDetail)
            )
        } else {
            DetectionResult.notDetected(name, id)
        }
    }
}
