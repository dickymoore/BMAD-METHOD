async function runIndexDocsMetadataResolutionAmbiguityCheck(context) {
  const { assert, fs, path, harness, tempProjectRoot, tempBmadDir, tempSourceTasksDir, INDEX_DOCS_VALIDATION_ERROR_CODES } = context;

  await fs.writeFile(path.join(tempSourceTasksDir, 'bmad-config.yaml'), 'canonicalId: root-bmad-config\n', 'utf8');
  await fs.ensureDir(path.join(tempSourceTasksDir, 'index-docs'));
  await fs.writeFile(path.join(tempSourceTasksDir, 'index-docs', 'bmad-config.yaml'), 'canonicalId: index-docs-bmad-config\n', 'utf8');

  try {
    await harness.generateValidationArtifacts({
      projectDir: tempProjectRoot,
      bmadDir: tempBmadDir,
      bmadFolderName: '_bmad',
      sourceXmlPath: path.join(tempSourceTasksDir, 'index-docs.xml'),
    });
    assert(false, 'Index-docs validation harness normalizes metadata-resolution ambiguity into harness-native deterministic error');
  } catch (error) {
    assert(
      error.code === INDEX_DOCS_VALIDATION_ERROR_CODES.METADATA_RESOLUTION_FAILED,
      'Index-docs validation harness emits deterministic metadata-resolution error code',
    );
  }
}

module.exports = {
  runIndexDocsMetadataResolutionAmbiguityCheck,
};
