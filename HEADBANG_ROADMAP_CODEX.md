# HEADBANG — Product Roadmap & Codex Implementation Plan

**Project:** HEADBANG / `headbang-mcp`  
**Purpose:** Policy-driven Git workflows for humans and AI agents  
**Status baseline:** v1.0.0 published; v1.1.0 work includes native Git Flow + event-driven delivery policies.  
**Audience:** Codex / maintainers implementing the next HEADBANG releases.

---

## 1. Product principle

HEADBANG is **not an AI-only tool**. The CLI is a complete product by itself; MCP exposes the same safe capabilities to AI agents.

```text
Humans / shell scripts ── CLI ──┐
                                ├── HEADBANG Core ── Git / providers
AI agents ───────────── MCP ────┘
```

The core must remain provider-aware but provider-independent. GitHub, GitLab, Bitbucket, Forgejo/Codeberg and generic Git remotes are destinations/adapters, not separate implementations of HEADBANG.

A feature must not be advertised merely because HEADBANG validates part of it. If HEADBANG claims support for **Git Flow, GitHub Flow, releases, reviews or delivery**, the complete practical lifecycle for that capability must be implemented or the documentation must explicitly state the limitation.

---

# 2. Release strategy

Do **not** implement the entire roadmap in one release.

## v1.1.0 — Complete Git Flow + Release Lifecycle

This is the next required release. It closes the largest gaps in the currently published product.

### Already planned/implemented in the v1.1 work

- Native Git Flow using ordinary Git; no external `git-flow` binary.
- `feature start/finish`.
- `release start/finish`.
- `hotfix start/finish`.
- `permissions.flow` safety permission.
- Review/quality gates before `finish`.
- `--no-ff` merges.
- Release tags.
- Merge-back to `develop`.
- Branch cleanup.
- Local rollback when a multi-step finish fails.
- Delivery events such as `feature-finish`, `release-finish`, `hotfix-finish`.
- `delivery.allowOn`.
- `delivery.autoOn`.
- `delivery.requireTag`.
- `sourceRef` per profile.
- Same remote with different target branches/projections.
- Stable/release-only mirror use case.

### MUST be completed before v1.1.0 is considered finished

#### 1. Complete release lifecycle

A release must be more than merge + local tag.

Target lifecycle:

```text
release inspect/plan
    ↓
version decision
    ↓
release/x.y.z
    ↓
review + quality gates
    ↓
version files updated
    ↓
release notes / changelog
    ↓
merge → main
    ↓
tag
    ↓
merge-back → develop
    ↓
push branches + tag
    ↓
provider release
    ↓
configured deliveries
```

#### 2. `headbang release plan`

Add a read-only planning operation showing everything that would happen before mutation.

It should report at minimum:

- current version;
- proposed version;
- SemVer reason;
- source/base branches;
- expected merges;
- tag;
- version files to change;
- quality gates;
- release notes strategy;
- target remotes/profiles;
- automatic deliveries;
- provider releases that would be created;
- projections;
- potentially destructive operations;
- permissions required.

MCP equivalent must be read-only.

#### 3. Native version bump

HEADBANG already understands SemVer-lite. Extend it to update configured version sources.

Initial adapters:

- `package.json`;
- `package-lock.json` when appropriate;
- configurable JSON path/file strategy.

Do not hardwire HEADBANG to Node projects. Future adapters must be possible for Python, Rust, .NET, etc.

#### 4. Release notes + changelog

Provide native release-note generation based on Conventional Commits.

Suggested groups:

- Breaking Changes;
- Features;
- Fixes;
- Performance;
- Documentation;
- Maintenance/Other.

Support configuration:

```text
releaseNotes.strategy = headbang | provider | manual
```

Keep `CHANGELOG.md` generation/update distinct from provider release notes.

#### 5. Push branches and tags deliberately

A local tag is not a published release.

HEADBANG must explicitly know and report:

- which branches were pushed;
- which tags were pushed;
- which remote received them;
- whether the remote accepted them.

Use atomic push where supported/appropriate. Do not leave ambiguous partial success without reporting it.

#### 6. Provider release abstraction

Do not create a GitHub-only core API.

Create a provider-neutral release capability, with adapters such as:

```text
releasePublisher
  ├── github
  ├── gitlab
  ├── bitbucket
  └── forgejo
```

Initial v1.1 implementation may prioritize GitHub, but the abstraction must not make GitHub concepts part of the core domain.

Capabilities can include:

