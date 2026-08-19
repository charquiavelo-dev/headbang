# Native Git Flow Bootstrap Tasks

1. **Core initialization** — `src/workflow.ts`
   - Add an idempotent initializer that validates the Git Flow profile, permission, cleanliness, and configured `main` branch before creating missing `develop`.
   - Acceptance: given only `main`, when initialized, then `develop` resolves to the same SHA and the current branch is unchanged.
2. **Read-only readiness** — `src/workflow.ts`, `src/ui/render.ts`
   - Extend status with base-branch existence and readiness fields.
   - Acceptance: given missing `develop`, when status runs, then it reports `ready=false` without creating refs.
3. **CLI surface** — `src/cli.ts`
   - Add `headbang flow init` with human and JSON output.
   - Acceptance: given an authorized profile, when the command runs twice, then the second result is `already-completed`.
4. **MCP surface** — `src/mcp.ts`
   - Add typed `headbang_flow_init` backed by the same core operation.
   - Acceptance: tool discovery lists it and invocation returns the core result without protocol noise.
5. **Actionable Git errors** — `src/git/git.ts`
   - Preserve stdout and stderr when a Git command fails so warnings cannot mask the conflict/fatal message.
   - Acceptance: the existing Windows rollback regression recognizes the merge failure and rollback leaves refs unchanged.
6. **Regression coverage** — `test/functional.test.mjs`, `test/core.test.mjs`
   - Cover missing-main rejection, missing-develop creation, idempotency, permission/cleanliness gates, status readiness, CLI, and MCP discovery/invocation.
   - Acceptance: `npm run check` passes.
7. **Release artifacts** — `README.md`, `docs/WORKFLOWS.md`, `docs/MCP.md`, `docs/TROUBLESHOOTING.md`, `CHANGELOG.md`, `HEADBANG_ROADMAP_CODEX.md`, `package.json`, `package-lock.json`
   - Document native bootstrap and the non-recovery guarantee; mark the issue complete; bump to 1.1.4.
   - Acceptance: `npm pack --dry-run` contains only intended package files and the published docs match the behavior.
