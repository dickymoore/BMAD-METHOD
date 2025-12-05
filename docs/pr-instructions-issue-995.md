# Pull Request Instructions for Issue #995

Use this checklist to open a PR from your fork.

1. Push branch `fix/995-workflow-init` to your fork (already pushed in this workspace).
2. On GitHub, choose **Compare & pull request** with:
   - **Base repository:** bmad-code-org/BMAD-METHOD
   - **Base branch:** main
   - **Head repository:** YOUR_FORK/BMAD-METHOD
   - **Head branch:** fix/995-workflow-init
3. Suggested PR title: `fix: anchor workflow-init commands to core workflow` (fix #995)
4. PR description (project template):
   - **What:** Prefix workflow command paths with `{project-root}` to avoid resolving core workflows inside modules; add regression test covering workflow-init command generation.
   - **Why:** `*workflow-init` crashed saying `.bmad/bmm/core/tasks/workflow.xml` missing because IDE command paths were relative and got resolved under the bmm module. Explicit project-root anchors point to `.bmad/core/tasks/workflow.xml` reliably.
   - **How:**
     - Update workflow command generator to prefix workflow and core workflow paths with `{project-root}` and keep core paths module-agnostic.
     - Add unit test ensuring generated commands for workflow-init use project-root anchored paths.
   - **Testing:** `npm test`
5. Submit the PR and link it to Issue #995.

If reviewers ask for validation, paste the latest `npm test` output from your run.
