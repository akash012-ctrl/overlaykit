# OverlayKit: demo video script

Status: **template, nothing recorded** (2026-11-19, spec 04 task 12.2, updated for the any-machine Guide). The video must be **under 3 minutes**, public on YouTube, shot on a real phone. It may show only a capability whose DT row in [DEVICE-TESTS.md](DEVICE-TESTS.md) says PASSED. Today only DT-G0-01 has PASSED, so no row below may be filmed yet. Each row says what to film once its record exists. Claims come from [release-claims.md](release-claims.md).

## Capability table

| # | Show | Needs PASSED | Claim IDs | Shot only if |
| --- | --- | --- | --- | --- |
| 1 | App opens to the camera | DT-G0-01 (passed, debug build) and a release-build record when it exists | CL-03 | The build in the shot is the one in the record |
| 2 | Translate live: point at a real sign or machine; translation chips appear on the lines with no tap and slide with the text; then Hold | DT-G1-02, DT-G2-01, PD-11 | CL-13, CL-14 | All PASSED. If a pair fails, show the failure as it appears, no fake output |
| 3 | Guide: goal lines appear on their own; pick one by tap; first AI-suggested step is read aloud with the target ring on the text | DT-G5-01, PD-12 | CL-04, CL-05 | PASSED on the machine filmed |
| 4 | A step advances after the screen changes, and Done | DT-G5-02 | CL-06 | PASSED |
| 5 | A plan with no matching text: "Not in view", no highlight | DT-G5-03 | CL-05 | PASSED |
| 6 | Voice goal | DT-G5-05 | CL-16 | PASSED, in the language shown |
| 7 | Airplane mode with the on-device planner | DT-G5-04 | CL-08 | PASSED |
| 8 | Gemini Live: consent screen, "Start Gemini Live", banner, Stop | DT-G5-10, DT-G5-11 | CL-09, CL-10 | PASSED. Say it streams to Google and needs the network |

## Voice-over (edit after the rows are PASSED)

Keep it short. Use only the first-person facts below.

1. "OverlayKit is an Android camera app. Point it at a machine or sign you can't read." (rows 1, 2)
2. "Translations sit on the text as you point. Say or tap what you want to do, and the app reads out one step and rings the text to use." (rows 2, 3)
3. "These steps are AI suggestions. They can be wrong, so the app says so on every step." (row 3, on screen)
4. "It moves on when the camera sees the screen change, or when you tap Done. Never on a timer." (row 4)
5. "If it can't find the text, it shows no highlight." (row 5)
6. "By default planning runs on the phone. Gemini Live is optional. It sends camera video and your voice to Google after you agree, and a banner stays on until you press Stop." (row 8, if filmed)
7. "Android only. Hindi and Kannada text is machine-written and not reviewed." (end card)

## Must not appear in the video or its text

- "Verified", "correct", "AR", "augmented reality", "world tracking".
- Gemini Live called "on-device" or "offline".
- iOS, real-world machine support, Kannada camera reading, store release.
- Any speed, accuracy, battery or memory number without a DT-G5-07 record.
- Third-party trademarks or music without permission. Film a machine you are allowed to film. No people or card numbers in frame.
- The Google API key on screen.

## Before upload

- [ ] Length under 3 minutes.
- [ ] Every shot matches a PASSED row above. Record the commit and build variant used.
- [ ] Logged-out check of the YouTube link (RC-6). Link: `<pending, not created>`.
