/**
 * Installation component 4c: Index-docs Sidecar Contract Validation
 */
module.exports = async function runSuite(context) {
  const {
    path,
    os,
    fs,
    yaml,
    INDEX_DOCS_SIDECAR_REQUIRED_FIELDS,
    INDEX_DOCS_SIDECAR_ERROR_CODES,
    validateIndexDocsSidecarContractFile,
    colors,
    assert,
    projectRoot,
  } = context;

  console.log(`${colors.yellow}Test Suite 4c: Index-docs Sidecar Contract Validation${colors.reset}\n`);

  const validIndexDocsSidecar = {
    schemaVersion: 1,
    canonicalId: 'bmad-index-docs',
    artifactType: 'task',
    module: 'core',
    sourcePath: 'bmad-fork/src/core/tasks/index-docs.xml',
    displayName: 'Index Docs',
    description:
      'Create lightweight index for quick LLM scanning. Use when LLM needs to understand available docs without loading everything.',
    dependencies: {
      requires: [],
    },
  };

  const indexDocsFixtureRoot = path.join(projectRoot, 'test', 'fixtures', 'index-docs', 'sidecar-negative');
  const indexDocsUnknownMajorFixturePath = path.join(indexDocsFixtureRoot, 'unknown-major-version', 'index-docs.artifact.yaml');
  const indexDocsBasenameMismatchFixturePath = path.join(indexDocsFixtureRoot, 'basename-path-mismatch', 'index-docs.artifact.yaml');

  const tempIndexDocsRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bmad-index-docs-sidecar-'));
  const tempIndexDocsSidecarPath = path.join(tempIndexDocsRoot, 'index-docs.artifact.yaml');
  const deterministicIndexDocsSourcePath = 'bmad-fork/src/core/tasks/index-docs.artifact.yaml';

  const writeTempIndexDocsSidecar = async (data) => {
    await fs.writeFile(tempIndexDocsSidecarPath, yaml.stringify(data), 'utf8');
  };

  const expectIndexDocsValidationError = async (data, expectedCode, expectedFieldPath, testLabel, expectedDetail = null) => {
    await writeTempIndexDocsSidecar(data);

    try {
      await validateIndexDocsSidecarContractFile(tempIndexDocsSidecarPath, { errorSourcePath: deterministicIndexDocsSourcePath });
      assert(false, testLabel, 'Expected validation error but validation passed');
    } catch (error) {
      assert(error.code === expectedCode, `${testLabel} returns expected error code`, `Expected ${expectedCode}, got ${error.code}`);
      assert(
        error.fieldPath === expectedFieldPath,
        `${testLabel} returns expected field path`,
        `Expected ${expectedFieldPath}, got ${error.fieldPath}`,
      );
      assert(
        error.sourcePath === deterministicIndexDocsSourcePath,
        `${testLabel} returns expected source path`,
        `Expected ${deterministicIndexDocsSourcePath}, got ${error.sourcePath}`,
      );
      assert(
        typeof error.message === 'string' &&
          error.message.includes(expectedCode) &&
          error.message.includes(expectedFieldPath) &&
          error.message.includes(deterministicIndexDocsSourcePath),
        `${testLabel} includes deterministic message context`,
      );
      if (expectedDetail !== null) {
        assert(
          error.detail === expectedDetail,
          `${testLabel} returns locked detail string`,
          `Expected "${expectedDetail}", got "${error.detail}"`,
        );
      }
    }
  };

  try {
    await writeTempIndexDocsSidecar(validIndexDocsSidecar);
    await validateIndexDocsSidecarContractFile(tempIndexDocsSidecarPath, { errorSourcePath: deterministicIndexDocsSourcePath });
    assert(true, 'Valid index-docs sidecar contract passes');

    for (const requiredField of INDEX_DOCS_SIDECAR_REQUIRED_FIELDS.filter((field) => field !== 'dependencies')) {
      const invalidSidecar = structuredClone(validIndexDocsSidecar);
      delete invalidSidecar[requiredField];
      await expectIndexDocsValidationError(
        invalidSidecar,
        INDEX_DOCS_SIDECAR_ERROR_CODES.REQUIRED_FIELD_MISSING,
        requiredField,
        `Index-docs missing required field "${requiredField}"`,
      );
    }

    const unknownMajorFixture = yaml.parse(await fs.readFile(indexDocsUnknownMajorFixturePath, 'utf8'));
    await expectIndexDocsValidationError(
      unknownMajorFixture,
      INDEX_DOCS_SIDECAR_ERROR_CODES.MAJOR_VERSION_UNSUPPORTED,
      'schemaVersion',
      'Index-docs unsupported sidecar major schema version',
      'sidecar schema major version is unsupported',
    );

    const basenameMismatchFixture = yaml.parse(await fs.readFile(indexDocsBasenameMismatchFixturePath, 'utf8'));
    await expectIndexDocsValidationError(
      basenameMismatchFixture,
      INDEX_DOCS_SIDECAR_ERROR_CODES.SOURCEPATH_BASENAME_MISMATCH,
      'sourcePath',
      'Index-docs sourcePath mismatch',
      'sidecar basename does not match sourcePath basename',
    );

    const mismatchedIndexDocsBasenamePath = path.join(tempIndexDocsRoot, 'not-index-docs.artifact.yaml');
    await fs.writeFile(mismatchedIndexDocsBasenamePath, yaml.stringify(validIndexDocsSidecar), 'utf8');
    try {
      await validateIndexDocsSidecarContractFile(mismatchedIndexDocsBasenamePath, {
        errorSourcePath: 'bmad-fork/src/core/tasks/not-index-docs.artifact.yaml',
      });
      assert(false, 'Index-docs basename mismatch returns validation error', 'Expected validation error but validation passed');
    } catch (error) {
      assert(
        error.code === INDEX_DOCS_SIDECAR_ERROR_CODES.SOURCEPATH_BASENAME_MISMATCH,
        'Index-docs basename mismatch returns expected error code',
      );
      assert(
        error.fieldPath === 'sourcePath',
        'Index-docs basename mismatch returns expected field path',
        `Expected sourcePath, got ${error.fieldPath}`,
      );
      assert(
        typeof error.message === 'string' &&
          error.message.includes(INDEX_DOCS_SIDECAR_ERROR_CODES.SOURCEPATH_BASENAME_MISMATCH) &&
          error.message.includes('bmad-fork/src/core/tasks/not-index-docs.artifact.yaml'),
        'Index-docs basename mismatch includes deterministic message context',
      );
    }

    await expectIndexDocsValidationError(
      { ...validIndexDocsSidecar, artifactType: 'workflow' },
      INDEX_DOCS_SIDECAR_ERROR_CODES.ARTIFACT_TYPE_INVALID,
      'artifactType',
      'Index-docs invalid artifactType',
    );

    await expectIndexDocsValidationError(
      { ...validIndexDocsSidecar, module: 'bmm' },
      INDEX_DOCS_SIDECAR_ERROR_CODES.MODULE_INVALID,
      'module',
      'Index-docs invalid module',
    );

    await expectIndexDocsValidationError(
      { ...validIndexDocsSidecar, canonicalId: '   ' },
      INDEX_DOCS_SIDECAR_ERROR_CODES.REQUIRED_FIELD_EMPTY,
      'canonicalId',
      'Index-docs empty canonicalId',
    );

    await expectIndexDocsValidationError(
      { ...validIndexDocsSidecar, sourcePath: '' },
      INDEX_DOCS_SIDECAR_ERROR_CODES.REQUIRED_FIELD_EMPTY,
      'sourcePath',
      'Index-docs empty sourcePath',
    );

    await expectIndexDocsValidationError(
      { ...validIndexDocsSidecar, description: '' },
      INDEX_DOCS_SIDECAR_ERROR_CODES.REQUIRED_FIELD_EMPTY,
      'description',
      'Index-docs empty description',
    );

    await expectIndexDocsValidationError(
      { ...validIndexDocsSidecar, displayName: '' },
      INDEX_DOCS_SIDECAR_ERROR_CODES.REQUIRED_FIELD_EMPTY,
      'displayName',
      'Index-docs empty displayName',
    );

    const missingIndexDocsDependencies = structuredClone(validIndexDocsSidecar);
    delete missingIndexDocsDependencies.dependencies;
    await expectIndexDocsValidationError(
      missingIndexDocsDependencies,
      INDEX_DOCS_SIDECAR_ERROR_CODES.DEPENDENCIES_MISSING,
      'dependencies',
      'Index-docs missing dependencies block',
    );

    await expectIndexDocsValidationError(
      { ...validIndexDocsSidecar, dependencies: { requires: 'skill:bmad-help' } },
      INDEX_DOCS_SIDECAR_ERROR_CODES.DEPENDENCIES_REQUIRES_INVALID,
      'dependencies.requires',
      'Index-docs non-array dependencies.requires',
    );

    await expectIndexDocsValidationError(
      { ...validIndexDocsSidecar, dependencies: { requires: ['skill:bmad-help'] } },
      INDEX_DOCS_SIDECAR_ERROR_CODES.DEPENDENCIES_REQUIRES_NOT_EMPTY,
      'dependencies.requires',
      'Index-docs non-empty dependencies.requires',
    );
  } catch (error) {
    assert(false, 'Index-docs sidecar validation suite setup', error.message);
  } finally {
    await fs.remove(tempIndexDocsRoot);
  }

  console.log('');
};
