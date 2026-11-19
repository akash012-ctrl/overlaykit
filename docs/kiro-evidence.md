# OverlayKit: Kiro usage evidence

Only things that actually ran go here, with the date, what triggered them, and the real output. "Created" and "used" are different statuses. A hook, skill, agent, MCP server or Power counts as used only when Kiro ran it and its output is recorded below.

## Status (2026-11-19)

| Kiro feature | File | Status |
| --- | --- | --- |
| Steering (always) | `.kiro/steering/product.md`, `stack.md`, `architecture.md`, `quality.md`, `build-approach.md` | Created. Loaded into sessions; no separate evidence of effect recorded yet. |
| Steering (fileMatch) | `.kiro/steering/visual-computer-vision.md`, `native-ux.md` | Created. Seen loading on matching files on 2026-11-19 (entry below). |
| Steering (manual) | `.kiro/steering/hackathon.md` | Created. Not yet included with `#hackathon`. |
| Hook | `.kiro/hooks/quality-after-task.json` (`PostTaskExec`) | Created. **Not yet triggered by Kiro**: no spec task has completed. Its command was run by hand (below). |
| Skills | `.kiro/skills/physical-device-qa`, `.kiro/skills/vision-safety-review` | Created and format-checked. **Not yet invoked.** |
| Custom agent | `.kiro/agents/vision-reviewer.md` | Created and format-checked. **Run once as a sub-agent** on 2026-11-19 (spec 01 task 8, entry below). Not yet selected in the IDE agent picker. |
| MCP | `.kiro/settings/mcp.json` (proposed, D-025) | **Not configured.** Agent writes to `.kiro/settings/` are blocked. No MCP tool calls. |
| Powers | — | **None installed, none used** (D-026). |
| Specs | `.kiro/specs/01-camera-ocr-geometry` to `04-native-experience-and-release` | Four specs written. Spec 01 tasks 2 to 8 implemented on 2026-11-19 (entry below). |

## Entries

### 2026-11-17: quality gate catches a geometry bug

- **What:** `scripts/quality-gate.mjs`, the command the `PostTaskExec` hook runs. It was run by hand in a Kiro chat, not triggered by the hook.
- **Setup:** `src/modules/geometry/cover-transform.ts` (cover scaling) with 40 Jest tests in `src/modules/geometry/__tests__/cover-transform.test.ts`.
- **Baseline:** `npm run verify` → `quality-gate: PASS (3 checks, 7.6s)`: typecheck 2.0 s, lint 4.0 s, test 1.7 s. Exit 0.
- **Break:** in `computeCoverTransform`, `Math.max(...)` became `Math.min(...)`. That is contain scaling instead of cover, a realistic bug that still typechecks.
- **Result:** `node scripts/quality-gate.mjs` → exit 1, nothing on stdout, a 4,311-character report on stderr:
  ```
  quality-gate: FAIL (1 of 3 failed: test; 50.6s)
    PASS typecheck 16.1s
    PASS lint      24.5s
    FAIL test      10.1s (exit 1)
  ...
  Tests:       18 failed, 22 passed, 40 total
  ```
  Example failure: `always covers the view: 640 x 480 in 360 x 800`, where the scaled height was 270 and needed to be at least 800. The run took 50.6 s because a Gradle build was using the CPU at the same time.
- **Restore:** `Math.max` put back. The file is byte-identical to the original text (SHA-256 `4FAA9B09…2A2131`, compared with `git diff --no-index`).
- **Re-run:** `npm run verify` → `quality-gate: PASS (3 checks, 13.0s)`, exit 0.
- **Simulated hook call:** `'{"hook_event_name":"PostTaskExec",...}' | cmd /d /c "node scripts/quality-gate.mjs"` → PASS, exit 0. The same simulation under `pwsh -Command` was interrupted and has no result.
- **Change made from this run:** the runner's failure tail now starts at a line boundary, with an `[earlier output omitted]` marker.
- **Fix to Kiro-generated config:** `createHook` put `timeout` under `action`. The docs define `hooks[].timeout`, so it was moved there.

