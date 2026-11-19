// Q8: no web or login code. Dependencies, src/ and app.json.
import { readFileSync } from 'node:fs';
import { finish, root, search, walk } from './lib.mjs';

const WEB_ONLY = ['react-native-web', 'react-dom', '@expo/metro-runtime-web', 'next', 'react-router-dom'];
const AUTH = [
  /^firebase$/, /^@firebase\//, /^@react-native-firebase\//, /^@clerk\//, /^@auth0\//, /^react-native-auth0$/, /^next-auth$/,
  /^expo-auth-session$/, /^expo-apple-authentication$/, /^@react-native-google-signin\//, /^@supabase\//, /^aws-amplify$/,
  /^react-native-fbsdk/, /^passport/,
];

const pkg = JSON.parse(readFileSync(`${root}package.json`, 'utf8'));
const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
const problems = [
  ...deps.filter((d) => WEB_ONLY.includes(d)).map((d) => `package.json: web-only package "${d}"`),
  ...deps.filter((d) => AUTH.some((re) => re.test(d))).map((d) => `package.json: login package "${d}"`),
];

const app = JSON.parse(readFileSync(`${root}app.json`, 'utf8'));
if (app.expo && 'web' in app.expo) problems.push('app.json: has a "web" block');

const files = [...walk(`${root}src`)];
for (const f of files) if (/\.web\.[jt]sx?$|\+html\.tsx$|\+api\.ts$/.test(f)) problems.push(`${f}: web-only file`);
problems.push(...search(files.filter((f) => /\.(ts|tsx)$/.test(f)), [/from ['"](react-native-web|react-dom)/, /Platform\.OS\s*===\s*['"]web['"]/]));

finish('Q8 no web or login code', problems, `${deps.length} packages, ${files.length} src files`);
