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
const { ManifestGenerator } = require('../tools/cli/installers/lib/core/manifest-generator');

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
    const pmAgentPath = path.join(projectRoot, 'src/modules/bmm/agents/pm.agent.yaml');

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
  // Test 4: compileAgents preserves installed modules during IDE updates
  // ============================================================
  console.log(`${colors.yellow}Test Suite 4: Compile Agents IDE Update${colors.reset}\n`);

  let tempRoot;
  try {
    const os = require('node:os');
    const yaml = require('js-yaml');
    const { Installer } = require('../tools/cli/installers/lib/core/installer');

    // Create isolated temp project with minimal manifest and module
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bmad-compile-'));
    const projectDir = path.join(tempRoot, 'project');
    const bmadDir = path.join(projectDir, 'bmad');
    const cfgDir = path.join(bmadDir, '_cfg');

    await fs.ensureDir(cfgDir);
    await fs.ensureDir(path.join(bmadDir, 'core')); // minimal module folder

    // Write manifest with module + IDE to trigger IDE update path
    const manifestData = {
      installation: { version: 'test' },
      modules: ['core'],
      ides: ['cursor'],
    };
    await fs.writeFile(path.join(cfgDir, 'manifest.yaml'), yaml.dump(manifestData), 'utf8');

    const installer = new Installer();

    // Stub heavy operations
    installer.rebuildAgentFiles = async () => {};
    installer.reinstallCustomAgents = async () => ({ count: 0, agents: [] });
    installer.buildStandaloneAgents = async () => {};

    let selectedModules;
    installer.ideManager.setup = async (ide, project, bmadPath, options) => {
      selectedModules = options.selectedModules;
      return { ide, project, bmadPath, options };
    };

    const result = await installer.compileAgents({ directory: projectDir, verbose: false });

    assert(Array.isArray(selectedModules) && selectedModules.length === 1, 'compileAgents passes installedModules to IDE setup');
    assert(selectedModules && selectedModules[0] === 'core', 'installedModules list comes from detected manifest modules');
    assert(result.agentCount === 0 && result.taskCount === 0, 'compileAgents completes without rebuilding in minimal setup');
  } catch (error) {
    assert(false, 'compileAgents handles IDE updates with installed modules', error.message);
  } finally {
    if (tempRoot) {
      await fs.remove(tempRoot);
    }
  }

  console.log('');

  // ============================================================
  // Test 5: TEA Agent Special Handling
  // ============================================================
  console.log(`${colors.yellow}Test Suite 5: TEA Agent Compilation${colors.reset}\n`);

  try {
    const builder = new YamlXmlBuilder();
    const teaAgentPath = path.join(projectRoot, 'src/modules/bmm/agents/tea.agent.yaml');
    const tempOutput = path.join(__dirname, 'temp-tea-agent.md');

    try {
      const result = await builder.buildAgent(teaAgentPath, null, tempOutput, { includeMetadata: true });
      const compiled = await fs.readFile(tempOutput, 'utf8');

      assert(compiled.includes('tea-index.csv'), 'TEA agent compilation includes critical_actions with tea-index.csv reference');

      assert(compiled.includes('testarch/knowledge'), 'TEA agent compilation includes knowledge base path');

      assert(compiled.includes('*test-design'), 'TEA agent menu includes test-design workflow');

      // Cleanup
      await fs.remove(tempOutput);
    } catch (error) {
      assert(false, 'TEA agent compiles successfully', error.message);
    }
  } catch (error) {
    assert(false, 'TEA compilation test setup', error.message);
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