### 2026-11-19: spec 01-camera-ocr-geometry, tasks 2 to 8 (pure modules)

- **Trigger:** chat prompt "implement all the tasks" with `.kiro/specs/01-camera-ocr-geometry/tasks.md` open, Kiro IDE. Base commit `fd6ac5e`, changes uncommitted.
- **Scope done:** tasks 2 (shared types), 3.1 and 3.2 (boundary lint), 4.1 to 4.3 (geometry), 5.1 to 5.3 (OCR post-processing), 6 (locale), 7.1 to 7.3 (ui state logic), 8 (checkpoint). No new dependency, no native code, no phone.
- **Hook:** the `PostTaskExec` hook was **not** triggered. The tasks were done in chat, not through the spec task runner. Its command was run by hand instead (below).
- **Steering seen:** `visual-computer-vision.md` (fileMatch) was added to the session's context after the geometry files were read. `native-ux.md` (fileMatch) was added after `src/app/boundary-probe.tsx` was written.

#### Task 3.2: the boundary rule fails on forbidden imports (AT-G0-04, gate Q4)

First rule version (core `no-restricted-imports` regex patterns only). Probe files `src/modules/geometry/boundary-probe.ts` and `src/modules/ui/__tests__/boundary-probe.test.ts`. `npm run lint` → exit 1, `6 problems (6 errors, 0 warnings)`:

```
geometry/boundary-probe.ts
  2:1   error  '../ocr' import is restricted ... geometry may not import capture, ocr, locale, components, guide, speech, ui (ARCHITECTURE.md §5)  no-restricted-imports
  3:1   error  '../ocr/post-process/post-process' import is restricted ... Import other modules through their index.ts only  no-restricted-imports
  4:1   error  '@/modules/locale/t' import is restricted ... Import other modules through their index.ts only  no-restricted-imports
  5:1   error  'react-native' import is restricted ... geometry has no React, React Native or Expo imports  no-restricted-imports
  7:45  error  Unexpected use of 'fetch'. This module makes no network calls (R17.9, R22.1)  no-restricted-globals
ui/__tests__/boundary-probe.test.ts
  2:1   error  '../../ocr/post-process/quad' import is restricted ... Import other modules through their index.ts only  no-restricted-imports
```

Probes deleted, `npm run lint` → exit 0.

The task 8 review (below) found forms this version missed. Second version: `import/no-restricted-paths` (eslint-plugin-import 2.32.0, already registered by `eslint-config-expo`) checks the resolved file of every import, plus `no-restricted-syntax` for `import()` and package `require()`, `no-restricted-properties` for `globalThis.fetch` and similar, and wider package patterns. Probes in `src/modules/geometry/`, `src/modules/ui/overlay/`, `src/modules/ui/overlay/__tests__/` and `src/app/`. `npm run lint` → exit 1, `22 problems (18 errors, 4 warnings)`. The errors (the four warnings were `import/no-duplicates` and `@typescript-eslint/no-require-imports` on the same probe lines):

