package com.shortsblocker.response

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.os.Build

object GestureBackFallback {
    /**
     * Simulates a swipe from the left edge of the screen to trigger the system back navigation.
     * Used as a fallback on devices where performGlobalAction(GLOBAL_ACTION_BACK) fails.
     *
     * @param service The active AccessibilityService instance.
     * @return True if the gesture was successfully dispatched.
     */
    fun dispatchSwipeBack(service: AccessibilityService): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return false

        try {
            val displayMetrics = service.resources.displayMetrics
            val screenHeight = displayMetrics.heightPixels.toFloat()
            val screenWidth = displayMetrics.widthPixels.toFloat()

            // Define path: swipe from very left edge (x=5) to 30% width, in vertical middle of screen
            val startX = 5f
            val startY = screenHeight / 2f
            val endX = screenWidth * 0.30f
            val endY = startY

            val swipePath = Path().apply {
                moveTo(startX, startY)
                lineTo(endX, endY)
            }

            val stroke = GestureDescription.StrokeDescription(swipePath, 0, 150)
            val gesture = GestureDescription.Builder().addStroke(stroke).build()

            return service.dispatchGesture(gesture, null, null)
        } catch (e: Exception) {
            return false
        }
    }
}
