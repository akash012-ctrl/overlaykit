---
inclusion: fileMatch
fileMatchPattern: ["src/modules/capture/**/*", "src/modules/ocr/**/*", "src/modules/geometry/**/*", "src/modules/components/**/*", "src/modules/guide/**/*", "test-fixtures/**/*"]
---

# Camera and computer-vision rules

This file applies to capture, OCR, geometry, and machine/screen recognition (`components` identifies machines and screens, `guide` matches checkpoints), along with their tests and recorded snapshots. Design: `docs/ARCHITECTURE.md` §6 to §8, §10 and §11. Product rules: `docs/PRODUCT.md`.

## Frames, crop, orientation, mirroring

- `capture` turns each frame upright exactly once, applying sensor rotation and EXIF. Everything downstream assumes upright image pixels with the origin at the top left.
- The app uses the back camera only, so `mirrored` is `false`. If a mirrored frame ever appears, flip x in `geometry` and add a test. Never assume.
- Image pixels never equal preview pixels. Image-to-view conversion follows the preview's real scaling. For "cover", `scale = max(viewW / imgW, viewH / imgH)` with a centred crop. Check this against the chosen camera library's real preview and record the result in the build log.
- Text outside the visible preview is marked off-screen and clipped. It is never pinned to the screen edge.
- `ocr` rejects quads that are non-finite (NaN, Infinity) or have zero area.
- Changes to layout or safe-area insets trigger a recompute of view positions.

## Timestamp freshness

- Every observation carries a `frameId` and a monotonic `capturedAtMs`. Overlays, matches, and checkpoints keep the `frameId` they came from.
- Live mode:
  - Drop any result older than the newest result already applied.
  - Overlays expire after their time-to-live unless refreshed (D-020).
- Freeze-frame mode: overlays live as long as their still image is shown.
- Guide (D-019):
  - Advance only after two consecutive distinct observations match the checkpoint.
  - Duplicate or out-of-order observations never advance or rewind a step.
  - Timers may pause a workflow but never advance it.

## Confidence gating

- Use the engine's confidence when it provides one. When it doesn't, write down the heuristic used instead (for example character count, script consistency, or box size).
- Each threshold is a named constant, defined in one place and covered by a test. Changing one needs an entry in `docs/DECISIONS.md`.
- Machine identification returns `verified`, `ambiguous`, or `none`. A score below threshold, or more than one candidate, means `ambiguous`, which is treated as unverified. Never round up.
- One matching text never identifies a machine. Identification needs `minAnchors` anchors in a layout consistent with the fixture.

## Uncertainty

- Low-confidence text is shown dimmed or marked. Text in an unsupported script (for example Kannada) gets `OCR_UNSUPPORTED_SCRIPT`, never garbled Latin shown as real text.
- When unsure, hide the highlight and say why ("Hold steady", "Can't see the card reader"). Showing no pointer is better than showing a wrong one.
- Production code never contains invented detections, placeholder boxes, or demo text. Fakes live only in tests.

## Privacy

- `capture`, `ocr`, `geometry`, `components`, and `guide` make no network calls.
- Images never leave the phone:
  - Delete temporary stills after OCR.
  - Never write to the gallery.
  - Never log image data.
- Release builds log no OCR text.
- `test-fixtures/` holds only images of fixtures we own. No people, faces, documents, or card numbers.

## Tests here

- Geometry: property tests over random image and view sizes, crop, and rotation (see `quality.md`).
- Recognition: cover TM-01 views, partial views, glare and dim light, and the negative set. Report a confusion matrix from real captures when they exist.
