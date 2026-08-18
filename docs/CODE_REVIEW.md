# Code review in HEADBANG

HEADBANG deliberately separates **deterministic review** from **AI review**.

## Layer 1: deterministic evidence

`headbang review <profile>` establishes facts before a model comments on code. It checks branch policy, cleanliness when required, changed files relative to the configured main branch, Conventional Commit policy when enabled, large changed files, and configured quality gates such as lint/test/build.

A failed compiler or test is a fact. It should not be softened into an AI opinion.

## Layer 2: MCP-assisted review

The MCP server exposes `headbang_review` and the `headbang-code-review` prompt. A compatible client can first retrieve deterministic results and then inspect the diff for higher-level problems such as:

- behavioral correctness and regressions;
- unsafe error handling;
- race conditions and stale-state bugs;
- authorization/security mistakes;
- API or schema compatibility;
- missing tests for changed behavior;
- performance traps in hot paths;
- maintainability problems that are concrete enough to act on.

The prompt explicitly asks the model not to invent findings. Review should prioritize actionable issues with severity, file and rationale rather than generate a generic style essay.

## Recommended severity interpretation

- **critical**: credible credential exposure, destructive behavior, or vulnerability that should stop delivery immediately.
- **high**: correctness/security/branch/quality-gate failure that should block delivery.
- **medium**: meaningful risk that normally deserves correction but may be accepted consciously.
- **low**: minor maintainability concern.
- **info**: context rather than a defect.

## Repository-specific review

Put project checks into named tasks:

```json
{
  "tasks": {
    "lint": { "command": "npm run lint" },
    "typecheck": { "command": "npm run typecheck" },
    "unit": { "command": "npm test" }
  },
  "profiles": {
    "public": {
      "remote": "github",
      "review": { "tasks": ["lint", "typecheck", "unit"] }
    }
  }
}
```

This keeps the MCP agent inside an allow-listed execution surface.
