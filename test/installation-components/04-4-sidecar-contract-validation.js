/**
 * Installation component 4: Sidecar Contract Validation
 */
module.exports = async function runSuite(context) {
  const { path, os, fs, yaml, HELP_SIDECAR_REQUIRED_FIELDS, HELP_SIDECAR_ERROR_CODES, validateHelpSidecarContractFile, colors, assert } =
    context;

  console.log(`${colors.yellow}Test Suite 4: Sidecar Contract Validation${colors.reset}\n`);

  const validHelpSidecar = {
    schemaVersion: 1,
    canonicalId: 'bmad-help',
    artifactType: 'task',
    module: 'core',
    sourcePath: 'bmad-fork/src/core/tasks/help.md',
    displayName: 'help',
    description: 'Help command',
    dependencies: {
      requires: [],
    },
  };

  const tempSidecarRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bmad-help-sidecar-'));
  const tempSidecarPath = path.join(tempSidecarRoot, 'help.artifact.yaml');
  const deterministicSourcePath = 'bmad-fork/src/core/tasks/help.artifact.yaml';
  const expectedUnsupportedMajorDetail = 'sidecar schema major version is unsupported';
  const expectedBasenameMismatchDetail = 'sidecar basename does not match sourcePath basename';

  const writeTempSidecar = async (data) => {
    await fs.writeFile(tempSidecarPath, yaml.stringify(data), 'utf8');
  };

  const expectValidationError = async (data, expectedCode, expectedFieldPath, testLabel, expectedDetail = null) => {
    await writeTempSidecar(data);

    try {
      await validateHelpSidecarContractFile(tempSidecarPath, { errorSourcePath: deterministicSourcePath });
      assert(false, testLabel, 'Expected validation error but validation passed');
    } catch (error) {
      assert(error.code === expectedCode, `${testLabel} returns expected error code`, `Expected ${expectedCode}, got ${error.code}`);
      assert(
        error.fieldPath === expectedFieldPath,
        `${testLabel} returns expected field path`,
        `Expected ${expectedFieldPath}, got ${error.fieldPath}`,
      );
      assert(
        typeof error.message === 'string' &&
          error.message.includes(expectedCode) &&
          error.message.includes(expectedFieldPath) &&
          error.message.includes(deterministicSourcePath),
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
    await writeTempSidecar(validHelpSidecar);
    await validateHelpSidecarContractFile(tempSidecarPath, { errorSourcePath: deterministicSourcePath });
    assert(true, 'Valid sidecar contract passes');

    for (const requiredField of HELP_SIDECAR_REQUIRED_FIELDS.filter((field) => field !== 'dependencies')) {
      const invalidSidecar = structuredClone(validHelpSidecar);
      delete invalidSidecar[requiredField];
      await expectValidationError(
        invalidSidecar,
        HELP_SIDECAR_ERROR_CODES.REQUIRED_FIELD_MISSING,
        requiredField,
        `Missing required field "${requiredField}"`,
      );
    }

    await expectValidationError(
      { ...validHelpSidecar, artifactType: 'workflow' },
      HELP_SIDECAR_ERROR_CODES.ARTIFACT_TYPE_INVALID,
      'artifactType',
      'Invalid artifactType',
    );

    await expectValidationError(
      { ...validHelpSidecar, module: 'bmm' },
      HELP_SIDECAR_ERROR_CODES.MODULE_INVALID,
      'module',
      'Invalid module',
    );

    await expectValidationError(
      { ...validHelpSidecar, schemaVersion: 2 },
      HELP_SIDECAR_ERROR_CODES.MAJOR_VERSION_UNSUPPORTED,
      'schemaVersion',
      'Unsupported sidecar major schema version',
      expectedUnsupportedMajorDetail,
    );

    await expectValidationError(
      { ...validHelpSidecar, canonicalId: '   ' },
      HELP_SIDECAR_ERROR_CODES.REQUIRED_FIELD_EMPTY,
      'canonicalId',
      'Empty canonicalId',
    );

    await expectValidationError(
      { ...validHelpSidecar, sourcePath: '' },
      HELP_SIDECAR_ERROR_CODES.REQUIRED_FIELD_EMPTY,
      'sourcePath',
      'Empty sourcePath',
    );

    await expectValidationError(
      { ...validHelpSidecar, sourcePath: 'bmad-fork/src/core/tasks/not-help.md' },
      HELP_SIDECAR_ERROR_CODES.SOURCEPATH_BASENAME_MISMATCH,
      'sourcePath',
      'Source path mismatch with exemplar contract',
      expectedBasenameMismatchDetail,
    );

    const mismatchedBasenamePath = path.join(tempSidecarRoot, 'not-help.artifact.yaml');
    await fs.writeFile(mismatchedBasenamePath, yaml.stringify(validHelpSidecar), 'utf8');
    try {
      await validateHelpSidecarContractFile(mismatchedBasenamePath, {
        errorSourcePath: 'bmad-fork/src/core/tasks/not-help.artifact.yaml',
      });
      assert(false, 'Sidecar basename mismatch returns validation error', 'Expected validation error but validation passed');
    } catch (error) {
      assert(error.code === HELP_SIDECAR_ERROR_CODES.SOURCEPATH_BASENAME_MISMATCH, 'Sidecar basename mismatch returns expected error code');
      assert(
        error.fieldPath === 'sourcePath',
        'Sidecar basename mismatch returns expected field path',
        `Expected sourcePath, got ${error.fieldPath}`,
      );
      assert(
        typeof error.message === 'string' &&
          error.message.includes(HELP_SIDECAR_ERROR_CODES.SOURCEPATH_BASENAME_MISMATCH) &&
          error.message.includes('bmad-fork/src/core/tasks/not-help.artifact.yaml'),
        'Sidecar basename mismatch includes deterministic message context',
      );
      assert(
        error.detail === expectedBasenameMismatchDetail,
        'Sidecar basename mismatch returns locked detail string',
        `Expected "${expectedBasenameMismatchDetail}", got "${error.detail}"`,
      );
    }

    const missingDependencies = structuredClone(validHelpSidecar);
    delete missingDependencies.dependencies;
    await expectValidationError(
      missingDependencies,
      HELP_SIDECAR_ERROR_CODES.DEPENDENCIES_MISSING,
      'dependencies',
      'Missing dependencies block',
    );

    await expectValidationError(
      { ...validHelpSidecar, dependencies: { requires: 'skill:bmad-help' } },
      HELP_SIDECAR_ERROR_CODES.DEPENDENCIES_REQUIRES_INVALID,
      'dependencies.requires',
      'Non-array dependencies.requires',
    );

    await expectValidationError(
      { ...validHelpSidecar, dependencies: { requires: ['skill:bmad-help'] } },
      HELP_SIDECAR_ERROR_CODES.DEPENDENCIES_REQUIRES_NOT_EMPTY,
      'dependencies.requires',
      'Non-empty dependencies.requires',
    );
  } catch (error) {
    assert(false, 'Sidecar validation suite setup', error.message);
  } finally {
    await fs.remove(tempSidecarRoot);
  }

  console.log('');
};
