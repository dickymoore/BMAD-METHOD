const path = require('node:path');
const fs = require('fs-extra');
const yaml = require('yaml');

const SKILL_MANIFEST_FILENAMES = ['skill-manifest.yaml', 'bmad-skill-manifest.yaml', 'manifest.yaml'];

/**
 * Load skill manifest from a directory.
 * Single-entry manifests (canonicalId at top level) apply to all files in the directory.
 * Multi-entry manifests are keyed by source filename.
 * @param {string} dirPath - Directory to check for supported manifest filenames
 * @returns {Object|null} Parsed manifest or null
 */
async function loadSkillManifest(dirPath) {
  for (const manifestFilename of SKILL_MANIFEST_FILENAMES) {
    const manifestPath = path.join(dirPath, manifestFilename);
    try {
      if (!(await fs.pathExists(manifestPath))) continue;
      const content = await fs.readFile(manifestPath, 'utf8');
      const parsed = yaml.parse(content);
      if (!parsed || typeof parsed !== 'object') return null;
      if (parsed.canonicalId) return { __single: parsed };
      return parsed;
    } catch (error) {
      console.warn(`Warning: Failed to parse ${manifestFilename} in ${dirPath}: ${error.message}`);
      return null;
    }
  }

  return null;
}

/**
 * Get the canonicalId for a specific file from a loaded skill manifest.
 * @param {Object|null} manifest - Loaded manifest (from loadSkillManifest)
 * @param {string} filename - Source filename to look up (e.g., 'pm.md', 'help.md', 'pm.agent.yaml')
 * @returns {string} canonicalId or empty string
 */
function getCanonicalId(manifest, filename) {
  const manifestEntry = resolveManifestEntry(manifest, filename);
  return manifestEntry?.canonicalId || '';
}

/**
 * Get duplicate prototype skill IDs for a specific file from a loaded skill manifest.
 * Prototype IDs are optional and only used by skill-format installers.
 * @param {Object|null} manifest - Loaded manifest (from loadSkillManifest)
 * @param {string} filename - Source filename to look up
 * @returns {string[]} Duplicate prototype IDs
 */
function getPrototypeIds(manifest, filename) {
  const manifestEntry = resolveManifestEntry(manifest, filename);
  if (!manifestEntry) return [];

  // Support one canonical field name plus temporary/fallback aliases during transition.
  const rawIds = manifestEntry.prototypeIds ?? manifestEntry.skillPrototypeIds ?? manifestEntry.duplicateSkillIds ?? [];
  return normalizeIdList(rawIds);
}

/**
 * Resolve a manifest entry for a source filename.
 * Handles single-entry manifests and extension fallbacks.
 * @param {Object|null} manifest - Loaded manifest
 * @param {string} filename - Source filename
 * @returns {Object|null} Manifest entry object
 */
function resolveManifestEntry(manifest, filename) {
  if (!manifest) return null;
  // Single-entry manifest applies to all files in the directory
  if (manifest.__single) return manifest.__single;
  // Multi-entry: look up by filename directly
  if (manifest[filename]) return manifest[filename];
  // Fallback: try alternate extensions for compiled files
  const baseName = filename.replace(/\.(md|xml)$/i, '');
  const agentKey = `${baseName}.agent.yaml`;
  if (manifest[agentKey]) return manifest[agentKey];
  const xmlKey = `${baseName}.xml`;
  if (manifest[xmlKey]) return manifest[xmlKey];
  return null;
}

/**
 * Normalize possible scalar/array ID list formats to a unique string array.
 * @param {string|string[]|unknown} ids - Candidate IDs
 * @returns {string[]} Normalized IDs
 */
function normalizeIdList(ids) {
  const asArray = Array.isArray(ids) ? ids : typeof ids === 'string' ? [ids] : [];
  const unique = new Set();

  for (const id of asArray) {
    if (typeof id !== 'string') continue;
    const trimmed = id.trim();
    if (!trimmed) continue;
    unique.add(trimmed);
  }

  return [...unique];
}

module.exports = { loadSkillManifest, getCanonicalId, getPrototypeIds };
