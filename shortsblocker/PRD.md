# Product Requirements Document (PRD)

## Shorts Blocker — Personal Android App

**Version:** 1.0
**Last Updated:** 2026-07-13
**Author:** kxd
**Status:** Draft

---

## 1. Purpose

Build an Android application that makes it effectively impossible to consume YouTube Shorts by automatically detecting and exiting any Shorts screen using Android's Accessibility Service.

This is a personal project. It is not intended for public distribution or monetization.

---

## 2. Goals

### 2.1 Primary Goal

Prevent viewing YouTube Shorts while leaving all normal YouTube functionality untouched.

**Allowed functionality** (must remain unaffected):

- Watch regular videos
- Search
- View subscriptions and playlists
- Watch history
- Upload videos
- Use comments, likes, shares on regular videos
- Picture-in-Picture for regular videos
- Cast / Chromecast

**Blocked functionality:**

- Watch any Short
- Browse the Shorts feed / Shorts tab
- Accidentally enter Shorts (via deep links, Home feed cards, or notifications)
- Scroll through Shorts in any context

### 2.2 Secondary Goals

- Zero perceptible impact on battery life
- Survive device reboots, app updates, and aggressive OEM battery management
- Require no manual intervention after initial setup
- Provide clear visual feedback that the service is running

---

## 3. Non-Goals

This application will **not**:

- Block all of YouTube
- Filter internet traffic or act as a VPN/proxy
- Modify the YouTube APK (no Xposed/LSPosed)
- Require root access
- Use device admin privileges
- Collect any data or make network requests (zero internet permission)
- Be distributed on Google Play or any app store

---

## 4. Platform & Technical Stack

| Attribute              | Value                                         |
|------------------------|-----------------------------------------------|
| Platform               | Android                                       |
| Minimum SDK            | API 29 (Android 10)                           |
| Target SDK             | Latest stable (API 35 / Android 15)           |
| Language               | Kotlin                                        |
| UI Framework           | Jetpack Compose + Material 3                  |
| Architecture           | Service-centric with MVVM for UI layer only   |
| State Persistence      | Jetpack DataStore (Preferences)               |
| Dependency Injection   | Hilt                                          |
| Build System           | Gradle with Kotlin DSL (.kts)                 |
| Version Catalog        | Gradle Version Catalog (libs.versions.toml)   |

### 4.1 Architecture Rationale

> **Why not pure MVVM?**
>
> The core logic lives in an `AccessibilityService`, which has its own lifecycle managed by the Android system — it cannot be instantiated via ViewModels or injected in the standard MVVM sense. Therefore:
>
> - The **AccessibilityService** is the primary runtime component. It owns the detection and response engines.
> - The **UI layer** (Settings screen, status dashboard) follows MVVM and communicates with the service via shared `DataStore` preferences and a bound service pattern or `StateFlow` exposed through a singleton/DI scope.
> - This hybrid approach keeps the UI testable while respecting the system-managed service lifecycle.

---

## 5. Permissions

| Permission                         | Purpose                                      | Required |
|------------------------------------|----------------------------------------------|----------|
| `BIND_ACCESSIBILITY_SERVICE`       | Core detection and response                  | Yes      |
| `SYSTEM_ALERT_WINDOW`             | Debug overlay (development only)             | No*      |
| `RECEIVE_BOOT_COMPLETED`          | Restart service after reboot                 | Yes      |
| `FOREGROUND_SERVICE`              | Keep service alive under memory pressure     | Yes      |
| `FOREGROUND_SERVICE_SPECIAL_USE`  | Android 14+ foreground service type          | Yes      |
| `POST_NOTIFICATIONS`             | Android 13+ notification permission          | Yes      |

> **No `INTERNET` permission.** This app never makes network requests. This should be declared explicitly in the manifest with `tools:node="remove"` for trust.

> **\* Debug overlay alternative**: The `AccessibilityService` can use `TYPE_ACCESSIBILITY_OVERLAY` windows without requiring `SYSTEM_ALERT_WINDOW` permission. Prefer this for debug overlays.

> [!WARNING]
> **Android 13+ Restricted Settings**: Apps installed via sideloading (APK, not Play Store) are blocked from enabling accessibility services by default. Users must go to **Settings → Apps → Shorts Blocker → ⋮ → Allow restricted settings** and authenticate before the accessibility toggle becomes available. The onboarding flow (§15) must guide users through this step.

