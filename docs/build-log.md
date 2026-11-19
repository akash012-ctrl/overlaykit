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

## 2026-11-19: phone connected, first B1 attempt (FAILED)

Phone: Xiaomi Redmi Note 12 Pro 5G (`22101316I`), Android 14 (API 34). `adb devices -l` first listed nothing; after the owner turned on USB debugging it listed `ovlrcy4lswwkjnxo device product:ruby_in model:22101316I`. Details in `docs/DEVICE-TESTS.md`, Reference device.

Commands run (Windows, PowerShell, `JAVA_HOME=C:\Program Files\Android\Android Studio\jbr`, `CI=1`, `EXPO_NO_TELEMETRY=1`):

1. `npx expo run:android --help` and `npx expo prebuild --help`: confirmed `-d, --device [device]` and `--variant <name>` (default `debug`) on SDK 58. This closes the to-do item "confirm `npx expo run:android` flags".
2. `npx expo prebuild --clean --platform android --no-install` → exit 0 (`android/` regenerated, gitignored).
3. `npx expo run:android --device 22101316I` → exit 1 after `BUILD FAILED in 8m 21s`. Gradle built only `arm64-v8a` (`-PreactNativeArchitectures=arm64-v8a`). The failing task was `:app:buildCMakeDebug[arm64-v8a]`:
   ```
   ninja: error: Stat(rngesturehandler_codegen_autolinked_build/CMakeFiles/react_codegen_rngesturehandler_codegen.dir/E_/project/overlaykit/node_modules/react-native-gesture-handler/shared/shadowNodes/react/renderer/components/rngesturehandler_codegen/RNGestureHandlerDetectorShadowNode.cpp.o): Filename longer than 260 characters
   ```
   **Cause:**
   - The build uses the Android SDK's CMake 3.22.1, the only CMake installed. It ships Ninja 1.10.2, which rejects paths longer than 260 characters.
   - `HKLM\SYSTEM\CurrentControlSet\Control\FileSystem\LongPathsEnabled` is 0.
   - The object path above is 270 characters, because it contains the project path `E_/project/overlaykit`. It belongs to `react-native-gesture-handler` 3.3.0, which `expo-router` depends on.
   - This is the issue in the Expo guide "Filename longer than 260 characters error on Windows" (https://docs.expo.dev/troubleshooting/windows-long-paths/, page dated 2 Nov 2026, read 2026-11-19).
4. Workaround tried: `subst O: E:\project\overlaykit`, then deleted `android/app/.cxx` and `android/app/build`, then `npx expo run:android --device 22101316I` from `O:\` → exit 1 after `BUILD FAILED in 1m 13s`. The error was at `settings.gradle` line 32: `expo-modules-autolinking failed: Error: Couldn't find "package.json" up from path "O:\android"`. `findPackageJsonPathAsync` in `expo-modules-autolinking/build/commands/autolinkingOptions.js` stops before it checks a drive root, so a project at a drive root can't build. `subst O: /D` removed the mapping afterwards. A `subst` of `E:\project` (giving `O:\overlaykit`) would shorten the object path to 262 characters, still over the limit, so it wasn't tried.
5. `.\android\gradlew.bat -p android --stop` → 1 daemon stopped.

**B1: FAILED.** Nothing was installed (`adb shell pm list packages com.overlaykit.app` returned nothing).

Fix options (from the Expo guide above; none applied yet):
- **Recommended:** install CMake 3.31.6, which includes Ninja 1.12.1, from Android Studio's SDK Manager (SDK Tools → CMake). `sdkmanager` isn't installed, because `E:\Android\Sdk\cmdline-tools` is missing. Then add `android.cmakeVersion=3.31.6` to `%USERPROFILE%\.gradle\gradle.properties`, which is outside the repo, so no project or EAS change is needed. Then set `LongPathsEnabled=1` as administrator and restart Windows. Ninja 1.12 needs both.
- **Or:** move or clone the repo to a short path. A root of at most 11 characters, such as `E:\ok`, keeps today's longest object path at or under 260. The native packages added in G1a may need more room.

## 2026-11-19: B1 after the long-path fix (build and install PASSED)

Host changes, made by the owner: CMake 3.31.6 installed through Android Studio's SDK Manager. `LongPathsEnabled` set to 1, then Windows restarted (last boot 2026-11-19 19:51). Checked by the agent: `E:\Android\Sdk\cmake\3.31.6\bin\ninja.exe --version` → 1.12.1, and the registry value reads 1. CMake 4.1.2 is also installed, but nothing uses it.

Commands run (same environment as the earlier entry):

1. Added `android.cmakeVersion=3.31.6` to `%USERPROFILE%\.gradle\gradle.properties`, outside the repo, as the Expo guide describes. The old file was backed up as `gradle.properties.bak-20261119`. Then deleted `android/app/.cxx` and `android/app/build`.
2. `npx expo run:android --device 22101316I` → `BUILD SUCCESSFUL in 4m 23s`. CMake ran from `E:/Android/Sdk/cmake/3.31.6`. Output: `android/app/build/outputs/apk/debug/app-debug.apk`, 82.3 MB, arm64-v8a only. The install then failed with `INSTALL_FAILED_USER_RESTRICTED: Install canceled by user`, because HyperOS asks on the phone before each USB install and the prompt wasn't accepted in time. Exit 1.
3. `npx expo run:android --device 22101316I --binary android\app\build\outputs\apk\debug\app-debug.apk` → installed, opened `overlaykit://?__expo_url=http%3A%2F%2F192.168.1.101%3A8081…`, and Metro logged `Android Bundled 6996ms node_modules\expo-router\entry.js (1449 modules)`.
4. Agent checks on the phone:
   - `adb shell pm list packages com.overlaykit.app` → `package:com.overlaykit.app`.
   - `adb shell pidof com.overlaykit.app` → 30691.
   - `dumpsys activity` → `topResumedActivity=… com.overlaykit.app/.MainActivity`.
   - `adb reverse --list` → `tcp:8081 tcp:8081`.
   - `uiautomator dump` text nodes: `OverlayKit`, `Camera language assistant (placeholder)`, `Translate`, `Explore`, `Guide`.
   - `adb logcat --pid … *:E` → only two `FileUtils: err write to mi_exception_log` lines. These are HyperOS system logging; there is no React Native error.

**B1: the build, install and launch passed.** DT-G0-01, which needs a tester to confirm the screen, is recorded in `docs/DEVICE-TESTS.md`.

## 2026-11-19: App icon and splash

The owner asked for a better icon than the Expo template icon. The template art (Expo's chevron mark on a blue grid) is Expo's, not ours, so replacing it also removes third-party art from the app.

- **Generator:** `scripts/make-icons.mjs`, plain Node with only `node:` built-ins (`zlib.deflateSync`, `zlib.crc32`). No new dependency. Each shape is a signed distance function, which gives antialiased edges. The output is deterministic: a re-run gave byte-identical files (`Get-FileHash` before and after). The art is self-authored, with no AI image tool and no third-party artwork.
- **The mark:** white camera-viewfinder corners around a line of text in an amber outline (`#FFD54F`, the app's Source_Outline colour), with a teal (`#2DD4BF`) translation label pointing up at it, on a navy gradient (`#1E4470` to `#0A1628`).
- **Files written:** `assets/images/icon.png`, `android-icon-background.png`, `android-icon-foreground.png`, `android-icon-monochrome.png`, `splash-icon.png`. All are 1024 × 1024 RGBA. They replace the template files, which were 1024, 512, 512, 432 and 228 × 213 px.
- **Adaptive icon safe zone:** Android shows the middle 66 of 108 dp on every mask shape, which is a 313 px radius on a 1024 px layer. The farthest visible pixel of the foreground and monochrome layers is 303 px from the centre, measured with System.Drawing. In the monochrome (themed-icon) layer, the label text is cut out to transparent.
- **`app.json`:**
  - `android.adaptiveIcon.backgroundColor` changed from `#E6F4FE` to `#14304F`. The background image is still used; the colour is the fallback.
  - The `expo-splash-screen` `backgroundColor` changed from `#208AEF` to `#0B0F14`, the app's screen colour, so the splash doesn't flash blue.
  - `imageWidth` changed from 76 to 120.
- **Commands:**
  - `node scripts/make-icons.mjs` → exit 0. The first `npm run verify` failed with 11 `no-undef` errors for `Buffer` in the script; it now imports `Buffer` from `node:buffer`, and `npm run verify` passes.
  - `npx --yes expo-doctor` → 20/20 checks passed.
  - Stopped the earlier Metro process on port 8081.
  - `npx expo prebuild --clean --platform android --no-install` → exit 0.
  - `npx expo run:android --device 22101316I` → `BUILD SUCCESSFUL in 3m 45s`, installed (owner accepted the HyperOS install prompt; `lastUpdateTime=2026-11-19 20:11:32`), opened, `Android Bundled 1581ms`.
- **Generated resources:** `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml` lists background, foreground and monochrome layers, and `colors.xml` has `splashscreen_background #0B0F14` and `iconBackground #14304F`.
- **Not yet seen by a person:** how the icon looks on the phone's launcher, with HyperOS's mask and themed icons, and how the splash looks.

## 2026-11-19: Spec 01 release and privacy checks (tasks 12.1 to 12.3)

- **12.1 Debug code in the release bundle.** 
px expo export --platform android --output-dir .scratch/export-check exit 0 (Hermes bytecode, one `.hbc` file). Searched the bytes for `OVERLAYKIT_DEBUG_ONLY`, `Fail next`, `withFaultInjection`, `SnapshotExportButton`, `ocr-snapshots`, `overlaykit.ocr-snapshot` and `SNAPSHOT_WRITE_FAILED`: no matches. A first run found `ocr-snapshots` because the `require` sat after an early `return`, so Metro kept the module. The accessors in `capture/index.ts` and `ocr/index.ts` now put the `require` inside `if (__DEV__)`. Positive control: `npx expo export --platform android --dev --no-bytecode` contains `OVERLAYKIT_DEBUG_ONLY` and `Fail next`. Source comments are stripped from bundles, so each debug file exports a `DEBUG_MARKER_*` constant holding the marker.
- **12.2 Network, keys, logs.** Searched non-test files in `src/modules/capture`, `ocr` and `geometry` for `fetch`, `XMLHttpRequest`, `WebSocket`, `axios`, `http://`, `https://`: no matches. Searched `src` for `console.`: no matches, so no OCR text is logged. `src/modules/locale` mentions `openrouter` and `apiKey` in `route-table.ts` and `service.ts`. That is spec 02 (translation) work, not reviewed here.
- **12.3 Merged manifest: partly checked.** Source: the existing debug merge `android/app/build/intermediates/merged_manifests/debug/processDebugManifest/AndroidManifest.xml` (built 21:04 today). I did not run `prebuild --clean` or a release build. Permissions: `CAMERA` (the camera), `INTERNET` (translation text only, spec 02), `VIBRATE` (RN core), `ACCESS_NETWORK_STATE` (RN core, expo network), `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE` (both `maxSdkVersion=32`, added by a library), `SYSTEM_ALERT_WINDOW` and `ACCESS_LOCAL_NETWORK` (dev client, debug builds), `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` (app-own). The release merge is still to be listed; the two storage permissions need a source and a justification or a `blockedPermissions` entry (owner decision, Q9).

- **12.3 Release manifest (follow-up, same day).** `JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'; android\gradlew.bat :app:processReleaseMainManifest` exit 0. Merged file: `android/app/build/intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml` (library merge, not the final APK manifest). Permissions: `CAMERA` (camera), `INTERNET` (text-only translation), `VIBRATE` and `ACCESS_NETWORK_STATE` (RN and Expo core), `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE` (`maxSdkVersion=32`), `SYSTEM_ALERT_WINDOW`, `com.overlaykit.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` (app-own, RN). **Not justified yet:** the two storage permissions and `SYSTEM_ALERT_WINDOW` are present in the release merge. The app writes no shared media and draws no system overlay. Q9 needs an owner decision: block them with `android.blockedPermissions` in `app.json`, or justify them. Task 12.3 stays open. I did not edit `app.json`.
- **Scope change (owner, 2026-11-19).** No TM-01 fixture content is used. Spec 01 tasks 14.2 (export TM-01 and CARD snapshots), 15 (thresholds from those snapshots) and 16 (G1 measurements on them) have no input now. They stay open and are not claimed.
