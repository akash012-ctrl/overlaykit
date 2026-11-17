// ESLint flat config, as documented at https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  globalIgnores(['dist/*', '.expo/*', '.e2e/*', 'coverage/*', 'android/*', 'ios/*']),
  expoConfig,
]);
