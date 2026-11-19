# OverlayKit: quality gates

Status: **draft, awaiting approval** (2026-11-17)

A gate passes only with evidence: command output in the build log, or a device test record in [DEVICE-TESTS.md](DEVICE-TESTS.md) with build commit, device, and date. Thresholds marked *(proposed)* get confirmed or adjusted once, after the G1 spike measures a baseline. After that they don't change silently. Any change is logged in DECISIONS.md.

Gate order: **G0 → G1 → G2 → G3 → G5 → RC.** G4 was replaced by G5 (D-043). Work on a later gate may start early (for example, fixture authoring), but a later gate can't pass before the earlier ones.

## Static gates (every commit from G0 on)

| ID | Check | Command | Pass |
| --- | --- | --- | --- |
| Q1 | TypeScript, strict | `npm run typecheck` | Exit 0 |
| Q2 | Lint | `npm run lint` | Exit 0, no warnings in `src/modules` |
| Q3 | Expo project health | `npx expo-doctor` | All checks pass |
| Q4 | Module boundaries | Restricted-imports lint rule (part of Q2) | No forbidden or deep imports (ARCHITECTURE.md §5) |
| Q5 | Unit tests | `npm test` (added in G0) | All pass |
| Q6 | SDK-compatible versions | `npx expo install --check` | Up to date |
| Q7 | No secrets in app | Search `src/` and the output of `npx expo export --platform android` for key patterns | No matches |
| Q8 | No web or login code | Search dependencies and `src/` for web-only and auth packages | None present |
| Q9 | Permissions | After `npx expo prebuild`, inspect the merged Android manifest | Only `CAMERA`, `INTERNET`, `RECORD_AUDIO` (D-046, asked only on the first mic tap), and permissions required by Expo/RN core, each one listed and justified |

## Build gates

| ID | Check | Pass |
| --- | --- | --- |
| B1 | Debug development build: `npx expo prebuild --clean`, then `npx expo run:android --device` | Installs and launches on the reference phone |
| B2 | Release build: `npx expo run:android --device --variant release` | Installs, launches, no dev menu, no red-box errors |

Performance and device gates are measured on **B2 release builds**. Debug builds are slower and give misleading numbers.

## Error-state gates

| ID | Requirement |
| --- | --- |
| QE-1 | Every error code in ARCHITECTURE.md §8 has a unit test showing that the owning module produces it and that `ui` maps it to the specified state. |
| QE-2 | Every user-visible error state is reached at least once on the device, either in the gate tests or in the DT-ERR series (DEVICE-TESTS.md). Hard-to-trigger states use debug-only test hooks that are stripped from release builds. |
| QE-3 | No silent failure. Each label in an overlay is in exactly one state: translated, pending, failed, or unsupported. |

---

## G0: baseline on the device

- **AT-G0-01:** The scaffold Home screen renders on the reference phone in a debug build (B1).
- **AT-G0-02:** Same in a release build (B2).
- **AT-G0-03:** Q1 to Q9 run and pass. Q5 runs with at least one trivial test.
- **AT-G0-04:** Module folders and `index.ts` files exist with no logic. The boundary rule (Q4) fails on a deliberate forbidden import, and the test file is then removed.

**Stop:** If B1 can't run on the reference phone within half a day (JDK, SDK, or Gradle problems), stop feature work and fix the toolchain. Nothing after G0 is testable without it.

## G1: camera, OCR, and overlay geometry (top priority)

Fixtures: TM-01 panel (or its replica), an English text card, a Hindi text card, a Kannada text card, and a blank surface. Conditions are defined in DEVICE-TESTS.md.