- create release;
- draft release;
- prerelease;
- release notes;
- attach assets;
- inspect existing release.

#### 7. GitHub Release implementation

For the GitHub adapter, support creation of the actual GitHub Release object associated with the tag.

Configurable behavior:

- enabled/disabled;
- draft;
- prerelease;
- generated notes vs HEADBANG notes;
- optional assets.

#### 8. Remote synchronization preflight

Before `finish`, merge, release or sensitive delivery:

- fetch required remotes;
- determine ahead/behind state;
- detect divergence;
- block unsafe operation when local base is stale;
- never silently resolve divergence unless policy explicitly permits it.

Example output:

```text
main      ahead 0 / behind 2  BLOCKED
develop   ahead 3 / behind 0  OK
```

#### 9. Transaction journal

Persist operation records for significant mutations.

Each operation should receive an ID and record, without secrets:

- operation type;
- timestamp;
- source SHA;
- target/base SHAs;
- profile(s);
- branches;
- tag;
- quality gates;
- projections;
- provider operations;
- success/failure/partial state;
- next recoverable action.

This becomes the foundation for future `resume` support.

#### 10. Partial remote failure semantics

Local rollback does not equal remote rollback.

If:

```text
GitHub ✓
Codeberg ✗
GitLab ✓
```

HEADBANG must preserve and report that exact state rather than claiming the entire release failed or succeeded atomically.

Do not automatically force remote rollback.

#### 11. Idempotency

Repeating a release operation must be safe.

HEADBANG should recognize:

- existing merge;
- existing tag;
- existing provider release;
- already delivered SHA;
- already updated version.

Return `already-completed` where appropriate rather than duplicating resources.

#### 12. Prerelease foundation

Support SemVer prereleases such as:

```text
1.3.0-beta.1
1.3.0-rc.1
```

At minimum ensure tags, version bump and provider release metadata can distinguish prereleases.

#### 13. MCP integration tests

Do not test only TypeScript functions.

Tests must start the actual stdio MCP server and verify:

- initialization/handshake;
- tool discovery;
- prompt discovery;
- read-only tool invocation;
- dry-run delivery;
- Git Flow status;
- release plan;
- no accidental logging on stdout.

`stdout` must remain protocol-only; diagnostics go to `stderr`.

#### 14. Documentation for v1.1

README and docs must include complete workflows, not only command references:

- standard Git Flow project;
- feature lifecycle;
- release lifecycle;
- hotfix lifecycle;
- GitHub release;
- stable Codeberg emergency mirror;
- same remote / multiple branches;
- release-only destination;
- public/private projection split;
- MCP equivalent of each major CLI operation.

---

# 3. v1.2.0 — Collaboration Workflows

Start this only after v1.1.0 is stable and released.

## 15. Full GitHub Flow lifecycle

Current strategy validation is not enough.

Implement the actual lifecycle:

```text
branch start
→ commits
→ push
→ pull request
→ checks/review
→ merge
→ cleanup
```

Keep it provider-neutral where possible.

## 16. Pull Request / Merge Request abstraction

Use a neutral internal concept such as `changeRequest`.

Adapters:

- GitHub Pull Requests;
- GitLab Merge Requests;
- Bitbucket Pull Requests;
- Forgejo Pull Requests.

Operations:

- create;
- inspect/status;
- list checks;
- reviewers;
- draft/open;
- merge;
- close;
- cleanup branch.

## 17. Provider-aware branch protection

Before attempting direct writes to protected branches, HEADBANG should inspect provider rules when the adapter supports it.

Examples:

- required PR/MR;
- required checks;
- required approvals;
- force-push prohibition;
- deletion protection.

HEADBANG should choose/refuse operations based on policy rather than blindly trying a push.

## 18. Merge strategies

Configurable strategies:

- merge commit;
- squash;
- rebase;
- fast-forward where valid.

Do not hardcode one strategy globally.

## 19. Expanded code-review model

Define review scopes explicitly:

- working tree;
- staged changes;
- branch vs base;
- commit;
- PR/MR.

Findings should be structured with:

- severity;
- category;
- file/line;
- fingerprint;
- state (`new`, `resolved`, `accepted`);
- rationale;
- optional remediation.

## 20. Publish review findings

Allow approved HEADBANG findings to become provider review comments.

Important: an LLM-generated finding must **not** be automatically posted publicly merely because the MCP produced it. Require explicit user/policy approval.

## 21. Delivery sets

Allow named groups of profiles.

Example:

```text
stable = github-public + codeberg-emergency + gitlab-backend
```

