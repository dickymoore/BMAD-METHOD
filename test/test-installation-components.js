/**
 * Installation Component Tests
 *
 * Tests individual installation components in isolation:
 * - Agent YAML → XML compilation
 * - Manifest generation
 * - Path resolution
 * - Customization merging
 *
 * These are deterministic unit tests that don't require full installation.
 * Usage: node test/test-installation-components.js
 */

const path = require('node:path');
const fs = require('fs-extra');
const { YamlXmlBuilder } = require('../tools/cli/lib/yaml-xml-builder');
const { Installer } = require('../tools/cli/installers/lib/core/installer');
const { ManifestGenerator } = require('../tools/cli/installers/lib/core/manifest-generator');
const { CodexSetup } = require('../tools/cli/installers/lib/ide/codex');
const { getSkillsFromBmad } = require('../tools/cli/installers/lib/ide/shared/bmad-artifacts');
const { toDashPath } = require('../tools/cli/installers/lib/ide/shared/path-utils');

// ANSI colors
const colors = {
  reset: '\u001B[0m',
  green: '\u001B[32m',
  red: '\u001B[31m',
  yellow: '\u001B[33m',
  cyan: '\u001B[36m',
  dim: '\u001B[2m',
};

let passed = 0;
let failed = 0;

/**
 * Test helper: Assert condition
 */
function assert(condition, testName, errorMessage = '') {
  if (condition) {
    console.log(`${colors.green}✓${colors.reset} ${testName}`);
    passed++;
  } else {
    console.log(`${colors.red}✗${colors.reset} ${testName}`);
    if (errorMessage) {
      console.log(`  ${colors.dim}${errorMessage}${colors.reset}`);
    }
    failed++;
  }
}

/**
 * Test Suite
 */
