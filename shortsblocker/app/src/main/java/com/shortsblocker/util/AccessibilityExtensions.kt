package com.shortsblocker.util

import java.util.ArrayDeque

/**
 * Traverses the NodeWrapper tree using iterative Depth-First Search (DFS).
 * It manages memory safely by recycling created child node wrappers immediately
 * after processing, and cleaning up the stack on early exits.
 *
 * @param visitor Lambda that takes a NodeWrapper and returns true if evaluation should stop.
 */
fun NodeWrapper.traverseTree(visitor: (NodeWrapper) -> Boolean) {
    val stack = ArrayDeque<NodeWrapper>()
    
    // Populate initial stack with children of root (in reverse order for standard left-to-right DFS)
    for (i in (this.childCount - 1) downTo 0) {
        val child = this.getChild(i)
        if (child != null) {
            stack.push(child)
        }
    }

    var visitedCount = 0
    val maxVisited = 300 // Bound depth/breadth to prevent battery drain or infinite loops

    while (stack.isNotEmpty() && visitedCount < maxVisited) {
        val current = stack.pop()
        visitedCount++

        val stopTraversal = visitor(current)
        if (stopTraversal) {
            current.recycle()
            // Clean up the rest of the stack before exiting
            while (stack.isNotEmpty()) {
                stack.pop().recycle()
            }
            break
        }

        // Add children to stack
        for (i in (current.childCount - 1) downTo 0) {
            val child = current.getChild(i)
            if (child != null) {
                stack.push(child)
            }
        }
        
        current.recycle() // Done with current node
    }
}
