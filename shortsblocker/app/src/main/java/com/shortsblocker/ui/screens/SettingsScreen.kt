package com.shortsblocker.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.List
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shortsblocker.ui.MainViewModel
import com.shortsblocker.ui.components.RuleInfo
import com.shortsblocker.ui.components.RuleToggleList
import com.shortsblocker.ui.components.ServiceStatusCard
import com.shortsblocker.ui.components.StatsCard

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    viewModel: MainViewModel,
    onNavigateToLogs: () -> Unit,
    modifier: Modifier = Modifier
) {
    val isRunning by viewModel.isServiceRunning.collectAsState()
    val ruleBottomNav by viewModel.ruleBottomNav.collectAsState()
    val ruleContentDescription by viewModel.ruleContentDescription.collectAsState()
    val ruleTextLabel by viewModel.ruleTextLabel.collectAsState()
    val ruleUrlPattern by viewModel.ruleUrlPattern.collectAsState()
    val ruleViewId by viewModel.ruleViewId.collectAsState()
    val ruleLayoutHeuristic by viewModel.ruleLayoutHeuristic.collectAsState()
    val ruleShelfDetection by viewModel.ruleShelfDetection.collectAsState()

    val backDelayMs by viewModel.backDelayMs.collectAsState()
    val cooldownMs by viewModel.cooldownMs.collectAsState()
    val maxBackAttempts by viewModel.maxBackAttempts.collectAsState()

    val debugOverlayEnabled by viewModel.debugOverlayEnabled.collectAsState()
    val verboseLoggingEnabled by viewModel.verboseLoggingEnabled.collectAsState()

    val todayBlockedCount by viewModel.todayBlockedCount.collectAsState()
    val totalBlockedCount by viewModel.totalBlockedCount.collectAsState()

    val rules = listOf(
        RuleInfo("bottom_nav", "Bottom Nav Tab Detection", "Block the Shorts tab in bottom navigation.", ruleBottomNav),
        RuleInfo("content_description", "Content Description Match", "Detect Shorts through layout tags for screen readers.", ruleContentDescription),
        RuleInfo("text_label", "Text Label Match", "Detect visible 'Shorts' text labels.", ruleTextLabel),
        RuleInfo("url_pattern", "URL Pattern Match", "Detect shared links or urls containing '/shorts/'.", ruleUrlPattern),
        RuleInfo("view_id", "View ID Match", "Inspect YouTube resource IDs matching Shorts player views.", ruleViewId),
        RuleInfo("layout_heuristic", "Layout Heuristics", "Analyze layout buttons and seek bar visibility as backup.", ruleLayoutHeuristic),
        RuleInfo("shorts_shelf", "Shorts Shelf Detection", "Detect inline carousels on YouTube feeds.", ruleShelfDetection)
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Shorts Blocker",
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.titleLarge
                    )
                },
                actions = {
                    IconButton(onClick = onNavigateToLogs) {
                        Icon(
                            imageVector = Icons.Default.List,
                            contentDescription = "View Logs"
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
                )
            )
        }
    ) { innerPadding ->
        Column(
            modifier = modifier
                .padding(innerPadding)
                .padding(horizontal = 16.dp)
                .verticalScroll(rememberScrollState())
        ) {
            Spacer(modifier = Modifier.height(8.dp))

            // 1. Status Card
            ServiceStatusCard(isServiceRunning = isRunning)
            Spacer(modifier = Modifier.height(16.dp))

            // 2. Stats Card
            StatsCard(
                todayBlocked = todayBlockedCount,
                totalBlocked = totalBlockedCount,
                youtubeVersion = "YouTube (Detected)" // Simple indicator
            )
            Spacer(modifier = Modifier.height(16.dp))

            // 3. Rule List
            RuleToggleList(
                rules = rules,
                onToggleRule = { id, enabled ->
                    when (id) {
                        "bottom_nav" -> viewModel.setRuleBottomNav(enabled)
                        "content_description" -> viewModel.setRuleContentDescription(enabled)
                        "text_label" -> viewModel.setRuleTextLabel(enabled)
                        "url_pattern" -> viewModel.setRuleUrlPattern(enabled)
                        "view_id" -> viewModel.setRuleViewId(enabled)
                        "layout_heuristic" -> viewModel.setRuleLayoutHeuristic(enabled)
                        "shorts_shelf" -> viewModel.setRuleShelfDetection(enabled)
                    }
                }
            )
            Spacer(modifier = Modifier.height(16.dp))

            // 4. Timing Config Card
            Card(
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                ),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(20.dp).fillMaxWidth()) {
                    Text(
                        text = "Timing Config",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.padding(bottom = 12.dp)
                    )

                    // Back Delay Adjuster
                    TimingAdjusterRow(
                        label = "Block delay",
                        value = "${backDelayMs}ms",
                        onDecrease = { if (backDelayMs > 100) viewModel.setBackDelayMs(backDelayMs - 50) },
                        onIncrease = { if (backDelayMs < 1000) viewModel.setBackDelayMs(backDelayMs + 50) }
                    )

                    HorizontalDivider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.12f), modifier = Modifier.padding(vertical = 8.dp))

                    // Cooldown Adjuster
                    TimingAdjusterRow(
                        label = "Cooldown duration",
                        value = "${cooldownMs}ms",
                        onDecrease = { if (cooldownMs > 200) viewModel.setCooldownMs(cooldownMs - 50) },
                        onIncrease = { if (cooldownMs < 2000) viewModel.setCooldownMs(cooldownMs + 50) }
                    )

                    HorizontalDivider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.12f), modifier = Modifier.padding(vertical = 8.dp))

                    // Max Attempts Adjuster
                    TimingAdjusterRow(
                        label = "Max Back attempts",
                        value = maxBackAttempts.toString(),
                        onDecrease = { if (maxBackAttempts > 1) viewModel.setMaxBackAttempts(maxBackAttempts - 1) },
                        onIncrease = { if (maxBackAttempts < 5) viewModel.setMaxBackAttempts(maxBackAttempts + 1) }
                    )
                }
            }
            Spacer(modifier = Modifier.height(16.dp))

            // 5. Developer Settings Card
            Card(
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                ),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(20.dp).fillMaxWidth()) {
                    Text(
                        text = "Developer Utilities",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.padding(bottom = 12.dp)
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(text = "Debug overlay", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurface)
                            Text(text = "Show real-time detection status", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Switch(
                            checked = debugOverlayEnabled,
                            onCheckedChange = { viewModel.setDebugOverlayEnabled(it) }
                        )
                    }

                    HorizontalDivider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.12f), modifier = Modifier.padding(vertical = 8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(text = "Verbose logging", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurface)
                            Text(text = "Save details of all accessibility sweeps", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Switch(
                            checked = verboseLoggingEnabled,
                            onCheckedChange = { viewModel.setVerboseLoggingEnabled(it) }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
fun TimingAdjusterRow(
    label: String,
    value: String,
    onDecrease: () -> Unit,
    onIncrease: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurface
        )

        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = value,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(end = 16.dp)
            )

            FilledIconButton(
                onClick = onDecrease,
                colors = IconButtonDefaults.filledIconButtonColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                ),
                modifier = Modifier.size(36.dp)
            ) {
                Text(text = "−", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = MaterialTheme.colorScheme.onSurface)
            }

            Spacer(modifier = Modifier.width(8.dp))

            FilledIconButton(
                onClick = onIncrease,
                colors = IconButtonDefaults.filledIconButtonColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                ),
                modifier = Modifier.size(36.dp)
            ) {
                Text(text = "+", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = MaterialTheme.colorScheme.onSurface)
            }
        }
    }
}
