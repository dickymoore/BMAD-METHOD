/**
 * Installation component 4b: Shard-doc Sidecar Contract Validation
 */
module.exports = async function runSuite(context) {
  const {
    path,
    os,
    fs,
    yaml,
    SHARD_DOC_SIDECAR_REQUIRED_FIELDS,
    SHARD_DOC_SIDECAR_ERROR_CODES,
    validateShardDocSidecarContractFile,
    colors,
    assert,
    projectRoot,
  } = context;

  console.log(`${colors.yellow}Test Suite 4b: Shard-doc Sidecar Contract Validation${colors.reset}\n`);

  const validShardDocSidecar = {
    schemaVersion: 1,
    canonicalId: 'bmad-shard-doc',
    artifactType: 'task',
    module: 'core',
    sourcePath: 'bmad-fork/src/core/tasks/shard-doc.xml',
    displayName: 'Shard Document',
    description: 'Split large markdown documents into smaller files by section with an index.',
    dependencies: {
      requires: [],
    },
  };

  const shardDocFixtureRoot = path.join(projectRoot, 'test', 'fixtures', 'shard-doc', 'sidecar-negative');
  const unknownMajorFixturePath = path.join(shardDocFixtureRoot, 'unknown-major-version', 'shard-doc.artifact.yaml');
  const basenameMismatchFixturePath = path.join(shardDocFixtureRoot, 'basename-path-mismatch', 'shard-doc.artifact.yaml');

  const tempShardDocRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bmad-shard-doc-sidecar-'));
  const tempShardDocSidecarPath = path.join(tempShardDocRoot, 'shard-doc.artifact.yaml');
  const deterministicShardDocSourcePath = 'bmad-fork/src/core/tasks/shard-doc.artifact.yaml';

  const writeTempShardDocSidecar = async (data) => {
    await fs.writeFile(tempShardDocSidecarPath, yaml.stringify(data), 'utf8');
  };

  const expectShardDocValidationError = async (data, expectedCode, expectedFieldPath, testLabel, expectedDetail = null) => {
    await writeTempShardDocSidecar(data);

    try {
      await validateShardDocSidecarContractFile(tempShardDocSidecarPath, { errorSourcePath: deterministicShardDocSourcePath });
      assert(false, testLabel, 'Expected validation error but validation passed');
    } catch (error) {
      assert(error.code === expectedCode, `${testLabel} returns expected error code`, `Expected ${expectedCode}, got ${error.code}`);
      assert(
        error.fieldPath === expectedFieldPath,
        `${testLabel} returns expected field path`,
        `Expected ${expectedFieldPath}, got ${error.fieldPath}`,
      );
      assert(
        error.sourcePath === deterministicShardDocSourcePath,
        `${testLabel} returns expected source path`,
        `Expected ${deterministicShardDocSourcePath}, got ${error.sourcePath}`,
      );
      assert(
        typeof error.message === 'string' &&
          error.message.includes(expectedCode) &&
          error.message.includes(expectedFieldPath) &&
          error.message.includes(deterministicShardDocSourcePath),
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
    await writeTempShardDocSidecar(validShardDocSidecar);
    await validateShardDocSidecarContractFile(tempShardDocSidecarPath, { errorSourcePath: deterministicShardDocSourcePath });
    assert(true, 'Valid shard-doc sidecar contract passes');

    for (const requiredField of SHARD_DOC_SIDECAR_REQUIRED_FIELDS.filter((field) => field !== 'dependencies')) {
      const invalidSidecar = structuredClone(validShardDocSidecar);
      delete invalidSidecar[requiredField];
      await expectShardDocValidationError(
        invalidSidecar,
        SHARD_DOC_SIDECAR_ERROR_CODES.REQUIRED_FIELD_MISSING,
        requiredField,
        `Shard-doc missing required field "${requiredField}"`,
      );
    }

    const unknownMajorFixture = yaml.parse(await fs.readFile(unknownMajorFixturePath, 'utf8'));
    await expectShardDocValidationError(
      unknownMajorFixture,
      SHARD_DOC_SIDECAR_ERROR_CODES.MAJOR_VERSION_UNSUPPORTED,
      'schemaVersion',
      'Shard-doc unsupported sidecar major schema version',
      'sidecar schema major version is unsupported',
    );

    const basenameMismatchFixture = yaml.parse(await fs.readFile(basenameMismatchFixturePath, 'utf8'));
    await expectShardDocValidationError(
      basenameMismatchFixture,
      SHARD_DOC_SIDECAR_ERROR_CODES.SOURCEPATH_BASENAME_MISMATCH,
      'sourcePath',
      'Shard-doc sourcePath mismatch',
      'sidecar basename does not match sourcePath basename',
    );

    const mismatchedShardDocBasenamePath = path.join(tempShardDocRoot, 'not-shard-doc.artifact.yaml');
    await fs.writeFile(mismatchedShardDocBasenamePath, yaml.stringify(validShardDocSidecar), 'utf8');
    try {
      await validateShardDocSidecarContractFile(mismatchedShardDocBasenamePath, {
        errorSourcePath: 'bmad-fork/src/core/tasks/not-shard-doc.artifact.yaml',
      });
      assert(false, 'Shard-doc basename mismatch returns validation error', 'Expected validation error but validation passed');
    } catch (error) {
      assert(
        error.code === SHARD_DOC_SIDECAR_ERROR_CODES.SOURCEPATH_BASENAME_MISMATCH,
        'Shard-doc basename mismatch returns expected error code',
      );
      assert(
        error.fieldPath === 'sourcePath',
        'Shard-doc basename mismatch returns expected field path',
        `Expected sourcePath, got ${error.fieldPath}`,
      );
      assert(
        typeof error.message === 'string' &&
          error.message.includes(SHARD_DOC_SIDECAR_ERROR_CODES.SOURCEPATH_BASENAME_MISMATCH) &&
          error.message.includes('bmad-fork/src/core/tasks/not-shard-doc.artifact.yaml'),
        'Shard-doc basename mismatch includes deterministic message context',
      );
    }

    await expectShardDocValidationError(
      { ...validShardDocSidecar, artifactType: 'workflow' },
      SHARD_DOC_SIDECAR_ERROR_CODES.ARTIFACT_TYPE_INVALID,
      'artifactType',
      'Shard-doc invalid artifactType',
    );

    await expectShardDocValidationError(
      { ...validShardDocSidecar, module: 'bmm' },
      SHARD_DOC_SIDECAR_ERROR_CODES.MODULE_INVALID,
      'module',
      'Shard-doc invalid module',
    );

    await expectShardDocValidationError(
      { ...validShardDocSidecar, canonicalId: '   ' },
      SHARD_DOC_SIDECAR_ERROR_CODES.REQUIRED_FIELD_EMPTY,
      'canonicalId',
      'Shard-doc empty canonicalId',
    );

    await expectShardDocValidationError(
      { ...validShardDocSidecar, sourcePath: '' },
      SHARD_DOC_SIDECAR_ERROR_CODES.REQUIRED_FIELD_EMPTY,
      'sourcePath',
      'Shard-doc empty sourcePath',
    );

    await expectShardDocValidationError(
      { ...validShardDocSidecar, description: '' },
      SHARD_DOC_SIDECAR_ERROR_CODES.REQUIRED_FIELD_EMPTY,
      'description',
      'Shard-doc empty description',
    );

    await expectShardDocValidationError(
      { ...validShardDocSidecar, displayName: '' },
      SHARD_DOC_SIDECAR_ERROR_CODES.REQUIRED_FIELD_EMPTY,
      'displayName',
      'Shard-doc empty displayName',
    );

    const missingShardDocDependencies = structuredClone(validShardDocSidecar);
    delete missingShardDocDependencies.dependencies;
    await expectShardDocValidationError(
      missingShardDocDependencies,
      SHARD_DOC_SIDECAR_ERROR_CODES.DEPENDENCIES_MISSING,
      'dependencies',
      'Shard-doc missing dependencies block',
    );

    await expectShardDocValidationError(
      { ...validShardDocSidecar, dependencies: { requires: 'skill:bmad-help' } },
      SHARD_DOC_SIDECAR_ERROR_CODES.DEPENDENCIES_REQUIRES_INVALID,
      'dependencies.requires',
      'Shard-doc non-array dependencies.requires',
    );

    await expectShardDocValidationError(
      { ...validShardDocSidecar, dependencies: { requires: ['skill:bmad-help'] } },
      SHARD_DOC_SIDECAR_ERROR_CODES.DEPENDENCIES_REQUIRES_NOT_EMPTY,
      'dependencies.requires',
      'Shard-doc non-empty dependencies.requires',
    );
  } catch (error) {
    assert(false, 'Shard-doc sidecar validation suite setup', error.message);
  } finally {
    await fs.remove(tempShardDocRoot);
  }

  console.log('');
};
