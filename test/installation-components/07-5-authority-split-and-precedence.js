/**
 * Installation component 5: Authority Split and Precedence
 */
module.exports = async function runSuite(context) {
  const {
    path,
    os,
    fs,
    yaml,
    ManifestGenerator,
    HELP_FRONTMATTER_MISMATCH_ERROR_CODES,
    validateHelpAuthoritySplitAndPrecedence,
    SHARD_DOC_AUTHORITY_VALIDATION_ERROR_CODES,
    validateShardDocAuthoritySplitAndPrecedence,
    INDEX_DOCS_AUTHORITY_VALIDATION_ERROR_CODES,
    validateIndexDocsAuthoritySplitAndPrecedence,
    colors,
    assert,
  } = context;

  console.log(`${colors.yellow}Test Suite 5: Authority Split and Precedence${colors.reset}\n`);

  const tempAuthorityRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bmad-help-authority-'));
  const tempAuthoritySidecarPath = path.join(tempAuthorityRoot, 'help.artifact.yaml');
  const tempAuthoritySourcePath = path.join(tempAuthorityRoot, 'help-source.md');
  const tempAuthorityRuntimePath = path.join(tempAuthorityRoot, 'help-runtime.md');

  const deterministicAuthorityPaths = {
    sidecar: 'bmad-fork/src/core/tasks/help.artifact.yaml',
    source: 'bmad-fork/src/core/tasks/help.md',
    runtime: '_bmad/core/tasks/help.md',
  };

  const writeMarkdownWithFrontmatter = async (filePath, frontmatter) => {
    const frontmatterBody = yaml.stringify(frontmatter).trimEnd();
    await fs.writeFile(filePath, `---\n${frontmatterBody}\n---\n\n# Placeholder\n`, 'utf8');
  };

  const validAuthoritySidecar = {
    schemaVersion: 1,
    canonicalId: 'bmad-help',
    artifactType: 'task',
    module: 'core',
    sourcePath: deterministicAuthorityPaths.source,
    displayName: 'help',
    description: 'Help command',
    dependencies: {
      requires: [],
    },
  };

  const validAuthorityFrontmatter = {
    name: 'help',
    description: 'Help command',
    canonicalId: 'bmad-help',
    dependencies: {
      requires: [],
    },
  };

  const runAuthorityValidation = async () =>
    validateHelpAuthoritySplitAndPrecedence({
      sidecarPath: tempAuthoritySidecarPath,
      sourceMarkdownPath: tempAuthoritySourcePath,
      runtimeMarkdownPath: tempAuthorityRuntimePath,
      sidecarSourcePath: deterministicAuthorityPaths.sidecar,
      sourceMarkdownSourcePath: deterministicAuthorityPaths.source,
      runtimeMarkdownSourcePath: deterministicAuthorityPaths.runtime,
    });

  const expectAuthorityValidationError = async (
    sourceFrontmatter,
    runtimeFrontmatter,
    expectedCode,
    expectedFieldPath,
    expectedSourcePath,
    testLabel,
  ) => {
    await writeMarkdownWithFrontmatter(tempAuthoritySourcePath, sourceFrontmatter);
    await writeMarkdownWithFrontmatter(tempAuthorityRuntimePath, runtimeFrontmatter);

    try {
      await runAuthorityValidation();
      assert(false, testLabel, 'Expected authority validation error but validation passed');
    } catch (error) {
      assert(error.code === expectedCode, `${testLabel} returns expected error code`, `Expected ${expectedCode}, got ${error.code}`);
      assert(
        error.fieldPath === expectedFieldPath,
        `${testLabel} returns expected field path`,
        `Expected ${expectedFieldPath}, got ${error.fieldPath}`,
      );
      assert(
        error.sourcePath === expectedSourcePath,
        `${testLabel} returns expected source path`,
        `Expected ${expectedSourcePath}, got ${error.sourcePath}`,
      );
      assert(
        typeof error.message === 'string' &&
          error.message.includes(expectedCode) &&
          error.message.includes(expectedFieldPath) &&
          error.message.includes(expectedSourcePath),
        `${testLabel} includes deterministic message context`,
      );
    }
  };

  try {
    await fs.writeFile(tempAuthoritySidecarPath, yaml.stringify(validAuthoritySidecar), 'utf8');
    await writeMarkdownWithFrontmatter(tempAuthoritySourcePath, validAuthorityFrontmatter);
    await writeMarkdownWithFrontmatter(tempAuthorityRuntimePath, validAuthorityFrontmatter);

    const authorityValidation = await runAuthorityValidation();
    assert(
      authorityValidation.authoritativePresenceKey === 'capability:bmad-help',
      'Authority validation returns shared authoritative presence key',
    );
    assert(
      Array.isArray(authorityValidation.authoritativeRecords) && authorityValidation.authoritativeRecords.length === 2,
      'Authority validation returns sidecar and source authority records',
    );

    const sidecarRecord = authorityValidation.authoritativeRecords.find((record) => record.authoritySourceType === 'sidecar');
    const sourceRecord = authorityValidation.authoritativeRecords.find((record) => record.authoritySourceType === 'source-markdown');

    assert(
      sidecarRecord && sourceRecord && sidecarRecord.authoritativePresenceKey === sourceRecord.authoritativePresenceKey,
      'Source markdown and sidecar records share one authoritative presence key',
    );
    assert(
      sidecarRecord && sidecarRecord.authoritySourcePath === deterministicAuthorityPaths.sidecar,
      'Sidecar authority record preserves truthful sidecar source path',
    );
    assert(
      sourceRecord && sourceRecord.authoritySourcePath === deterministicAuthorityPaths.source,
      'Source body authority record preserves truthful source markdown path',
    );

    const manifestGenerator = new ManifestGenerator();
    manifestGenerator.modules = ['core'];
    manifestGenerator.bmadDir = tempAuthorityRoot;
    manifestGenerator.selectedIdes = [];
    manifestGenerator.helpAuthorityRecords = authorityValidation.authoritativeRecords;

    const tempManifestConfigDir = path.join(tempAuthorityRoot, '_config');
    await fs.ensureDir(tempManifestConfigDir);
    await manifestGenerator.writeMainManifest(tempManifestConfigDir);

    const writtenManifestRaw = await fs.readFile(path.join(tempManifestConfigDir, 'manifest.yaml'), 'utf8');
    const writtenManifest = yaml.parse(writtenManifestRaw);

    assert(
      writtenManifest.helpAuthority && Array.isArray(writtenManifest.helpAuthority.records),
      'Manifest generation persists help authority records',
    );
    assert(
      writtenManifest.helpAuthority && writtenManifest.helpAuthority.records && writtenManifest.helpAuthority.records.length === 2,
      'Manifest generation persists both authority records',
    );
    assert(
      writtenManifest.helpAuthority &&
        writtenManifest.helpAuthority.records.some(
          (record) => record.authoritySourceType === 'sidecar' && record.authoritySourcePath === deterministicAuthorityPaths.sidecar,
        ),
      'Manifest generation preserves sidecar authority provenance',
    );
    assert(
      writtenManifest.helpAuthority &&
        writtenManifest.helpAuthority.records.some(
          (record) => record.authoritySourceType === 'source-markdown' && record.authoritySourcePath === deterministicAuthorityPaths.source,
        ),
      'Manifest generation preserves source-markdown authority provenance',
    );

    await expectAuthorityValidationError(
      { ...validAuthorityFrontmatter, canonicalId: 'legacy-help' },
      validAuthorityFrontmatter,
      HELP_FRONTMATTER_MISMATCH_ERROR_CODES.CANONICAL_ID_MISMATCH,
      'canonicalId',
      deterministicAuthorityPaths.source,
      'Source canonicalId mismatch',
    );

    await expectAuthorityValidationError(
      { ...validAuthorityFrontmatter, name: 'BMAD Help' },
      validAuthorityFrontmatter,
      HELP_FRONTMATTER_MISMATCH_ERROR_CODES.DISPLAY_NAME_MISMATCH,
      'name',
      deterministicAuthorityPaths.source,
      'Source display-name mismatch',
    );

    await expectAuthorityValidationError(
      validAuthorityFrontmatter,
      { ...validAuthorityFrontmatter, description: 'Runtime override' },
      HELP_FRONTMATTER_MISMATCH_ERROR_CODES.DESCRIPTION_MISMATCH,
      'description',
      deterministicAuthorityPaths.runtime,
      'Runtime description mismatch',
    );

    await expectAuthorityValidationError(
      { ...validAuthorityFrontmatter, dependencies: { requires: ['skill:other'] } },
      validAuthorityFrontmatter,
      HELP_FRONTMATTER_MISMATCH_ERROR_CODES.DEPENDENCIES_REQUIRES_MISMATCH,
      'dependencies.requires',
      deterministicAuthorityPaths.source,
      'Source dependencies.requires mismatch',
    );

    const tempShardDocAuthoritySidecarPath = path.join(tempAuthorityRoot, 'shard-doc.artifact.yaml');
    const tempShardDocAuthoritySourcePath = path.join(tempAuthorityRoot, 'shard-doc.xml');
    const tempShardDocModuleHelpPath = path.join(tempAuthorityRoot, 'module-help.csv');

    const deterministicShardDocAuthorityPaths = {
      sidecar: 'bmad-fork/src/core/tasks/shard-doc.artifact.yaml',
      source: 'bmad-fork/src/core/tasks/shard-doc.xml',
      compatibility: 'bmad-fork/src/core/module-help.csv',
      workflowFile: '_bmad/core/tasks/shard-doc.xml',
    };

    const validShardDocAuthoritySidecar = {
      schemaVersion: 1,
      canonicalId: 'bmad-shard-doc',
      artifactType: 'task',
      module: 'core',
      sourcePath: deterministicShardDocAuthorityPaths.source,
      displayName: 'Shard Document',
      description: 'Split large markdown documents into smaller files by section with an index.',
      dependencies: {
        requires: [],
      },
    };

    const writeModuleHelpCsv = async (rows) => {
      const header = 'module,phase,name,code,sequence,workflow-file,command,required,agent,options,description,output-location,outputs';
      const lines = rows.map((row) =>
        [
          row.module ?? 'core',
          row.phase ?? 'anytime',
          row.name ?? 'Shard Document',
          row.code ?? 'SD',
          row.sequence ?? '',
          row.workflowFile ?? '',
          row.command ?? '',
          row.required ?? 'false',
          row.agent ?? '',
          row.options ?? '',
          row.description ?? 'Compatibility row',
          row.outputLocation ?? '',
          row.outputs ?? '',
        ].join(','),
      );

      await fs.writeFile(tempShardDocModuleHelpPath, [header, ...lines].join('\n'), 'utf8');
    };

    const runShardDocAuthorityValidation = async () =>
      validateShardDocAuthoritySplitAndPrecedence({
        sidecarPath: tempShardDocAuthoritySidecarPath,
        sourceXmlPath: tempShardDocAuthoritySourcePath,
        compatibilityCatalogPath: tempShardDocModuleHelpPath,
        sidecarSourcePath: deterministicShardDocAuthorityPaths.sidecar,
        sourceXmlSourcePath: deterministicShardDocAuthorityPaths.source,
        compatibilityCatalogSourcePath: deterministicShardDocAuthorityPaths.compatibility,
        compatibilityWorkflowFilePath: deterministicShardDocAuthorityPaths.workflowFile,
      });

    const expectShardDocAuthorityValidationError = async (
      rows,
      expectedCode,
      expectedFieldPath,
      testLabel,
      expectedSourcePath = deterministicShardDocAuthorityPaths.compatibility,
    ) => {
      await writeModuleHelpCsv(rows);

      try {
        await runShardDocAuthorityValidation();
        assert(false, testLabel, 'Expected shard-doc authority validation error but validation passed');
      } catch (error) {
        assert(error.code === expectedCode, `${testLabel} returns expected error code`, `Expected ${expectedCode}, got ${error.code}`);
        assert(
          error.fieldPath === expectedFieldPath,
          `${testLabel} returns expected field path`,
          `Expected ${expectedFieldPath}, got ${error.fieldPath}`,
        );
        assert(
          error.sourcePath === expectedSourcePath,
          `${testLabel} returns expected source path`,
          `Expected ${expectedSourcePath}, got ${error.sourcePath}`,
        );
        assert(
          typeof error.message === 'string' &&
            error.message.includes(expectedCode) &&
            error.message.includes(expectedFieldPath) &&
            error.message.includes(expectedSourcePath),
          `${testLabel} includes deterministic message context`,
        );
      }
    };

    await fs.writeFile(tempShardDocAuthoritySidecarPath, yaml.stringify(validShardDocAuthoritySidecar), 'utf8');
    await fs.writeFile(tempShardDocAuthoritySourcePath, '<task id="_bmad/core/tasks/shard-doc"></task>\n', 'utf8');

    await writeModuleHelpCsv([
      {
        workflowFile: deterministicShardDocAuthorityPaths.workflowFile,
        command: 'bmad-shard-doc',
        name: 'Shard Document',
      },
    ]);

    const shardDocAuthorityValidation = await runShardDocAuthorityValidation();
    assert(
      shardDocAuthorityValidation.authoritativePresenceKey === 'capability:bmad-shard-doc',
      'Shard-doc authority validation returns expected authoritative presence key',
    );
    assert(
      Array.isArray(shardDocAuthorityValidation.authoritativeRecords) && shardDocAuthorityValidation.authoritativeRecords.length === 2,
      'Shard-doc authority validation returns sidecar and source authority records',
    );

    const shardDocSidecarRecord = shardDocAuthorityValidation.authoritativeRecords.find(
      (record) => record.authoritySourceType === 'sidecar',
    );
    const shardDocSourceRecord = shardDocAuthorityValidation.authoritativeRecords.find(
      (record) => record.authoritySourceType === 'source-xml',
    );

    assert(
      shardDocSidecarRecord &&
        shardDocSourceRecord &&
        shardDocSidecarRecord.authoritativePresenceKey === shardDocSourceRecord.authoritativePresenceKey,
      'Shard-doc sidecar and source-xml records share one authoritative presence key',
    );
    assert(
      shardDocSidecarRecord &&
        shardDocSourceRecord &&
        shardDocSidecarRecord.authoritativePresenceKey === 'capability:bmad-shard-doc' &&
        shardDocSourceRecord.authoritativePresenceKey === 'capability:bmad-shard-doc',
      'Shard-doc authority records lock authoritative presence key to capability:bmad-shard-doc',
    );
    assert(
      shardDocSidecarRecord && shardDocSidecarRecord.authoritySourcePath === deterministicShardDocAuthorityPaths.sidecar,
      'Shard-doc metadata authority record preserves sidecar source path',
    );
    assert(
      shardDocSourceRecord && shardDocSourceRecord.authoritySourcePath === deterministicShardDocAuthorityPaths.source,
      'Shard-doc source-body authority record preserves source XML path',
    );

    await expectShardDocAuthorityValidationError(
      [
        {
          workflowFile: deterministicShardDocAuthorityPaths.workflowFile,
          command: 'legacy-shard-doc',
          name: 'Shard Document',
        },
      ],
      SHARD_DOC_AUTHORITY_VALIDATION_ERROR_CODES.COMMAND_MISMATCH,
      'command',
      'Shard-doc compatibility command mismatch',
    );

    await expectShardDocAuthorityValidationError(
      [
        {
          workflowFile: '_bmad/core/tasks/help.md',
          command: 'bmad-shard-doc',
          name: 'Shard Document',
        },
      ],
      SHARD_DOC_AUTHORITY_VALIDATION_ERROR_CODES.COMPATIBILITY_ROW_MISSING,
      'workflow-file',
      'Shard-doc missing compatibility row',
    );

    await expectShardDocAuthorityValidationError(
      [
        {
          workflowFile: deterministicShardDocAuthorityPaths.workflowFile,
          command: 'bmad-shard-doc',
          name: 'Shard Document',
        },
        {
          workflowFile: '_bmad/core/tasks/another.xml',
          command: 'bmad-shard-doc',
          name: 'Shard Document',
        },
      ],
      SHARD_DOC_AUTHORITY_VALIDATION_ERROR_CODES.DUPLICATE_CANONICAL_COMMAND,
      'command',
      'Shard-doc duplicate canonical command rows',
    );

    await fs.writeFile(
      tempShardDocAuthoritySidecarPath,
      yaml.stringify({
        ...validShardDocAuthoritySidecar,
        canonicalId: 'bmad-shard-doc-renamed',
      }),
      'utf8',
    );

    await expectShardDocAuthorityValidationError(
      [
        {
          workflowFile: deterministicShardDocAuthorityPaths.workflowFile,
          command: 'bmad-shard-doc-renamed',
          name: 'Shard Document',
        },
      ],
      SHARD_DOC_AUTHORITY_VALIDATION_ERROR_CODES.SIDECAR_CANONICAL_ID_MISMATCH,
      'canonicalId',
      'Shard-doc canonicalId drift fails deterministic authority validation',
      deterministicShardDocAuthorityPaths.sidecar,
    );

    await fs.writeFile(tempShardDocAuthoritySidecarPath, yaml.stringify(validShardDocAuthoritySidecar), 'utf8');

    const tempIndexDocsAuthoritySidecarPath = path.join(tempAuthorityRoot, 'index-docs.artifact.yaml');
    const tempIndexDocsAuthoritySourcePath = path.join(tempAuthorityRoot, 'index-docs.xml');
    const tempIndexDocsModuleHelpPath = path.join(tempAuthorityRoot, 'index-docs-module-help.csv');

    const deterministicIndexDocsAuthorityPaths = {
      sidecar: 'bmad-fork/src/core/tasks/index-docs.artifact.yaml',
      source: 'bmad-fork/src/core/tasks/index-docs.xml',
      compatibility: 'bmad-fork/src/core/module-help.csv',
      workflowFile: '_bmad/core/tasks/index-docs.xml',
    };

    const validIndexDocsAuthoritySidecar = {
      schemaVersion: 1,
      canonicalId: 'bmad-index-docs',
      artifactType: 'task',
      module: 'core',
      sourcePath: deterministicIndexDocsAuthorityPaths.source,
      displayName: 'Index Docs',
      description:
        'Create lightweight index for quick LLM scanning. Use when LLM needs to understand available docs without loading everything.',
      dependencies: {
        requires: [],
      },
    };

    const writeIndexDocsModuleHelpCsv = async (rows) => {
      const header = 'module,phase,name,code,sequence,workflow-file,command,required,agent,options,description,output-location,outputs';
      const lines = rows.map((row) =>
        [
          row.module ?? 'core',
          row.phase ?? 'anytime',
          row.name ?? 'Index Docs',
          row.code ?? 'ID',
          row.sequence ?? '',
          row.workflowFile ?? '',
          row.command ?? '',
          row.required ?? 'false',
          row.agent ?? '',
          row.options ?? '',
          row.description ?? 'Compatibility row',
          row.outputLocation ?? '',
          row.outputs ?? '',
        ].join(','),
      );

      await fs.writeFile(tempIndexDocsModuleHelpPath, [header, ...lines].join('\n'), 'utf8');
    };

    const runIndexDocsAuthorityValidation = async () =>
      validateIndexDocsAuthoritySplitAndPrecedence({
        sidecarPath: tempIndexDocsAuthoritySidecarPath,
        sourceXmlPath: tempIndexDocsAuthoritySourcePath,
        compatibilityCatalogPath: tempIndexDocsModuleHelpPath,
        sidecarSourcePath: deterministicIndexDocsAuthorityPaths.sidecar,
        sourceXmlSourcePath: deterministicIndexDocsAuthorityPaths.source,
        compatibilityCatalogSourcePath: deterministicIndexDocsAuthorityPaths.compatibility,
        compatibilityWorkflowFilePath: deterministicIndexDocsAuthorityPaths.workflowFile,
      });

    const expectIndexDocsAuthorityValidationError = async (
      rows,
      expectedCode,
      expectedFieldPath,
      testLabel,
      expectedSourcePath = deterministicIndexDocsAuthorityPaths.compatibility,
    ) => {
      await writeIndexDocsModuleHelpCsv(rows);

      try {
        await runIndexDocsAuthorityValidation();
        assert(false, testLabel, 'Expected index-docs authority validation error but validation passed');
      } catch (error) {
        assert(error.code === expectedCode, `${testLabel} returns expected error code`, `Expected ${expectedCode}, got ${error.code}`);
        assert(
          error.fieldPath === expectedFieldPath,
          `${testLabel} returns expected field path`,
          `Expected ${expectedFieldPath}, got ${error.fieldPath}`,
        );
        assert(
          error.sourcePath === expectedSourcePath,
          `${testLabel} returns expected source path`,
          `Expected ${expectedSourcePath}, got ${error.sourcePath}`,
        );
        assert(
          typeof error.message === 'string' &&
            error.message.includes(expectedCode) &&
            error.message.includes(expectedFieldPath) &&
            error.message.includes(expectedSourcePath),
          `${testLabel} includes deterministic message context`,
        );
      }
    };

    await fs.writeFile(tempIndexDocsAuthoritySidecarPath, yaml.stringify(validIndexDocsAuthoritySidecar), 'utf8');
    await fs.writeFile(tempIndexDocsAuthoritySourcePath, '<task id="_bmad/core/tasks/index-docs"></task>\n', 'utf8');

    await writeIndexDocsModuleHelpCsv([
      {
        workflowFile: deterministicIndexDocsAuthorityPaths.workflowFile,
        command: 'bmad-index-docs',
        name: 'Index Docs',
      },
    ]);

    const indexDocsAuthorityValidation = await runIndexDocsAuthorityValidation();
    assert(
      indexDocsAuthorityValidation.authoritativePresenceKey === 'capability:bmad-index-docs',
      'Index-docs authority validation returns expected authoritative presence key',
    );
    assert(
      Array.isArray(indexDocsAuthorityValidation.authoritativeRecords) && indexDocsAuthorityValidation.authoritativeRecords.length === 2,
      'Index-docs authority validation returns sidecar and source authority records',
    );

    const indexDocsSidecarRecord = indexDocsAuthorityValidation.authoritativeRecords.find(
      (record) => record.authoritySourceType === 'sidecar',
    );
    const indexDocsSourceRecord = indexDocsAuthorityValidation.authoritativeRecords.find(
      (record) => record.authoritySourceType === 'source-xml',
    );

    assert(
      indexDocsSidecarRecord &&
        indexDocsSourceRecord &&
        indexDocsSidecarRecord.authoritativePresenceKey === indexDocsSourceRecord.authoritativePresenceKey,
      'Index-docs sidecar and source-xml records share one authoritative presence key',
    );
    assert(
      indexDocsSidecarRecord &&
        indexDocsSourceRecord &&
        indexDocsSidecarRecord.authoritativePresenceKey === 'capability:bmad-index-docs' &&
        indexDocsSourceRecord.authoritativePresenceKey === 'capability:bmad-index-docs',
      'Index-docs authority records lock authoritative presence key to capability:bmad-index-docs',
    );
    assert(
      indexDocsSidecarRecord && indexDocsSidecarRecord.authoritySourcePath === deterministicIndexDocsAuthorityPaths.sidecar,
      'Index-docs metadata authority record preserves sidecar source path',
    );
    assert(
      indexDocsSourceRecord && indexDocsSourceRecord.authoritySourcePath === deterministicIndexDocsAuthorityPaths.source,
      'Index-docs source-body authority record preserves source XML path',
    );

    await expectIndexDocsAuthorityValidationError(
      [
        {
          workflowFile: deterministicIndexDocsAuthorityPaths.workflowFile,
          command: 'legacy-index-docs',
          name: 'Index Docs',
        },
      ],
      INDEX_DOCS_AUTHORITY_VALIDATION_ERROR_CODES.COMMAND_MISMATCH,
      'command',
      'Index-docs compatibility command mismatch',
    );

    await expectIndexDocsAuthorityValidationError(
      [
        {
          workflowFile: '_bmad/core/tasks/help.md',
          command: 'bmad-index-docs',
          name: 'Index Docs',
        },
      ],
      INDEX_DOCS_AUTHORITY_VALIDATION_ERROR_CODES.COMPATIBILITY_ROW_MISSING,
      'workflow-file',
      'Index-docs missing compatibility row',
    );

    await expectIndexDocsAuthorityValidationError(
      [
        {
          workflowFile: deterministicIndexDocsAuthorityPaths.workflowFile,
          command: 'bmad-index-docs',
          name: 'Index Docs',
        },
        {
          workflowFile: '_bmad/core/tasks/another.xml',
          command: 'bmad-index-docs',
          name: 'Index Docs',
        },
      ],
      INDEX_DOCS_AUTHORITY_VALIDATION_ERROR_CODES.DUPLICATE_CANONICAL_COMMAND,
      'command',
      'Index-docs duplicate canonical command rows',
    );

    await fs.writeFile(
      tempIndexDocsAuthoritySidecarPath,
      yaml.stringify({
        ...validIndexDocsAuthoritySidecar,
        canonicalId: 'bmad-index-docs-renamed',
      }),
      'utf8',
    );

    await expectIndexDocsAuthorityValidationError(
      [
        {
          workflowFile: deterministicIndexDocsAuthorityPaths.workflowFile,
          command: 'bmad-index-docs-renamed',
          name: 'Index Docs',
        },
      ],
      INDEX_DOCS_AUTHORITY_VALIDATION_ERROR_CODES.SIDECAR_CANONICAL_ID_MISMATCH,
      'canonicalId',
      'Index-docs canonicalId drift fails deterministic authority validation',
      deterministicIndexDocsAuthorityPaths.sidecar,
    );

    await fs.writeFile(tempIndexDocsAuthoritySidecarPath, yaml.stringify(validIndexDocsAuthoritySidecar), 'utf8');
  } catch (error) {
    assert(false, 'Authority split and precedence suite setup', error.message);
  } finally {
    await fs.remove(tempAuthorityRoot);
  }

  console.log('');
};
