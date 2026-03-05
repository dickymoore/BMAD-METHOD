/**
 * Installation component 6: Installer Fail-Fast Pre-Generation
 */
module.exports = async function runSuite(context) {
  const {
    path,
    os,
    fs,
    Installer,
    HELP_SIDECAR_ERROR_CODES,
    SHARD_DOC_SIDECAR_ERROR_CODES,
    SHARD_DOC_AUTHORITY_VALIDATION_ERROR_CODES,
    colors,
    assert,
    expectedUnsupportedMajorDetail,
    expectedBasenameMismatchDetail,
  } = context;

  console.log(`${colors.yellow}Test Suite 6: Installer Fail-Fast Pre-Generation${colors.reset}\n`);

  const tempInstallerRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bmad-installer-sidecar-failfast-'));

  try {
    // 6a: Existing help sidecar fail-fast behavior remains intact.
    {
      const installer = new Installer();
      let shardDocValidationCalled = false;
      let indexDocsValidationCalled = false;
      let shardDocAuthorityValidationCalled = false;
      let indexDocsAuthorityValidationCalled = false;
      let helpAuthorityValidationCalled = false;
      let generateConfigsCalled = false;
      let manifestGenerationCalled = false;
      let helpCatalogGenerationCalled = false;
      let successResultCount = 0;

      installer.validateShardDocSidecarContractFile = async () => {
        shardDocValidationCalled = true;
      };
      installer.validateIndexDocsSidecarContractFile = async () => {
        indexDocsValidationCalled = true;
      };
      installer.validateHelpSidecarContractFile = async () => {
        const error = new Error(expectedUnsupportedMajorDetail);
        error.code = HELP_SIDECAR_ERROR_CODES.MAJOR_VERSION_UNSUPPORTED;
        error.fieldPath = 'schemaVersion';
        error.detail = expectedUnsupportedMajorDetail;
        throw error;
      };

      installer.validateShardDocAuthoritySplitAndPrecedence = async () => {
        shardDocAuthorityValidationCalled = true;
        return {
          authoritativeRecords: [],
          authoritativePresenceKey: 'capability:bmad-shard-doc',
        };
      };
      installer.validateIndexDocsAuthoritySplitAndPrecedence = async () => {
        indexDocsAuthorityValidationCalled = true;
        return {
          authoritativeRecords: [],
          authoritativePresenceKey: 'capability:bmad-index-docs',
        };
      };

      installer.validateHelpAuthoritySplitAndPrecedence = async () => {
        helpAuthorityValidationCalled = true;
        return {
          authoritativeRecords: [],
          authoritativePresenceKey: 'capability:bmad-help',
        };
      };

      installer.generateModuleConfigs = async () => {
        generateConfigsCalled = true;
      };

      installer.mergeModuleHelpCatalogs = async () => {
        helpCatalogGenerationCalled = true;
      };

      installer.ManifestGenerator = class ManifestGeneratorStub {
        async generateManifests() {
          manifestGenerationCalled = true;
          return {
            workflows: 0,
            agents: 0,
            tasks: 0,
            tools: 0,
          };
        }
      };

      try {
        await installer.runConfigurationGenerationTask({
          message: () => {},
          bmadDir: tempInstallerRoot,
          moduleConfigs: { core: {} },
          config: { ides: [] },
          allModules: ['core'],
          addResult: () => {
            successResultCount += 1;
          },
        });
        assert(
          false,
          'Installer fail-fast blocks projection generation on help sidecar validation failure',
          'Expected sidecar validation failure but configuration generation completed',
        );
      } catch (error) {
        assert(
          error.code === HELP_SIDECAR_ERROR_CODES.MAJOR_VERSION_UNSUPPORTED,
          'Installer fail-fast surfaces help sidecar validation error code',
          `Expected ${HELP_SIDECAR_ERROR_CODES.MAJOR_VERSION_UNSUPPORTED}, got ${error.code}`,
        );
        assert(shardDocValidationCalled, 'Installer runs shard-doc sidecar validation before help sidecar validation');
        assert(indexDocsValidationCalled, 'Installer runs index-docs sidecar validation before help sidecar validation');
        assert(
          !shardDocAuthorityValidationCalled &&
            !indexDocsAuthorityValidationCalled &&
            !helpAuthorityValidationCalled &&
            !generateConfigsCalled &&
            !manifestGenerationCalled &&
            !helpCatalogGenerationCalled,
          'Installer help fail-fast prevents downstream authority/config/manifest/help generation',
        );
        assert(
          successResultCount === 0,
          'Installer help fail-fast records no successful projection milestones',
          `Expected 0, got ${successResultCount}`,
        );
      }
    }

    // 6b: Shard-doc fail-fast covers Shard-doc negative matrix classes.
    {
      const deterministicShardDocFailFastSourcePath = 'bmad-fork/src/core/tasks/shard-doc.artifact.yaml';
      const shardDocFailureScenarios = [
        {
          label: 'missing shard-doc sidecar file',
          code: SHARD_DOC_SIDECAR_ERROR_CODES.FILE_NOT_FOUND,
          fieldPath: '<file>',
          detail: 'Expected shard-doc sidecar file was not found.',
        },
        {
          label: 'malformed shard-doc sidecar YAML',
          code: SHARD_DOC_SIDECAR_ERROR_CODES.PARSE_FAILED,
          fieldPath: '<document>',
          detail: 'YAML parse failure: malformed content',
        },
        {
          label: 'missing shard-doc required field',
          code: SHARD_DOC_SIDECAR_ERROR_CODES.REQUIRED_FIELD_MISSING,
          fieldPath: 'canonicalId',
          detail: 'Missing required sidecar field "canonicalId".',
        },
        {
          label: 'empty shard-doc required field',
          code: SHARD_DOC_SIDECAR_ERROR_CODES.REQUIRED_FIELD_EMPTY,
          fieldPath: 'canonicalId',
          detail: 'Required sidecar field "canonicalId" must be a non-empty string.',
        },
        {
          label: 'unsupported shard-doc sidecar major schema version',
          code: SHARD_DOC_SIDECAR_ERROR_CODES.MAJOR_VERSION_UNSUPPORTED,
          fieldPath: 'schemaVersion',
          detail: expectedUnsupportedMajorDetail,
        },
        {
          label: 'shard-doc sourcePath basename mismatch',
          code: SHARD_DOC_SIDECAR_ERROR_CODES.SOURCEPATH_BASENAME_MISMATCH,
          fieldPath: 'sourcePath',
          detail: expectedBasenameMismatchDetail,
        },
      ];

      for (const scenario of shardDocFailureScenarios) {
        const installer = new Installer();
        let indexDocsValidationCalled = false;
        let helpValidationCalled = false;
        let shardDocAuthorityValidationCalled = false;
        let indexDocsAuthorityValidationCalled = false;
        let helpAuthorityValidationCalled = false;
        let generateConfigsCalled = false;
        let manifestGenerationCalled = false;
        let helpCatalogGenerationCalled = false;
        let successResultCount = 0;

        installer.validateShardDocSidecarContractFile = async () => {
          const error = new Error(scenario.detail);
          error.code = scenario.code;
          error.fieldPath = scenario.fieldPath;
          error.sourcePath = deterministicShardDocFailFastSourcePath;
          error.detail = scenario.detail;
          throw error;
        };
        installer.validateIndexDocsSidecarContractFile = async () => {
          indexDocsValidationCalled = true;
        };
        installer.validateHelpSidecarContractFile = async () => {
          helpValidationCalled = true;
        };
        installer.validateShardDocAuthoritySplitAndPrecedence = async () => {
          shardDocAuthorityValidationCalled = true;
          return {
            authoritativeRecords: [],
            authoritativePresenceKey: 'capability:bmad-shard-doc',
          };
        };
        installer.validateIndexDocsAuthoritySplitAndPrecedence = async () => {
          indexDocsAuthorityValidationCalled = true;
          return {
            authoritativeRecords: [],
            authoritativePresenceKey: 'capability:bmad-index-docs',
          };
        };
        installer.validateHelpAuthoritySplitAndPrecedence = async () => {
          helpAuthorityValidationCalled = true;
          return {
            authoritativeRecords: [],
            authoritativePresenceKey: 'capability:bmad-help',
          };
        };
        installer.generateModuleConfigs = async () => {
          generateConfigsCalled = true;
        };
        installer.mergeModuleHelpCatalogs = async () => {
          helpCatalogGenerationCalled = true;
        };
        installer.ManifestGenerator = class ManifestGeneratorStub {
          async generateManifests() {
            manifestGenerationCalled = true;
            return {
              workflows: 0,
              agents: 0,
              tasks: 0,
              tools: 0,
            };
          }
        };

        try {
          await installer.runConfigurationGenerationTask({
            message: () => {},
            bmadDir: tempInstallerRoot,
            moduleConfigs: { core: {} },
            config: { ides: [] },
            allModules: ['core'],
            addResult: () => {
              successResultCount += 1;
            },
          });
          assert(false, `Installer fail-fast blocks projection generation on ${scenario.label}`);
        } catch (error) {
          assert(error.code === scenario.code, `Installer ${scenario.label} returns deterministic error code`);
          assert(error.fieldPath === scenario.fieldPath, `Installer ${scenario.label} returns deterministic field path`);
          assert(
            error.sourcePath === deterministicShardDocFailFastSourcePath,
            `Installer ${scenario.label} returns deterministic source path`,
          );
          assert(!indexDocsValidationCalled, `Installer ${scenario.label} aborts before index-docs sidecar validation`);
          assert(!helpValidationCalled, `Installer ${scenario.label} aborts before help sidecar validation`);
          assert(
            !shardDocAuthorityValidationCalled &&
              !indexDocsAuthorityValidationCalled &&
              !helpAuthorityValidationCalled &&
              !generateConfigsCalled &&
              !manifestGenerationCalled &&
              !helpCatalogGenerationCalled,
            `Installer ${scenario.label} prevents downstream authority/config/manifest/help generation`,
          );
          assert(successResultCount === 0, `Installer ${scenario.label} records no successful projection milestones`);
        }
      }
    }

    // 6c: Shard-doc authority precedence conflict fails fast before help authority or generation.
    {
      const installer = new Installer();
      let indexDocsAuthorityValidationCalled = false;
      let helpAuthorityValidationCalled = false;
      let generateConfigsCalled = false;
      let manifestGenerationCalled = false;
      let helpCatalogGenerationCalled = false;
      let successResultCount = 0;

      installer.validateShardDocSidecarContractFile = async () => {};
      installer.validateIndexDocsSidecarContractFile = async () => {};
      installer.validateHelpSidecarContractFile = async () => {};
      installer.validateShardDocAuthoritySplitAndPrecedence = async () => {
        const error = new Error('Converted shard-doc compatibility command must match sidecar canonicalId');
        error.code = SHARD_DOC_AUTHORITY_VALIDATION_ERROR_CODES.COMMAND_MISMATCH;
        error.fieldPath = 'command';
        error.sourcePath = 'bmad-fork/src/core/module-help.csv';
        throw error;
      };
      installer.validateIndexDocsAuthoritySplitAndPrecedence = async () => {
        indexDocsAuthorityValidationCalled = true;
        return {
          authoritativeRecords: [],
          authoritativePresenceKey: 'capability:bmad-index-docs',
        };
      };
      installer.validateHelpAuthoritySplitAndPrecedence = async () => {
        helpAuthorityValidationCalled = true;
        return {
          authoritativeRecords: [],
          authoritativePresenceKey: 'capability:bmad-help',
        };
      };
      installer.generateModuleConfigs = async () => {
        generateConfigsCalled = true;
      };
      installer.mergeModuleHelpCatalogs = async () => {
        helpCatalogGenerationCalled = true;
      };
      installer.ManifestGenerator = class ManifestGeneratorStub {
        async generateManifests() {
          manifestGenerationCalled = true;
          return {
            workflows: 0,
            agents: 0,
            tasks: 0,
            tools: 0,
          };
        }
      };

      try {
        await installer.runConfigurationGenerationTask({
          message: () => {},
          bmadDir: tempInstallerRoot,
          moduleConfigs: { core: {} },
          config: { ides: [] },
          allModules: ['core'],
          addResult: () => {
            successResultCount += 1;
          },
        });
        assert(false, 'Installer shard-doc authority mismatch fails fast pre-projection');
      } catch (error) {
        assert(
          error.code === SHARD_DOC_AUTHORITY_VALIDATION_ERROR_CODES.COMMAND_MISMATCH,
          'Installer shard-doc authority mismatch returns deterministic error code',
        );
        assert(error.fieldPath === 'command', 'Installer shard-doc authority mismatch returns deterministic field path');
        assert(
          error.sourcePath === 'bmad-fork/src/core/module-help.csv',
          'Installer shard-doc authority mismatch returns deterministic source path',
        );
        assert(
          !indexDocsAuthorityValidationCalled &&
            !helpAuthorityValidationCalled &&
            !generateConfigsCalled &&
            !manifestGenerationCalled &&
            !helpCatalogGenerationCalled,
          'Installer shard-doc authority mismatch blocks downstream help authority/config/manifest/help generation',
        );
        assert(
          successResultCount === 3,
          'Installer shard-doc authority mismatch records only sidecar gate pass milestones before abort',
          `Expected 3, got ${successResultCount}`,
        );
      }
    }

    // 6d: Shard-doc canonical drift fails fast before help authority or generation.
    {
      const installer = new Installer();
      let indexDocsAuthorityValidationCalled = false;
      let helpAuthorityValidationCalled = false;
      let generateConfigsCalled = false;
      let manifestGenerationCalled = false;
      let helpCatalogGenerationCalled = false;
      let successResultCount = 0;

      installer.validateShardDocSidecarContractFile = async () => {};
      installer.validateIndexDocsSidecarContractFile = async () => {};
      installer.validateHelpSidecarContractFile = async () => {};
      installer.validateShardDocAuthoritySplitAndPrecedence = async () => {
        const error = new Error('Converted shard-doc sidecar canonicalId must remain locked to bmad-shard-doc');
        error.code = SHARD_DOC_AUTHORITY_VALIDATION_ERROR_CODES.SIDECAR_CANONICAL_ID_MISMATCH;
        error.fieldPath = 'canonicalId';
        error.sourcePath = 'bmad-fork/src/core/tasks/shard-doc.artifact.yaml';
        throw error;
      };
      installer.validateIndexDocsAuthoritySplitAndPrecedence = async () => {
        indexDocsAuthorityValidationCalled = true;
        return {
          authoritativeRecords: [],
          authoritativePresenceKey: 'capability:bmad-index-docs',
        };
      };
      installer.validateHelpAuthoritySplitAndPrecedence = async () => {
        helpAuthorityValidationCalled = true;
        return {
          authoritativeRecords: [],
          authoritativePresenceKey: 'capability:bmad-help',
        };
      };
      installer.generateModuleConfigs = async () => {
        generateConfigsCalled = true;
      };
      installer.mergeModuleHelpCatalogs = async () => {
        helpCatalogGenerationCalled = true;
      };
      installer.ManifestGenerator = class ManifestGeneratorStub {
        async generateManifests() {
          manifestGenerationCalled = true;
          return {
            workflows: 0,
            agents: 0,
            tasks: 0,
            tools: 0,
          };
        }
      };

      try {
        await installer.runConfigurationGenerationTask({
          message: () => {},
          bmadDir: tempInstallerRoot,
          moduleConfigs: { core: {} },
          config: { ides: [] },
          allModules: ['core'],
          addResult: () => {
            successResultCount += 1;
          },
        });
        assert(false, 'Installer shard-doc canonical drift fails fast pre-projection');
      } catch (error) {
        assert(
          error.code === SHARD_DOC_AUTHORITY_VALIDATION_ERROR_CODES.SIDECAR_CANONICAL_ID_MISMATCH,
          'Installer shard-doc canonical drift returns deterministic error code',
        );
        assert(error.fieldPath === 'canonicalId', 'Installer shard-doc canonical drift returns deterministic field path');
        assert(
          error.sourcePath === 'bmad-fork/src/core/tasks/shard-doc.artifact.yaml',
          'Installer shard-doc canonical drift returns deterministic source path',
        );
        assert(
          !indexDocsAuthorityValidationCalled &&
            !helpAuthorityValidationCalled &&
            !generateConfigsCalled &&
            !manifestGenerationCalled &&
            !helpCatalogGenerationCalled,
          'Installer shard-doc canonical drift blocks downstream help authority/config/manifest/help generation',
        );
        assert(
          successResultCount === 3,
          'Installer shard-doc canonical drift records only sidecar gate pass milestones before abort',
          `Expected 3, got ${successResultCount}`,
        );
      }
    }

    // 6e: Valid sidecars preserve fail-fast ordering and allow generation path.
    {
      const installer = new Installer();
      const executionOrder = [];
      const resultMilestones = [];

      installer.validateShardDocSidecarContractFile = async () => {
        executionOrder.push('shard-doc-sidecar');
      };
      installer.validateIndexDocsSidecarContractFile = async () => {
        executionOrder.push('index-docs-sidecar');
      };
      installer.validateHelpSidecarContractFile = async () => {
        executionOrder.push('help-sidecar');
      };
      installer.validateShardDocAuthoritySplitAndPrecedence = async () => {
        executionOrder.push('shard-doc-authority');
        return {
          authoritativeRecords: [],
          authoritativePresenceKey: 'capability:bmad-shard-doc',
        };
      };
      installer.validateIndexDocsAuthoritySplitAndPrecedence = async () => {
        executionOrder.push('index-docs-authority');
        return {
          authoritativeRecords: [],
          authoritativePresenceKey: 'capability:bmad-index-docs',
        };
      };
      installer.validateHelpAuthoritySplitAndPrecedence = async () => {
        executionOrder.push('help-authority');
        return {
          authoritativeRecords: [],
          authoritativePresenceKey: 'capability:bmad-help',
        };
      };
      installer.generateModuleConfigs = async () => {
        executionOrder.push('config-generation');
      };
      installer.mergeModuleHelpCatalogs = async () => {
        executionOrder.push('help-catalog-generation');
      };
      installer.ManifestGenerator = class ManifestGeneratorStub {
        async generateManifests() {
          executionOrder.push('manifest-generation');
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
        bmadDir: tempInstallerRoot,
        moduleConfigs: { core: {} },
        config: { ides: [] },
        allModules: ['core'],
        addResult: (name) => {
          resultMilestones.push(name);
        },
      });

      assert(
        executionOrder.join(' -> ') ===
          'shard-doc-sidecar -> index-docs-sidecar -> help-sidecar -> shard-doc-authority -> index-docs-authority -> help-authority -> config-generation -> manifest-generation -> help-catalog-generation',
        'Installer valid sidecar path preserves fail-fast gate ordering and continues generation flow',
        `Observed order: ${executionOrder.join(' -> ')}`,
      );
      assert(
        resultMilestones.includes('Shard-doc sidecar contract'),
        'Installer valid sidecar path records explicit shard-doc sidecar gate pass milestone',
      );
      assert(
        resultMilestones.includes('Index-docs sidecar contract'),
        'Installer valid sidecar path records explicit index-docs sidecar gate pass milestone',
      );
      assert(
        resultMilestones.includes('Shard-doc authority split'),
        'Installer valid sidecar path records explicit shard-doc authority gate pass milestone',
      );
      assert(
        resultMilestones.includes('Index-docs authority split'),
        'Installer valid sidecar path records explicit index-docs authority gate pass milestone',
      );
    }
  } catch (error) {
    assert(false, 'Installer fail-fast test setup', error.message);
  } finally {
    await fs.remove(tempInstallerRoot);
  }

  console.log('');
};
