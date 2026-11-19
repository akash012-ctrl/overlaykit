// ESLint flat config, as documented at https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// Module boundaries: docs/ARCHITECTURE.md §5, static gate Q4 (AT-G0-04).
//
// - Which module may import which: `import/no-restricted-paths` from
//   eslint-plugin-import, which eslint-config-expo already registers. It checks
//   the resolved file of every import, re-export, `import()` and `require()`, so
//   relative, aliased (`@/modules/...`) and trailing-slash forms are all caught.
// - Package bans (React/RN/Expo in shared and geometry, vendor packages, media
//   library, HTTP clients, test-support): ESLint core `no-restricted-imports`
//   with `regex` patterns (https://eslint.org/docs/latest/rules/no-restricted-imports).
// - Network globals: `no-restricted-globals` and `no-restricted-properties`.
// - Dynamic imports and `require()` of packages: `no-restricted-syntax`, so
//   every package import is static and the bans above can see it.
// No new dependency is needed.

const MODULES = ['shared', 'capture', 'ocr', 'geometry', 'locale', 'components', 'guide', 'speech', 'ui'];

/** Which modules each module may import ("may import" arrows in ARCHITECTURE.md §5). */
const ALLOWED = {
  shared: [],
  capture: ['shared'],
  ocr: ['shared'],
  geometry: ['shared'],
  locale: ['shared'],
  speech: ['shared'],
  components: ['geometry', 'shared'],
  guide: ['components', 'geometry', 'shared'],
  ui: ['guide', 'components', 'locale', 'speech', 'ocr', 'capture', 'geometry', 'shared'],
};

/**
 * Each vendor package may be imported only by the one adapter file that owns it
 * (architecture steering, Provider adapters). Filled in by the G1a installs
 * (task 10.2), in the same commit as each package. Example entry:
 * { module: 'capture', file: 'src/modules/capture/camera-adapter.ts', packages: ['<camera package>'] }
 */
const VENDOR_OWNERS = [
  { module: 'capture', file: 'src/modules/capture/camera-adapter.ts', packages: ['expo-camera'] },
  { module: 'capture', file: 'src/modules/capture/CameraPreview.tsx', packages: ['expo-camera'] },
  { module: 'capture', file: 'src/modules/capture/file-system-port.ts', packages: ['expo-file-system'] },
];

/**
 * Modules that make no network calls (R17.9, R22.1, visual-computer-vision
 * steering). Every module for now. locale leaves this list in spec B, when the
 * translation proxy and OpenRouter adapters arrive (D-028).
 */
const NETWORK_FREE = [...MODULES];

/** Gallery and shared-media writes are banned everywhere (R4.8, R21.5). */
const MEDIA_LIBRARY = ['expo-media-library', '@react-native-camera-roll/camera-roll'];

/** Network clients other than the globals below. */
const NETWORK_PACKAGES = ['expo/fetch', 'axios', 'ky', 'got', 'superagent', 'node-fetch', 'cross-fetch', 'isomorphic-fetch', 'whatwg-fetch', 'undici'];

const escapeRegex = (name) => name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const packagePattern = (names) => `^(${names.map(escapeRegex).join('|')})(/.*)?$`;

function boundaryZones(name) {
  return MODULES.filter((other) => other !== name).map((other) =>
    ALLOWED[name].includes(other)
      ? {
          target: `./src/modules/${name}`,
          from: `./src/modules/${other}`,
          except: ['./index.ts'],
          message: `Import ${other} through its index.ts only (ARCHITECTURE.md §5).`,
        }
      : {
          target: `./src/modules/${name}`,
          from: `./src/modules/${other}`,
          message: `${name} may not import ${other} (ARCHITECTURE.md §5).`,
        },
  );
}

