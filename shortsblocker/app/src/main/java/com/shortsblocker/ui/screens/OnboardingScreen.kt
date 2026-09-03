package com.shortsblocker.ui.screens

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shortsblocker.ui.MainViewModel

@Composable
fun OnboardingScreen(
    viewModel: MainViewModel,
    onOnboardingComplete: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val isRunning by viewModel.isServiceRunning.collectAsState()

    var currentStep by remember { mutableStateOf(1) }
    val showRestrictedStep = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU

    // Total steps depending on Android version (sideload restricted settings check is Android 13+)
    val totalSteps = if (showRestrictedStep) 5 else 4

    val stepHeader = when (currentStep) {
        1 -> "Welcome"
        2 -> if (showRestrictedStep) "Restricted Settings" else "Accessibility Service"
        3 -> if (showRestrictedStep) "Accessibility Service" else "Battery Optimization"
        4 -> if (showRestrictedStep) "Battery Optimization" else "All Set!"
        else -> "All Set!"
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(24.dp)
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxWidth().align(Alignment.Center)
        ) {
            // Step indicator dots
            Row(
                horizontalArrangement = Arrangement.Center,
                modifier = Modifier.padding(bottom = 32.dp)
            ) {
                for (i in 1..totalSteps) {
                    Box(
                        modifier = Modifier
                            .padding(4.dp)
                            .size(if (i == currentStep) 10.dp else 6.dp)
                            .clip(RoundedCornerShape(50))
                            .background(
                                if (i == currentStep) MaterialTheme.colorScheme.primary 
                                else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f)
                            )
                    )
                }
            }

            Text(
                text = stepHeader,
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            // Step Content Card
            Card(
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                ),
                modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp).fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    when (currentStep) {
                        1 -> WelcomeStep()
                        2 -> if (showRestrictedStep) RestrictedSettingsStep() else AccessibilityStep(isRunning)
                        3 -> if (showRestrictedStep) AccessibilityStep(isRunning) else BatteryStep()
                        4 -> if (showRestrictedStep) BatteryStep() else DoneStep()
                        else -> DoneStep()
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Navigation Buttons
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                if (currentStep > 1) {
                    TextButton(onClick = { currentStep-- }) {
                        Text("Back", fontSize = 16.sp)
                    }
                } else {
                    Spacer(modifier = Modifier.width(1.dp))
                }

                Button(
                    onClick = {
                        if (currentStep == totalSteps) {
                            viewModel.setOnboardingCompleted(true)
                            onOnboardingComplete()
                        } else {
                            currentStep++
                        }
                    },
                    enabled = when (currentStep) {
                        // On accessibility setup step, force user to enable the service first
                        if (showRestrictedStep) 3 else 2 -> isRunning
                        else -> true
                    },
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.padding(start = 16.dp)
                ) {
                    Text(
                        text = if (currentStep == totalSteps) "Get Started" else "Next",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

@Composable
fun WelcomeStep() {
    Text(
        text = "Shorts Blocker helps you reclaim your time by automatically blocking YouTube Shorts.\n\n" +
               "It is completely offline, uses less than 0.5% battery, and requires a few permissions to function.",
        style = MaterialTheme.typography.bodyLarge,
        textAlign = TextAlign.Center,
        color = MaterialTheme.colorScheme.onSurfaceVariant
    )
}

@Composable
fun RestrictedSettingsStep() {
    val context = LocalContext.current
    Text(
        text = "Since this app is sideloaded (installed via APK), Android blocks Accessibility Services by default.\n\n" +
               "Please enable restricted settings first:\n" +
               "1. Click the button below to open App Info\n" +
               "2. Tap the three-dot menu ⋮ at the top right\n" +
               "3. Tap 'Allow restricted settings'\n" +
               "4. Authenticate (PIN/Fingerprint)",
        style = MaterialTheme.typography.bodyLarge,
        textAlign = TextAlign.Center,
        color = MaterialTheme.colorScheme.onSurfaceVariant
    )
    Spacer(modifier = Modifier.height(16.dp))
    Button(
        onClick = {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:${context.packageName}")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
        },
        shape = RoundedCornerShape(12.dp)
    ) {
        Text("Open App Info")
    }
}

@Composable
fun AccessibilityStep(isRunning: Boolean) {
    val context = LocalContext.current
    Text(
        text = "Next, enable the Accessibility Service. This allows the blocker to detect YouTube layout screens and perform the back key press.\n\n" +
               "1. Tap 'Enable Service' below\n" +
               "2. Find 'Shorts Blocker' in the list\n" +
               "3. Toggle the permission switch to ON",
        style = MaterialTheme.typography.bodyLarge,
        textAlign = TextAlign.Center,
        color = MaterialTheme.colorScheme.onSurfaceVariant
    )
    Spacer(modifier = Modifier.height(16.dp))
    Button(
        onClick = {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
        },
        shape = RoundedCornerShape(12.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = if (isRunning) Color(0xFF4CAF50) else MaterialTheme.colorScheme.primary
        )
    ) {
        Text(if (isRunning) "Service Connected!" else "Enable Service")
    }
}

@Composable
fun BatteryStep() {
    val context = LocalContext.current
    Text(
        text = "To prevent Android from killing the background service, whitelist it from battery optimization:\n\n" +
               "1. Tap the button below\n" +
               "2. Select 'All apps'\n" +
               "3. Find 'Shorts Blocker'\n" +
               "4. Set battery usage to 'Unrestricted'",
        style = MaterialTheme.typography.bodyLarge,
        textAlign = TextAlign.Center,
        color = MaterialTheme.colorScheme.onSurfaceVariant
    )
    Spacer(modifier = Modifier.height(16.dp))
    Button(
        onClick = {
            val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
        },
        shape = RoundedCornerShape(12.dp)
    ) {
        Text("Disable Battery Optimization")
    }
}

@Composable
fun DoneStep() {
    Text(
        text = "You are all set! Shorts Blocker is now active and ready to redirect you.\n\n" +
               "Test it by launching the YouTube app and trying to open the Shorts tab.",
        style = MaterialTheme.typography.bodyLarge,
        textAlign = TextAlign.Center,
        fontWeight = FontWeight.Medium,
        color = MaterialTheme.colorScheme.onSurfaceVariant
    )
}
