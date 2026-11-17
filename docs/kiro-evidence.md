# OverlayKit: Kiro usage evidence

Only things that actually ran go here, with the date, what triggered them, and the real output. "Created" and "used" are different statuses. A hook, skill, agent, MCP server or Power counts as used only when Kiro ran it and its output is recorded below.

## Status (2026-11-17)

| Kiro feature | File | Status |
| --- | --- | --- |
| Steering (always) | `.kiro/steering/product.md`, `stack.md`, `architecture.md`, `quality.md`, `build-approach.md` | Created. Loaded into sessions; no separate evidence of effect recorded yet. |
| Steering (fileMatch) | `.kiro/steering/visual-computer-vision.md`, `native-ux.md` | Created. Not yet seen loading on a matching file. |
| Steering (manual) | `.kiro/steering/hackathon.md` | Created. Not yet included with `#hackathon`. |
| Hook | `.kiro/hooks/quality-after-task.json` (`PostTaskExec`) | Created. **Not yet triggered by Kiro**: no spec task has completed. Its command was run by hand (below). |
| Skills | `.kiro/skills/physical-device-qa`, `.kiro/skills/vision-safety-review` | Created and format-checked. **Not yet invoked.** |
| Custom agent | `.kiro/agents/vision-reviewer.md` | Created and format-checked. **Not yet selected or run.** Not yet confirmed in the IDE agent picker. |
| MCP | `.kiro/settings/mcp.json` (proposed, D-025) | **Not configured.** Agent writes to `.kiro/settings/` are blocked. No MCP tool calls. |
| Powers | — | **None installed, none used** (D-026). |
| Specs | — | None yet. |

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
