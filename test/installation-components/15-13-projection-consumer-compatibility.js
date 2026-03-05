/**
 * Installation component 13: Projection Consumer Compatibility
 */
module.exports = async function runSuite(context) {
  const {
    path,
    os,
    fs,
    TaskToolCommandGenerator,
    GitHubCopilotSetup,
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
    colors,
    assert,
  } = context;

  console.log(`${colors.yellow}Test Suite 13: Projection Consumer Compatibility${colors.reset}\n`);

  const tempCompatibilityRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bmad-projection-compatibility-'));
  try {
    const tempCompatibilityConfigDir = path.join(tempCompatibilityRoot, '_config');
    await fs.ensureDir(tempCompatibilityConfigDir);

    const buildCsvLine = (columns, row) =>
      columns
        .map((column) => {
          const value = String(row[column] ?? '');
          return value.includes(',') ? `"${value.replaceAll('"', '""')}"` : value;
        })
        .join(',');

    const taskManifestColumns = [
      ...TASK_MANIFEST_COMPATIBILITY_PREFIX_COLUMNS,
      ...TASK_MANIFEST_CANONICAL_ADDITIVE_COLUMNS,
      'futureAdditiveField',
    ];
    const validTaskRows = [
      {
        name: 'help',
        displayName: 'help',
        description: 'Help command',
        module: 'core',
        path: '{project-root}/_bmad/core/tasks/help.md',
        standalone: 'true',
        legacyName: 'help',
        canonicalId: 'bmad-help',
        authoritySourceType: 'sidecar',
        authoritySourcePath: 'bmad-fork/src/core/tasks/help.artifact.yaml',
        futureAdditiveField: 'canonical-additive',
      },
      {
        name: 'create-story',
        displayName: 'Create Story',
        description: 'Create a dedicated story file',
        module: 'bmm',
        path: '{project-root}/_bmad/bmm/workflows/2-creation/create-story/workflow.yaml',
        standalone: 'true',
        legacyName: 'create-story',
        canonicalId: '',
        authoritySourceType: '',
        authoritySourcePath: '',
        futureAdditiveField: 'canonical-additive',
      },
    ];
    const validTaskManifestCsv =
      [taskManifestColumns.join(','), ...validTaskRows.map((row) => buildCsvLine(taskManifestColumns, row))].join('\n') + '\n';
    await fs.writeFile(path.join(tempCompatibilityConfigDir, 'task-manifest.csv'), validTaskManifestCsv, 'utf8');

    const validatedTaskSurface = validateTaskManifestCompatibilitySurface(validTaskManifestCsv, {
      sourcePath: '_bmad/_config/task-manifest.csv',
    });
    assert(
      validatedTaskSurface.headerColumns[0] === 'name' &&
        validatedTaskSurface.headerColumns[TASK_MANIFEST_COMPATIBILITY_PREFIX_COLUMNS.length] === 'legacyName',
      'Task-manifest compatibility validator enforces locked prefix plus additive canonical ordering',
    );
    assert(
      validatedTaskSurface.headerColumns.at(-1) === 'futureAdditiveField',
      'Task-manifest compatibility validator allows additive columns appended after locked canonical columns',
    );

    validateTaskManifestLoaderEntries(validatedTaskSurface.rows, {
      sourcePath: '_bmad/_config/task-manifest.csv',
      headerColumns: validatedTaskSurface.headerColumns,
    });
    assert(true, 'Task-manifest loader compatibility validator accepts known loader columns with additive fields');

    const taskToolGenerator = new TaskToolCommandGenerator();
    const loadedTaskRows = await taskToolGenerator.loadTaskManifest(tempCompatibilityRoot);
    assert(
      Array.isArray(loadedTaskRows) &&
        loadedTaskRows.length === 2 &&
        loadedTaskRows[0].name === 'help' &&
        loadedTaskRows[1].name === 'create-story',
      'Task-manifest loader remains parseable when additive columns are present',
    );

    const legacyTaskManifestColumns = [...TASK_MANIFEST_COMPATIBILITY_PREFIX_COLUMNS];
    const legacyTaskManifestCsv =
      [legacyTaskManifestColumns.join(','), buildCsvLine(legacyTaskManifestColumns, validTaskRows[0])].join('\n') + '\n';
    const legacyTaskSurface = validateTaskManifestCompatibilitySurface(legacyTaskManifestCsv, {
      sourcePath: '_bmad/_config/task-manifest.csv',
      allowLegacyPrefixOnly: true,
    });
    assert(
      legacyTaskSurface.isLegacyPrefixOnlyHeader === true,
      'Task-manifest compatibility validator supports legacy prefix-only headers during migration reads',
    );
    try {
      validateTaskManifestCompatibilitySurface(legacyTaskManifestCsv, {
        sourcePath: '_bmad/_config/task-manifest.csv',
      });
      assert(false, 'Task-manifest strict validator rejects legacy prefix-only header without migration mode');
    } catch (error) {
      assert(
        error.code === PROJECTION_COMPATIBILITY_ERROR_CODES.TASK_MANIFEST_HEADER_CANONICAL_MISMATCH,
        'Task-manifest strict validator emits deterministic canonical mismatch error for legacy prefix-only headers',
      );
    }

    const reorderedTaskManifestColumns = [...taskManifestColumns];
    [reorderedTaskManifestColumns[0], reorderedTaskManifestColumns[1]] = [reorderedTaskManifestColumns[1], reorderedTaskManifestColumns[0]];
    const invalidTaskManifestCsv =
      [reorderedTaskManifestColumns.join(','), buildCsvLine(reorderedTaskManifestColumns, validTaskRows[0])].join('\n') + '\n';
    try {
      validateTaskManifestCompatibilitySurface(invalidTaskManifestCsv, {
        sourcePath: '_bmad/_config/task-manifest.csv',
      });
      assert(false, 'Task-manifest validator rejects non-additive reordered compatibility-prefix headers');
    } catch (error) {
      assert(
        error.code === PROJECTION_COMPATIBILITY_ERROR_CODES.TASK_MANIFEST_HEADER_PREFIX_MISMATCH && error.fieldPath === 'header[0]',
        'Task-manifest validator emits deterministic diagnostics for reordered compatibility-prefix headers',
      );
    }

    const helpCatalogColumns = [
      ...HELP_CATALOG_COMPATIBILITY_PREFIX_COLUMNS,
      ...HELP_CATALOG_CANONICAL_ADDITIVE_COLUMNS,
      'futureAdditiveField',
    ];
    const validHelpRows = [
      {
        module: 'core',
        phase: 'anytime',
        name: 'bmad-help',
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
        description: 'Help command',
        'output-location': '',
        outputs: '',
        futureAdditiveField: 'canonical-additive',
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
        description: 'Shard document command',
        'output-location': '',
        outputs: '',
        futureAdditiveField: 'canonical-additive',
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
        description: 'Index docs command',
        'output-location': '',
        outputs: '',
        futureAdditiveField: 'canonical-additive',
      },
      {
        module: 'bmm',
        phase: 'planning',
        name: 'create-story',
        code: 'CS',
        sequence: '',
        'workflow-file': '_bmad/bmm/workflows/2-creation/create-story/workflow.yaml',
        command: 'bmad-bmm-create-story',
        required: 'false',
        'agent-name': 'sm',
        'agent-command': 'bmad:agent:sm',
        'agent-display-name': 'Scrum Master',
        'agent-title': 'SM',
        options: '',
        description: 'Create next story',
        'output-location': '',
        outputs: '',
        futureAdditiveField: 'canonical-additive',
      },
    ];
    const validHelpCatalogCsv =
      [helpCatalogColumns.join(','), ...validHelpRows.map((row) => buildCsvLine(helpCatalogColumns, row))].join('\n') + '\n';
    await fs.writeFile(path.join(tempCompatibilityConfigDir, 'bmad-help.csv'), validHelpCatalogCsv, 'utf8');

    const validatedHelpSurface = validateHelpCatalogCompatibilitySurface(validHelpCatalogCsv, {
      sourcePath: '_bmad/_config/bmad-help.csv',
    });
    assert(
      validatedHelpSurface.headerColumns[5] === 'workflow-file' && validatedHelpSurface.headerColumns[6] === 'command',
      'Help-catalog compatibility validator preserves workflow-file and command compatibility columns',
    );
    assert(
      validatedHelpSurface.headerColumns.at(-1) === 'futureAdditiveField',
      'Help-catalog compatibility validator allows additive columns appended after locked canonical columns',
    );

    validateHelpCatalogLoaderEntries(validatedHelpSurface.rows, {
      sourcePath: '_bmad/_config/bmad-help.csv',
      headerColumns: validatedHelpSurface.headerColumns,
    });
    validateGithubCopilotHelpLoaderEntries(validatedHelpSurface.rows, {
      sourcePath: '_bmad/_config/bmad-help.csv',
      headerColumns: validatedHelpSurface.headerColumns,
    });
    assert(true, 'Help-catalog and GitHub Copilot loader compatibility validators accept stable command/workflow-file contracts');

    const githubCopilotSetup = new GitHubCopilotSetup();
    const loadedHelpRows = await githubCopilotSetup.loadBmadHelp(tempCompatibilityRoot);
    assert(
      Array.isArray(loadedHelpRows) &&
        loadedHelpRows.length === 4 &&
        loadedHelpRows.some((row) => row['workflow-file'] === '_bmad/core/tasks/help.md' && row.command === 'bmad-help') &&
        loadedHelpRows.some((row) => row['workflow-file'] === '_bmad/core/tasks/shard-doc.xml' && row.command === 'bmad-shard-doc') &&
        loadedHelpRows.some((row) => row['workflow-file'] === '_bmad/core/tasks/index-docs.xml' && row.command === 'bmad-index-docs'),
      'GitHub Copilot help loader remains parseable with additive help-catalog columns',
    );

    const reorderedHelpCatalogColumns = [...helpCatalogColumns];
    [reorderedHelpCatalogColumns[5], reorderedHelpCatalogColumns[6]] = [reorderedHelpCatalogColumns[6], reorderedHelpCatalogColumns[5]];
    const invalidHelpCatalogCsv =
      [reorderedHelpCatalogColumns.join(','), buildCsvLine(reorderedHelpCatalogColumns, validHelpRows[0])].join('\n') + '\n';
    try {
      validateHelpCatalogCompatibilitySurface(invalidHelpCatalogCsv, {
        sourcePath: '_bmad/_config/bmad-help.csv',
      });
      assert(false, 'Help-catalog validator rejects non-additive reordered compatibility headers');
    } catch (error) {
      assert(
        error.code === PROJECTION_COMPATIBILITY_ERROR_CODES.HELP_CATALOG_HEADER_PREFIX_MISMATCH && error.fieldPath === 'header[5]',
        'Help-catalog validator emits deterministic diagnostics for reordered compatibility headers',
      );
    }

    const missingShardDocRows = validHelpRows.filter((row) => row.command !== 'bmad-shard-doc');
    const missingShardDocCsv =
      [helpCatalogColumns.join(','), ...missingShardDocRows.map((row) => buildCsvLine(helpCatalogColumns, row))].join('\n') + '\n';
    try {
      validateHelpCatalogCompatibilitySurface(missingShardDocCsv, {
        sourcePath: '_bmad/_config/bmad-help.csv',
      });
      assert(false, 'Help-catalog validator rejects missing shard-doc canonical command rows');
    } catch (error) {
      assert(
        error.code === PROJECTION_COMPATIBILITY_ERROR_CODES.HELP_CATALOG_SHARD_DOC_ROW_CONTRACT_FAILED &&
          error.fieldPath === 'rows[*].command' &&
          error.observedValue === '0',
        'Help-catalog validator emits deterministic diagnostics for missing shard-doc canonical command rows',
      );
    }

    const missingIndexDocsRows = validHelpRows.filter((row) => row.command !== 'bmad-index-docs');
    const missingIndexDocsCsv =
      [helpCatalogColumns.join(','), ...missingIndexDocsRows.map((row) => buildCsvLine(helpCatalogColumns, row))].join('\n') + '\n';
    try {
      validateHelpCatalogCompatibilitySurface(missingIndexDocsCsv, {
        sourcePath: '_bmad/_config/bmad-help.csv',
      });
      assert(false, 'Help-catalog validator rejects missing index-docs canonical command rows');
    } catch (error) {
      assert(
        error.code === PROJECTION_COMPATIBILITY_ERROR_CODES.HELP_CATALOG_INDEX_DOCS_ROW_CONTRACT_FAILED &&
          error.fieldPath === 'rows[*].command' &&
          error.observedValue === '0',
        'Help-catalog validator emits deterministic diagnostics for missing index-docs canonical command rows',
      );
    }

    const shardDocBaselineRow = validHelpRows.find((row) => row.command === 'bmad-shard-doc');
    const duplicateShardDocCsv =
      [
        helpCatalogColumns.join(','),
        ...[...validHelpRows, { ...shardDocBaselineRow, name: 'Shard Document Duplicate' }].map((row) =>
          buildCsvLine(helpCatalogColumns, row),
        ),
      ].join('\n') + '\n';
    try {
      validateHelpCatalogCompatibilitySurface(duplicateShardDocCsv, {
        sourcePath: '_bmad/_config/bmad-help.csv',
      });
      assert(false, 'Help-catalog validator rejects duplicate shard-doc canonical command rows');
    } catch (error) {
      assert(
        error.code === PROJECTION_COMPATIBILITY_ERROR_CODES.HELP_CATALOG_SHARD_DOC_ROW_CONTRACT_FAILED &&
          error.fieldPath === 'rows[*].command' &&
          error.observedValue === '2',
        'Help-catalog validator emits deterministic diagnostics for duplicate shard-doc canonical command rows',
      );
    }

    const missingWorkflowFileRows = [
      {
        ...validHelpRows[0],
        'workflow-file': '',
        command: 'bmad-help',
      },
    ];
    const missingWorkflowFileCsv =
      [helpCatalogColumns.join(','), ...missingWorkflowFileRows.map((row) => buildCsvLine(helpCatalogColumns, row))].join('\n') + '\n';
    await fs.writeFile(path.join(tempCompatibilityConfigDir, 'bmad-help.csv'), missingWorkflowFileCsv, 'utf8');
    try {
      await githubCopilotSetup.loadBmadHelp(tempCompatibilityRoot);
      assert(false, 'GitHub Copilot help loader rejects rows that drop workflow-file while keeping command values');
    } catch (error) {
      assert(
        error.code === PROJECTION_COMPATIBILITY_ERROR_CODES.GITHUB_COPILOT_WORKFLOW_FILE_MISSING &&
          error.fieldPath === 'rows[0].workflow-file',
        'GitHub Copilot help loader emits deterministic diagnostics for missing workflow-file compatibility breaks',
      );
    }
  } catch (error) {
    assert(false, 'Projection compatibility suite setup', error.message);
  } finally {
    await fs.remove(tempCompatibilityRoot);
  }

  console.log('');
};
