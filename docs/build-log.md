# OverlayKit build log

## Environment
- Host: Windows, PowerShell
- Node v26.13.1, npm 11.19.1, git 2.56.1.windows.1
- create-expo-app 5.0.0
- ANDROID_HOME=E:\Android\Sdk, adb 1.0.41
- Java: not on PATH, JAVA_HOME unset. Android Studio JBR exists at C:\Program Files\Android\Android Studio\jbr (openjdk version "25.0.3" 2026-04-21)

## Build decision
Local Android builds (Gradle via `npx expo prebuild` / `npx expo run:android`). No EAS Build. Recorded in .kiro/steering/build-approach.md.

## Commands run
1. `git status` -> not a git repository; directory empty.
2. `npx create-expo-app@latest . --template default --yes --no-agents-md` (template default@sdk-58; ran `npm install` itself; it also created a git repo with commit acdecdf "Initial commit").
3. Removed template demo code (tabs, components, hooks, constants, scripts, web assets, LICENSE, .vscode, expo.icon). Wrote minimal src/app/_layout.tsx (Stack) and src/app/index.tsx (placeholder Home with Translate/Explore/Guide chips).
4. Edited app.json: removed `web` block, set platforms android/ios, package/bundleIdentifier com.overlaykit.app (placeholder, confirm before release). Edited package.json: removed `web` and `reset-project` scripts, added `typecheck`.
5. `npx tsc --noEmit` -> exit 0 (tsconfig strict: true).
6. `npx expo-doctor` -> 20/20 checks passed.
7. `npx expo install --check` -> dependencies up to date.
8. `npx expo export --platform android` -> exit 0, Hermes bundle produced.
9. `adb devices` -> no devices listed.

## Versions (generated, unchanged)
expo 58.0.26, expo-router 58.0.32, react-native 0.88.1, react 19.3.0, typescript 6.0.3

## Initial commit
acdecdf (create-expo-app template commit); 238b208 (scaffold commit, this log amended in the following commit).

## Unresolved
- Android device validation pending: no phone attached to adb; app never run on a device.
- Java not on PATH. Set JAVA_HOME to the Android Studio JBR before `expo run:android`.
- Gradle/native build (`expo run:android`) not yet attempted.
- `npm install` reported 3 moderate audit vulnerabilities (not addressed).
- Template dependencies retained but unused: react-native-web, react-dom, @expo/ui, expo-glass-effect, expo-symbols, expo-image, expo-device, expo-web-browser, reanimated/worklets/gesture-handler. Pruning deferred.
- Template's pre-existing commit acdecdf was created by create-expo-app, not by us.


## 2026-11-17: quality gate, e2e tooling, first native build attempt

Commands run (Windows, PowerShell, repo root):

1. `npx expo install jest-expo jest @types/jest eslint eslint-config-expo "--" --dev` and then `... "--" --save-dev`. Both times only `eslint` landed in `devDependencies`, so the rest were moved with `npm install --save-dev "jest-expo@~58.0.15" "jest@~30.5.2" "@types/jest@30.0.0" "eslint-config-expo@~58.0.4"`, keeping the versions `expo install` picked.
2. `npm install --save-dev e2e @e2e-dev/mobile` → e2e 0.23.1, @e2e-dev/mobile 0.12.7, agent-device 0.21.37. `npm audit` now reports 22 moderate findings (was 3), not yet reviewed.
3. `npx expo prebuild --platform android --no-install` → created `android/` (gitignored) and changed the `android`/`ios` scripts to `expo run:android`/`expo run:ios`. Gradle wrapper: 9.4.1.
4. Background: `$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'; .\android\gradlew.bat -p android assembleRelease --console=plain`. Gradle downloaded, configured, and compiled native code for 4 ABIs. The process then **exited without printing an exit code and without producing an APK** (no `*.apk` under `android/app/build/outputs`). Cause unknown: the session was interrupted while it ran. Not retried.
5. `npm run typecheck`, `npm run lint`, `npm test` (40 tests), `npm run verify` → all exit 0. Deliberate break and restore recorded in `docs/kiro-evidence.md`.
6. `npx e2e mcp --help` (telemetry off) → flags `--target`, `--max-sessions` confirmed on 0.23.1.

Unresolved from this round:
- Release APK not built; e2e smoke test (`e2e/smoke.e2e.ts`) never run. `npx e2e doctor --target android` not run.
- `adb devices` lists no phone. One AVD exists: `Resizable_Experimental` (Android 37.2, x86_64, 16 KB pages).
- `.kiro/settings/mcp.json` not created: Kiro's permission rules block agent writes there (D-025).
