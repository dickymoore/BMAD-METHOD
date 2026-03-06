async function runShardDocMetadataResolutionAmbiguityCheck(context) {
  const { assert, fs, path, harness, tempProjectRoot, tempBmadDir, tempSourceTasksDir, SHARD_DOC_VALIDATION_ERROR_CODES } = context;

  await fs.writeFile(path.join(tempSourceTasksDir, 'bmad-config.yaml'), 'canonicalId: root-bmad-config\n', 'utf8');
  await fs.ensureDir(path.join(tempSourceTasksDir, 'shard-doc'));
  await fs.writeFile(path.join(tempSourceTasksDir, 'shard-doc', 'bmad-config.yaml'), 'canonicalId: shard-doc-bmad-config\n', 'utf8');

  try {
    await harness.generateValidationArtifacts({
      projectDir: tempProjectRoot,
      bmadDir: tempBmadDir,
      bmadFolderName: '_bmad',
      sourceXmlPath: path.join(tempSourceTasksDir, 'shard-doc.xml'),
    });
    assert(false, 'Shard-doc validation harness normalizes metadata-resolution ambiguity into harness-native deterministic error');
  } catch (error) {
    assert(
      error.code === SHARD_DOC_VALIDATION_ERROR_CODES.METADATA_RESOLUTION_FAILED,
      'Shard-doc validation harness emits deterministic metadata-resolution error code',
    );
  }
}

module.exports = {
  runShardDocMetadataResolutionAmbiguityCheck,
};
