---
name: workflow
description: Execute a workflow definition by loading instructions and following steps
standalone: false
---

# Task: Execute Workflow

## Non-Negotiable Mandates
- Always read complete files (never use offsets or limits).
- Instructions are mandatory whether embedded or referenced (Markdown or XML-style tags).
- Execute all steps in exact order.
- Save to the template output file after every `<template-output>` tag.
- Never skip a step.

## Workflow Rules
1. Steps execute in numerical order (1, 2, 3...).
2. Optional steps require user confirmation unless `#yolo` mode is active.
3. After each `<template-output>` tag, save content and wait for the user to proceed unless `#yolo` is active.

## Execution Flow

### 1. Load and Initialize Workflow

#### 1a. Load configuration and resolve variables
- Use the `workflow-config` parameter as the workflow definition path (typically `workflow.md`).
- If frontmatter specifies `main_config` or `config_source`, load that config file.
- Resolve `{config_source}:` references with values from config.
- Resolve system variables and paths:
  - `date` (system-generated)
  - `{project-root}`, `{installed_path}`
- Ask the user for any variables that remain unknown.

#### 1b. Load required components
- Instructions are required: read the full instructions from a file or embedded list.
- If a template path is defined, read the full template file.
- If a validation path is defined, record it for later use.
- If `template: false`, treat as an action workflow; otherwise treat as a template workflow.
- Data files (csv/json): store paths only and load on demand when instructions reference them.

#### 1c. Initialize output (template workflows only)
- Resolve `default_output_file` with variables and `{{date}}`.
- Create the output directory if it doesn't exist.
- Write the template to the output file the first time; for action workflows, skip.

### 2. Process Each Instruction Step in Order

#### 2a. Handle step attributes
- `optional="true"` and not `#yolo`: ask the user to include.
- `if="condition"`: evaluate.
- `for-each="collection"`: iterate.
- `repeat="n"`: repeat n times.

#### 2b. Execute step content
- Process step instructions (Markdown and supported XML-style tags).
- Replace `{{variables}}` with values (ask the user if unknown).
- Execute tags:
  - `action` → perform the required action.
  - `check if="condition"` → conditional block wrapping actions (requires closing `</check>`).
  - `ask` → prompt the user and WAIT for response.
  - `invoke-workflow` → execute another workflow with given inputs.
  - `invoke-task` → execute the specified task.
  - `invoke-protocol name="protocol_name"` → execute a reusable protocol.
  - `goto step="x"` → jump to specified step.

#### 2c. Handle `<template-output>` tags
- Generate content for the section.
- Save to file (write first time, edit subsequent).
- Display generated content.
- Ask the user:
  - `[a]` Advanced Elicitation → run `{project-root}/_bmad/core/workflows/advanced-elicitation/workflow.md`
  - `[c]` Continue to next step
  - `[p]` Party Mode → run `{project-root}/_bmad/core/workflows/party-mode/workflow.md`
  - `[y]` YOLO the rest of this document only

#### 2d. Step completion
- If no special tags and not `#yolo`, ask: “Continue to next step? (y/n/edit)”.

### 3. Completion
- Confirm the document saved to the output path.
- Report workflow completion.

## Execution Modes
- `normal`: full user interaction and confirmation of every step.
- `yolo`: skip confirmations and elicitation, minimize prompts, and simulate remaining discussions with an expert user.

## Supported Tags

### Structural
- `step n="X" goal="..."`
- `optional="true"`
- `if="condition"`
- `for-each="collection"`
- `repeat="n"`

### Execution
- `action`
- `action if="condition"`
- `check if="condition">...</check`
- `ask`
- `goto`
- `invoke-workflow`
- `invoke-task`
- `invoke-protocol`

### Output
- `template-output`
- `critical`
- `example`

## Protocols

### discover_inputs
**Objective:** Intelligently load project files based on `input_file_patterns`.

- Only execute if `input_file_patterns` is defined in the workflow frontmatter.

#### Flow
1. **Parse input file patterns**
   - Read `input_file_patterns` from the workflow definition.
   - For each pattern group, note the `load_strategy` if present.

2. **Load files using smart strategies**
   - For each pattern in `input_file_patterns`:
     - **Try sharded documents first**
       - Determine `load_strategy` (defaults to `FULL_LOAD` if not specified).
       - `FULL_LOAD`:
         - Load all `.md` files in the sharded directory.
         - Concatenate content (index.md first if present, then alphabetical).
         - Store in `{pattern_name}_content`.
       - `SELECTIVE_LOAD`:
         - Check for template variables in the sharded single pattern (e.g., `{{epic_num}}`).
         - If undefined, ask the user for the value or infer from context.
         - Resolve the template to a specific file path.
         - Load that specific file and store in `{pattern_name}_content`.
       - `INDEX_GUIDED`:
         - Load index.md from the sharded directory.
         - Parse the table of contents and section headers.
         - Analyze workflow objective to identify relevant documents.
         - Load all identified relevant documents and store in `{pattern_name}_content`.
         - When in doubt, load it.
       - Mark the pattern as resolved and move to the next pattern.
     - **Try whole document if no sharded match**
       - Attempt glob match on the whole pattern (e.g., `{output_folder}/*prd*.md`).
       - If matches found, load all matching files completely and store in `{pattern_name}_content`.
       - Mark the pattern as resolved and continue.