---

## 6. Core Functionality

### 6.1 Accessibility Service

The app registers an `AccessibilityService` that is the heart of all detection and blocking logic.

**Service Configuration** (`accessibility_service_config.xml`):

```xml
<accessibility-service
    android:accessibilityEventTypes="typeWindowStateChanged|typeWindowContentChanged|typeViewScrolled"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:accessibilityFlags="flagReportViewIds|flagRetrieveInteractiveWindows|flagIncludeNotImportantViews"
    android:canRetrieveWindowContent="true"
    android:notificationTimeout="100"
    android:packageNames="com.google.android.youtube"
    android:settingsActivity=".ui.SettingsActivity"
    android:description="@string/accessibility_service_description" />
```

**Key design decisions:**

- **Package filtering**: Only `com.google.android.youtube` events are processed. All other apps are ignored at the framework level (zero overhead).
- **Event types**: Three specific types are subscribed:
  - `TYPE_WINDOW_STATE_CHANGED` — Detects activity/fragment transitions (entering Shorts player)
  - `TYPE_WINDOW_CONTENT_CHANGED` — Detects dynamic content updates (Shorts loading in feed)
  - `TYPE_VIEW_SCROLLED` — Detects scrolling into Shorts content
- **Flags**: `flagReportViewIds` enables resource ID inspection. `flagIncludeNotImportantViews` ensures complete tree traversal.
- **Notification timeout**: 100ms batching to prevent event flooding while maintaining responsiveness.

### 6.2 UI Inspection

On every relevant accessibility event:

1. **Guard clause**: Verify `event.packageName == "com.google.android.youtube"` (defense in depth — the config filter handles this, but verify).
2. **Obtain root node**: `rootInActiveWindow` — immediately return if null.
3. **Debounce**: Skip processing if within the cooldown window from a previous detection.
4. **Run detection engine**: Traverse the accessibility tree against all enabled rules.
5. **If detected**: Execute the response engine.
6. **Recycle nodes**: All `AccessibilityNodeInfo` objects must be recycled to prevent memory leaks.

---

## 7. Detection Engine

The detector supports multiple independent rules. A Shorts screen is considered detected if **any single enabled rule** returns `true`.

Rules are evaluated in priority order (cheapest first) and short-circuit on first match.

### 7.1 Rule Priority & Evaluation Order

| Priority | Rule                      | Cost    | Reliability |
|----------|---------------------------|---------|-------------|
| 1        | Bottom Nav Tab Detection  | Lowest  | High        |
| 2        | Content Description Match | Low     | High        |
| 3        | Text Label Match          | Low     | Medium      |
| 4        | URL Pattern Match         | Low     | High        |
| 5        | View ID Match             | Medium  | Medium      |
| 6        | Layout Heuristics         | High    | Medium      |

### 7.2 Rule 1 — Bottom Navigation Tab Detection (Proactive)

**Purpose**: Prevent entering Shorts rather than exiting after playback begins.

**Mechanism**: Monitor the bottom navigation bar for the Shorts tab selection state.

**Detection logic**:
- Find the bottom navigation bar node (typically a `BottomNavigationView` or similar container)
- Check if the "Shorts" tab is currently selected (`isSelected == true`)
- Also check `contentDescription` containing "Shorts" on navigation items

**Action**: Immediately perform BACK before the Shorts feed loads.

**Why this is Rule 1**: This is the cheapest check and catches the most common entry point. If caught here, no further detection is needed.

### 7.3 Rule 2 — Content Description Match

**Purpose**: Detect Shorts-related UI elements via their accessibility content descriptions, which are more stable than resource IDs across YouTube updates.

**Detection logic**:
- Traverse nodes checking `contentDescription` for patterns:
  - `"Shorts"` (tab label)
  - `"Short"` (video type indicators)
  - Content descriptions matching Shorts player controls

**Rationale**: Content descriptions are maintained for accessibility compliance (screen readers) and change less frequently than internal resource IDs.

### 7.4 Rule 3 — Visible Text Label Match

**Purpose**: Catch any visible "Shorts" text labels in the UI.

**Detection logic**:
- Search all visible text nodes for exact or partial matches:
  - `"Shorts"` (section headers, tab labels)
  - `"shorts"` (case-insensitive)
- **Exclusion list**: Ignore matches that appear in regular video titles, descriptions, or comments to avoid false positives.

**Localization consideration**: Maintain a configurable list of Shorts labels for different locales:

```kotlin
val SHORTS_LABELS = setOf(
    "Shorts",           // English
    "Shorts动态",       // Chinese
    "ショート",          // Japanese
    "숏츠",             // Korean
    // Add as needed
)
```

### 7.5 Rule 4 — URL Pattern Match

**Purpose**: Detect Shorts opened via deep links or URL-based navigation.

**Detection logic**:
- Search node text and content descriptions for URL patterns containing:
  - `/shorts/`
  - `youtube.com/shorts`

**When this triggers**: Primarily when a `youtube.com/shorts/VIDEO_ID` link is opened from another app, a notification, or a share link.

### 7.6 Rule 5 — View ID Match

**Purpose**: Detect known Shorts-specific resource IDs in the view hierarchy.

**Detection logic**:
- Search for nodes with `viewIdResourceName` matching known Shorts IDs.
- Maintain these IDs in a **configurable list** stored in DataStore so they can be updated without recompilation.

**Known IDs** (as of YouTube v19.x — subject to change):

```kotlin
val SHORTS_VIEW_IDS = setOf(
    "com.google.android.youtube:id/reel_player_page_container",
    "com.google.android.youtube:id/shorts_shelf_header",
    "com.google.android.youtube:id/reel_recycler",
    "com.google.android.youtube:id/reel_watch_player_fragment",
    // Updated via debug mode + Layout Inspector
)
```

> **Warning**: YouTube frequently changes internal resource IDs. This rule requires periodic maintenance. The debug overlay (§10) exists specifically to discover new IDs.

### 7.7 Rule 6 — Layout Heuristics

**Purpose**: Fallback detection when YouTube updates break ID/text-based rules.

**Detection logic**: Identify a UI pattern matching the Shorts player layout:

| Indicator                          | Weight |
|------------------------------------|--------|
| Full-screen vertical video player  | 3      |
| Right-side vertical action column  | 2      |
| Like button                        | 1      |
| Dislike button                     | 1      |
| Comment button                     | 1      |
| Share button                       | 1      |
| Subscribe/channel button           | 1      |
| Sound/music info at bottom         | 1      |
| No seek bar / progress bar         | 2      |

**Threshold**: If the combined weight ≥ 6, classify as Shorts.

**Implementation**: This rule is the most expensive (full tree traversal with geometric analysis) and runs last. It serves as a safety net when other rules fail after a YouTube update.

### 7.8 Rule 7 — Shorts in Home Feed (Shelf Detection)

**Purpose**: Detect and bypass Shorts shelves/carousels that appear inline on the Home tab.

**Detection logic**:
- Detect the "Shorts" shelf header in the Home feed
- Identify the horizontal carousel containing Short thumbnails
- If the user scrolls to or taps on a Shorts shelf item, trigger blocking

**Rationale**: This is distinct from the Shorts tab — it catches Shorts content that appears mixed into the regular feed.

### 7.9 Future Rule — Activity Pattern

**Purpose**: If future YouTube versions expose identifiable activity names for Shorts (currently all routes appear under the main `WatchWhileActivity`), allow activity-name matching.

**Implementation**: Configurable activity name list. Currently not used but the infrastructure exists.

---

## 8. Response Engine

Upon successful detection, execute a graduated response:

### 8.1 Response Sequence

```
Step 1: performGlobalAction(GLOBAL_ACTION_BACK)
        Wait 300ms
        Re-evaluate screen

Step 2: If still in Shorts → performGlobalAction(GLOBAL_ACTION_BACK)
        Wait 300ms
        Re-evaluate screen

Step 3: If still in Shorts → performGlobalAction(GLOBAL_ACTION_BACK)
        Wait 300ms
        Re-evaluate screen

Step 4: If still blocked → performGlobalAction(GLOBAL_ACTION_HOME)
        Log escalation event
```

### 8.2 Response Parameters (Configurable)

| Parameter             | Default | Range     | Description                              |
|-----------------------|---------|-----------|------------------------------------------|
| `backDelay`           | 300ms   | 100–1000  | Wait between BACK actions                |
| `maxBackAttempts`     | 3       | 1–5       | BACK attempts before escalating to HOME  |
| `cooldownDuration`    | 500ms   | 200–2000  | Ignore detections after blocking          |

### 8.3 BACK Action Reliability

`performGlobalAction(GLOBAL_ACTION_BACK)` returns a `boolean` — always check the return value.