Then:

```bash
headbang deliver stable
```

Return per-destination results.

## 22. Delivery channels

Promote the same-remote/multi-branch concept to a documented first-class feature.

Example conceptual channels:

```text
daily   → develop
stable  → main/release-only
public  → sanitized projection
backend → backend projection
```

Channels are policy concepts; profiles remain concrete destinations.

## 23. Provider capability discovery

Expand `headbang providers` into capability reporting:

```text
push                    ✓
atomic push             ✓
change requests         ✓
provider releases       ✓
release assets          ✓
branch protection read  ✓
review comments         ✓
```

Use capabilities to plan operations before attempting them.

---

# 4. v1.3.x — Reliability, Security & Onboarding

These features can begin after collaboration workflows are stable. Some may be backported earlier if required for safety.

## 24. `headbang init`

Interactive/non-interactive project bootstrap.

Detect where possible:

- Git remotes;
- default branch;
- `develop` presence;
- package manager;
- available lint/test/build scripts;
- likely provider;
- monorepo indicators.

Generate `.headbang.json` without forcing Node assumptions.

## 25. Presets/templates

Examples:

- `git-flow`;
- `github-flow`;
- `stable-backup`;
- `public-mirror`;
- `private-full + public-sanitized`;
- `monorepo-backend`;
- `release-only-mirror`.

## 26. Configuration validation and migration

Add commands such as:

```bash
headbang config validate
headbang config migrate
```

Schema changes must be explicit and versioned.

## 27. Credential strategy

Never store provider tokens in `.headbang.json`.

Support safe credential sources/adapters such as:

- Git credential helper;
- environment variables;
- provider CLIs where available;
- OS credential stores/keychains.

`doctor` may report authentication status but must never print credentials.

## 28. Stronger secret scanning

Keep built-in lightweight scanning, but allow optional adapters for external scanners such as Gitleaks/TruffleHog.

Profiles may require a scanner before public delivery.

Do not make heavy external scanners mandatory runtime dependencies.

## 29. Operation locks

Prevent concurrent HEADBANG mutation operations in the same repository.

Examples to block:

- two simultaneous `release finish` operations;
- delivery while another HEADBANG release transaction is mutating refs.

## 30. Crash recovery

Detect orphaned:

- worktrees;
- temp directories;
- transaction locks;
- incomplete journals.

Potential command:

```bash
headbang doctor --repair
```

Repair only states HEADBANG can prove are safe to repair.

## 31. Resume operations

Using the transaction journal:

```bash
headbang resume <operation-id>
```

Focus on completing missing remote/provider steps, not replaying successful ones.

## 32. Platform hardening

Dedicated tests for:

- Windows paths/drive letters;
- shell quoting;
- CRLF;
- case-insensitive filesystems;
- worktree cleanup;
- macOS/Linux;
- detached HEAD.

## 33. Git LFS, submodules and symlinks

HEADBANG must either correctly support these during projection/delivery or explicitly detect and block unsupported cases with actionable errors.

Never silently publish incomplete projections.

## 34. Large repository performance

Improve projections and inspections to avoid unnecessary full copies.

Potential techniques:

- sparse checkout where appropriate;
- streaming copy;
- file-count/size limits;
- incremental inspection.

---

# 5. v2.0.0 — Extensibility & Advanced Release Management

Do not rush these into 1.x if they destabilize the core.

## 35. Public plugin architecture

Potential plugin boundaries:

- provider adapters;
- release publishers;
- secret scanners;
- version-file adapters;
- package publishers;
- review analyzers.

Design internal interfaces earlier, but do not promise a stable public plugin API until v2 if necessary.

## 36. Monorepo release management

Support deliberately rather than accidentally.

Possible modes:

- unified version;
- independent package versions;
- impacted package detection;
- multiple tags;
- package-specific release notes;
- package-specific delivery profiles.

## 37. Package registry publishing

Provider-neutral publishing layer.

Initial registry can be npm, followed by others where useful.

Possible lifecycle:

```text
release finish
→ package build
→ package validation
→ registry publish
→ provenance
→ provider release assets
```

Do not make npm publishing part of every release by default.

## 38. Supply-chain artifacts

Optional:

- SHA256 checksums;
- SBOM;
- signed/provenance metadata;
- build attestations.

## 39. MCP resources

Expose useful read-only state as MCP resources, for example:

- effective configuration;
- profile list;
- latest review;
- workflow status;
- operation history;
- release plan.

Tools remain for actions; resources provide inspectable state.

---

