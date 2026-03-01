---
name: shard-doc
description: Split a large markdown document into smaller section files while preserving the legacy /bmad-shard-doc user flow.
---

# Shard Document

Use this skill when the user wants to split a large markdown document into smaller files by section.

## Rules

- Preserve the existing `/bmad-shard-doc` interaction and result semantics.
- Use `npx @kayvan/markdown-tree-parser explode [source-document] [destination-folder]`.
- Default destination is the source filename without `.md`, in the same directory.
- Treat command failure or missing shard output as a hard stop.
- After sharding succeeds, explicitly handle the original document: delete, archive, or keep with a warning.

## Workflow

1. Ask for the source document path if it is not already provided.
2. Verify the source exists and has a `.md` extension. Halt with an error if it does not.
3. Determine the default destination folder and ask the user to accept it or provide a custom path.
4. Verify the destination exists or can be created and is writable. Halt with an error if it is not.
5. Tell the user sharding is starting.
6. Run `npx @kayvan/markdown-tree-parser explode [source-document] [destination-folder]`.
7. Capture command output and halt with the error if the command fails.
8. Verify the destination contains shard files and an `index.md`. Halt if no files were created.
9. Report completion with:
   - source document path
   - destination folder path
   - number of section files created
   - confirmation that `index.md` was created
   - any warnings or tool output
10. Ask what to do with the original document:
   - `[d]` delete it
   - `[m]` move it to an archive location
   - `[k]` keep it and warn that keeping both versions is not recommended
11. If the user chooses archive:
   - suggest a default archive path in an `archive/` subfolder beside the source
   - allow a custom archive path
   - create the archive directory if needed
   - move the original file and confirm the final path
12. If the user chooses keep:
   - warn that duplicate whole and sharded versions can confuse later document discovery
   - confirm that the original document remains in place

## Completion

The shard-doc run is complete only when the shard output is verified and the original-document handling choice has been resolved.
