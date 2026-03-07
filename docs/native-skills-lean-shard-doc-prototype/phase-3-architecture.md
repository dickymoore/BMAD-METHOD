# Phase 3 Architecture: Native Skills Lean PoC

Date: 2026-03-07  
Branch: `feature/native-skills-lean-shard-doc-prototype`

## Existing Baseline

1. Installer already uses `bmad-skill-manifest.yaml` for canonical skill IDs.
2. `skill_format` platforms write directory-based skills (`<skill-name>/SKILL.md`).
3. Task/help command surfaces are driven by existing manifests/catalogs.

## Proposed Minimal Design

### 1) Metadata Extension

Extend per-file skill metadata to optionally include duplicate prototype IDs:

```yaml
shard-doc.xml:
  canonicalId: bmad-shard-doc
  prototypeIds:
    - bmad-shard-doc-skill-prototype
```

### 2) Installer Duplication Rule

In config-driven IDE setup, when `skill_format` is enabled:

1. Write canonical skill output as today.
2. Resolve prototype IDs for the same source artifact from sidecar metadata.
3. Write additional `SKILL.md` outputs under each prototype ID directory.

No duplication is applied for non-`skill_format` outputs.

### 3) Invariants

1. Legacy source artifact remains `src/core/tasks/shard-doc.xml`.
2. Existing help/command catalogs remain unchanged.
3. No new artifact category or broad migration framework introduced.

## Touched Components

1. `src/core/tasks/bmad-skill-manifest.yaml` (prototype metadata for shard-doc)
2. `tools/cli/installers/lib/ide/shared/skill-manifest.js` (read prototype IDs)
3. `tools/cli/installers/lib/ide/_config-driven.js` (duplicate skill write for skill-format installers)
4. `test/test-installation-components.js` (targeted Codex/Gemini assertions)

