// Shared helpers for the static gate scripts (Q7 to Q9, hygiene). No dependency.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const root = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

export function* walk(dir, skip = ['node_modules', '.git', 'android', 'ios', '.expo']) {
  for (const name of readdirSync(dir)) {
    if (skip.includes(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) yield* walk(full, skip);
    else yield full;
  }
}

/** Returns "file:line: text" for each line that matches a pattern. Text files only. */
export function search(files, patterns, { maxBytes = 5_000_000 } = {}) {
  const hits = [];
  for (const file of files) {
    let text;
    try {
      if (statSync(file).size > maxBytes) continue;
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    if (text.includes('\u0000')) continue;
    text.split(/\r?\n/).forEach((line, i) => {
      for (const p of patterns) if (p.test(line)) hits.push(`${file}:${i + 1}: ${line.trim().slice(0, 120)}`);
    });
  }
  return hits;
}

/** Prints the verdict and sets the exit code. */
export function finish(name, problems, okText) {
  if (problems.length === 0) {
    process.stdout.write(`${name}: PASS (${okText})\n`);
    return;
  }
  process.stderr.write(`${name}: FAIL\n${problems.map((p) => `  ${p}`).join('\n')}\n`);
  process.exitCode = 1;
}

/** Key and token shapes. Generic on purpose; a match is a finding to read, not proof. */
export const SECRET_PATTERNS = [
  /sk-or-v1-[A-Za-z0-9]{16,}/,
  /sk-[A-Za-z0-9]{32,}/,
  /AIza[0-9A-Za-z_-]{35}/,
  /AKIA[0-9A-Z]{16}/,
  /gh[pousr]_[A-Za-z0-9]{36,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /(api[_-]?key|secret|token|storePassword|keyPassword)\s*[:=]\s*['"][A-Za-z0-9_\-/+=]{16,}['"]/i,
  /Bearer\s+[A-Za-z0-9._-]{20,}/,
];
