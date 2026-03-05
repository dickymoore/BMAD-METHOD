/**
 * Installation component 16: Index-docs Validation Artifact Suite
 */
module.exports = async function runSuite(context) {
  const {
    path,
    os,
    fs,
    yaml,
    csv,
    TASK_MANIFEST_COMPATIBILITY_PREFIX_COLUMNS,
    TASK_MANIFEST_CANONICAL_ADDITIVE_COLUMNS,
    HELP_CATALOG_COMPATIBILITY_PREFIX_COLUMNS,
    HELP_CATALOG_CANONICAL_ADDITIVE_COLUMNS,
    INDEX_DOCS_VALIDATION_ERROR_CODES,
    INDEX_DOCS_VALIDATION_ARTIFACT_REGISTRY,
    IndexDocsValidationHarness,
    colors,
    assert,
  } = context;

  console.log(`${colors.yellow}Test Suite 16: Index-docs Validation Artifact Suite${colors.reset}\n`);

  const tempIndexDocsValidationHarnessRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bmad-index-docs-validation-suite-'));
  try {
    const tempProjectRoot = tempIndexDocsValidationHarnessRoot;
    const tempBmadDir = path.join(tempProjectRoot, '_bmad');
    const tempConfigDir = path.join(tempBmadDir, '_config');
    const tempSourceTasksDir = path.join(tempProjectRoot, 'bmad-fork', 'src', 'core', 'tasks');
    const commandLabelReportPath = path.join(tempConfigDir, 'bmad-help-command-label-report.csv');

    await fs.ensureDir(tempConfigDir);
    await fs.ensureDir(tempSourceTasksDir);

    const writeCsv = async (filePath, columns, rows) => {
      const buildCsvLine = (values) =>
        values
          .map((value) => {
            const text = String(value ?? '');
            return text.includes(',') || text.includes('"') ? `"${text.replaceAll('"', '""')}"` : text;
          })
          .join(',');
      const lines = [columns.join(','), ...rows.map((row) => buildCsvLine(columns.map((column) => row[column] ?? '')))];
      await fs.writeFile(filePath, `${lines.join('\n')}\n`, 'utf8');
    };

    const commandLabelReportColumns = [
      'surface',
      'canonicalId',
      'rawCommandValue',
      'displayedCommandLabel',
      'normalizedDisplayedLabel',
      'rowCountForCanonicalId',
      'authoritySourceType',
      'authoritySourcePath',
      'status',
      'failureReason',
    ];
    const commandLabelReportRows = [
      {
        surface: '_bmad/_config/bmad-help.csv',
        canonicalId: 'bmad-index-docs',
        rawCommandValue: 'bmad-index-docs',
        displayedCommandLabel: '/bmad-index-docs',
        normalizedDisplayedLabel: '/bmad-index-docs',
        rowCountForCanonicalId: '1',
        authoritySourceType: 'sidecar',
        authoritySourcePath: 'bmad-fork/src/core/tasks/index-docs.artifact.yaml',
        status: 'PASS',
        failureReason: '',
      },
    ];

    await fs.writeFile(
      path.join(tempSourceTasksDir, 'index-docs.artifact.yaml'),
      yaml.stringify({
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
      }),
      'utf8',
    );
    await fs.writeFile(
      path.join(tempSourceTasksDir, 'index-docs.xml'),
      '<task id="index-docs"><description>Create lightweight index for quick LLM scanning</description></task>\n',
      'utf8',
    );

    await writeCsv(
      path.join(tempConfigDir, 'task-manifest.csv'),
      [...TASK_MANIFEST_COMPATIBILITY_PREFIX_COLUMNS, ...TASK_MANIFEST_CANONICAL_ADDITIVE_COLUMNS],
      [
        {
          name: 'index-docs',
          displayName: 'Index Docs',
          description:
            'Create lightweight index for quick LLM scanning. Use when LLM needs to understand available docs without loading everything.',
          module: 'core',
          path: '_bmad/core/tasks/index-docs.xml',
          standalone: 'true',
          legacyName: 'index-docs',
          canonicalId: 'bmad-index-docs',
          authoritySourceType: 'sidecar',
          authoritySourcePath: 'bmad-fork/src/core/tasks/index-docs.artifact.yaml',
        },
      ],
    );
    await writeCsv(
      path.join(tempConfigDir, 'bmad-help.csv'),
      [...HELP_CATALOG_COMPATIBILITY_PREFIX_COLUMNS, ...HELP_CATALOG_CANONICAL_ADDITIVE_COLUMNS],
      [
        {
          module: 'core',
          phase: 'anytime',
          name: 'Help',
          code: 'BH',
          sequence: '',
          'workflow-file': '_bmad/core/tasks/help.md',
          command: 'bmad-help',
          required: 'false',
          'agent-name': '',
          'agent-command': '',
          'agent-display-name': '',
          'agent-title': '',
          options: '',
          description: 'Show BMAD help and available resources.',
          'output-location': '',
          outputs: '',
        },
        {
          module: 'core',
          phase: 'anytime',
          name: 'Shard Document',
          code: 'SD',
          sequence: '',
          'workflow-file': '_bmad/core/tasks/shard-doc.xml',
          command: 'bmad-shard-doc',
          required: 'false',
          'agent-name': '',
          'agent-command': '',
          'agent-display-name': '',
          'agent-title': '',
          options: '',
          description: 'Split large markdown documents into smaller files by section with an index.',
          'output-location': '',
          outputs: '',
        },
        {
          module: 'core',
          phase: 'anytime',
          name: 'Index Docs',
          code: 'ID',
          sequence: '',
          'workflow-file': '_bmad/core/tasks/index-docs.xml',
          command: 'bmad-index-docs',
          required: 'false',
          'agent-name': '',
          'agent-command': '',
          'agent-display-name': '',
          'agent-title': '',
          options: '',
          description:
            'Create lightweight index for quick LLM scanning. Use when LLM needs to understand available docs without loading everything.',
          'output-location': '',
          outputs: '',
        },
      ],
    );
    await writeCsv(
      path.join(tempConfigDir, 'canonical-aliases.csv'),
      [
        'canonicalId',
        'alias',
        'aliasType',
        'authoritySourceType',
        'authoritySourcePath',
        'rowIdentity',
        'normalizedAliasValue',
        'rawIdentityHasLeadingSlash',
        'resolutionEligibility',
      ],
      [
        {
          canonicalId: 'bmad-index-docs',
          alias: 'bmad-index-docs',
          aliasType: 'canonical-id',
          authoritySourceType: 'sidecar',
          authoritySourcePath: 'bmad-fork/src/core/tasks/index-docs.artifact.yaml',
          rowIdentity: 'alias-row:bmad-index-docs:canonical-id',
          normalizedAliasValue: 'bmad-index-docs',
          rawIdentityHasLeadingSlash: 'false',
          resolutionEligibility: 'canonical-id-only',
        },
        {
          canonicalId: 'bmad-index-docs',
          alias: 'index-docs',
          aliasType: 'legacy-name',
          authoritySourceType: 'sidecar',
          authoritySourcePath: 'bmad-fork/src/core/tasks/index-docs.artifact.yaml',
          rowIdentity: 'alias-row:bmad-index-docs:legacy-name',
          normalizedAliasValue: 'index-docs',
          rawIdentityHasLeadingSlash: 'false',
          resolutionEligibility: 'legacy-name-only',
        },
        {
          canonicalId: 'bmad-index-docs',
          alias: '/bmad-index-docs',
          aliasType: 'slash-command',
          authoritySourceType: 'sidecar',
          authoritySourcePath: 'bmad-fork/src/core/tasks/index-docs.artifact.yaml',
          rowIdentity: 'alias-row:bmad-index-docs:slash-command',
          normalizedAliasValue: 'bmad-index-docs',
          rawIdentityHasLeadingSlash: 'true',
          resolutionEligibility: 'slash-command-only',
        },
      ],
    );
    await writeCsv(commandLabelReportPath, commandLabelReportColumns, commandLabelReportRows);

    const authorityRecords = [
      {
        recordType: 'metadata-authority',
        canonicalId: 'bmad-index-docs',
        authoritativePresenceKey: 'capability:bmad-index-docs',
        authoritySourceType: 'sidecar',
        authoritySourcePath: 'bmad-fork/src/core/tasks/index-docs.artifact.yaml',
      },
      {
        recordType: 'source-body-authority',
        canonicalId: 'bmad-index-docs',
        authoritativePresenceKey: 'capability:bmad-index-docs',
        authoritySourceType: 'source-xml',
        authoritySourcePath: 'bmad-fork/src/core/tasks/index-docs.xml',
      },
    ];

    const harness = new IndexDocsValidationHarness();
    const firstRun = await harness.generateAndValidate({
      projectDir: tempProjectRoot,
      bmadDir: tempBmadDir,
      bmadFolderName: '_bmad',
      indexDocsAuthorityRecords: authorityRecords,
    });
    assert(
      firstRun.terminalStatus === 'PASS' && firstRun.generatedArtifactCount === INDEX_DOCS_VALIDATION_ARTIFACT_REGISTRY.length,
      'Index-docs validation harness generates and validates all required artifacts',
    );

    const artifactPathsById = new Map(
      INDEX_DOCS_VALIDATION_ARTIFACT_REGISTRY.map((artifact) => [
        artifact.artifactId,
        path.join(tempProjectRoot, '_bmad-output', 'planning-artifacts', artifact.relativePath),
      ]),
    );
    for (const [artifactId, artifactPath] of artifactPathsById.entries()) {
      assert(await fs.pathExists(artifactPath), `Index-docs validation harness outputs artifact ${artifactId}`);
    }

    const firstArtifactContents = new Map();
    for (const [artifactId, artifactPath] of artifactPathsById.entries()) {
      firstArtifactContents.set(artifactId, await fs.readFile(artifactPath, 'utf8'));
    }

    await harness.generateAndValidate({
      projectDir: tempProjectRoot,
      bmadDir: tempBmadDir,
      bmadFolderName: '_bmad',
      indexDocsAuthorityRecords: authorityRecords,
    });
    let deterministicOutputs = true;
    for (const [artifactId, artifactPath] of artifactPathsById.entries()) {
      const rerunContent = await fs.readFile(artifactPath, 'utf8');
      if (rerunContent !== firstArtifactContents.get(artifactId)) {
        deterministicOutputs = false;
        break;
      }
    }
    assert(deterministicOutputs, 'Index-docs validation harness outputs are byte-stable across unchanged repeated runs');

    try {
      await harness.executeIsolatedReplay({
        artifactPath: '_bmad/_config/task-manifest.csv',
        componentPath: 'bmad-fork/tools/cli/installers/lib/core/manifest-generator.js',
        rowIdentity: '',
        runtimeFolder: '_bmad',
      });
      assert(false, 'Index-docs replay evidence generation rejects missing claimed rowIdentity');
    } catch (error) {
      assert(
        error.code === INDEX_DOCS_VALIDATION_ERROR_CODES.REQUIRED_ROW_MISSING,
        'Index-docs replay evidence generation emits deterministic missing-claimed-rowIdentity error code',
      );
    }

    try {
      await harness.executeIsolatedReplay({
        artifactPath: '_bmad/_config/task-manifest.csv',
        componentPath: 'bmad-fork/tools/cli/installers/lib/core/installer.js::mergeModuleHelpCatalogs()',
        rowIdentity: 'issued-artifact:_bmad-_config-task-manifest.csv',
        runtimeFolder: '_bmad',
      });
      assert(false, 'Index-docs replay evidence generation rejects issuing-component contract mismatch');
    } catch (error) {
      assert(
        error.code === INDEX_DOCS_VALIDATION_ERROR_CODES.BINDING_EVIDENCE_INVALID,
        'Index-docs replay evidence generation emits deterministic issuing-component contract mismatch code',
      );
    }

    const artifactElevenPath = artifactPathsById.get(11);
    const artifactElevenRows = csv.parse(await fs.readFile(artifactElevenPath, 'utf8'), {
      columns: true,
      skip_empty_lines: true,
    });
    artifactElevenRows[0].baselineArtifactSha256 = 'not-a-sha';
    await writeCsv(artifactElevenPath, INDEX_DOCS_VALIDATION_ARTIFACT_REGISTRY[10].columns, artifactElevenRows);
    try {
      await harness.validateGeneratedArtifacts({ projectDir: tempProjectRoot });
      assert(false, 'Index-docs validation harness rejects malformed replay-evidence payloads');
    } catch (error) {
      assert(
        error.code === INDEX_DOCS_VALIDATION_ERROR_CODES.REPLAY_EVIDENCE_INVALID,
        'Index-docs validation harness emits deterministic replay-evidence validation error code',
      );
    }

    await harness.generateAndValidate({
      projectDir: tempProjectRoot,
      bmadDir: tempBmadDir,
      bmadFolderName: '_bmad',
      indexDocsAuthorityRecords: authorityRecords,
    });

    await fs.remove(artifactPathsById.get(8));
    try {
      await harness.validateGeneratedArtifacts({ projectDir: tempProjectRoot });
      assert(false, 'Index-docs validation harness fails when a required artifact is missing');
    } catch (error) {
      assert(
        error.code === INDEX_DOCS_VALIDATION_ERROR_CODES.REQUIRED_ARTIFACT_MISSING,
        'Index-docs validation harness emits deterministic missing-artifact error code',
      );
    }

    await harness.generateAndValidate({
      projectDir: tempProjectRoot,
      bmadDir: tempBmadDir,
      bmadFolderName: '_bmad',
      indexDocsAuthorityRecords: authorityRecords,
    });

    await fs.remove(commandLabelReportPath);
    try {
      await harness.generateValidationArtifacts({
        projectDir: tempProjectRoot,
        bmadDir: tempBmadDir,
        bmadFolderName: '_bmad',
        indexDocsAuthorityRecords: authorityRecords,
      });
      assert(false, 'Index-docs validation harness rejects missing command-label report input surface');
    } catch (error) {
      assert(
        error.code === INDEX_DOCS_VALIDATION_ERROR_CODES.REQUIRED_ARTIFACT_MISSING,
        'Index-docs validation harness emits deterministic missing-input-surface error code',
      );
    }
    await writeCsv(commandLabelReportPath, commandLabelReportColumns, commandLabelReportRows);

    const artifactSixPath = artifactPathsById.get(6);
    const artifactSixLines = (await fs.readFile(artifactSixPath, 'utf8')).split('\n');
    artifactSixLines[0] = artifactSixLines[0].replace('canonicalId', 'brokenCanonicalId');
    await fs.writeFile(artifactSixPath, artifactSixLines.join('\n'), 'utf8');
    try {
      await harness.validateGeneratedArtifacts({ projectDir: tempProjectRoot });
      assert(false, 'Index-docs validation harness rejects schema/header drift');
    } catch (error) {
      assert(
        error.code === INDEX_DOCS_VALIDATION_ERROR_CODES.CSV_SCHEMA_MISMATCH,
        'Index-docs validation harness emits deterministic schema-mismatch error code',
      );
    }

    await harness.generateAndValidate({
      projectDir: tempProjectRoot,
      bmadDir: tempBmadDir,
      bmadFolderName: '_bmad',
      indexDocsAuthorityRecords: authorityRecords,
    });

    const artifactEightPath = artifactPathsById.get(8);
    const artifactEightRows = csv.parse(await fs.readFile(artifactEightPath, 'utf8'), {
      columns: true,
      skip_empty_lines: true,
    });
    const artifactSixInventoryRow = artifactEightRows.find((row) => row.artifactId === '6');
    if (artifactSixInventoryRow) {
      artifactSixInventoryRow.artifactPath = 'validation/index-docs/drifted-command-label-report.csv';
    }
    await writeCsv(
      artifactEightPath,
      ['rowIdentity', 'artifactId', 'artifactPath', 'artifactType', 'required', 'rowCount', 'exists', 'schemaVersion', 'status'],
      artifactEightRows,
    );
    try {
      await harness.validateGeneratedArtifacts({ projectDir: tempProjectRoot });
      assert(false, 'Index-docs validation harness rejects inventory deterministic-identifier drift');
    } catch (error) {
      assert(
        error.code === INDEX_DOCS_VALIDATION_ERROR_CODES.REQUIRED_ROW_MISSING,
        'Index-docs validation harness emits deterministic inventory-row validation error code',
      );
    }

    await harness.generateAndValidate({
      projectDir: tempProjectRoot,
      bmadDir: tempBmadDir,
      bmadFolderName: '_bmad',
      indexDocsAuthorityRecords: authorityRecords,
    });

    const artifactTwoPath = artifactPathsById.get(2);
    const artifactTwoRows = csv.parse(await fs.readFile(artifactTwoPath, 'utf8'), {
      columns: true,
      skip_empty_lines: true,
    });
    const filteredAuthorityRows = artifactTwoRows.filter((row) => row.recordType !== 'source-body-authority');
    await writeCsv(
      artifactTwoPath,
      ['rowIdentity', 'recordType', 'canonicalId', 'authoritativePresenceKey', 'authoritySourceType', 'authoritySourcePath', 'status'],
      filteredAuthorityRows,
    );
    try {
      await harness.validateGeneratedArtifacts({ projectDir: tempProjectRoot });
      assert(false, 'Index-docs validation harness rejects missing source-body authority records');
    } catch (error) {
      assert(
        error.code === INDEX_DOCS_VALIDATION_ERROR_CODES.REQUIRED_ROW_MISSING,
        'Index-docs validation harness emits deterministic missing-row error code',
      );
    }
  } catch (error) {
    assert(false, 'Index-docs validation artifact suite setup', error.message);
  } finally {
    await fs.remove(tempIndexDocsValidationHarnessRoot);
  }

  console.log('');
};
