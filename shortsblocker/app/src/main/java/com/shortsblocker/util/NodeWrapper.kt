package com.shortsblocker.util

import android.view.accessibility.AccessibilityNodeInfo

interface NodeWrapper {
    val viewIdResourceName: String?
    val text: CharSequence?
    val contentDescription: CharSequence?
    val className: CharSequence?
    val isSelected: Boolean
    val childCount: Int
    val isVisibleToUser: Boolean
    fun getChild(index: Int): NodeWrapper?
    fun findByViewId(id: String): List<NodeWrapper>
    fun findByText(text: String): List<NodeWrapper>
    fun recycle()
}

class AndroidNodeWrapper(private val node: AccessibilityNodeInfo) : NodeWrapper {
    override val viewIdResourceName: String?
        get() = try { node.viewIdResourceName } catch (e: Exception) { null }

    override val text: CharSequence?
        get() = try { node.text } catch (e: Exception) { null }

    override val contentDescription: CharSequence?
        get() = try { node.contentDescription } catch (e: Exception) { null }

    override val className: CharSequence?
        get() = try { node.className } catch (e: Exception) { null }

    override val isSelected: Boolean
        get() = try { node.isSelected } catch (e: Exception) { false }

    override val childCount: Int
        get() = try { node.childCount } catch (e: Exception) { 0 }

    override val isVisibleToUser: Boolean
        get() = try { node.isVisibleToUser } catch (e: Exception) { false }

    override fun getChild(index: Int): NodeWrapper? {
        return try {
            val child = node.getChild(index)
            if (child != null) AndroidNodeWrapper(child) else null
        } catch (e: Exception) {
            null
        }
    }

    override fun findByViewId(id: String): List<NodeWrapper> {
        return try {
            node.findAccessibilityNodeInfosByViewId(id).map { AndroidNodeWrapper(it) }
        } catch (e: Exception) {
            emptyList()
        }
    }

    override fun findByText(text: String): List<NodeWrapper> {
        return try {
            node.findAccessibilityNodeInfosByText(text).map { AndroidNodeWrapper(it) }
        } catch (e: Exception) {
            emptyList()
        }
    }

    override fun recycle() {
        try {
            node.recycle()
        } catch (e: Exception) {
            // Safe recycle ignore
        }
    }
}
