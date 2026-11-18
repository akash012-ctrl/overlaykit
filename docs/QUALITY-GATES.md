# OverlayKit: quality gates

Status: **draft, awaiting approval** (2026-11-17)

A gate passes only with evidence: command output in the build log, or a device test record in [DEVICE-TESTS.md](DEVICE-TESTS.md) with build commit, device, and date. Thresholds marked *(proposed)* get confirmed or adjusted once, after the G1 spike measures a baseline. After that they don't change silently. Any change is logged in DECISIONS.md.

Gate order: **G0 → G1 → G2 → G3 → G4 → RC.** Work on a later gate may start early (for example, fixture authoring), but a later gate can't pass before the earlier ones.

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
| Q9 | Permissions | After `npx expo prebuild`, inspect the merged Android manifest | Only `CAMERA`, `INTERNET`, and permissions required by Expo/RN core, each one listed and justified |

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

## G4: guided workflow (Guide)

| ID | Acceptance test | Pass |
| --- | --- | --- |
| AT-G4-01 | Refusal | Unverified and ambiguous machines show `GD_UNSUPPORTED` and offer Translate and Explore. Tested on the whole negative set. |
| AT-G4-02 | End to end | The TM-01 workflow completes on the phone with each step's target highlighted on the correct component |
| AT-G4-03 | Checkpoints | `text-visible` steps advance exactly once, after two consecutive distinct matching observations. Duplicate or out-of-order observations never advance or rewind (property-based unit tests plus device test). `manual` steps advance only on Done. No step advances on a timer. |
| AT-G4-04 | Machine lost | Pointing away for longer than the timeout pauses the workflow. It resumes only after TM-01 is re-identified. |
| AT-G4-05 | Machine changed | Identifying a different machine cancels the workflow |
| AT-G4-06 | Content integrity | Workflow loader rejects fixtures missing a locale, a review status, or a valid component reference (unit test). No step text is generated or translated at runtime (code review). |
| AT-G4-07 | Voice | With a voice installed for the locale, Speak reads the step. Without one, the control is hidden. No crash either way. |
| AT-G4-08 | Interruption | Backgrounding and returning resumes at the same step or resets safely, without skipping a step |

**Stop condition:** Any step shown for a machine that isn't `verified` blocks release until fixed.

## RC: demo release candidate

- **RC-1:** S1 (PRODUCT.md) passes 3 times in a row on the reference phone, release build, from a fresh install.
- **RC-2:** S1-N passes on at least 3 negative-set machines.
- **RC-3:** All static, build, and error-state gates pass on the RC commit. The commit hash is recorded in `docs/build-log.md`.
- **RC-4:** G1, G3, and G4 behaviour passes in airplane mode. G2 shows `TR_OFFLINE` in airplane mode if the provider is cloud-based.
- **RC-5:** Someone outside the team installs the signed release APK from the GitHub Release on their own Android phone by following the README, and completes S1.
- **RC-6:** Submission checks: repo is public with a LICENSE shown in its About section, `/.kiro` is committed at the root, no secrets, and the demo video is under 3 minutes and shows the app on a real phone. Everything is checked while logged out.
