# OverlayKit: decision log

Each entry records context, the decision, alternatives, and consequences.

Status values:
- **Accepted (contract)**: part of the product contract in PRODUCT.md.
- **Accepted (user)**: decided by the project owner in conversation.
- **Proposed**: needs approval before work that depends on it starts.

Change a decision by adding a new entry that supersedes the old one. Don't edit history.

---

## D-001 Expo SDK 58 default template, generated versions kept
**Status:** Accepted (user), 2026-11-17
**Context:** New project; the user required the current stable Expo SDK and no guessed versions.
**Decision:** Created with `npx create-expo-app@latest . --template default` (template `default@sdk-58`). Versions stay as generated: expo 58.0.26, expo-router 58.0.32, react-native 0.88.1, react 19.3.0, typescript 6.0.3. Future native packages are added with `npx expo install` so they match SDK 58.
**Consequences:** Every native library chosen in G1 and later must support SDK 58 / React Native 0.88. That is a compatibility risk for community libraries (see D-005).

## D-002 Local Android builds with Gradle; no EAS Build
**Status:** Accepted (user), 2026-11-17
**Decision:** Build with `npx expo prebuild` and `npx expo run:android`. No `eas build` and no `eas.json`. Recorded in `.kiro/steering/build-approach.md`.
**Consequences:** No Expo account needed. iOS can't be built from the Windows host (see D-003).

## D-003 Android-first; iOS not validated during the hackathon
**Status:** Proposed
**Context:** Expo's development-build docs state that local builds on Windows support Android only, with no iOS Simulator or iPhone builds. D-002 excludes EAS.
**Decision:** Keep code platform-neutral where it costs nothing (no Android-only APIs in TypeScript without a guard), but don't build, test, or demo iOS.
**Alternatives:** Use a Mac for local iOS builds (none available that we know of); allow EAS for iOS only (conflicts with D-002).
**Consequences:** "Android and iOS" holds at the code level only. iOS claims in the demo must say "not validated".

## D-004 Development build instead of Expo Go
**Status:** Proposed
**Context:** On-device OCR and frame-level camera access need native modules that Expo Go doesn't include.
**Decision:** Install `expo-dev-client` at the start of G1 and run with `npx expo run:android --device`.
**Consequences:** Adding or changing a native library needs `npx expo prebuild --clean` and a rebuild.

## D-005 On-device OCR; Kannada-script reading out of scope unless the spike finds an option
**Status:** Proposed
**Context:** P5 prefers on-device OCR. Google ML Kit Text Recognition v2 lists Latin and Devanagari scripts (English, Hindi). Kannada doesn't appear in its supported, experimental, or mapped language lists (checked 2026-11-17).
**Decision:** G1 evaluates ML Kit Text Recognition v2 first. Candidate integration paths, in order:
1. An existing React Native binding, if it builds with SDK 58 / RN 0.88 (New Architecture) on the reference phone.
2. A small local Expo Module (Kotlin) wrapping ML Kit, written by us.

Kannada text in the image produces `OCR_UNSUPPORTED_SCRIPT`.
**Alternatives:**
- An on-device Tesseract build with Kannada data: possible, but integration effort and accuracy are unknown. It's a post-hackathon candidate.
- Cloud OCR: excluded by P5 (no image upload by default).
**Consequences:** S1 uses English source text. Hindi source text is supported. Kannada works as a target, UI, content, and voice language only.

## D-006 No cloud image upload by default
**Status:** Accepted (contract)
**Decision:** The app has no code path that sends image data off the phone. Any future opt-in needs a new decision, a consent screen, and a threat-model update.

## D-007 Translation provider chosen after the G1 spike; no glossary
**Status:** Accepted (contract); selection criteria Proposed
**Decision:** Until G2 completes, `locale` ships only a provider adapter that returns `TR_NOT_CONFIGURED`. Candidates to evaluate in G2:
- ML Kit on-device translation (its language list includes `en`, `hi`, `kn`, checked 2026-11-17).
- Cloud providers behind the proxy (for example Google Cloud Translation, Azure Translator, Bhashini, Amazon Translate).

No candidate has been tested yet.
**Selection criteria:**
1. Quality on a fixed test set for each pair (en→hi, en→kn, hi→en, hi→kn), rated by fluent speakers.
2. Latency on the reference phone.
3. Offline capability.
4. Data-use terms for submitted text.
5. Cost and quota for the hackathon.
6. Integration effort with SDK 58.
**Consequences:** Translate shows `TR_NOT_CONFIGURED` fallbacks during G1. That is intended and must not be hidden with fake output.

