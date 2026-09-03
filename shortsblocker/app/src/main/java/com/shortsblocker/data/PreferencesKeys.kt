package com.shortsblocker.data

import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey

object PreferencesKeys {
    val RULE_BOTTOM_NAV = booleanPreferencesKey("rule_bottom_nav")
    val RULE_CONTENT_DESCRIPTION = booleanPreferencesKey("rule_content_description")
    val RULE_TEXT_LABEL = booleanPreferencesKey("rule_text_label")
    val RULE_URL_PATTERN = booleanPreferencesKey("rule_url_pattern")
    val RULE_VIEW_ID = booleanPreferencesKey("rule_view_id")
    val RULE_LAYOUT_HEURISTIC = booleanPreferencesKey("rule_layout_heuristic")
    val RULE_SHELF_DETECTION = booleanPreferencesKey("rule_shelf_detection")

    val BACK_DELAY_MS = longPreferencesKey("back_delay_ms")
    val COOLDOWN_MS = longPreferencesKey("cooldown_ms")
    val MAX_BACK_ATTEMPTS = intPreferencesKey("max_back_attempts")

    val DEBUG_OVERLAY_ENABLED = booleanPreferencesKey("debug_overlay_enabled")
    val VERBOSE_LOGGING_ENABLED = booleanPreferencesKey("verbose_logging_enabled")

    val TOTAL_BLOCKED_COUNT = intPreferencesKey("total_blocked_count")
    val TODAY_BLOCKED_COUNT = intPreferencesKey("today_blocked_count")
    val TODAY_DATE = stringPreferencesKey("today_date") // yyyy-MM-dd to reset daily stats

    val ONBOARDING_COMPLETED = booleanPreferencesKey("onboarding_completed")

    val CUSTOM_VIEW_IDS = stringSetPreferencesKey("custom_view_ids")
}