| ID | Acceptance test | Pass *(proposed)* |
| --- | --- | --- |
| AT-G1-01 | Camera permission: grant, deny, and "don't ask again" paths | Each shows the state in ARCHITECTURE.md §8 |
| AT-G1-02 | Freeze-frame OCR recall on TM-01, head-on, normal indoor light, 40 to 80 cm | ≥ 90% of TM-01's listed English label strings recognized (after case and whitespace normalization), over 10 captures |
| AT-G1-03 | Overlay alignment on the still image | Each overlay's centre lies within 0.5 × line height of its source text's centre, measured on screenshots, for ≥ 95% of recognized lines |
| AT-G1-04 | Transform correctness | Unit tests on recorded OCR snapshots for the reference phone's capture size and preview size; overlays stay aligned at the 3 distances and 2 angles in DEVICE-TESTS.md |
| AT-G1-05 | Freeze-frame latency (release build, translation excluded) | Capture to overlays visible: p50 ≤ 1.5 s, p95 ≤ 3 s over 20 captures |
| AT-G1-06 | Live overlays (only if attempted) | OCR updates ≥ 2 per second; overlay jitter ≤ 0.25 × line height with the phone held still; 10 minutes of continuous use without crash, thermal shutdown, or steadily rising memory |
| AT-G1-07 | Hindi source text | ≥ 80% of lines on the Hindi card recognized as Devanagari text |
| AT-G1-08 | Kannada source text | Shows `OCR_UNSUPPORTED_SCRIPT` or `OCR_NO_TEXT`. Garbled Latin output must not appear as if it were real text. |
| AT-G1-09 | No text | Blank surface shows `OCR_NO_TEXT` within 2 s |
| AT-G1-10 | Offline | AT-G1-02 also passes in airplane mode, including the first launch after a fresh install (OCR model bundled, not downloaded at runtime) |
| AT-G1-11 | No images leave the phone | Code review: no network call in `capture` or `ocr`. Temporary still files are deleted after OCR (checked on the device). |

**Stop and pivot conditions**

- **No working OCR binding.** If no existing binding builds and runs with SDK 58 / RN 0.88 on the phone within 1 day, write a local Expo Module around ML Kit (1 more day). If that also fails, stop and re-plan with the user. One option is moving to an earlier SDK, which would need a new decision.
- **Low recall.** If AT-G1-02 is below 70% in good light, stop. Fix capture resolution, focus, or the fixture before starting G2. Translation on bad OCR proves nothing.
- **Live overlays miss their gate.** If AT-G1-06 fails after 1 day of tuning, ship freeze-frame only (D-011) and move on.
- **Kannada reading becomes required.** If reading Kannada script is declared a must-have, stop. The on-device options and schedule need a new decision (D-005).

## G2: translation

| ID | Acceptance test | Pass *(proposed)* |
| --- | --- | --- |
| AT-G2-01 | Provider evaluation recorded | DECISIONS.md entry with results for each D-007 criterion. Test set: all TM-01 strings plus 30 general sign and label strings. Pairs: en→hi, en→kn, hi→en, hi→kn. |
| AT-G2-02 | Quality | D-031: no fluent reviewers. The owner checks the test set for each pair and records the result and its limits. No quality percentage is claimed. If reviewers are added, the original rule applies: ≥ 80% of strings rated "correct and understandable". |
| AT-G2-03 | Rendering | Hindi and Kannada render in the correct script with no missing-glyph boxes, on the reference phone |
| AT-G2-04 | Fallbacks | Each `TR_*` state from ARCHITECTURE.md §8 shown on the device (offline, timeout, rate limit, provider error, unsupported pair) |
| AT-G2-05 | Same language | Text already in the target language isn't sent and is shown as-is |
| AT-G2-06 | No glossary | Code review plus test: a random string that appears in no fixture is either translated by the provider or shows a `TR_*` failure, never a canned result. No hard-coded translation tables outside UI strings and fixture content. |
| AT-G2-07 | Text only | Debug network inspection shows that proxy requests contain only the JSON in ARCHITECTURE.md §9, and that user-route requests to OpenRouter contain only the fixed prompt, the strings, the pinned model and the routing settings. No image data on either route. Size caps are enforced on both. |
| AT-G2-08 | Key not in app | Q7 passes against the release bundle |
| AT-G2-09 | Latency | Translating one frame's labels: p50 ≤ 2 s on Wi-Fi (cloud) or on the phone (on-device) |
| AT-G2-10 | Instruction injection (D-027, D-028) | A fixed set of injection strings, kept in `test-fixtures/`, is sent on both routes. Each comes back as a translation of that string or as a `TR_*` failure. None is obeyed, and the owner's check finds no output that adds text beyond a translation of its input. |
| AT-G2-11 | User OpenRouter key (D-028) | The key is saved only after `GET /api/v1/key` accepts it, is stored only in secure storage, is masked in Settings and can be removed. It appears in no log, crash output or export, and is sent only to `openrouter.ai`. On the phone, an invalid key shows `TR_KEY_INVALID` and a key with no credit shows `TR_NO_CREDITS`. |

