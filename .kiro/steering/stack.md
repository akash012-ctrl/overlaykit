---
inclusion: always
---

# Stack

- Expo SDK 58, React Native 0.88, React 19.3, Expo Router (file routes in `src/app`), TypeScript 6 with `strict: true`. `package.json` and `package-lock.json` hold the versions. Never guess or hand-edit a version.
- Platforms: Android (tested) and iOS (compiles only). No web: no `.web.tsx` files, no `web` block in `app.json`, no `react-native-web` usage.
- Builds: local Gradle only, as described in `build-approach.md`. No EAS.
- Scripts: `npm run typecheck`, `npm run lint`. `npm test` arrives in G0.

## Adding a dependency

1. Ask the owner first, naming the gate task that needs it. No speculative "might need later" packages.
2. Check the official docs or repo: it must be maintained and must support SDK 58 and RN 0.88 with the New Architecture. Cite the source you checked.
3. Install with `npx expo install <pkg>`, so SDK packages and native libraries get SDK-58-compatible versions. Use `npm install -D` only for dev-only tools that `expo install` doesn't cover.
4. Run `npx expo install --check` and `npx expo-doctor`.
5. Remove packages that end up unused.

These need a new entry in `docs/DECISIONS.md` first: auth or login SDKs, analytics or ads, cloud OCR or vision, LLM SDKs, ARCore/ARKit, state-management libraries, UI kits.

## Native code

- Camera frame access and on-device OCR need a development build (`expo-dev-client`). They don't run in Expo Go.
- After adding or updating a native package, or changing `app.json`: run `npx expo prebuild --clean`, then `npx expo run:android --device`.
- `android/` and `ios/` are generated and gitignored. Change native settings through `app.json` or config plugins, never by editing the generated folders.
- If no OCR binding works, the fallback is a local Expo Module in Kotlin around ML Kit (D-005).

Unused template packages are listed in `docs/build-log.md` and get reviewed in G0. Don't start depending on one without asking.
