---
inclusion: always
---

# OverlayKit build approach

- Build Android locally with the Android toolchain (Gradle via `npx expo prebuild` and `npx expo run:android`). Do not use EAS Build, `eas build`, or `eas.json` for this project.
- Development host is Windows. First physical target is an Android phone (USB debugging, `adb`).
- Native folders (`/android`, `/ios`) are generated and gitignored. Regenerate with `npx expo prebuild`.
- Do not add EAS configuration or cloud build steps unless the user asks.
