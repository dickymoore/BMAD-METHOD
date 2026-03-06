async function runHelpMetadataResolutionAmbiguityCheck(context) {
  const { assert, fs, path, harness, tempProjectRoot, tempBmadDir, tempSourceTasksDir, HELP_VALIDATION_ERROR_CODES } = context;

  await fs.writeFile(path.join(tempSourceTasksDir, 'bmad-config.yaml'), 'canonicalId: root-bmad-config\n', 'utf8');
  await fs.ensureDir(path.join(tempSourceTasksDir, 'help'));
  await fs.writeFile(path.join(tempSourceTasksDir, 'help', 'bmad-config.yaml'), 'canonicalId: help-bmad-config\n', 'utf8');

  try {
    await harness.generateValidationArtifacts({
      projectDir: tempProjectRoot,
      bmadDir: tempBmadDir,
      bmadFolderName: '_bmad',
      sourceMarkdownPath: path.join(tempSourceTasksDir, 'help.md'),
    });
    assert(false, 'Help validation harness normalizes metadata-resolution ambiguity into harness-native deterministic error');
  } catch (error) {
    assert(
      error.code === HELP_VALIDATION_ERROR_CODES.METADATA_RESOLUTION_FAILED,
      'Help validation harness emits deterministic metadata-resolution error code',
    );
  }
}

module.exports = {
  runHelpMetadataResolutionAmbiguityCheck,
};
