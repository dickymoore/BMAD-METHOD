/**
 * Installation component 9: Canonical Alias Table Projection
 */
module.exports = async function runSuite(context) {
  const { path, os, fs, csv, ManifestGenerator, colors, assert } = context;

  console.log(`${colors.yellow}Test Suite 9: Canonical Alias Table Projection${colors.reset}\n`);

  const tempCanonicalAliasRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bmad-canonical-alias-projection-'));
  try {
    const manifestGenerator = new ManifestGenerator();
    manifestGenerator.bmadDir = tempCanonicalAliasRoot;
    manifestGenerator.bmadFolderName = '_bmad';
    manifestGenerator.helpAuthorityRecords = [
      {
        recordType: 'metadata-authority',
        canonicalId: 'bmad-help',
        authoritativePresenceKey: 'capability:bmad-help',
        authoritySourceType: 'sidecar',
        authoritySourcePath: 'bmad-fork/src/core/tasks/help.artifact.yaml',
        sourcePath: 'bmad-fork/src/core/tasks/help.md',
      },
    ];
    manifestGenerator.taskAuthorityRecords = [
      ...manifestGenerator.helpAuthorityRecords,
      {
        recordType: 'metadata-authority',
        canonicalId: 'bmad-shard-doc',
        authoritativePresenceKey: 'capability:bmad-shard-doc',
        authoritySourceType: 'sidecar',
        authoritySourcePath: 'bmad-fork/src/core/tasks/shard-doc.artifact.yaml',
        sourcePath: 'bmad-fork/src/core/tasks/shard-doc.xml',
      },
      {
        recordType: 'metadata-authority',
        canonicalId: 'bmad-index-docs',
        authoritativePresenceKey: 'capability:bmad-index-docs',
        authoritySourceType: 'sidecar',
        authoritySourcePath: 'bmad-fork/src/core/tasks/index-docs.artifact.yaml',
        sourcePath: 'bmad-fork/src/core/tasks/index-docs.xml',
      },
    ];

    const tempCanonicalAliasConfigDir = path.join(tempCanonicalAliasRoot, '_config');
    await fs.ensureDir(tempCanonicalAliasConfigDir);
    const canonicalAliasPath = await manifestGenerator.writeCanonicalAliasManifest(tempCanonicalAliasConfigDir);

    const canonicalAliasRaw = await fs.readFile(canonicalAliasPath, 'utf8');
    const canonicalAliasLines = canonicalAliasRaw.trim().split('\n');
    const expectedCanonicalAliasHeader =
      'canonicalId,alias,aliasType,authoritySourceType,authoritySourcePath,rowIdentity,normalizedAliasValue,rawIdentityHasLeadingSlash,resolutionEligibility';
    assert(
      canonicalAliasLines[0] === expectedCanonicalAliasHeader,
      'Canonical alias table writes locked compatibility-prefix plus tuple eligibility column order',
    );

    const canonicalAliasRows = csv.parse(canonicalAliasRaw, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    assert(canonicalAliasRows.length === 9, 'Canonical alias table emits help + shard-doc + index-docs canonical alias exemplar rows');
    assert(
      canonicalAliasRows.map((row) => row.aliasType).join(',') ===
        'canonical-id,legacy-name,slash-command,canonical-id,legacy-name,slash-command,canonical-id,legacy-name,slash-command',
      'Canonical alias table preserves locked deterministic row ordering',
    );

    const expectedRowsByIdentity = new Map([
      [
        'alias-row:bmad-help:canonical-id',
        {
          canonicalId: 'bmad-help',
          alias: 'bmad-help',
          aliasType: 'canonical-id',
          authoritySourcePath: 'bmad-fork/src/core/tasks/help.artifact.yaml',
          normalizedAliasValue: 'bmad-help',
          rawIdentityHasLeadingSlash: 'false',
          resolutionEligibility: 'canonical-id-only',
        },
      ],
      [
        'alias-row:bmad-help:legacy-name',
        {
          canonicalId: 'bmad-help',
          alias: 'help',
          aliasType: 'legacy-name',
          authoritySourcePath: 'bmad-fork/src/core/tasks/help.artifact.yaml',
          normalizedAliasValue: 'help',
          rawIdentityHasLeadingSlash: 'false',
          resolutionEligibility: 'legacy-name-only',
        },
      ],
      [
        'alias-row:bmad-help:slash-command',
        {
          canonicalId: 'bmad-help',
          alias: '/bmad-help',
          aliasType: 'slash-command',
          authoritySourcePath: 'bmad-fork/src/core/tasks/help.artifact.yaml',
          normalizedAliasValue: 'bmad-help',
          rawIdentityHasLeadingSlash: 'true',
          resolutionEligibility: 'slash-command-only',
        },
      ],
      [
        'alias-row:bmad-shard-doc:canonical-id',
        {
          canonicalId: 'bmad-shard-doc',
          alias: 'bmad-shard-doc',
          aliasType: 'canonical-id',
          authoritySourcePath: 'bmad-fork/src/core/tasks/shard-doc.artifact.yaml',
          normalizedAliasValue: 'bmad-shard-doc',
          rawIdentityHasLeadingSlash: 'false',
          resolutionEligibility: 'canonical-id-only',
        },
      ],
      [
        'alias-row:bmad-shard-doc:legacy-name',
        {
          canonicalId: 'bmad-shard-doc',
          alias: 'shard-doc',
          aliasType: 'legacy-name',
          authoritySourcePath: 'bmad-fork/src/core/tasks/shard-doc.artifact.yaml',
          normalizedAliasValue: 'shard-doc',
          rawIdentityHasLeadingSlash: 'false',
          resolutionEligibility: 'legacy-name-only',
        },
      ],
      [
        'alias-row:bmad-shard-doc:slash-command',
        {
          canonicalId: 'bmad-shard-doc',
          alias: '/bmad-shard-doc',
          aliasType: 'slash-command',
          authoritySourcePath: 'bmad-fork/src/core/tasks/shard-doc.artifact.yaml',
          normalizedAliasValue: 'bmad-shard-doc',
          rawIdentityHasLeadingSlash: 'true',
          resolutionEligibility: 'slash-command-only',
        },
      ],
      [
        'alias-row:bmad-index-docs:canonical-id',
        {
          canonicalId: 'bmad-index-docs',
          alias: 'bmad-index-docs',
          aliasType: 'canonical-id',
          authoritySourcePath: 'bmad-fork/src/core/tasks/index-docs.artifact.yaml',
          normalizedAliasValue: 'bmad-index-docs',
          rawIdentityHasLeadingSlash: 'false',
          resolutionEligibility: 'canonical-id-only',
        },
      ],
      [
        'alias-row:bmad-index-docs:legacy-name',
        {
          canonicalId: 'bmad-index-docs',
          alias: 'index-docs',
          aliasType: 'legacy-name',
          authoritySourcePath: 'bmad-fork/src/core/tasks/index-docs.artifact.yaml',
          normalizedAliasValue: 'index-docs',
          rawIdentityHasLeadingSlash: 'false',
          resolutionEligibility: 'legacy-name-only',
        },
      ],
      [
        'alias-row:bmad-index-docs:slash-command',
        {
          canonicalId: 'bmad-index-docs',
          alias: '/bmad-index-docs',
          aliasType: 'slash-command',
          authoritySourcePath: 'bmad-fork/src/core/tasks/index-docs.artifact.yaml',
          normalizedAliasValue: 'bmad-index-docs',
          rawIdentityHasLeadingSlash: 'true',
          resolutionEligibility: 'slash-command-only',
        },
      ],
    ]);

    for (const [rowIdentity, expectedRow] of expectedRowsByIdentity) {
      const matchingRows = canonicalAliasRows.filter((row) => row.rowIdentity === rowIdentity);
      assert(matchingRows.length === 1, `Canonical alias table emits exactly one ${rowIdentity} exemplar row`);

      const row = matchingRows[0];
      assert(
        row && row.authoritySourceType === 'sidecar' && row.authoritySourcePath === expectedRow.authoritySourcePath,
        `${rowIdentity} exemplar row uses locked sidecar provenance`,
      );
      assert(row && row.canonicalId === expectedRow.canonicalId, `${rowIdentity} exemplar row locks canonicalId contract`);
      assert(row && row.alias === expectedRow.alias, `${rowIdentity} exemplar row locks alias contract`);
      assert(row && row.aliasType === expectedRow.aliasType, `${rowIdentity} exemplar row locks aliasType contract`);
      assert(row && row.rowIdentity === rowIdentity, `${rowIdentity} exemplar row locks rowIdentity contract`);
      assert(
        row && row.normalizedAliasValue === expectedRow.normalizedAliasValue,
        `${rowIdentity} exemplar row locks normalizedAliasValue contract`,
      );
      assert(
        row && row.rawIdentityHasLeadingSlash === expectedRow.rawIdentityHasLeadingSlash,
        `${rowIdentity} exemplar row locks rawIdentityHasLeadingSlash contract`,
      );
      assert(
        row && row.resolutionEligibility === expectedRow.resolutionEligibility,
        `${rowIdentity} exemplar row locks resolutionEligibility contract`,
      );
    }

    const validateLockedCanonicalAliasProjection = (rows) => {
      for (const [rowIdentity, expectedRow] of expectedRowsByIdentity) {
        const matchingRows = rows.filter((row) => row.rowIdentity === rowIdentity);
        if (matchingRows.length === 0) {
          return { valid: false, reason: `missing:${rowIdentity}` };
        }
        if (matchingRows.length > 1) {
          return { valid: false, reason: `conflict:${rowIdentity}` };
        }

        const row = matchingRows[0];
        if (
          row.canonicalId !== expectedRow.canonicalId ||
          row.alias !== expectedRow.alias ||
          row.aliasType !== expectedRow.aliasType ||
          row.authoritySourceType !== 'sidecar' ||
          row.authoritySourcePath !== expectedRow.authoritySourcePath ||
          row.rowIdentity !== rowIdentity ||
          row.normalizedAliasValue !== expectedRow.normalizedAliasValue ||
          row.rawIdentityHasLeadingSlash !== expectedRow.rawIdentityHasLeadingSlash ||
          row.resolutionEligibility !== expectedRow.resolutionEligibility
        ) {
          return { valid: false, reason: `conflict:${rowIdentity}` };
        }
      }

      if (rows.length !== expectedRowsByIdentity.size) {
        return { valid: false, reason: 'conflict:extra-rows' };
      }

      return { valid: true, reason: 'ok' };
    };

    const baselineProjectionValidation = validateLockedCanonicalAliasProjection(canonicalAliasRows);
    assert(
      baselineProjectionValidation.valid,
      'Canonical alias projection validator passes when all required exemplar rows are present exactly once',
      baselineProjectionValidation.reason,
    );

    const missingLegacyRows = canonicalAliasRows.filter((row) => row.rowIdentity !== 'alias-row:bmad-shard-doc:legacy-name');
    const missingLegacyValidation = validateLockedCanonicalAliasProjection(missingLegacyRows);
    assert(
      !missingLegacyValidation.valid && missingLegacyValidation.reason === 'missing:alias-row:bmad-shard-doc:legacy-name',
      'Canonical alias projection validator fails when required shard-doc legacy-name row is missing',
    );

    const conflictingRows = [
      ...canonicalAliasRows,
      {
        ...canonicalAliasRows.find((row) => row.rowIdentity === 'alias-row:bmad-help:slash-command'),
      },
    ];
    const conflictingValidation = validateLockedCanonicalAliasProjection(conflictingRows);
    assert(
      !conflictingValidation.valid && conflictingValidation.reason === 'conflict:alias-row:bmad-help:slash-command',
      'Canonical alias projection validator fails when conflicting duplicate exemplar rows appear',
    );

    const fallbackManifestGenerator = new ManifestGenerator();
    fallbackManifestGenerator.bmadDir = tempCanonicalAliasRoot;
    fallbackManifestGenerator.bmadFolderName = '_bmad';
    fallbackManifestGenerator.helpAuthorityRecords = [];
    fallbackManifestGenerator.taskAuthorityRecords = [];
    fallbackManifestGenerator.includeConvertedShardDocAliasRows = true;
    const fallbackCanonicalAliasPath = await fallbackManifestGenerator.writeCanonicalAliasManifest(tempCanonicalAliasConfigDir);
    const fallbackCanonicalAliasRaw = await fs.readFile(fallbackCanonicalAliasPath, 'utf8');
    const fallbackCanonicalAliasRows = csv.parse(fallbackCanonicalAliasRaw, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    assert(
      fallbackCanonicalAliasRows.every((row) => {
        if (row.authoritySourceType !== 'sidecar') {
          return false;
        }
        if (row.canonicalId === 'bmad-help') {
          return row.authoritySourcePath === 'bmad-fork/src/core/tasks/help.artifact.yaml';
        }
        if (row.canonicalId === 'bmad-shard-doc') {
          return row.authoritySourcePath === 'bmad-fork/src/core/tasks/shard-doc.artifact.yaml';
        }
        return false;
      }),
      'Canonical alias table falls back to locked sidecar provenance when authority records are unavailable',
    );

    const tempGeneratedBmadDir = path.join(tempCanonicalAliasRoot, '_bmad');
    await fs.ensureDir(tempGeneratedBmadDir);
    const manifestStats = await new ManifestGenerator().generateManifests(
      tempGeneratedBmadDir,
      [],
      [path.join(tempGeneratedBmadDir, '_config', 'canonical-aliases.csv')],
      {
        ides: [],
        preservedModules: [],
        helpAuthorityRecords: manifestGenerator.helpAuthorityRecords,
        taskAuthorityRecords: manifestGenerator.taskAuthorityRecords,
      },
    );

    assert(
      Array.isArray(manifestStats.manifestFiles) &&
        manifestStats.manifestFiles.some((filePath) => filePath.endsWith('/_config/canonical-aliases.csv')),
      'Manifest generation includes canonical-aliases.csv in output sequencing',
    );

    const writtenFilesManifestRaw = await fs.readFile(path.join(tempGeneratedBmadDir, '_config', 'files-manifest.csv'), 'utf8');
    assert(
      writtenFilesManifestRaw.includes('"_config/canonical-aliases.csv"'),
      'Files manifest tracks canonical-aliases.csv when pre-registered by installer flow',
    );
  } catch (error) {
    assert(false, 'Canonical alias projection suite setup', error.message);
  } finally {
    await fs.remove(tempCanonicalAliasRoot);
  }

  console.log('');
};