## D-008 Verified-machine content is authored and reviewed, not translated at runtime
**Status:** Proposed
**Context:** P4 bans glossary-faked translation. P6 requires trustworthy steps.
**Decision:** TM-01 explanations and steps are written in `en`, `hi`, `kn` and reviewed by fluent speakers before they ship. This content describes one specific machine. It is never looked up to translate arbitrary OCR text, and arbitrary OCR text is never matched against it to produce a "translation".
**Consequences:** Two fluent reviewers (Hindi, Kannada) are needed before G3 and G4 can pass.

## D-009 Guide only for verified, unambiguously identified machines
**Status:** Accepted (contract)
**Decision:** `guide` accepts only a `verified` match. `ambiguous` and `none` both produce `GD_UNSUPPORTED`. Steps are never generated, inferred, or machine-translated.

## D-010 Explore on unverified machines shows translation only
**Status:** Proposed
**Decision:** On an unverified machine, tapping a label shows its translation and "Not a verified machine". The app does not classify components or infer their function.
**Alternative rejected for the hackathon:** a generic component lexicon (for example, "label says Coins, so this is probably a coin slot"). It adds a second source of unverified claims and sits close to the glossary the contract bans.

## D-011 Freeze-frame overlays first; live overlays only if they pass their gate
**Status:** Proposed
**Decision:** G1 delivers capture-still → OCR → overlay on the still image first. Live overlays on the moving preview are a time-boxed upgrade, kept only if AT-G1-06 passes on the reference phone.
**Consequences:** The demo is guaranteed to have stable, aligned overlays. "AR-style" may mean "anchored on a frozen frame" if live mode fails.

## D-012 Module boundaries with one-way dependencies, enforced by lint
**Status:** Proposed
**Decision:** Modules and dependency map as in ARCHITECTURE.md sections 4 and 5. Enforced with a restricted-imports lint rule (gate Q4).

## D-013 Optional backend: text-only translation proxy
**Status:** Proposed
**Decision:** Built only if G2 selects a cloud provider. Single endpoint, no UI, no login, no storage or logging of text, HTTPS only, rate limits and size caps. Lives in `backend/`, separate from the app package. Hosting is chosen in G2.

## D-014 Voice is platform text-to-speech output only
**Status:** Proposed
**Decision:** Use the platform speech engine (candidate: `expo-speech`). Check voice availability per locale at runtime and hide the Speak control when no voice exists. No speech recognition and no microphone permission.

## D-015 No login, analytics, or tracking
**Status:** Accepted (contract) for login; Proposed for analytics and tracking
**Decision:** No accounts, sign-in, analytics SDKs, ad SDKs, or tracking identifiers.

## D-016 No web target
**Status:** Accepted (contract)
**Decision:** The `web` block and `web` script were removed from the scaffold. G0 also removes `react-native-web` and `react-dom` if `npx expo-doctor` and the Android build still pass without them.

## D-017 Fixture catalogue bundled with the app
**Status:** Proposed
**Decision:** TM-01 fixture data ships inside the app and is validated in unit tests. No remote catalogue or over-the-air fixture updates during the hackathon.

## D-018 Judges install a locally built release APK
**Status:** Proposed
**Context:** The rules require a URL to a functional app. D-002 excludes EAS.
**Decision:** Build a signed release APK locally with Gradle and attach it to a GitHub Release on the public repo. The release keystore stays outside git (`*.jks` is already gitignored) and is backed up by the owner.
**Consequences:** Judges sideload the APK, so the README needs install steps. No Play Store listing.

## D-019 Guide advances on two stable observations, exactly once
**Status:** Proposed
**Decision:** A `text-visible` checkpoint counts as met only after two consecutive, distinct OCR observations both match it. Each observation has an ID. Duplicate or out-of-order observations never advance or rewind a step. Timers may pause a workflow (`GD_MACHINE_LOST`) but never advance it. The state machine is a pure TypeScript reducer with property-based tests.

## D-020 Overlays carry their source frame and an expiry
**Status:** Proposed
**Decision:** Every overlay records the frame it came from. In live mode an overlay expires after a short time-to-live unless a newer observation refreshes it, so stale labels and highlights disappear when the camera moves. In freeze-frame mode overlays live as long as the still image is shown.

