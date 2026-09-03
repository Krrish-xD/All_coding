package com.shortsblocker.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SettingsRepository @Inject constructor(
    private val dataStore: DataStore<Preferences>
) {
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    // Memory cache for synchronous, hot-path reads in AccessibilityService
    @Volatile var cachedRuleBottomNav = true
        private set
    @Volatile var cachedRuleContentDescription = true
        private set
    @Volatile var cachedRuleTextLabel = true
        private set
    @Volatile var cachedRuleUrlPattern = true
        private set
    @Volatile var cachedRuleViewId = true
        private set
    @Volatile var cachedRuleLayoutHeuristic = true
        private set
    @Volatile var cachedRuleShelfDetection = true
        private set

    @Volatile var cachedBackDelayMs = 300L
        private set
    @Volatile var cachedCooldownMs = 500L
        private set
    @Volatile var cachedMaxBackAttempts = 3
        private set

    @Volatile var cachedDebugOverlayEnabled = false
        private set
    @Volatile var cachedVerboseLoggingEnabled = false
        private set

    @Volatile var cachedTotalBlockedCount = 0
        private set
    @Volatile var cachedTodayBlockedCount = 0
        private set
    @Volatile var cachedTodayDate = ""
        private set

    @Volatile var cachedCustomViewIds: Set<String> = emptySet()
        private set

    @Volatile var cachedOnboardingCompleted = false
        private set

    init {
        scope.launch {
            dataStore.data.collect { prefs ->
                cachedRuleBottomNav = prefs[PreferencesKeys.RULE_BOTTOM_NAV] ?: true
                cachedRuleContentDescription = prefs[PreferencesKeys.RULE_CONTENT_DESCRIPTION] ?: true
                cachedRuleTextLabel = prefs[PreferencesKeys.RULE_TEXT_LABEL] ?: true
                cachedRuleUrlPattern = prefs[PreferencesKeys.RULE_URL_PATTERN] ?: true
                cachedRuleViewId = prefs[PreferencesKeys.RULE_VIEW_ID] ?: true
                cachedRuleLayoutHeuristic = prefs[PreferencesKeys.RULE_LAYOUT_HEURISTIC] ?: true
                cachedRuleShelfDetection = prefs[PreferencesKeys.RULE_SHELF_DETECTION] ?: true

                cachedBackDelayMs = prefs[PreferencesKeys.BACK_DELAY_MS] ?: 300L
                cachedCooldownMs = prefs[PreferencesKeys.COOLDOWN_MS] ?: 500L
                cachedMaxBackAttempts = prefs[PreferencesKeys.MAX_BACK_ATTEMPTS] ?: 3

                cachedDebugOverlayEnabled = prefs[PreferencesKeys.DEBUG_OVERLAY_ENABLED] ?: false
                cachedVerboseLoggingEnabled = prefs[PreferencesKeys.VERBOSE_LOGGING_ENABLED] ?: false

                cachedTotalBlockedCount = prefs[PreferencesKeys.TOTAL_BLOCKED_COUNT] ?: 0
                cachedTodayBlockedCount = prefs[PreferencesKeys.TODAY_BLOCKED_COUNT] ?: 0
                cachedTodayDate = prefs[PreferencesKeys.TODAY_DATE] ?: ""

                cachedCustomViewIds = prefs[PreferencesKeys.CUSTOM_VIEW_IDS] ?: emptySet()
                cachedOnboardingCompleted = prefs[PreferencesKeys.ONBOARDING_COMPLETED] ?: false
            }
        }
    }

    // Flows for UI observation
    val ruleBottomNav: Flow<Boolean> = dataStore.data.map { it[PreferencesKeys.RULE_BOTTOM_NAV] ?: true }
    val ruleContentDescription: Flow<Boolean> = dataStore.data.map { it[PreferencesKeys.RULE_CONTENT_DESCRIPTION] ?: true }
    val ruleTextLabel: Flow<Boolean> = dataStore.data.map { it[PreferencesKeys.RULE_TEXT_LABEL] ?: true }
    val ruleUrlPattern: Flow<Boolean> = dataStore.data.map { it[PreferencesKeys.RULE_URL_PATTERN] ?: true }
    val ruleViewId: Flow<Boolean> = dataStore.data.map { it[PreferencesKeys.RULE_VIEW_ID] ?: true }
    val ruleLayoutHeuristic: Flow<Boolean> = dataStore.data.map { it[PreferencesKeys.RULE_LAYOUT_HEURISTIC] ?: true }
    val ruleShelfDetection: Flow<Boolean> = dataStore.data.map { it[PreferencesKeys.RULE_SHELF_DETECTION] ?: true }

    val backDelayMs: Flow<Long> = dataStore.data.map { it[PreferencesKeys.BACK_DELAY_MS] ?: 300L }
    val cooldownMs: Flow<Long> = dataStore.data.map { it[PreferencesKeys.COOLDOWN_MS] ?: 500L }
    val maxBackAttempts: Flow<Int> = dataStore.data.map { it[PreferencesKeys.MAX_BACK_ATTEMPTS] ?: 3 }

    val debugOverlayEnabled: Flow<Boolean> = dataStore.data.map { it[PreferencesKeys.DEBUG_OVERLAY_ENABLED] ?: false }
    val verboseLoggingEnabled: Flow<Boolean> = dataStore.data.map { it[PreferencesKeys.VERBOSE_LOGGING_ENABLED] ?: false }

    val totalBlockedCount: Flow<Int> = dataStore.data.map { it[PreferencesKeys.TOTAL_BLOCKED_COUNT] ?: 0 }
    val todayBlockedCount: Flow<Int> = dataStore.data.map { it[PreferencesKeys.TODAY_BLOCKED_COUNT] ?: 0 }

    val customViewIds: Flow<Set<String>> = dataStore.data.map { it[PreferencesKeys.CUSTOM_VIEW_IDS] ?: emptySet() }
    val onboardingCompleted: Flow<Boolean> = dataStore.data.map { it[PreferencesKeys.ONBOARDING_COMPLETED] ?: false }

    // Update helpers
    suspend fun setRuleBottomNav(enabled: Boolean) = dataStore.edit { it[PreferencesKeys.RULE_BOTTOM_NAV] = enabled }
    suspend fun setRuleContentDescription(enabled: Boolean) = dataStore.edit { it[PreferencesKeys.RULE_CONTENT_DESCRIPTION] = enabled }
    suspend fun setRuleTextLabel(enabled: Boolean) = dataStore.edit { it[PreferencesKeys.RULE_TEXT_LABEL] = enabled }
    suspend fun setRuleUrlPattern(enabled: Boolean) = dataStore.edit { it[PreferencesKeys.RULE_URL_PATTERN] = enabled }
    suspend fun setRuleViewId(enabled: Boolean) = dataStore.edit { it[PreferencesKeys.RULE_VIEW_ID] = enabled }
    suspend fun setRuleLayoutHeuristic(enabled: Boolean) = dataStore.edit { it[PreferencesKeys.RULE_LAYOUT_HEURISTIC] = enabled }
    suspend fun setRuleShelfDetection(enabled: Boolean) = dataStore.edit { it[PreferencesKeys.RULE_SHELF_DETECTION] = enabled }

    suspend fun setBackDelayMs(delay: Long) = dataStore.edit { it[PreferencesKeys.BACK_DELAY_MS] = delay }
    suspend fun setCooldownMs(cooldown: Long) = dataStore.edit { it[PreferencesKeys.COOLDOWN_MS] = cooldown }
    suspend fun setMaxBackAttempts(attempts: Int) = dataStore.edit { it[PreferencesKeys.MAX_BACK_ATTEMPTS] = attempts }

    suspend fun setDebugOverlayEnabled(enabled: Boolean) = dataStore.edit { it[PreferencesKeys.DEBUG_OVERLAY_ENABLED] = enabled }
    suspend fun setVerboseLoggingEnabled(enabled: Boolean) = dataStore.edit { it[PreferencesKeys.VERBOSE_LOGGING_ENABLED] = enabled }

    suspend fun setCustomViewIds(ids: Set<String>) = dataStore.edit { it[PreferencesKeys.CUSTOM_VIEW_IDS] = ids }
    suspend fun setOnboardingCompleted(completed: Boolean) = dataStore.edit { it[PreferencesKeys.ONBOARDING_COMPLETED] = completed }

    suspend fun incrementBlockedCount() {
        val todayStr = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)
        dataStore.edit { prefs ->
            val total = prefs[PreferencesKeys.TOTAL_BLOCKED_COUNT] ?: 0
            prefs[PreferencesKeys.TOTAL_BLOCKED_COUNT] = total + 1

            val lastDate = prefs[PreferencesKeys.TODAY_DATE] ?: ""
            if (lastDate == todayStr) {
                val todayCount = prefs[PreferencesKeys.TODAY_BLOCKED_COUNT] ?: 0
                prefs[PreferencesKeys.TODAY_BLOCKED_COUNT] = todayCount + 1
            } else {
                prefs[PreferencesKeys.TODAY_DATE] = todayStr
                prefs[PreferencesKeys.TODAY_BLOCKED_COUNT] = 1
            }
        }
    }
}
