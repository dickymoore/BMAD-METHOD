/**
 * Installation component 8: Additive Task Manifest Projection
 */
module.exports = async function runSuite(context) {
  const { path, os, fs, csv, Installer, ManifestGenerator, colors, assert } = context;

  console.log(`${colors.yellow}Test Suite 8: Additive Task Manifest Projection${colors.reset}\n`);

  const tempTaskManifestRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bmad-task-manifest-'));
  try {
    const manifestGenerator = new ManifestGenerator();
    manifestGenerator.bmadDir = tempTaskManifestRoot;
    manifestGenerator.bmadFolderName = '_bmad';
    manifestGenerator.tasks = [
      {
        name: 'help',
        displayName: 'help',
        description: 'Help command',
        module: 'core',
        path: 'core/tasks/help.md',
        standalone: true,
      },
      {
        name: 'validate-workflow',
        displayName: 'validate-workflow',
        description: 'Validate workflow',
        module: 'core',
        path: 'core/tasks/validate-workflow.xml',
        standalone: true,
      },
      {
        name: 'shard-doc',
        displayName: 'Shard Document',
        description: 'Split large markdown documents into smaller files by section with an index.',
        module: 'core',
        path: 'core/tasks/shard-doc.xml',
        standalone: true,
      },
      {
        name: 'index-docs',
        displayName: 'Index Docs',
        description:
          'Create lightweight index for quick LLM scanning. Use when LLM needs to understand available docs without loading everything.',
        module: 'core',
        path: 'core/tasks/index-docs.xml',
        standalone: true,
      },
    ];
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
    const tempTaskManifestConfigDir = path.join(tempTaskManifestRoot, '_config');
    await fs.ensureDir(tempTaskManifestConfigDir);
    await manifestGenerator.writeTaskManifest(tempTaskManifestConfigDir);

    const writtenTaskManifestRaw = await fs.readFile(path.join(tempTaskManifestConfigDir, 'task-manifest.csv'), 'utf8');
    const writtenTaskManifestLines = writtenTaskManifestRaw.trim().split('\n');
    const expectedHeader =
      'name,displayName,description,module,path,standalone,legacyName,canonicalId,authoritySourceType,authoritySourcePath';

    assert(
      writtenTaskManifestLines[0] === expectedHeader,
      'Task manifest writes compatibility-prefix columns with locked canonical appended column order',
    );

    const writtenTaskManifestRecords = csv.parse(writtenTaskManifestRaw, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    const helpTaskRow = writtenTaskManifestRecords.find((record) => record.module === 'core' && record.name === 'help');
    const validateTaskRow = writtenTaskManifestRecords.find((record) => record.module === 'core' && record.name === 'validate-workflow');
    const shardDocTaskRow = writtenTaskManifestRecords.find((record) => record.module === 'core' && record.name === 'shard-doc');
    const indexDocsTaskRow = writtenTaskManifestRecords.find((record) => record.module === 'core' && record.name === 'index-docs');

    assert(!!helpTaskRow, 'Task manifest includes exemplar help row');
    assert(helpTaskRow && helpTaskRow.legacyName === 'help', 'Task manifest help row sets legacyName=help');
    assert(helpTaskRow && helpTaskRow.canonicalId === 'bmad-help', 'Task manifest help row sets canonicalId=bmad-help');
    assert(helpTaskRow && helpTaskRow.authoritySourceType === 'sidecar', 'Task manifest help row sets authoritySourceType=sidecar');
    assert(
      helpTaskRow && helpTaskRow.authoritySourcePath === 'bmad-fork/src/core/tasks/help.artifact.yaml',
      'Task manifest help row sets authoritySourcePath to sidecar source path',
    );

    assert(!!validateTaskRow, 'Task manifest preserves non-exemplar rows');
    assert(
      validateTaskRow && validateTaskRow.legacyName === 'validate-workflow',
      'Task manifest non-exemplar rows remain additive-compatible with default legacyName',
    );
    assert(!!shardDocTaskRow, 'Task manifest includes converted shard-doc row');
    assert(shardDocTaskRow && shardDocTaskRow.legacyName === 'shard-doc', 'Task manifest shard-doc row sets legacyName=shard-doc');
    assert(
      shardDocTaskRow && shardDocTaskRow.canonicalId === 'bmad-shard-doc',
      'Task manifest shard-doc row sets canonicalId=bmad-shard-doc',
    );
    assert(
      shardDocTaskRow && shardDocTaskRow.authoritySourceType === 'sidecar',
      'Task manifest shard-doc row sets authoritySourceType=sidecar',
    );
    assert(
      shardDocTaskRow && shardDocTaskRow.authoritySourcePath === 'bmad-fork/src/core/tasks/shard-doc.artifact.yaml',
      'Task manifest shard-doc row sets authoritySourcePath to shard-doc sidecar source path',
    );
    assert(!!indexDocsTaskRow, 'Task manifest includes converted index-docs row');
    assert(indexDocsTaskRow && indexDocsTaskRow.legacyName === 'index-docs', 'Task manifest index-docs row sets legacyName=index-docs');
    assert(
      indexDocsTaskRow && indexDocsTaskRow.canonicalId === 'bmad-index-docs',
      'Task manifest index-docs row sets canonicalId=bmad-index-docs',
    );
    assert(
      indexDocsTaskRow && indexDocsTaskRow.authoritySourceType === 'sidecar',
      'Task manifest index-docs row sets authoritySourceType=sidecar',
    );
    assert(
      indexDocsTaskRow && indexDocsTaskRow.authoritySourcePath === 'bmad-fork/src/core/tasks/index-docs.artifact.yaml',
      'Task manifest index-docs row sets authoritySourcePath to index-docs sidecar source path',
    );

    await manifestGenerator.writeTaskManifest(tempTaskManifestConfigDir);
    const repeatedTaskManifestRaw = await fs.readFile(path.join(tempTaskManifestConfigDir, 'task-manifest.csv'), 'utf8');
    assert(
      repeatedTaskManifestRaw === writtenTaskManifestRaw,
      'Task manifest shard-doc canonical row values remain deterministic across repeated generation runs',
    );

    let capturedAuthorityValidationOptions = null;
    let capturedShardDocAuthorityValidationOptions = null;
    let capturedIndexDocsAuthorityValidationOptions = null;
    let capturedManifestHelpAuthorityRecords = null;
    let capturedManifestTaskAuthorityRecords = null;
    let capturedInstalledFiles = null;

    const installer = new Installer();
    installer.validateShardDocSidecarContractFile = async () => {};
    installer.validateIndexDocsSidecarContractFile = async () => {};
    installer.validateHelpSidecarContractFile = async () => {};
    installer.validateShardDocAuthoritySplitAndPrecedence = async (options) => {
      capturedShardDocAuthorityValidationOptions = options;
      return {
        authoritativePresenceKey: 'capability:bmad-shard-doc',
        authoritativeRecords: [
          {
            recordType: 'metadata-authority',
            canonicalId: 'bmad-shard-doc',
            authoritativePresenceKey: 'capability:bmad-shard-doc',
            authoritySourceType: 'sidecar',
            authoritySourcePath: options.sidecarSourcePath,
            sourcePath: options.sourceXmlSourcePath,
          },
          {
            recordType: 'source-body-authority',
            canonicalId: 'bmad-shard-doc',
            authoritativePresenceKey: 'capability:bmad-shard-doc',
            authoritySourceType: 'source-xml',
            authoritySourcePath: options.sourceXmlSourcePath,
            sourcePath: options.sourceXmlSourcePath,
          },
        ],
      };
    };
    installer.validateIndexDocsAuthoritySplitAndPrecedence = async (options) => {
      capturedIndexDocsAuthorityValidationOptions = options;
      return {
        authoritativePresenceKey: 'capability:bmad-index-docs',
        authoritativeRecords: [
          {
            recordType: 'metadata-authority',
            canonicalId: 'bmad-index-docs',
            authoritativePresenceKey: 'capability:bmad-index-docs',
            authoritySourceType: 'sidecar',
            authoritySourcePath: options.sidecarSourcePath,
            sourcePath: options.sourceXmlSourcePath,
          },
          {
            recordType: 'source-body-authority',
            canonicalId: 'bmad-index-docs',
            authoritativePresenceKey: 'capability:bmad-index-docs',
            authoritySourceType: 'source-xml',
            authoritySourcePath: options.sourceXmlSourcePath,
            sourcePath: options.sourceXmlSourcePath,
          },
        ],
      };
    };
    installer.validateHelpAuthoritySplitAndPrecedence = async (options) => {
      capturedAuthorityValidationOptions = options;
      return {
        authoritativePresenceKey: 'capability:bmad-help',
        authoritativeRecords: [
          {
            recordType: 'metadata-authority',
            canonicalId: 'bmad-help',
            authoritativePresenceKey: 'capability:bmad-help',
            authoritySourceType: 'sidecar',
            authoritySourcePath: options.sidecarSourcePath,
            sourcePath: options.sourceMarkdownSourcePath,
          },
        ],
      };
    };
    installer.generateModuleConfigs = async () => {};
    installer.mergeModuleHelpCatalogs = async () => {};
    installer.ManifestGenerator = class ManifestGeneratorStub {
      async generateManifests(_bmadDir, _selectedModules, _installedFiles, options = {}) {
        capturedInstalledFiles = _installedFiles;
        capturedManifestHelpAuthorityRecords = options.helpAuthorityRecords;
        capturedManifestTaskAuthorityRecords = options.taskAuthorityRecords;
        return {
          workflows: 0,
          agents: 0,
          tasks: 0,
          tools: 0,
        };
      }
    };

    await installer.runConfigurationGenerationTask({
      message: () => {},
      bmadDir: tempTaskManifestRoot,
      moduleConfigs: { core: {} },
      config: { ides: [] },
      allModules: ['core'],
      addResult: () => {},
    });

    assert(
      capturedAuthorityValidationOptions &&
        capturedAuthorityValidationOptions.sidecarSourcePath === 'bmad-fork/src/core/tasks/help.artifact.yaml',
      'Installer passes locked sidecar source path to authority validation',
    );
    assert(
      capturedAuthorityValidationOptions &&
        capturedAuthorityValidationOptions.sourceMarkdownSourcePath === 'bmad-fork/src/core/tasks/help.md',
      'Installer passes locked source-markdown path to authority validation',
    );
    assert(
      capturedAuthorityValidationOptions && capturedAuthorityValidationOptions.runtimeMarkdownSourcePath === '_bmad/core/tasks/help.md',
      'Installer passes locked runtime markdown path to authority validation',
    );
    assert(
      capturedShardDocAuthorityValidationOptions &&
        capturedShardDocAuthorityValidationOptions.sidecarSourcePath === 'bmad-fork/src/core/tasks/shard-doc.artifact.yaml',
      'Installer passes locked shard-doc sidecar source path to shard-doc authority validation',
    );
    assert(
      capturedShardDocAuthorityValidationOptions &&
        capturedShardDocAuthorityValidationOptions.sourceXmlSourcePath === 'bmad-fork/src/core/tasks/shard-doc.xml',
      'Installer passes locked shard-doc source XML path to shard-doc authority validation',
    );
    assert(
      capturedShardDocAuthorityValidationOptions &&
        capturedShardDocAuthorityValidationOptions.compatibilityCatalogSourcePath === 'bmad-fork/src/core/module-help.csv',
      'Installer passes locked module-help source path to shard-doc authority validation',
    );
    assert(
      capturedIndexDocsAuthorityValidationOptions &&
        capturedIndexDocsAuthorityValidationOptions.sidecarSourcePath === 'bmad-fork/src/core/tasks/index-docs.artifact.yaml',
      'Installer passes locked index-docs sidecar source path to index-docs authority validation',
    );
    assert(
      capturedIndexDocsAuthorityValidationOptions &&
        capturedIndexDocsAuthorityValidationOptions.sourceXmlSourcePath === 'bmad-fork/src/core/tasks/index-docs.xml',
      'Installer passes locked index-docs source XML path to index-docs authority validation',
    );
    assert(
      capturedIndexDocsAuthorityValidationOptions &&
        capturedIndexDocsAuthorityValidationOptions.compatibilityCatalogSourcePath === 'bmad-fork/src/core/module-help.csv',
      'Installer passes locked module-help source path to index-docs authority validation',
    );
    assert(
      Array.isArray(capturedManifestHelpAuthorityRecords) &&
        capturedManifestHelpAuthorityRecords[0] &&
        capturedManifestHelpAuthorityRecords[0].authoritySourcePath === 'bmad-fork/src/core/tasks/help.artifact.yaml',
      'Installer passes sidecar authority path into manifest generation options',
    );
    assert(
      Array.isArray(capturedManifestTaskAuthorityRecords) &&
        capturedManifestTaskAuthorityRecords.some(
          (record) =>
            record &&
            record.canonicalId === 'bmad-shard-doc' &&
            record.authoritySourceType === 'sidecar' &&
            record.authoritySourcePath === 'bmad-fork/src/core/tasks/shard-doc.artifact.yaml',
        ),
      'Installer passes shard-doc sidecar authority records into task-manifest projection options',
    );
    assert(
      Array.isArray(capturedManifestTaskAuthorityRecords) &&
        capturedManifestTaskAuthorityRecords.some(
          (record) =>
            record &&
            record.canonicalId === 'bmad-index-docs' &&
            record.authoritySourceType === 'sidecar' &&
            record.authoritySourcePath === 'bmad-fork/src/core/tasks/index-docs.artifact.yaml',
        ),
      'Installer passes index-docs sidecar authority records into task-manifest projection options',
    );
    assert(
      Array.isArray(capturedInstalledFiles) &&
        capturedInstalledFiles.some((filePath) => filePath.endsWith('/_config/canonical-aliases.csv')),
      'Installer pre-registers canonical-aliases.csv for files-manifest tracking',
    );
  } catch (error) {
    assert(false, 'Additive task manifest projection suite setup', error.message);
  } finally {
    await fs.remove(tempTaskManifestRoot);
  }

  console.log('');
};
