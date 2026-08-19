# MCP setup

Install HEADBANG globally or execute it through npm. The MCP server uses stdio; stdout is reserved for MCP protocol messages and diagnostics are written to stderr.

## Generic client configuration

```json
{
  "mcpServers": {
    "headbang": {
      "command": "headbang-mcp"
    }
  }
}
```

If you prefer not to install globally:

```json
{
  "mcpServers": {
    "headbang": {
      "command": "npx",
      "args": ["-y", "headbang-mcp", "mcp"]
    }
  }
}
```

## Tools

All 2.0 responses use the stable operation envelope. Every mutation tool defaults to returning a state-bound plan. Invoke it again with `dryRun=false` and that plan's `confirmation` digest; publishing, merging, and releases keep their richer domain-specific plans as well.

HEADBANG exposes:

- `headbang_status` — repository status and remotes.
- `headbang_review` — deterministic review and configured quality gates.
- `headbang_preview` — read-only manual delivery plan.
- `headbang_deliver` — manual policy-driven delivery; defaults to `dryRun=true`.
- `headbang_commit` — Conventional Commit creation.
- `headbang_release_inspect` — read-only SemVer recommendation.
- `headbang_flow_status` — inspect native Git Flow state.
- `headbang_flow_start` — start `feature`, `release`, or `hotfix` lifecycle branches.
- `headbang_flow_finish` — review and finish Git Flow, then run any configured event-driven deliveries.

`headbang_flow_start` and `headbang_flow_finish` are mutating tools. The selected profile must use `branch.strategy: "git-flow"`, must set `permissions.flow: true`, and the working tree must be clean.

2.0 additionally exposes `headbang_flow_init`, release plan/execute, package plan/publish, provider-neutral change requests, init/config/recovery/resume, operation history, and review publication. Resources expose redacted config, profiles/channels, workflow status, provider capabilities, and journals. See [the 2.0 workflow guide](V2.md).

The finish tool always runs deterministic review/quality gates before integration. Branch cleanup can be disabled with `deleteBranch=false`.

## Event-aware remote delivery

MCP callers cannot spoof a release event through `headbang_deliver`. Direct delivery is always treated as `manual`. A profile configured like this:

```json
{
  "delivery": {
    "allowOn": ["release-finish", "hotfix-finish"],
    "autoOn": ["release-finish", "hotfix-finish"],
    "requireTag": true
  }
}
```

will refuse `headbang_deliver` but will publish automatically after a tagged `headbang_flow_finish` release/hotfix.

That matters for AI agents: the model cannot bypass a stable-release policy merely by claiming a release happened.

## Example agent requests

```text
Start a HEADBANG feature called order-flow.
```

The model first calls `headbang_flow_start` with `kind=feature`, `name=order-flow`, then repeats it with `dryRun=false` and the returned digest.

Later:

```text
Review this feature and finish it with Git Flow.
```

The model plans and confirms `headbang_flow_finish`. HEADBANG executes deterministic gates before merging into `develop`, then runs profiles configured for `feature-finish`.

For a release:

```text
Start release 1.1.0 with HEADBANG.
Finish release 1.1.0 with HEADBANG.
```

The finish operation merges to `main`, creates the configured tag, merges back to `develop`, removes the release branch, and can automatically deliver stable/release-only profiles using `main` as their source.


## `headbang_push`

Primary MCP push tool. Pushes a single configured profile or, with `all=true`, every manually eligible profile. It defaults to `dryRun=true`. Stable/release-only profiles remain protected by delivery event policy. `headbang_deliver` remains available as an advanced compatible alias.
