package com.shortsblocker.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shortsblocker.data.BlockEvent
import com.shortsblocker.data.BlockEventLog
import com.shortsblocker.data.SettingsRepository
import com.shortsblocker.service.ServiceStateManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class MainViewModel @Inject constructor(
    private val settingsRepository: SettingsRepository,
    private val serviceStateManager: ServiceStateManager,
    private val eventLog: BlockEventLog
) : ViewModel() {

    // Service State
    val isServiceRunning: StateFlow<Boolean> = serviceStateManager.isServiceRunning
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)

    // Onboarding State
    val onboardingCompleted: StateFlow<Boolean> = settingsRepository.onboardingCompleted
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), settingsRepository.cachedOnboardingCompleted)

    // Rule Status Flows
    val ruleBottomNav: StateFlow<Boolean> = settingsRepository.ruleBottomNav
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), settingsRepository.cachedRuleBottomNav)

    val ruleContentDescription: StateFlow<Boolean> = settingsRepository.ruleContentDescription
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), settingsRepository.cachedRuleContentDescription)

    val ruleTextLabel: StateFlow<Boolean> = settingsRepository.ruleTextLabel
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), settingsRepository.cachedRuleTextLabel)

    val ruleUrlPattern: StateFlow<Boolean> = settingsRepository.ruleUrlPattern
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), settingsRepository.cachedRuleUrlPattern)

    val ruleViewId: StateFlow<Boolean> = settingsRepository.ruleViewId
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), settingsRepository.cachedRuleViewId)

    val ruleLayoutHeuristic: StateFlow<Boolean> = settingsRepository.ruleLayoutHeuristic
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), settingsRepository.cachedRuleLayoutHeuristic)

    val ruleShelfDetection: StateFlow<Boolean> = settingsRepository.ruleShelfDetection
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), settingsRepository.cachedRuleShelfDetection)

    // Timing Settings Flows
    val backDelayMs: StateFlow<Long> = settingsRepository.backDelayMs
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), settingsRepository.cachedBackDelayMs)

    val cooldownMs: StateFlow<Long> = settingsRepository.cooldownMs
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), settingsRepository.cachedCooldownMs)

    val maxBackAttempts: StateFlow<Int> = settingsRepository.maxBackAttempts
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), settingsRepository.cachedMaxBackAttempts)

    // Developer Settings Flows
    val debugOverlayEnabled: StateFlow<Boolean> = settingsRepository.debugOverlayEnabled
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), settingsRepository.cachedDebugOverlayEnabled)

    val verboseLoggingEnabled: StateFlow<Boolean> = settingsRepository.verboseLoggingEnabled
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), settingsRepository.cachedVerboseLoggingEnabled)

    // Stats Flows
    val totalBlockedCount: StateFlow<Int> = settingsRepository.totalBlockedCount
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), settingsRepository.cachedTotalBlockedCount)

    val todayBlockedCount: StateFlow<Int> = settingsRepository.todayBlockedCount
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), settingsRepository.cachedTodayBlockedCount)

    // Event Log Flow
    val events: StateFlow<List<BlockEvent>> = eventLog.events
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // View ID configuration
    val customViewIds: StateFlow<Set<String>> = settingsRepository.customViewIds
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), settingsRepository.cachedCustomViewIds)

    // Setters / Actions
    fun setOnboardingCompleted(completed: Boolean) = viewModelScope.launch {
        settingsRepository.setOnboardingCompleted(completed)
    }

    fun setRuleBottomNav(enabled: Boolean) = viewModelScope.launch { settingsRepository.setRuleBottomNav(enabled) }
    fun setRuleContentDescription(enabled: Boolean) = viewModelScope.launch { settingsRepository.setRuleContentDescription(enabled) }
    fun setRuleTextLabel(enabled: Boolean) = viewModelScope.launch { settingsRepository.setRuleTextLabel(enabled) }
    fun setRuleUrlPattern(enabled: Boolean) = viewModelScope.launch { settingsRepository.setRuleUrlPattern(enabled) }
    fun setRuleViewId(enabled: Boolean) = viewModelScope.launch { settingsRepository.setRuleViewId(enabled) }
    fun setRuleLayoutHeuristic(enabled: Boolean) = viewModelScope.launch { settingsRepository.setRuleLayoutHeuristic(enabled) }
    fun setRuleShelfDetection(enabled: Boolean) = viewModelScope.launch { settingsRepository.setRuleShelfDetection(enabled) }

    fun setBackDelayMs(delay: Long) = viewModelScope.launch { settingsRepository.setBackDelayMs(delay) }
    fun setCooldownMs(cooldown: Long) = viewModelScope.launch { settingsRepository.setCooldownMs(cooldown) }
    fun setMaxBackAttempts(attempts: Int) = viewModelScope.launch { settingsRepository.setMaxBackAttempts(attempts) }

    fun setDebugOverlayEnabled(enabled: Boolean) = viewModelScope.launch { settingsRepository.setDebugOverlayEnabled(enabled) }
    fun setVerboseLoggingEnabled(enabled: Boolean) = viewModelScope.launch { settingsRepository.setVerboseLoggingEnabled(enabled) }

    fun setCustomViewIds(ids: Set<String>) = viewModelScope.launch { settingsRepository.setCustomViewIds(ids) }

    fun clearLogs() {
        eventLog.clear()
    }
}
