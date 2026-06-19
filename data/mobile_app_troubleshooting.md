# Mobile App Troubleshooting Guide

## Supported Platforms

- **iOS**: Version 15.0 and above (iPhone 8 and later)
- **Android**: Version 10.0 (API level 29) and above

## Common Issues and Fixes

### 1. App Crashes on Launch

**Cause**: Corrupted cache or outdated app version.

**Fix**:
1. Force-close the app completely
2. Clear the app cache:
   - **iOS**: Settings → General → iPhone Storage → [App Name] → Offload App
   - **Android**: Settings → Apps → [App Name] → Storage → Clear Cache
3. Update the app to the latest version in the App Store / Google Play
4. Restart your device and reopen the app

If the issue persists after updating, uninstall and reinstall the app.

### 2. Login Failure / "Session Expired" Loop

**Cause**: Expired refresh token or network interruption during auth.

**Fix**:
1. Ensure you have a stable internet connection (try switching between Wi-Fi and mobile data)
2. Clear app data (Android: Settings → Apps → [App Name] → Storage → Clear Data)
3. Log out completely and log back in
4. If using SSO, confirm your corporate IdP session is active on your browser

### 3. Push Notifications Not Arriving

**Fix**:
1. **iOS**: Settings → Notifications → [App Name] → Allow Notifications (toggle ON)
2. **Android**: Settings → Apps → [App Name] → Notifications → Enable All
3. Verify in-app settings: Profile → Notification Preferences
4. Disable any battery optimization that may kill background processes

### 4. App Stuck on Loading Screen

**Fix**:
1. Check your internet connection speed (minimum 1 Mbps recommended)
2. Check our status page at status.example.com for active incidents
3. Force-close and reopen the app
4. Try switching from Wi-Fi to mobile data or vice versa

### 5. Data Not Syncing Between App and Web

**Cause**: Sync conflict or network timeout.

**Fix**:
1. Pull down to refresh on the main screen
2. Log out and log back in to force a full sync
3. Ensure both app and browser are on the same account

### 6. Biometric Login Not Working

**Fix**:
1. Disable biometric login in app settings, then re-enable it
2. Re-register your fingerprint/Face ID in device settings
3. Ensure the app has permission to use biometrics

## Reporting a Bug

If none of the above steps resolve the issue:
1. Go to Profile → Help → Report a Bug
2. Include: device model, OS version, app version, and a description of steps to reproduce
3. Enable "Send diagnostic logs" before submitting
