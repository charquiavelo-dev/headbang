---
id: SPEC-native-git-flow-bootstrap
companions:
  - tasks.md
  - ../../../HEADBANG_ROADMAP_CODEX.md
sources: []
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate.

# Native Git Flow Bootstrap

## Why

HEADBANG advertises a native Git Flow lifecycle, but a repository whose `develop` branch was deleted cannot start features or releases. The npm package must restore that lifecycle itself instead of requiring an external `git-flow` executable or a manual Git workaround.

## Capabilities

- **CAP-1**
  - **intent:** An operator can initialize the configured Git Flow base branches when `develop` is missing.
  - **success:** Initialization creates `develop` at the exact configured `main` SHA without changing the checked-out branch.
- **CAP-2**
  - **intent:** An operator can safely repeat Git Flow initialization.
  - **success:** A repeat returns `already-completed` and never resets, replaces, or moves an existing `develop` branch.
- **CAP-3**
  - **intent:** Humans and agents can invoke the same initialization capability through CLI and MCP.
  - **success:** `headbang flow init` and `headbang_flow_init` return the same core result shape and enforce the same policy.
- **CAP-4**
  - **intent:** Users can inspect whether native Git Flow is ready before mutation.
  - **success:** Flow status reports `mainExists`, `developExists`, and `ready` without changing refs.
- **CAP-5**
  - **intent:** Users receive the actionable Git failure even when Git also emits environment warnings.
  - **success:** A failed Git operation preserves both the fatal/conflict message and warnings, and the Windows rollback regression test passes.

## Constraints

- Use ordinary Git through HEADBANG core; never install or invoke an external `git-flow` executable.
- Initialization requires `permissions.flow=true`, a clean working tree, and an existing configured `main` branch.
- Existing `develop` history is immutable during initialization.
- CLI and MCP must call the same domain function.

## Non-goals

- Recovering or guessing the content of a previously deleted `develop` branch.
- Automatically pushing the newly created branch to a remote.
- Implementing the roadmap's future GitHub Flow, PR/MR, or registry abstraction work.

## Success signal

In a clean repository containing only `main`, HEADBANG initializes `develop`, then starts a feature from it using only its native workflow. Repeating initialization is a no-op, all tests pass on Windows, and version 1.1.4 is publishable.
