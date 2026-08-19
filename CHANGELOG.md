# Changelog

## 2.0.0 - 2026-08-19

### Added

- Stable operation envelopes, immutable confirmation digests, redaction, mutation locks, transaction journals, partial-state reporting, and safe release resume.
- Release planning/execution with version adapters, notes/changelog, divergence preflight, atomic push, provider releases, npm publication, and supply-chain artifacts.
- Explicit native `flow init` for consumer repositories missing configured `develop`, without external `git-flow`, checkout changes, history guessing, or remote push.
- Provider-neutral change requests, project detection/presets, config migration, multi-source credential discovery, scanners, recovery, executable plugin registries, unified/independent monorepo releases, and MCP resources.
- Real stdio MCP tests covering handshake, tools, prompts, resources, confirmation-bound mutation, and protocol-only stdout.

### Safety

- Package publication is opt-in and requires permission, an exact plan digest, npm authentication, pack validation, and registry verification.
- HEADBANG refuses unsafe replay, stale bases, unsupported capabilities, unapproved review publication, and incomplete special-object projections.

## 1.1.3

### Fixed

- `headbang push --all` no longer reports a misleading successful empty result when no delivery profiles are configured. It now fails clearly, lists detected Git remotes, and explains that remotes are not automatically treated as profiles because projections and safety policies may differ.
- `headbang push <name>` now detects when `<name>` is only a Git remote and explains that a HEADBANG profile must be configured instead of silently bypassing policy.
- Human CLI output is now rendered as readable status summaries, delivery results, review findings, Git Flow results, release analysis, and profile summaries. Raw JSON is emitted only with `--json`.

### Safety

- HEADBANG deliberately does not auto-push unprofiled remotes. This prevents a public remote from accidentally receiving the full private repository when it was supposed to use a filtered projection.

## 1.1.1

### Fixed
- Restored **push as a first-class CLI/MCP capability** with `headbang push [profile]` and `headbang_push`.
- Added `headbang push --all` / MCP `all=true` for multi-profile manual pushes while safely skipping release-only profiles.
- Preserved `headbang deliver` / `headbang_deliver` as compatible advanced aliases.
- Added an end-to-end regression test that invokes the real CLI and verifies a remote branch is created.


All notable changes to HEADBANG are documented here. The project follows Semantic Versioning and Conventional Commits.

## 1.1.0 - 2026-08-17

### Added
- Native Git Flow lifecycle implemented directly on ordinary Git; no separate `git-flow` executable required.
- `feature start/finish`, `release start/finish`, `hotfix start/finish`, and `flow status` CLI commands.
- MCP tools `headbang_flow_status`, `headbang_flow_start`, and `headbang_flow_finish`.
- Review/quality gates before every Git Flow finish.
- Conventional Commit-compatible no-ff merge messages, annotated release/hotfix version tags, merge-back to `develop`, and branch cleanup.
- Explicit `permissions.flow` safety gate and configurable Git Flow branch prefixes.
- Event-aware delivery policies with `delivery.allowOn`, `delivery.autoOn`, and `delivery.requireTag`.
- `sourceRef` per profile so one remote can receive different source branches/projections (for example `develop` daily and `main` stable).
- Release/hotfix-aware automatic delivery, allowing stable/emergency mirrors to receive only tagged releases.
- Local rollback of base branches/tag when a multi-step Git Flow finish fails before completion.

### Changed
- Git Flow is now an executable workflow rather than branch-policy validation only.
- npm package identity/documentation aligned to `headbang-mcp`.

## 1.0.0 - 2026-08-17

### Added
- Multi-remote policy profiles and generic Git delivery.
- Repository projections with include, exclude and path mapping.
- Safe snapshot delivery using isolated temporary repositories.
- Conventional Commit validation and SemVer-lite release inspection.
- Structural code review, safety scanning and configurable quality gates.
- Git Flow, GitHub Flow, trunk-based and custom branch policy validation.
- MCP stdio server and polished cross-platform CLI.
- GitHub, GitLab, Bitbucket, Forgejo/Codeberg and generic provider detection.
