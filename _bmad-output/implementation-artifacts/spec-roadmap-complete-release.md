---
title: 'Ship the complete HEADBANG roadmap as a self-hosted 2.0.0 release'
type: 'feature'
created: '2026-08-19'
status: 'in-review'
review_loop_iteration: 0
baseline_commit: '1542863f0fef028134c3d832baeb510ac35e3d8e'
context:
  - '{project-root}/_bmad-output/specs/spec-roadmap-complete-release/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-roadmap-complete-release/tasks.md'
  - '{project-root}/_bmad-output/specs/spec-native-git-flow-bootstrap/SPEC.md'
  - '{project-root}/HEADBANG_ROADMAP_CODEX.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** HEADBANG 1.1.3 implements delivery and part of native Git Flow, while its roadmap describes substantial missing lifecycle behavior. The user requires every roadmap item in one release, including safe npm publication, and wants the project to prove the feature by releasing itself with HEADBANG.

**Approach:** Build a shared, provider-neutral application layer in dependency order: stable operation contracts; plans/permissions/journals; release and flow; collaboration and review; onboarding/recovery; plugins/monorepos/package publication; MCP resources; then documentation and self-hosted release. Ship all of it as 2.0.0 because the public plugin contract creates an appropriate major-version boundary.

## Boundaries & Constraints

**Always:** Keep CLI and MCP thin; require explicit permissions; plan before sensitive mutation; redact credentials; journal partial state; make retries idempotent; keep managed-project tasks stack-agnostic; test full advertised lifecycles; preserve current behavior through migration paths; run the relevant tests before creating any implementation commit.

**Ask First:** Any operation needing a credential not already available, publication under a different npm identity/package, destructive repair not provably owned by HEADBANG, or remote mutation outside `origin` and configured test fixtures.

**Never:** Install external `git-flow`; create `develop` in this HEADBANG repository; infer deleted branch history; silently force/reset/delete/overwrite/publish; auto-post LLM findings; store tokens; claim unsupported provider/supply-chain capabilities.

## Workstream split

1. **Build HEADBANG:** implement all Epics A–N from the canonical task ledger as reusable product behavior with shared core services and adapters.
2. **Use HEADBANG here:** configure this repository on `main`, execute HEADBANG's own plan/review/push/tag/npm-publish path, and retain its journal as release evidence (Epic O).

</frozen-after-approval>

## Architecture spine

- `src/domain/` — stable plans, result envelopes, permissions, confirmation digests, redaction, capability and plugin contracts.
- `src/operations/` — journaled/locked orchestration and resume; no UI or provider-specific language.
- `src/release/` — planning, version sources, notes, prereleases, monorepos, artifacts, and release transaction steps.
- `src/providers/` — capability-aware adapters for change requests, protections, releases, and review comments.
- `src/packages/` — provider-neutral package publishing plus npm adapter.
- `src/plugins/` — manifest discovery, compatibility validation, and adapter registration.
- `src/onboarding/` — detection, presets, config validation/migration, credential diagnostics.
- Existing delivery/review/workflow modules migrate behind these contracts without duplicating CLI/MCP logic.

## Execution order

1. Stabilize contracts and characterize 1.1.3 with regression tests.
2. Add locks, journals, plans, confirmation, redaction, and error envelopes.
3. Complete native flow and the full release transaction.
4. Add provider collaboration, reviews, delivery sets/channels, and capability discovery.
5. Add init/config/credentials/scanners/recovery/platform fidelity.
6. Add plugins, monorepos, package publishing, artifacts, and MCP resources.
7. Run adversarial/edge-case review, all tests, docs closure, package inspection, and self-hosted release.

## Acceptance

- Every checklist item in the canonical task ledger has implementation and automated evidence, or a provider capability test proving an explicit safe refusal.
- No new implementation commit exists without prior passing test evidence, and the final commit/push is gated on the complete green suite.
- Real stdio MCP tests cover discovery/resources/planning/authorization/mutation; CLI JSON and MCP share the same result envelope.
- Windows baseline regression is fixed, cross-platform CI definitions exist, and projections never silently omit special Git objects.
- This repo has no `develop`, all validation is green, HEADBANG pushes its own `main`/tag, and its npm adapter publishes/verifies `headbang-mcp@2.0.0`.

## Spec Change Log

- 2026-08-19: Replaced the narrow bootstrap-only draft after the user required the entire roadmap in one release and npm self-publication.

## Verification

- `npm run check`
- full stdio MCP integration suite
- provider and package adapter contract suites
- platform/projection fixtures
- `npm pack --dry-run`
- `headbang release plan 2.0.0 --json`
- `headbang release execute 2.0.0 --confirm=<plan-digest> --json`
- registry verification for `headbang-mcp@2.0.0`
