# Bhumi Nursing College Android App

This is a complete Android Studio/Gradle project. It opens the live Bhumi Nursing College website in a native Android WebView with JavaScript and Supabase support.

## Run
1. Open this `android-app` folder in Android Studio.
2. Let Gradle sync.
3. Run the `app` configuration on an Android phone/emulator.

## Build APK
`gradle :app:assembleDebug`

GitHub Actions workflow `.github/workflows/build-apk.yml` also builds the debug APK automatically.

The app points to:
https://bhuminursingcollege-beige.vercel.app/

If the production domain changes, update `HOME_URL` in `MainActivity.java`.
