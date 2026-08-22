---
title: 'Expose complete governed Git repository control and working pull requests'
type: 'feature'
created: '2026-08-20'
status: 'in-review'
review_loop_iteration: 0
baseline_commit: '3ebb411f9e77cfde753e5b187a5817bbd65d8d70'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** HEADBANG exposes curated workflows and provider change-request adapters, but agents cannot invoke the rest of native Git (including cherry-pick), and this repository's own profile does not enable its already-implemented pull-request path.

**Approach:** Add one opt-in, exact-plan-confirmed native Git passthrough shared by CLI and MCP, enable the existing provider-neutral pull-request workflow for this repository, document only the new user-facing capabilities, then prove and publish the package through GitHub and npm.

## Boundaries & Constraints

**Always:** Pass Git arguments directly to the existing process runner without a shell; require an explicit profile permission and confirmation digest covering the exact repository, arguments, commit, branch, and config; journal execution; keep provider-neutral pull-request behavior; add runnable evidence for cherry-pick and MCP discovery/execution; keep README changes feature-focused without release/version announcements; publish the next available npm package version without browser/OTP-web flow.

**Ask First:** Halt only if GitHub/npm credentials are unavailable, the authenticated npm identity cannot publish `headbang-mcp`, remote state diverges, or publication would target anything other than configured `origin` and the public `headbang-mcp` package.

**Never:** Execute raw Git through a shell, silently bypass profile permissions or confirmation, maintain a speculative per-subcommand Git wrapper catalog, force-push/reset/delete unrelated state, store credentials, or claim that provider APIs are part of Git itself.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Plan arbitrary Git | `args: ["cherry-pick", "<sha>"]`, permitted profile | Immutable plan, digest, no repository mutation | Reject empty arguments or missing `permissions.git` |
| Execute exact plan | Same arguments plus matching digest | Existing Git runner executes once and journals the result | Surface Git conflict/failure without auto-resolution |
| Changed request | Arguments, branch, HEAD, config, or digest differ | No Git execution | Require a fresh plan and confirmation |
| Create pull request | Enabled forge profile, local source branch, confirmed plan | Push source branch and call the existing provider adapter | Preserve provider/auth/API errors verbatim and safely |

</frozen-after-approval>

## Code Map

- `src/git/git.ts` — existing shell-free `git -C <repo> ...args` runner; reuse unchanged.
- `src/application.ts:26` — shared CLI/MCP application boundary and journal helper; add Git plan/execute methods here.
- `src/domain/operation.ts:27` — stable plan digest, redaction, and exact confirmation primitives.
- `src/types.ts:19` and `src/config/schema.ts:22` — permission contract and validation; add the opt-in native Git capability.
- `src/mcp.ts` — MCP tool registration; expose one array-based Git tool with plan-first defaults.
- `src/cli.ts:35` — CLI help/routing; expose `headbang git -- <args...>` without mis-parsing Git flags.
- `src/collaboration.ts:18` and `src/providers.ts:21` — existing pull-request plan/push/API path; reuse rather than replace.
- `.headbang.json` — enable `changeRequest` and native Git permission for this repository's governed self-release profile.
- `test/mcp.test.mjs` and `test/v2.test.mjs` — real stdio discovery/confirmed execution and focused native Git/cherry-pick coverage.
- `README.md:592` and `README.md:620` — document the new permission, CLI passthrough, pull-request workflow, and MCP tools without release notes.
- `package.json` / `package-lock.json` — advance to the next unpublished patch required by npm.

## Tasks & Acceptance

**Execution:**
- [x] `src/types.ts`, `src/config/schema.ts`, `src/application.ts` — add the smallest governed native Git contract and implementation using existing plan, permission, journal, and runner primitives.
- [x] `src/mcp.ts`, `src/cli.ts` — expose the same plan-first behavior to agents and terminal users.
- [x] `.headbang.json`, `test/mcp.test.mjs`, `test/v2.test.mjs` — enable/prove PR creation readiness and arbitrary Git execution including cherry-pick failure/success behavior.
- [x] `README.md`, package metadata — document only new features and prepare an unpublished package artifact.
- [ ] GitHub/npm — validate, commit, push a feature branch, create and merge a pull request using HEADBANG where credentials allow, then publish and verify npm without OTP-web flow.

**Acceptance Criteria:**
- Given a profile without native Git permission, when CLI or MCP requests arbitrary Git, then no Git process executes.
- Given a permitted profile and exact confirmation, when an agent requests any valid Git argument vector, then HEADBANG runs that vector shell-free and returns the normal redacted operation envelope.
- Given a configured forge profile with `createPr`, when a confirmed change request is created, then HEADBANG pushes the branch and opens the provider pull request.
- Given completed checks and publication credentials, when the release is published, then GitHub contains the merged feature and npm reports the newly published package version.

## Spec Change Log

## Design Notes

The native Git surface is intentionally one argument-vector passthrough. Safety comes from opt-in permission, immutable plan confirmation, shell-free execution, journaling, and existing redaction—not from an incomplete list of Git subcommands that would immediately drift from Git itself.

## Verification

**Commands:**
- `npm run check` — build and all automated tests pass.
- `npm pack --dry-run` — package contains the intended files and succeeds.
- `git diff --check` — no whitespace errors.
- `npm view headbang-mcp version` — registry reports the newly published version after publish.

## Suggested Review Order

1. [application.ts:29](../../src/application.ts#L29) — Core plan/execute boundary, confirmation state, lock, journal, and shell-free Git execution.
2. [cli.ts:17](../../src/cli.ts#L17) — CLI separator preserves every native Git argument without consuming Git flags.
3. [mcp.ts:20](../../src/mcp.ts#L20) — MCP exposes the same exact-plan-confirmed Git argument vector.
4. [collaboration.ts:18](../../src/collaboration.ts#L18) — Pull-request confirmation now binds the exact source commit.
5. [operation.ts:4](../../src/domain/operation.ts#L4) — Redaction removes credentials embedded in remote URLs.
6. [.headbang.json:23](../../.headbang.json#L23) — Self-release opts into native Git and configured pull requests.
7. [v2.test.mjs:40](../../test/v2.test.mjs#L40) — Cherry-pick, failure journaling, state binding, and PR behavior are exercised.
8. [mcp.test.mjs:17](../../test/mcp.test.mjs#L17) — Real MCP discovery and confirmed repository mutation are verified.
9. [functional.test.mjs:322](../../test/functional.test.mjs#L322) — CLI passthrough and visible confirmation digest are verified.
10. [README.md:702](../../README.md#L702) — New Git and pull-request features are documented without release notes.
