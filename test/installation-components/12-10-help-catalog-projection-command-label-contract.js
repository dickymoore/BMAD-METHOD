/**
 * Installation component 10: Help Catalog Projection + Command Label Contract
 */
module.exports = async function runSuite(context) {
  const {
    path,
    os,
    fs,
    yaml,
    csv,
    Installer,
    HELP_CATALOG_GENERATION_ERROR_CODES,
    EXEMPLAR_HELP_CATALOG_AUTHORITY_SOURCE_PATH,
    EXEMPLAR_HELP_CATALOG_ISSUING_COMPONENT,
    INSTALLER_HELP_CATALOG_MERGE_COMPONENT,
    buildSidecarAwareExemplarHelpRow,
    evaluateExemplarCommandLabelReportRows,
    PROJECTION_COMPATIBILITY_ERROR_CODES,
    validateCommandDocSurfaceConsistency,
    colors,
    assert,
    projectRoot,
  } = context;

  console.log(`${colors.yellow}Test Suite 10: Help Catalog Projection + Command Label Contract${colors.reset}\n`);

  const tempHelpCatalogRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bmad-help-catalog-projection-'));
  try {
    const installer = new Installer();
    installer.helpAuthorityRecords = [
      {
        recordType: 'metadata-authority',
        canonicalId: 'bmad-help',
        authoritativePresenceKey: 'capability:bmad-help',
        authoritySourceType: 'sidecar',
        authoritySourcePath: 'bmad-fork/src/core/tasks/help.artifact.yaml',
        sourcePath: 'bmad-fork/src/core/tasks/help.md',
      },
    ];

    const sidecarAwareExemplar = await buildSidecarAwareExemplarHelpRow({
      helpAuthorityRecords: installer.helpAuthorityRecords,
    });
    assert(
      sidecarAwareExemplar.commandValue === 'bmad-help',
      'Sidecar-aware exemplar help row derives raw command from canonical identity',
    );
    assert(
      sidecarAwareExemplar.displayedCommandLabel === '/bmad-help',
      'Sidecar-aware exemplar help row renders displayed label with exactly one leading slash',
    );
    assert(
      sidecarAwareExemplar.authoritySourcePath === EXEMPLAR_HELP_CATALOG_AUTHORITY_SOURCE_PATH,
      'Sidecar-aware exemplar help row locks authority source path to sidecar metadata file',
    );

    const legacySidecarPath = path.join(tempHelpCatalogRoot, 'legacy-help.artifact.yaml');
    await fs.writeFile(
      legacySidecarPath,
      yaml.stringify({
        schemaVersion: 1,
        canonicalId: 'help',
        artifactType: 'task',
        module: 'core',
        sourcePath: 'bmad-fork/src/core/tasks/help.md',
        displayName: 'help',
        description: 'Legacy exemplar alias canonical id',
        dependencies: { requires: [] },
      }),
      'utf8',
    );
    const legacyIdentityExemplar = await buildSidecarAwareExemplarHelpRow({
      sidecarPath: legacySidecarPath,
      helpAuthorityRecords: installer.helpAuthorityRecords,
    });
    assert(
      legacyIdentityExemplar.commandValue === 'bmad-help',
      'Sidecar-aware exemplar help row normalizes legacy sidecar canonicalId to locked canonical identity',
    );

    await installer.mergeModuleHelpCatalogs(tempHelpCatalogRoot);

    const generatedHelpPath = path.join(tempHelpCatalogRoot, '_config', 'bmad-help.csv');
    const generatedCommandLabelReportPath = path.join(tempHelpCatalogRoot, '_config', 'bmad-help-command-label-report.csv');
    const generatedPipelineReportPath = path.join(tempHelpCatalogRoot, '_config', 'bmad-help-catalog-pipeline.csv');
    const generatedHelpRaw = await fs.readFile(generatedHelpPath, 'utf8');
    const generatedHelpLines = generatedHelpRaw.trim().split('\n');
    const expectedHelpHeader =
      'module,phase,name,code,sequence,workflow-file,command,required,agent-name,agent-command,agent-display-name,agent-title,options,description,output-location,outputs';
    assert(generatedHelpLines[0] === expectedHelpHeader, 'Help catalog header remains additive-compatible for existing consumers');

    const generatedHelpRows = csv.parse(generatedHelpRaw, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const exemplarRows = generatedHelpRows.filter((row) => row.command === 'bmad-help');
    const shardDocRows = generatedHelpRows.filter((row) => row.command === 'bmad-shard-doc');
    const indexDocsRows = generatedHelpRows.filter((row) => row.command === 'bmad-index-docs');
    assert(exemplarRows.length === 1, 'Help catalog emits exactly one exemplar raw command row for bmad-help');
    assert(
      exemplarRows[0] && exemplarRows[0].name === 'bmad-help',
      'Help catalog exemplar row preserves locked bmad-help workflow identity',
    );
    assert(shardDocRows.length === 1, 'Help catalog emits exactly one shard-doc raw command row for bmad-shard-doc');
    assert(
      shardDocRows[0] && shardDocRows[0]['workflow-file'] === '_bmad/core/tasks/shard-doc.xml',
      'Help catalog shard-doc row preserves locked shard-doc workflow identity',
    );
    assert(indexDocsRows.length === 1, 'Help catalog emits exactly one index-docs raw command row for bmad-index-docs');
    assert(
      indexDocsRows[0] && indexDocsRows[0]['workflow-file'] === '_bmad/core/tasks/index-docs.xml',
      'Help catalog index-docs row preserves locked index-docs workflow identity',
    );

    const sidecarRaw = await fs.readFile(path.join(projectRoot, 'src', 'core', 'tasks', 'help.artifact.yaml'), 'utf8');
    const sidecarData = yaml.parse(sidecarRaw);
    assert(
      exemplarRows[0] && exemplarRows[0].description === sidecarData.description,
      'Help catalog exemplar row description is sourced from sidecar metadata',
    );

    const commandLabelRows = installer.helpCatalogCommandLabelReportRows || [];
    const helpCommandLabelRow = commandLabelRows.find((row) => row.canonicalId === 'bmad-help');
    const shardDocCommandLabelRow = commandLabelRows.find((row) => row.canonicalId === 'bmad-shard-doc');
    const indexDocsCommandLabelRow = commandLabelRows.find((row) => row.canonicalId === 'bmad-index-docs');
    assert(commandLabelRows.length === 3, 'Installer emits command-label report rows for help, shard-doc, and index-docs canonical ids');
    assert(
      helpCommandLabelRow &&
        helpCommandLabelRow.rawCommandValue === 'bmad-help' &&
        helpCommandLabelRow.displayedCommandLabel === '/bmad-help',
      'Command-label report locks raw and displayed command values for exemplar',
    );
    assert(
      helpCommandLabelRow &&
        helpCommandLabelRow.authoritySourceType === 'sidecar' &&
        helpCommandLabelRow.authoritySourcePath === 'bmad-fork/src/core/tasks/help.artifact.yaml',
      'Command-label report includes sidecar provenance linkage',
    );
    assert(
      shardDocCommandLabelRow &&
        shardDocCommandLabelRow.rawCommandValue === 'bmad-shard-doc' &&
        shardDocCommandLabelRow.displayedCommandLabel === '/bmad-shard-doc',
      'Command-label report locks raw and displayed command values for shard-doc',
    );
    assert(
      shardDocCommandLabelRow &&
        shardDocCommandLabelRow.authoritySourceType === 'sidecar' &&
        shardDocCommandLabelRow.authoritySourcePath === 'bmad-fork/src/core/tasks/shard-doc.artifact.yaml',
      'Command-label report includes shard-doc sidecar provenance linkage',
    );
    assert(
      indexDocsCommandLabelRow &&
        indexDocsCommandLabelRow.rawCommandValue === 'bmad-index-docs' &&
        indexDocsCommandLabelRow.displayedCommandLabel === '/bmad-index-docs',
      'Command-label report locks raw and displayed command values for index-docs',
    );
    assert(
      indexDocsCommandLabelRow &&
        indexDocsCommandLabelRow.authoritySourceType === 'sidecar' &&
        indexDocsCommandLabelRow.authoritySourcePath === 'bmad-fork/src/core/tasks/index-docs.artifact.yaml',
      'Command-label report includes index-docs sidecar provenance linkage',
    );
    const generatedCommandLabelReportRaw = await fs.readFile(generatedCommandLabelReportPath, 'utf8');
    const generatedCommandLabelReportRows = csv.parse(generatedCommandLabelReportRaw, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    const generatedHelpCommandLabelRow = generatedCommandLabelReportRows.find((row) => row.canonicalId === 'bmad-help');
    const generatedShardDocCommandLabelRow = generatedCommandLabelReportRows.find((row) => row.canonicalId === 'bmad-shard-doc');
    const generatedIndexDocsCommandLabelRow = generatedCommandLabelReportRows.find((row) => row.canonicalId === 'bmad-index-docs');
    assert(
      generatedCommandLabelReportRows.length === 3 &&
        generatedHelpCommandLabelRow &&
        generatedHelpCommandLabelRow.displayedCommandLabel === '/bmad-help' &&
        generatedHelpCommandLabelRow.rowCountForCanonicalId === '1' &&
        generatedShardDocCommandLabelRow &&
        generatedShardDocCommandLabelRow.displayedCommandLabel === '/bmad-shard-doc' &&
        generatedShardDocCommandLabelRow.rowCountForCanonicalId === '1' &&
        generatedIndexDocsCommandLabelRow &&
        generatedIndexDocsCommandLabelRow.displayedCommandLabel === '/bmad-index-docs' &&
        generatedIndexDocsCommandLabelRow.rowCountForCanonicalId === '1',
      'Installer persists command-label report artifact with locked help, shard-doc, and index-docs label contract values',
    );

    const baselineLabelContract = evaluateExemplarCommandLabelReportRows(commandLabelRows);
    assert(
      baselineLabelContract.valid,
      'Command-label validator passes when exactly one exemplar /bmad-help displayed label row exists',
      baselineLabelContract.reason,
    );
    const baselineShardDocLabelContract = evaluateExemplarCommandLabelReportRows(commandLabelRows, {
      canonicalId: 'bmad-shard-doc',
      displayedCommandLabel: '/bmad-shard-doc',
      authoritySourcePath: 'bmad-fork/src/core/tasks/shard-doc.artifact.yaml',
    });
    assert(
      baselineShardDocLabelContract.valid,
      'Command-label validator passes when exactly one /bmad-shard-doc displayed label row exists',
      baselineShardDocLabelContract.reason,
    );
    const baselineIndexDocsLabelContract = evaluateExemplarCommandLabelReportRows(commandLabelRows, {
      canonicalId: 'bmad-index-docs',
      displayedCommandLabel: '/bmad-index-docs',
      authoritySourcePath: 'bmad-fork/src/core/tasks/index-docs.artifact.yaml',
    });
    assert(
      baselineIndexDocsLabelContract.valid,
      'Command-label validator passes when exactly one /bmad-index-docs displayed label row exists',
      baselineIndexDocsLabelContract.reason,
    );

    const commandDocsSourcePath = path.join(projectRoot, 'docs', 'reference', 'commands.md');
    const commandDocsMarkdown = await fs.readFile(commandDocsSourcePath, 'utf8');
    const commandDocConsistency = validateCommandDocSurfaceConsistency(commandDocsMarkdown, {
      sourcePath: 'docs/reference/commands.md',
      generatedSurfacePath: '_bmad/_config/bmad-help-command-label-report.csv',
      commandLabelRows,
      canonicalId: 'bmad-shard-doc',
      expectedDisplayedCommandLabel: '/bmad-shard-doc',
      disallowedAliasLabels: ['/shard-doc'],
    });
    assert(
      commandDocConsistency.generatedCanonicalCommand === '/bmad-shard-doc',
      'Command-doc consistency validator passes when generated shard-doc command matches command docs canonical label',
    );

    const missingCanonicalCommandDocsMarkdown = commandDocsMarkdown.replace(
      '| `/bmad-shard-doc` | Split a large markdown file into smaller sections |',
      '| `/bmad-shard-doc-renamed` | Split a large markdown file into smaller sections |',
    );
    try {
      validateCommandDocSurfaceConsistency(missingCanonicalCommandDocsMarkdown, {
        sourcePath: 'docs/reference/commands.md',
        generatedSurfacePath: '_bmad/_config/bmad-help-command-label-report.csv',
        commandLabelRows,
        canonicalId: 'bmad-shard-doc',
        expectedDisplayedCommandLabel: '/bmad-shard-doc',
        disallowedAliasLabels: ['/shard-doc'],
      });
      assert(false, 'Command-doc consistency validator rejects missing canonical shard-doc command rows');
    } catch (error) {
      assert(
        error.code === PROJECTION_COMPATIBILITY_ERROR_CODES.COMMAND_DOC_CANONICAL_COMMAND_MISSING,
        'Command-doc consistency validator emits deterministic diagnostics for missing canonical shard-doc command docs row',
        `Expected ${PROJECTION_COMPATIBILITY_ERROR_CODES.COMMAND_DOC_CANONICAL_COMMAND_MISSING}, got ${error.code}`,
      );
    }

    const aliasAmbiguousCommandDocsMarkdown = `${commandDocsMarkdown}\n| \`/shard-doc\` | Legacy alias |\n`;
    try {
      validateCommandDocSurfaceConsistency(aliasAmbiguousCommandDocsMarkdown, {
        sourcePath: 'docs/reference/commands.md',
        generatedSurfacePath: '_bmad/_config/bmad-help-command-label-report.csv',
        commandLabelRows,
        canonicalId: 'bmad-shard-doc',
        expectedDisplayedCommandLabel: '/bmad-shard-doc',
        disallowedAliasLabels: ['/shard-doc'],
      });
      assert(false, 'Command-doc consistency validator rejects shard-doc alias ambiguity in command docs');
    } catch (error) {
      assert(
        error.code === PROJECTION_COMPATIBILITY_ERROR_CODES.COMMAND_DOC_ALIAS_AMBIGUOUS,
        'Command-doc consistency validator emits deterministic diagnostics for shard-doc alias ambiguity in command docs',
        `Expected ${PROJECTION_COMPATIBILITY_ERROR_CODES.COMMAND_DOC_ALIAS_AMBIGUOUS}, got ${error.code}`,
      );
    }

    try {
      validateCommandDocSurfaceConsistency(commandDocsMarkdown, {
        sourcePath: 'docs/reference/commands.md',
        generatedSurfacePath: '_bmad/_config/bmad-help-command-label-report.csv',
        commandLabelRows: [
          helpCommandLabelRow,
          {
            ...shardDocCommandLabelRow,
            displayedCommandLabel: '/shard-doc',
          },
        ],
        canonicalId: 'bmad-shard-doc',
        expectedDisplayedCommandLabel: '/bmad-shard-doc',
        disallowedAliasLabels: ['/shard-doc'],
      });
      assert(false, 'Command-doc consistency validator rejects generated shard-doc command-label drift');
    } catch (error) {
      assert(
        error.code === PROJECTION_COMPATIBILITY_ERROR_CODES.COMMAND_DOC_GENERATED_SURFACE_MISMATCH,
        'Command-doc consistency validator emits deterministic diagnostics for generated shard-doc command-label drift',
        `Expected ${PROJECTION_COMPATIBILITY_ERROR_CODES.COMMAND_DOC_GENERATED_SURFACE_MISMATCH}, got ${error.code}`,
      );
    }

    const invalidLegacyLabelContract = evaluateExemplarCommandLabelReportRows([
      {
        ...helpCommandLabelRow,
        displayedCommandLabel: 'help',
      },
    ]);
    assert(
      !invalidLegacyLabelContract.valid && invalidLegacyLabelContract.reason === 'invalid-displayed-label:help',
      'Command-label validator fails on alternate displayed label form "help"',
    );

    const invalidSlashHelpLabelContract = evaluateExemplarCommandLabelReportRows([
      {
        ...helpCommandLabelRow,
        displayedCommandLabel: '/help',
      },
    ]);
    assert(
      !invalidSlashHelpLabelContract.valid && invalidSlashHelpLabelContract.reason === 'invalid-displayed-label:/help',
      'Command-label validator fails on alternate displayed label form "/help"',
    );

    const invalidShardDocLabelContract = evaluateExemplarCommandLabelReportRows(
      [
        helpCommandLabelRow,
        {
          ...shardDocCommandLabelRow,
          displayedCommandLabel: '/shard-doc',
        },
      ],
      {
        canonicalId: 'bmad-shard-doc',
        displayedCommandLabel: '/bmad-shard-doc',
        authoritySourcePath: 'bmad-fork/src/core/tasks/shard-doc.artifact.yaml',
      },
    );
    assert(
      !invalidShardDocLabelContract.valid && invalidShardDocLabelContract.reason === 'invalid-displayed-label:/shard-doc',
      'Command-label validator fails on alternate shard-doc displayed label form "/shard-doc"',
    );

    const pipelineRows = installer.helpCatalogPipelineRows || [];
    assert(pipelineRows.length === 2, 'Installer emits two stage rows for help catalog pipeline evidence linkage');
    const installedStageRow = pipelineRows.find((row) => row.stage === 'installed-compatibility-row');
    const mergedStageRow = pipelineRows.find((row) => row.stage === 'merged-config-row');

    assert(
      installedStageRow &&
        installedStageRow.issuingComponent === EXEMPLAR_HELP_CATALOG_ISSUING_COMPONENT &&
        installedStageRow.commandAuthoritySourceType === 'sidecar' &&
        installedStageRow.commandAuthoritySourcePath === 'bmad-fork/src/core/tasks/help.artifact.yaml',
      'Installed compatibility stage row preserves sidecar command provenance and issuing component linkage',
    );
    assert(
      mergedStageRow &&
        mergedStageRow.issuingComponent === INSTALLER_HELP_CATALOG_MERGE_COMPONENT &&
        mergedStageRow.commandAuthoritySourceType === 'sidecar' &&
        mergedStageRow.commandAuthoritySourcePath === 'bmad-fork/src/core/tasks/help.artifact.yaml',
      'Merged config stage row preserves sidecar command provenance and merge issuing component linkage',
    );
    assert(
      pipelineRows.every((row) => row.status === 'PASS' && typeof row.issuingComponentBindingEvidence === 'string'),
      'Pipeline rows include deterministic PASS status and non-empty issuing-component evidence linkage',
    );
    const generatedPipelineReportRaw = await fs.readFile(generatedPipelineReportPath, 'utf8');
    const generatedPipelineReportRows = csv.parse(generatedPipelineReportRaw, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    assert(
      generatedPipelineReportRows.length === 2 &&
        generatedPipelineReportRows.every(
          (row) =>
            row.commandAuthoritySourceType === 'sidecar' &&
            row.commandAuthoritySourcePath === 'bmad-fork/src/core/tasks/help.artifact.yaml',
        ),
      'Installer persists pipeline stage artifact with sidecar command provenance linkage for both stages',
    );

    const tempAltLabelRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bmad-help-catalog-alt-label-'));
    try {
      const moduleDir = path.join(tempAltLabelRoot, 'modx');
      await fs.ensureDir(moduleDir);
      await fs.writeFile(
        path.join(moduleDir, 'module-help.csv'),
        [
          'module,phase,name,code,sequence,workflow-file,command,required,agent,options,description,output-location,outputs',
          'modx,anytime,alt-help,AH,,_bmad/core/tasks/help.md,/help,false,,,Alt help label,,,',
        ].join('\n') + '\n',
        'utf8',
      );

      const alternateLabelInstaller = new Installer();
      alternateLabelInstaller.helpAuthorityRecords = installer.helpAuthorityRecords;
      try {
        await alternateLabelInstaller.mergeModuleHelpCatalogs(tempAltLabelRoot);
        assert(
          false,
          'Installer command-label contract rejects alternate rendered labels in merged help catalog',
          'Expected command label contract failure for /help but merge succeeded',
        );
      } catch (error) {
        assert(
          error.code === HELP_CATALOG_GENERATION_ERROR_CODES.COMMAND_LABEL_CONTRACT_FAILED,
          'Installer command-label contract returns deterministic failure code for alternate labels',
          `Expected ${HELP_CATALOG_GENERATION_ERROR_CODES.COMMAND_LABEL_CONTRACT_FAILED}, got ${error.code}`,
        );
      }
    } finally {
      await fs.remove(tempAltLabelRoot);
    }
  } catch (error) {
    assert(false, 'Help catalog projection suite setup', error.message);
  } finally {
    await fs.remove(tempHelpCatalogRoot);
  }

  console.log('');
};
