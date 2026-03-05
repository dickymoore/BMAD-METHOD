/**
 * Installation component 11: Export Projection from Sidecar Canonical ID
 */
module.exports = async function runSuite(context) {
  const {
    path,
    os,
    fs,
    yaml,
    CodexSetup,
    CODEX_EXPORT_DERIVATION_ERROR_CODES,
    EXEMPLAR_HELP_EXPORT_DERIVATION_SOURCE_TYPE,
    colors,
    assert,
  } = context;

  console.log(`${colors.yellow}Test Suite 11: Export Projection from Sidecar Canonical ID${colors.reset}\n`);

  const tempExportRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bmad-export-projection-'));
  try {
    const codexSetup = new CodexSetup();
    const skillsDir = path.join(tempExportRoot, '.agents', 'skills');
    await fs.ensureDir(skillsDir);
    await fs.ensureDir(path.join(tempExportRoot, 'bmad-fork', 'src', 'core', 'tasks'));
    await fs.writeFile(
      path.join(tempExportRoot, 'bmad-fork', 'src', 'core', 'tasks', 'help.artifact.yaml'),
      yaml.stringify({
        schemaVersion: 1,
        canonicalId: 'bmad-help',
        artifactType: 'task',
        module: 'core',
        sourcePath: 'bmad-fork/src/core/tasks/help.md',
        displayName: 'help',
        description: 'Help command',
        dependencies: { requires: [] },
      }),
      'utf8',
    );
    await fs.writeFile(
      path.join(tempExportRoot, 'bmad-fork', 'src', 'core', 'tasks', 'shard-doc.artifact.yaml'),
      yaml.stringify({
        schemaVersion: 1,
        canonicalId: 'bmad-shard-doc',
        artifactType: 'task',
        module: 'core',
        sourcePath: 'bmad-fork/src/core/tasks/shard-doc.xml',
        displayName: 'Shard Document',
        description: 'Split large markdown documents into smaller files by section with an index.',
        dependencies: { requires: [] },
      }),
      'utf8',
    );
    await fs.writeFile(
      path.join(tempExportRoot, 'bmad-fork', 'src', 'core', 'tasks', 'index-docs.artifact.yaml'),
      yaml.stringify({
        schemaVersion: 1,
        canonicalId: 'bmad-index-docs',
        artifactType: 'task',
        module: 'core',
        sourcePath: 'bmad-fork/src/core/tasks/index-docs.xml',
        displayName: 'Index Docs',
        description:
          'Create lightweight index for quick LLM scanning. Use when LLM needs to understand available docs without loading everything.',
        dependencies: { requires: [] },
      }),
      'utf8',
    );

    const exemplarTaskArtifact = {
      type: 'task',
      name: 'help',
      module: 'core',
      sourcePath: path.join(tempExportRoot, '_bmad', 'core', 'tasks', 'help.md'),
      relativePath: path.join('core', 'tasks', 'help.md'),
      content: '---\nname: help\ndescription: Help command\ncanonicalId: bmad-help\n---\n\n# help\n',
    };
    const shardDocTaskArtifact = {
      type: 'task',
      name: 'shard-doc',
      module: 'core',
      sourcePath: path.join(tempExportRoot, '_bmad', 'core', 'tasks', 'shard-doc.xml'),
      relativePath: path.join('core', 'tasks', 'shard-doc.md'),
      content: '<task id="shard-doc"><description>Split markdown docs</description></task>\n',
    };
    const indexDocsTaskArtifact = {
      type: 'task',
      name: 'index-docs',
      module: 'core',
      sourcePath: path.join(tempExportRoot, '_bmad', 'core', 'tasks', 'index-docs.xml'),
      relativePath: path.join('core', 'tasks', 'index-docs.md'),
      content: '<task id="index-docs"><description>Index docs</description></task>\n',
    };

    const writtenCount = await codexSetup.writeSkillArtifacts(skillsDir, [exemplarTaskArtifact], 'task', {
      projectDir: tempExportRoot,
    });
    assert(writtenCount === 1, 'Codex export writes one exemplar skill artifact');

    const exemplarSkillPath = path.join(skillsDir, 'bmad-help', 'SKILL.md');
    assert(await fs.pathExists(exemplarSkillPath), 'Codex export derives exemplar skill path from sidecar canonical identity');

    const exemplarSkillRaw = await fs.readFile(exemplarSkillPath, 'utf8');
    const exemplarFrontmatterMatch = exemplarSkillRaw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const exemplarFrontmatter = exemplarFrontmatterMatch ? yaml.parse(exemplarFrontmatterMatch[1]) : null;
    assert(
      exemplarFrontmatter && exemplarFrontmatter.name === 'bmad-help',
      'Codex export frontmatter sets required name from sidecar canonical identity',
    );
    assert(
      exemplarFrontmatter && Object.keys(exemplarFrontmatter).sort().join(',') === 'description,name',
      'Codex export frontmatter remains constrained to required name plus optional description',
    );

    const exportDerivationRecord = codexSetup.exportDerivationRecords.find((row) => row.exportPath === '.agents/skills/bmad-help/SKILL.md');
    assert(
      exportDerivationRecord &&
        exportDerivationRecord.exportIdDerivationSourceType === EXEMPLAR_HELP_EXPORT_DERIVATION_SOURCE_TYPE &&
        exportDerivationRecord.exportIdDerivationSourcePath === 'bmad-fork/src/core/tasks/help.artifact.yaml',
      'Codex export records exemplar derivation source metadata from sidecar canonical-id',
    );

    const shardDocWrittenCount = await codexSetup.writeSkillArtifacts(skillsDir, [shardDocTaskArtifact], 'task', {
      projectDir: tempExportRoot,
    });
    assert(shardDocWrittenCount === 1, 'Codex export writes one shard-doc converted skill artifact');

    const shardDocSkillPath = path.join(skillsDir, 'bmad-shard-doc', 'SKILL.md');
    assert(await fs.pathExists(shardDocSkillPath), 'Codex export derives shard-doc skill path from sidecar canonical identity');

    const shardDocSkillRaw = await fs.readFile(shardDocSkillPath, 'utf8');
    const shardDocFrontmatterMatch = shardDocSkillRaw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const shardDocFrontmatter = shardDocFrontmatterMatch ? yaml.parse(shardDocFrontmatterMatch[1]) : null;
    assert(
      shardDocFrontmatter && shardDocFrontmatter.name === 'bmad-shard-doc',
      'Codex export frontmatter sets shard-doc required name from sidecar canonical identity',
    );

    const shardDocExportDerivationRecord = codexSetup.exportDerivationRecords.find(
      (row) => row.exportPath === '.agents/skills/bmad-shard-doc/SKILL.md',
    );
    assert(
      shardDocExportDerivationRecord &&
        shardDocExportDerivationRecord.exportIdDerivationSourceType === EXEMPLAR_HELP_EXPORT_DERIVATION_SOURCE_TYPE &&
        shardDocExportDerivationRecord.exportIdDerivationSourcePath === 'bmad-fork/src/core/tasks/shard-doc.artifact.yaml' &&
        shardDocExportDerivationRecord.sourcePath === 'bmad-fork/src/core/tasks/shard-doc.xml',
      'Codex export records shard-doc sidecar-canonical derivation metadata and source path',
    );

    const indexDocsWrittenCount = await codexSetup.writeSkillArtifacts(skillsDir, [indexDocsTaskArtifact], 'task', {
      projectDir: tempExportRoot,
    });
    assert(indexDocsWrittenCount === 1, 'Codex export writes one index-docs converted skill artifact');

    const indexDocsSkillPath = path.join(skillsDir, 'bmad-index-docs', 'SKILL.md');
    assert(await fs.pathExists(indexDocsSkillPath), 'Codex export derives index-docs skill path from sidecar canonical identity');

    const indexDocsSkillRaw = await fs.readFile(indexDocsSkillPath, 'utf8');
    const indexDocsFrontmatterMatch = indexDocsSkillRaw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const indexDocsFrontmatter = indexDocsFrontmatterMatch ? yaml.parse(indexDocsFrontmatterMatch[1]) : null;
    assert(
      indexDocsFrontmatter && indexDocsFrontmatter.name === 'bmad-index-docs',
      'Codex export frontmatter sets index-docs required name from sidecar canonical identity',
    );

    const indexDocsExportDerivationRecord = codexSetup.exportDerivationRecords.find(
      (row) => row.exportPath === '.agents/skills/bmad-index-docs/SKILL.md',
    );
    assert(
      indexDocsExportDerivationRecord &&
        indexDocsExportDerivationRecord.exportIdDerivationSourceType === EXEMPLAR_HELP_EXPORT_DERIVATION_SOURCE_TYPE &&
        indexDocsExportDerivationRecord.exportIdDerivationSourcePath === 'bmad-fork/src/core/tasks/index-docs.artifact.yaml' &&
        indexDocsExportDerivationRecord.sourcePath === 'bmad-fork/src/core/tasks/index-docs.xml',
      'Codex export records index-docs sidecar-canonical derivation metadata and source path',
    );

    const duplicateExportSetup = new CodexSetup();
    const duplicateSkillDir = path.join(tempExportRoot, '.agents', 'skills-duplicate-check');
    await fs.ensureDir(duplicateSkillDir);
    try {
      await duplicateExportSetup.writeSkillArtifacts(
        duplicateSkillDir,
        [
          shardDocTaskArtifact,
          {
            ...shardDocTaskArtifact,
            content: '<task id="shard-doc"><description>Duplicate shard-doc export artifact</description></task>\n',
          },
        ],
        'task',
        {
          projectDir: tempExportRoot,
        },
      );
      assert(
        false,
        'Codex export rejects duplicate shard-doc canonical-id skill export surfaces',
        'Expected duplicate export-surface failure but export succeeded',
      );
    } catch (error) {
      assert(
        error.code === CODEX_EXPORT_DERIVATION_ERROR_CODES.DUPLICATE_EXPORT_SURFACE,
        'Codex export duplicate shard-doc canonical-id rejection returns deterministic failure code',
        `Expected ${CODEX_EXPORT_DERIVATION_ERROR_CODES.DUPLICATE_EXPORT_SURFACE}, got ${error.code}`,
      );
    }

    const tempSubmoduleRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bmad-export-submodule-root-'));
    try {
      const submoduleRootSetup = new CodexSetup();
      const submoduleSkillsDir = path.join(tempSubmoduleRoot, '.agents', 'skills');
      await fs.ensureDir(submoduleSkillsDir);
      await fs.ensureDir(path.join(tempSubmoduleRoot, 'src', 'core', 'tasks'));
      await fs.writeFile(
        path.join(tempSubmoduleRoot, 'src', 'core', 'tasks', 'help.artifact.yaml'),
        yaml.stringify({
          schemaVersion: 1,
          canonicalId: 'bmad-help',
          artifactType: 'task',
          module: 'core',
          sourcePath: 'bmad-fork/src/core/tasks/help.md',
          displayName: 'help',
          description: 'Help command',
          dependencies: { requires: [] },
        }),
        'utf8',
      );

      await submoduleRootSetup.writeSkillArtifacts(submoduleSkillsDir, [exemplarTaskArtifact], 'task', {
        projectDir: tempSubmoduleRoot,
      });

      const submoduleExportDerivationRecord = submoduleRootSetup.exportDerivationRecords.find(
        (row) => row.exportPath === '.agents/skills/bmad-help/SKILL.md',
      );
      assert(
        submoduleExportDerivationRecord &&
          submoduleExportDerivationRecord.exportIdDerivationSourcePath === 'bmad-fork/src/core/tasks/help.artifact.yaml',
        'Codex export locks exemplar derivation source-path contract when running from submodule root',
      );
    } finally {
      await fs.remove(tempSubmoduleRoot);
    }

    const tempNoSidecarRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bmad-export-missing-sidecar-'));
    try {
      const noSidecarSetup = new CodexSetup();
      const noSidecarSkillDir = path.join(tempNoSidecarRoot, '.agents', 'skills');
      await fs.ensureDir(noSidecarSkillDir);

      try {
        await noSidecarSetup.writeSkillArtifacts(noSidecarSkillDir, [exemplarTaskArtifact], 'task', {
          projectDir: tempNoSidecarRoot,
        });
        assert(
          false,
          'Codex export fails when exemplar sidecar metadata is missing',
          'Expected sidecar file-not-found failure but export succeeded',
        );
      } catch (error) {
        assert(
          error.code === CODEX_EXPORT_DERIVATION_ERROR_CODES.SIDECAR_FILE_NOT_FOUND,
          'Codex export missing sidecar failure returns deterministic error code',
          `Expected ${CODEX_EXPORT_DERIVATION_ERROR_CODES.SIDECAR_FILE_NOT_FOUND}, got ${error.code}`,
        );
      }
    } finally {
      await fs.remove(tempNoSidecarRoot);
    }

    const tempInferenceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bmad-export-no-inference-'));
    try {
      const noInferenceSetup = new CodexSetup();
      const noInferenceSkillDir = path.join(tempInferenceRoot, '.agents', 'skills');
      await fs.ensureDir(noInferenceSkillDir);
      await fs.ensureDir(path.join(tempInferenceRoot, 'bmad-fork', 'src', 'core', 'tasks'));
      await fs.writeFile(
        path.join(tempInferenceRoot, 'bmad-fork', 'src', 'core', 'tasks', 'help.artifact.yaml'),
        yaml.stringify({
          schemaVersion: 1,
          canonicalId: 'nonexistent-help-id',
          artifactType: 'task',
          module: 'core',
          sourcePath: 'bmad-fork/src/core/tasks/help.md',
          displayName: 'help',
          description: 'Help command',
          dependencies: { requires: [] },
        }),
        'utf8',
      );

      try {
        await noInferenceSetup.writeSkillArtifacts(noInferenceSkillDir, [exemplarTaskArtifact], 'task', {
          projectDir: tempInferenceRoot,
        });
        assert(
          false,
          'Codex export rejects path-inferred exemplar id when sidecar canonical-id derivation is unresolved',
          'Expected canonical-id derivation failure but export succeeded',
        );
      } catch (error) {
        assert(
          error.code === CODEX_EXPORT_DERIVATION_ERROR_CODES.CANONICAL_ID_DERIVATION_FAILED,
          'Codex export unresolved canonical-id derivation returns deterministic failure code',
          `Expected ${CODEX_EXPORT_DERIVATION_ERROR_CODES.CANONICAL_ID_DERIVATION_FAILED}, got ${error.code}`,
        );
      }
    } finally {
      await fs.remove(tempInferenceRoot);
    }

    const tempShardDocInferenceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bmad-export-no-shard-doc-inference-'));
    try {
      const noShardDocInferenceSetup = new CodexSetup();
      const noShardDocInferenceSkillDir = path.join(tempShardDocInferenceRoot, '.agents', 'skills');
      await fs.ensureDir(noShardDocInferenceSkillDir);
      await fs.ensureDir(path.join(tempShardDocInferenceRoot, 'bmad-fork', 'src', 'core', 'tasks'));
      await fs.writeFile(
        path.join(tempShardDocInferenceRoot, 'bmad-fork', 'src', 'core', 'tasks', 'shard-doc.artifact.yaml'),
        yaml.stringify({
          schemaVersion: 1,
          canonicalId: 'nonexistent-shard-doc-id',
          artifactType: 'task',
          module: 'core',
          sourcePath: 'bmad-fork/src/core/tasks/shard-doc.xml',
          displayName: 'Shard Document',
          description: 'Split large markdown documents into smaller files by section with an index.',
          dependencies: { requires: [] },
        }),
        'utf8',
      );

      try {
        await noShardDocInferenceSetup.writeSkillArtifacts(noShardDocInferenceSkillDir, [shardDocTaskArtifact], 'task', {
          projectDir: tempShardDocInferenceRoot,
        });
        assert(
          false,
          'Codex export rejects path-inferred shard-doc id when sidecar canonical-id derivation is unresolved',
          'Expected shard-doc canonical-id derivation failure but export succeeded',
        );
      } catch (error) {
        assert(
          error.code === CODEX_EXPORT_DERIVATION_ERROR_CODES.CANONICAL_ID_DERIVATION_FAILED,
          'Codex export unresolved shard-doc canonical-id derivation returns deterministic failure code',
          `Expected ${CODEX_EXPORT_DERIVATION_ERROR_CODES.CANONICAL_ID_DERIVATION_FAILED}, got ${error.code}`,
        );
      }
    } finally {
      await fs.remove(tempShardDocInferenceRoot);
    }

    const tempIndexDocsInferenceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bmad-export-no-index-docs-inference-'));
    try {
      const noIndexDocsInferenceSetup = new CodexSetup();
      const noIndexDocsInferenceSkillDir = path.join(tempIndexDocsInferenceRoot, '.agents', 'skills');
      await fs.ensureDir(noIndexDocsInferenceSkillDir);
      await fs.ensureDir(path.join(tempIndexDocsInferenceRoot, 'bmad-fork', 'src', 'core', 'tasks'));
      await fs.writeFile(
        path.join(tempIndexDocsInferenceRoot, 'bmad-fork', 'src', 'core', 'tasks', 'index-docs.artifact.yaml'),
        yaml.stringify({
          schemaVersion: 1,
          canonicalId: 'nonexistent-index-docs-id',
          artifactType: 'task',
          module: 'core',
          sourcePath: 'bmad-fork/src/core/tasks/index-docs.xml',
          displayName: 'Index Docs',
          description:
            'Create lightweight index for quick LLM scanning. Use when LLM needs to understand available docs without loading everything.',
          dependencies: { requires: [] },
        }),
        'utf8',
      );

      try {
        await noIndexDocsInferenceSetup.writeSkillArtifacts(noIndexDocsInferenceSkillDir, [indexDocsTaskArtifact], 'task', {
          projectDir: tempIndexDocsInferenceRoot,
        });
        assert(
          false,
          'Codex export rejects path-inferred index-docs id when sidecar canonical-id derivation is unresolved',
          'Expected index-docs canonical-id derivation failure but export succeeded',
        );
      } catch (error) {
        assert(
          error.code === CODEX_EXPORT_DERIVATION_ERROR_CODES.CANONICAL_ID_DERIVATION_FAILED,
          'Codex export unresolved index-docs canonical-id derivation returns deterministic failure code',
          `Expected ${CODEX_EXPORT_DERIVATION_ERROR_CODES.CANONICAL_ID_DERIVATION_FAILED}, got ${error.code}`,
        );
      }
    } finally {
      await fs.remove(tempIndexDocsInferenceRoot);
    }

    const compatibilitySetup = new CodexSetup();
    const compatibilityIdentity = await compatibilitySetup.resolveSkillIdentityFromArtifact(
      {
        type: 'workflow-command',
        name: 'create-story',
        module: 'bmm',
        relativePath: path.join('bmm', 'workflows', 'create-story.md'),
      },
      tempExportRoot,
    );
    assert(
      compatibilityIdentity.skillName === 'bmad-bmm-create-story' && compatibilityIdentity.exportIdDerivationSourceType === 'path-derived',
      'Codex export preserves non-exemplar path-derived skill identity behavior',
    );
  } catch (error) {
    assert(false, 'Export projection suite setup', error.message);
  } finally {
    await fs.remove(tempExportRoot);
  }

  console.log('');
};
