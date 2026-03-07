# Phase 2 PRD: Native Skills Lean PoC

Date: 2026-03-07  
Branch: `feature/native-skills-lean-shard-doc-prototype`

## Goal

Ship a narrow, testable PoC that installs a duplicated native skill for shard-doc as `bmad-shard-doc-skill-prototype` while preserving existing shard-doc command/help behavior.

## Functional Requirements

1. The core task skill metadata supports a prototype duplicate ID for `shard-doc.xml`.
2. Installer discovery reads the prototype duplicate ID from source metadata.
3. For `skill_format` tools, installer writes both:
   - canonical skill: `bmad-shard-doc/SKILL.md`
   - prototype skill: `bmad-shard-doc-skill-prototype/SKILL.md`
4. For non-`skill_format` tools, installer output remains unchanged (no prototype duplicate command file).
5. Existing shard-doc legacy artifact remains available via current task/help flows.

## Non-Functional Requirements

1. PR stays lean (minimal files and logic changes).
2. No behavior change for existing command/help interfaces.
3. Tests are deterministic and run in current installation component suite.

## Acceptance Criteria

1. `src/core/tasks/shard-doc.xml` remains unchanged as the legacy capability artifact.
2. Installing for Codex creates `bmad-shard-doc-skill-prototype/SKILL.md` in `.agents/skills`.
3. Installing for Codex still creates the existing `bmad-shard-doc/SKILL.md`.
4. Installing for Gemini does not create `bmad-shard-doc-skill-prototype` command output.
5. Existing install-component suite continues to pass with added assertions.

