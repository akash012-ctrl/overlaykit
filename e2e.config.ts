import type { E2EConfig } from 'e2e';
import { mobile } from '@e2e-dev/mobile';

// End-to-end tests with e2e (https://e2e.com/docs), driving the OverlayKit
// build installed on an Android phone or emulator. Build and install the app
// first; the steps are in docs/DEVICE-TESTS.md under "E2E tests".
//
// No agent model is configured, so the tests use locators only and nothing
// from the screen goes to a model provider. Adding agent steps needs a model
// decision first (docs/DECISIONS.md, D-024).
export default {
  tests: 'e2e/**/*.e2e.ts',
  targets: [
    {
      name: 'android',
      engine: mobile({ platform: 'android' }),
      app: { bundleId: 'com.overlaykit.app' },
    },
  ],
  workers: 1,
} satisfies E2EConfig;
