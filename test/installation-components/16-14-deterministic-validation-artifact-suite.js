/**
 * Installation component 14: Deterministic Validation Artifact Suite
 */
module.exports = async function runSuite(context) {
  const {
    path,
    os,
    fs,
    yaml,
    csv,
    Installer,
    TASK_MANIFEST_COMPATIBILITY_PREFIX_COLUMNS,
    TASK_MANIFEST_CANONICAL_ADDITIVE_COLUMNS,
    HELP_CATALOG_COMPATIBILITY_PREFIX_COLUMNS,
    HELP_CATALOG_CANONICAL_ADDITIVE_COLUMNS,
    HELP_VALIDATION_ERROR_CODES,
    HELP_VALIDATION_ARTIFACT_REGISTRY,
    HelpValidationHarness,
    colors,
    assert,
  } = context;

  console.log(`${colors.yellow}Test Suite 14: Deterministic Validation Artifact Suite${colors.reset}\n`);

  const tempValidationHarnessRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bmad-help-validation-suite-'));
  try {
    const tempProjectRoot = tempValidationHarnessRoot;
    const tempBmadDir = path.join(tempProjectRoot, '_bmad');
    const tempConfigDir = path.join(tempBmadDir, '_config');
    const tempSourceTasksDir = path.join(tempProjectRoot, 'bmad-fork', 'src', 'core', 'tasks');
    const tempSkillDir = path.join(tempProjectRoot, '.agents', 'skills', 'bmad-help');

    await fs.ensureDir(tempConfigDir);
    await fs.ensureDir(path.join(tempBmadDir, 'core', 'tasks'));
    await fs.ensureDir(path.join(tempBmadDir, 'core'));
    await fs.ensureDir(tempSourceTasksDir);
    await fs.ensureDir(tempSkillDir);

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

    const sidecarFixture = {
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
    await fs.writeFile(path.join(tempSourceTasksDir, 'help.artifact.yaml'), yaml.stringify(sidecarFixture), 'utf8');
    await fs.writeFile(
      path.join(tempSourceTasksDir, 'help.md'),
      `---\n${yaml
        .stringify({
          name: 'help',
          description: 'Help command',
          canonicalId: 'bmad-help',
          dependencies: { requires: [] },
        })
        .trimEnd()}\n---\n\n# Source Help\n`,
      'utf8',
    );
    await fs.writeFile(
      path.join(tempBmadDir, 'core', 'tasks', 'help.md'),
      `---\n${yaml
        .stringify({
          name: 'help',
          description: 'Help command',
          canonicalId: 'bmad-help',
          dependencies: { requires: [] },
        })
        .trimEnd()}\n---\n\n# Runtime Help\n`,
      'utf8',
    );
    await fs.writeFile(
      path.join(tempSkillDir, 'SKILL.md'),
      `---\n${yaml.stringify({ name: 'bmad-help', description: 'Help command' }).trimEnd()}\n---\n\n# Skill\n`,
      'utf8',
    );

    await writeCsv(
      path.join(tempConfigDir, 'task-manifest.csv'),
      [...TASK_MANIFEST_COMPATIBILITY_PREFIX_COLUMNS, ...TASK_MANIFEST_CANONICAL_ADDITIVE_COLUMNS],
      [
        {
          name: 'help',
          displayName: 'help',
          description: 'Help command',
          module: 'core',
          path: '_bmad/core/tasks/help.md',
          standalone: 'true',
          legacyName: 'help',
          canonicalId: 'bmad-help',
          authoritySourceType: 'sidecar',
          authoritySourcePath: 'bmad-fork/src/core/tasks/help.artifact.yaml',
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
          canonicalId: 'bmad-help',
          alias: 'bmad-help',
          aliasType: 'canonical-id',
          authoritySourceType: 'sidecar',
          authoritySourcePath: 'bmad-fork/src/core/tasks/help.artifact.yaml',
          rowIdentity: 'alias-row:bmad-help:canonical-id',
          normalizedAliasValue: 'bmad-help',
          rawIdentityHasLeadingSlash: 'false',
          resolutionEligibility: 'canonical-id-only',
        },
        {
          canonicalId: 'bmad-help',
          alias: 'help',
          aliasType: 'legacy-name',
          authoritySourceType: 'sidecar',
          authoritySourcePath: 'bmad-fork/src/core/tasks/help.artifact.yaml',
          rowIdentity: 'alias-row:bmad-help:legacy-name',
          normalizedAliasValue: 'help',
          rawIdentityHasLeadingSlash: 'false',
          resolutionEligibility: 'legacy-name-only',
        },
        {
          canonicalId: 'bmad-help',
          alias: '/bmad-help',
          aliasType: 'slash-command',
          authoritySourceType: 'sidecar',
          authoritySourcePath: 'bmad-fork/src/core/tasks/help.artifact.yaml',
          rowIdentity: 'alias-row:bmad-help:slash-command',
          normalizedAliasValue: 'bmad-help',
          rawIdentityHasLeadingSlash: 'true',
          resolutionEligibility: 'slash-command-only',
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
      path.join(tempBmadDir, 'core', 'module-help.csv'),
      [
        'module',
        'phase',
        'name',
        'code',
        'sequence',
        'workflow-file',
        'command',
        'required',
        'agent',
        'options',
        'description',
        'output-location',
        'outputs',
      ],
      [
        {
          module: 'core',
          phase: 'anytime',
          name: 'bmad-help',
          code: 'BH',
          sequence: '',
          'workflow-file': '_bmad/core/tasks/help.md',
          command: 'bmad-help',
          required: 'false',
          agent: '',
          options: '',
          description: 'Help command',
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
          agent: '',
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
          agent: '',
          options: '',
          description:
            'Create lightweight index for quick LLM scanning. Use when LLM needs to understand available docs without loading everything.',
          'output-location': '',
          outputs: '',
        },
      ],
    );
    await writeCsv(
      path.join(tempConfigDir, 'bmad-help-catalog-pipeline.csv'),
      [
        'stage',
        'artifactPath',
        'rowIdentity',
        'canonicalId',
        'sourcePath',
        'rowCountForStageCanonicalId',
        'commandValue',
        'expectedCommandValue',
        'descriptionValue',
        'expectedDescriptionValue',
        'descriptionAuthoritySourceType',
        'descriptionAuthoritySourcePath',
        'commandAuthoritySourceType',
        'commandAuthoritySourcePath',
        'issuerOwnerClass',
        'issuingComponent',
        'issuingComponentBindingEvidence',
        'stageStatus',
        'status',
      ],
      [
        {
          stage: 'installed-compatibility-row',
          artifactPath: '_bmad/core/module-help.csv',
          rowIdentity: 'module-help-row:bmad-help',
          canonicalId: 'bmad-help',
          sourcePath: 'bmad-fork/src/core/tasks/help.md',
          rowCountForStageCanonicalId: '1',
          commandValue: 'bmad-help',
          expectedCommandValue: 'bmad-help',
          descriptionValue: 'Help command',
          expectedDescriptionValue: 'Help command',
          descriptionAuthoritySourceType: 'sidecar',
          descriptionAuthoritySourcePath: 'bmad-fork/src/core/tasks/help.artifact.yaml',
          commandAuthoritySourceType: 'sidecar',
          commandAuthoritySourcePath: 'bmad-fork/src/core/tasks/help.artifact.yaml',
          issuerOwnerClass: 'installer',
          issuingComponent: 'bmad-fork/tools/cli/installers/lib/core/help-catalog-generator.js::buildSidecarAwareExemplarHelpRow()',
          issuingComponentBindingEvidence: 'deterministic',
          stageStatus: 'PASS',
          status: 'PASS',
        },
        {
          stage: 'merged-config-row',
          artifactPath: '_bmad/_config/bmad-help.csv',
          rowIdentity: 'merged-help-row:bmad-help',
          canonicalId: 'bmad-help',
          sourcePath: 'bmad-fork/src/core/tasks/help.md',
          rowCountForStageCanonicalId: '1',
          commandValue: 'bmad-help',
          expectedCommandValue: 'bmad-help',
          descriptionValue: 'Help command',
          expectedDescriptionValue: 'Help command',
          descriptionAuthoritySourceType: 'sidecar',
          descriptionAuthoritySourcePath: 'bmad-fork/src/core/tasks/help.artifact.yaml',
          commandAuthoritySourceType: 'sidecar',
          commandAuthoritySourcePath: 'bmad-fork/src/core/tasks/help.artifact.yaml',
          issuerOwnerClass: 'installer',
          issuingComponent: 'bmad-fork/tools/cli/installers/lib/core/installer.js::mergeModuleHelpCatalogs()',
          issuingComponentBindingEvidence: 'deterministic',
          stageStatus: 'PASS',
          status: 'PASS',
        },
      ],
    );
    await writeCsv(
      path.join(tempConfigDir, 'bmad-help-command-label-report.csv'),
      [
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
      ],
      [
        {
          surface: '_bmad/_config/bmad-help.csv',
          canonicalId: 'bmad-help',
          rawCommandValue: 'bmad-help',
          displayedCommandLabel: '/bmad-help',
          normalizedDisplayedLabel: '/bmad-help',
          rowCountForCanonicalId: '1',
          authoritySourceType: 'sidecar',
          authoritySourcePath: 'bmad-fork/src/core/tasks/help.artifact.yaml',
          status: 'PASS',
          failureReason: '',
        },
      ],
    );

    const harness = new HelpValidationHarness();
    const firstRun = await harness.generateAndValidate({
      projectDir: tempProjectRoot,
      bmadDir: tempBmadDir,
      bmadFolderName: '_bmad',
      sidecarPath: path.join(tempSourceTasksDir, 'help.artifact.yaml'),
      sourceMarkdownPath: path.join(tempSourceTasksDir, 'help.md'),
    });
    assert(
      firstRun.terminalStatus === 'PASS' && firstRun.generatedArtifactCount === HELP_VALIDATION_ARTIFACT_REGISTRY.length,
      'Help validation harness generates and validates all required artifacts',
    );

    const artifactPathsById = new Map(
      HELP_VALIDATION_ARTIFACT_REGISTRY.map((artifact) => [
        artifact.artifactId,
        path.join(tempProjectRoot, '_bmad-output', 'planning-artifacts', artifact.relativePath),
      ]),
    );
    for (const [artifactId, artifactPath] of artifactPathsById.entries()) {
      assert(await fs.pathExists(artifactPath), `Help validation harness outputs artifact ${artifactId}`);
    }

    const artifactThreeBaselineRows = csv.parse(await fs.readFile(artifactPathsById.get(3), 'utf8'), {
      columns: true,
      skip_empty_lines: true,
    });
    const manifestProvenanceRow = artifactThreeBaselineRows.find((row) => row.artifactPath === '_bmad/_config/task-manifest.csv');
    let manifestReplayEvidence = null;
    try {
      manifestReplayEvidence = JSON.parse(String(manifestProvenanceRow?.issuingComponentBindingEvidence || ''));
    } catch {
      manifestReplayEvidence = null;
    }
    assert(
      manifestReplayEvidence &&
        manifestReplayEvidence.evidenceVersion === 1 &&
        manifestReplayEvidence.observationMethod === 'validator-observed-baseline-plus-isolated-single-component-perturbation' &&
        typeof manifestReplayEvidence.baselineArtifactSha256 === 'string' &&
        manifestReplayEvidence.baselineArtifactSha256.length === 64 &&
        typeof manifestReplayEvidence.mutatedArtifactSha256 === 'string' &&
        manifestReplayEvidence.mutatedArtifactSha256.length === 64 &&
        manifestReplayEvidence.baselineArtifactSha256 !== manifestReplayEvidence.mutatedArtifactSha256 &&
        manifestReplayEvidence.perturbationApplied === true &&
        Number(manifestReplayEvidence.baselineTargetRowCount) > Number(manifestReplayEvidence.mutatedTargetRowCount) &&
        manifestReplayEvidence.targetedRowLocator === manifestProvenanceRow.rowIdentity,
      'Help validation harness emits validator-observed replay evidence with baseline/perturbation impact',
    );

    const firstArtifactContents = new Map();
    for (const [artifactId, artifactPath] of artifactPathsById.entries()) {
      firstArtifactContents.set(artifactId, await fs.readFile(artifactPath, 'utf8'));
    }

    await harness.generateAndValidate({
      projectDir: tempProjectRoot,
      bmadDir: tempBmadDir,
      bmadFolderName: '_bmad',
      sidecarPath: path.join(tempSourceTasksDir, 'help.artifact.yaml'),
      sourceMarkdownPath: path.join(tempSourceTasksDir, 'help.md'),
    });

    let deterministicOutputs = true;
    for (const [artifactId, artifactPath] of artifactPathsById.entries()) {
      const rerunContent = await fs.readFile(artifactPath, 'utf8');
      if (rerunContent !== firstArtifactContents.get(artifactId)) {
        deterministicOutputs = false;
        break;
      }
    }
    assert(deterministicOutputs, 'Help validation harness outputs are byte-stable across unchanged repeated runs');

    await fs.remove(path.join(tempSkillDir, 'SKILL.md'));
    const noIdeInstaller = new Installer();
    noIdeInstaller.codexExportDerivationRecords = [];
    const noIdeValidationOptions = await noIdeInstaller.buildHelpValidationOptions({
      projectDir: tempProjectRoot,
      bmadDir: tempBmadDir,
    });
    assert(
      noIdeValidationOptions.requireExportSkillProjection === false,
      'Installer help validation options disable export-surface requirement for no-IDE/non-Codex flow',
    );
    const noIdeRun = await harness.generateAndValidate({
      ...noIdeValidationOptions,
      sidecarPath: path.join(tempSourceTasksDir, 'help.artifact.yaml'),
      sourceMarkdownPath: path.join(tempSourceTasksDir, 'help.md'),
    });
    assert(
      noIdeRun.terminalStatus === 'PASS',
      'Help validation harness remains terminal-PASS for no-IDE/non-Codex flow when core projection surfaces are present',
    );
    const noIdeStandaloneValidation = await harness.validateGeneratedArtifacts({
      projectDir: tempProjectRoot,
      bmadFolderName: '_bmad',
    });
    assert(
      noIdeStandaloneValidation.status === 'PASS',
      'Help validation harness infers no-IDE export prerequisite context during standalone validation when options are omitted',
    );
    try {
      await harness.buildObservedBindingEvidence({
        artifactPath: '_bmad/_config/task-manifest.csv',
        absolutePath: path.join(tempBmadDir, '_config', 'task-manifest.csv'),
        componentPath: 'bmad-fork/tools/cli/installers/lib/core/manifest-generator.js',
        rowIdentity: 'issued-artifact:missing-claim-row',
        optionalSurface: false,
        runtimeFolder: '_bmad',
      });
      assert(false, 'Help replay evidence generation rejects unmapped claimed rowIdentity');
    } catch (error) {
      assert(
        error.code === HELP_VALIDATION_ERROR_CODES.REQUIRED_ROW_IDENTITY_MISSING,
        'Help replay evidence generation emits deterministic missing-claimed-rowIdentity error code',
      );
    }
    await fs.writeFile(
      path.join(tempSkillDir, 'SKILL.md'),
      `---\n${yaml.stringify({ name: 'bmad-help', description: 'Help command' }).trimEnd()}\n---\n\n# Skill\n`,
      'utf8',
    );

    await fs.remove(path.join(tempConfigDir, 'task-manifest.csv'));
    try {
      await harness.generateAndValidate({
        projectDir: tempProjectRoot,
        bmadDir: tempBmadDir,
        bmadFolderName: '_bmad',
        sidecarPath: path.join(tempSourceTasksDir, 'help.artifact.yaml'),
        sourceMarkdownPath: path.join(tempSourceTasksDir, 'help.md'),
      });
      assert(false, 'Help validation harness fails when required projection input surfaces are missing');
    } catch (error) {
      assert(
        error.code === HELP_VALIDATION_ERROR_CODES.REQUIRED_ARTIFACT_MISSING,
        'Help validation harness emits deterministic missing-input-surface error code',
      );
    }
    await writeCsv(
      path.join(tempConfigDir, 'task-manifest.csv'),
      [...TASK_MANIFEST_COMPATIBILITY_PREFIX_COLUMNS, ...TASK_MANIFEST_CANONICAL_ADDITIVE_COLUMNS],
      [
        {
          name: 'help',
          displayName: 'help',
          description: 'Help command',
          module: 'core',
          path: '_bmad/core/tasks/help.md',
          standalone: 'true',
          legacyName: 'help',
          canonicalId: 'bmad-help',
          authoritySourceType: 'sidecar',
          authoritySourcePath: 'bmad-fork/src/core/tasks/help.artifact.yaml',
        },
      ],
    );
    await harness.generateAndValidate({
      projectDir: tempProjectRoot,
      bmadDir: tempBmadDir,
      bmadFolderName: '_bmad',
      sidecarPath: path.join(tempSourceTasksDir, 'help.artifact.yaml'),
      sourceMarkdownPath: path.join(tempSourceTasksDir, 'help.md'),
    });

    await fs.remove(artifactPathsById.get(14));
    try {
      await harness.validateGeneratedArtifacts({ projectDir: tempProjectRoot });
      assert(false, 'Help validation harness fails when a required artifact is missing');
    } catch (error) {
      assert(
        error.code === HELP_VALIDATION_ERROR_CODES.REQUIRED_ARTIFACT_MISSING,
        'Help validation harness emits deterministic missing-artifact error code',
      );
    }

    await harness.generateAndValidate({
      projectDir: tempProjectRoot,
      bmadDir: tempBmadDir,
      bmadFolderName: '_bmad',
      sidecarPath: path.join(tempSourceTasksDir, 'help.artifact.yaml'),
      sourceMarkdownPath: path.join(tempSourceTasksDir, 'help.md'),
    });

    const artifactTwoPath = artifactPathsById.get(2);
    const artifactTwoContent = await fs.readFile(artifactTwoPath, 'utf8');
    const artifactTwoLines = artifactTwoContent.split('\n');
    artifactTwoLines[0] = artifactTwoLines[0].replace('surface', 'brokenSurface');
    await fs.writeFile(artifactTwoPath, artifactTwoLines.join('\n'), 'utf8');
    try {
      await harness.validateGeneratedArtifacts({ projectDir: tempProjectRoot });
      assert(false, 'Help validation harness rejects schema/header drift');
    } catch (error) {
      assert(
        error.code === HELP_VALIDATION_ERROR_CODES.CSV_SCHEMA_MISMATCH,
        'Help validation harness emits deterministic schema-mismatch error code',
      );
    }

    await harness.generateAndValidate({
      projectDir: tempProjectRoot,
      bmadDir: tempBmadDir,
      bmadFolderName: '_bmad',
      sidecarPath: path.join(tempSourceTasksDir, 'help.artifact.yaml'),
      sourceMarkdownPath: path.join(tempSourceTasksDir, 'help.md'),
    });

    const artifactNinePath = artifactPathsById.get(9);
    const artifactNineHeader = (await fs.readFile(artifactNinePath, 'utf8')).split('\n')[0];
    await fs.writeFile(artifactNinePath, `${artifactNineHeader}\n`, 'utf8');
    try {
      await harness.validateGeneratedArtifacts({ projectDir: tempProjectRoot });
      assert(false, 'Help validation harness rejects header-only required-identity artifacts');
    } catch (error) {
      assert(
        error.code === HELP_VALIDATION_ERROR_CODES.REQUIRED_ROW_IDENTITY_MISSING,
        'Help validation harness emits deterministic missing-row error code for header-only artifacts',
      );
    }

    await harness.generateAndValidate({
      projectDir: tempProjectRoot,
      bmadDir: tempBmadDir,
      bmadFolderName: '_bmad',
      sidecarPath: path.join(tempSourceTasksDir, 'help.artifact.yaml'),
      sourceMarkdownPath: path.join(tempSourceTasksDir, 'help.md'),
    });

    const artifactThreePath = artifactPathsById.get(3);
    const artifactThreeContent = await fs.readFile(artifactThreePath, 'utf8');
    const artifactThreeRows = csv.parse(artifactThreeContent, {
      columns: true,
      skip_empty_lines: true,
    });
    artifactThreeRows[0].rowIdentity = '';
    await writeCsv(
      artifactThreePath,
      [
        'rowIdentity',
        'artifactPath',
        'canonicalId',
        'issuerOwnerClass',
        'evidenceIssuerComponent',
        'evidenceMethod',
        'issuingComponent',
        'issuingComponentBindingBasis',
        'issuingComponentBindingEvidence',
        'claimScope',
        'status',
      ],
      artifactThreeRows,
    );
    try {
      await harness.validateGeneratedArtifacts({ projectDir: tempProjectRoot });
      assert(false, 'Help validation harness rejects missing required row identity values');
    } catch (error) {
      assert(
        error.code === HELP_VALIDATION_ERROR_CODES.REQUIRED_ROW_IDENTITY_MISSING,
        'Help validation harness emits deterministic row-identity error code',
      );
    }

    await harness.generateAndValidate({
      projectDir: tempProjectRoot,
      bmadDir: tempBmadDir,
      bmadFolderName: '_bmad',
      sidecarPath: path.join(tempSourceTasksDir, 'help.artifact.yaml'),
      sourceMarkdownPath: path.join(tempSourceTasksDir, 'help.md'),
    });

    const artifactFourPath = artifactPathsById.get(4);
    const artifactFourRows = csv.parse(await fs.readFile(artifactFourPath, 'utf8'), {
      columns: true,
      skip_empty_lines: true,
    });
    artifactFourRows[0].issuedArtifactEvidenceRowIdentity = '';
    await writeCsv(
      artifactFourPath,
      [
        'surface',
        'sourcePath',
        'legacyName',
        'canonicalId',
        'displayName',
        'normalizedCapabilityKey',
        'authoritySourceType',
        'authoritySourcePath',
        'issuerOwnerClass',
        'issuingComponent',
        'issuedArtifactEvidencePath',
        'issuedArtifactEvidenceRowIdentity',
        'issuingComponentBindingEvidence',
        'status',
      ],
      artifactFourRows,
    );
    try {
      await harness.validateGeneratedArtifacts({ projectDir: tempProjectRoot });
      assert(false, 'Help validation harness rejects PASS rows missing required evidence-link fields');
    } catch (error) {
      assert(
        error.code === HELP_VALIDATION_ERROR_CODES.REQUIRED_EVIDENCE_LINK_MISSING,
        'Help validation harness emits deterministic evidence-link error code for missing row identity link',
      );
    }

    await harness.generateAndValidate({
      projectDir: tempProjectRoot,
      bmadDir: tempBmadDir,
      bmadFolderName: '_bmad',
      sidecarPath: path.join(tempSourceTasksDir, 'help.artifact.yaml'),
      sourceMarkdownPath: path.join(tempSourceTasksDir, 'help.md'),
    });

    const artifactNineTamperedRows = csv.parse(await fs.readFile(artifactPathsById.get(9), 'utf8'), {
      columns: true,
      skip_empty_lines: true,
    });
    artifactNineTamperedRows[0].issuingComponent = 'self-attested-generator-component';
    await writeCsv(
      artifactPathsById.get(9),
      [
        'stage',
        'artifactPath',
        'rowIdentity',
        'canonicalId',
        'sourcePath',
        'rowCountForStageCanonicalId',
        'commandValue',
        'expectedCommandValue',
        'descriptionValue',
        'expectedDescriptionValue',
        'descriptionAuthoritySourceType',
        'descriptionAuthoritySourcePath',
        'commandAuthoritySourceType',
        'commandAuthoritySourcePath',
        'issuerOwnerClass',
        'issuingComponent',
        'issuedArtifactEvidencePath',
        'issuedArtifactEvidenceRowIdentity',
        'issuingComponentBindingEvidence',
        'stageStatus',
        'status',
      ],
      artifactNineTamperedRows,
    );
    try {
      await harness.validateGeneratedArtifacts({ projectDir: tempProjectRoot });
      assert(false, 'Help validation harness rejects self-attested issuer claims that diverge from validator evidence');
    } catch (error) {
      assert(
        error.code === HELP_VALIDATION_ERROR_CODES.SELF_ATTESTED_ISSUER_CLAIM,
        'Help validation harness emits deterministic self-attested issuer-claim rejection code',
      );
    }

    await harness.generateAndValidate({
      projectDir: tempProjectRoot,
      bmadDir: tempBmadDir,
      bmadFolderName: '_bmad',
      sidecarPath: path.join(tempSourceTasksDir, 'help.artifact.yaml'),
      sourceMarkdownPath: path.join(tempSourceTasksDir, 'help.md'),
    });

    const artifactThreeTamperedRows = csv.parse(await fs.readFile(artifactPathsById.get(3), 'utf8'), {
      columns: true,
      skip_empty_lines: true,
    });
    artifactThreeTamperedRows[0].issuingComponentBindingEvidence = '{"broken":true}';
    await writeCsv(
      artifactPathsById.get(3),
      [
        'rowIdentity',
        'artifactPath',
        'canonicalId',
        'issuerOwnerClass',
        'evidenceIssuerComponent',
        'evidenceMethod',
        'issuingComponent',
        'issuingComponentBindingBasis',
        'issuingComponentBindingEvidence',
        'claimScope',
        'status',
      ],
      artifactThreeTamperedRows,
    );
    try {
      await harness.validateGeneratedArtifacts({ projectDir: tempProjectRoot });
      assert(false, 'Help validation harness rejects malformed replay-evidence payloads');
    } catch (error) {
      assert(
        error.code === HELP_VALIDATION_ERROR_CODES.BINDING_EVIDENCE_INVALID,
        'Help validation harness emits deterministic replay-evidence validation error code',
      );
    }
  } catch (error) {
    assert(false, 'Deterministic validation artifact suite setup', error.message);
  } finally {
    await fs.remove(tempValidationHarnessRoot);
  }

  console.log('');
};
