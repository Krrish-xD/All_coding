package com.shortsblocker.detection

data class DetectionResult(
    val isDetected: Boolean,
    val ruleName: String,
    val ruleId: String,
    val confidence: Float = 1.0f,
    val metadata: Map<String, String> = emptyMap()
) {
    companion object {
        fun notDetected(ruleName: String, ruleId: String): DetectionResult {
            return DetectionResult(
                isDetected = false,
                ruleName = ruleName,
                ruleId = ruleId,
                confidence = 0.0f
            )
        }

        fun detected(ruleName: String, ruleId: String, confidence: Float = 1.0f, metadata: Map<String, String> = emptyMap()): DetectionResult {
            return DetectionResult(
                isDetected = true,
                ruleName = ruleName,
                ruleId = ruleId,
                confidence = confidence,
                metadata = metadata
            )
        }
    }
}
