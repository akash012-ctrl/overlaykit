// Q7: no secrets in the app. Searches src/ and, when a directory is given, an `expo export` output.
// Usage: node scripts/gates/q7-secrets.mjs [exportDir]
import { SECRET_PATTERNS, finish, root, search, walk } from './lib.mjs';

const targets = [`${root}src`];
if (process.argv[2]) targets.push(process.argv[2]);
const files = targets.flatMap((dir) => [...walk(dir)]);
finish('Q7 no secrets', search(files, SECRET_PATTERNS), `${files.length} files searched`);
