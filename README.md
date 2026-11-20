# OverlayKit

OverlayKit is an Android camera app for standing in front of a machine or sign whose text you don't read well. Point the camera at it. The app draws translations over the text. Say or tap what you want to do, and it suggests one step at a time and highlights the text to use.

Status: **hackathon build, device validation pending.** Nothing has been measured on the owner's phone yet. See [What is and isn't tested](#what-is-and-isnt-tested).

## What it does

| Mode | What you do | What you see |
| --- | --- | --- |
| Translate | Point the camera at text. No button: the app reads about once a second. | A dark translation chip on each line, sliding with the text as the picture updates. Tap the shutter to hold the view and see every label with its state (translated, pending, failed or unsupported). |
| Explore | Tap a chip. | That line's translation and state. The app does not say what a control does. |
| Guide | Say what you want (one tap on the mic) or tap a line. The camera reads on its own. | One suggested step at a time, read aloud, with a target ring on the text to use. The next step shows after the camera sees the expected change twice in a row, or after you tap Done. |

Guide works on any machine. There is no list of known machines.

**Plans are AI suggestions and can be wrong.** Every step is labelled "AI suggestion" with the note "This may be wrong. Check the machine." The app never says a step is verified or correct. It only highlights text that the camera actually read, and if a step names text it cannot find, it shows no highlight. It never presses anything on the machine. It never moves on a timer. If it cannot plan, it says so and offers Translate and Explore.

The highlights are flat 2D boxes drawn on the camera image at the position of recognized text. They are not augmented reality and not world tracking.

## Two planners

You choose who plans the steps, in Settings. The default is on the phone.

| Planner | Where it runs | What leaves the phone |
| --- | --- | --- |
| **On this phone** (default) | Gemma 4 E2B, run by Google's LiteRT-LM inside the app | Nothing for planning. The model file is downloaded once, only after you tap Download (about 2.6 GB, checked with SHA-256). The download sends none of your data. |
| **Gemini Live** (optional, off by default) | Google's servers, using your own Google API key | Camera frames (about one per second, scaled down), microphone audio, your goal text, and the text lines the camera read. This starts only after you accept a consent screen and tap "Start Gemini Live" in Guide. While it runs, a "Streaming to Google" banner with a Stop button stays on screen. Nothing is saved on the phone. |

Gemini Live is not on-device and does not work offline. The app never switches to it by itself. Google keeps what it receives under the terms of your key, and the app cannot see or delete it there. With a free-tier key Google may use the content to improve its products.

## Privacy

**No image leaves the phone unless you turn on Gemini Live.** Reading text (OCR) runs on the phone. There are no accounts, no login, no analytics, no ads and no tracking.

- With the on-device planner, no image, audio or planning text goes to any server.
- Translation sends recognized **text only** to a translation service. It never sends an image.
- Voice goals use Android's speech recognizer. The microphone permission is asked only when you tap the mic button. Where the phone has no on-device language pack, Android may send the audio to Google's recognition service. The app records and stores no audio. Tap input always works.
- Your Google API key (for Gemini Live) is stored in Android's secure storage, shown masked, removable, and sent only to `generativelanguage.googleapis.com`.

## Languages

| | English | Hindi | Kannada |
| --- | --- | --- | --- |
| App text | Yes | Yes, machine-written, not reviewed by a fluent speaker | Yes, same |
| Camera reads this text | Yes | Yes | **No** |
| Translation into it | Yes | Yes | Yes |
| Voice goal input | If your phone's recognizer supports it | Same | Same |
| Read-aloud | If your phone has a voice for it | Same | Same |

Hindi and Kannada app text and step text have not been reviewed by a fluent speaker. **Hindi and Kannada planning quality is unmeasured.** Kannada text in the camera image cannot be read: the app shows an "unsupported script" note.

## What is and isn't tested

- **Android only.** The reference phone is a Redmi Note 12 Pro 5G (Android 14). iOS is not built and not tested.
- The only recorded device result is a debug build that launched on that phone (DT-G0-01 in [docs/DEVICE-TESTS.md](docs/DEVICE-TESTS.md)). **Every other device test is NOT TESTED**, including all twelve for the any-machine Guide (DT-G5-01 to DT-G5-12).
- Not measured yet: how long the model takes to load, time per step, memory, battery, round trip with Gemini Live, OCR recall, translation quality, and Hindi and Kannada planning quality. No numbers are claimed.
- The Gemma 4 E2B model (2.6 GB) may not run on a phone with about 5.7 GB of RAM. This is unmeasured. If the phone cannot load it, the app shows "This phone can't run the planner" and offers Translate and Explore.
- Translation uses Google ML Kit on-device translation (a language pair needs a network the first time, to download its model of about 30 MB). Seen on the reference phone in a debug build (agent screenshots, 2026-11-20, a mock Hindi and English machine page on a laptop screen): Hindi lines got English chips that refreshed on their own. Quality is not rated; a mis-read word gives an odd translation.
- Also seen in those screenshots: Guide goal lines appearing without a tap, and the downloaded model reading as ready when Guide opens. Not seen yet: a planned step from Gemma on the phone, a voice goal, spoken steps, and the release build. Labels refresh about once a second; they are 2D marks on the latest frame, not tracking.
- The release APK is debug-signed, so it is for testing on your own phone. There is no store release.

## Install and build

Requirements: Windows or another host with Node.js, the Android SDK, JDK (Android Studio's bundled JDK works) and a phone with USB debugging. Builds are local with Gradle. There is no EAS or cloud build.

```powershell
npm install
npx expo prebuild --clean          # generates android/ (gitignored)
npx expo run:android --device      # debug development build on a connected phone
npx expo run:android --device --variant release   # release build
```

The camera, OCR and on-device planner need a development build. They do not run in Expo Go. A release APK link is not published yet.

Checks the project uses: `npm run typecheck`, `npm run lint`, `npx expo-doctor`, `npm test`. The test suite exists, but the owner has not asked for it to be run in this phase, so this README reports no test result.

## Models, licences and notices

- **OverlayKit** is MIT licensed. Copyright (c) 2026 Akash Singh. See [LICENSE](LICENSE).
- **Gemma 4 E2B** (`gemma-4-E2B-it.litertlm`), used as the default on-device planner. Model by Google, licence **Apache-2.0**. Source: [litert-community/gemma-4-E2B-it-litert-lm](https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm) and the [Gemma 4 E2B model card](https://huggingface.co/google/gemma-4-E2B-it). The app does not bundle the file. It downloads it on your tap.
- **Gemma 3 1B IT int4** (`gemma3-1b-it-int4.litertlm`) is an optional small fallback. It is **sideload only**: the file is gated, the app does not download it, and this project does not distribute it. If you put it on your phone yourself, it is used under the [Gemma Terms of Use](https://gemma.ai/resources/terms), which you must accept, together with the Gemma Prohibited Use Policy. Gemma is provided under and subject to the Gemma Terms of Use found at gemma.ai/resources/terms. Do not share this file or an app build that includes it without reading those terms first.
- **LiteRT-LM** (Google AI Edge) runs the on-device model.
- **Gemini Live** is a Google service. You use it with your own Google API key and under Google's terms. This project is not endorsed by Google.
- **Google ML Kit** provides on-device text recognition and translation.
- Other open-source packages keep their own licences (see `package.json`).

## Repository layout

`src/app` holds thin routes. `src/modules/*` holds the modules, each with a public `index.ts`: `capture`, `ocr`, `geometry`, `locale`, `planner`, `guide`, `speech`, `shared` and `ui`. Native Kotlin modules are in `modules/` (`overlaykit-ocr`, `overlaykit-translate`, `overlaykit-llm`, `overlaykit-live`). Visual design rules: [.kiro/skills/ui-design-system/SKILL.md](.kiro/skills/ui-design-system/SKILL.md). Design: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Contract: [docs/PRODUCT.md](docs/PRODUCT.md). Decisions: [docs/DECISIONS.md](docs/DECISIONS.md). Gates: [docs/QUALITY-GATES.md](docs/QUALITY-GATES.md). Device tests: [docs/DEVICE-TESTS.md](docs/DEVICE-TESTS.md).
