% OverlayKit — Kiro Engineering & Kiroween 2026 Master Playbook
% Build-ready guide, starter `.kiro/` files, 26 copy-paste Kiro prompts
% 17 November 2026 · Expo React Native · Primary category: Frankenstein

# How to use this playbook

**Deliverables:** (1) This document; (2) `OverlayKit_Kiro_Starter.zip` containing complete, editable `.kiro/` files and every prompt in `KIRO_PROMPTS.md`. The ZIP contains **configuration/specification, not a completed mobile application**. Use Kiro IDE to implement the app incrementally.

**First action:** Create a new Expo repository, unzip the starter at the repository root, open in Kiro IDE, and execute P01–P05. Do not jump to P16–P26 until camera tracking works on your actual Android phone.

**The product:** an Expo-only smartphone camera application with three modes — **Translate**, **Explore**, and **Guide**. It overlays user-language text near recognized real-world text, explains unfamiliar controls, and guides through *validated* machine workflows via camera observations and speech. No web UI, no desktop dashboard, no chat-first assistant, and no generic agent infrastructure.

**Important scope boundary:** 'understand any poster' and 'guide any machine' are **long-term ambitions**. The hackathon entry proves translated poster overlays + explanations of selected machine controls + one completed camera-recognized simulated ticket-machine workflow. Untested machines are reported as unsupported. Full ARKit/ARCore SLAM is not promised; visual overlays are camera-aligned using image/OCR geometry.

# 1. Why this qualifies for Kiroween — exact, current rules

The official rules are at <https://kiroween.devpost.com/rules> (updated Nov 16, 2026). Verify again before final submission.

| Obligation | What OverlayKit will provide |
|---|---|
| Entry/category | Working mobile project developed using Kiro; **Frankenstein**: camera + OCR + spatial overlay + multilingual understanding + state-aware guidance |
| Scoring | Potential Impact, Technological Implementation, Design, Innovation and Presentation **20% each** |
| Submission window | Project started after 30 Oct 2026; deadline **4 Dec 2026 at 2:00 PM PST** (= 5 Dec 2026 at 3:30 AM IST). Submit by Dec 3. |
| Demonstration | Public YouTube video **shorter than three minutes** with the app running on a real phone; avoid unauthorized music/trademarks |
| Code | Public **GitHub** repo, LICENSE file detectable at repo top, install/run/test instructions, complete relevant code and assets |
| Kiro evidence | `.kiro/` MUST be committed at repository ROOT, not gitignored; genuine specs, hooks, steering and account of Kiro usage |
| Working access | Public install/test build or other functional app access, without charging judges; availability throughout judging period |
| Truthfulness | Declare sample kiosk as first-party simulator, not public real-world machine support; disclose mocked or off-device components |

**Primary-prize strategy:** Aim for the overall first prize by building a persuasive working vertical slice. Do not chase a Kiro Crew bonus; Crew is not required. The 2026 Skeleton Crew category requires **two separate application folders**, but we're targeting Frankenstein instead; a second Expo demo fixture is optional for testing and does not change the primary product into a web app.

**What judges should remember:** A real phone points at an unfamiliar interface, explains its controls in a user's own language, and guides the person to finish a task. The phone knows when the screen changes because it sees the changes, **not because the simulator sends hidden signals**.

# 2. Product features and honest boundaries

| Priority | Capability | User benefit | Evidence we must collect |
|---|---|---|---|
| P0 | Camera permission + live preview | Start immediately | Actual camera footage on Android |
| P0 | OCR with real text polygons | Identify words and their positions | Raw OCR log + annotated camera image |
| P0 | Geometry mapping and TTL | Anchored overlays; stale arrows disappear | Two camera angles + camera interruption |
| P0 | Poster Translate | English/Hindi/Kannada around source text | Real photos/videos in two language choices |
| P0 | Language switch + safe fallback | User control over visible meaning | Before/after language choice, unknown token |
| P1 | Explore | Tap supported controls for meanings | Washing-machine sample, four controls |
| P1 | Guide engine | Approved steps, not improvisation | One ticket purchase from start to finish |
| P1 | Screen-state verification | Next step triggered by observed interface | New screen detected after actual camera change |
| P1 | Spoken instruction | Accessible audio path | Localized voice or documented text-only fallback |
| P1 | Expo test distribution | Judges can install and try | Real APK/build + fresh-install recording |
| P2 | Generic cloud translation | Broader arbitrary poster support | Only if securely implemented and tested |
| P2 | Second machine, offline downloads, guide creator | Expansion opportunity | Only if core passes and time remains |

## The essential distinction from Google Lens

Simply translating labels is not enough. OverlayKit's contest claim must be **language translation + explanation + physical screen-aware guidance**, including a correctness layer that knows when *not* to guide. Existing visual-assistance products mean novelty is not automatic. Our implementation must prove spatial mapping, reliable state transitions, safe uncertainty and an inclusive mobile UX.

