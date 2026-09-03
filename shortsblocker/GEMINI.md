# Shorts Blocker

## Project Overview
An Android application that blocks YouTube Shorts by detecting and exiting Shorts screens using Android's Accessibility Service. Personal project, not for distribution.

## Tech Stack
- **Language**: Kotlin
- **UI**: Jetpack Compose + Material 3
- **Architecture**: Service-centric + MVVM for UI layer
- **DI**: Hilt
- **State**: Jetpack DataStore (Preferences) + StateFlow
- **Build**: Gradle with Kotlin DSL (.kts) + Version Catalog
- **Min SDK**: 29 (Android 10)
- **Target SDK**: 35 (Android 15)

## Key Architecture Decisions
- The `AccessibilityService` is system-managed and cannot use standard MVVM. It communicates with the UI via shared DataStore + StateFlow through a repository singleton.
- Service runs in the main process for simplified cross-process data sharing and Hilt integration.
- No internet permission — explicitly removed with `tools:node="remove"`.
- Detection uses multiple independent rules evaluated in cost order with short-circuit on first match.
- Response uses graduated escalation: BACK → BACK → BACK → HOME.

## Current Status
- **Phase**: Implementation and verification complete. All unit tests pass.
- **PRD**: See [PRD.md](file:///home/kxd/Coding/shortsblocker/PRD.md) in project root
- **Walkthrough**: See [walkthrough.md](file:///home/kxd/.gemini/antigravity/brain/1a0c4fd9-1d42-4048-851e-ab3c142c5094/walkthrough.md) in app data directory

## Project Structure
See `PRD.md` §17 for the full directory layout.

## Key Files (once created)
- `app/src/main/java/com/shortsblocker/service/ShortsAccessibilityService.kt` — Core service
- `app/src/main/java/com/shortsblocker/detection/DetectionEngine.kt` — Rule orchestrator
- `app/src/main/java/com/shortsblocker/response/ResponseEngine.kt` — BACK/HOME actions
- `app/src/main/res/xml/accessibility_service_config.xml` — Service config
- `app/src/main/AndroidManifest.xml` — Permissions & declarations

## Important Notes
- YouTube resource IDs change frequently; rules must be configurable via DataStore.
- Android 13+ sideloaded apps need "Allow restricted settings" before enabling accessibility service.
- OEM battery management is the #1 reliability concern — onboarding must guide users through whitelisting.
- `performGlobalAction(GLOBAL_ACTION_BACK)` can fail on some OEMs — fallback to `dispatchGesture()`.
