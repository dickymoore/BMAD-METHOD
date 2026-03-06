async function runSkillMetadataFilenameAuthorityResolutionSuite(context) {
  const { assert, colors, fs, os, path, resolveSkillMetadataAuthority, SKILL_METADATA_RESOLUTION_ERROR_CODES } = context;

  console.log(`${colors.yellow}Test Suite 4d: Skill Metadata Filename Authority Resolution${colors.reset}\n`);

  try {
    const convertedCapabilitySources = [
      { label: 'help', sourceFilename: 'help.md', artifactFilename: 'help.artifact.yaml' },
      { label: 'shard-doc', sourceFilename: 'shard-doc.xml', artifactFilename: 'shard-doc.artifact.yaml' },
      { label: 'index-docs', sourceFilename: 'index-docs.xml', artifactFilename: 'index-docs.artifact.yaml' },
    ];

    const withResolverWorkspace = async (sourceFilename, callback) => {
      const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), `bmad-metadata-authority-${sourceFilename.replaceAll(/\W+/g, '-')}-`));
      try {
        const tasksDir = path.join(tempRoot, 'src', 'core', 'tasks');
        await fs.ensureDir(tasksDir);

        const sourcePath = path.join(tasksDir, sourceFilename);
        await fs.writeFile(sourcePath, '# source\n', 'utf8');

        const sourceStem = path.basename(sourceFilename, path.extname(sourceFilename));
        const skillDir = path.join(tasksDir, sourceStem);
        await fs.ensureDir(skillDir);

        await callback({
          tempRoot,
          tasksDir,
          sourcePath,
          skillDir,
        });
      } finally {
        await fs.remove(tempRoot);
      }
    };

    for (const sourceConfig of convertedCapabilitySources) {
      const { label, sourceFilename, artifactFilename } = sourceConfig;

      await withResolverWorkspace(sourceFilename, async ({ tempRoot, tasksDir, sourcePath, skillDir }) => {
        await fs.writeFile(path.join(skillDir, 'skill-manifest.yaml'), 'canonicalId: canonical\n', 'utf8');
        await fs.writeFile(path.join(skillDir, 'bmad-config.yaml'), 'canonicalId: bmad-config\n', 'utf8');
        await fs.writeFile(path.join(skillDir, 'manifest.yaml'), 'canonicalId: manifest\n', 'utf8');
        await fs.writeFile(path.join(tasksDir, artifactFilename), 'canonicalId: artifact\n', 'utf8');

        const resolution = await resolveSkillMetadataAuthority({
          sourceFilePath: sourcePath,
          projectRoot: tempRoot,
        });
        assert(
          resolution.resolvedFilename === 'skill-manifest.yaml' && resolution.derivationMode === 'canonical',
          `${label} resolver prioritizes per-skill canonical skill-manifest.yaml over legacy metadata files`,
        );
      });

      await withResolverWorkspace(sourceFilename, async ({ tempRoot, tasksDir, sourcePath, skillDir }) => {
        await fs.writeFile(path.join(skillDir, 'bmad-config.yaml'), 'canonicalId: bmad-config\n', 'utf8');
        await fs.writeFile(path.join(skillDir, 'manifest.yaml'), 'canonicalId: manifest\n', 'utf8');
        await fs.writeFile(path.join(tasksDir, artifactFilename), 'canonicalId: artifact\n', 'utf8');

        const resolution = await resolveSkillMetadataAuthority({
          sourceFilePath: sourcePath,
          projectRoot: tempRoot,
        });
        assert(
          resolution.resolvedFilename === 'bmad-config.yaml' && resolution.derivationMode === 'legacy-fallback',
          `${label} resolver falls back to bmad-config.yaml before manifest.yaml and *.artifact.yaml`,
        );
      });

      await withResolverWorkspace(sourceFilename, async ({ tempRoot, tasksDir, sourcePath, skillDir }) => {
        await fs.writeFile(path.join(skillDir, 'manifest.yaml'), 'canonicalId: manifest\n', 'utf8');
        await fs.writeFile(path.join(tasksDir, artifactFilename), 'canonicalId: artifact\n', 'utf8');

        const resolution = await resolveSkillMetadataAuthority({
          sourceFilePath: sourcePath,
          projectRoot: tempRoot,
        });
        assert(
          resolution.resolvedFilename === 'manifest.yaml' && resolution.derivationMode === 'legacy-fallback',
          `${label} resolver falls back to manifest.yaml before *.artifact.yaml`,
        );
      });

      await withResolverWorkspace(sourceFilename, async ({ tempRoot, tasksDir, sourcePath }) => {
        await fs.writeFile(path.join(tasksDir, artifactFilename), 'canonicalId: artifact\n', 'utf8');

        const resolution = await resolveSkillMetadataAuthority({
          sourceFilePath: sourcePath,
          projectRoot: tempRoot,
        });
        assert(
          resolution.resolvedFilename === artifactFilename && resolution.derivationMode === 'legacy-fallback',
          `${label} resolver supports capability-scoped *.artifact.yaml fallback`,
        );
      });

      await withResolverWorkspace(sourceFilename, async ({ tempRoot, tasksDir, sourcePath }) => {
        await fs.writeFile(path.join(tasksDir, 'skill-manifest.yaml'), 'canonicalId: root-canonical\n', 'utf8');
        await fs.writeFile(path.join(tasksDir, artifactFilename), 'canonicalId: artifact\n', 'utf8');

        const resolution = await resolveSkillMetadataAuthority({
          sourceFilePath: sourcePath,
          projectRoot: tempRoot,
        });
        assert(
          resolution.resolvedFilename === artifactFilename,
          `${label} resolver does not treat root task-folder skill-manifest.yaml as per-skill canonical authority`,
        );
      });

      await withResolverWorkspace(sourceFilename, async ({ tempRoot, tasksDir, sourcePath, skillDir }) => {
        await fs.writeFile(path.join(tasksDir, 'bmad-config.yaml'), 'canonicalId: root-bmad-config\n', 'utf8');
        await fs.writeFile(path.join(skillDir, 'bmad-config.yaml'), 'canonicalId: skill-bmad-config\n', 'utf8');

        try {
          await resolveSkillMetadataAuthority({
            sourceFilePath: sourcePath,
            projectRoot: tempRoot,
          });
          assert(false, `${label} resolver rejects ambiguous bmad-config.yaml coexistence across legacy locations`);
        } catch (error) {
          assert(
            error.code === SKILL_METADATA_RESOLUTION_ERROR_CODES.AMBIGUOUS_MATCH,
            `${label} resolver emits deterministic ambiguity code for bmad-config.yaml coexistence`,
          );
        }
      });
    }
  } catch (error) {
    assert(false, 'Skill metadata filename authority resolver suite setup', error.message);
  }
}

module.exports = {
  runSkillMetadataFilenameAuthorityResolutionSuite,
};