**Known failure cases**:
- Gesture navigation conflicts (especially Android 15)
- OEM devices (Xiaomi/MIUI) may silently fail
- Overlay interference stealing input focus

**Fallback**: If `GLOBAL_ACTION_BACK` returns `false`, use `dispatchGesture()` to simulate a swipe-from-left-edge gesture (requires `canPerformGestures="true"` in config).

### 8.4 Cooldown Mechanism

After any blocking action is performed:

1. Record the timestamp.
2. Ignore all subsequent detection events for `cooldownDuration` milliseconds.
3. This prevents:
   - **Oscillation**: BACK → Shorts reloads → BACK → infinite loop
   - **UI stuttering**: Rapid successive BACK actions creating a jarring experience
   - **False positives during transition**: The 300ms between BACKs might show intermediate UI states that trigger detection

---

## 9. Service Persistence & Reliability

### 9.1 Boot Receiver

Register a `BroadcastReceiver` for `BOOT_COMPLETED` to ensure the service is available after reboot.

```kotlin
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            // Accessibility services auto-restart if enabled in settings.
            // This receiver is a safety net to verify state and show
            // a notification if the service was disabled.
            verifyServiceEnabled(context)
        }
    }
}
```

> **Note**: Android's accessibility framework automatically re-enables the service on boot if it was enabled before shutdown. The boot receiver exists as a verification layer, not a restart mechanism.

### 9.2 Foreground Service

Run as a foreground service with a persistent notification to:
- Signal to the system that this is a high-priority service
- Reduce likelihood of being killed under memory pressure
- Provide user-visible status ("Shorts Blocker is active")

**Android 14+ requirement**: Declare `foregroundServiceType="specialUse"` in the manifest.

### 9.3 Separate Process

Run the accessibility service in its own process to isolate it from the main app process:

```xml
<service
    android:name=".service.ShortsAccessibilityService"
    android:process=":accessibility"
    ... />
```

This prevents the service from being killed when the user swipes away the app from Recents.

### 9.4 OEM Battery Management

Many OEMs (Samsung, Xiaomi, OnePlus, Huawei, Oppo) aggressively kill background services beyond standard Android Doze behavior.

**Mitigation strategy**:

1. **First launch onboarding**: Guide the user to:
   - Disable battery optimization for this app
   - Lock the app in Recents (OEM-specific)
   - Add to "protected apps" list (OEM-specific)

2. **Runtime checks**: Periodically verify via `PowerManager.isIgnoringBatteryOptimizations()` and prompt if not exempt.

