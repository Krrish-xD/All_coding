# Proguard rules for Shorts Blocker

# Keep AccessibilityService class and entrypoints intact
-keep class com.shortsblocker.service.ShortsAccessibilityService { *; }
-keep class com.shortsblocker.receiver.BootReceiver { *; }

# Keep Hilt generated classes
-keep class * extends dagger.hilt.internal.GeneratedComponent { *; }
-keep class * extends dagger.hilt.internal.GeneratedComponentManager { *; }

# Keep DataStore class members
-keep class androidx.datastore.preferences.core.Preferences { *; }
