package com.shortsblocker.detection.rules

import com.shortsblocker.detection.DetectionResult
import com.shortsblocker.util.NodeWrapper
import com.shortsblocker.util.traverseTree

class BottomNavRule : DetectionRule {
    override val name = "Bottom Navigation Detection"
    override val id = "bottom_nav"

    override fun evaluate(rootNode: NodeWrapper): DetectionResult {
        var isShortsSelected = false
        var matchedText = ""

        // Traverse tree looking for bottom navigation containers
        rootNode.traverseTree { node ->
            val id = node.viewIdResourceName ?: ""
            if (id.contains("pivot_bar") || id.contains("bottom_bar_container")) {
                // We found the bottom bar container, let's check its children
                for (i in 0 until node.childCount) {
                    val child = node.getChild(i)
                    if (child != null) {
                        val contentDesc = child.contentDescription?.toString() ?: ""
                        // Check if content description matches "Shorts" or local equivalents and is selected
                        val isShortsTab = contentDesc.equals("Shorts", ignoreCase = true) || 
                                          contentDesc.contains("Shorts")
                        
                        if (isShortsTab && child.isSelected) {
                            isShortsSelected = true
                            matchedText = contentDesc
                            child.recycle()
                            break
                        }
                        child.recycle()
                    }
                }
                if (isShortsSelected) return@traverseTree true // Stop traversal early
            }
            false
        }

        return if (isShortsSelected) {
            DetectionResult.detected(
                ruleName = name,
                ruleId = id,
                confidence = 1.0f,
                metadata = mapOf("matched_tab" to matchedText)
            )
        } else {
            DetectionResult.notDetected(name, id)
        }
    }
}