function importPatternsFor(name, { isTest, ownPackages = [] }) {
  const patterns = [
    { regex: packagePattern(MEDIA_LIBRARY), message: 'Stills and exports never go to the gallery or shared media (R4.8, R21.5).' },
  ];
  if (!isTest) {
    patterns.push({ regex: '(^|/)test-support(/|$)', message: 'test-support is for tests only (R18.6).' });
  }
  if (!isTest && NETWORK_FREE.includes(name)) {
    patterns.push({ regex: packagePattern(NETWORK_PACKAGES), message: 'This module makes no network calls (R17.9, R22.1).' });
  }
  if (name === 'shared' || name === 'geometry') {
    patterns.push({
      regex: '^(react|react-native|expo)($|[-/])|^@(react-native|react-native-[^/]+|expo)/',
      message: `${name} has no React, React Native or Expo imports (ARCHITECTURE.md §4).`,
    });
  }
  const vendorPackages = VENDOR_OWNERS.flatMap((owner) => owner.packages).filter((pkg) => !ownPackages.includes(pkg));
  if (!isTest && vendorPackages.length > 0) {
    patterns.push({
      regex: packagePattern(vendorPackages),
      message: 'Vendor libraries are imported only by their adapter file (architecture steering).',
    });
  }
  return patterns.map((pattern) => ({ ...pattern, caseSensitive: true }));
}

const NETWORK_GLOBALS = ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource'];
const NETWORK_MESSAGE = 'This module makes no network calls (R17.9, R22.1).';
const networkRules = {
  'no-restricted-globals': ['error', ...NETWORK_GLOBALS.map((name) => ({ name, message: NETWORK_MESSAGE }))],
  'no-restricted-properties': [
    'error',
    ...['globalThis', 'global', 'self', 'window'].flatMap((object) =>
      NETWORK_GLOBALS.map((property) => ({ object, property, message: NETWORK_MESSAGE })),
    ),
  ],
};

// Relative require() stays allowed for the __DEV__-only debug accessors (DD-13);
// import/no-restricted-paths still checks where it points. A package require()
// or any import() would slip past no-restricted-imports, so both are banned.
const dynamicImportRule = [
  'error',
  { selector: 'ImportExpression', message: 'Use static imports so the boundary rules can check them (ARCHITECTURE.md §5).' },
  {
    selector: "CallExpression[callee.name='require']:not([arguments.0.value=/^\\./])",
    message: 'Only relative require() is allowed, so the package bans can check every import (ARCHITECTURE.md §5).',
  },
];

const moduleConfigs = MODULES.flatMap((name) => [
  {
    files: [`src/modules/${name}/**/*.{ts,tsx}`],
    ignores: [`src/modules/${name}/**/__tests__/**`],
    rules: {
      'import/no-restricted-paths': ['error', { basePath: __dirname, zones: boundaryZones(name) }],
      'no-restricted-imports': ['error', { patterns: importPatternsFor(name, { isTest: false }) }],
      'no-restricted-syntax': dynamicImportRule,
      ...(NETWORK_FREE.includes(name) ? networkRules : {}),
      'no-console': 'error',
    },
  },
  {
    // Tests may import test-support/ and their own module's internals, but
    // still not other modules' internals or forbidden modules.
    files: [`src/modules/${name}/**/__tests__/**/*.{ts,tsx}`],
    rules: {
      'import/no-restricted-paths': ['error', { basePath: __dirname, zones: boundaryZones(name) }],
      'no-restricted-imports': ['error', { patterns: importPatternsFor(name, { isTest: true }) }],
    },
  },
]);

const vendorOwnerConfigs = VENDOR_OWNERS.map((owner) => ({
  files: [owner.file],
  rules: {
    'no-restricted-imports': [
      'error',
      { patterns: importPatternsFor(owner.module, { isTest: false, ownPackages: owner.packages }) },
    ],
  },
}));

const routeConfig = {
  // Routes stay thin and render a ui screen (architecture steering, Layers).
  files: ['src/app/**/*.{ts,tsx}'],
  rules: {
    'import/no-restricted-paths': [
      'error',
      {
        basePath: __dirname,
        zones: [
          {
            target: './src/app',
            from: './src/modules',
            except: ['./ui/index.ts'],
            message: 'Routes import only the ui module, through its index.ts (ARCHITECTURE.md §5).',
          },
        ],
      },
    ],
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          { regex: '(^|/)test-support(/|$)', message: 'test-support is for tests only (R18.6).', caseSensitive: true },
          { regex: packagePattern(MEDIA_LIBRARY), message: 'No gallery or shared-media writes (R4.8, R21.5).', caseSensitive: true },
        ],
      },
    ],
  },
};

module.exports = defineConfig([
  globalIgnores(['dist/*', '.expo/*', '.e2e/*', 'coverage/*', 'android/*', 'ios/*']),
  expoConfig,
  ...moduleConfigs,
  ...vendorOwnerConfigs,
  routeConfig,
]);
