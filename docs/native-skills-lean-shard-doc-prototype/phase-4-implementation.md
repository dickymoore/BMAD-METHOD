# Phase 4 Implementation: Native Skills Lean PoC

Date: 2026-03-07  
Branch: `feature/native-skills-lean-shard-doc-prototype`

## Story

As BMAD installer maintainers, we need one duplicated native-skill prototype for shard-doc so we can validate intermediary migration behavior without changing existing task/help surfaces.

## Tasks

1. Add prototype ID metadata for `shard-doc.xml`.
2. Extend skill-manifest helper to expose prototype IDs.
3. Update config-driven installer to emit duplicate skill directories for `skill_format` targets only.
4. Add install-component tests:
   - Codex (skill-format) writes canonical + prototype shard-doc skills
   - Gemini (non-skill) does not write prototype duplicate output
5. Run installer component tests.

## Verification Plan

1. `node test/test-installation-components.js`
2. Confirm no edits to legacy `shard-doc.xml` behavior content.
3. Confirm no edits to `src/core/module-help.csv` command/help entries.

## Done Criteria

1. Four-phase artifacts exist in docs.
2. Prototype skill duplication works on supported skill-format install path.
3. Legacy shard-doc command/help behavior remains unchanged.
4. Test suite passes with new assertions.

