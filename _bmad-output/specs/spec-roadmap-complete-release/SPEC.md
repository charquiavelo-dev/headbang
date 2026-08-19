---
id: SPEC-roadmap-complete-release
companions:
  - tasks.md
  - ../../../HEADBANG_ROADMAP_CODEX.md
sources: []
---

> **Canonical contract.** This SPEC and its companions define the single roadmap-complete release requested by the user.

# HEADBANG 2.0.0 — Roadmap-Complete, Self-Hosted Release

## Why

HEADBANG currently exposes useful Git delivery and native Git Flow primitives, but its own roadmap documents incomplete lifecycles across release management, collaboration, recovery, extensibility, package publishing, and MCP. Shipping those pieces across unspecified future versions would leave advertised workflows partially solved. Version 2.0.0 must close the entire roadmap in one coherent release and then prove the result by using HEADBANG to release HEADBANG itself.

The reported missing-`develop` failure occurred in a separate consumer repository. This source repository must remain on its normal `main`-based development model; it must not create or recover a local `develop` branch as part of the fix.

## Capabilities

- **CAP-1 — Native Git Flow completeness:** initialize configured base branches explicitly and idempotently, then support complete feature, release, and hotfix lifecycles using ordinary Git only.
- **CAP-2 — Release transaction:** plan, version, review, generate notes/changelog, synchronize, merge, tag, push, create provider releases, deliver, publish configured packages, emit artifacts, journal every step, and safely resume partial work.
- **CAP-3 — Collaboration:** execute provider-neutral branch/change-request lifecycles with protection awareness, configurable merge strategies, structured review state, explicitly approved review publishing, and cleanup.
- **CAP-4 — Delivery composition:** support profiles, named sets, documented channels, same-remote multi-branch delivery, provider capabilities, and exact per-destination partial results.
- **CAP-5 — Onboarding/configuration:** detect repository characteristics, generate presets non-interactively or interactively, validate versioned configuration, and perform explicit migrations without assuming a Node stack.
- **CAP-6 — Security/credentials:** keep secrets out of config and output, diagnose safe credential sources, support optional scanner adapters, enforce least privilege, and require explicit confirmation for dangerous mutations.
- **CAP-7 — Reliability:** serialize mutations with operation locks, preserve journals, detect/repair provably safe crash residue, resume only incomplete steps, and return idempotent `already-completed` results.
- **CAP-8 — Platform/data fidelity:** cover Windows/macOS/Linux semantics, detached HEAD, CRLF/case behavior, worktree cleanup, LFS, submodules, symlinks, large repositories, and block rather than silently produce incomplete projections.
- **CAP-9 — Extensibility:** expose versioned provider, release, scanner, version-source, package-publisher, and review-analyzer plugin contracts with discovery and compatibility validation.
- **CAP-10 — Monorepos:** support unified and independent package versions, impacted-package selection, package-specific tags/notes/deliveries, and an explicit release plan.
- **CAP-11 — Package registries:** provide a provider-neutral package publication service with an npm adapter, plan/dry-run, auth/version checks, configurable access/tag/registry/provenance, idempotency, and opt-in policy.
- **CAP-12 — Supply chain:** produce configured checksums, SBOM metadata, provenance/attestation inputs, and provider-release assets without claiming signatures that were not created.
- **CAP-13 — Shared automation contract:** CLI and MCP call the same domain services; read-only plans/resources are separate from mutations; JSON uses a stable envelope with operation ID, status, warnings, errors, and next actions.
- **CAP-14 — Documentation and lifecycle proof:** every advertised workflow includes configuration, CLI, MCP, safety, failure/recovery, and realistic end-to-end coverage.
- **CAP-15 — Self-hosted release:** this repository uses a non-Git-Flow HEADBANG profile to validate, push `main` plus the release tag, and publish `headbang-mcp@2.0.0` to npm through HEADBANG itself.

## Global constraints

- Implement every requirement in `HEADBANG_ROADMAP_CODEX.md` in this release; no roadmap capability remains assigned to a later release.
- Never install or invoke an external `git-flow` executable.
- Never infer recovery history for a deleted `develop`; initialization creates a missing configured branch only from the explicitly configured `main` SHA.
- Never silently force-push, delete remote branches, overwrite tags, resolve divergence, publish generated comments, publish packages, or write protected branches.
- Credentials come only from environment, Git helpers, provider CLIs, or OS stores and are always redacted.
- Managed projects remain stack-agnostic; only configured tasks may invoke stack-specific commands.
- Provider-specific concepts stay in adapters; core contracts use `changeRequest`, `providerRelease`, `delivery`, and `packagePublisher`.
- Mutations require explicit permissions and, for MCP, a previously generated confirmation token bound to the immutable plan.
- No implementation commit may be created until the relevant automated tests pass; the release commit and push require the complete suite to be green.

## Non-goals

- Hosting a SaaS control plane or storing user credentials.
- Pretending every third-party provider supports capabilities its API does not expose.
- Automatically publishing every package or every release; publication remains opt-in per profile/package.
- Recreating historical content of a deleted branch.

## Success signal

All roadmap items 1–50 are mapped to passing unit, contract, integration, or end-to-end tests before any implementation commit is created; `npm run check` and `npm pack --dry-run` are green on the release tree; documentation matches stable CLI/MCP JSON contracts; no `develop` branch is introduced in this repository; and the final push/tag/npm publication is performed through the newly built HEADBANG commands with npm reporting `headbang-mcp@2.0.0`.
