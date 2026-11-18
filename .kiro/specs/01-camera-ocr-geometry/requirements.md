# Requirements Document

Status: **draft.** On 2026-11-18 the owner asked to proceed to design. Open questions OQ-1 to OQ-7 use their recommended defaults until the owner decides them.

## Introduction

This spec covers capability A in `docs/CAPABILITY-MAP.md`: the real back camera, on-device text recognition into line quads, mapping those quads from the captured image onto the screen, and removing overlays that no longer match what is shown. It delivers gate G1 (AT-G1-01 to AT-G1-11 in `docs/QUALITY-GATES.md`) and the QE-1, QE-2 and QE-3 checks for the `CAM_*` and `OCR_*` codes.

Freeze-frame mode comes first (D-011): the user captures a still, `capture` turns it upright once, `ocr` reads it, `geometry` maps the lines onto the shown still, and `ui` draws the overlays. Live overlays on the moving preview are optional and ship only if they pass AT-G1-06.

Sources, in order of precedence: `docs/PRODUCT.md` (rules P1 to P8), `docs/DECISIONS.md` (D-xxx), `docs/ARCHITECTURE.md`, `docs/QUALITY-GATES.md`, `docs/DEVICE-TESTS.md`, `docs/CAPABILITY-MAP.md`, and the workspace steering files. Where these sources conflict, the conflict is listed under Open Questions with a recommended default. Criteria that use a default name the open question.

**Library-neutral.** The camera library and the OCR engine are chosen during this spec's G1a spike (D-004, D-005). No criterion names a vendor. ML Kit Text Recognition v2 is the first OCR candidate in D-005, but any engine that meets these criteria qualifies.

**Existing code.** `src/modules/shared/index.ts` defines `Point`, `Size` and `Result`. `src/modules/geometry/cover-transform.ts` defines `computeCoverTransform`, `imageToView`, `viewToImage` and `isVisibleInView`, with table tests in `src/modules/geometry/__tests__/cover-transform.test.ts`. This spec keeps their behaviour and builds on them.

