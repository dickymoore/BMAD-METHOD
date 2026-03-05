const path = require('node:path');
const os = require('node:os');
const fs = require('fs-extra');
const yaml = require('yaml');
const csv = require('csv-parse/sync');
const { YamlXmlBuilder } = require('../../tools/cli/lib/yaml-xml-builder');
const { Installer } = require('../../tools/cli/installers/lib/core/installer');
const { ManifestGenerator } = require('../../tools/cli/installers/lib/core/manifest-generator');
const { TaskToolCommandGenerator } = require('../../tools/cli/installers/lib/ide/shared/task-tool-command-generator');
const { GitHubCopilotSetup } = require('../../tools/cli/installers/lib/ide/github-copilot');
const {
  HELP_ALIAS_NORMALIZATION_ERROR_CODES,
  LOCKED_EXEMPLAR_ALIAS_ROWS,
  normalizeRawIdentityToTuple,
  resolveAliasTupleFromRows,
  resolveAliasTupleUsingCanonicalAliasCsv,
  normalizeAndResolveExemplarAlias,
} = require('../../tools/cli/installers/lib/core/help-alias-normalizer');
const {
  HELP_SIDECAR_REQUIRED_FIELDS,
  HELP_SIDECAR_ERROR_CODES,
  SHARD_DOC_SIDECAR_REQUIRED_FIELDS,
  SHARD_DOC_SIDECAR_ERROR_CODES,
  INDEX_DOCS_SIDECAR_REQUIRED_FIELDS,
  INDEX_DOCS_SIDECAR_ERROR_CODES,
  validateHelpSidecarContractFile,
  validateShardDocSidecarContractFile,
  validateIndexDocsSidecarContractFile,
} = require('../../tools/cli/installers/lib/core/sidecar-contract-validator');
const {
  HELP_FRONTMATTER_MISMATCH_ERROR_CODES,
  validateHelpAuthoritySplitAndPrecedence,
} = require('../../tools/cli/installers/lib/core/help-authority-validator');
const {
  SHARD_DOC_AUTHORITY_VALIDATION_ERROR_CODES,
  validateShardDocAuthoritySplitAndPrecedence,
} = require('../../tools/cli/installers/lib/core/shard-doc-authority-validator');
const {
  INDEX_DOCS_AUTHORITY_VALIDATION_ERROR_CODES,
  validateIndexDocsAuthoritySplitAndPrecedence,
} = require('../../tools/cli/installers/lib/core/index-docs-authority-validator');
const {
  HELP_CATALOG_GENERATION_ERROR_CODES,
  EXEMPLAR_HELP_CATALOG_AUTHORITY_SOURCE_PATH,
  EXEMPLAR_HELP_CATALOG_ISSUING_COMPONENT,
  INSTALLER_HELP_CATALOG_MERGE_COMPONENT,
  buildSidecarAwareExemplarHelpRow,
  evaluateExemplarCommandLabelReportRows,
} = require('../../tools/cli/installers/lib/core/help-catalog-generator');
const {
  CodexSetup,
  CODEX_EXPORT_DERIVATION_ERROR_CODES,
  EXEMPLAR_HELP_EXPORT_DERIVATION_SOURCE_TYPE,
} = require('../../tools/cli/installers/lib/ide/codex');
const {
  PROJECTION_COMPATIBILITY_ERROR_CODES,
  TASK_MANIFEST_COMPATIBILITY_PREFIX_COLUMNS,
  TASK_MANIFEST_CANONICAL_ADDITIVE_COLUMNS,
  HELP_CATALOG_COMPATIBILITY_PREFIX_COLUMNS,
  HELP_CATALOG_CANONICAL_ADDITIVE_COLUMNS,
  validateTaskManifestCompatibilitySurface,
  validateTaskManifestLoaderEntries,
  validateHelpCatalogCompatibilitySurface,
  validateHelpCatalogLoaderEntries,
  validateGithubCopilotHelpLoaderEntries,
  validateCommandDocSurfaceConsistency,
} = require('../../tools/cli/installers/lib/core/projection-compatibility-validator');
const {
  HELP_VALIDATION_ERROR_CODES,
  HELP_VALIDATION_ARTIFACT_REGISTRY,
  HelpValidationHarness,
} = require('../../tools/cli/installers/lib/core/help-validation-harness');
const {
  SHARD_DOC_VALIDATION_ERROR_CODES,
  SHARD_DOC_VALIDATION_ARTIFACT_REGISTRY,
  ShardDocValidationHarness,
} = require('../../tools/cli/installers/lib/core/shard-doc-validation-harness');
const {
  INDEX_DOCS_VALIDATION_ERROR_CODES,
  INDEX_DOCS_VALIDATION_ARTIFACT_REGISTRY,
  IndexDocsValidationHarness,
} = require('../../tools/cli/installers/lib/core/index-docs-validation-harness');

const suites = require('./suite-manifest');

const colors = {
  reset: '\u001B[0m',
  green: '\u001B[32m',
  red: '\u001B[31m',
  yellow: '\u001B[33m',
  cyan: '\u001B[36m',
  dim: '\u001B[2m',
};

