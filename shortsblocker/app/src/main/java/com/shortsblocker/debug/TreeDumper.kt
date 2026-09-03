package com.shortsblocker.debug

import android.content.Context
import com.shortsblocker.util.NodeWrapper
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

object TreeDumper {
    /**
     * Traverses the Accessibility tree recursively, dumps the structure as structured text,
     * and saves it to a local log file inside the app data directory for offline review.
     *
     * @param context App context to resolve files directory.
     * @param rootNode The root NodeWrapper to start dumping from.
     * @return The formatted tree structure as string.
     */
    fun dumpTree(context: Context, rootNode: NodeWrapper): String {
        val stringBuilder = StringBuilder()
        dumpNode(rootNode, stringBuilder, 0)
        
        val treeText = stringBuilder.toString()
        
        try {
            val dumpDir = File(context.filesDir, "dumps")
            if (!dumpDir.exists()) {
                dumpDir.mkdirs()
            }
            val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
            val file = File(dumpDir, "tree_$timeStamp.txt")
            file.writeText(treeText)
        } catch (e: Exception) {
            // Safe fall-through on file write failures
        }
        
        return treeText
    }

    private fun dumpNode(node: NodeWrapper, sb: StringBuilder, depth: Int) {
        val indent = "  ".repeat(depth)
        val id = node.viewIdResourceName ?: "null_id"
        val text = node.text?.toString() ?: "null_text"
        val desc = node.contentDescription?.toString() ?: "null_desc"
        val className = node.className?.toString() ?: "null_class"
        val isSelected = node.isSelected

        sb.append(indent)
            .append("Class: ").append(className)
            .append(" | ID: ").append(id)
            .append(" | Text: ").append(text)
            .append(" | Desc: ").append(desc)
            .append(" | Selected: ").append(isSelected)
            .append("\n")

        for (i in 0 until node.childCount) {
            val child = node.getChild(i)
            if (child != null) {
                dumpNode(child, sb, depth + 1)
                child.recycle() // Recycle child node wrap immediately after logging
            }
        }
    }
}
