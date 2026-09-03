package com.shortsblocker.util

object Constants {
    const val YOUTUBE_PACKAGE = "com.google.android.youtube"

    val DEFAULT_SHORTS_VIEW_IDS = setOf(
        "com.google.android.youtube:id/reel_watch_fragment_root",
        "com.google.android.youtube:id/reel_recycler",
        "com.google.android.youtube:id/reel_player_page_container",
        "com.google.android.youtube:id/reel_watch_player_fragment",
        "com.google.android.youtube:id/shorts_shelf_header",
        "com.google.android.youtube:id/pivot_bar",
        "com.google.android.youtube:id/bottom_bar_container"
    )

    val SHORTS_LABELS = setOf(
        "Shorts",
        "shorts",
        "ショート",
        "숏츠",
        "Shorts shelf"
    )
}