**Stop and pivot conditions**

- **Kannada quality fails.** If no provider passes AT-G2-02 for Kannada pairs, stop and ask the user. Dropping or downgrading a contract language needs owner approval. It must not be hidden.
- **Backend can't be deployed in time.** Use an on-device provider if it passes AT-G2-02. If none passes, Translate ships showing its fallback states. No fake output. Users who save their own OpenRouter key still get the user route (D-028). Everyone else sees `TR_NOT_CONFIGURED`, and the README must say so.

## G3: component understanding (Explore)

| ID | Acceptance test | Pass *(proposed)* |
| --- | --- | --- |
| AT-G3-01 | TM-01 identified | ≥ 95% correct `verified` matches over ≥ 20 attempts at 3 distances and 2 angles |
| AT-G3-02 | No false matches | 0 matches to TM-01 across the negative set (≥ 10 other machines, panels, or photos, including similar ticket machines). **Hard requirement.** |
| AT-G3-03 | Ambiguity | Partial views with fewer than `minAnchors` anchors return `ambiguous` and behave as unverified |
| AT-G3-04 | Component location | ≥ 90% of TM-01 components located when in frame. Taps hit the right component in ≥ 95% of attempts. |
| AT-G3-05 | Explanations | Shown in the selected language from fixture content. Fixture validation test confirms all three locales and a review status for each (`unreviewed` allowed, D-031). |
| AT-G3-06 | Unverified machine | Tap shows translation plus "Not a verified machine". No component claims (D-010). |

**Stop and pivot conditions**

- **False matches.** If AT-G3-02 fails, raise the match thresholds. If true matches then drop below 80%, stop and choose with the user. One option is a printed marker on the TM-01 fixture to help identification.
- **No reviewers (D-031).** G3 can pass without reviewers. Hindi and Kannada content ships marked `unreviewed` and is disclosed as such. Nothing is described as reviewed.

## G5: any-machine Guide (replaces G4, D-043)

G4 needed the TM-01 fixture, which the owner dropped (D-043). Its tests AT-G4-01 to 08 are retired with it. G5 is defined by [spec 05 R14](../.kiro/specs/05-any-machine-guide/requirements.md). Status: **proposed, not approved, nothing has run.** Numeric thresholds are unset. Where an item names one, it says "set at task 14", and a DECISIONS.md entry comes before it gates anything. G5 is Passed only with records in [DEVICE-TESTS.md](DEVICE-TESTS.md) (rows DT-G5-01 to DT-G5-12). Machines are chosen by the owner. No fixture, no TM-01.