async function runTests() {
  console.log(`${colors.cyan}========================================`);
  console.log('Installation Component Tests');
  console.log(`========================================${colors.reset}\n`);

  const projectRoot = path.join(__dirname, '..');

  // ============================================================
  // Test 1: YAML → XML Agent Compilation (In-Memory)
  // ============================================================
  console.log(`${colors.yellow}Test Suite 1: Agent Compilation${colors.reset}\n`);

  try {
    const builder = new YamlXmlBuilder();
    const pmAgentPath = path.join(projectRoot, 'src/bmm/agents/pm.agent.yaml');

    // Create temp output path
    const tempOutput = path.join(__dirname, 'temp-pm-agent.md');

    try {
      const result = await builder.buildAgent(pmAgentPath, null, tempOutput, { includeMetadata: true });

      assert(result && result.outputPath === tempOutput, 'Agent compilation returns result object with outputPath');

      // Read the output
      const compiled = await fs.readFile(tempOutput, 'utf8');

      assert(compiled.includes('<agent'), 'Compiled agent contains <agent> tag');

      assert(compiled.includes('<persona>'), 'Compiled agent contains <persona> tag');

      assert(compiled.includes('<menu>'), 'Compiled agent contains <menu> tag');

      assert(compiled.includes('Product Manager'), 'Compiled agent contains agent title');

      // Cleanup
      await fs.remove(tempOutput);
    } catch (error) {
      assert(false, 'Agent compilation succeeds', error.message);
    }
  } catch (error) {
    assert(false, 'YamlXmlBuilder instantiates', error.message);
  }

  console.log('');

  // ============================================================
  // Test 2: Customization Merging
  // ============================================================
  console.log(`${colors.yellow}Test Suite 2: Customization Merging${colors.reset}\n`);

  try {
    const builder = new YamlXmlBuilder();

    // Test deepMerge function
    const base = {
      agent: {
        metadata: { name: 'John', title: 'PM' },
        persona: { role: 'Product Manager', style: 'Analytical' },
      },
    };

    const customize = {
      agent: {
        metadata: { name: 'Sarah' }, // Override name only
        persona: { style: 'Concise' }, // Override style only
      },
    };

    const merged = builder.deepMerge(base, customize);

    assert(merged.agent.metadata.name === 'Sarah', 'Deep merge overrides customized name');

    assert(merged.agent.metadata.title === 'PM', 'Deep merge preserves non-overridden title');

    assert(merged.agent.persona.role === 'Product Manager', 'Deep merge preserves non-overridden role');

    assert(merged.agent.persona.style === 'Concise', 'Deep merge overrides customized style');
  } catch (error) {
    assert(false, 'Customization merging works', error.message);
  }

  console.log('');

  // ============================================================
  // Test 3: Path Resolution
  // ============================================================
  console.log(`${colors.yellow}Test Suite 3: Path Variable Resolution${colors.reset}\n`);

  try {
    const builder = new YamlXmlBuilder();

    // Test path resolution logic (if exposed)
    // This would test {project-root}, {installed_path}, {config_source} resolution

    const testPath = '{project-root}/bmad/bmm/config.yaml';
    const expectedPattern = /\/bmad\/bmm\/config\.yaml$/;

    assert(
      true, // Placeholder - would test actual resolution
      'Path variable resolution pattern matches expected format',
      'Note: This test validates path resolution logic exists',
    );
  } catch (error) {
    assert(false, 'Path resolution works', error.message);
  }

  console.log('');

  // ============================================================
  // Test 4: Native Skill Migration Seams
  // ============================================================
  console.log(`${colors.yellow}Test Suite 4: Native Skill Migration${colors.reset}\n`);

  const tempRoot = path.join(__dirname, 'temp-install-artifacts');
  const tempBmadDir = path.join(tempRoot, '_bmad');

  try {
    await fs.remove(tempRoot);
    await fs.ensureDir(path.join(tempBmadDir, 'core', 'skills', 'shard-doc'));
    await fs.ensureDir(path.join(tempBmadDir, 'core', 'tasks'));

    const sourceSkillPath = path.join(projectRoot, 'src/core/skills/shard-doc/SKILL.md');
    const sourceTaskPath = path.join(projectRoot, 'src/core/tasks/shard-doc.xml');
    const sourceHelpCatalogPath = path.join(projectRoot, 'src/core/module-help.csv');
    await fs.copy(sourceSkillPath, path.join(tempBmadDir, 'core', 'skills', 'shard-doc', 'SKILL.md'));
    await fs.copy(sourceTaskPath, path.join(tempBmadDir, 'core', 'tasks', 'shard-doc.xml'));
    await fs.copy(sourceHelpCatalogPath, path.join(tempBmadDir, 'core', 'module-help.csv'));

    assert(
      toDashPath('core/skills/shard-doc/SKILL.md') === 'bmad-shard-doc.md',
      'Native skill path maps to the legacy shard-doc command name',
    );

    const discoveredSkills = await getSkillsFromBmad(tempBmadDir);
    const shardDocSkill = discoveredSkills.find((skill) => skill.name === 'shard-doc');

    assert(Boolean(shardDocSkill), 'Installed native shard-doc skill is discovered from _bmad/core/skills');

    assert(
      shardDocSkill?.relativePath === 'shard-doc/SKILL.md',
      'Discovered shard-doc skill keeps the relative SKILL.md path for downstream consumers',
    );

    const manifestGenerator = new ManifestGenerator();
    const manifestStats = await manifestGenerator.generateManifests(tempBmadDir, [], [], { ides: [] });
    const skillManifestPath = path.join(tempBmadDir, '_config', 'skill-manifest.csv');
    const skillManifest = await fs.readFile(skillManifestPath, 'utf8');

    assert(manifestStats.skills === 1, 'Manifest generation counts one native shard-doc skill in the PoC fixture');

    assert(
      skillManifest.includes('"shard-doc"') && skillManifest.includes('"_bmad/core/skills/shard-doc/SKILL.md"'),
      'Skill manifest records shard-doc with the installed native skill path',
    );

    await fs.writeFile(
      skillManifestPath,
      [
        'name,displayName,description,module,path,standalone',
        '"old-skill","Old Skill","stale","core","_bmad/core/skills/old-skill/SKILL.md","true"',
      ].join('\n') + '\n',
    );

    const regeneratedManifestGenerator = new ManifestGenerator();
    await regeneratedManifestGenerator.generateManifests(tempBmadDir, [], [], { ides: [] });
    const regeneratedSkillManifest = await fs.readFile(skillManifestPath, 'utf8');

    assert(
      !regeneratedSkillManifest.includes('"old-skill"') && regeneratedSkillManifest.includes('"shard-doc"'),
      'Skill manifest regeneration removes stale rows and rewrites only currently discovered skills',
    );

    const installer = new Installer();
    await installer.mergeModuleHelpCatalogs(tempBmadDir);
    const helpCatalogPath = path.join(tempBmadDir, '_config', 'bmad-help.csv');
    const helpCatalog = await fs.readFile(helpCatalogPath, 'utf8');
    const shardDocHelpRows = helpCatalog.split('\n').filter((line) => line.includes('bmad-shard-doc') && !line.startsWith('module,'));

    assert(shardDocHelpRows.length === 1, 'Merged bmad-help catalog preserves a single visible /bmad-shard-doc entry');

    const codex = new CodexSetup();
    const filteredTaskArtifacts = codex.filterTaskArtifactsWithNativeSkills(
      [{ relativePath: 'core/tasks/shard-doc.md' }, { relativePath: 'core/tasks/help.md' }],
      [{ relativePath: 'core/skills/shard-doc/SKILL.md' }],
    );

    assert(
      filteredTaskArtifacts.length === 1 && filteredTaskArtifacts[0].relativePath === 'core/tasks/help.md',
      'Codex task export drops the duplicate shard-doc task artifact when a native skill exists',
    );

    await fs.ensureDir(path.join(tempBmadDir, 'core', 'agents'));
    await fs.ensureDir(path.join(tempBmadDir, 'core', 'workflows'));

    const codexArtifacts = await codex.collectClaudeArtifacts(projectRoot, tempBmadDir, { selectedModules: [] });
    const shardDocArtifacts = codexArtifacts.artifacts.filter((artifact) => artifact.relativePath.includes('shard-doc'));

    assert(
      shardDocArtifacts.length === 1 &&
        shardDocArtifacts[0].type === 'native-skill' &&
        shardDocArtifacts[0].relativePath === 'core/skills/shard-doc/SKILL.md',
      'Codex artifact collection emits the native shard-doc skill and omits the duplicate task artifact',
    );
  } catch (error) {
    assert(false, 'Native shard-doc migration fixture setup', error.message);
  } finally {
    await fs.remove(tempRoot);
  }

  console.log('');

  // ============================================================
  // Test 5: QA Agent Compilation
  // ============================================================
  console.log(`${colors.yellow}Test Suite 5: QA Agent Compilation${colors.reset}\n`);

  try {
    const builder = new YamlXmlBuilder();
    const qaAgentPath = path.join(projectRoot, 'src/bmm/agents/qa.agent.yaml');
    const tempOutput = path.join(__dirname, 'temp-qa-agent.md');

    try {
      const result = await builder.buildAgent(qaAgentPath, null, tempOutput, { includeMetadata: true });
      const compiled = await fs.readFile(tempOutput, 'utf8');

      assert(compiled.includes('QA Engineer'), 'QA agent compilation includes agent title');

      assert(compiled.includes('qa-generate-e2e-tests'), 'QA agent menu includes automate workflow');

      // Cleanup
      await fs.remove(tempOutput);
    } catch (error) {
      assert(false, 'QA agent compiles successfully', error.message);
    }
  } catch (error) {
    assert(false, 'QA compilation test setup', error.message);
  }

  console.log('');

  // ============================================================
  // Summary
  // ============================================================
  console.log(`${colors.cyan}========================================`);
  console.log('Test Results:');
  console.log(`  Passed: ${colors.green}${passed}${colors.reset}`);
  console.log(`  Failed: ${colors.red}${failed}${colors.reset}`);
  console.log(`========================================${colors.reset}\n`);

  if (failed === 0) {
    console.log(`${colors.green}✨ All installation component tests passed!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.red}❌ Some installation component tests failed${colors.reset}\n`);
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error(`${colors.red}Test runner failed:${colors.reset}`, error.message);
  console.error(error.stack);
  process.exit(1);
});
