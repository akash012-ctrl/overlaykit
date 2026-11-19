// Task 9.2 and 9.3: ignore rules, and no debug hooks in a release bundle.
// Usage: node scripts/gates/hygiene.mjs [exportDir]
import { execFileSync } from 'node:child_process';
import { finish, root, search, walk } from './lib.mjs';

const git = (...args) => {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
};

const problems = [];
if (git('check-ignore', '-v', '.kiro')) problems.push('.kiro is git-ignored; it must be committed');
if (!git('check-ignore', '-v', 'release.jks')) problems.push('*.jks is not git-ignored');
if (!git('check-ignore', '-v', 'android/x')) problems.push('/android is not git-ignored');
if (git('ls-files', '*.jks', '*.keystore')) problems.push(`keystore tracked by git: ${git('ls-files', '*.jks', '*.keystore')}`);
if (git('log', '--all', '--oneline', '--', '*.jks', '*.keystore')) problems.push('a keystore appears in git history');

if (process.argv[2]) {
  const files = [...walk(process.argv[2])];
  problems.push(...search(files, [/OVERLAYKIT_DEBUG_ONLY/, /withFaultInjection/, /invalid-workflow-hook/, /SnapshotExportButton/]));
}
finish('Hygiene', problems, process.argv[2] ? 'ignore rules and release bundle' : 'ignore rules (no bundle given)');