| ID | Kind | Acceptance test | Pass | Device row |
| --- | --- | --- | --- | --- |
| AT-G5-01 | Device | Three different real machines, Goal picked by tap | The app plans a first step, highlights a grounded target, and the owner can follow it. Each run recorded PASSED, FAILED or NOT TESTED, machine described by the owner. | DT-G5-01 |
| AT-G5-02 | Device | Advance rules on a real machine | A step advances on two consecutive `met` observations, and on Done. No advance on a timer over a 60 s idle run. | DT-G5-02 |
| AT-G5-03 | Device | Plan names text not on screen | `PL_TARGET_NOT_FOUND` shows, not a highlight. | DT-G5-03 |
| AT-G5-04 | Device | Airplane mode, model present | Planning works and no network request occurs during planning. The record says how this was observed. | DT-G5-04 |
| AT-G5-05 | Device | Voice Goal in English and in Hindi, if the phone supports them | Works where supported. An unsupported language shows `SP_LANGUAGE_UNSUPPORTED`. | DT-G5-05 |
| AT-G5-06 | Device | Pushed model file missing, wrong size, wrong checksum | Each is rejected with `PL_NO_MODEL`. The right file loads. | DT-G5-06 |
| AT-G5-07 | Device | Load time, time per step, peak memory, battery, on a **release** build | Measured and recorded. Thresholds: set at task 14, from these numbers, in a DECISIONS.md entry before they gate anything. | DT-G5-07 |
| AT-G5-08 | Review | Vision-safety review of code and text | No claim of "verified", "correct", "AR" or "world tracking". With Planner_Choice `on-device`, no image or text leaves the phone for planning. With `gemini-live`: the consent screen, banner, Stop and send gate as in R16 are present. | none (review record) |
| AT-G5-09 | Device | Gemini Live never turned on, then consent declined | A network trace of a full Guide run shows no connection to Google AI endpoints in either case. The record says how it was observed. | DT-G5-09 |
| AT-G5-10 | Device | Gemini Live on | Banner visible for the whole session. Stop ends the stream within a second. Backgrounding ends it. No file, gallery item or log line holds a frame, audio or the key. | DT-G5-10 |
| AT-G5-11 | Device | One real goal on a real machine with Gemini Live | The step is grounded on an exact OCR line, or `PL_TARGET_NOT_FOUND` shows. A bad key shows `PL_LIVE_AUTH`. Airplane mode shows `PL_LIVE_NETWORK` and Guide keeps on-device available. | DT-G5-11 |
| AT-G5-12 | Device | Gemma 4 E2B download on the phone | Progress, cancel, resume, SHA-256 mismatch rejected, enough-space check. The planner loads or shows `PL_UNSUPPORTED_DEVICE`. | DT-G5-12 |

**Unset thresholds (set at task 14, none invented here):** `PLAN_TIMEOUT_MS`, `MODEL_IDLE_RELEASE_MS`, `SCENE_OVERLAP_MIN`, `SCENE_LOST_TIMEOUT_MS`, `GOAL_NOT_SEEN_LIMIT`, `MAX_STEPS_PER_GOAL`, `LISTEN_MAX_MS`, capture cadence, backend (CPU or GPU), context size, output-token cap, `LIVE_IDLE_STOP_MS`, `LIVE_STEP_MAX_AGE_MS`. `LIVE_FRAME_INTERVAL_MS` is also set at task 14 and must not be below 1000 (R16.7).

**Not measured yet:** Hindi and Kannada planning quality, with either planner. Kannada text cannot be read from the camera (D-005), so Kannada is a UI, step-text and voice language only.

**Stop condition:** Any claim that a plan is verified or correct, any highlight on text OCR did not find, or any frame, audio or key sent or stored outside the D-050 rules blocks release until fixed.
## RC: demo release candidate

- **RC-1:** S2 (PRODUCT.md) passes 3 times in a row on the reference phone, release build, from a fresh install (S1 was removed with TM-01, D-043).
- **RC-2:** S2-N passes on at least 3 machines chosen by the owner.
- **RC-3:** All static, build, and error-state gates pass on the RC commit. The commit hash is recorded in `docs/build-log.md`.
- **RC-4:** G1, G3, and G5 on-device behaviour passes in airplane mode (Gemini Live needs the network). G2 shows `TR_OFFLINE` in airplane mode if the provider is cloud-based.
- **RC-5:** Someone outside the team installs the release APK (debug-signed, D-044) from the GitHub Release on their own Android phone by following the README, and completes S2.
- **RC-6:** Submission checks: repo is public with a LICENSE shown in its About section, `/.kiro` is committed at the root, no secrets, and the demo video is under 3 minutes and shows the app on a real phone. Everything is checked while logged out.