```
app/boundary-probe.tsx            2:25  "../modules/geometry"  Routes import only the ui module, through its index.ts  import/no-restricted-paths
geometry/boundary-probe.ts        2:33  "../ocr"                         geometry may not import ocr        import/no-restricted-paths
                                  3:29  "../ocr/post-process/post-process" geometry may not import ocr      import/no-restricted-paths
                                  4:19  "@/modules/locale/t"             geometry may not import locale     import/no-restricted-paths
                                  5:33  "../../modules/ocr"              geometry may not import ocr        import/no-restricted-paths
                                  6:38  "../ocr/"                        geometry may not import ocr        import/no-restricted-paths
                                  7:1   'react-native'                   no React, React Native or Expo     no-restricted-imports
                                  8:1   'react-native-reanimated'        no React, React Native or Expo     no-restricted-imports
                                  9:1   'expo/fetch'                     no network calls; no Expo          no-restricted-imports (2 errors)
                                 11:16  require('expo-camera')           Only relative require() is allowed no-restricted-syntax
                                 12:14  import('../ocr')                 Use static imports                 no-restricted-syntax
                                 12:21  import('../ocr')                 geometry may not import ocr        import/no-restricted-paths
                                 14:80  fetch                            no network calls                   no-restricted-globals
                                 14:87  globalThis.fetch                 no network calls                   no-restricted-properties
ui/overlay/__tests__/boundary-probe.test.ts  2:27  "../../../ocr/post-process/quad"  Import ocr through its index.ts only  import/no-restricted-paths
ui/overlay/boundary-probe.ts      2:27  "../../ocr/post-process/quad"    Import ocr through its index.ts only      import/no-restricted-paths
                                  3:25  "../../geometry/quad"            Import geometry through its index.ts only import/no-restricted-paths
```

Probes deleted, `npm run lint` → exit 0.

#### Task 8: checkpoint

- `npm run verify` → `quality-gate: PASS (3 checks, 10.8s)`, exit 0. `npx jest --ci` → `Tests: 262 passed, 262 total` in 19 suites.
- `npx expo-doctor` stopped at npx's prompt to install `expo-doctor@1.21.8` and was killed after the 300 s tool timeout with no output. `npx --yes expo-doctor` → `20/20 checks passed. No issues detected!`, exit 0.
- **vision-reviewer agent:** run once as a sub-agent on the task 2 to 7 file list. Its report says it read every listed file, and it used the `vision-safety-review` severity and verdict format. Its output doesn't show whether it loaded the skill file itself. Verdict **CHANGES REQUIRED**, no BLOCKER or HIGH, 8 MEDIUM and 7 LOW findings. Fixed in this session:
  - lint rule gaps (roundabout paths, trailing slash, `require`, `import()`, `globalThis.fetch`, `expo/fetch`, `react-native-*` packages);
  - no `rect.test.ts`;
  - untested script ties;
  - the degenerate-quad visibility branch;
  - an ok OCR result whose own `frameId` differs from the frame being read. Test first: it failed with `1 failed, 22 passed`, then passed after the fix;
  - the dropped-capture contract, documented and tested;
  - this evidence entry.

  Left for the owner: `OCR_RECOGNITION_FAILED` "keeps the preview" in ARCHITECTURE.md §8 against DD-9; the AI-drafted hi/kn strings against D-031's "authored by the team"; a DECISIONS.md entry for the proposed layout values; and whether script ties should count as unsupported.
- After the fixes: `npm run verify` → `quality-gate: PASS (3 checks, 8.2s)`, exit 0. `npx jest --ci` → `Tests: 283 passed, 283 total` in 20 suites.
- **Device:** none. Device validation pending.

## Spec 02 task 3.4: boundary lint rule for locale (lane A)

- `eslint.config.js`: `NETWORK_ALLOWED_FILES` (`locale/http-port.ts`, `locale/adapters/*-route.ts`) switch off the network-global bans. Every other file in every module, `locale` included, still bans `fetch`. The network-package ban (axios and others) is unchanged.
- Proof: a temporary `src/modules/locale/zz-probe.ts` with `import { x } from '../ui'` made `npx eslint src/modules/locale` report `error  Unexpected path "../ui" imported in restricted zone. locale may not import ui (ARCHITECTURE.md §5)  import/no-restricted-paths`. The probe was removed. (`components` does not exist yet, so `ui` was the forbidden target.)
- `npm run lint` after removal: 0 errors, 4 warnings, all `no-require-imports` in spec 01 files (`ocr/index.ts`, `CameraScreen.tsx`, `ui/services.tsx`), none in files of this change.
