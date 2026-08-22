---
title: 'Keep the public README free of internal documentation'
type: 'chore'
created: '2026-08-20'
status: 'in-progress'
baseline_commit: '4834fd60dfd276e8fd5ff794bbf05c552f84f1b9'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `README.md` duplicates `docs/CONFIGURATION.md` and includes internal configuration, AI-agent workflow, and operational-product details. It must not reflect this conversation's prompts or internal product documentation.

**Approach:** Reduce the public README to a concise package introduction, installation, basic commands, development, and license/contribution links. Keep configuration and operational reference material out of every README.

## Boundaries & Constraints

**Always:** Treat `docs/CONFIGURATION.md` as the configuration reference; retain user-facing installation and basic CLI usage; publish npm before any GitHub change-request work; use interactive web authentication for npm and GitHub and never request credentials from the user.

**Ask First:** Do not alter documentation outside `README.md`, change the package version, publish, or create a GitHub change request until this spec is approved.

**Never:** Put prompts, agent instructions, internal workflow, configuration schema/reference material, or maintainer-only operational details in a README; do not use HEADBANG's package publisher.

</frozen-after-approval>

## Code Map

- `README.md` — public npm/package entry point; currently contains duplicated configuration and internal agent/operational material.
- `docs/CONFIGURATION.md` — retained configuration reference; no changes intended.
- `package.json` — current package version and npm scripts; patch release will be prepared only after approval.
- `AGENTS.md` — required publication sequence: interactive npm publish and registry verification before GitHub change-request flow.

## Tasks & Acceptance

**Execution:**
- [x] `README.md` — remove configuration examples/reference, internal policy/workflow, and AI-agent prompt-oriented content; retain a concise external package README.
- [x] `package.json` and lockfile if applicable — prepare a patch version for the documentation release.
- [ ] npm registry — run the package check, publish interactively, and verify the published version with `npm.cmd view`.
- [ ] GitHub — authenticate by web if required, then use HEADBANG's confirmed `change plan`/`change create` workflow for the documentation release.

**Acceptance Criteria:**
- Given a reader opens `README.md`, when they look for configuration or operational detail, then the README directs them away from internal/reference material rather than reproducing it.
- Given the README is scanned, when prompts, agent workflows, or internal configuration concepts are searched, then no such content remains.
- Given the release is approved, when publication runs, then npm completes and its registry version is verified before GitHub change-request work begins.

## Spec Change Log

## Design Notes

The smallest durable boundary is deletion: a short public README and a single dedicated configuration reference avoid two sources of truth.

## Verification

**Commands:**
- `npm.cmd run check` — expected: build and tests pass.
- `rg -n -i "agent|prompt|workflow|configuration|defaultProfile|permissions|projection" README.md` — expected: no internal/reference-oriented matches.
- `npm.cmd view headbang-mcp version` — expected: published patch version after npm publication.
