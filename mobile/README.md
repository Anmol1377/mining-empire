# Mining Empire — Android app

Wraps the web game (`../`) into a native Android app using [Capacitor](https://capacitorjs.com/). Same game code, packaged for Play Store.

The folder contains:

- `package.json` — Capacitor + plugins
- `capacitor.config.json` — bundle ID, splash, status bar
- `assets/icon-only.png` — source for generating app icons (Android adaptive + legacy)
- `assets/splash.png` — source for generating splash screens
- `android/` — **generated** native project (created by `npx cap add android`)

## Prerequisites (one-time machine setup)

| Tool | Required version | Get it |
|---|---|---|
| Node.js | 20+ | <https://nodejs.org> |
| Android Studio | 2024.1+ | <https://developer.android.com/studio> |
| JDK | 17 | bundled with Android Studio |
| Google Play Developer account | $25 one-time | <https://play.google.com/console> |

After installing Android Studio, open it once and use the SDK Manager to install:
- Android SDK Platform 34 (or latest)
- Android SDK Build-Tools (latest)
- Android SDK Command-line Tools
- Android Emulator (optional, for testing without a physical device)

## First-time setup (~10 min)

From this `mobile/` directory:

```bash
# 1. Install Capacitor dependencies
npm install

# 2. Build the web app first (so dist/ exists in the parent)
npm run build:web

# 3. Add the Android native project
npx cap add android

# 4. Generate app icons + splash screens from assets/
npm run assets

# 5. Sync the web bundle into the native project
npx cap sync android
```

After step 3 you'll have an `android/` folder that is a real Android Studio project.

## Day-to-day workflow

Whenever the web code in `../src/` changes, re-sync:

```bash
npm run sync           # builds web + copies into android/
```

To open Android Studio:

```bash
npm run open:android
```

To run on a connected device or emulator (auto-syncs first):

```bash
npm run run:android
```

## Customizing icons + splash

The asset pipeline reads from `assets/`:

- **`assets/icon-only.png`** — app icon. **Recommended 1024×1024 PNG, square, with transparency.** Currently using `mine-logo.png` (550×606), which will be scaled up — works but won't be crisp. Replace with a square 1024×1024 export when you have one.
- **`assets/splash.png`** — splash screen. **Recommended 2732×2732 PNG, square, with the logo centered in the middle 1366×1366 safe zone.** Currently using `spalsh-screen.png` (684×949), which is non-square and small — will be padded with `#0b1020` (the app background) but the centered logo may look small.
- **`assets/icon-foreground.png`** + **`assets/icon-background.png`** (optional) — for Android adaptive icons. The foreground sits inside a 432×432 area; the background is a flat color or pattern. If you don't provide these, the generator falls back to `icon-only.png`.

After updating assets, regenerate:

```bash
npm run assets
npx cap sync android
```

## Building the Play Store release (.aab)

1. **In Android Studio**, open `android/` (or run `npm run open:android`).
2. **Update version** if needed: edit `android/app/build.gradle` → `versionCode` (integer, increment every release) + `versionName` (e.g., `1.0.0`).
3. **Generate a signing key** (one-time, **store it somewhere safe and back it up**):
   ```bash
   keytool -genkey -v -keystore mining-empire-release.keystore \
     -alias mining-empire -keyalg RSA -keysize 2048 -validity 10000
   ```
   Move the `.keystore` file outside the repo (`~/keystores/`). Never commit it.

4. **Wire the keystore into Gradle.** Create `android/keystore.properties` (gitignored):
   ```
   storeFile=/Users/cepl/keystores/mining-empire-release.keystore
   storePassword=YOUR_STORE_PASSWORD
   keyAlias=mining-empire
   keyPassword=YOUR_KEY_PASSWORD
   ```
   Then in `android/app/build.gradle` inside `android { ... }`, add (above `defaultConfig`):
   ```gradle
   def keystoreProperties = new Properties()
   keystoreProperties.load(new FileInputStream(rootProject.file("keystore.properties")))

   signingConfigs {
       release {
           storeFile file(keystoreProperties['storeFile'])
           storePassword keystoreProperties['storePassword']
           keyAlias keystoreProperties['keyAlias']
           keyPassword keystoreProperties['keyPassword']
       }
   }
   ```
   And inside `buildTypes.release { ... }` add: `signingConfig signingConfigs.release`.

5. **Build the App Bundle** in Android Studio: menu → **Build → Generate Signed Bundle / APK** → **Android App Bundle** → select your keystore → release variant → Finish. Output: `android/app/release/app-release.aab`.

6. **Upload to Play Console**:
   - <https://play.google.com/console> → Create app
   - App name: Mining Empire
   - Category: Games
   - **Internal testing** track is the fastest path to "running on real devices" (no review wait) — set this up first
   - Upload the `.aab`
   - Fill out: privacy policy URL, content rating questionnaire, data safety section (you collect game state + optional display name + URL via Supabase)
   - Production track requires a full review (~24–72 hours for first submission)

## What the app contains

The Android app loads the exact same web bundle (`../dist/`) inside a native WebView. All features work:

- Mining, upgrades, auto-drill, save/load
- Cloud sync (manual ☁ Save button) — hits your Supabase project the same way
- Hall of Fame
- Export / Import (Android shares the file with the device's file picker)
- PWA service worker still active = offline play

Touch controls work natively (Phaser pointer events → touch events). The cursor hammer is hidden on touch devices automatically by the OS (no mouse).

## Permissions

Default Capacitor Android app declares **no permissions**. You don't need any for the current feature set (network is automatic for HTTPS requests, no special manifest entry).

If you later add features like:
- Push notifications → declare `POST_NOTIFICATIONS` (Android 13+)
- File picker for Import → already works without permission via `<input type="file">`
- Sharing the save file → Capacitor Share plugin handles it without manifest changes

## Privacy policy (required for Play Store)

You need a publicly hosted privacy policy URL. Minimal template:

> Mining Empire stores your game progress locally on your device.
> Optionally, when you click "Save to cloud" or join the Hall of Fame,
> your game state, chosen display name, and chosen URL are sent to a
> Supabase database identified only by a random ID generated on your
> device. We do not collect email, phone, or device identifiers.
> Data is retained until you reset the save or until manual deletion.

Host it as a static page (e.g., a Gist, your GitHub Pages site, or a Notion public doc). Paste the URL into the Play Console.

## Troubleshooting

**`Error: Cannot find module '@capacitor/android'`** — run `npm install` in this folder.

**`The path to the SDK was not found`** — set `ANDROID_HOME` env var or create `android/local.properties` with `sdk.dir=/path/to/Android/sdk`. Android Studio usually creates this automatically the first time you open the project.

**App opens to a blank/white screen** — `webDir` in `capacitor.config.json` points to `../dist`, which only exists if you ran `npm run build:web` first. Re-run `npm run sync`.

**Hammer cursor visible on phone** — shouldn't happen (Phaser only renders it on pointermove, which fires once on touch then stays). If it does, file a note and I'll add a touch-device detector.

**Splash screen flashes white before dark background** — adjust `android/app/src/main/res/values/styles.xml` background to `#0b1020`. The generator should already do this for you.
