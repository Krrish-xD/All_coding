package com.shortsblocker.detection.rules

import com.shortsblocker.detection.DetectionResult
import com.shortsblocker.util.NodeWrapper

interface DetectionRule {
    val name: String
    val id: String
    fun evaluate(rootNode: NodeWrapper): DetectionResult
}