## User journey

1. Launch without signup, choose Hindi, Kannada or English.
2. **Translate:** aim camera at a poster and see translated text attached to its source regions.
3. **Explore:** aim at a known machine panel, tap a label, and hear/see what it means.
4. **Guide:** choose 'Buy a ticket', aim camera at a *simulated* ticket machine on a second device, and follow highlighted steps.
5. When a new kiosk screen is *visibly* recognized through the camera, guidance advances after a stable match. If confidence falls, pointer disappears and the app says 'Hold steady / screen not recognized'.

# 3. Architecture and engineering decisions

```text
                     PHYSICAL WORLD
  Poster / Machine panel / Ticket fixture on second device
                            |
                     Phone camera input
                            |
           Capture/Metadata + OCR TextRegion[]
                            |
               Scene Observation + GeometryMapper
                    /                \
             Translate/Explore     Screen Matcher
                  |                       |
          Verified dictionary        Guide State Machine
          or text proxy             (approved guide JSON)
                  |                       |
          Anchored label             Active target overlay
                    \                /
                     Expo camera screen
                            |
                   Expo Speech (optional)
```

**Only the Expo UI is a product interface.** A small secure translation backend can be added if required, but never a browser dashboard. A ticket simulator, if implemented, is a separate *Expo native mobile* test fixture. It must not share current-state signals with OverlayKit.

**Component boundaries:** `capture`, `vision`, `geometry`, `language`, `guides`, `speech`, `ui`, `demo`. Use stable typed interfaces before implementation:

```typescript
export type NormalizedPoint = { x: number; y: number }; // 0..1
export type TextRegion = {
  id: string;
  text: string;
  confidence: number;
  polygonNormalized: NormalizedPoint[];
};
export type FrameObservation = {
  id: string; timestampMs: number;
  width: number; height: number;
  orientation: number; mirrored: boolean;
  textRegions: TextRegion[];
};
export type OverlayRegion = {
  id: string; sourceFrameId: string;
  label: string; polygonNormalized: NormalizedPoint[];
  state: 'translated'|'explain'|'active'|'uncertain';
  expiresAtMs: number;
};
```

**Caveat:** Types above are design contracts, not claims about an installed native OCR library. Kiro must verify real provider return types and write an adapter.

## Expo-only technology and feasibility gate

- Start with official Expo SDK, Expo Router, strict TypeScript, `expo-camera`, `expo-speech`, and local storage. Add NativeWind/Reanimated only where useful.
- **Day 1–2 gate:** Verify actual on-device OCR providing bounding boxes in an Expo Development Build. Research `expo-camera` still-frame extraction versus VisionCamera frame processors and validate compatibility with the installed Expo SDK before installing a native module.
- Native OCR/worklets and other custom native packages require an Expo **development build** (not Expo Go). NO EAS use the android studio that i have in my computer i can connect the physical device for testing and build process can produce Android tester builds. For iOS, verify device/test distribution availability; do not claim iOS hardware testing if none occurred.
- Prefer a reliable **scan → hold → spatial overlay** to an unstable 30-fps 'AR' marketing claim. If frame tracking works after the spike, improve it incrementally.
- State matcher for known demo screens: use OCR tokens + spatial anchors + confidence thresholds. Advance on at least two *distinct* stable expected observations. Do not advance on timers.
- Translation: built-in, verified demo fixture phrases first; unknown words show source/fallback. Optional secured cloud text translator if there is time. **Never** bundle a private API key in mobile code.
- Privacy: default on-device text extraction; do not transmit/store raw images without clear opt-in. Simulate tickets and hospital tasks with fictional data.

**Formal decision after 48 hours:**

| Outcome | Conditions | Next action |
|---|---|---|
| GO | Real camera OCR, true boxes and mapped overlay work | Build translation modes |
| FALLBACK | OCR works only from explicit still capture, overlay alignment adequate | Rebrand interaction as 'Scan and guide', not continuous AR |
| STOP/PIVOT | No working physically observed OCR or wrong/stale arrows cannot be prevented | Switch technology or sharply reduce scope before spending more days |

# 4. Repository setup — Windows / PowerShell

**Preflight:** A new repository must be created within the competition's submission period. Confirm Node.js LTS, npm, Git, Kiro IDE, an Android phone with USB debugging, and Expo/EAS setup from official docs. On Windows, Kiro IDE works; native Android tooling may require Android Studio. Mac hardware is not assumed.

Run from PowerShell:

```powershell
node --version
npm --version
git --version
npx create-expo-app@latest overlaykit
cd overlaykit
```