3. **Device-specific instructions**: Link to [dontkillmyapp.com](https://dontkillmyapp.com/) for per-manufacturer guidance.

### 9.5 Crash Recovery

- The service must **never crash** due to:
  - Null/missing accessibility nodes (always null-check)
  - Malformed accessibility trees (wrap traversal in try-catch)
  - Stale node references (recycle and re-obtain)
- If an unhandled exception occurs, log it and continue — do not let it propagate to `onAccessibilityEvent`.
- Implement a global `UncaughtExceptionHandler` for the service process that logs and recovers.

### 9.6 YouTube Update Resilience

YouTube updates can break detection at any time. The app must handle this gracefully:

- **No rule match ≠ crash**. If detection fails, the app simply does nothing.
- **Version tracking**: Log the currently installed YouTube version alongside detection events. This makes it easy to correlate detection failures with specific YouTube updates.
- **Configurable rules**: View IDs and text patterns are stored in DataStore, not hardcoded constants, so they can be updated without recompilation.
- **Debug mode** (§10) exists specifically for rapidly diagnosing and updating rules after a YouTube update.

---

## 10. Debug Mode

### 10.1 Purpose

A development tool to inspect the YouTube accessibility tree in real time, discover new resource IDs, and validate detection rules.

### 10.2 Debug Overlay

When enabled, display a floating overlay (requires `SYSTEM_ALERT_WINDOW`) showing:

```
┌──────────────────────────────┐
│ 📦 com.google.android.youtube│
│ 🎬 WatchWhileActivity        │
│ ✅ Rule 2: Content Desc      │
│ ⚡ Action: BACK (1/3)        │
│ ⏱️ Latency: 42ms             │
│ 📺 YT v19.45.38              │
└──────────────────────────────┘
```

Fields:
- **Package**: Currently active package
- **Activity**: Current activity name (if available from window info)
- **Matched Rule**: Which rule triggered (or "No match")
- **Action**: Last action taken and attempt count
- **Latency**: Detection processing time
- **YouTube Version**: Installed YouTube version string

### 10.3 Tree Dump

In debug mode, provide a button/gesture to dump the complete accessibility tree to a log file. This is essential for discovering new Shorts-specific node IDs after YouTube updates.

---

## 11. Settings Screen

A minimal, single-screen UI built with Jetpack Compose + Material 3.

### 11.1 Layout

```
┌────────────────────────────────────┐
│         Shorts Blocker             │
│                                    │
│  Service Status                    │
│  ┌────────────────────────────┐    │
│  │ ● Active  (or ○ Inactive) │    │
│  │ [Open Accessibility Settings] │ │
│  └────────────────────────────┘    │
│                                    │
│  Detection Rules                   │
│  ┌────────────────────────────┐    │
│  │ ☑ Bottom Nav Detection     │    │
│  │ ☑ Content Description      │    │
│  │ ☑ Text Label Match         │    │
│  │ ☑ URL Pattern Match        │    │
│  │ ☑ View ID Match            │    │
│  │ ☑ Layout Heuristics        │    │
│  │ ☑ Shorts in Feed           │    │
│  └────────────────────────────┘    │
│                                    │
│  Timing                           │
│  ┌────────────────────────────┐    │
│  │ Block delay:    300ms  [-][+] │ │
│  │ Cooldown:       500ms  [-][+] │ │
│  │ Max attempts:   3      [-][+] │ │
│  └────────────────────────────┘    │
│                                    │
│  Developer                         │
│  ┌────────────────────────────┐    │
│  │ ☐ Debug overlay            │    │
│  │ ☐ Verbose logging          │    │
│  │ [Dump Accessibility Tree]  │    │
│  │ [View Logs]                │    │
│  └────────────────────────────┘    │
│                                    │
│  Stats                             │
│  ┌────────────────────────────┐    │
│  │ Blocked today:    14       │    │
│  │ Total blocked:    847      │    │
│  │ Last blocked:     20:18:04 │    │
│  │ YouTube version:  19.45.38 │    │
│  └────────────────────────────┘    │
└────────────────────────────────────┘
```

### 11.2 Settings Storage

All settings persisted via Jetpack DataStore (Preferences). No Room database needed for V1.

---

## 12. Logging

### 12.1 In-Memory Log

Maintain a circular buffer (max 200 entries) of recent events:

```kotlin
data class BlockEvent(
    val timestamp: Long,
    val detectionRule: String,
    val actionTaken: String,       // "BACK", "HOME", "NONE"
    val attemptNumber: Int,
    val latencyMs: Long,
    val youtubeVersion: String
)
```

### 12.2 Display Format

```
20:18:04 │ Rule 2: Content Desc │ BACK (1/3) │ 42ms
20:18:02 │ Rule 1: Bottom Nav   │ BACK (1/1) │ 12ms
20:15:47 │ Rule 4: URL Pattern  │ BACK (1/3) │ 38ms
20:15:47 │ Rule 4: URL Pattern  │ BACK (2/3) │ 35ms
20:15:48 │ Rule 4: URL Pattern  │ BACK (3/3) │ 31ms
```

### 12.3 Persistent Logging (Optional)

When verbose logging is enabled, write logs to:

```
/data/data/com.shortsblocker/files/logs/shorts_blocker_YYYY-MM-DD.log
```

Automatically delete logs older than 7 days.

---

## 13. Performance Requirements

| Metric                      | Target          |
|-----------------------------|-----------------|
| Detection latency           | < 100ms average |
| Detection latency (P99)     | < 200ms         |
| Memory allocation per event | < 1KB           |
| Battery impact              | Negligible      |
| CPU usage (idle)            | 0%              |
| CPU usage (during detection)| < 1% burst      |

### 13.1 Performance Strategy

- **Event filtering at framework level**: `packageNames` in config ensures zero processing for non-YouTube apps.
- **Short-circuit evaluation**: Rules evaluated in order of cost; stop on first match.
- **Node recycling**: All `AccessibilityNodeInfo` objects recycled immediately after use.
- **No allocations in hot path**: Pre-allocate detection result objects; use object pooling for traversal.
- **Debouncing**: `notificationTimeout="100"` in config + application-level cooldown prevents processing floods.
- **No disk I/O in `onAccessibilityEvent`**: Logging is async (channel/buffer). Settings reads are cached.

---

## 14. Edge Cases

| Scenario                              | Handling                                                        |
|---------------------------------------|-----------------------------------------------------------------|
| YouTube in split-screen mode          | Detection still works; accessibility tree is available          |
| YouTube in Picture-in-Picture         | PiP typically shows regular videos; if Shorts detected, block   |
| YouTube not installed                 | Service has no effect; no events are generated                  |
| YouTube force-stopped                 | Service has no effect; resumes when YouTube is relaunched       |
| Multiple YouTube apps (e.g., YouTube Music) | Only `com.google.android.youtube` is monitored            |
| YouTube WebView in other apps         | Not monitored (package filter prevents this)                    |
| YouTube Shorts shared via link        | Caught by URL Pattern rule when opened in YouTube app           |
| Service disabled by user              | Show persistent notification reminding user to re-enable        |
| Service killed by OEM battery manager | Watchdog + notification to guide user to whitelist              |
| Accessibility node tree is empty      | Return immediately; no crash                                    |
| YouTube language changed              | Localized label list (§7.4) handles common languages            |
| Shorts auto-play from regular video   | Caught by content description and layout heuristic rules        |

---

## 15. Onboarding Flow

First launch experience:

```
Screen 1: Welcome
  "Shorts Blocker prevents you from watching YouTube Shorts."

Screen 2: Allow Restricted Settings (Android 13+ sideloaded apps only)
  "Before enabling the service, you need to allow restricted settings."
  [Open App Info]
  Visual guide: ⋮ menu → Allow restricted settings → Authenticate
  Auto-detect: Skip this screen if installed from Play Store or restricted settings already allowed.

Screen 3: Enable Accessibility Service
  [Open Accessibility Settings]
  Step-by-step visual guide: Find "Shorts Blocker" → Toggle on → Grant permission

Screen 4: Battery Optimization
  [Disable Battery Optimization]
  Device-specific instructions link (dontkillmyapp.com)
  Visual: Set battery usage to "Unrestricted"

Screen 5: Done
  "Shorts Blocker is now active."
  Show real-time status indicator
  Quick test: "Open YouTube and tap the Shorts tab to verify blocking."
```

---

## 16. Future Enhancements

### 16.1 Platform Extensions

Each platform implements its own detector module following the same `DetectionRule` interface:

| Platform         | Package Name                      | Priority |
|------------------|-----------------------------------|----------|
| Instagram Reels  | `com.instagram.android`           | High     |
| Facebook Reels   | `com.facebook.katana`             | Medium   |
| TikTok           | `com.zhiliaoapp.musically`        | Medium   |
| X (Twitter)      | `com.twitter.android`             | Low      |
| Snapchat Spotlight | `com.snapchat.android`          | Low      |

### 16.2 Additional Features (Post-V1)

- **Usage statistics dashboard**: Charts showing blocking frequency over time
- **Scheduled blocking**: Allow Shorts during certain hours (e.g., weekends)
- **Allowlist**: Specific Shorts creators that are never blocked
- **Widget**: Home screen widget showing service status and today's block count
- **Notification summary**: Daily digest of how many Shorts were blocked

---

## 17. Project Structure

```
app/
├── src/main/
│   ├── java/com/shortsblocker/
│   │   ├── ShortsBlockerApp.kt                    # Application class (Hilt entry point)
│   │   │
│   │   ├── service/
│   │   │   ├── ShortsAccessibilityService.kt      # Main accessibility service
│   │   │   └── ServiceStateManager.kt             # Tracks service lifecycle state
│   │   │
│   │   ├── detection/
│   │   │   ├── DetectionEngine.kt                 # Orchestrates rule evaluation
│   │   │   ├── DetectionResult.kt                 # Result data class
│   │   │   ├── rules/
│   │   │   │   ├── DetectionRule.kt               # Rule interface
│   │   │   │   ├── BottomNavRule.kt               # Rule 1: Bottom nav tab
│   │   │   │   ├── ContentDescriptionRule.kt      # Rule 2: Content descriptions
│   │   │   │   ├── TextLabelRule.kt               # Rule 3: Visible text
│   │   │   │   ├── UrlPatternRule.kt              # Rule 4: URL matching
│   │   │   │   ├── ViewIdRule.kt                  # Rule 5: Resource IDs
│   │   │   │   ├── LayoutHeuristicRule.kt         # Rule 6: Layout analysis
│   │   │   │   └── ShelfDetectionRule.kt          # Rule 7: Shorts in feed
│   │   │   └── NodeTraverser.kt                   # Efficient tree traversal utility
│   │   │
│   │   ├── response/
│   │   │   ├── ResponseEngine.kt                  # Graduated response orchestrator
│   │   │   ├── BackAction.kt                      # GLOBAL_ACTION_BACK wrapper
│   │   │   └── HomeAction.kt                      # GLOBAL_ACTION_HOME wrapper
│   │   │
│   │   ├── ui/
│   │   │   ├── MainActivity.kt                    # Single-activity host
│   │   │   ├── MainViewModel.kt                   # UI state management
│   │   │   ├── screens/
│   │   │   │   ├── SettingsScreen.kt              # Main settings composable
│   │   │   │   ├── OnboardingScreen.kt            # First-launch onboarding
│   │   │   │   └── LogScreen.kt                   # Block event log viewer
│   │   │   ├── components/
│   │   │   │   ├── ServiceStatusCard.kt           # Service status indicator
│   │   │   │   ├── RuleToggleList.kt              # Detection rule toggles
│   │   │   │   └── StatsCard.kt                   # Blocking statistics
│   │   │   └── theme/
│   │   │       ├── Theme.kt                       # Material 3 theme
│   │   │       ├── Color.kt                       # Color definitions
│   │   │       └── Type.kt                        # Typography
│   │   │
│   │   ├── data/
│   │   │   ├── SettingsRepository.kt              # DataStore wrapper
│   │   │   ├── BlockEventLog.kt                   # Circular buffer log
│   │   │   └── PreferencesKeys.kt                 # DataStore key constants
│   │   │
│   │   ├── debug/
│   │   │   ├── OverlayManager.kt                  # Debug overlay window
│   │   │   └── TreeDumper.kt                      # Accessibility tree dump
│   │   │
│   │   ├── receiver/
│   │   │   └── BootReceiver.kt                    # BOOT_COMPLETED handler
│   │   │
│   │   ├── di/
│   │   │   └── AppModule.kt                       # Hilt module
│   │   │
│   │   └── util/
│   │       ├── AccessibilityExtensions.kt         # Extension functions for nodes
│   │       └── Constants.kt                       # App-wide constants
│   │
│   ├── res/
│   │   ├── xml/
│   │   │   └── accessibility_service_config.xml   # Service configuration
│   │   ├── values/
│   │   │   ├── strings.xml                        # String resources
│   │   │   └── themes.xml                         # Legacy theme (for non-Compose)
│   │   └── drawable/                              # Icons and drawables
│   │
│   └── AndroidManifest.xml
│
├── build.gradle.kts                               # App-level build config
│
├── gradle/
│   └── libs.versions.toml                         # Version catalog
│
├── build.gradle.kts                               # Project-level build config
├── settings.gradle.kts                            # Project settings
├── gradle.properties                              # Gradle properties
├── .gitignore
├── GEMINI.md                                      # AI context file
├── PRD.md                                         # This document
└── README.md
```

---

## 18. Key Interfaces

### 18.1 DetectionRule Interface

```kotlin
interface DetectionRule {
    /** Human-readable name for logging and UI */
    val name: String

    /** Unique identifier for settings storage */
    val id: String

    /** Whether this rule is currently enabled */
    val isEnabled: Boolean

    /**
     * Evaluate this rule against the current accessibility tree.
     *
     * @param rootNode The root AccessibilityNodeInfo of the active window
     * @return DetectionResult indicating match status and metadata
     *
     * Implementations MUST:
     * - Handle null nodes gracefully
     * - Recycle any intermediate nodes they obtain
     * - Complete within 50ms
     * - Never throw exceptions
     */
    fun evaluate(rootNode: AccessibilityNodeInfo): DetectionResult
}
```

### 18.2 DetectionResult

```kotlin
data class DetectionResult(
    val isDetected: Boolean,
    val ruleName: String,
    val confidence: Float = 1.0f,    // 0.0–1.0 for heuristic rules
    val metadata: Map<String, String> = emptyMap()  // Debug info
)
```

---

## 19. Verification Plan

### 19.1 Manual Testing Matrix

| Test Case                                    | Expected Result                         |
|----------------------------------------------|-----------------------------------------|
| Open YouTube → tap Shorts tab                | Immediately exits back to Home tab      |
| Open `youtube.com/shorts/xxx` link           | Exits Shorts within ~1 second           |
| Scroll Home feed past Shorts shelf           | Shorts shelf cards do not open          |
| Watch a regular video                        | No interference whatsoever              |
| Search for content                           | No interference                         |
| View subscriptions                           | No interference                         |
| Open YouTube after device reboot             | Service still active, blocking works    |
| Force-stop the Shorts Blocker app            | Notification warns; service may need re-enable |
| Disable service in Accessibility settings    | App shows "Inactive" status             |
| Toggle individual rules off                  | Only enabled rules fire                 |
| Change cooldown to 2000ms                    | Longer pause between blocks             |
| Enable debug overlay                         | Overlay displays on YouTube screens     |
| YouTube app update                           | Most rules still work; debug mode helps |
| Device with aggressive battery management    | Onboarding guides through whitelisting  |

### 19.2 Performance Verification

- Use Android Studio Profiler to verify:
  - No memory leaks in the service process
  - CPU usage remains < 1% during active detection
  - No dropped frames in YouTube due to accessibility processing

### 19.3 Battery Verification

- Run with Battery Historian for 24 hours
- Verify the app does not appear in "Battery usage" list
- Confirm no wakelocks are held

---

## 20. Success Criteria

The project is considered **successful** if:

1. ✅ Opening the Shorts tab immediately exits back to standard YouTube
2. ✅ Opening a `youtube.com/shorts/...` link never allows the Shorts player to remain visible for more than ~1 second
3. ✅ Shorts appearing in the Home feed cannot be opened
4. ✅ Normal YouTube videos, search, subscriptions, playlists, and all other features remain fully functional
5. ✅ The app uses negligible battery (not visible in battery stats)
6. ✅ The service survives device reboots without manual intervention
7. ✅ The service survives routine YouTube updates with only occasional rule adjustments
8. ✅ Detection latency is consistently under 100ms
9. ✅ The app has zero internet permissions and makes no network requests

---

## 21. Risks & Mitigations

| Risk                                          | Likelihood | Impact | Mitigation                                                  |
|-----------------------------------------------|-----------|--------|-------------------------------------------------------------|
| YouTube major UI overhaul breaks all rules    | Medium    | High   | Multiple independent rules; layout heuristics as fallback    |
| OEM kills service aggressively                | High      | High   | Onboarding flow; separate process; foreground service        |
| Google restricts accessibility service scope  | Low       | Critical | No mitigation; would require fundamental approach change    |
| False positive blocks regular video           | Low       | Medium | Exclusion lists; confidence thresholds; rule toggling        |
| YouTube moves to Jetpack Compose (opaque tree)| Medium    | High   | Compose nodes still expose semantics for accessibility       |

---

## Appendix A: Configurable Constants

```kotlin
object Defaults {
    const val BACK_DELAY_MS = 300L
    const val COOLDOWN_MS = 500L
    const val MAX_BACK_ATTEMPTS = 3
    const val LOG_BUFFER_SIZE = 200
    const val LOG_RETENTION_DAYS = 7
    const val LAYOUT_HEURISTIC_THRESHOLD = 6
    const val NOTIFICATION_TIMEOUT_MS = 100
    const val YOUTUBE_PACKAGE = "com.google.android.youtube"
}
```

## Appendix B: Manifest Skeleton

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    package="com.shortsblocker">

    <!-- Explicitly declare NO internet permission -->
    <uses-permission android:name="android.permission.INTERNET"
        tools:node="remove" />

    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />

    <application
        android:name=".ShortsBlockerApp"
        android:allowBackup="false"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:theme="@style/Theme.ShortsBlocker">

        <activity
            android:name=".ui.MainActivity"
            android:exported="true"
            android:theme="@style/Theme.ShortsBlocker">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <service
            android:name=".service.ShortsAccessibilityService"
            android:exported="false"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
            android:process=":accessibility"
            android:foregroundServiceType="specialUse">
            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService" />
            </intent-filter>
            <meta-data
                android:name="android.accessibilityservice"
                android:resource="@xml/accessibility_service_config" />
        </service>

        <receiver
            android:name=".receiver.BootReceiver"
            android:exported="false">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
            </intent-filter>
        </receiver>

        <property
            android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE"
            android:value="Monitors YouTube to block Shorts content via accessibility service" />

    </application>
</manifest>
```
