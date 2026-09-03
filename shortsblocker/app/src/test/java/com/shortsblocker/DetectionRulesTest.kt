package com.shortsblocker

import com.shortsblocker.detection.rules.*
import org.junit.Assert.*
import org.junit.Test

class DetectionRulesTest {

    @Test
    fun testBottomNavRule_detected() {
        val rule = BottomNavRule()
        
        // Pivot bar child with Shorts selected
        val shortsTab = FakeNodeWrapper(
            contentDescription = "Shorts",
            isSelected = true
        )
        val pivotBar = FakeNodeWrapper(
            viewIdResourceName = "com.google.android.youtube:id/pivot_bar",
            children = listOf(shortsTab)
        )
        val root = FakeNodeWrapper(children = listOf(pivotBar))

        val result = rule.evaluate(root)
        assertTrue(result.isDetected)
        assertEquals("Shorts", result.metadata["matched_tab"])
    }

    @Test
    fun testBottomNavRule_notDetected_whenNotSelected() {
        val rule = BottomNavRule()
        
        // Pivot bar child with Shorts NOT selected
        val shortsTab = FakeNodeWrapper(
            contentDescription = "Shorts",
            isSelected = false
        )
        val pivotBar = FakeNodeWrapper(
            viewIdResourceName = "com.google.android.youtube:id/pivot_bar",
            children = listOf(shortsTab)
        )
        val root = FakeNodeWrapper(children = listOf(pivotBar))

        val result = rule.evaluate(root)
        assertFalse(result.isDetected)
    }

    @Test
    fun testContentDescriptionRule_detected() {
        val rule = ContentDescriptionRule()
        
        // Any node with description "Shorts" that is not pivot bar
        val playerContainer = FakeNodeWrapper(
            viewIdResourceName = "com.google.android.youtube:id/player_layout",
            contentDescription = "Shorts"
        )
        val root = FakeNodeWrapper(children = listOf(playerContainer))

        val result = rule.evaluate(root)
        assertTrue(result.isDetected)
        assertEquals("Shorts", result.metadata["matched_desc"])
    }

    @Test
    fun testTextLabelRule_detected() {
        val rule = TextLabelRule()
        
        val labelNode = FakeNodeWrapper(
            viewIdResourceName = "com.google.android.youtube:id/title",
            text = "Shorts"
        )
        val root = FakeNodeWrapper(children = listOf(labelNode))

        val result = rule.evaluate(root)
        assertTrue(result.isDetected)
        assertEquals("Shorts", result.metadata["matched_text"])
    }

    @Test
    fun testTextLabelRule_ignored_onVideoTitle() {
        val rule = TextLabelRule()
        
        // Word "Shorts" inside a video title should be ignored to avoid false positives
        val titleNode = FakeNodeWrapper(
            viewIdResourceName = "com.google.android.youtube:id/video_title",
            text = "Watching YouTube Shorts is fun"
        )
        val root = FakeNodeWrapper(children = listOf(titleNode))

        val result = rule.evaluate(root)
        assertFalse(result.isDetected)
    }

    @Test
    fun testUrlPatternRule_detected() {
        val rule = UrlPatternRule()
        
        val urlNode = FakeNodeWrapper(
            text = "https://youtube.com/shorts/abcd123?feature=share"
        )
        val root = FakeNodeWrapper(children = listOf(urlNode))

        val result = rule.evaluate(root)
        assertTrue(result.isDetected)
        assertEquals("https://youtube.com/shorts/abcd123?feature=share", result.metadata["matched_url"])
    }

    @Test
    fun testViewIdRule_detected() {
        val rule = ViewIdRule()
        
        // Nodes matching standard View IDs
        val watchFragment = FakeNodeWrapper(
            viewIdResourceName = "com.google.android.youtube:id/reel_watch_player_fragment"
        )
        val root = FakeNodeWrapper(children = listOf(watchFragment))

        val result = rule.evaluate(root)
        assertTrue(result.isDetected)
        assertEquals("com.google.android.youtube:id/reel_watch_player_fragment", result.metadata["matched_id"])
    }

    @Test
    fun testLayoutHeuristicRule_detected() {
        val rule = LayoutHeuristicRule()
        
        // Multiple action buttons: Like (1), Dislike (1), Comment (1), Subscribe (2) = Score 5 >= 4 threshold
        val likeButton = FakeNodeWrapper(
            className = "android.widget.ImageView",
            contentDescription = "like this video"
        )
        val dislikeButton = FakeNodeWrapper(
            className = "android.widget.ImageView",
            contentDescription = "dislike this video"
        )
        val commentButton = FakeNodeWrapper(
            className = "android.widget.Button",
            contentDescription = "comment on this"
        )
        val subscribeButton = FakeNodeWrapper(
            className = "android.widget.Button",
            contentDescription = "Subscribe"
        )
        
        val container = FakeNodeWrapper(
            children = listOf(likeButton, dislikeButton, commentButton, subscribeButton)
        )
        val root = FakeNodeWrapper(children = listOf(container))

        val result = rule.evaluate(root)
        assertTrue(result.isDetected)
    }

    @Test
    fun testLayoutHeuristicRule_notDetected_whenSeekBarExists() {
        val rule = LayoutHeuristicRule()
        
        // Buttons exist but we also have a SeekBar which reduces score by 2
        val likeButton = FakeNodeWrapper(
            className = "android.widget.ImageView",
            contentDescription = "like this video"
        )
        val commentButton = FakeNodeWrapper(
            className = "android.widget.Button",
            contentDescription = "comment on this"
        )
        val subscribeButton = FakeNodeWrapper(
            className = "android.widget.Button",
            contentDescription = "Subscribe"
        )
        val seekBar = FakeNodeWrapper(
            className = "android.widget.SeekBar"
        )
        
        val container = FakeNodeWrapper(
            children = listOf(likeButton, commentButton, subscribeButton, seekBar)
        )
        val root = FakeNodeWrapper(children = listOf(container))

        val result = rule.evaluate(root)
        assertFalse(result.isDetected) // Should fail because final score is below threshold due to seekbar penalty
    }

    @Test
    fun testShelfDetectionRule_detected() {
        val rule = ShelfDetectionRule()
        
        val shelfItem = FakeNodeWrapper(
            viewIdResourceName = "com.google.android.youtube:id/shorts_shelf_recycler",
            isSelected = true
        )
        val root = FakeNodeWrapper(children = listOf(shelfItem))

        val result = rule.evaluate(root)
        assertTrue(result.isDetected)
    }
}
