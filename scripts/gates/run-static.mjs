// Runs Q7, Q8, hygiene and Q9 and prints one verdict each. Exit 1 if any fails.
// Q1 to Q6 stay in `npm run verify` and `npx expo install --check`.
// Usage: node scripts/gates/run-static.mjs [exportDir]
import { spawnSync } from 'node:child_process';

const dir = process.argv[2] ? [process.argv[2]] : [];
let failed = false;
for (const script of ['q7-secrets', 'q8-packages', 'hygiene', 'q9-manifest']) {
  const args = script === 'q9-manifest' ? [] : dir;
  const r = spawnSync(process.execPath, [new URL(`./${script}.mjs`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), ...args], { encoding: 'utf8' });
  process.stdout.write(r.stdout);
  process.stderr.write(r.stderr);
  if (r.status !== 0) failed = true;
}
process.exitCode = failed ? 1 : 0;
