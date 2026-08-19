# HEADBANG 2.0.0 Master Task Ledger

Each epic is independently testable but all are required for the single 2.0.0 release. Roadmap numbers in parentheses provide complete traceability.

## Epic A — Domain contract and stable operation envelope (40–48)

- [ ] A1. Introduce shared operation plan/result types with `operationId`, `success`, `status`, `warnings`, `errors`, `nextActions`, immutable plan digest, and partial-step state.
- [ ] A2. Route CLI and MCP through shared application services; eliminate interface-owned business logic.
- [ ] A3. Add explicit permission gates for every mutation, including package publication and review-comment publication.
- [ ] A4. Implement CLI confirmation and MCP plan-token authorization without accepting arbitrary shell commands.
- [ ] A5. Add idempotency keys and redaction utilities; test that destructive or secret-bearing behavior is never silent.

## Epic B — Complete release lifecycle (1–14)

- [ ] B1. Implement `release plan` with version reason, bases, merges, tag, files, gates, notes, remotes, providers, packages, artifacts, permissions, warnings, and destructive steps.
- [ ] B2. Add extensible version-source adapters for `package.json`, lockfiles, and configured JSON paths.
- [ ] B3. Generate Conventional Commit release notes and update `CHANGELOG.md` separately from provider notes.
- [ ] B4. Add fetch/ahead-behind/divergence preflight and deliberate atomic branch/tag push reporting.
- [ ] B5. Add provider-neutral release contracts and a GitHub release adapter supporting draft, prerelease, notes, inspection, idempotency, and assets.
- [ ] B6. Execute releases as journaled resumable transactions with exact partial-remote state and prerelease-safe semantics.
- [ ] B7. Add real stdio MCP handshake, discovery, resource, dry-run, plan-token, and mutation integration tests.

## Epic C — Native Git Flow repair and lifecycle (1, 8, 11, 50)

- [ ] C1. Add `flow init`/`headbang_flow_init`: create missing configured `develop` from configured `main` without checkout; repeat is `already-completed`.
- [ ] C2. Extend read-only status with base existence/readiness and preserve combined Git stdout/stderr on failures.
- [ ] C3. End-to-end test init → feature → release → hotfix → main/develop → remotes, including rollback and the external-consumer missing-`develop` regression.

## Epic D — GitHub Flow and change requests (15–18, 23, 50)

- [ ] D1. Implement branch start/push/change-request/check/review/merge/cleanup lifecycle.
- [ ] D2. Define provider-neutral `changeRequest` contracts and GitHub, GitLab, Bitbucket, and Forgejo adapters for create/status/checks/reviewers/merge/close.
- [ ] D3. Inspect branch protection/capabilities before mutation and support merge, squash, rebase, and valid fast-forward strategies.
- [ ] D4. Provide provider capability discovery used by planning rather than blind mutation.

## Epic E — Review system (19–20)

- [ ] E1. Support working-tree, staged, branch/base, commit, and change-request scopes.
- [ ] E2. Persist structured findings with fingerprint, state, rationale, and remediation while preserving current severity/file/line fields.
- [ ] E3. Publish only explicitly approved findings through provider adapters and journal what was posted.

## Epic F — Delivery composition (21–22)

- [ ] F1. Add named delivery sets with per-profile results and safe retry semantics.
- [ ] F2. Add named policy channels mapped to concrete profiles, including same-remote/different-branch and different-projection examples.

## Epic G — Init, presets, config, and credentials (24–27)

- [ ] G1. Implement interactive/non-interactive `headbang init` detection for remotes, bases, develop, package managers, tasks, providers, and monorepos.
- [ ] G2. Ship the seven roadmap presets and allow preview before writing `.headbang.json`.
- [ ] G3. Add versioned `config validate` and explicit, backup-safe `config migrate`.
- [ ] G4. Add redacted credential resolution/doctor status for environment, Git helpers, provider CLIs, and OS stores.

## Epic H — Security, locking, recovery, and resume (28–31)

- [ ] H1. Add optional Gitleaks/TruffleHog scanner adapters and policy-required scanner gates.
- [ ] H2. Add per-repository mutation locks with owner/age metadata and stale-lock detection.
- [ ] H3. Add transaction journals, `doctor --repair` for provably safe residue, and `resume <operation-id>` that skips completed steps.

## Epic I — Platform and repository fidelity (32–34)

- [ ] I1. Add Windows path/drive, quoting, CRLF, case, worktree, detached-HEAD, macOS, and Linux coverage where the CI platform permits.
- [ ] I2. Correctly handle or explicitly block LFS pointers, submodules, and symlinks during projection.
- [ ] I3. Add streaming/file-limit safeguards and performance fixtures for large repositories.

## Epic J — Public plugin platform (35)

- [ ] J1. Define versioned manifests, compatibility checks, discovery, isolation boundaries, error contracts, and public TypeScript interfaces.
- [ ] J2. Expose plugin slots for providers, releases, scanners, version sources, package publishers, and review analyzers with reference fixtures.

## Epic K — Monorepo releases (36)

- [ ] K1. Detect workspaces and model unified/independent versions, impacted packages, package tags, notes, profiles, and dependency order.
- [ ] K2. Include package-specific actions in release plans and transaction journals; test multi-package partial/retry behavior.

## Epic L — Package publishing and supply chain (37–38)

- [ ] L1. Define provider-neutral package plan/publisher contracts and npm adapter configuration.
- [ ] L2. Implement npm auth/version-existence checks, pack validation, access/tag/registry/provenance flags, dry-run, explicit publish permission, redaction, and idempotency.
- [ ] L3. Generate configured SHA256 manifests, SBOM output, provenance inputs, and release-asset descriptors.

## Epic M — MCP resources (39, 41–43)

- [ ] M1. Register resources for effective redacted config, profiles/channels, latest review, workflow status, operation history, release plans, and provider capabilities.
- [ ] M2. Keep resources read-only and expose all mutations as typed tools with safe defaults and stable envelopes.

## Epic N — Documentation and roadmap closure (49–50)

- [ ] N1. Update README and focused docs for purpose, config, CLI, MCP, safety, recovery, plugins, monorepos, package publishing, and full lifecycle examples.
- [ ] N2. Rewrite the roadmap as a 2.0.0 completion ledger with every former version item marked by implementation/test evidence.
- [ ] N3. Add migration notes from 1.1.3 and verify package contents, examples, changelog, license, security, and notices.

## Epic O — HEADBANG dogfooding and publication

- [ ] O1. Configure this repository with a `main`-based HEADBANG profile and npm package publisher; never create local `develop`.
- [ ] O2. Use the built CLI to run plan, review, configured gates, package dry-run, and final release transaction.
- [ ] O3. After the complete suite is green, commit intentionally, merge the normal implementation branch to `main`, and use HEADBANG to push `main` and `v2.0.0`; no implementation commit is allowed before its tests pass.
- [ ] O4. Use HEADBANG's npm adapter to publish `headbang-mcp@2.0.0`; verify the registry version and report the operation journal.