# 6. Cross-version requirements

These rules apply to every HEADBANG version.

## 40. CLI and MCP use the same core

Do not implement business logic separately in `cli.ts` and `mcp.ts`.

Both interfaces should call the same domain services.

## 41. MCP safety

Mutation tools must have explicit schemas and permissions.

Prefer separate read-only planning/inspection tools from mutation tools.

MCP must never receive arbitrary shell commands that bypass configured tasks/policies.

## 42. Human confirmation model

CLI may support interactive confirmation for dangerous operations.

MCP cannot depend on interactive stdin prompts. For MCP, return a plan/confirmation requirement and require a subsequent explicitly authorized mutation call.

## 43. Stable JSON contract

`--json` should evolve toward a stable response envelope:

```json
{
  "operationId": "...",
  "success": true,
  "status": "completed",
  "warnings": [],
  "errors": [],
  "nextActions": []
}
```

Do not casually break machine-readable output.

## 44. Tasks remain stack-agnostic

HEADBANG itself is distributed through Node/npm, but managed projects can be React, Next.js, NestJS, Python, Go, Rust, Java, .NET, PHP, WordPress, C/C++, monorepos, etc.

Quality gates are configured commands; do not assume `npm test` globally.

## 45. Provider-neutral domain language

Prefer:

- `changeRequest` internally instead of hardcoding PR/MR;
- `providerRelease` instead of `githubRelease`;
- `deliveryProfile`/`channel` instead of provider-specific workflow concepts.

Provider-specific terminology belongs in adapters and user-facing provider docs.

## 46. Least privilege

Every mutation capability should be opt-in where practical:

```text
permissions.commit
permissions.push
permissions.forcePush
permissions.flow
permissions.createPr
permissions.mergePr
permissions.release
```

A credential being technically capable of an action does not mean HEADBANG is authorized by policy to perform it.

## 47. No silent destructive behavior

Never silently:

- force push;
- delete remote branches;
- overwrite tags;
- resolve divergence;
- publish generated review comments;
- publish packages;
- change protected branches.

## 48. Idempotent automation

Automated operations should be safe to retry after network/process failures.

## 49. Documentation is part of the feature

A feature is incomplete until README/docs contain:

- purpose;
- configuration;
- CLI usage;
- MCP usage where applicable;
- safety behavior;
- failure/recovery behavior;
- realistic examples.

## 50. Full lifecycle rule

Before documenting support for a workflow, test its complete lifecycle end-to-end.

Examples:

### Git Flow

```text
start feature → work → review → finish → develop
start release → version → gates → main → tag → develop → remote → provider release
hotfix → main → tag → develop → remote
```

### GitHub Flow

```text
branch → push → PR → checks/review → merge → cleanup
```

### Delivery

```text
source selection → projection → safety → policy → push → verification → journal
```

### Release

```text
version → notes → branch → review → merge → tag → push → provider release → assets → verification
```

If HEADBANG implements only part of a lifecycle, documentation must say exactly which part.

---

# 7. Suggested version timeline

Do not tie this roadmap to calendar dates. Releases should ship when their acceptance criteria are green.

| Version | Theme | Ship when |
|---|---|---|
| **1.1.0** | Git Flow + Complete Releases | Git Flow lifecycle, event delivery, remote preflight, version bump, notes, tag/branch publishing, GitHub/provider release foundation, journaling and real MCP integration tests are green. |
| **1.2.0** | Collaboration | GitHub Flow lifecycle, PR/MR abstraction, branch protection awareness, review publishing and delivery sets/channels are stable. |
| **1.3.x** | Reliability & Onboarding | Init/presets, config migration, credentials, recovery/resume, stronger scanning and platform hardening are stable. Patch releases may ship safety fixes independently. |
| **2.0.0** | Extensibility | Stable plugin API, advanced monorepo/versioning and registry publishing justify a public API/breaking-version boundary. |

---

# 8. Codex execution order

Codex should work in this order unless a dependency requires a small adjustment.

## Phase A — finish 1.1.0

1. Audit current published HEADBANG + current v1.1 patch.
2. Preserve backward compatibility with v1.0 config where possible.
3. Complete remote sync/ahead-behind preflight.
4. Implement release planning.
5. Implement version-file adapters and bump transaction.
6. Implement native release notes/changelog support.
7. Implement branch + tag publication and verification.
8. Add provider release interface.
9. Implement GitHub provider release adapter first.
10. Integrate release-finish with provider release/delivery policy.
11. Implement transaction journal and partial-failure reporting.
12. Add idempotency checks.
13. Add prerelease-safe semantics.
14. Add real MCP stdio integration tests.
15. Add end-to-end Git tests using temporary/bare repositories.
16. Update README, CHANGELOG, examples and docs.
17. Run build/typecheck/tests/package dry-run.
18. Do not publish automatically unless explicitly requested.

