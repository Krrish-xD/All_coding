# Shorts Blocker

An Android application that uses Android's **Accessibility Service** to detect and block YouTube Shorts. It intercepts Shorts feed scrolling, direct URLs, and bottom navigation taps, instantly navigating back (or to the Home screen) to keep your focus intact.

This is a personal, offline-first application designed for self-installation. It has **zero internet permissions**, meaning your data never leaves your device, and uses less than **0.5% battery** over a full charge.

---

## Features

- **Multi-layered Detection**: Checks bottom navigation selection, view hierarchies, content descriptions, visible text, layout heuristics, shelf views, and URLs to intercept Shorts.
- **Proactive Interception**: Blocks bottom navigation taps *before* the Shorts video even starts playing.
- **Graduated Responses**: Performs back key gestures with a cooldown delay, escalating to the Home screen if the player won't close.
- **Swipe-Back Fallback**: Automatically simulates left-edge swipe gestures if standard system back key presses fail.
- **Onboarding Guide**: Walkthrough interface to configure accessibility permissions, bypass sideload restrictions, and optimize battery savings.
- **Debug overlay & Log dumps**: Real-time stats display over YouTube and complete node tree structure exports for layout diagnostics.

---

## How to Build and Install on Your Device

### Prerequisites
- A computer with **JDK 11+** installed (or Android Studio).
- **USB Debugging** enabled on your Android phone (Settings > Developer Options > USB Debugging).
- Android device running **Android 10 (API 29)** or higher.

### 1. Compile the APK
From the project root directory, compile the debug APK using the Gradle wrapper:
```bash
# Set JAVA_HOME to your JDK path and build the debug APK
export JAVA_HOME="/path/to/your/jdk"
./gradlew assembleDebug
```
The compiled APK will be generated at:
`app/build/outputs/apk/debug/app-debug.apk`

### 2. Install the APK
Install the generated APK onto your USB-connected device:
```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

---

## Setup Guide (On Your Android Phone)

After opening the app for the first time, you will go through the onboarding setup steps:

### Step 1: Allow Restricted Settings (Android 13+ Sideloads)
Because you installed this app via APK (sideloaded), Android blocks you from enabling its accessibility settings by default. To unlock it:
1. Tap the **Open App Info** button in the onboarding screen (or go to Settings > Apps > Shorts Blocker).
2. Tap the three-dot menu (**⋮**) in the top right corner.
3. Select **Allow restricted settings**.
4. Authenticate using your PIN, pattern, or fingerprint.

### Step 2: Enable the Accessibility Service
1. Tap **Enable Service** (or go to Settings > Accessibility > Installed Apps > Shorts Blocker).
2. Toggle the switch to **ON**.
3. Accept the system warnings to grant view inspection and gesture controls.

### Step 3: Disable Battery Optimization (Critical for Stability)
OEM battery optimizers (Samsung, Xiaomi, OnePlus, etc.) aggressively kill background services. To whitelist the app:
1. Tap **Disable Battery Optimization** (or go to Settings > Apps > Shorts Blocker > Battery).
2. Select **Unrestricted** (or "Don't Optimize").
3. For manufacturer-specific locking instructions, check [dontkillmyapp.com](https://dontkillmyapp.com/).

---

## How to Use

Once setup is complete, the blocker runs completely in the background.

- **Standard usage**: Open YouTube and tap the **Shorts** tab. The app will immediately intercept the click and return you to the home screen.
- **Links**: Tapping a `youtube.com/shorts/...` link will open the YouTube app and immediately trigger the back action to exit the player.
- **Timing controls**: Customize the **Block delay** (default: 300ms) and **Cooldown** (default: 500ms) in the app settings to match your device's speed.
- **Diagnostics**: Enable the **Debug overlay** in the app's developer section to see exactly which rules trigger when navigating through YouTube.

---

## Tech Stack
- **Language**: Kotlin
- **UI Framework**: Jetpack Compose + Material 3
- **Dependency Injection**: Hilt
- **State Management**: Jetpack DataStore (Preferences) + Kotlin StateFlow
- **Min SDK**: API 29 (Android 10)
- **Target SDK**: API 35 (Android 15)
