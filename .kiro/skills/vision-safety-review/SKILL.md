---
name: vision-safety-review
description: Safety and honesty review for OverlayKit's camera, OCR, geometry, machine recognition and Guide code, and for any text that describes what they can do. Checks confidence thresholds and ambiguous matches, image-to-view coordinate transforms (crop, rotation, mirroring), unknown buttons, unsupported machines, privacy (no image upload), the text-only translation proxy, overclaiming, and that uncertain recognition shows a visible pause instead of a guess. Use when reviewing a diff, pull request, test evidence, README, demo script or Devpost text that touches capture, ocr, geometry, components, guide, locale, overlays or the Guide flow.
metadata:
  project: overlaykit
  version: "1.1"
---

# Vision safety review for OverlayKit

Review against `docs/PRODUCT.md` (P1–P8), `docs/ARCHITECTURE.md` (§5 dependencies, §6 data flow, §7 geometry, §8 error states, §9 proxy contract, §11 threats T1–T10), `docs/DECISIONS.md` (D-005 to D-022), and the steering file `.kiro/steering/visual-computer-vision.md`.

## Procedure

1. **Scope.** List the files in the diff, or the documents under review. If no diff or file list was provided, say so and ask for it (`#Git Diff` in Kiro chat). Don't review guessed changes.
2. **Read** each changed file in full, plus any test that covers it. Note the evidence you have: unit tests, e2e reports, entries in `docs/DEVICE-TESTS.md`.
3. **Check** each area below that the scope touches. Mark areas the scope doesn't touch as "not applicable", and areas you could not inspect as "not reviewed".
4. **Report** in the output format at the end.

## Checklist

### A. Confidence boundaries
- Every threshold (OCR confidence, match score, `minAnchors`, time-to-live, timeouts) is a named constant defined in one place, with a test at the boundary: exactly at, just below, and just above.
- `ambiguous` is treated exactly like `none`. Look for fallbacks that pick the "best" candidate, `>=` where `>` was intended, defaults that turn a missing confidence into 1.0, and early returns that skip the check.
- Changing a threshold has a matching `docs/DECISIONS.md` entry.

### B. Coordinate transforms
- Only `geometry` converts image space to view space. Flag coordinate math in `ui`, `capture` or route files.
- Cover scaling uses `max(viewW / imgW, viewH / imgH)` with centred offsets. `min` means contain scaling, which is wrong for a filling preview.
- Orientation (sensor rotation, EXIF) is applied once, in `capture`. Look for double rotation or a missing rotation.
- The back camera means `mirrored` is false. Any mirroring code needs a test.
- Off-screen points are clipped explicitly, never clamped to the edge. Non-finite and zero-area quads are rejected.
- Layout or safe-area changes trigger a recompute.
- Unit tests alone don't prove alignment. Ask for AT-G1-03 and AT-G1-04 device evidence before accepting "overlays are aligned".

### C. Unknown buttons and controls
- A tap on a label or region that isn't a located component of a verified machine shows its translation and says the app gives translation only. It never shows a guessed function (D-010).
- Explanations come only from reviewed fixture content (D-008). No lexicon, keyword rule or model output that infers what a control does.

### D. Unsupported machines
- Guide refuses (`GD_UNSUPPORTED`) unless the match is `verified`. Check every entry point: deep links, restored state, a match that changes mid-workflow.
- Machine lost pauses and hides the highlight (`GD_MACHINE_LOST`). A different machine cancels the workflow (`GD_MACHINE_CHANGED`).
- Steps advance only after two consecutive distinct matching observations, or on Done for steps marked manual. Never on a timer, a duplicate observation, or an out-of-order one (D-019).
- Step text is never generated or machine-translated at runtime. Fixture validation rejects a missing locale, reviewer or component.

