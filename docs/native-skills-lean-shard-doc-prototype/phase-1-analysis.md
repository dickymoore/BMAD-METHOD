# Phase 1 Analysis: Native Skills Lean PoC

Date: 2026-03-07  
Branch: `feature/native-skills-lean-shard-doc-prototype`  
North-star reference: `docs/native-skills-transition-north-star-thread-2026-03-07.md`

## Problem Statement

The prior native-skills transition effort overshot scope. This recovery PoC must prove a single end-to-end duplicate native-skill path while preserving all current legacy task/help behavior.

## Scope

In scope:

1. One duplicated native-skill prototype only: `bmad-shard-doc-skill-prototype`
2. Source capability remains `src/core/tasks/shard-doc.xml`
3. Installer behavior only for supported native-skill tools:
   - discover prototype metadata
   - register/copy to skill output surface
4. Minimal tests proving prototype duplication for skill tools and no regression for non-skill tools

Out of scope:

1. Multi-capability conversion
2. Broad authority/metadata redesign
3. Command/help surface changes
4. Repository-wide migration framework

## Constraints

1. Keep `module-help.csv` behavior unchanged
2. Keep legacy `bmad-shard-doc` capability intact
3. Keep PR lean and reviewable
4. Avoid touching unrelated installer paths

## Risks and Mitigations

1. Risk: duplicate visible command surfaces  
   Mitigation: apply prototype duplication only on `skill_format` installers
2. Risk: behavior drift for legacy task/help paths  
   Mitigation: no edits to legacy task file, task/help catalogs, or command generation rules
3. Risk: hidden regressions across tool outputs  
   Mitigation: add targeted install-component tests for one skill-format and one non-skill tool

