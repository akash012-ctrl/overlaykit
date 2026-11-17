---
inclusion: always
---

# Quality rules

Gates and thresholds: `docs/QUALITY-GATES.md`. Device procedure and results: `docs/DEVICE-TESTS.md`.

## Tests

- Every pure function in `geometry`, `components`, `guide`, fixture validation, and error-to-UI mapping gets a unit test. Inputs are recorded OCR snapshots from `test-fixtures/`, not invented OCR output.
- Property-based tests (library chosen in G0) cover:
  - **Geometry:** random image and view sizes under crop, orientation, and scale. Outputs stay finite, round trips hold, and clipping is explicit.
  - **Guide reducer:** random observation sequences. A step advances exactly once, never on duplicate or out-of-order observations, and never on a timer.
- For bug fixes, write the failing test first.

## Never

- Never delete, skip (`.skip`, `.only`, `xit`), weaken, or re-snapshot a test to turn it green. If a test looks wrong, explain why and ask before changing it.
- Never change a gate threshold without an entry in `docs/DECISIONS.md`.
- Never claim a gate passed or that something "works on device" without a record in `docs/DEVICE-TESTS.md`.
- Never report output from a command you didn't run.

## Real-device gate

Camera, OCR, overlays, fonts, voices, offline behaviour, and performance count as verified only on the reference Android phone. Performance uses a release build. Unit tests and emulators don't count. With no phone connected, say "device validation pending".

## Before calling a task done

Run `npm run typecheck`, `npm run lint`, `npm test` (from G0), and `npx expo-doctor`. Then report:

1. The exact commands run, each with its exit code and the relevant output lines.
2. Files changed.
3. Tests added and run, with pass/fail counts.
4. Device status: the DT IDs run and their results, or "pending".
5. Failures, open risks, and the next step.