**Out of scope:** translation providers (on-device ML Kit, and OpenRouter through the proxy or the user's own key, D-027 and D-028), OpenRouter key entry and storage, and every `TR_*` code except the not-configured adapter in OQ-1, machine identification, Explore hit-testing, Guide, speech, the Settings route, the first-run privacy note (CM-5).

**Thresholds.** Every numeric threshold below is copied from QUALITY-GATES.md G1 and is *(proposed; confirmed once after the G1 spike baseline; any change needs a DECISIONS.md entry)*. Values the docs don't give are named constants with values set by the G1a spike (OQ-5). Timing and live-mode measurements use release builds (QUALITY-GATES.md, build gate B2).

**Device criteria.** A criterion tagged "Device" is verified only on the reference phone, with a PASSED record in `docs/DEVICE-TESTS.md` that names the build commit, variant, device and date. Until that record exists, its status is "device validation pending". On the date of writing, no phone is connected, so every device criterion is pending.

## Glossary

- **OverlayKit_App**: the Expo Android app in this repository.
- **Camera_Screen**: the `ui` screen rendered by the index route. It shows the preview, the shown still, the controls, and every state message.
- **Overlay_Layer**: the part of the Camera_Screen that draws Overlay items over the shown still, or over the preview in Live mode.
- **Snapshot_Exporter**: the debug-only action that writes a Recorded OCR snapshot to the phone.
- **Test_Suite**: the Jest unit and property tests run by `npm test` (D-023).
- **Device_Tester**: the person who runs the `docs/DEVICE-TESTS.md` cases on the Reference phone.
- **Reference phone**: the Android phone named under owner question Q4 in `tasks/todo.md`. All device criteria are measured on it.
- **capture module**: `src/modules/capture`. Owns camera permission, the preview, still capture, upright normalization and temporary still files.
- **ocr module**: `src/modules/ocr`. Wraps the on-device OCR engine and converts its output to OcrResult.
- **geometry module**: `src/modules/geometry`. Pure functions for image-to-view mapping, clipping and label placement. No React Native, no I/O.
- **shared module**: `src/modules/shared`. Core types, `Result`, and error codes. Imports nothing.
- **ui module**: `src/modules/ui`. Screens, the Overlay_Layer, and the hooks that wire the other modules together.
- **locale module**: `src/modules/locale`. UI strings through `t(key)` and the TranslationProvider interface.
- **TranslationProvider**: the interface in the locale module behind which every translation engine sits.
- **Not-configured adapter**: the TranslationProvider adapter that returns `TR_NOT_CONFIGURED` for every line (D-007).
- **frameId**: an identifier for one captured frame, unique within an app session.
- **capturedAtMs**: the time a frame was captured, in milliseconds, read from a monotonic clock.
- **FrameRef**: a reference to one upright captured frame: frameId, capturedAtMs, upright size in pixels, source (`still` or `live`), and whether the pixels are mirrored.
- **Quad**: the four corner Points of one text line, in a fixed corner order defined in the shared module.
- **OcrLine**: one recognized line: its text, its Quad in Image space, its Script, and the engine's confidence when the engine gives one.
- **OcrResult**: the recognition output for one FrameRef: the frameId and capturedAtMs copied from that FrameRef, the upright image size, the list of OcrLines, and the count of lines excluded as invalid.
- **Script**: the writing system the ocr module assigns to an OcrLine: Latin, Devanagari, or unsupported.
- **Image space**: pixel coordinates of the upright frame, origin at the top left (ARCHITECTURE.md §7).
- **View space**: layout units (dp) of the still view or preview view, origin at its top left.
- **Cover transform**: the mapping from Image space to View space for a view that scales the image to fill the view and crops the overflow equally on both sides. `scale = max(viewW / imgW, viewH / imgH)`.
- **Visible region**: the part of the still view or preview view inside the safe-area insets and outside the Camera_Screen's opaque control areas.
- **Line height**: the height of a line's mapped Quad, measured perpendicular to its baseline, in View space.
- **Source_Outline**: the outline the Overlay_Layer draws on a line's mapped Quad to show where the recognized text is (OQ-6).
- **Label box**: the box that shows a line's label text and state, placed by the geometry module next to its Source_Outline (OQ-6).
- **Overlay item**: one drawable entry: id, frameId, View-space Source_Outline and Label box, label content, and label state.
- **Label state**: exactly one of translated, pending, failed, or unsupported (QE-3).
- **Freeze-frame mode**: overlays drawn on a captured still that doesn't move (D-011).
- **Live mode**: overlays drawn on the moving preview from frames read continuously. Optional (AT-G1-06).
- **Stale overlay**: an Overlay item whose frameId is not the shown still's frameId (Freeze-frame mode), or that has passed its time-to-live without a refresh (Live mode).
- **Low-quality rule**: the rule that decides when an OcrResult carries `OCR_LOW_QUALITY`. Its thresholds are named constants (OQ-5).
- **Unsupported-script rule**: the rule that decides when a line is garbled output from a script the engine can't read, such as Kannada. Its thresholds are named constants (OQ-5).
- **Named threshold constant**: a numeric threshold defined once, in one source file, under a descriptive name, and covered by a test.
- **Recorded OCR snapshot**: a JSON file and its still photo, exported by the Snapshot_Exporter on the Reference phone and stored in `test-fixtures/`.
- **test-fixtures folder**: `test-fixtures/` at the repository root.
- **TM-01, CARD-EN, CARD-HI, CARD-KN, BLANK**: the fixtures defined in `docs/DEVICE-TESTS.md`. CARD-EN, CARD-HI, CARD-KN and BLANK may be shown as images on the iPad.
- **TM-01 image fixture**: TM-01 as defined in `test-fixtures/tm-01/FIXTURE.md` (D-029, D-031, D-032): a first-party simulated ticket machine made of images shown on an iPad that runs no app or web page and shares nothing with the OverlayKit_App. AI art supplies the artwork only, and every word is added by the project. It is not a real machine. Its ground-truth strings are the L01 to L09 table in FIXTURE.md section 3, and its iPad capture checklist is FIXTURE.md section 9. Box values in that table are DRAFT until measured from the final image.
- **Debug build / Release build**: the builds produced by build gates B1 and B2 in `docs/QUALITY-GATES.md`.

## Requirements

### Requirement 1: Camera permission

**User Story:** As a user opening OverlayKit, I want the app to ask for the camera and tell me what to do if I refuse, so that I can start reading text or fix the permission myself.

Source: P2, AT-G1-01, DT-G1-01, ARCHITECTURE.md §8 (`CAM_PERMISSION_DENIED`, `CAM_PERMISSION_BLOCKED`).

#### Acceptance Criteria

1. WHEN the Camera_Screen opens and camera permission has not been requested before, THE capture module SHALL request camera permission through the Android system prompt.
2. WHEN camera permission is granted, THE Camera_Screen SHALL show the back-camera preview.
3. IF the user denies camera permission and Android can still show the prompt again, THEN THE capture module SHALL report `CAM_PERMISSION_DENIED`.
4. WHILE the permission state is `CAM_PERMISSION_DENIED`, THE Camera_Screen SHALL show why the camera is needed and an "Allow camera" button.
5. WHEN the user taps "Allow camera", THE capture module SHALL request camera permission again.
6. IF the user denies camera permission and Android will no longer show the prompt, THEN THE capture module SHALL report `CAM_PERMISSION_BLOCKED`.
7. WHILE the permission state is `CAM_PERMISSION_BLOCKED`, THE Camera_Screen SHALL show why the camera is needed and an "Open settings" button.
8. WHEN the user taps "Open settings", THE OverlayKit_App SHALL open the Android settings page for OverlayKit.
9. WHEN the OverlayKit_App returns to the foreground after the camera permission changed in Android settings, THE Camera_Screen SHALL show the state that matches the new permission.

Verification: unit tests for criteria 3, 4, 6 and 7 (QE-1). Device: DT-G1-01, device validation pending.

### Requirement 2: Back-camera preview and camera interruptions

**User Story:** As a user, I want a back-camera preview in portrait, so that I can aim at the text before I capture.

Source: P2, PRODUCT.md "Not built" (portrait only), ARCHITECTURE.md §7 (back camera only) and §8 (`CAM_UNAVAILABLE`), DT-ERR-01.

#### Acceptance Criteria

1. THE capture module SHALL use the phone's back camera as its only camera.
2. THE Camera_Screen SHALL display in portrait orientation only.
3. WHILE the camera is starting, THE Camera_Screen SHALL show a text status saying that the camera is starting.
4. IF the back camera cannot start, or stops while the preview is shown, THEN THE capture module SHALL report `CAM_UNAVAILABLE`.
5. WHILE the camera state is `CAM_UNAVAILABLE`, THE Camera_Screen SHALL show "Camera unavailable" and a Retry button.
6. WHEN the user taps Retry in the `CAM_UNAVAILABLE` state, THE capture module SHALL try to start the back camera again.
7. WHEN the OverlayKit_App moves to the background, THE capture module SHALL release the camera.
8. WHEN the OverlayKit_App returns to the foreground with camera permission granted, THE Camera_Screen SHALL restart the back-camera preview.

Verification: unit tests for criteria 4 and 5 (QE-1). Device: DT-ERR-01 and the backgrounding check in the `physical-device-qa` skill, device validation pending.

### Requirement 3: Still capture and upright frames

**User Story:** As a user, I want to capture a still of what I'm pointing at, so that the overlays sit on an image that doesn't move.

Source: D-011, ARCHITECTURE.md §7 (Image space) and §8 (`CAM_CAPTURE_FAILED`), architecture steering (Typed observations).

#### Acceptance Criteria

1. WHEN the user taps the capture button while the preview is shown, THE capture module SHALL capture one still from the back camera.
2. WHEN the capture module produces a FrameRef, THE capture module SHALL give the FrameRef a frameId that differs from every frameId issued earlier in the same app session.
3. WHEN the capture module produces a FrameRef, THE capture module SHALL set its capturedAtMs from a monotonic clock read at capture time.
4. WHEN the capture module produces a FrameRef, THE capture module SHALL apply the sensor rotation and EXIF orientation exactly once, so that the FrameRef's pixels and size are upright with the origin at the top left.
5. THE capture module SHALL set the source of every still FrameRef to `still`.
6. IF still capture fails, THEN THE capture module SHALL return `CAM_CAPTURE_FAILED`.
7. IF the upright still's width or height is not a finite number above zero, THEN THE capture module SHALL return `CAM_CAPTURE_FAILED` instead of a FrameRef.
8. WHILE the state is `CAM_CAPTURE_FAILED`, THE Camera_Screen SHALL show a short error message with a Retry button over the preview.
9. WHILE a still is being captured or read, THE Camera_Screen SHALL show a text status naming the current step.
10. WHILE a still is shown, THE Camera_Screen SHALL display the still with the scaling that the geometry module's Cover transform assumes.

Verification: unit tests for criteria 6, 7 and 8 (QE-1) and for any pure orientation helper. Device: DT-G1-03 checks that overlays line up on the upright still, device validation pending.

### Requirement 4: Temporary still files

**User Story:** As a user, I want the photos taken for reading text to be temporary, so that nothing I point the camera at stays on the phone or leaves it.

Source: D-006, AT-G1-11, DT-G1-10, ARCHITECTURE.md §11 (T1), OQ-3.

#### Acceptance Criteria

1. THE capture module SHALL store each temporary still only in OverlayKit's cache directory.
2. WHEN the shown still is dismissed, THE capture module SHALL delete that still's temporary file (OQ-3).
3. WHEN a new still replaces the shown still, THE capture module SHALL delete the replaced still's temporary file (OQ-3).
4. WHEN the OverlayKit_App moves to the background, THE capture module SHALL delete every temporary still file (OQ-3).
5. WHEN the OverlayKit_App starts, THE capture module SHALL delete every temporary still file left from earlier sessions (OQ-3).
6. IF still capture fails after a temporary file was written, THEN THE capture module SHALL delete that file.
7. WHEN the OverlayKit_App returns to the foreground after its temporary stills were deleted, THE Camera_Screen SHALL show the preview with no Overlay items.
8. THE capture module SHALL keep every still out of the phone's gallery and shared media storage.

Verification: unit tests for criteria 2 to 6 with a fake file store that exists only in test code. Device: DT-G1-10, run after dismissing the last still (OQ-3), device validation pending.

### Requirement 5: On-device OCR adapter and OcrResult

**User Story:** As a developer of specs B and C, I want OCR output in one typed shape that doesn't depend on the OCR vendor, so that translation, machine identification and Guide keep working if the engine changes.

Source: P5, D-005, ARCHITECTURE.md §4 (`ocr`, `shared`), architecture steering (Typed observations, Provider adapters).

#### Acceptance Criteria

1. WHEN the ui module passes a FrameRef to the ocr module, THE ocr module SHALL return a Result that holds either an OcrResult or an `OCR_*` error code.
2. THE ocr module SHALL copy the FrameRef's frameId and capturedAtMs into the OcrResult.
3. THE ocr module SHALL set the OcrResult's image size to the FrameRef's upright size.
4. THE ocr module SHALL express each OcrLine's Quad in the Image space of the FrameRef it read.
5. THE ocr module SHALL assign one Script to each OcrLine.
6. WHEN the OCR engine reports a confidence value for a line, THE ocr module SHALL store that value in the OcrLine on a scale from 0 to 1.
7. IF the OCR engine reports no confidence value for a line, THEN THE ocr module SHALL leave that OcrLine's confidence absent.
8. THE ocr module SHALL report the scripts its bundled engine reads, which are Latin and Devanagari unless the G1a spike changes D-005.
9. THE ocr module SHALL convert engine output to shared module types inside the ocr module, so that its public API exposes only shared module types.
10. IF the OCR engine throws or rejects, THEN THE ocr module SHALL return a Result error instead of letting the exception leave the module.

Verification: unit tests on Recorded OCR snapshots for criteria 2 to 7 and 10. Type check and review for criterion 9.

### Requirement 6: Rejected quads

**User Story:** As a user, I want broken text boxes dropped before anything is drawn, so that no overlay appears in a meaningless position.

Source: visual-computer-vision steering (Frames), CAPABILITY-MAP.md §4.A.

#### Acceptance Criteria

1. IF any corner of a line's Quad has a coordinate that is NaN or infinite, THEN THE ocr module SHALL exclude that line from the OcrResult's lines.
2. IF a line's Quad has zero area, with all four corners on one straight line or at one point, THEN THE ocr module SHALL exclude that line from the OcrResult's lines.
3. WHEN the ocr module excludes a line, THE ocr module SHALL add one to the OcrResult's count of excluded lines.

Verification: unit tests built from Recorded OCR snapshots with named fields changed (Requirement 25, criterion 7).

### Requirement 7: Latin, Devanagari and unsupported scripts

**User Story:** As a user reading English or Hindi signs, I want Latin and Devanagari text read correctly, and Kannada text marked as unreadable, so that I'm never shown nonsense as if it were real text.

Source: D-005, PRODUCT.md (Kannada OCR note), AT-G1-07, AT-G1-08, DT-G1-06, DT-G1-07, ARCHITECTURE.md §8 (`OCR_UNSUPPORTED_SCRIPT`), OQ-5.

#### Acceptance Criteria

1. WHEN the ocr module recognizes a line written in Latin script, THE ocr module SHALL set that OcrLine's Script to Latin.
2. WHEN the ocr module recognizes a line written in Devanagari script, THE ocr module SHALL set that OcrLine's Script to Devanagari.
3. WHEN the OCR engine reports a script or language for a line, THE ocr module SHALL use that report as an input to the Unsupported-script rule.
4. IF a line meets the Unsupported-script rule, THEN THE ocr module SHALL set that OcrLine's Script to unsupported and mark the line with `OCR_UNSUPPORTED_SCRIPT`.
5. WHILE an OcrLine is marked with `OCR_UNSUPPORTED_SCRIPT`, THE Overlay_Layer SHALL show the marker "This script can't be read yet" in the unsupported Label state in place of the engine's text for that line.
6. THE ocr module SHALL define the Unsupported-script rule's thresholds as Named threshold constants, with values set by the G1a spike from CARD-KN captures and recorded in `docs/DECISIONS.md` (OQ-5).

Verification: unit tests on Recorded OCR snapshots of CARD-EN, CARD-HI and CARD-KN, once they exist. Device: DT-G1-06 and DT-G1-07, device validation pending.

### Requirement 8: OCR outcome states

**User Story:** As a user, I want a clear message when no text was read, the read was poor, or text reading can't work on my phone, so that I know whether to move closer, add light, or stop trying.

Source: ARCHITECTURE.md §8 (`OCR_NO_TEXT`, `OCR_LOW_QUALITY`, `OCR_ENGINE_UNAVAILABLE`), AT-G1-09, DT-G1-08, DT-ERR-02, DT-ERR-03, QE-1, QE-2, OQ-5, OQ-7.

#### Acceptance Criteria

1. IF a frame has no valid lines after exclusions, THEN THE ocr module SHALL return `OCR_NO_TEXT`.
2. WHILE the result for the shown still is `OCR_NO_TEXT`, THE Camera_Screen SHALL show "No text found. Move closer or add light." and a Retry button that returns to the preview.
3. IF an OcrResult meets the Low-quality rule, THEN THE ocr module SHALL return that OcrResult with `OCR_LOW_QUALITY` attached and its lines kept.
4. WHILE the shown OcrResult carries `OCR_LOW_QUALITY`, THE Camera_Screen SHALL show the hint "Move closer or add light." and a Retry button that returns to the preview.
5. WHILE the shown OcrResult carries `OCR_LOW_QUALITY`, THE Overlay_Layer SHALL draw that result's Label boxes dimmed and marked with an icon and the text of a low-quality marker, keeping text contrast at or above 4.5:1.
6. WHEN the Camera_Screen opens, THE ocr module SHALL check that the OCR engine and its bundled model load.
7. IF the OCR engine or its bundled model is missing or fails to load, THEN THE ocr module SHALL return `OCR_ENGINE_UNAVAILABLE`.
8. WHILE the OCR state is `OCR_ENGINE_UNAVAILABLE`, THE Camera_Screen SHALL show "Text reading isn't available on this device." with the capture button and Translate mode disabled.
9. IF the OCR engine fails on one frame after it loaded, THEN THE ocr module SHALL return the per-frame recognition error code decided in OQ-7.
10. WHILE the result for the shown still is the OQ-7 recognition error, THE Camera_Screen SHALL show a short error message and a Retry button that returns to the preview (OQ-7).

Verification: unit tests for every criterion that names a code (QE-1). Device: DT-G1-08 (`OCR_NO_TEXT`), DT-ERR-03 (`OCR_LOW_QUALITY`), DT-ERR-02 with a debug-only hook (`OCR_ENGINE_UNAVAILABLE`), device validation pending.

### Requirement 9: Confidence and quality thresholds

**User Story:** As the owner, I want every recognition threshold named, defined once and tested, so that no threshold changes without a recorded decision.

Source: visual-computer-vision steering (Confidence gating), quality steering (Never), QUALITY-GATES.md (threshold note), OQ-5.

#### Acceptance Criteria

1. THE ocr module SHALL define the Low-quality rule's thresholds as Named threshold constants in one source file.
2. WHEN the OCR engine gives confidence values, THE ocr module SHALL evaluate the Low-quality rule from those confidence values.
3. IF the OCR engine gives no confidence values, THEN THE ocr module SHALL evaluate the Low-quality rule with a heuristic whose name, inputs and constants are recorded in `docs/DECISIONS.md`.
4. THE ocr module SHALL use Low-quality rule and Unsupported-script rule values that were set from the G1a spike baseline and recorded in `docs/DECISIONS.md` before the G1 device measurements start (OQ-5).
5. IF a Named threshold constant changes value, THEN THE Test_Suite SHALL fail until that constant's test is updated to the recorded value.

Verification: unit tests that pin each constant's value and test behaviour on both sides of each threshold (Requirement 25, criterion 10). Review of `docs/DECISIONS.md`.

### Requirement 10: Cover transform and quad mapping

**User Story:** As a user, I want each overlay drawn where its text appears on the screen, so that I can tell which text it belongs to.

Source: ARCHITECTURE.md §7, `src/modules/geometry/cover-transform.ts`, AT-G1-03, AT-G1-04, visual-computer-vision steering (Frames).

#### Acceptance Criteria

1. THE geometry module SHALL compute the Cover transform with `scale = max(viewW / imgW, viewH / imgH)` and offsets that centre the scaled image in the view.
2. IF an image size or a view size has a width or height that is not a finite number above zero, THEN THE geometry module SHALL return `INVALID_SIZE`.
3. WHILE the Cover transform for the shown still is `INVALID_SIZE`, THE Overlay_Layer SHALL draw no Overlay items.
4. THE geometry module SHALL map a Quad from Image space to View space by applying the Cover transform to each of its four corners.
5. THE Cover transform SHALL match the scaling of the still view, and of the preview where Live mode is enabled, as observed on the Reference phone with the chosen camera library, with the comparison recorded in `docs/build-log.md`.
6. IF the comparison in criterion 5 shows scaling other than centred cover, THEN THE geometry module SHALL implement the observed scaling, recorded in a `docs/DECISIONS.md` entry.

Verification: existing table tests plus property tests (Requirement 25). Device: criterion 5 through DT-G1-03, device validation pending.

### Requirement 11: Mirrored frames

**User Story:** As a user, I want overlays on the correct side of the image even if the camera library hands over a mirrored frame, so that labels never point at the wrong text.

Source: ARCHITECTURE.md §7 (back camera, no mirroring), visual-computer-vision steering (Frames).

#### Acceptance Criteria

1. THE capture module SHALL set each FrameRef's mirrored flag from the camera library's report for that frame.
2. IF a FrameRef is mirrored, THEN THE geometry module SHALL replace each x coordinate with `imageWidth − x` before applying the Cover transform.

Verification: unit test for criterion 2 (Requirement 25, criterion 9). Device: the mirrored flag is logged in a debug build during DT-G1-03 and expected to be false, device validation pending.

### Requirement 12: Visibility and clipping

**User Story:** As a user, I want text outside the visible screen left out and text at the edge cut cleanly, so that no overlay is drawn in a place where its text isn't.

Source: visual-computer-vision steering (off-screen text is clipped, never pinned to the edge), CAPABILITY-MAP.md §4.A, `isVisibleInView` in `cover-transform.ts`, OQ-4.

#### Acceptance Criteria

1. IF a line's mapped Quad lies entirely outside the Visible region, THEN THE geometry module SHALL mark that line as off-screen (OQ-4).
2. WHILE a line is marked off-screen, THE Overlay_Layer SHALL draw nothing for that line (OQ-4).
3. IF a line's mapped Quad lies partly inside the Visible region, THEN THE geometry module SHALL clip that line's Source_Outline at the Visible region's edge while keeping the Quad's mapped position unchanged (OQ-4).
4. THE geometry module SHALL give every mapped line exactly one visibility state: visible, clipped, or off-screen.

Verification: property tests (Requirement 25, criterion 4).

### Requirement 13: Label placement

**User Story:** As a user, I want each label next to its text without covering it, so that I can compare the label with the text on the machine.

Source: CAPABILITY-MAP.md §4.A (placement that doesn't cover the source text), ARCHITECTURE.md §4 (`placeLabels`), native-ux steering (Labels don't cover their own target), QE-3, OQ-6.

#### Acceptance Criteria

1. THE Overlay_Layer SHALL draw a Source_Outline on the mapped Quad of each line that is visible or clipped (OQ-6).
2. THE geometry module SHALL place each Label box outside its own line's mapped Quad (OQ-6).
3. THE geometry module SHALL place each Label box fully inside the Visible region.
4. THE geometry module SHALL place Label boxes so that no two Label boxes overlap.
5. IF no position meets criteria 2 to 4 for a Label box, THEN THE geometry module SHALL report that label as unplaced.
6. WHILE a label is unplaced, THE Overlay_Layer SHALL make that line's Source_Outline a touch target that shows the label's full text and Label state (OQ-6).
7. WHEN the geometry module receives the same lines, Label box sizes and Visible region, THE geometry module SHALL return the same placement.

Verification: property tests (Requirement 25, criterion 5) and unit tests on Recorded OCR snapshots of TM-01.

### Requirement 14: Layout and safe-area changes

**User Story:** As a user, I want overlays to stay on their text when the screen layout changes, so that a system bar or inset change doesn't shift them onto the wrong text.

Source: visual-computer-vision steering (Frames), CAPABILITY-MAP.md §4.A, native-ux steering (safe-area insets).

#### Acceptance Criteria

1. WHEN the still view's size changes, THE ui module SHALL recompute every Overlay item's View-space position through the geometry module.
2. WHEN the safe-area insets change, THE ui module SHALL recompute every Overlay item's View-space position through the geometry module.
3. THE Camera_Screen SHALL place its controls inside the safe-area insets.

Verification: unit tests of the ui hook with recorded sizes and insets. Device: inset changes checked during DT-G1-03, device validation pending.

### Requirement 15: Overlay items and freeze-frame lifetime

**User Story:** As a user, I want overlays to belong only to the still I'm looking at, so that I never see labels from an earlier photo.

Source: D-011, D-020, ARCHITECTURE.md §7 (Overlay lifetime), architecture steering (derived results keep their frame ID).

#### Acceptance Criteria

1. THE ui module SHALL give each Overlay item the frameId of the OcrResult it came from.
2. WHILE a still is shown, THE Overlay_Layer SHALL draw only Overlay items whose frameId equals the shown still's frameId.
3. WHILE a still is shown, THE Overlay_Layer SHALL keep that still's Overlay items for as long as the still is shown.
4. WHEN the user taps the close button on the shown still, THE Camera_Screen SHALL dismiss the still and show the preview.
5. WHEN the shown still is dismissed, THE Overlay_Layer SHALL remove every Overlay item of that still.
6. WHEN a new still replaces the shown still, THE Overlay_Layer SHALL remove every Overlay item of the replaced still before drawing Overlay items for the new still.
7. IF an OcrResult arrives for a frameId that is no longer shown, THEN THE ui module SHALL discard that OcrResult without drawing any Overlay item from it.

Verification: unit tests of the overlay state logic with Recorded OCR snapshots, including a late result for a replaced frame.

### Requirement 16: Live mode (optional)

**User Story:** As a user, I want overlays on the moving preview if the phone can keep them aligned, and I want old labels removed when I move the phone, so that I never read a label for text that is no longer there.

Source: D-011, D-020, AT-G1-06, DT-G1-05, `tasks/plan.md` G1c (hard cap of 1 day), ARCHITECTURE.md §5 (frame-processor slot) and §7, OQ-5.

#### Acceptance Criteria

1. THE OverlayKit_App SHALL include Live mode in release builds only after AT-G1-06 has a PASSED record in `docs/DEVICE-TESTS.md`. Without that record, release builds offer Freeze-frame mode only (D-011).
2. WHERE Live mode is enabled, THE capture module SHALL provide live frames as FrameRefs with source `live` through a frame-processor slot that the ui module connects to the ocr module.
3. WHERE Live mode is enabled, IF an OcrResult's capturedAtMs is not later than that of the newest OcrResult already applied, THEN THE ui module SHALL drop that OcrResult.
4. WHERE Live mode is enabled, WHEN a newer OcrResult contains a line that the geometry module matches to an existing Overlay item by text and overlap, THE ui module SHALL refresh that Overlay item's frameId and position from the newer OcrResult.
5. WHERE Live mode is enabled, IF an Overlay item has not been refreshed within the live overlay time-to-live, THEN THE Overlay_Layer SHALL remove that Overlay item.
6. WHERE Live mode is enabled, THE ui module SHALL define the live overlay time-to-live as one Named threshold constant, with its value set during G1c and recorded in `docs/DECISIONS.md` (OQ-5).

Verification: unit tests with recorded live sequences, including out-of-order and duplicate results. Device: DT-G1-05 on a release build, device validation pending.

### Requirement 17: Translate labels during G1

**User Story:** As a user in Translate mode before a translation provider exists, I want each label to say plainly that translation isn't available, so that I never mistake the recognized text for a translation.

Source: P4, D-007, QE-3, ARCHITECTURE.md §6 (Translate) and §8 (`TR_NOT_CONFIGURED`, `OCR_UNSUPPORTED_SCRIPT`), product steering (Truthful capabilities), D-028, OQ-1.

#### Acceptance Criteria

1. THE locale module SHALL provide a TranslationProvider interface whose only adapter during G1 is the Not-configured adapter (OQ-1).
2. WHEN the Not-configured adapter receives lines to translate, THE locale module SHALL return `TR_NOT_CONFIGURED` for every line without making a network request (OQ-1).
3. WHEN an OcrLine with a Latin or Devanagari Script is drawn in Translate mode, THE ui module SHALL request its translation through the locale module.
4. IF an OcrLine is marked with `OCR_UNSUPPORTED_SCRIPT`, THEN THE ui module SHALL show that line in the unsupported Label state and send no translation request for it.
5. WHILE a line's translation request is outstanding, THE Overlay_Layer SHALL show that line in the pending Label state with a text marker.
6. WHILE a line's translation result is `TR_NOT_CONFIGURED`, THE Overlay_Layer SHALL show the line's recognized text with the marker "Translation not available" in the failed Label state (OQ-1).
7. THE Overlay_Layer SHALL show each label in exactly one Label state.
8. THE Overlay_Layer SHALL show a label in the translated Label state only for text returned by a TranslationProvider adapter.
9. THE locale module SHALL store no API key and send no request to OpenRouter or the backend proxy in this spec (D-028).

Verification: unit tests for criteria 2 and 4 to 8 (QE-1, QE-3). A source search for criterion 9.

### Requirement 18: Camera screen and mode switcher

**User Story:** As a user, I want the app to open straight to the camera with only the modes that work, so that I can start reading text without setup or dead ends.

Source: P1, P2, P8, CM-4, architecture steering (routes stay thin), native-ux steering (Screens and navigation), visual-computer-vision steering (Uncertainty).

#### Acceptance Criteria

1. WHEN the OverlayKit_App launches, THE OverlayKit_App SHALL open on the Camera_Screen at the index route, in place of the current placeholder Home screen.
2. THE index route SHALL render the ui module's Camera_Screen and hold no other logic.
3. THE Camera_Screen SHALL show a mode switcher whose only mode is Translate (CM-4).
4. THE Camera_Screen SHALL show a text message in every state it can reach, including starting, preview, capturing, reading, still with overlays, and each `CAM_*` and `OCR_*` state.
5. THE Overlay_Layer SHALL draw only Overlay items derived from OcrResults that the ocr module produced from frames captured in the current app session.
6. THE OverlayKit_App SHALL keep fake OcrResults, placeholder boxes and demo text in test files only.

Verification: unit tests for criteria 3 and 4. Review and a source search for criteria 2, 5 and 6.

### Requirement 19: Readable and accessible overlays and controls

**User Story:** As a user holding the phone at a machine, I want labels and controls I can read and reach, including with a screen reader, so that I can use the app in a public place.

Source: native-ux steering (Readable overlays, Accessibility, Localization).

#### Acceptance Criteria

1. THE Overlay_Layer SHALL draw label text on a solid or near-opaque backing with a text-to-backing contrast ratio of at least 4.5:1.
2. THE Overlay_Layer SHALL draw label text at 14 sp or larger.
3. IF a label's text doesn't fit its Label box, THEN THE Overlay_Layer SHALL truncate the text with an ellipsis.
4. WHEN the user taps a truncated label, THE Camera_Screen SHALL show the label's full text.
5. THE Overlay_Layer SHALL show each label's Label state as text, or as an icon with text.
6. THE Camera_Screen SHALL give every touchable element a touch target of at least 48 × 48 dp.
7. THE Camera_Screen SHALL give every touchable element an accessibilityRole and an accessibilityLabel in the current UI language.
8. THE Overlay_Layer SHALL expose each tappable label's text to Android accessibility services.
9. THE Overlay_Layer SHALL show Devanagari and Kannada text with the marks above and below the line fully visible.

Verification: unit tests on style constants and accessibility props for criteria 1, 2, 5, 6 and 7. Device: contrast and glyph rendering checked on screenshots, device validation pending.

### Requirement 20: UI strings

**User Story:** As a user, I want every message on the camera screen to come from the app's string tables, so that the screen can be shown in English, Hindi and Kannada, with the Hindi and Kannada text marked unreviewed (D-031).

Source: P3, native-ux steering (Localization), ARCHITECTURE.md §4 (`locale` owns `t(key)`), OQ-2.

#### Acceptance Criteria

1. THE ui module SHALL obtain every user-facing string on the Camera_Screen through the locale module's `t(key)` (OQ-2).
2. THE locale module SHALL hold an `en`, `hi` and `kn` value for every string key this spec adds (OQ-2).
3. THE locale module SHALL mark each `hi` and `kn` value added by this spec as unreviewed, and THE locale module SHALL NOT mark any such value as reviewed, because no reviewers are available (D-031, OQ-2).
4. WHILE no language setting exists, THE ui module SHALL use `en` as the UI language (OQ-2).
5. THE locale module SHALL store each user-facing sentence under one key, with placeholders for inserted values.

Verification: a unit test that every key has all three locales; a lint rule or source search for string literals in `ui` views.

### Requirement 21: Debug OCR snapshot export

**User Story:** As a developer, I want to export what the phone actually recognized, so that unit and property tests run on real OCR output instead of invented data.

Source: CAPABILITY-MAP.md §4.A, ARCHITECTURE.md §12 (recorded OCR snapshots), quality steering (Tests), AT-G1-04, visual-computer-vision steering (Privacy), OQ-3.

#### Acceptance Criteria

1. WHERE the build is a debug build, THE Snapshot_Exporter SHALL offer an export action while a still and its OcrResult are shown.
2. WHEN the user runs the export action, THE Snapshot_Exporter SHALL write one JSON file holding the OcrResult, the FrameRef fields, the still view's size, the safe-area insets, and the phone model.
3. WHEN the user runs the export action, THE Snapshot_Exporter SHALL write the still photo beside the JSON file under the same base name.
4. THE Snapshot_Exporter SHALL write exports to OverlayKit's app-specific storage outside the cache directory (OQ-3).
5. THE Snapshot_Exporter SHALL keep exports out of the phone's gallery and shared media storage.
6. WHEN a release build is produced, THE OverlayKit_App SHALL exclude the Snapshot_Exporter and every debug-only test hook from the release bundle.
7. THE test-fixtures folder SHALL hold only images of team-owned fixtures, with no people, faces, documents or card numbers.

Verification: a search of the `npx expo export --platform android` output for export and test-hook markers (criterion 6); review of each added fixture (criterion 7). Device: export run in a debug build, device validation pending.

### Requirement 22: Privacy, offline use and permissions

**User Story:** As a user, I want text reading to happen on my phone without sending images anywhere, so that bystanders, documents and cards in the frame stay private and the app works without a network.

Source: P5, D-006, AT-G1-10, AT-G1-11, ARCHITECTURE.md §11 (T1, T9, T10), QUALITY-GATES.md Q9.

#### Acceptance Criteria

1. THE capture module, ocr module and geometry module SHALL make no network requests.
2. THE OverlayKit_App SHALL keep all image data on the phone.
3. WHILE the OverlayKit_App runs as a release build, THE OverlayKit_App SHALL log no OCR text and no image data.
4. THE ocr module SHALL load its recognition model from the app package, with no model download at runtime.
5. THE OverlayKit_App's merged Android manifest SHALL list only `CAMERA`, `INTERNET`, and permissions that Expo or React Native core require, each one justified in `docs/build-log.md`.

Verification: code review and a source search for network APIs in `capture`, `ocr` and `geometry` (AT-G1-11); manifest inspection after `npx expo prebuild` (Q9). Device: DT-G1-09 for criterion 4, device validation pending.

### Requirement 23: Module boundaries and error contract

**User Story:** As a developer of later specs, I want the camera, OCR and geometry code behind typed, one-way module boundaries, so that I can use their results without depending on vendor libraries or hidden coupling.

Source: D-012, ARCHITECTURE.md §4, §5 and §8, architecture steering (Layers, Typed observations, Provider adapters), QUALITY-GATES.md Q4, CAPABILITY-MAP.md §1 (rule 5).

#### Acceptance Criteria

1. THE shared module SHALL define Quad, FrameRef, OcrResult, OcrLine, Script, and the `CAM_*` and `OCR_*` error codes listed in ARCHITECTURE.md §8.
2. THE capture module SHALL return every failure as a Result error with a `CAM_*` code.
3. THE ocr module SHALL return every failure as a Result error with an `OCR_*` code.
4. THE capture module SHALL keep camera-library types inside the capture module.
5. THE ocr module SHALL keep OCR-engine types inside the ocr module.
6. THE capture module SHALL run no text recognition and import nothing from the ocr module.
7. THE ocr module SHALL return coordinates in Image space only.
8. THE geometry module SHALL be the only module that converts Image-space coordinates to View-space coordinates.
9. THE geometry module SHALL import only the shared module, with no React Native imports and no I/O.
10. THE ui module SHALL be the only module that wires the capture module, ocr module, geometry module and locale module together.
11. THE capture module, ocr module, geometry module, locale module and ui module SHALL import other modules only through each module's `index.ts`, as checked by static gate Q4.
12. THE ui module SHALL map every `CAM_*` and `OCR_*` code to the Camera_Screen state given in ARCHITECTURE.md §8.

Verification: `npm run typecheck`, `npm run lint` with the boundary rule (Q4, once added), and the QE-1 tests in Requirement 25.

### Requirement 24: G1 device acceptance measurements

**User Story:** As the owner, I want G1 judged on measurements taken on the reference phone, so that the gate reflects what a user would see at the machine.

Source: QUALITY-GATES.md G1 (AT-G1-01 to AT-G1-11), DEVICE-TESTS.md (DT-G1-01 to DT-G1-10), OQ-3, OQ-4, OQ-6.

Every threshold in this requirement is *(proposed; confirmed once after the G1 spike baseline; any change needs a DECISIONS.md entry)*. Every criterion here is device-only and is "device validation pending".

#### Acceptance Criteria

1. WHEN DT-G1-01 runs on a fresh install, THE Camera_Screen SHALL show the Requirement 1 state for each of the grant, deny, and "don't ask again" paths (AT-G1-01).
2. WHEN DT-G1-02 runs (TM-01 image fixture, L2, D60, A0, 10 freeze-frame captures, following the iPad capture checklist in FIXTURE.md section 9), THE ocr module SHALL recognize at least 90% of the ground-truth strings in FIXTURE.md section 3 after case and whitespace normalization, over the 10 captures (AT-G1-02).
3. WHEN DT-G1-03 runs, THE Overlay_Layer SHALL place the Source_Outline centre within 0.5 × Line height of its source text's centre, measured on screenshots, for at least 95% of recognized lines whose Quad centre lies inside the Visible region (AT-G1-03, OQ-4, OQ-6).
4. WHEN DT-G1-03 runs at each combination of D30, D60 and D100 with A0 and A30, THE Overlay_Layer SHALL meet criterion 3 at every combination (AT-G1-04).
5. WHEN DT-G1-04 runs on a release build (TM-01 image fixture with the FIXTURE.md section 3 ground-truth strings, L2, D60, 20 captures taken per the FIXTURE.md section 9 checklist, translation excluded), THE OverlayKit_App SHALL show overlays within 1.5 s of the capture tap at p50 and within 3 s at p95 (AT-G1-05).
6. WHERE Live mode is enabled, WHEN DT-G1-05 runs on a release build, THE OverlayKit_App SHALL apply at least 2 OCR updates per second (AT-G1-06).
7. WHERE Live mode is enabled, WHEN DT-G1-05 runs with the phone held still (M0), THE Overlay_Layer SHALL keep overlay jitter at or below 0.25 × Line height (AT-G1-06).
8. WHERE Live mode is enabled, WHEN DT-G1-05 runs for 10 minutes of continuous use, THE OverlayKit_App SHALL run without a crash, a thermal shutdown, or steadily rising memory (AT-G1-06).
9. WHEN DT-G1-06 runs (CARD-HI, L2, D60, 5 captures), THE ocr module SHALL recognize at least 80% of the card's lines as Devanagari text (AT-G1-07).
10. WHEN DT-G1-07 runs (CARD-KN, L2, D60, 5 captures), THE Camera_Screen SHALL show the `OCR_UNSUPPORTED_SCRIPT` or `OCR_NO_TEXT` state, with no engine text shown as if it were real text (AT-G1-08).
11. WHEN DT-G1-08 runs on a release build (BLANK), THE Camera_Screen SHALL show the `OCR_NO_TEXT` state within 2 s of the capture tap (AT-G1-09).
12. WHILE the phone is in airplane mode, WHEN DT-G1-09 runs on a fresh install, THE ocr module SHALL meet criterion 2 (AT-G1-10).
13. WHEN DT-G1-10 runs (debug build, 5 captures, last still dismissed), THE capture module SHALL leave no still image in OverlayKit's cache directory (AT-G1-11, OQ-3).

Verification: a PASSED record per criterion in `docs/DEVICE-TESTS.md` with build commit, variant, device and date.

### Requirement 25: Tests and evidence

**User Story:** As the owner, I want the geometry and OCR handling covered by tests on real recorded data, and every error state reached on the phone, so that a passing gate means the behaviour was checked.

Source: quality steering (Tests, Never, Real-device gate), QUALITY-GATES.md (QE-1, QE-2, Q5), ARCHITECTURE.md §12, visual-computer-vision steering (Tests here).

#### Acceptance Criteria

1. THE Test_Suite SHALL cover every exported geometry module function with property tests over random image and view sizes in portrait and landscape aspect, random crop and scale, and Quads at random rotation angles.
2. THE Test_Suite's geometry property tests SHALL check that every output coordinate is finite.
3. THE Test_Suite's geometry property tests SHALL check that mapping a point to View space and back returns the original point within a Named threshold constant tolerance.
4. THE Test_Suite's geometry property tests SHALL check that every mapped line has exactly one visibility state and that no clipped Source_Outline moves from its mapped position.
5. THE Test_Suite's label placement property tests SHALL check that every label is either placed outside its own Quad, inside the Visible region and clear of other Label boxes, or reported unplaced.
6. THE Test_Suite SHALL use Recorded OCR snapshots from the test-fixtures folder as the input for every ocr, geometry and ui unit test that needs OCR output.
7. IF a test needs a case that recorded captures can't produce, such as a non-finite or zero-area Quad, THEN THE Test_Suite SHALL derive that case from a Recorded OCR snapshot by changing named fields, and state the changed fields in the test.
8. THE Test_Suite SHALL include, for each `CAM_*` and `OCR_*` code, a unit test that the owning module produces the code and a unit test that the ui module maps it to its ARCHITECTURE.md §8 state (QE-1).
9. THE Test_Suite SHALL include a unit test of the geometry module's mirrored-frame flip.
10. THE Test_Suite SHALL include, for each Named threshold constant, a unit test that checks behaviour on both sides of the threshold.
11. WHEN G1 device testing runs, THE Device_Tester SHALL reach each user-visible `CAM_*` and `OCR_*` state at least once on the Reference phone, through the DT-G1 tests or the DT-ERR series, using debug-only test hooks for states that are hard to trigger (QE-2).

Verification: `npm test` output with pass and fail counts; device records in `docs/DEVICE-TESTS.md`. Criteria 1 to 5 need the property-test library (see Dependencies).

## Open Questions

Each item below is **pending owner decision**. The criteria use the recommended default until the owner decides.

### OQ-1: Label state in spec A

- **Conflict:** D-007 (Accepted, contract) and the product steering say Translate shows `TR_NOT_CONFIGURED` during G1. QE-3 allows only four Label states: translated, pending, failed, unsupported. CAPABILITY-MAP.md §5 puts every `TR_*` code in spec B.
- **Sources:** D-007, QE-3, CAPABILITY-MAP.md §4.B and §5, ARCHITECTURE.md §8.
- **Recommended default:** spec A adds the TranslationProvider interface and the Not-configured adapter to the locale module. The adapter returns `TR_NOT_CONFIGURED` for every line, so A's labels show the original text with "Translation not available" in the failed state. Unsupported-script lines show the unsupported state. Nothing fake is shown. Moving this adapter from B to A needs a CAPABILITY-MAP.md update after approval. In spec B, `TR_NOT_CONFIGURED` stays a real state at runtime: a language pair that needs the cloud shows it when the user has saved no OpenRouter key and no proxy is deployed (D-028).
- **Used by:** Requirement 17.

### OQ-2: UI strings in spec A

- **Conflict:** the native-ux steering requires every user-facing string to go through `t(key)` with `en`, `hi` and `kn` values. The string tables belong to the locale module, which CAPABILITY-MAP.md assigns to spec B, and D-031 says no fluent reviewers are available, so `hi` and `kn` text has `unreviewed` status.
- **Sources:** native-ux steering (Localization), ARCHITECTURE.md §4, CAPABILITY-MAP.md §4.B, PRODUCT.md (Language support).
- **Recommended default:** spec A adds `t(key)` and the string keys for its own screens to the locale module, in all three locales, with `hi` and `kn` marked `unreviewed` and never `reviewed` (D-031). Views hold no hard-coded user-facing text. Until B adds a language setting, the UI language is `en`, so unreviewed `hi` and `kn` text is never shown to users.
- **Used by:** Requirement 20 and the quoted English messages in Requirements 1, 2, 7, 8 and 17.

### OQ-3: When the temporary still is deleted

- **Conflict:** AT-G1-11, threat T1 and CAPABILITY-MAP.md §4.A say the still is deleted "after OCR". Freeze-frame overlays are drawn on that still for as long as it is shown (D-011, D-020).
- **Sources:** AT-G1-11, DT-G1-10, ARCHITECTURE.md §11 (T1), D-011, D-020.
- **Recommended default:** the temporary still file is deleted when the still is dismissed or replaced, when the app moves to the background, and, for any leftovers, on the next app start. DT-G1-10 checks the cache after the last still is dismissed. The debug export writes outside the cache folder and exists only in debug builds. Changing AT-G1-11's wording needs a DECISIONS.md entry.
- **Used by:** Requirement 4, Requirement 21 (criterion 4), Requirement 24 (criterion 13).

### OQ-4: Partly visible text

- **Conflict:** the visual-computer-vision steering says off-screen text is marked and clipped, never pinned to the edge, but doesn't define partial visibility. AT-G1-03 doesn't say which lines it counts.
- **Sources:** visual-computer-vision steering (Frames), AT-G1-03, `isVisibleInView` in `cover-transform.ts`.
- **Recommended default:** a line whose Quad is entirely outside the Visible region is marked off-screen and not drawn. A partly visible line is drawn clipped at the Visible region's edge and never moved inward. AT-G1-03 counts lines whose Quad centre is inside the Visible region.
- **Used by:** Requirement 12, Requirement 24 (criterion 3).

### OQ-5: Values the docs don't give

- **Conflict:** QUALITY-GATES.md and ARCHITECTURE.md name the behaviours but give no values for the Low-quality rule (`OCR_LOW_QUALITY`, including the heuristic used when the engine gives no confidence), the live overlay time-to-live (D-020), or the Unsupported-script rule that detects garbled Latin output from Kannada text.
- **Sources:** ARCHITECTURE.md §8, D-020, AT-G1-08, visual-computer-vision steering (Confidence gating).
- **Recommended default:** each value is a Named threshold constant defined in one place and covered by a test. The G1a spike sets the Low-quality and Unsupported-script values from captures on the Reference phone (TM-01 at L3, CARD-KN). G1c sets the time-to-live, if Live mode is attempted. Each value is recorded in `docs/DECISIONS.md` before the G1 device measurements. This document invents no numbers for them.
- **Used by:** Requirements 7, 8, 9 and 16.

### OQ-6: Label position compared with AT-G1-03

- **Conflict:** CAPABILITY-MAP.md §4.A and the native-ux steering want labels placed so they don't cover their source text. AT-G1-03 requires "each overlay's centre" to lie within 0.5 × line height of the source text's centre, which a label placed beside the text can't meet. PRODUCT.md says translations are drawn "over the source text's position".
- **Sources:** AT-G1-03, CAPABILITY-MAP.md §4.A, native-ux steering (Labels don't cover their own target), PRODUCT.md (Modes).
- **Recommended default:** each Overlay item has two parts. A Source_Outline is drawn on the mapped Quad, and AT-G1-03 measures its centre. A Label box is placed next to the outline by the geometry module and doesn't cover the source text. When no free position exists, the label is reported unplaced and the outline becomes a touch target that shows the full label. Clarifying AT-G1-03's wording needs a DECISIONS.md entry.
- **Used by:** Requirement 13, Requirement 24 (criteria 3 and 4).

### OQ-7: Error code for a recognition failure on one frame

- **Conflict:** ARCHITECTURE.md §8 has `OCR_ENGINE_UNAVAILABLE` for a missing engine or model, which disables Translate. It has no code for an engine that loaded but failed on one frame. Reusing `OCR_ENGINE_UNAVAILABLE` would disable Translate after a one-off failure. Reusing `OCR_NO_TEXT` would tell the user no text was found when the read failed.
- **Sources:** ARCHITECTURE.md §8, CAPABILITY-MAP.md §1 (rule 4: a new code needs a DECISIONS.md entry), QE-3 (no silent failure).
- **Recommended default:** add `OCR_RECOGNITION_FAILED`, raised by the ocr module, through a DECISIONS.md entry and a new ARCHITECTURE.md §8 row. The user sees a short error with Retry, like `CAM_CAPTURE_FAILED`.
- **Used by:** Requirement 8 (criteria 9 and 10).

## Dependencies

- **Owner Q4 (reference phone):** not named. G0 build gate B1 hasn't run, and no phone is connected (`docs/DEVICE-TESTS.md`). Every device criterion is "device validation pending" until B1 passes on the Reference phone.
- **TM-01 form (D-029, D-032):** TM-01 is the TM-01 image fixture, shown on an iPad. The ground-truth strings exist in FIXTURE.md section 3, but the art, its generator and date, the iPad resolution and the measured boxes are still `TBD` or DRAFT. DT-G1-02, DT-G1-03 and DT-G1-04 can't run until the final images exist and the boxes are measured.
- **iPad glare and screen pattern:** the iPad's glare and screen pattern can reduce OCR recall on the TM-01 image fixture. The G1 stop condition applies: if recall in good light is under 70%, stop and try a paper print of TM-01 as the fallback before changing code (FIXTURE.md section 9).
- **Proposed decisions:** D-004 (development build), D-005 (on-device OCR, Kannada unsupported), D-011 (freeze-frame first), D-012 (module boundaries) and D-020 (overlay frame and expiry) are still Proposed. These requirements assume them.
- **G0 leftovers:** the module-boundary lint rule (static gate Q4) isn't added, so Requirement 23 criterion 11 has no automatic check yet. No property-test library is installed. fast-check is the candidate and needs dependency approval (stack steering) before Requirement 25 criteria 1 to 5 can be met.
- **Recorded OCR snapshots:** none exist, and `test-fixtures/` doesn't exist yet. Unit tests that need OCR input wait for the first Snapshot_Exporter run on the Reference phone.
- **Camera library and OCR engine:** chosen in the G1a spike. Adding them follows the stack steering's dependency steps, and each needs owner approval first.
- **G1 stop and pivot conditions:** the conditions in `docs/QUALITY-GATES.md` G1 apply unchanged: no working OCR binding, recall below 70%, live overlays missing their gate after 1 day, or Kannada reading becoming required.
