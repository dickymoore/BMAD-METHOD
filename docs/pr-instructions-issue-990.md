# Pull Request Instructions for Issue #990

Use this checklist to open a PR from your fork.

1. Push branch `fix/990-installed-modules` to your fork (already done in this workspace).
2. On GitHub, choose **Compare & pull request** with:
   - **Base repository:** bmad-code-org/BMAD-METHOD
   - **Base branch:** main
   - **Head repository:** YOUR_FORK/BMAD-METHOD
   - **Head branch:** fix/990-installed-modules
3. PR title suggestion: `fix: use installed modules during compileAgents (fix #990)`
4. PR description (use project template):
   - **What:** Define installed modules before updating IDE configs in `compileAgents`; reuse detected IDE list; add regression test covering IDE update path.
   - **Why:** `bmad compile` crashed with `installedModules is not defined` when an IDE was configured; this patch prevents the crash and ensures IDE setup receives the correct module list. Fixes #990.
   - **How:**
     - Detect existing installation once and reuse its module/IDE metadata in `compileAgents`.
     - Fallback to manifest parsing only when detection lacks IDE data.
     - Add targeted test to `test/test-installation-components.js` that stubs heavy operations and verifies IDE setup receives installed modules.
   - **Testing:** `npm test`
5. Submit the PR and link it to Issue #990.

If reviewers ask for proof of testing, paste the `npm test` output from your local run.
