---
inclusion: manual
---

# Kiroween 2026 submission rules

Include this in chat with `#hackathon` when preparing a release, README, video, or Devpost text.

Source: https://kiroween.devpost.com/rules, checked 2026-11-17. Check again before submitting. The rules page wins over this file.

## Dates

- Submission period: 30 Oct 2026, 9:00 am PT to **4 Dec 2026, 2:00 pm PT** (5 Dec, 3:30 am IST). No extensions, no late entries.
- Our target is 3 Dec (`tasks/plan.md`).
- The project must be newly created during the submission period. Disclose pre-existing code: this app started from the `create-expo-app` default template for SDK 58 (`docs/build-log.md`).

## Category

Frankenstein: "Stitch together a chimera of technologies into one app." We don't enter Skeleton Crew, which requires two app folders.

## Repository

- **Public on GitHub.** GitLab and Bitbucket aren't accepted.
- **Complete:** all source code, assets, and instructions needed to run the project.
- **Open-source license file** that GitHub detects and shows in the repo's About section. This repo has no LICENSE yet (D-021, added in G0).
- **`/.kiro` committed at the repo root**, showing real specs, hooks, and steering. Never add `.kiro` or any of its subfolders to `.gitignore`. The rules say this can disqualify the entry.
- **No secrets** (static gate Q7) and no third-party IP. Fixtures must be self-authored.

## App access for judges

- Provide a URL to a working, installable build, free of charge and without restrictions. Ours is a signed release APK on a GitHub Release, built locally without EAS (D-018).
- The app needs no login. If that ever changes, credentials go in the Devpost form.
- It must install and run consistently on Android and work as shown in the video. Verify with RC-5 (fresh install by someone outside the team).
- Physical fixture: the README explains how to print or obtain TM-01 so judges can test Guide.

## Video

- Shorter than **3 minutes**. Judges don't have to watch past 3:00.
- Uploaded to **YouTube** and publicly visible, with the link in the submission form.
- Shows the app running on a real phone.
- No third-party trademarks or copyrighted music without permission.
- Only show capabilities recorded in `docs/DEVICE-TESTS.md`. Label simulated parts (for example "first-party simulated ticket machine").

## Submission form

- A text description of features and functionality, in English.
- The category.
- A write-up of how Kiro was used. Judges look at IDE/CLI/Web/Crew, custom agents, hooks, spec-driven development, steering, MCP, property-based testing, and Powers.

## Judging (20% each)

Potential Impact, Technological Implementation (depth and variety of Kiro use), Design, Innovation/Idea, Presentation.

## Honest Kiro usage evidence

- Claim only features we actually used. A disabled hook, an unconfigured MCP server, or an agent we never ran doesn't count.
- Keep `docs/kiro-evidence.md` with dated entries: the spec or task, the prompt, files changed, hook output (including a real failure and its fix), tests and property-test results, and the device result.
- Don't claim iOS support, real-world machine support, or Kannada camera reading. Don't make accuracy claims beyond the measured results.

## Final check (all done while logged out)

- [ ] Repo is public, LICENSE shows in About, `/.kiro` is at the root, README has install and test steps.
- [ ] The APK link works and a fresh install completes S1.
- [ ] The YouTube video is public and under 3:00.
- [ ] Devpost has the description, category, Kiro write-up, and all links.