function createAssert(counters) {
  return function assert(condition, testName, errorMessage = '') {
    if (condition) {
      console.log(`${colors.green}✓${colors.reset} ${testName}`);
      counters.passed += 1;
    } else {
      console.log(`${colors.red}✗${colors.reset} ${testName}`);
      if (errorMessage) {
        console.log(`  ${colors.dim}${errorMessage}${colors.reset}`);
      }
      counters.failed += 1;
    }
  };
}

function createContext(testDir, counters) {
  return {
    path,
    os,
    fs,
    yaml,
    csv,
    YamlXmlBuilder,
    Installer,
    ManifestGenerator,
    TaskToolCommandGenerator,
    GitHubCopilotSetup,
    HELP_ALIAS_NORMALIZATION_ERROR_CODES,
    LOCKED_EXEMPLAR_ALIAS_ROWS,
    normalizeRawIdentityToTuple,
    resolveAliasTupleFromRows,
    resolveAliasTupleUsingCanonicalAliasCsv,
    normalizeAndResolveExemplarAlias,
    HELP_SIDECAR_REQUIRED_FIELDS,
    HELP_SIDECAR_ERROR_CODES,
    SHARD_DOC_SIDECAR_REQUIRED_FIELDS,
    SHARD_DOC_SIDECAR_ERROR_CODES,
    INDEX_DOCS_SIDECAR_REQUIRED_FIELDS,
    INDEX_DOCS_SIDECAR_ERROR_CODES,
    validateHelpSidecarContractFile,
    validateShardDocSidecarContractFile,
    validateIndexDocsSidecarContractFile,
    HELP_FRONTMATTER_MISMATCH_ERROR_CODES,
    validateHelpAuthoritySplitAndPrecedence,
    SHARD_DOC_AUTHORITY_VALIDATION_ERROR_CODES,
    validateShardDocAuthoritySplitAndPrecedence,
    INDEX_DOCS_AUTHORITY_VALIDATION_ERROR_CODES,
    validateIndexDocsAuthoritySplitAndPrecedence,
    HELP_CATALOG_GENERATION_ERROR_CODES,
    EXEMPLAR_HELP_CATALOG_AUTHORITY_SOURCE_PATH,
    EXEMPLAR_HELP_CATALOG_ISSUING_COMPONENT,
    INSTALLER_HELP_CATALOG_MERGE_COMPONENT,
    buildSidecarAwareExemplarHelpRow,
    evaluateExemplarCommandLabelReportRows,
    CodexSetup,
    CODEX_EXPORT_DERIVATION_ERROR_CODES,
    EXEMPLAR_HELP_EXPORT_DERIVATION_SOURCE_TYPE,
    PROJECTION_COMPATIBILITY_ERROR_CODES,
    TASK_MANIFEST_COMPATIBILITY_PREFIX_COLUMNS,
    TASK_MANIFEST_CANONICAL_ADDITIVE_COLUMNS,
    HELP_CATALOG_COMPATIBILITY_PREFIX_COLUMNS,
    HELP_CATALOG_CANONICAL_ADDITIVE_COLUMNS,
    validateTaskManifestCompatibilitySurface,
    validateTaskManifestLoaderEntries,
    validateHelpCatalogCompatibilitySurface,
    validateHelpCatalogLoaderEntries,
    validateGithubCopilotHelpLoaderEntries,
    validateCommandDocSurfaceConsistency,
    HELP_VALIDATION_ERROR_CODES,
    HELP_VALIDATION_ARTIFACT_REGISTRY,
    HelpValidationHarness,
    SHARD_DOC_VALIDATION_ERROR_CODES,
    SHARD_DOC_VALIDATION_ARTIFACT_REGISTRY,
    ShardDocValidationHarness,
    INDEX_DOCS_VALIDATION_ERROR_CODES,
    INDEX_DOCS_VALIDATION_ARTIFACT_REGISTRY,
    IndexDocsValidationHarness,
    colors,
    assert: createAssert(counters),
    projectRoot: path.join(testDir, '..'),
    __dirname: testDir,
    expectedUnsupportedMajorDetail: 'sidecar schema major version is unsupported',
    expectedBasenameMismatchDetail: 'sidecar basename does not match sourcePath basename',
  };
}

async function runInstallationComponentTests(options = {}) {
  const testDir = options.testDir || path.join(__dirname, '..');
  const counters = { passed: 0, failed: 0 };
  const context = createContext(testDir, counters);

  console.log(`${colors.cyan}========================================`);
  console.log('Installation Component Tests');
  console.log(`========================================${colors.reset}\n`);

  for (const suite of suites) {
    // Keep ordering deterministic to preserve historical behavior and output progression.
    await suite.run(context);
  }

  console.log(`${colors.cyan}========================================`);
  console.log('Test Results:');
  console.log(`  Passed: ${colors.green}${counters.passed}${colors.reset}`);
  console.log(`  Failed: ${colors.red}${counters.failed}${colors.reset}`);
  console.log(`========================================${colors.reset}\n`);

  if (counters.failed === 0) {
    console.log(`${colors.green}✨ All installation component tests passed!${colors.reset}\n`);
    process.exit(0);
  }

  console.log(`${colors.red}❌ Some installation component tests failed${colors.reset}\n`);
  process.exit(1);
}

module.exports = {
  colors,
  runInstallationComponentTests,
};