Now extract `OverlayKit_Kiro_Starter.zip` **into this repository root**, preserving hidden `.kiro/`. The root should contain `package.json`, `.kiro/`, `docs/`, `tasks/`, `scripts/`, `fixtures/`, `KIRO_PROMPTS.md`, and `README_START_HERE.md`.

```powershell
# Confirm starter files and Git visibility
Get-ChildItem -Force .kiro
Get-ChildItem .kiro\specs
Get-ChildItem .kiro\hooks
# Open this folder in Kiro IDE via File > Open Folder
```

- Create/initialize Git if not already done; check `.gitignore` does not exclude `.kiro`.
- Copy starter **after** creating Expo project, do not replace its package.json or `app/` source.
- Use Kiro P01 for architecture validation, then P02 for actual npm scripts and quality-check integration.
- Use Kiro's Specs pane to open/review the four existing specs. If your IDE version doesn't import pre-existing specs automatically, create a Feature Spec in the UI and paste the matching `requirements.md`, `design.md`, and `tasks.md` content; do not fabricate hidden metadata.
- For EAS, run exact setup commands only after P05 verifies current official Expo docs; basic commands typically involve `npx expo install expo-dev-client`, `eas login`, `eas build:configure` and `eas build --platform android --profile development` with a reviewed `eas.json`.

# 5. The `.kiro/` directory — every file and why it exists

```text
.kiro/
├── steering/
│   ├── product.md                  always: promise, audience, exclusions
│   ├── stack.md                    always: Expo-only and dependency rules
│   ├── quality-and-testing.md     always: tests, device evidence, gates
│   ├── camera-and-ar.md           fileMatch: vision/geometry implementation
│   ├── mobile-design.md           fileMatch: native screens/accessibility
│   └── hackathon-and-demo.md      manual: official submission rules
├── specs/
│   ├── camera-and-geometry/       requirements.md, design.md, tasks.md
│   ├── translate-and-explain/     requirements.md, design.md, tasks.md
│   ├── guided-workflows/          requirements.md, design.md, tasks.md
│   └── accessibility-and-demo/   requirements.md, design.md, tasks.md
├── hooks/
│   ├── verify-on-task.json        enabled: deterministic post-task checks
│   ├── typecheck-on-save.json     disabled until performance verified
│   └── guard-dangerous-shell.json disabled until schema calibrated
├── skills/
│   ├── device-validation/SKILL.md  repeatable physical phone tests
│   └── vision-safety/SKILL.md      action/privacy/uncertainty gate
├── agents/
│   └── mobile-cv-reviewer.md      read-only adversarial reviewer
└── settings/
    └── mcp.json                   optional docs-fetch; disabled by default
```

## 5.1 Steering — persistent project memory

Kiro supports `always`, `fileMatch`, `manual`, and `auto` inclusion. We keep product/stack/quality rules always on; camera and mobile UI conditional; long hackathon guidelines on demand. Official: <https://kiro.dev/docs/steering/>.

Example `product.md` begins:

```yaml
---
inclusion: always
---
```

Example `camera-and-ar.md` begins:

```yaml
---
inclusion: fileMatch
fileMatchPattern: ["**/vision/**/*.ts", "**/geometry/**/*.ts"]
---
```

The actual ZIP has the full, more permissive file patterns. When invoking a **custom agent**, steering may not automatically load; we explicitly include `file://.kiro/steering/**/*.md` in its resources.

## 5.2 Kiro Feature Specs — source of truth for implementation

Use the **Requirements-First** workflow: `requirements.md` (EARS statements) → `design.md` (contracts and diagrams) → `tasks.md` (small, verifiable work). Official: <https://kiro.dev/docs/specs/> and <https://kiro.dev/docs/specs/feature-specs/>.

There are four prewritten feature folders in the starter ZIP. The first, `camera-and-geometry`, is non-negotiable: a working camera/OCR/geometry prototype is more important than styling. **Review and approve** each phase before Kiro implements tasks. Tasks are written in independently verifiable slices to avoid runaway AI changes.

Kiro has correctness / property-based testing support in Specs. For geometric mapping, ask for randomized points/polygons under crop and rotation; for the guide state machine, ask for randomized observation sequences and exact-once advancement. Save actual failing examples and the fix. Official: <https://kiro.dev/docs/specs/correctness/>.

## 5.3 Hooks — automated quality, not noisy busywork

Current standalone format: `.kiro/hooks/<id>.json` with schema `version: v1`, `hooks[]`, PascalCase `trigger`, and `command` or `agent` action. Official: <https://kiro.dev/docs/hooks/>.

Our enabled `PostTaskExecution` hook invokes `node scripts/quality-gate.mjs`. The Node script requires real `npm run typecheck` and `npm run lint` scripts and fails if they are absent. **Before P02, a hook failure is expected and correct.**

