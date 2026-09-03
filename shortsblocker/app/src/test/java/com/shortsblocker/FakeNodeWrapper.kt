package com.shortsblocker

import com.shortsblocker.util.NodeWrapper

class FakeNodeWrapper(
    override val viewIdResourceName: String? = null,
    override val text: CharSequence? = null,
    override val contentDescription: CharSequence? = null,
    override val className: CharSequence? = null,
    override val isSelected: Boolean = false,
    override val isVisibleToUser: Boolean = true,
    val children: List<FakeNodeWrapper> = emptyList()
) : NodeWrapper {

    override val childCount: Int
        get() = children.size

    override fun getChild(index: Int): NodeWrapper? {
        return if (index in children.indices) children[index] else null
    }

    override fun findByViewId(id: String): List<NodeWrapper> {
        val results = mutableListOf<NodeWrapper>()
        if (viewIdResourceName == id) {
            results.add(this)
        }
        children.forEach { child ->
            results.addAll(child.findByViewId(id))
        }
        return results
    }

    override fun findByText(text: String): List<NodeWrapper> {
        val results = mutableListOf<NodeWrapper>()
        val nodeText = this.text?.toString() ?: ""
        if (nodeText.contains(text, ignoreCase = true)) {
            results.add(this)
        }
        children.forEach { child ->
            results.addAll(child.findByText(text))
        }
        return results
    }

    override fun recycle() {
        // No-op inside tests to prevent stack allocation tracking
    }
}
