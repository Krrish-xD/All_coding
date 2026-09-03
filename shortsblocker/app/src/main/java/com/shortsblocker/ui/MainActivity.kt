package com.shortsblocker.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.shortsblocker.ui.screens.LogScreen
import com.shortsblocker.ui.screens.OnboardingScreen
import com.shortsblocker.ui.screens.SettingsScreen
import com.shortsblocker.ui.theme.ShortsBlockerTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            ShortsBlockerTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    val onboardingCompleted by viewModel.onboardingCompleted.collectAsState()

                    var currentScreen by remember { mutableStateOf(Screen.ONBOARDING) }

                    // Sync screen navigation state when onboarding state changes
                    LaunchedEffect(onboardingCompleted) {
                        currentScreen = if (onboardingCompleted) {
                            Screen.SETTINGS
                        } else {
                            Screen.ONBOARDING
                        }
                    }

                    when (currentScreen) {
                        Screen.ONBOARDING -> {
                            OnboardingScreen(
                                viewModel = viewModel,
                                onOnboardingComplete = {
                                    currentScreen = Screen.SETTINGS
                                }
                            )
                        }
                        Screen.SETTINGS -> {
                            SettingsScreen(
                                viewModel = viewModel,
                                onNavigateToLogs = {
                                    currentScreen = Screen.LOGS
                                }
                            )
                        }
                        Screen.LOGS -> {
                            BackHandler {
                                currentScreen = Screen.SETTINGS
                            }
                            LogScreen(
                                viewModel = viewModel,
                                onNavigateBack = {
                                    currentScreen = Screen.SETTINGS
                                }
                            )
                        }
                    }
                }
            }
        }
    }

    enum class Screen {
        ONBOARDING,
        SETTINGS,
        LOGS
    }
}