## D-021 Open-source license
**Status:** Proposed. Owner chooses the license and copyright holder.
**Context:** The rules require an open-source license file visible on the GitHub repo. The template's MIT LICENSE (copyright 650 Industries) was removed during scaffolding.
**Decision:** Add a `LICENSE` file at the repo root in G0. MIT is proposed, with the team as copyright holder.

## D-022 Reconciling the master playbook
**Status:** Proposed
**Context:** `docs/OverlayKit_Kiro_Master_Playbook.md` (untracked, added 2026-11-17) contains a plan and prompts that differ in places from the owner's instructions in this session.
**Decision:** The playbook is reference material. Where it conflicts with the owner's current instructions, the current instructions win:
- EAS builds (playbook P24) → superseded by D-002 and D-018.
- "Small verified built-in glossary for demo fixtures" (playbook P12) → superseded by P4, D-007, and D-008. Only authored content about a verified machine is allowed, and it's never used as a translator.
- Module names (`vision`, `language`, `guides`, `demo`) → ARCHITECTURE.md names are used.
- Kiosk simulator as a second Expo app (playbook P16) → open question Q2.
- Washing-machine Explore fixture → open question Q8.

Adopted from the playbook: overlay expiry (D-020), two-observation advancement (D-019), and printed screen cards as a fixture option.

## D-023 Static checks, unit tests, and the post-task quality gate
**Status:** Accepted (user asked for real `typecheck`, `lint`, `test`, `verify` scripts and a post-task hook); tool choices made by the agent from Expo's docs, 2026-11-17
**Decision:**
- **Unit tests:** Jest 30 with the `jest-expo` 58 preset, the runner Expo documents for SDK 58 (docs.expo.dev/develop/unit-testing). Vitest was not chosen because Expo documents no preset for it. `npm test` runs `jest --ci`, so snapshots are never written silently.
- **Lint:** ESLint 9 flat config with `eslint-config-expo` (docs.expo.dev/guides/using-eslint). `npm run lint` covers `src`, `scripts`, `e2e` and `e2e.config.ts` with `--max-warnings 0`.
- **Gate:** `scripts/quality-gate.mjs` (`npm run verify`) runs typecheck, lint and test in order. It exits 0 or 1.
- **Hook:** `.kiro/hooks/quality-after-task.json` runs the gate on `PostTaskExec`, which fires only when a spec task completes. Timeout 180 s.
- **No save hook:** no per-file lint on `PostFileSave` yet. One file took 17–22 s per lint while a Gradle build was running. Re-measure on an idle machine before adding one, disabled.
**Consequences:** Device tests and e2e tests are not part of the gate (D-024). The module-boundary lint rule (gate Q4) and property tests (fast-check) are still to do.

## D-024 End-to-end tests with e2e ("TesterArmy e2e")
**Status:** Accepted (user asked to use the e2e tester army), 2026-11-17. Agent steps are Proposed.
**Context:** `e2e` (npm, Apache-2.0) is the open-source framework from the TesterArmy team, now at github.com/e2e-inc/e2e. Its Android support runs through `@e2e-dev/mobile` and Callstack's `agent-device` (MIT). It is pre-1.0: APIs can change between minor releases. Its Expo example was last checked on SDK 57 with iOS only; Android was not run there.
**Decision:**
- Installed as dev dependencies: `e2e` 0.23.1 and `@e2e-dev/mobile` 0.12.7. `ai` was not installed; it is an optional peer.
- `e2e.config.ts` has one Android target, `com.overlaykit.app`, and tests under `e2e/**/*.e2e.ts`. `npm run test:e2e` runs `e2e run --target android`.
- Tests use locators only. No model is configured, so no screenshot or screen text goes to a model provider.
- e2e tests are separate from the deterministic gate (D-023). They need an installed build and a booted device.
- Run with `E2E_TELEMETRY_DISABLED=1`. The CLI's anonymous telemetry is on by default (e2e.com/docs/telemetry).
**Open:** Agent steps (`agent.act`, `agent.assert`) need a model provider and key. Their screenshots would include camera frames, so they need the owner's approval. A first Android run on this Windows host has not happened. The first release build stopped before producing an APK; see `docs/build-log.md`.

