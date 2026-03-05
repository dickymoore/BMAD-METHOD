/**
 * Installation component 7: Canonical Alias Normalization Core
 */
module.exports = async function runSuite(context) {
  const {
    path,
    os,
    fs,
    yaml,
    ManifestGenerator,
    HELP_ALIAS_NORMALIZATION_ERROR_CODES,
    LOCKED_EXEMPLAR_ALIAS_ROWS,
    normalizeRawIdentityToTuple,
    resolveAliasTupleFromRows,
    resolveAliasTupleUsingCanonicalAliasCsv,
    normalizeAndResolveExemplarAlias,
    validateHelpAuthoritySplitAndPrecedence,
    colors,
    assert,
  } = context;

  console.log(`${colors.yellow}Test Suite 7: Canonical Alias Normalization Core${colors.reset}\n`);

  const deterministicAliasTableSourcePath = '_bmad/_config/canonical-aliases.csv';

  const expectAliasNormalizationError = async (
    operation,
    expectedCode,
    expectedFieldPath,
    expectedObservedValue,
    testLabel,
    expectedDetail = null,
  ) => {
    try {
      await Promise.resolve(operation());
      assert(false, testLabel, 'Expected alias normalization error but operation succeeded');
    } catch (error) {
      assert(error.code === expectedCode, `${testLabel} returns expected error code`, `Expected ${expectedCode}, got ${error.code}`);
      assert(
        error.fieldPath === expectedFieldPath,
        `${testLabel} returns expected field path`,
        `Expected ${expectedFieldPath}, got ${error.fieldPath}`,
      );
      assert(
        error.sourcePath === deterministicAliasTableSourcePath,
        `${testLabel} returns expected source path`,
        `Expected ${deterministicAliasTableSourcePath}, got ${error.sourcePath}`,
      );
      assert(
        error.observedValue === expectedObservedValue,
        `${testLabel} returns normalized offending value context`,
        `Expected "${expectedObservedValue}", got "${error.observedValue}"`,
      );
      assert(
        typeof error.message === 'string' &&
          error.message.includes(expectedCode) &&
          error.message.includes(expectedFieldPath) &&
          error.message.includes(deterministicAliasTableSourcePath),
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
    const canonicalTuple = normalizeRawIdentityToTuple('   BMAD-HELP   ', {
      fieldPath: 'canonicalId',
      sourcePath: deterministicAliasTableSourcePath,
    });

    assert(canonicalTuple.rawIdentityHasLeadingSlash === false, 'Canonical tuple sets rawIdentityHasLeadingSlash=false');
    assert(canonicalTuple.preAliasNormalizedValue === 'bmad-help', 'Canonical tuple computes preAliasNormalizedValue=bmad-help');
    assert(canonicalTuple.normalizedRawIdentity === 'bmad-help', 'Canonical tuple computes normalizedRawIdentity');

    const canonicalResolution = resolveAliasTupleFromRows(canonicalTuple, LOCKED_EXEMPLAR_ALIAS_ROWS, {
      sourcePath: deterministicAliasTableSourcePath,
    });
    assert(
      canonicalResolution.aliasRowLocator === 'alias-row:bmad-help:canonical-id',
      'Canonical tuple resolves to locked canonical-id row locator',
    );
    assert(canonicalResolution.postAliasCanonicalId === 'bmad-help', 'Canonical tuple resolves to locked canonicalId');

    const legacyResolution = await normalizeAndResolveExemplarAlias('   HELP   ', {
      fieldPath: 'canonicalId',
      sourcePath: deterministicAliasTableSourcePath,
    });
    assert(legacyResolution.rawIdentityHasLeadingSlash === false, 'Legacy tuple sets rawIdentityHasLeadingSlash=false');
    assert(legacyResolution.preAliasNormalizedValue === 'help', 'Legacy tuple computes preAliasNormalizedValue=help');
    assert(
      legacyResolution.aliasRowLocator === 'alias-row:bmad-help:legacy-name',
      'Legacy tuple resolves to locked legacy-name row locator',
    );
    assert(legacyResolution.postAliasCanonicalId === 'bmad-help', 'Legacy tuple resolves to locked canonicalId');

    const slashResolution = await normalizeAndResolveExemplarAlias('  /BMAD-HELP  ', {
      fieldPath: 'canonicalId',
      sourcePath: deterministicAliasTableSourcePath,
    });
    assert(slashResolution.rawIdentityHasLeadingSlash === true, 'Slash tuple sets rawIdentityHasLeadingSlash=true');
    assert(slashResolution.preAliasNormalizedValue === 'bmad-help', 'Slash tuple computes preAliasNormalizedValue=bmad-help');
    assert(
      slashResolution.aliasRowLocator === 'alias-row:bmad-help:slash-command',
      'Slash tuple resolves to locked slash-command row locator',
    );
    assert(slashResolution.postAliasCanonicalId === 'bmad-help', 'Slash tuple resolves to locked canonicalId');

    const tempAliasAuthorityRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bmad-alias-authority-'));
    const tempAliasSidecarPath = path.join(tempAliasAuthorityRoot, 'help.artifact.yaml');
    const tempAliasSourcePath = path.join(tempAliasAuthorityRoot, 'help-source.md');
    const tempAliasRuntimePath = path.join(tempAliasAuthorityRoot, 'help-runtime.md');
    const tempAliasConfigDir = path.join(tempAliasAuthorityRoot, '_config');
    const tempAuthorityAliasTablePath = path.join(tempAliasConfigDir, 'canonical-aliases.csv');
    const aliasAuthorityPaths = {
      sidecar: 'bmad-fork/src/core/tasks/help.artifact.yaml',
      source: 'bmad-fork/src/core/tasks/help.md',
      runtime: '_bmad/core/tasks/help.md',
    };

    const aliasFrontmatter = {
      name: 'help',
      description: 'Help command',
      canonicalId: 'help',
      dependencies: {
        requires: [],
      },
    };

    try {
      await fs.writeFile(
        tempAliasSidecarPath,
        yaml.stringify({
          schemaVersion: 1,
          canonicalId: 'help',
          artifactType: 'task',
          module: 'core',
          sourcePath: aliasAuthorityPaths.source,
          displayName: 'help',
          description: 'Help command',
          dependencies: {
            requires: [],
          },
        }),
        'utf8',
      );
      await fs.writeFile(tempAliasSourcePath, `---\n${yaml.stringify(aliasFrontmatter).trimEnd()}\n---\n\n# Help\n`, 'utf8');
      await fs.writeFile(tempAliasRuntimePath, `---\n${yaml.stringify(aliasFrontmatter).trimEnd()}\n---\n\n# Help\n`, 'utf8');

      const aliasAuthorityValidation = await validateHelpAuthoritySplitAndPrecedence({
        sidecarPath: tempAliasSidecarPath,
        sourceMarkdownPath: tempAliasSourcePath,
        runtimeMarkdownPath: tempAliasRuntimePath,
        sidecarSourcePath: aliasAuthorityPaths.sidecar,
        sourceMarkdownSourcePath: aliasAuthorityPaths.source,
        runtimeMarkdownSourcePath: aliasAuthorityPaths.runtime,
      });

      assert(
        aliasAuthorityValidation.canonicalId === 'bmad-help',
        'Authority validation normalizes legacy canonical identity to locked canonicalId',
      );
      assert(
        aliasAuthorityValidation.authoritativePresenceKey === 'capability:bmad-help',
        'Authority validation emits canonical presence key after alias resolution',
      );

      await fs.ensureDir(tempAliasConfigDir);
      await fs.writeFile(
        tempAuthorityAliasTablePath,
        [
          'rowIdentity,canonicalId,normalizedAliasValue,rawIdentityHasLeadingSlash',
          'alias-row:bmad-help:legacy-name,bmad-help-csv,help,false',
        ].join('\n') + '\n',
        'utf8',
      );
      const csvBackedAuthorityValidation = await validateHelpAuthoritySplitAndPrecedence({
        sidecarPath: tempAliasSidecarPath,
        sourceMarkdownPath: tempAliasSourcePath,
        runtimeMarkdownPath: tempAliasRuntimePath,
        sidecarSourcePath: aliasAuthorityPaths.sidecar,
        sourceMarkdownSourcePath: aliasAuthorityPaths.source,
        runtimeMarkdownSourcePath: aliasAuthorityPaths.runtime,
        bmadDir: tempAliasAuthorityRoot,
      });
      assert(
        csvBackedAuthorityValidation.canonicalId === 'bmad-help-csv',
        'Authority validation prefers canonical alias CSV when available',
      );
      assert(
        csvBackedAuthorityValidation.authoritativePresenceKey === 'capability:bmad-help-csv',
        'Authority validation derives presence key from CSV-resolved canonical identity',
      );
    } finally {
      await fs.remove(tempAliasAuthorityRoot);
    }

    const collapsedWhitespaceTuple = normalizeRawIdentityToTuple('  bmad\t\thelp  ', {
      fieldPath: 'canonicalId',
      sourcePath: deterministicAliasTableSourcePath,
    });
    assert(
      collapsedWhitespaceTuple.preAliasNormalizedValue === 'bmad help',
      'Tuple normalization collapses internal whitespace runs deterministically',
    );

    await expectAliasNormalizationError(
      () =>
        normalizeRawIdentityToTuple(' \n\t ', {
          fieldPath: 'canonicalId',
          sourcePath: deterministicAliasTableSourcePath,
        }),
      HELP_ALIAS_NORMALIZATION_ERROR_CODES.EMPTY_INPUT,
      'canonicalId',
      '',
      'Empty alias input',
      'alias identity is empty after normalization',
    );

    await expectAliasNormalizationError(
      () =>
        normalizeRawIdentityToTuple('//bmad-help', {
          fieldPath: 'canonicalId',
          sourcePath: deterministicAliasTableSourcePath,
        }),
      HELP_ALIAS_NORMALIZATION_ERROR_CODES.MULTIPLE_LEADING_SLASHES,
      'canonicalId',
      '//bmad-help',
      'Alias input with multiple leading slashes',
      'alias identity contains multiple leading slashes',
    );

    await expectAliasNormalizationError(
      () =>
        normalizeRawIdentityToTuple('/   ', {
          fieldPath: 'canonicalId',
          sourcePath: deterministicAliasTableSourcePath,
        }),
      HELP_ALIAS_NORMALIZATION_ERROR_CODES.EMPTY_PREALIAS,
      'preAliasNormalizedValue',
      '/',
      'Alias input with empty pre-alias value',
      'alias preAliasNormalizedValue is empty after slash normalization',
    );

    await expectAliasNormalizationError(
      () =>
        normalizeAndResolveExemplarAlias('not-a-locked-alias', {
          fieldPath: 'canonicalId',
          sourcePath: deterministicAliasTableSourcePath,
        }),
      HELP_ALIAS_NORMALIZATION_ERROR_CODES.UNRESOLVED,
      'preAliasNormalizedValue',
      'not-a-locked-alias|leadingSlash:false',
      'Unresolved alias tuple',
      'alias tuple did not resolve to any canonical alias row',
    );

    const ambiguousAliasRows = [
      {
        rowIdentity: 'alias-row:a',
        canonicalId: 'bmad-help',
        normalizedAliasValue: 'help',
        rawIdentityHasLeadingSlash: false,
      },
      {
        rowIdentity: 'alias-row:b',
        canonicalId: 'legacy-help',
        normalizedAliasValue: 'help',
        rawIdentityHasLeadingSlash: false,
      },
    ];
    const ambiguousTuple = normalizeRawIdentityToTuple('help', {
      fieldPath: 'canonicalId',
      sourcePath: deterministicAliasTableSourcePath,
    });
    await expectAliasNormalizationError(
      () =>
        resolveAliasTupleFromRows(ambiguousTuple, ambiguousAliasRows, {
          sourcePath: deterministicAliasTableSourcePath,
        }),
      HELP_ALIAS_NORMALIZATION_ERROR_CODES.UNRESOLVED,
      'preAliasNormalizedValue',
      'help|leadingSlash:false',
      'Ambiguous alias tuple resolution',
      'alias tuple resolved ambiguously to multiple canonical alias rows',
    );

    const shardDocAliasRows = [
      {
        rowIdentity: 'alias-row:bmad-shard-doc:canonical-id',
        canonicalId: 'bmad-shard-doc',
        normalizedAliasValue: 'bmad-shard-doc',
        rawIdentityHasLeadingSlash: false,
      },
      {
        rowIdentity: 'alias-row:bmad-shard-doc:legacy-name',
        canonicalId: 'bmad-shard-doc',
        normalizedAliasValue: 'shard-doc',
        rawIdentityHasLeadingSlash: false,
      },
      {
        rowIdentity: 'alias-row:bmad-shard-doc:slash-command',
        canonicalId: 'bmad-shard-doc',
        normalizedAliasValue: 'bmad-shard-doc',
        rawIdentityHasLeadingSlash: true,
      },
    ];

    const shardDocSlashResolution = await normalizeAndResolveExemplarAlias('/bmad-shard-doc', {
      fieldPath: 'canonicalId',
      sourcePath: deterministicAliasTableSourcePath,
      aliasRows: shardDocAliasRows,
      aliasTableSourcePath: deterministicAliasTableSourcePath,
    });
    assert(
      shardDocSlashResolution.postAliasCanonicalId === 'bmad-shard-doc' &&
        shardDocSlashResolution.aliasRowLocator === 'alias-row:bmad-shard-doc:slash-command',
      'Alias resolver normalizes shard-doc slash-command tuple with explicit shard-doc alias rows',
    );

    await expectAliasNormalizationError(
      () =>
        normalizeAndResolveExemplarAlias('/bmad-shard-doc', {
          fieldPath: 'canonicalId',
          sourcePath: deterministicAliasTableSourcePath,
          aliasRows: LOCKED_EXEMPLAR_ALIAS_ROWS,
          aliasTableSourcePath: deterministicAliasTableSourcePath,
        }),
      HELP_ALIAS_NORMALIZATION_ERROR_CODES.UNRESOLVED,
      'preAliasNormalizedValue',
      'bmad-shard-doc|leadingSlash:true',
      'Shard-doc alias tuple unresolved without shard-doc alias table rows',
      'alias tuple did not resolve to any canonical alias row',
    );

    const ambiguousShardDocRows = [
      ...shardDocAliasRows,
      {
        rowIdentity: 'alias-row:bmad-shard-doc:slash-command:duplicate',
        canonicalId: 'bmad-shard-doc-alt',
        normalizedAliasValue: 'bmad-shard-doc',
        rawIdentityHasLeadingSlash: true,
      },
    ];
    await expectAliasNormalizationError(
      () =>
        normalizeAndResolveExemplarAlias('/bmad-shard-doc', {
          fieldPath: 'canonicalId',
          sourcePath: deterministicAliasTableSourcePath,
          aliasRows: ambiguousShardDocRows,
          aliasTableSourcePath: deterministicAliasTableSourcePath,
        }),
      HELP_ALIAS_NORMALIZATION_ERROR_CODES.UNRESOLVED,
      'preAliasNormalizedValue',
      'bmad-shard-doc|leadingSlash:true',
      'Shard-doc alias tuple ambiguous when duplicate shard-doc slash-command rows exist',
      'alias tuple resolved ambiguously to multiple canonical alias rows',
    );

    const tempAliasTableRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bmad-canonical-alias-table-'));
    const tempAliasTablePath = path.join(tempAliasTableRoot, 'canonical-aliases.csv');
    const csvRows = [
      'rowIdentity,canonicalId,normalizedAliasValue,rawIdentityHasLeadingSlash',
      'alias-row:bmad-help:canonical-id,bmad-help,bmad-help,false',
      'alias-row:bmad-help:legacy-name,bmad-help,help,false',
      'alias-row:bmad-help:slash-command,bmad-help,bmad-help,true',
    ];
    try {
      await fs.writeFile(tempAliasTablePath, `${csvRows.join('\n')}\n`, 'utf8');
      const csvTuple = normalizeRawIdentityToTuple('/bmad-help', {
        fieldPath: 'canonicalId',
        sourcePath: deterministicAliasTableSourcePath,
      });
      const csvResolution = await resolveAliasTupleUsingCanonicalAliasCsv(csvTuple, tempAliasTablePath, {
        sourcePath: deterministicAliasTableSourcePath,
      });
      assert(
        csvResolution.aliasRowLocator === 'alias-row:bmad-help:slash-command',
        'CSV-backed tuple resolution maps slash-command alias row locator',
      );
      assert(csvResolution.postAliasCanonicalId === 'bmad-help', 'CSV-backed tuple resolution maps canonicalId');

      const manifestGenerator = new ManifestGenerator();
      const normalizedHelpAuthorityRecords = await manifestGenerator.normalizeHelpAuthorityRecords([
        {
          recordType: 'metadata-authority',
          canonicalId: 'help',
          authoritativePresenceKey: 'capability:legacy-help',
          authoritySourceType: 'sidecar',
          authoritySourcePath: aliasAuthorityPaths.sidecar,
          sourcePath: aliasAuthorityPaths.source,
        },
      ]);
      assert(
        normalizedHelpAuthorityRecords.length === 1 && normalizedHelpAuthorityRecords[0].canonicalId === 'bmad-help',
        'Manifest generator normalizes legacy canonical identities using alias tuple resolution',
      );
      assert(
        normalizedHelpAuthorityRecords.length === 1 &&
          normalizedHelpAuthorityRecords[0].authoritativePresenceKey === 'capability:bmad-help',
        'Manifest generator canonicalizes authoritative presence key from normalized canonicalId',
      );

      await expectAliasNormalizationError(
        () =>
          manifestGenerator.normalizeHelpAuthorityRecords([
            {
              recordType: 'metadata-authority',
              canonicalId: 'not-a-locked-alias',
              authoritativePresenceKey: 'capability:not-a-locked-alias',
              authoritySourceType: 'sidecar',
              authoritySourcePath: aliasAuthorityPaths.sidecar,
              sourcePath: aliasAuthorityPaths.source,
            },
          ]),
        HELP_ALIAS_NORMALIZATION_ERROR_CODES.UNRESOLVED,
        'preAliasNormalizedValue',
        'not-a-locked-alias|leadingSlash:false',
        'Manifest generator fails unresolved canonical identity normalization',
        'alias tuple did not resolve to any canonical alias row',
      );

      await expectAliasNormalizationError(
        () =>
          resolveAliasTupleUsingCanonicalAliasCsv(csvTuple, path.join(tempAliasTableRoot, 'missing.csv'), {
            sourcePath: deterministicAliasTableSourcePath,
          }),
        HELP_ALIAS_NORMALIZATION_ERROR_CODES.UNRESOLVED,
        'aliasTablePath',
        path.join(tempAliasTableRoot, 'missing.csv'),
        'CSV-backed alias resolution with missing table file',
        'canonical alias table file was not found',
      );
    } finally {
      await fs.remove(tempAliasTableRoot);
    }
  } catch (error) {
    assert(false, 'Canonical alias normalization suite setup', error.message);
  }

  console.log('');
};
