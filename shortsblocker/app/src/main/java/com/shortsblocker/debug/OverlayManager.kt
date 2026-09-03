package com.shortsblocker.debug

import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.view.Gravity
import android.view.WindowManager
import android.widget.TextView

class OverlayManager(private val context: Context) {
    private val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    private var overlayTextView: TextView? = null

    /**
     * Instantiates and mounts a floating overlay window displaying live telemetry.
     */
    fun showDebugOverlay() {
        if (overlayTextView != null) return

        val textView = TextView(context).apply {
            setTextColor(Color.WHITE)
            textSize = 11f
            setPadding(32, 24, 32, 24)
            
            // Premium glassmorphic background design
            val backgroundDrawable = GradientDrawable().apply {
                setColor(Color.parseColor("#CC111111")) // Dark slate glass color
                cornerRadius = 32f
                setStroke(2, Color.parseColor("#33FFFFFF")) // Subtly lit border outline
            }
            background = backgroundDrawable
        }

        val overlayType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            overlayType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 40
            y = 200
        }

        try {
            windowManager.addView(textView, params)
            overlayTextView = textView
            updateText("📦 package: idle\n🎬 rule: none\n⚡ action: listening")
        } catch (e: Exception) {
            // Fails gracefully if overlay permission not granted
        }
    }

    /**
     * Updates the text of the active overlay label.
     */
    fun updateText(text: String) {
        overlayTextView?.text = text
    }

    /**
     * Safely unmounts and releases overlay views.
     */
    fun hideDebugOverlay() {
        overlayTextView?.let {
            try {
                windowManager.removeView(it)
            } catch (e: Exception) {
                // Ignore window manager states
            }
            overlayTextView = null
        }
    }
}