Our optional save-time check is **disabled by default** to avoid expensive checks on every source save. Our `PreToolUse` dangerous-shell guard is also **disabled by default** pending an actual check of tool event input and command patterns. It is defense in depth, not a security boundary. Never claim the disabled hooks improve development results until actually enabled and tested.

## 5.4 Skills — Kiro's reusable procedures

Two portable Agent Skills are included under `.kiro/skills/`, each with a valid frontmatter `name` and `description`. They instruct Kiro on repeatable device QA and safety verification; they are **not npm dependencies**. Invoke when a camera step is ready to review. Official: <https://kiro.dev/docs/skills/>.

## 5.5 Custom agent — a constrained reviewer

The `mobile-cv-reviewer.md` agent has `tools: ["read"]`, explicitly loads project steering, and checks against camera geometry, confidence, transitions and privacy. It should **not implement features**. Use Kiro's agent picker to switch to it, review, then switch back. The current agent schema supports workspace `.kiro/agents/*.md`. Official: <https://kiro.dev/docs/custom-agents/>.

## 5.6 MCP and Powers — optional, not for checkbox points

The workspace `.kiro/settings/mcp.json` contains a **disabled** `docs-fetch` sample with `uvx` and `mcp-server-fetch`. To use, install `uv` from its official instructions, check `uvx` works, enable only that server and verify a real tool invocation in Kiro. Official: <https://kiro.dev/docs/mcp/configuration/>.

Kiro Powers bundle knowledge, skills and optional MCPs, activated when relevant. Browse the actual Kiro Powers catalog. Install a verified Expo/mobile-related Power only if one exists and is actually useful; do not fabricate a package or claim to have used it. Official: <https://kiro.dev/docs/powers/>. The points come from meaningful development use and evidence, not a list of integrations.

# 6. How to operate Kiro IDE throughout the build

1. Open Kiro IDE → File > Open Folder → new Expo repo. Open Kiro panel via Ghost icon.
2. In **Chat/Plan**, paste P01 and review the architecture proposal. Confirm Expo-only boundaries.
3. In **Specs**, open/create a **Feature Spec**, select **Requirements-First**. Review EARS requirements, design, tasks. Use Kiro's **Analyze Requirements** to catch omissions before implementation.
4. Select one spec task to implement; do not run all camera/CV tasks in parallel. Inspect diff, typecheck/lint outputs, verify on the phone, then check task complete.
5. Use **Steering** to edit policies; Kiro should not change product scope silently. Use `#hackathon-and-demo` on demand when preparing release.
6. Use **Hooks** panel to inspect loaded hook results. Record one real quality-check failure, correction and pass; this is compelling Kiro usage evidence.
7. Use **Agent picker** for read-only `mobile-cv-reviewer` at camera, OCR and Guide milestones. Check findings manually; it does not execute fixes.
8. Use **MCP** only when docs-fetch is configured and available. Let Kiro use the tool for official library documentation and capture the actual result in the evidence log.
9. Use **PBT/correctness** to demonstrate geometry/state invariants. Preserve tests and real counterexamples, not screenshots of theoretical success.
10. After each task, ask for files changed, tests, actual device status, failure cases, screenshots to collect and next step.

# 7. Dependency gates, target dates and stop conditions

| Date (IST) | Deliverable | Hard gate |
|---|---|---|
| Nov 17 | Kiro config + scaffold + camera preview | App launches on physical Android |
| Nov 18 | OCR bounding boxes + mapped overlay | Physical camera alignment pass or fallback decision |
| Nov 19–21 | Translate poster + language switch | Real Hindi/Kannada camera screenshots |
| Nov 22–24 | Explore known controls | Correct meanings; unsupported controls marked unknown |
| Nov 25–27 | Ticket Guide + fixture + voice | One real camera observed multi-screen walkthrough |
| Nov 28–29 | Second machine or reliability hardening | Do not add new features if guide is unstable |
| Nov 30–Dec 1 | Accessibility + security + physical QA | 10-minute stable session, negative tests pass |
| Dec 2 | EAS build + README + evidence + video recording | Fresh install by another person |
| Dec 3 | GitHub + YouTube + Devpost submission | All links public/functional as anonymous user |

**Highest-priority go/no-go evidence:** camera/OCR bounding-box mapping by end of Nov 18. A 48-hour spike is explicitly allowed to fail; do not spend a week on code that doesn't survive real Android capture.

# 8. Exact Kiro prompts — full copy-paste sequence

Follow P01 → P26. Each prompt names a spec/task and commands Kiro to stop at a review gate. You can copy them directly from here or from `KIRO_PROMPTS.md` in the starter ZIP.


## Rules before sending any prompt
- Start in **Kiro IDE** with your new Expo repository open. Select Spec mode for new features, not Vibe mode for multi-file features.
- Paste prompts in order. Do not ask Kiro to implement the entire project at once.
- Review the generated requirements, design and tasks files before selecting Implement Task.
- Ask Kiro to report actual commands it ran, files touched, device test status, failures and evidence. If device hardware access is missing, do the human test yourself and record it.
- Do not claim compatibility or test success that has not been verified.