### E. Privacy
- No code path sends image bytes, base64, file URIs or frame buffers over the network (T1, D-006). Check `fetch`, `XMLHttpRequest`, WebSocket and upload helpers in every changed file.
- Temporary stills are deleted after OCR. Nothing is written to the gallery.
- Release builds log no OCR text, translations or images (T9).
- No new Android permission beyond `CAMERA` and `INTERNET` (T10). No analytics, crash reporting or tracking SDK.
- e2e agent steps, if a model is ever configured, send screenshots to the model provider. Only owned fixtures may be in frame.

### F. Text-only cloud proxy
- The request body matches `docs/ARCHITECTURE.md` §9: `texts`, `source` and `target` only, with size caps enforced on both client and server.
- The provider key exists only in the backend environment, never in `src/`, `app.json` or the bundle (gate Q7). The app sends no `EXPO_PUBLIC_*` secret.
- HTTPS only. Request text is not logged or stored.
- Every failure maps to a `TR_*` state. No fallback to canned or glossary translations (P4).

### G. Overclaiming
In UI copy, README, demo script, Devpost text, comments and commit messages, flag:
- "any machine", "any sign", "real-time AR", "SLAM" or "world tracking".
- "reads Kannada" (D-005), "iOS supported" (D-003), or "offline translation" unless G2 chose an on-device provider.
- Accuracy or latency numbers without a record in `docs/DEVICE-TESTS.md`.
- A simulated TM-01 not labelled as a first-party simulated machine.
- "Tested", "verified" or "used" for a skill, agent, hook or device check that has no recorded run.

### H. Visible pause when recognition is uncertain
- Low confidence, stale frames, motion, a lost machine or a hidden component each produce a visible message ("Hold steady", "Point the camera at the card reader") and hide the highlight.
- Look for code that keeps the last highlight or label on screen after its source observation expired, or that hides a failure silently.
- Every overlay label is in exactly one state: translated, pending, failed or unsupported (QE-3).

### I. UI design system and honest visuals
Applies to any diff under `src/modules/ui` or `src/app`. Rules: `.kiro/skills/ui-design-system/SKILL.md`.
- Colours, radii, spacing and sizes come from `ui/theme.ts`. A raw hex or magic number in a view is a finding (exceptions: label state colours in `ui/overlay/styles.ts`, geometry sizes). A new text and background pair is added to `COLOR_PAIRS` and the contrast test passes.
- Every touchable is `A11yButton` (or a lint-listed exception) with a role and a translated label, icon-only ones included. Every glyph is `Icon`; every animation lives in `ui/motion/motion.tsx` and has a reduced-motion path.
- Live frames draw lens chips only; a held still draws labels with their state; Guide draws one target ring. Flag extra outlines, boxes or colours on the live image.
- The step instruction stays the largest text; Done is always shown; Stop is outlined and last; the AI badge and the "may be wrong" line are never hidden by a restyle.
- Copy and docs call chips and rings 2D marks on the latest frame. Flag "AR", "tracking", "world-anchored", or "real-time" beyond the measured refresh (see G).

## Output format

```
## Vision safety review: <scope>

Evidence reviewed: <files, tests, reports, device records>

| # | Severity | Area | Location | Problem | Evidence | Minimal fix |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | BLOCKER | D | src/modules/guide/reducer.ts:42 | Ambiguous match starts a workflow | test missing; code path shown | Treat `ambiguous` as `none`; add boundary test |

Not applicable: <areas>
Not reviewed: <areas and why>
Needs device evidence: <claims that need DT/PD records>

Verdict: PASS | CHANGES REQUIRED | CANNOT ASSESS
```

Severity:
- **BLOCKER**: unsafe guidance, an image leaving the phone, a secret in the app, or a false capability claim.
- **HIGH**: wrong geometry or recognition logic, or a missing refusal or pause.
- **MEDIUM**: a missing boundary test or an unclear failure state.
- **LOW**: clarity or naming.

Use **CANNOT ASSESS** when the evidence is missing. Never call code safe that you didn't read. Cite a file and line for every finding, and label anything inferred rather than read as "assumption".
