// Q9: permissions. Reads the main manifest that `expo prebuild` generated and, if present,
// the merged release manifest. Lists every permission. Anything outside ALLOWED is a finding.
// Run `npx expo prebuild --clean` first (and processReleaseMainManifest for the merged file).
import { existsSync, readFileSync } from 'node:fs';
import { finish, root } from './lib.mjs';

// Each entry needs a justification in docs/build-log.md (spec 04 task 9.4).
const ALLOWED = new Set([
  'android.permission.CAMERA',
  'android.permission.INTERNET',
  'android.permission.VIBRATE', // Expo/RN core
  'android.permission.ACCESS_NETWORK_STATE', // RN core NetInfo-style reads
]);
const FORBIDDEN_NOTE = ['RECORD_AUDIO', 'LOCATION', 'STORAGE', 'SYSTEM_ALERT_WINDOW'];

const candidates = [
  `${root}android/app/src/main/AndroidManifest.xml`,
  `${root}android/app/build/intermediates/merged_manifests/release/processReleaseMainManifest/AndroidManifest.xml`,
  `${root}android/app/build/intermediates/merged_manifests/release/AndroidManifest.xml`,
].filter(existsSync);

const problems = [];
if (candidates.length === 0) problems.push('no manifest found; run `npx expo prebuild --clean --platform android --no-install`');
for (const file of candidates) {
  const xml = readFileSync(file, 'utf8');
  const perms = [...xml.matchAll(/<uses-permission[^>]*android:name="([^"]+)"([^>]*)>/g)];
  process.stdout.write(`${file}\n${perms.map((m) => `  ${m[1]}${/tools:node="remove"/.test(m[2]) ? ' (removed)' : ''}`).join('\n') || '  (none)'}\n`);
  for (const m of perms) {
    if (/tools:node="remove"/.test(m[2])) continue;
    if (!ALLOWED.has(m[1])) {
      const hard = FORBIDDEN_NOTE.some((w) => m[1].includes(w));
      problems.push(`${file}: ${hard ? 'forbidden' : 'unlisted'} permission ${m[1]}`);
    }
  }
}
finish('Q9 permissions', problems, `${candidates.length} manifest(s)`);
