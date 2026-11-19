# OverlayKit: release claims ledger

Status: written 2026-11-19 (spec 04 task 12.1, updated for the any-machine Guide, D-039 to D-051). One row per public capability claim. **A row may be used in the README, demo script or Devpost text only when its status is "usable".** A row marked "device validation pending" must not appear as a fact in public text. It may appear only as "not yet validated". The only PASSED device record today is DT-G0-01 (debug build launched). Device IDs are in [DEVICE-TESTS.md](DEVICE-TESTS.md).

Wording to avoid in public text (checked in review, and by task 12.4 when that script exists): "verified machine", "verified", "correct plan", "AR", "augmented reality", "world tracking", "SLAM", "ARCore", "ARKit", "works offline" for Gemini Live, "on-device" for Gemini Live, "supports Kannada" for camera reading, "iOS", "real-world machine support", "reviewed" or "verified by a fluent speaker" for Hindi or Kannada text.

| ID | Claim (allowed wording) | Evidence | Status |
| --- | --- | --- | --- |
| CL-01 | OverlayKit is an Android app, MIT licensed, copyright 2026 Akash Singh. | `LICENSE` in the repository, D-044. | usable |
| CL-02 | Built locally with Gradle, no EAS. | `build-approach` steering, D-002, `docs/build-log.md`. | usable |
| CL-03 | A debug build installed and launched on the Redmi Note 12 Pro 5G (Android 14). | DT-G0-01 PASSED, 2026-11-19 session 2. Debug build only. | usable (say "debug build", "launched") |
| CL-04 | Guide suggests one step at a time on any machine, and says the plan is an AI suggestion that can be wrong. | Design: D-039, PRODUCT.md P6. Working behaviour: DT-G5-01. | wording usable (the label and note). "It works on any machine": device validation pending (DT-G5-01) |
| CL-05 | The highlight is a 2D box on text the camera read. A step that names unseen text shows no highlight. | D-041, grounding rule (R5). Behaviour on a phone: DT-G5-03. | design statement usable. "It never mis-points": not claimable. Device validation pending (DT-G5-03) |
| CL-06 | A step advances when the camera sees the expected change in two observations in a row, or on Done, never on a timer. | D-019, D-043. Behaviour on a phone: DT-G5-02. | design statement usable. Device validation pending (DT-G5-02) |
| CL-07 | Two planners: on-device Gemma 4 E2B (default) and optional Gemini Live. | D-049, D-050, D-051, code in `src/modules/planner`. | usable as a description. Neither planner has a PASSED device record. |
| CL-08 | With the on-device planner, no image and no planning text leave the phone. | Design D-040, D-049. Device checks: DT-G5-04, DT-G5-09. Vision-safety review (AT-G5-08) not run. | device validation pending |
| CL-09 | Gemini Live sends camera frames, microphone audio, the goal text and the OCR text lines to Google, only after consent and a tap on "Start Gemini Live". A "Streaming to Google" banner with Stop shows while it runs. Nothing is stored on the phone. | Design D-050. Device checks: DT-G5-10, DT-G5-11. | the data-flow description is usable. "Nothing is stored", "Stop works within a second": device validation pending (DT-G5-10) |
| CL-10 | Gemini Live needs the network and the user's own Google API key. It is not on-device and not offline. | D-050, D-051. | usable |
| CL-11 | The model file is downloaded only after the user taps Download, and checked with SHA-256. | Manifest `src/modules/planner/model-manifest.ts`. Behaviour: DT-G5-12. | device validation pending (DT-G5-12) |
| CL-12 | Gemma 4 E2B is used under Apache-2.0. Gemma 3 1B is sideload only under the Gemma Terms of Use and is not distributed by the project. | D-047, D-048, D-049. | usable (licence and attribution text in README) |
| CL-13 | The camera reads English and Hindi text. Kannada text is not read from the camera. | PRODUCT.md language table, D-005. Recall on a phone: DT-G1-02, DT-G1-06, DT-G1-07. | the Kannada limit is usable. "Reads English and Hindi well": device validation pending |
| CL-14 | Translation of recognized text into English, Hindi or Kannada uses Google ML Kit on-device translation, text only. | D-030, `locale/adapters/on-device.ts`. Phone behaviour: DT-G2-01 to DT-G2-06. | description usable. Quality and any "works": device validation pending. No quality percentage (D-031). |
| CL-15 | Hindi and Kannada app text and step text are not reviewed by a fluent speaker. | D-031. | usable (must be said) |
| CL-16 | Voice goal input uses Android's speech recognizer, asked on the first mic tap. Audio may go to Google's recognition service if the phone has no on-device pack. The app stores no audio. | D-042, D-046. Behaviour: DT-G5-05. | disclosure usable. "Voice works in Hindi": device validation pending (DT-G5-05) |
| CL-17 | Speak is offered only when the phone has a voice for the language. | D-014, D-044. Behaviour on a phone: needs a DT row from spec 04 task 4 (not run). | device validation pending |
| CL-18 | Android is the only tested platform. iOS is not built or tested. | D-003. | usable |
| CL-19 | Time per step, memory, battery, load time and data use. | DT-G5-07. | **No numbers exist.** Do not state any. |
| CL-20 | Hindi and Kannada planning quality. | DT-G5-07. | **Unmeasured.** Say "unmeasured". |
| CL-21 | The release APK is debug-signed and for testing on your own phone. | D-044. | usable |
| CL-22 | Works on the owner's phone with Gemma 4 E2B (5.7 GB RAM). | DT-G5-07, DT-G5-12. | **Unknown.** Do not claim. The README says it may not run. |

Rows added after a device run: copy the DT ID, the result and the commit from DEVICE-TESTS.md, and change "device validation pending" only when the record says PASSED.