## Phase B — 1.2.0

1. Provider-neutral change-request interface.
2. GitHub Flow lifecycle.
3. GitHub PR adapter.
4. GitLab MR adapter.
5. Forgejo/Codeberg + Bitbucket adapters where capability permits.
6. Branch protection inspection.
7. Merge strategies.
8. Structured review state/fingerprints.
9. Explicit review publishing.
10. Delivery sets/channels.
11. Provider capability matrix.
12. Full documentation + E2E tests.

## Phase C — 1.3.x

1. `headbang init`.
2. Presets.
3. Config validation/migration.
4. Credential adapters/status.
5. External secret scanner adapters.
6. Repository operation lock.
7. Crash recovery.
8. Transaction resume.
9. Windows/macOS/Linux hardening.
10. LFS/submodule/symlink handling.
11. Large-repo optimization.

## Phase D — 2.0

1. Stabilize plugin contracts.
2. Publish plugin SDK/API.
3. Monorepo version/release modes.
4. Package registry adapters.
5. Provenance/SBOM/checksum pipeline.
6. MCP resources and advanced automation surfaces.

---

# 9. Definition of Done for every release

Codex must not mark a version complete until all applicable items pass.

- TypeScript build succeeds.
- Typecheck succeeds.
- Unit tests succeed.
- Git integration tests succeed.
- MCP stdio integration tests succeed.
- No non-protocol stdout from MCP.
- Linux tests succeed.
- Windows tests succeed.
- macOS tests succeed when CI provides it.
- `npm pack --dry-run` contains only intended files.
- No secrets/test credentials in package/repo.
- Backward compatibility tested or breaking change explicitly documented.
- README updated.
- CHANGELOG updated.
- Config reference updated.
- CLI reference updated.
- MCP reference updated.
- At least one realistic E2E example exists for every major new workflow.
- Dangerous operations have explicit permission/policy checks.
- Dry-run/plan path exists for high-impact operations.
- Partial failure behavior is documented.
- Retry/idempotency behavior is tested for remote operations where applicable.

---

# 10. Explicit non-goals for the immediate release

Do **not** delay v1.1.0 for these unless implementation reveals a hard dependency:

- full public plugin ecosystem;
- advanced independent-version monorepos;
- every package registry;
- hosted HEADBANG SaaS;
- remote/cloud MCP server;
- arbitrary AI code generation;
- replacing Git itself;
- implementing every provider feature identically when the provider does not support it.

---

# 11. Product positioning to preserve

Recommended positioning:

> **HEADBANG — Policy-driven Git workflows for humans and AI agents.**
>
> One Git workflow. Multiple repositories, branches, projections, release channels and delivery policies. Use it directly from the CLI or expose the same governed capabilities to AI agents through MCP.

HEADBANG should remain useful even when the user has **no AI tooling installed at all**.

MCP is an integration surface, not a requirement.

---

# 12. Core scenarios that HEADBANG must eventually demonstrate

### Normal developer

```text
React/Python/Go/etc project
→ HEADBANG CLI
→ review
→ Conventional Commit
→ branch workflow
→ release
```

### AI agent

```text
Codex/OpenCode/Claude/etc
→ MCP
→ same HEADBANG policies/core
→ no policy bypass
```

### Public + private repositories

```text
private full repo → Codeberg
public sanitized projection → GitHub
```

### Monorepo projections

```text
full monorepo → internal remote
backend/** → backend repository root
frontend/** → frontend repository root
```

### Daily vs emergency stable mirror

```text
GitHub/develop → daily work
Codeberg/stable → release-finish + hotfix-finish only
```

### Same remote, different branches/content

```text
origin/develop → full daily tree
origin/stable → stable release tree
origin/public → sanitized projection
origin/backend → backend-only projection
```

### Complete release

```text
Conventional Commits
→ SemVer
→ release plan
→ release branch
→ gates
→ version bump
→ notes
→ main
→ tag
→ develop merge-back
→ push
→ GitHub/GitLab/etc release
→ configured stable mirrors
→ operation journal
```

---

**This document is the roadmap/source of truth for post-v1.0 HEADBANG development until maintainers intentionally revise it.**
