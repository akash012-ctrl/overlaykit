# OverlayKit: to-do

Status: **blocked on P0 approval.** Items are listed in order. Gate IDs refer to [../docs/QUALITY-GATES.md](../docs/QUALITY-GATES.md).

## Decisions needed from the owner (blocking)

- [ ] Q1 Approve the architecture (module boundaries, dependency map) and scope, including the "Not built" list and the Kiro evidence track in plan.md.
- [x] Q2 TM-01 fixture: option (b), printed panel plus screen images, shown on an iPad as a passive display (D-029). Decided 2026-11-18.
- [ ] Q3 Accept D-005: Kannada works as a target, UI, content, and voice language, but Kannada-script text in the camera image is unsupported for the hackathon.
- [ ] Q4 Reference phone: owner will plug it in later. Until then every device test is "device validation pending".
- [x] Q5 Reviewers removed from the plan (D-031). Hindi and Kannada text ships marked unreviewed. Translation: ML Kit only (D-030).
- [ ] Q6 Confirm the 3 Dec submission target (deadline 4 Dec, 2:00 pm Pacific).
- [ ] Q7 Accept D-003: iOS isn't built or validated during the hackathon (Windows host, no EAS).
- [ ] Q8 Explore fixture: TM-01 only (recommended), or also a washing-machine panel as in the playbook.
- [ ] Q9 License and copyright holder (D-021; MIT proposed).
- [ ] Mark each Proposed decision in DECISIONS.md as Accepted or changed, including D-022 (playbook conflicts).

## G0: baseline

- [x] Add `LICENSE` at the repo root (D-021). MIT, copyright holder "Akash_012" (git author name; owner to confirm the legal name). Added 2026-11-18.
- [ ] Set `JAVA_HOME` to the Android Studio JBR and connect the reference phone (`adb devices`).
- [ ] Confirm `npx expo run:android` flags with `--help` (`--device`, `--variant release`).
- [ ] B1: debug build on the phone (DT-G0-01).
- [ ] B2: release build on the phone (DT-G0-02).
- [ ] Remove `react-native-web` and `react-dom` if doctor and the Android build pass without them (D-016). Review the other unused template packages.
- [ ] Add the unit test runner (candidate `jest-expo`, via `npx expo install`) and an `npm test` script.
- [ ] Add the restricted-imports lint rule for module boundaries (static gate Q4).
- [ ] Create `src/modules/*/index.ts` placeholders with no logic.
- [ ] Inspect merged Android manifest permissions (static gate Q9).
- [ ] Add the post-task quality hook (typecheck, lint, test) once those scripts exist.
- [ ] Record everything in `docs/build-log.md`.

## G1: camera, OCR, geometry

- [ ] Write the G1 Kiro Feature Spec in `.kiro/specs/` from these docs.
- [ ] Install `expo-dev-client` (D-004).
- [ ] Spike: evaluate camera library options and ML Kit Text Recognition v2 bindings against SDK 58 / RN 0.88. Record the choice in DECISIONS.md.
- [ ] If no binding works: write a local Expo Module (Kotlin) around ML Kit.
- [ ] `capture`: permission states, preview, still capture, upright normalization, temp file cleanup.
- [ ] `ocr`: `recognize()` returning `OcrResult` in image pixels with a script per line.
- [ ] Debug-only action to export an OCR snapshot (JSON plus photo) to `test-fixtures/`.
- [ ] `geometry`: image-to-view transform, label placement, hit-testing, with unit and property tests on snapshots.
- [ ] `ui`: camera-first screen with mode switcher; freeze-frame overlay; error states for `CAM_*` and `OCR_*`.
- [ ] Run DT-G1-01…10 and record results. Confirm or adjust the proposed thresholds once.
- [ ] Optional G1c: live overlays with expiry (D-020), 1-day cap.

## G2: translation

- [ ] Write the G2 Kiro Feature Spec.
- [ ] Build the evaluation set (TM-01 strings plus 30 general strings) and collect ratings for each candidate provider: ML Kit on-device first, then OpenRouter with the pinned model (D-028).
- [ ] Record the provider decision in DECISIONS.md.
- [ ] `locale`: provider adapter, timeout, cache, all `TR_*` states.
- [ ] DEFERRED (D-030) `backend/` proxy to OpenRouter with the team key, for any language pair where on-device fails G2 (D-013, D-027, D-028). Choose hosting and set the key's credit limit first.
- [ ] DEFERRED (D-030) OpenRouter key section in Settings: check, secure storage, mask, remove (D-028, AT-G2-11).
- [ ] UI strings in en/hi/kn, reviewed.
- [ ] Run DT-G2-01…06.

## G3: component understanding

- [ ] Write the G3 Kiro Feature Spec.
- [ ] TM-01 fixture: anchors, components, explanations in en/hi/kn with reviewers recorded.
- [ ] `components`: identification (`verified` / `ambiguous` / `none`), location, explanations, fixture validation tests.
- [ ] Explore UI including the unverified state.
- [ ] Run DT-G3-01…05, including the full negative set.

## G4: guided workflow

- [ ] Write the G4 Kiro Feature Spec.
- [ ] Perform the TM-01 workflow on the fixture; write steps and checkpoints; get reviewed translations.
- [ ] `guide`: pure step reducer (D-019) with property tests; lost and changed machine handling; fixture validation.
- [ ] `speech`: voice availability check and playback.
- [ ] Guide UI including the refusal state.
- [ ] Run DT-G4-01…06 and DT-ERR-04, DT-ERR-05.

## RC and submission

- [ ] Run DT-RC-01 and DT-RC-02 on the release build.
- [ ] Create the release keystore (kept outside git, backed up), build the signed APK, and attach it to a GitHub Release (D-018).
- [ ] README: what it does, supported scope, honest limits (simulated fixture, no iOS validation, Kannada OCR), install and test steps.
- [ ] RC-5 fresh install by someone outside the team; RC-6 submission checks.
- [ ] Record the RC commit hash in `docs/build-log.md`.

## Carried over from scaffold

- [ ] 3 moderate `npm audit` findings from the template: review, don't force-fix.
- [ ] Confirm the `com.overlaykit.app` package ID before the first shared build.
- [ ] Decide whether to commit `docs/OverlayKit_Kiro_Master_Playbook.md` (currently untracked). Its starter ZIP (`.kiro/specs`, hooks, skills, agents) isn't in the repo.