### P01 — Establish context and architecture (Kiro chat / Plan)
> This repository will become OverlayKit: an Expo React Native mobile-only AR-style language and interaction assistant. Read README_START_HERE.md, docs/architecture.md, tasks/plan.md, all .kiro/steering files and .kiro/specs/camera-and-geometry/* before making changes. Summarize confirmed product scope, exclusions, dependencies and the highest-risk assumptions. Do not write app features yet. Explain why we start with an Android camera/OCR/geometry spike. Return a proposed exact terminal command sequence, identify anything incompatible with the installed Expo/Kiro versions, and wait for my approval.

### P02 — Bootstrap Expo and quality scripts (Kiro chat / implementation)
> Implement ONLY E01 from tasks/todo.md. This must be a single Expo + Expo Router + TypeScript mobile application with no web target, web route, dashboard or authentication. Inspect package.json and official Expo docs; use `npx expo install` for compatible Expo packages. Configure strict TypeScript, npm scripts `typecheck`, `lint`, and `test` with real executable behavior; retain all existing working Expo config. Make scripts/quality-gate.mjs pass with those scripts. Do not add native OCR yet. Run typecheck and lint, report exact outputs, files changed and next blocking risk.

### P03 — Validate Kiro configuration (Kiro chat / review)
> Inspect all files under .kiro and verify their formats against the current official Kiro documentation. Check Steering frontmatter, Feature Spec locations, v1 Hook JSON schema and trigger names, custom agent frontmatter/resource paths, Skills format and workspace MCP format. Fix only real syntax/compatibility errors. Do not turn on disabled hooks or MCP servers without asking. Verify .kiro is not ignored by Git. Provide a table listing each file, purpose and checked status.

### P04 — Review and approve camera Spec (Kiro IDE Specs)
> Open the existing camera-and-geometry Feature Spec in .kiro/specs/camera-and-geometry. Use the Requirements-First workflow, analyze the EARS requirements, and identify assumptions or test gaps. Then review design.md and tasks.md. Focus on real on-device camera evidence, image/preview coordinate systems, confidence and stale-overlay handling. Propose corrections before implementing; keep tasks small enough for one session and specify independent verification. Do not begin tasks until I approve.

### P05 — Native OCR compatibility research (Kiro chat / Plan)
> Research current OFFICIAL Expo SDK, expo-camera, EAS Development Build, VisionCamera and candidate on-device OCR package documentation for Android and iOS. Our machine is Windows; primary hardware is an Android phone. Determine the simplest viable OCR path that provides text bounding boxes from a real camera in an Expo development build. Give exact package names, compatible versions, required config plugins, build steps, source URLs and failure risks. Compare still-frame OCR vs live frame processors. Prefer a working 48-hour approach over sophisticated unverified tracking. Save findings to docs/decision-log.md; do not install anything until I select the approach.

### P06 — Camera permission and actual preview (Camera Spec tasks 1.3-1.4)
> Implement the approved camera permission and preview vertical slice only. Use Expo-supported components and handle denied/unavailable permission, app backgrounding and navigation. Show a visible recognition-state indicator but no invented detections. Add tests for state and coordinate metadata parsing. Run typecheck, lint and unit tests. Give me exact steps to install the development build on Android and identify the device evidence I must capture. Stop before implementing OCR.

### P07 — Real text recognition (Camera Spec task 1.5)
> Integrate the approved OCR provider to read one real photo captured from the Android phone and return text plus per-region bounding polygons/rectangles. Define typed TextRegion and FrameObservation contracts. Display the raw recognized text in a temporary debug panel with confidence/region count and capture timestamp. Add deterministic tests from recorded fixtures. No fake recognized text in the production path. Run tests and explain what to test physically before moving on.

### P08 — Coordinate mapper with PBT (Camera Spec task 1.6)
> Write failing unit and property-based tests for mapping OCR region coordinates into a React Native camera preview under aspect-fill crop, orientation changes, mirroring and safe-area changes. Then implement the smallest GeometryMapper satisfying them. The mapper must reject non-finite geometry and represent off-screen clipping explicitly. Show at least one concrete randomized property, its test generator and actual execution results. Do not assume that image pixels equal preview pixels.

### P09 — Spatial overlay rendering (Camera Spec task 1.7)
> Implement overlays anchored to OCR polygons on the actual camera preview. Keep overlay sourceFrameId, observation timestamp and TTL; clear stale polygons on camera movement/capture pause/unknown scene. Support tap on region and rendering original OCR text. Do not introduce full ARCore/ARKit or pretend there is SLAM tracking. Use Reanimated/SVG only if verified compatible with the installed Expo version. Provide Android manual alignment tests and screenshot evidence checklist.

### P10 — 48-hour feasibility gate (Camera Spec task 1.8)
> Perform an adversarial review of the camera/OCR/geometry slice. If available, invoke the project mobile-cv-reviewer agent and device-validation skill. Check docs/device-test-matrix.md items C01-C04 against ACTUAL physical-device results I provide. Classify GO, FALLBACK or STOP. A valid FALLBACK is 'hold still and scan' with anchored still-frame translation; do not misrepresent it as real-time world tracking. Write decision and evidence to docs/decision-log.md. Do not implement more features until this gate is approved.

### P11 — Translate Spec requirements/design approval (Kiro Specs)
> Open .kiro/specs/translate-and-explain as an existing Feature Spec. Analyze requirements, design, privacy boundaries and tests. Ensure language support is explicitly English, Hindi and Kannada. Separate reliable fixture translations from experimental arbitrary-text translation. Include requirements for caching, locale switching, OCR region identity, fallback and no API secrets in mobile. Propose fixes to requirements/design/tasks for approval; do not implement yet.

### P12 — Translate mode (Translate Spec tasks 2.1-2.3)
> Implement Translate mode that takes actual OCR TextRegion objects and shows region-bound translations into selected English/Hindi/Kannada, with original-text toggle and local cache. Use a small, verified built-in glossary for demo fixtures; any unsupported word must retain source text or show uncertainty. Implement locale persistence and out-of-order network result rejection. Add tests for source ID preservation, language switch and missing translation. Run all automated checks. Provide Android screenshots checklist.

### P13 — Explore components, not hallucinated instructions (Translate Spec tasks 2.4-2.5)
> Build Explore mode with tap targets for at least four known washing-machine controls. Explain meaning in the selected language; for unsupported physical controls show 'Unrecognized—check the machine instructions' rather than made-up actions. Use approved data schemas and confidence gating; keep explanation distinct from instruction. Add wrong-panel tests and review against .kiro/skills/vision-safety/SKILL.md. Verify a real printed/machine-panel fixture.

### P14 — Optional general poster translation provider (only if core passes)
> Only if milestone 2 passes and time permits, design and implement a minimal securely proxied text-translation provider for arbitrary OCR text. Research current official SDK/API docs before selection. Send OCR text only by default, redact/avoid sensitive content, validate provider output, rate-limit calls, cache by text+locale and handle offline/timeout states. Never embed the API key in Expo JS; no image upload without explicit opt-in. Explain incremental cost and failure fallback. Do not build a web interface.

### P15 — Guided workflow Spec approval (Kiro Specs)
> Review .kiro/specs/guided-workflows/requirements.md, design.md and tasks.md in Kiro's Feature Spec workflow. Confirm exact-once screen transitions, strict two-observation stability, supported-screen confidence and no direct kiosk-control channel. Keep a single 4–5-step ticket task as the required implementation; a second machine is optional. Analyze EARS correctness properties and propose minimal improvements for approval.

### P16 — Native Expo kiosk fixture (Guided Spec task 3.2)
> Create a minimal first-party **Expo React Native** kiosk fixture application under a separate mobile app folder only if needed for the real-camera demo. It should have four or five large, visually distinct screens: start, destination, ticket type, confirm, simulated complete. No website or browser UI. The OverlayKit app must identify fixture screens from its CAMERA ONLY; do not send hidden state through Bluetooth, network, direct code imports or shared runtime. Provide phone/tablet run instructions and a printed-screen-card fallback if second hardware is unavailable.

### P17 — Screen fingerprinting (Guided Spec task 3.3)
> Implement a deterministic, typed camera-based screen matcher for the ticket fixture using recognized OCR tokens, layout cues and an explicit score threshold. Return screenId or unknown, evidence tokens, source observationId and confidence. Add fixtures for each screen plus glare/partial view/wrong screen. Never use timers or the fixture app's internal state as recognition. Show confusion matrix from real labeled test captures where available.

### P18 — Guide state machine and PBT (Guided Spec task 3.4)
> First create failing tests for a GuideState machine: two independent consecutive stable expected-screen observations advance exactly once; duplicate observationId never advances twice; stale/out-of-order detections never rewind; unsupported screens pause and hide the target; reset works. Use property-based testing for observation sequences and show actual results. Implement the smallest pure TypeScript reducer/state machine to pass those tests. Keep the reducer independent of React components and camera modules.

### P19 — Camera-guided ticket walkthrough (Guided Spec task 3.5)
> Connect real camera ScreenMatch output to the GuideState machine. Draw the active button highlight only for the validated current screen and approved target anchor. Show a one-line localized instruction, progress, pause, restart and clear unknown states. Auto-advance only from observed expected screen transitions. Record an end-to-end test over the real camera with a human pressing buttons on a separate Expo fixture, and identify any failed transitions honestly.

### P20 — Speech and accessible interaction (Guided Spec task 3.6)
> Add expo-speech spoken instructions for supported locales where the device has a compatible voice. Provide Repeat, Stop, mute, text-only fallback, high-contrast overlay, large type and reduced-motion behavior. Never treat unavailable Hindi/Kannada voice as a successful speech test. Test that speech and GuideState are independent: spoken instructions cannot advance the workflow. Run typecheck, lint and tests, then give physical-device QA steps.

### P21 — Quality and safety adversarial test (Kiro reviewer agent)
> Switch to mobile-cv-reviewer (read-only), inspect latest architecture, specs and test evidence. Find correctness or safety flaws in OCR confidence, geometry transforms, stale overlays, translation output, screen matching, wrong-screen recovery, and cloud privacy. Return severity, file path, reproducer and minimal fix plan. Then switch back to default agent and make a Bugfix Spec for every confirmed high-severity issue before coding the fix.

### P22 — UI polish and submission readiness (Accessibility/Demo Spec)
> Review and implement .kiro/specs/accessibility-and-demo incrementally. The only primary screens are Home, Camera (Translate/Explore/Guide), Guide completion and Settings. Make the real camera the visual focus. Give every state a clear label. Ensure Hindi/Kannada wrapping, accessibility labels, denied-permission fallback and offline guidance. Do not add login, web pages, companion dashboards, marketplaces or unrelated features. Run the physical-device checklist and record evidence.

### P23 — Verify PBT + hooks + specs evidence (Kiro QA)
> Audit all four Kiro Feature Specs and their completed tasks. Use Kiro's property-based testing where available to validate geometry and guide-state invariants; otherwise run equivalent fast-check property tests and say which mechanism actually ran. Exercise the enabled PostTaskExecution quality hook and capture a genuine pass/fail example. Do not fabricate metrics or claim a Kiro Power/MCP/custom agent was used when it was not. Create docs/kiro-usage-evidence.md with exact examples, changes and screenshots I should capture.

### P24 — EAS tester build and public repo (Kiro release)
> Prepare a testable Expo/EAS Android installation path for hackathon judges. Verify current EAS docs and provide exact commands for a non-production internal-distribution build. Build only when I approve credentials/signing. Include a test APK/link or explain blockers; do not claim a build exists until EAS confirms it. Validate fresh install, permissions, offline fixture and 10-minute session stability. Prepare a public GitHub repository with open-source license, root .kiro committed, original fixture assets, README, no secrets, and honest platform support. Do not push without my confirmation.

### P25 — 2:50 presentation and Devpost writeup (Kiro submission)
> Draft an under-180-second Kiroween demonstration storyboard using ONLY capabilities proven by actual device recordings. Structure: user problem, multilingual poster overlays, Explore control explanation, camera-guided ticket steps, uncertainty recovery, technical/Kiro evidence, real impact and limitations. Write exact shot timings and spoken script; flag unrecorded footage. Draft Devpost description mapping evidence to Impact, Tech Implementation, Design, Innovation and Presentation. Re-check https://kiroween.devpost.com/rules, .kiro contents, license, public YouTube, build/test link and public GitHub. Never claim 'works with every machine' or untested iOS capability.

### P26 — Final independent acceptance review (Kiro read-only review)
> Conduct a final pass/fail audit of OverlayKit as if you were a Kiroween judge. Examine the actual running device videos, docs/device-test-matrix.md, Kiro specs/tasks/hooks/steering, release artifact proof, README, LICENSE and Devpost draft. Verify the main flow is real and repeatable, not a scripted UI simulation. Score each of five judging dimensions qualitatively and identify blockers. Produce a STOP/SHIP decision with explicit evidence. Do not modify source files in this review.


# 9. Manual acceptance tests — what the model cannot do for you

**Real poster:** Print a self-created multilingual sign. Hold the phone at two angles. Check that each translated label stays attached to its real source region and that stale overlays disappear when the camera moves.

**Known machine:** Print or display your self-authored washing-machine panel. Tap four distinct controls and confirm their explanations in Hindi/Kannada. Select an unfamiliar control and verify the app refuses to invent instructions.

**Ticket guide:** Run the first-party Expo kiosk fixture on a second device (or print cards). Use OverlayKit's *physical camera* to locate each stage. Human taps/takes next card. The phone recognizes the new state twice and advances exactly once. Obscure the screen and verify the pointer disappears.

**Languages and accessibility:** Verify script rendering, large text, TTS availability and Repeat/Stop controls on real hardware. When Hindi/Kannada voices are unavailable, visible text still guides.

**Negative tests:** Camera denied; airplane mode; no visible text; unsupported screen; glare; device rotation; stale OCR result; duplicate frame; screen changed unexpectedly. All must fail safely, not produce confident fake overlays.

**Metrics we recommend recording (actual values only):** region-level recognition success, median overlay offset, latency from screen change to stable recognition, duplicate transitions, session crashes and number of completed guided workflows. Avoid claiming strict global accuracy guarantees from a few fixtures.

# 10. Presentation — 2:50 storyboard to compete for overall first place

| Time | Actual device footage | Judging connection |
|---|---|---|
| 00:00–00:17 | Someone cannot understand a foreign-language machine/sign | Real impact and audience |
| 00:17–00:42 | OverlayKit live poster scan; Hindi translations spatially aligned | Core visual magic + implementation |
| 00:42–01:06 | Language switch; tap washing-machine control for meaning | Usability, multilingual clarity |
| 01:06–01:48 | Real-camera ticket task across multiple changed simulator screens | Differentiation: physical state-aware guidance |
| 01:48–02:03 | Hide/move camera; safe 'unknown/hold steady' recovery | Reliability and responsibility |
| 02:03–02:25 | Kiro Specs, Steering, quality Hook, actual passing test/PBT snippet | Meaningful Kiro use |
| 02:25–02:45 | Who benefits, supported scope, verified result, app install | Impact and credible product path |
| 02:45–02:50 | Compact title and links | Memorable finish |

**Recording rules:** Screen record the native Expo app and also film a second angle showing the phone physically pointed at the simulator/poster. Avoid switching to a web demo or compositing fake overlay targets. If any feature was simulated, label it accurately.

# 11. Final release and eligibility checklist

- [ ] Repository started in the 2026 submission period, not recycled preexisting project.
- [ ] Public **GitHub** URL, code + mobile assets + README + LICENSE; `.kiro/` directory visible in repo root and not excluded by gitignore.
- [ ] Kiro Spec artifacts include requirements, design, tasks and show actually completed implementation history.
- [ ] Project uses genuine Kiro Steering and at least one verified Hook; custom Skills/agent useful if exercised; optional MCP/Powers only cited when actually used.
- [ ] Build/install link is public or provided to judges and install instructions work on a fresh Android device; iOS claims accurately scoped.
- [ ] Judges can test with no account/payment. App works as described; supported demo fixture assets included.
- [ ] Third-party SDK licenses and self-owned images/fonts/fixtures verified; no unlicensed brand names/music.
- [ ] Public YouTube video less than 180 seconds and actually shows app on phone.
- [ ] Devpost description explicitly covers the five equal-weight judging criteria and Kiro development story.
- [ ] Video, repo and installation links tested as a logged-out viewer; submit by **Dec 3** to buffer the deadline.

# 12. Evidence log template for Devpost writeup

For every milestone, record: date; feature spec/task; initial failing behavior; exact Kiro prompt ID; files changed; Hook output; tests run; real phone evidence; corrective iterations; result; remaining limitations. This makes the Technological Implementation criterion credible.

**Suggested Devpost introduction (revise to match actual build):** 'OverlayKit makes unfamiliar public interfaces understandable in your own language. Point a phone at text or a supported machine, and the app attaches translations and explanations to real-world controls. For validated workflows, it guides each step and checks what changed through the camera before proceeding. We built and verified the mobile experience with Kiro Specs, Steering, Hooks and physical-device tests.'

# 13. Primary sources and verification links

All technical facts were checked against primary documentation on November 17, 2026. SDK/package compatibility still needs a live recheck when starting implementation.

- [Official Kiroween 2026 rules](https://kiroween.devpost.com/rules)
- [Kiro: Your first project](https://kiro.dev/docs/getting-started/first-project/)
- [Kiro: Feature Specs and EARS](https://kiro.dev/docs/specs/feature-specs/)
- [Kiro: Specs correctness and property-based tests](https://kiro.dev/docs/specs/correctness/)
- [Kiro: Steering and inclusion modes](https://kiro.dev/docs/steering/)
- [Kiro: Hooks schema, trigger types, actions](https://kiro.dev/docs/hooks/)
- [Kiro: Hook triggers](https://kiro.dev/docs/hooks/types/)
- [Kiro: Hook actions](https://kiro.dev/docs/hooks/actions/)
- [Kiro: Custom agents](https://kiro.dev/docs/custom-agents/)
- [Kiro: Agent Skills](https://kiro.dev/docs/skills/)
- [Kiro: MCP configuration](https://kiro.dev/docs/mcp/configuration/)
- [Kiro: Powers](https://kiro.dev/docs/powers/)
- [Expo: Development builds](https://docs.expo.dev/develop/development-builds/introduction/)

---

**Build discipline:** one small spec task → one verified test → one actual device demonstration → one evidence entry. The goal is a memorable, functioning Expo app, not an impressive-looking but untested video.
