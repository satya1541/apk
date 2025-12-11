# Android APK Build Guide

This project is configured with Capacitor for building Android APKs.

## Quick Start with Codemagic (Free Cloud Build)

### Step 1: Create Codemagic Account
1. Go to [codemagic.io](https://codemagic.io)
2. Sign up with your GitHub/GitLab/Bitbucket account (free tier includes 500 build minutes/month)

### Step 2: Connect Your Repository
1. Push this project to GitHub, GitLab, or Bitbucket
2. In Codemagic dashboard, click "Add application"
3. Select your repository

### Step 3: Start Build
1. The `codemagic.yaml` file is already configured
2. Click "Start new build" in Codemagic
3. Wait for the build to complete (usually 5-10 minutes)
4. Download your APK from the build artifacts

## Manual Build (Local Machine)

If you prefer building locally, you'll need:
- Android Studio
- JDK 17+

### Commands:
```bash
# Install dependencies
npm install

# Build web assets
npm run build

# Sync to Android
npx cap sync android

# Open in Android Studio
npx cap open android
```

Then in Android Studio: Build > Build Bundle(s)/APK(s) > Build APK(s)

## Project Configuration

- **App ID**: `com.toxishield.app`
- **App Name**: `ToxiShield-X`
- **Web Directory**: `dist/public`

To customize these settings, edit `capacitor.config.ts`.

## Creating a Signed Release APK

For Play Store submission, you need a signed APK:

1. Generate a keystore:
```bash
keytool -genkey -v -keystore toxishield.jks -keyalg RSA -keysize 2048 -validity 10000 -alias toxishield
```

2. Update `codemagic.yaml` with signing configuration (see Codemagic docs)

3. Build release:
```bash
cd android
./gradlew assembleRelease
```

## Troubleshooting

- **Build fails**: Make sure `npm run build` completes successfully first
- **Blank screen in app**: Check that API URLs point to your deployed backend, not localhost
- **Assets not loading**: Run `npx cap sync android` after any web build
