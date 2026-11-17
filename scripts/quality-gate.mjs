#!/usr/bin/env node
// Deterministic quality gate for OverlayKit.
//
// Runs the package.json scripts typecheck, lint and test, in that order, and
// reports one line per check. Every check runs even after an earlier one
// fails, so a single run shows all problems.
//
// Used by `npm run verify` and by the Kiro hook .kiro/hooks/quality-after-task.json.
// Exit code: 0 when every check passes, 1 when any check fails. It never
// exits 2, which some Kiro triggers treat as "block".
//
// Output: on success, a short summary on stdout (Kiro adds a passing hook's
// stdout to the agent's context, so it stays small). On failure, the summary
// and the tail of each failing check's output on stderr (Kiro sends a failing
// hook's stderr to the agent).
//
// No device, network, or model is needed. End-to-end tests (`npm run test:e2e`)
// are deliberately not part of this gate.

import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const CHECKS = ['typecheck', 'lint', 'test'];
const TAIL_CHARS = 4000;

function runScript(script) {
  return new Promise((resolve) => {
    const started = performance.now();
    let output = '';
    // shell: true resolves `npm` to npm.cmd on Windows and to npm on macOS/Linux.
    // The command is a fixed string built from CHECKS, never from user input.
    const child = spawn(`npm run --silent ${script}`, {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
    });
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));
    child.on('error', (error) => {
      output += `\nCould not start "npm run ${script}": ${error.message}\n`;
    });
    child.on('close', (code, signal) => {
      resolve({
        script,
        passed: code === 0,
        exit: signal ? `signal ${signal}` : `exit ${code}`,
        seconds: (performance.now() - started) / 1000,
        output,
      });
    });
  });
}

function tail(text) {
  const trimmed = text.trim();
  if (trimmed.length <= TAIL_CHARS) return trimmed;
  // Start the tail at a line boundary so the first line isn't cut in half.
  const cut = trimmed.slice(-TAIL_CHARS);
  const firstBreak = cut.indexOf('\n');
  return `[earlier output omitted]\n${firstBreak === -1 ? cut : cut.slice(firstBreak + 1)}`;
}

const started = performance.now();
const results = [];
for (const script of CHECKS) {
  results.push(await runScript(script));
}
const total = ((performance.now() - started) / 1000).toFixed(1);
const failed = results.filter((r) => !r.passed);
const lines = results.map(
  (r) => `  ${r.passed ? 'PASS' : 'FAIL'} ${r.script.padEnd(9)} ${r.seconds.toFixed(1)}s${r.passed ? '' : ` (${r.exit})`}`,
);

if (failed.length === 0) {
  process.stdout.write(`quality-gate: PASS (${results.length} checks, ${total}s)\n${lines.join('\n')}\n`);
  process.exitCode = 0;
} else {
  const names = failed.map((r) => r.script).join(', ');
  const details = failed.map((r) => `--- ${r.script} output (tail) ---\n${tail(r.output)}`).join('\n\n');
  process.stderr.write(
    `quality-gate: FAIL (${failed.length} of ${results.length} failed: ${names}; ${total}s)\n` +
      `${lines.join('\n')}\n\n${details}\n\nRe-run with: npm run verify\n`,
  );
  process.exitCode = 1;
}
