---
title: 'Prevent parser literals from blocking public delivery'
type: 'bugfix'
created: '2026-08-22'
status: 'done'
baseline_commit: 'f95404708df1df06e1759d9aa5e4eef8335aadac'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The public-profile safety scan blocks the repository because it mistakes the parser literal `line.startsWith('password=')` for a hard-coded password. This prevents a sanitized public snapshot even though no secret is present.

**Approach:** Narrow only the sensitive-assignment pattern so a parser/string-literal closing delimiter cannot be treated as the assigned value. Retain detection of real literal credentials and existing key/token patterns.

## Boundaries & Constraints

**Always:** Preserve `.env`, private-key, GitHub-token, AWS-key, account-data, and literal sensitive-assignment detection; add a direct regression test; retain the current README wording unless it needs a behavior-facing correction; include the approved existing `AGENTS.md` and public-README spec changes in the same local commit; publish the resulting patch to npm interactively before pushing GitHub.

**Ask First:** Stop if publication needs a new authority beyond interactive web login, the registry version cannot be determined, or the planned npm release would overwrite an existing version.

**Never:** Disable the scanner, remove authentication support, add dependencies, put credentials in config or source, use HEADBANG's package publisher, or rewrite unrelated README content.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Parser literal | `line.startsWith('password=')` in a projected source file | No secret finding | Public delivery can continue to later safety checks |
| Literal credential | `password=supersecret` in a projected source file | High `Sensitive assignment` finding | Delivery remains blocked |
| Known token | GitHub-token-shaped source value | Critical secret finding | Delivery remains blocked |

</frozen-after-approval>

## Code Map

- `src/safety/scanner.ts:3-9` — built-in rules and `scanFiles`; sensitive-assignment regex causes the false positive.
- `src/providers.ts:14` — credential parser contains `line.startsWith('password=')`, the confirmed harmless input.
- `src/delivery.ts:143-150` — projected snapshot scans and blocks only high/critical findings.
- `test/v2.test.mjs` — existing Node test suite; no direct `scanFiles` coverage today.
- `README.md:755-769` — current public-scanning contract remains accurate; do not change unless implementation makes a public behavior change.
- `AGENTS.md:20-24` — npm path: interactive `npm.cmd publish --access public`, then registry verification; do not use HEADBANG package publish.

## Tasks & Acceptance

**Execution:**
- [x] `src/safety/scanner.ts` — exclude parser/string-literal closing delimiters from the sensitive-assignment value match while leaving the other scanner rules unchanged.
- [x] `test/v2.test.mjs` — add a focused `scanFiles` fixture proving the parser literal passes and a literal password still blocks.
- [x] `package.json` and `package-lock.json` — prepare the next patch version for npm after verification succeeds.
- [ ] npm registry and GitHub — run the documented interactive npm publication and registry check, then push the single commit to the configured GitHub remote.

**Acceptance Criteria:**
- Given a public snapshot includes `line.startsWith('password=')`, when HEADBANG scans it, then no false secret finding is produced.
- Given a public snapshot includes a real `password=supersecret` assignment, when HEADBANG scans it, then delivery is blocked as high severity.
- Given the release is ready, when published, then npm verifies the new package version before the same commit is pushed to GitHub.

## Spec Change Log

## Design Notes

The smallest safe boundary is a regex guard immediately before the captured value. A value beginning with `)`, `]`, or `}` after an optional quote is parser syntax, not a plausible credential, while regular literal values still match.

## Verification

**Commands:**
- `npm.cmd run check` — expected: build and all tests pass.
- `npm.cmd view headbang-mcp version` — expected: the published patch version after publication.

## Suggested Review Order

**Safety rule**

- Narrowly recognizes parser-literal syntax without excluding ordinary credentials.
  [`scanner.ts:6`](../../src/safety/scanner.ts#L6)

**Regression proof**

- Exercises the parser literal, ordinary passwords, delimiter-prefixed passwords, and known tokens.
  [`v2.test.mjs:33`](../../test/v2.test.mjs#L33)

**Release metadata**

- Advances the package to the publishable patch version.
  [`package.json:3`](../../package.json#L3)

- Records the documented interactive npm publication path.
  [`AGENTS.md:20`](../../AGENTS.md#L20)
