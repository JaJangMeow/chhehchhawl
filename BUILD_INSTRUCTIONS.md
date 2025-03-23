# ChhehChhawla App Build Instructions

This document outlines how to build the ChhehChhawla app for both Android (APK) and iOS platforms.

## Prerequisites

1. Node.js installed (v16 or later)
2. Expo CLI: `npm install -g expo-cli`
3. EAS CLI: `npm install -g eas-cli`
4. Expo account (create one at https://expo.dev/signup)

## Setting Up for Build

1. Install all dependencies:
   ```
   npm install
   ```

2. Log in to your Expo account:
   ```
   eas login
   ```

3. Configure your project (already done in app.json):
   - Verify your bundle identifier and package name
   - Check that the app version and build numbers are correct

## Building an APK for Android

For a development version (easier to install):

```bash
eas build --platform android --profile preview-apk
```

This creates an APK file that can be directly installed on Android devices without Google Play.

## Building for iOS

iOS builds can only be run on iOS devices via TestFlight or installed directly with a provisioning profile:

```bash
eas build --platform ios --profile preview
```

Note: iOS builds require an Apple Developer account ($99/year) and cannot produce an installable file like APK.

## Where to Find Your Builds

After the build completes (this can take 10-30 minutes):

1. You'll receive an email with the download link
2. You can visit the Expo dashboard: https://expo.dev
3. Navigate to your project > Builds section
4. Download the APK (Android) or install via TestFlight (iOS)

## Installing the APK on Android

1. Download the APK file to your Android device
2. Tap on the file to install (you may need to enable "Install from Unknown Sources" in your device settings)
3. Follow the installation prompts

## Installing on iOS

1. You'll need to distribute the build via TestFlight
2. Users will need to install the TestFlight app and accept your invitation

## Important Notes

- Android APK builds can be directly installed on devices
- iOS builds can ONLY be installed via TestFlight or with a registered device and provisioning profile
- It's not possible to create a single file that works on both platforms 