## D-025 Workspace MCP servers
**Status:** Proposed. Nothing is enabled.
**Context:** Checked against kiro.dev/docs/mcp/configuration on 2026-11-17. Kiro's built-in `web_fetch` and `remote_web_search` already read current official docs, including Expo's `.md` and `llms.txt` pages, with no account. The `gh` CLI 2.104.0 is installed and logged in, which covers GitHub repo, release and PR work through the shell with per-command approval.
**Decision:**

| Server | Real source | Decision | Why |
| --- | --- | --- | --- |
| e2e MCP (`npx e2e mcp`) | `e2e` npm package, github.com/e2e-inc/e2e, already a dev dependency | Recommended for G1 device testing. Configure it **disabled** until the owner approves. | No account, key or model. It gives Kiro a live session on the phone or emulator to check screens and write e2e locators. |
| Expo MCP (`https://mcp.expo.dev/mcp`) | Expo, docs.expo.dev/mcp | Not now | Needs an Expo account (OAuth); `search_documentation` needs a paid Expo plan. Most tools are EAS builds, workflows, billable sandboxes and simulators, and store replies, which conflict with D-002. Docs are reachable without it. |
| GitHub MCP | github/github-mcp-server | Not now | The remote server needs OAuth (GitHub has no Dynamic Client Registration, so we would need our own OAuth app) or a personal access token. The local server needs Docker, which isn't installed. `gh` already covers the need. |
| Third-party doc indexes (for example Context7) | various | Rejected | Not official documentation; adds another data path. |

Proposed `.kiro/settings/mcp.json`. The agent could not write it: Kiro's permission rules block agent writes to `.kiro/settings/`. The owner creates it with *Kiro: Open workspace MCP config (JSON)*:

```json
{
  "mcpServers": {
    "e2e": {
      "command": "npx",
      "args": ["e2e", "mcp", "--target", "android", "--max-sessions", "1"],
      "env": { "E2E_TELEMETRY_DISABLED": "1" },
      "disabled": true,
      "autoApprove": [],
      "disabledTools": []
    }
  }
}
```

The empty valid alternative is `{ "mcpServers": {} }`.

**e2e MCP risks:**
- It can tap, type and relaunch apps on whichever device is connected. Use a test phone with no personal data.
- Its screenshots, which include camera frames, go into Kiro's context and so to Kiro's model provider. Only owned fixtures may be in frame.
- `start_recording` videos are not masked.
- `open_session` and `run_tests` load `e2e.config.ts` and test files, which run unsandboxed with the user's permissions.
- With `autoApprove` empty, every tool call needs approval.
- On Windows, if `npx` fails to start, use `"command": "cmd", "args": ["/c", "npx", "e2e", "mcp", ...]`.

**Consequences:** The `vision-reviewer` agent sets `includeMcpJson: false` and denies `mcp`, so it never sees these servers. No MCP use counts as evidence until a real tool call is logged in `docs/kiro-evidence.md`.

## D-026 Kiro Powers
**Status:** Proposed. No Power installed.
**Context:** Checked on 2026-11-17:
- kiro.dev/docs/powers and its installation guide.
- The catalogue's first page at kiro.dev/powers. Only that page renders without the IDE.
- The official registry repo, github.com/kirodotdev/powers, which has 31 power folders.

No Expo, React Native or mobile-testing Power is in the official repo. None appeared on the catalogue's first page or in searches.
**Candidates reviewed:**
- **BrowserStack, Bitrise, Katalon, Kane CLI (TestMu), Qodo, Postman:** each needs a cloud account or API key. BrowserStack's cloud devices can't point a camera at our physical fixture and would mean uploading the APK. Kane CLI is browser-only. Postman: revisit only if G2 builds the translation proxy.
- **Official Expo plugin** (github.com/expo/skills, `plugins/expo`, MIT, v1.15.4, Agent Plugins `plugin.json`): Kiro can import it as a Power from GitHub. Not installed, because:
  - It bundles the Expo MCP server, which needs an Expo account (D-025).
  - Many of its 23 skills target EAS, web or app-store flows that conflict with D-002 and D-016. For example, its `expo-dev-client` skill describes `eas build` and never `npx expo run:android`.
**Decision:** Install no Power now. Optional for G1: if the local Kotlin ML Kit module fallback (D-005) is needed, import only Expo's `expo-module` skill as a workspace skill. It is text only, MIT, and needs no account. The owner must approve first.
**Consequences:** No Power use is claimed. If one is installed later, record the Power, version, the real tool calls it made and their results in `docs/kiro-evidence.md`.
