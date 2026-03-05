/**
 * Installation Component Tests (Compatibility Entrypoint)
 *
 * This file intentionally stays as the public test runner entrypoint.
 * Modular suites live under test/installation-components/.
 */

const { colors, runInstallationComponentTests } = require('./installation-components');

runInstallationComponentTests({ testDir: __dirname }).catch((error) => {
  console.error(`${colors.red}Test runner failed:${colors.reset}`, error.message);
  console.error(error.stack);
  process.exit(1);
});
