# OverlayKit: delivery plan

Status: **awaiting approval of architecture and scope.** No feature work starts before approval.

Priority order is fixed: **G1 camera/OCR geometry → G2 translation → G3 component understanding → G4 guided workflow.** A later gate never passes before an earlier one. Gate criteria and stop/pivot conditions are in [../docs/QUALITY-GATES.md](../docs/QUALITY-GATES.md).

Deadline: Kiroween submission closes **4 Dec 2026, 2:00 pm Pacific**. Target submission: **3 Dec**. Dates below assume one focused working day per calendar day.

## Phases

| Phase | Dates (target) | Goal | Depends on | Exit |
| --- | --- | --- | --- | --- |
| P0 | Nov 17 | Approve product contract, architecture, scope, proposed decisions | — | Owner approval; decisions marked Accepted or changed |
| G0 | Nov 18 (½ day) | Toolchain and baseline on the reference phone; LICENSE; test runner; boundary lint | P0, phone available | AT-G0-01…04 |
| G1a | Nov 18–19 | Camera and OCR spike: choose libraries that build with SDK 58 / RN 0.88 | G0 | Choice recorded in DECISIONS.md; text recognized on the phone |
| G1b | Nov 20 | Freeze-frame pipeline: capture → OCR → geometry → overlay; recorded OCR snapshots; error states | G1a | AT-G1-01…05, 07…11 |
| G1c | Nov 21 (hard cap 1 day) | Live overlays (optional upgrade) | G1b passed | AT-G1-06, or fall back to freeze-frame (D-011) |
| G2 | Nov 22–23 | Provider evaluation and selection; integration; backend proxy only if cloud | G1b; reviewers for ratings | AT-G2-01…09 |
| G3 | Nov 24–25 | TM-01 identification, component location, Explore UI | G2; TM-01 fixture authored | AT-G3-01…06 |
| G4 | Nov 26–27 | TM-01 workflow, step reducer, Guide UI, voice | G3; workflow verified on TM-01 | AT-G4-01…08 |
| RC | Nov 28 | Hardening and S1 rehearsal | G4 | RC-1…4 |
| SUB | Nov 29–30 | Signed release APK on a GitHub Release, README install steps, demo video, Devpost text | RC | RC-5, RC-6 |
| Buffer | Dec 1–2 | Absorbs the extra OCR-module day or other slips | — | — |
| Submit | Dec 3 | Submit | SUB | Submission confirmed |

If G1a needs the extra day to write a local Expo Module, it comes out of the buffer. If the buffer is gone before G3 starts, G1c is dropped first, then scope is cut with the owner. Gates are never skipped.

## Parallel track: TM-01 fixture

Starts as soon as Q2 is answered. It runs alongside G1 and G2 because G1 tests need TM-01 photos and G3 and G4 need reviewed content.

1. Build or choose the fixture (Q2). For option (b), design the panel and screen cards ourselves, with no third-party branding.
2. List label strings (ground truth for AT-G1-02), anchors, components, and each screen's identifying text.
3. Perform the workflow on the fixture and write down each step's expected visible result.
4. Write explanations and steps in English, then get Hindi and Kannada versions written and reviewed by fluent speakers.
5. Assemble the negative set (NEG-01…10).

## Parallel track: Kiro usage evidence

The rules require `/.kiro` to show real use of specs, hooks, and steering.

1. Before each gate starts, capture it as a Kiro Feature Spec in `.kiro/specs/<gate>/` (requirements, design, tasks), derived from these docs.
2. After G0 creates real `typecheck`, `lint`, and `test` scripts, add one hook that runs them after task execution. Record a real failure and the fix.
3. Keep `docs/kiro-evidence.md` with dated entries: task, files changed, hook output, tests, and device result.

## Critical path and main risks

| Risk | Effect | Early signal | Response |
| --- | --- | --- | --- |
| No OCR binding works with SDK 58 / RN 0.88 | G1 blocked | G1a day 1 | Local Expo Module around ML Kit, then re-plan (G1 stop conditions) |
| Kannada script can't be read on the phone | Kannada source text unsupported | Already known (D-005) | Accept as scoped, or re-plan if the owner requires it |
| Live overlays jitter or lag | Weaker "AR" feel | G1c | Freeze-frame only |
| No fluent hi/kn reviewers | G2 ratings, G3, and G4 can't pass | Before G2 | Find reviewers now (Q5) |
| TM-01 not settled | G1 ground truth, G3, and G4 blocked | Q2 | Recommend option (b) |
| False machine matches | Guide unsafe | G3 negative set | Stricter thresholds; optional printed marker (owner decision) |
| Phone not available | Nothing after G0 can be verified | Now | Get the reference phone before G0 |
| Release signing or APK sideload problems | Judges can't install | SUB | Test the release APK on a second phone during RC |

## Out of scope

As listed in [../docs/PRODUCT.md](../docs/PRODUCT.md#not-built-for-the-hackathon). Anything not in this plan needs owner approval first.
