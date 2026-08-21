# HEADBANG 🤘

**Policy-driven Git workflows for humans and AI agents.**

HEADBANG sits between your working repository and the places you publish code.
It lets one local repository deliver different, explicitly defined views to
different remotes: a full private mirror to Codeberg, a cleaned public
projection to GitHub, only a backend subtree to GitLab, a frontend-only
snapshot to Bitbucket, or any other combination your workflow needs.

```text
  ██╗  ██╗███████╗ █████╗ ██████╗ ██████╗  █████╗ ███╗   ██╗ ██████╗
  ██║  ██║██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔══██╗████╗  ██║██╔════╝
  ███████║█████╗  ███████║██║  ██║██████╔╝███████║██╔██╗ ██║██║  ███╗
  ██╔══██║██╔══╝  ██╔══██║██║  ██║██╔══██╗██╔══██║██║╚██╗██║██║   ██║
  ██║  ██║███████╗██║  ██║██████╔╝██████╔╝██║  ██║██║ ╚████║╚██████╔╝
  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝

  policy-driven git workflows  ·  review → commit → deliver  🤘
```

HEADBANG is both a normal CLI and an MCP server. You can use it yourself from
a terminal or expose the same guarded workflow to Claude, Codex, OpenCode, an
IDE, or any MCP-capable client.

## Why HEADBANG exists

A `.gitignore` answers **what should not enter this repository**. It does not
answer **what subset of this repository is allowed to leave for a particular
destination**.

HEADBANG introduces **delivery profiles** and **repository projections**. Each
profile can define its own remote, destination branch, visibility,
include/exclude rules, path mapping, quality gates, branch strategy,
permissions, history model, and delivery events.

For example, one project can safely do all of these:

```text
local monorepo
├─ Codeberg private  → full repository, normal history
├─ GitHub public     → source + public assets only, clean snapshot
├─ GitLab client     → backend + shared contracts only
└─ Bitbucket web     → frontend + shared UI only
```

The core delivery path uses ordinary Git, so provider-specific APIs are not
required just to publish. HEADBANG detects GitHub, GitLab, Bitbucket and
Forgejo/Codeberg for capability metadata, while generic SSH/HTTPS Git remotes
remain fully supported.

## Requirements

- Node.js 20 or newer.
- Git available on `PATH`.
- Authentication already configured for the remotes you intend to use.
  HEADBANG deliberately delegates credentials to Git credential helpers, SSH,
  or provider tooling rather than storing tokens in its config.

## Installation

Global CLI and MCP server:

```bash
npm install -g headbang-mcp
```

Or run without a global install:

```bash
npx headbang status
```

For a project dependency:

```bash
npm install -D headbang-mcp
```

## Five-minute setup

Create `.headbang.json` at your repository root:

```json
{
  "version": 1,
  "defaultProfile": "github-public",
  "tasks": {
    "test": { "command": "npm test", "timeoutMs": 120000 },
    "build": { "command": "npm run build", "timeoutMs": 120000 }
  },
  "profiles": {
    "github-public": {
      "remote": "github",
      "provider": "github",
      "targetBranch": "main",
      "visibility": "public",
      "history": "snapshot",
      "permissions": {
        "inspect": true,
        "review": true,
        "push": true,
        "forcePush": true
      },
      "projection": {
        "include": [
          "src/**",
          "public/**",
          "package.json",
          "README.md",
          "LICENSE"
        ],
        "exclude": ["docs/internal/**", "internal/**", ".env*", "**/*.secret.*"]
      },
      "review": { "tasks": ["test", "build"] },
      "preDelivery": ["test", "build"],
      "requireClean": true
    }
  }
}
```

Prefer to start from a template? `headbang init --preset=<preset>` detects the
project and previews (or writes, with `--write`) a ready-made configuration.
Available presets: `git-flow`, `github-flow`, `stable-backup`,
`public-mirror`, `private-full-public-sanitized`, `monorepo-backend`,
`release-only-mirror`.

Then inspect before mutating anything:

```bash
headbang doctor
headbang review github-public
headbang preview github-public
headbang push github-public --dry-run
```

When the preview is correct:

```bash
headbang push github-public
```

## Git remotes are not delivery profiles

HEADBANG intentionally distinguishes a Git remote from a delivery profile. A
remote only answers **where** Git can push. A HEADBANG profile also answers
**what is allowed to leave the repository**, **which branch receives it**,
**whether history is preserved or projected**, and **when delivery is
permitted**.

For example, this repository may have two Git remotes:

```text
github  https://github.com/acme/project.git
origin  https://codeberg.org/acme/project.git
```

That does **not** mean `headbang push --all` may safely send the complete
repository to both. GitHub might be a public filtered projection while
Codeberg might be the complete private mirror. Configure both explicitly:

```json
{
  "version": 1,
  "profiles": {
    "github-public": {
      "remote": "github",
      "targetBranch": "main",
      "visibility": "public",
      "history": "snapshot",
      "permissions": { "inspect": true, "push": true, "forcePush": true },
      "projection": {
        "include": ["src/**", "package.json", "README.md", "LICENSE"],
        "exclude": ["docs/internal/**", "internal/**", ".env*"]
      }
    },
    "codeberg-private": {
      "remote": "origin",
      "targetBranch": "main",
      "visibility": "private",
      "history": "preserve",
      "permissions": { "inspect": true, "push": true }
    }
  }
}
```

Now:

```bash
headbang push --all
```

processes both configured policies. If no profiles exist, HEADBANG stops and
lists the Git remotes it detected instead of returning a fake successful empty
result or pushing private content blindly.

### Human output vs JSON

HEADBANG's normal terminal output is designed for people: concise status
sections, success/failure markers, profile names, destinations and summaries.
JSON is explicitly opt-in for scripts and automation:

```bash
headbang status
headbang push --all

# Machine-readable equivalents
headbang status --json
headbang push --all --json
```

## CLI

### Inspection and setup

| Command | What it does |
|---|---|
| `headbang status` | Repository root, current branch, commit, cleanliness and configured remotes. |
| `headbang doctor` | Validates Git repository, config parsing, Node compatibility and profile discovery. Run this first on a new machine or repository. |
| `headbang profiles` | Lists configured profiles: remote, source/target branch, visibility, history mode, branch strategy and delivery events. |
| `headbang credentials` | Reports which credential sources are reachable in your environment. |
| `headbang plugins` | Discovers and validates configured plugins. |

### `headbang review [profile]`

Builds a deterministic code-review context and runs configured quality gates.
Review checks include current branch policy, working-tree cleanliness when
required, changed files relative to the profile's main branch, unusually large
changed files, and named test/build/lint tasks.

```bash
headbang review github-public
headbang review github-public --json
```

HEADBANG does **not** secretly call a hosted LLM. In MCP mode the structured
review result becomes context the host model can inspect, so your AI review
remains provider-independent. Deterministic checks always happen locally
first.

### `headbang commit "<message>"`

Creates a commit only when the subject follows Conventional Commits.

```bash
git add src/risk.ts test/risk.test.ts
headbang commit "fix(risk): preserve ratchet floor after drawdown"
```

To intentionally stage everything:

```bash
headbang commit "feat(api): add execution endpoint" --all
```

`--all` is explicit because silently turning every working-tree change into a
commit is unsafe for both humans and agents.

Supported types are `feat`, `fix`, `docs`, `style`, `refactor`, `perf`,
`test`, `build`, `ci`, `chore`, and `revert`.

### `headbang push [profile]`

`push` is HEADBANG's primary publishing command. It resolves the selected
profile and applies its review, projection, safety, history and delivery
rules.

```bash
headbang push github-public
headbang push codeberg-private
headbang push github-public --dry-run
headbang push --all
```

`headbang push --all` means **all configured manually eligible HEADBANG
profiles**, not every Git remote. This distinction is intentional and protects
repositories where different remotes have different include/exclude rules.

If a Git remote exists but no matching profile exists, HEADBANG explains the
difference and refuses to bypass policy. Use `git push` directly only when you
deliberately want raw Git behavior outside HEADBANG.

Profiles can be grouped into **delivery sets** and **channels** in config, then
delivered as one governed group with per-destination results:

```bash
headbang deliver-set clients
headbang deliver-channel mirrors --dry-run
```

### `headbang preview [profile]`

Resolves the selected profile and shows source commit, branch, remote URL,
provider, target branch, history mode, projection and review result without
modifying a remote.

```bash
headbang preview gitlab-backend
```

This is the command to use when you are unsure what a profile will publish.

### `headbang deliver [profile]`

Executes policy-driven delivery. Advanced alias of `push`; both accept
`--dry-run` and default to a safe plan-first experience in MCP mode.

```bash
headbang deliver codeberg-private
headbang deliver github-public
```

A profile with `history: "preserve"` and no projection performs a normal Git
push from the exact source commit.

A projected or `snapshot` profile uses an isolated temporary workspace and an
explicit `--force-with-lease=<ref>:<expected-sha>` guard when replacing an
existing remote snapshot. HEADBANG does **not** checkout an orphan branch in
your active working tree and does not need
`stash → checkout → stash pop`. It creates a detached Git worktree at the
selected commit, constructs the requested projection in a temporary directory,
scans it, creates a temporary snapshot repository, pushes it, and cleans
everything up.

### `headbang providers [profile]`

Reports the detected hosting provider and high-level capabilities.

```bash
headbang providers github-public
```

Delivery itself uses generic Git. Provider-specific APIs are only needed for
workflows that interact with hosting features such as pull requests or
releases.

### Governed native Git

Profiles can opt into the complete native Git command surface. HEADBANG passes
the argument vector directly to Git without invoking a shell itself, journals
completion or failure, and requires confirmation of an exact plan containing
the repository, arguments, current commit, branch, and configuration.

```json
{
  "permissions": { "git": true }
}
```

Use `--` to keep Git's own flags separate from HEADBANG options:

```bash
headbang git -- cherry-pick a1b2c3d
headbang git -- rebase --onto main old-base feature/topic
headbang git -- worktree add ../review feature/topic
```

The first call only returns a plan. Execute that unchanged plan with its
digest:

```bash
headbang git --confirm=<digest> -- cherry-pick a1b2c3d
```

This single surface covers commands such as `bisect`, `revert`, `restore`,
`switch`, `tag`, `stash`, `submodule`, and future Git commands without
requiring HEADBANG-specific wrappers.

`permissions.git` is intentionally a repository-control superuser capability:
Git may still invoke configured hooks, aliases, helpers, editors or
transports, and the command can bypass narrower HEADBANG workflow
permissions. Repository-redirection options such as `-C`, `--git-dir`, and
`--work-tree` are blocked so the confirmed repository remains the execution
target. Enable it only for agents that should have full Git authority in that
repository.

### Pull requests and change requests

HEADBANG uses one provider-neutral workflow for GitHub pull requests, GitLab
merge requests, Bitbucket pull requests, and Forgejo/Codeberg pull requests:

```json
{
  "provider": "github",
  "permissions": { "createPr": true, "mergePr": true },
  "changeRequest": {
    "enabled": true,
    "target": "main",
    "mergeStrategy": "squash"
  }
}
```

Plan first, then push the source branch and create exactly that request:

```bash
headbang change plan --title="Add repository control" --body="Summary and checks"
headbang change create --title="Add repository control" --body="Summary and checks" --confirm=<digest>
```

Use `headbang change inspect|checks|reviewers|merge|close <id>` for the rest
of the provider lifecycle, and `headbang change publish-review <id>
--body=<text> --approve` to publish a review comment explicitly marked as
approved. Credentials continue to come from environment variables, Git
credential helpers, or authenticated provider tooling; HEADBANG does not store
them.

### Releases

Inspect the SemVer recommendation derived from Conventional Commits since the
most recent tag:

```bash
headbang release 1.4.2
```

Default mapping:

```text
BREAKING CHANGE / !  → major
feat                  → minor
fix, perf             → patch
other types           → no release
```

Then build a complete, immutable release plan and execute it exactly:

```bash
headbang release plan 1.5.0
headbang release execute 1.5.0 --confirm=<digest>
```

The plan can cover version bumping, tagging, changelog updates and
event-driven deliveries. Execution requires the plan's confirmation digest.

Package publication through a configured package adapter follows the same
plan-and-confirm model:

```bash
headbang package plan
headbang package publish --confirm=<digest>
```

Publishing requires explicit profile permissions and registry idempotency is
checked before any upload.

### Branch strategies

HEADBANG supports Git Flow, GitHub Flow, trunk-based, and custom branch
policies. Git Flow is a **native lifecycle**: no separate `git-flow`
installation is required.

#### Git Flow

```json
{
  "branch": {
    "strategy": "git-flow",
    "main": "main",
    "develop": "develop"
  },
  "permissions": {
    "flow": true
  }
}
```

Initialize a missing develop branch and inspect the lifecycle:

```bash
headbang flow init
headbang flow status
```

Features start from and finish into `develop`:

```bash
headbang feature start order-flow
# work + Conventional Commits
headbang feature finish order-flow
```

Releases start from `develop` and finish by merging to `main`, creating an
annotated tag, and merging back to `develop`:

```bash
headbang release start 1.1.0
headbang release finish 1.1.0
```

Hotfixes start from `main` and finish into both `main` and `develop`:

```bash
headbang hotfix start 1.1.1
headbang hotfix finish 1.1.1
```

Every mutating Git Flow command requires a clean working tree and
`permissions.flow: true`. Finish operations run HEADBANG review/quality gates
before merging. Merge conflicts are surfaced and never auto-resolved. By
default finished branches are deleted; pass `--keep-branch` to retain them.

#### GitHub Flow

```json
{
  "branch": {
    "strategy": "github-flow",
    "main": "main"
  }
}
```

The name describes the branching model, not the provider. You can use GitHub
Flow with GitLab or Codeberg.

```bash
headbang branch start my-topic
```

#### Trunk-based

```json
{
  "branch": {
    "strategy": "trunk",
    "main": "main",
    "allowed": ["feature/**", "fix/**", "chore/**"]
  }
}
```

#### Custom

```json
{
  "branch": {
    "strategy": "custom",
    "main": "production",
    "allowed": ["task/**", "release/**"]
  }
}
```

### Event-driven delivery and stable branches

Profiles can publish from a specific source ref and can be restricted to Git
Flow events. This supports patterns such as a daily development branch plus a
stable/emergency branch in the **same remote repository**:

```json
{
  "profiles": {
    "daily": {
      "remote": "origin",
      "sourceRef": "develop",
      "targetBranch": "daily",
      "history": "preserve",
      "permissions": { "inspect": true, "review": true, "push": true },
      "delivery": {
        "allowOn": ["manual", "feature-finish", "release-finish", "hotfix-finish"],
        "autoOn": ["feature-finish"]
      }
    },
    "stable": {
      "remote": "origin",
      "sourceRef": "main",
      "targetBranch": "stable",
      "history": "preserve",
      "permissions": { "inspect": true, "review": true, "push": true },
      "delivery": {
        "allowOn": ["release-finish", "hotfix-finish"],
        "autoOn": ["release-finish", "hotfix-finish"],
        "requireTag": true
      }
    }
  }
}
```

`headbang push stable` is blocked because direct pushing is a `manual` event. A
successful tagged `release finish` or `hotfix finish` automatically publishes
`main` to `origin/stable`. `daily` can keep receiving development work
independently.

The same model works across GitHub, GitLab, Bitbucket, Codeberg/Forgejo,
generic Git servers, or multiple branches on one remote. Each profile can
still have its own projection, visibility, safety and history rules.

## Profiles: the heart of HEADBANG

A profile describes a destination policy, not just a remote.

```json
{
  "profiles": {
    "private-full": {
      "remote": "origin",
      "visibility": "private",
      "history": "preserve",
      "permissions": { "push": true, "forcePush": false }
    },
    "public-clean": {
      "remote": "github",
      "visibility": "public",
      "history": "snapshot",
      "permissions": { "push": true, "forcePush": true },
      "projection": {
        "exclude": ["docs/internal/**", "internal/**", ".env*"]
      }
    }
  }
}
```

### Include only one part of a repository

Publish only backend code:

```json
{
  "projection": {
    "include": ["backend/**", "packages/shared/**"]
  }
}
```

### Make a subtree become the destination root

If your source is:

```text
backend/
  package.json
  src/
```

and the destination repository should contain:

```text
package.json
src/
```

use:

```json
{
  "projection": {
    "include": ["backend/**"],
    "map": [
      { "from": "backend", "to": "" }
    ]
  }
}
```

### Include then exclude

`exclude` wins after `include`:

```json
{
  "projection": {
    "include": ["src/**", "docs/**"],
    "exclude": ["docs/internal/**"]
  }
}
```

Patterns support `*`, `**`, and `?`. Always use `/` in patterns, even on
Windows.

## GitHub, GitLab, Bitbucket, Codeberg and generic Git

HEADBANG's Git transport is provider-independent. A profile can target any
configured Git remote:

```bash
git remote add github git@github.com:org/project.git
git remote add gitlab git@gitlab.com:org/backend.git
git remote add bitbucket git@bitbucket.org:org/web.git
git remote add origin git@codeberg.org:org/project.git
```

Then each gets a different HEADBANG profile.

Provider names:

- `github`
- `gitlab`
- `bitbucket`
- `forgejo` — use this for Codeberg and compatible Forgejo hosts
- `generic` — any ordinary Git server

If `provider` is omitted, common hosted URLs are detected automatically.
Explicit configuration is better for self-hosted systems.

## Quality gates

Agents must not be allowed to invent arbitrary shell commands. HEADBANG
therefore separates **declared tasks** from **gate references**.

```json
{
  "tasks": {
    "lint": { "command": "npm run lint", "timeoutMs": 60000 },
    "test": { "command": "npm test", "timeoutMs": 120000 },
    "build": { "command": "npm run build", "timeoutMs": 180000 }
  },
  "profiles": {
    "github-public": {
      "remote": "github",
      "review": { "tasks": ["lint", "test"] },
      "preDelivery": ["test", "build"]
    }
  }
}
```

An MCP caller can ask HEADBANG to review or deliver, but it cannot replace
`task:test` with an arbitrary command unless a human changed trusted local
config first.

## Safety model

HEADBANG is designed around least surprise and policy enforcement.

### Plans and confirmation digests

Every mutation returns an exact plan — repository, arguments, current commit,
branch and configuration digest — before anything happens. Executing requires
the plan's confirmation digest, so what was approved is exactly what runs.

Every journaled operation writes an operation record you can inspect and, for
provably safe steps, resume:

```bash
headbang operations            # list operation journals
headbang operations <id>       # inspect one journal
headbang resume <operation-id> --confirm=<digest>
headbang repair                # repair provably stale HEADBANG state
```

Interrupted deliveries and releases never leave silent half-states: locks,
incomplete operations and recovery actions are explicit.

### Credentials

Never put access tokens, passwords or private keys in `.headbang.json`.
HEADBANG uses the same Git authentication you already configured.

### Public-profile scanning

Projected snapshots are scanned before push for common high-risk material
including:

- `.env` files other than `.env.example`;
- private-key blocks;
- likely GitHub tokens;
- likely AWS access keys;
- assignments such as `password=`, `secret=`, `api_key=` and `DATABASE_URL=`;
- account identity fields such as `account_login` and `account_server`.

The built-in scanner is deliberately conservative and lightweight. For
high-assurance repositories, run Gitleaks, TruffleHog or your organization's
scanner as a named pre-delivery task as well.

### Permissions

A profile may deny capabilities even when your credentials would technically
allow them:

```json
{
  "permissions": {
    "inspect": true,
    "review": true,
    "commit": true,
    "push": true,
    "forcePush": false,
    "createPr": false,
    "mergePr": false,
    "release": false,
    "flow": false,
    "git": false
  }
}
```

HEADBANG treats local policy as a second boundary on top of provider
permissions.

### Snapshot history replacement

A projected snapshot normally needs to replace the destination branch because
the remote represents a generated view rather than the source repository's
real history. Therefore snapshot profiles require
`permissions.forcePush: true`.

Do not enable snapshot delivery on a branch where unrelated contributors
maintain meaningful history. Use a dedicated publication repository or branch.

## Plugins

HEADBANG can load configured plugins and report their manifests and adapted
slots:

```bash
headbang plugins
```

Plugins are validated before use, and their presence is visible to MCP clients
through read-only resources.

## MCP server

Start it directly:

```bash
headbang-mcp
```

Or through npx without a global install:

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

Every mutation tool defaults to returning a state-bound plan. Invoke it again
with `dryRun=false` and that plan's confirmation digest to execute.

### Tools

**Inspection (read-only):**

- `headbang_status` — repository status and remotes.
- `headbang_review` — deterministic review and configured quality gates.
- `headbang_preview` — read-only manual delivery plan.
- `headbang_flow_status` — inspect native Git Flow readiness.
- `headbang_release_inspect` — Conventional Commit SemVer recommendation.
- `headbang_release_plan` — immutable complete release plan.
- `headbang_package_plan` — npm/package publication plan with registry idempotency check.
- `headbang_provider_capabilities` — capabilities used by planning.
- `headbang_plugins` — discover and validate configured plugins.
- `headbang_change_plan` — plan a provider-neutral change request.
- `headbang_recovery_status` — inspect locks and incomplete operations.
- `headbang_operation_history` — list operation journals.
- `headbang_config_validate` — validate versioned repository config.

**Mutations (plan → confirm):**

- `headbang_push` — single-profile or all-profile delivery; primary push tool.
- `headbang_deliver` — advanced compatible alias of push.
- `headbang_delivery_group` — deliver a configured set or channel with per-destination results.
- `headbang_commit` — governed Conventional Commit creation.
- `headbang_git` — any native Git argument vector without a shell; requires `permissions.git`.
- `headbang_flow_init` — initialize a missing configured develop branch from main.
- `headbang_flow_start` / `headbang_flow_finish` — native Git Flow lifecycle with review and event-driven deliveries.
- `headbang_github_flow_start` — start a configured GitHub Flow branch.
- `headbang_release_execute` — execute an exact release plan.
- `headbang_package_publish` — publish through the configured package adapter.
- `headbang_change_create` — push a branch and create the exact planned change request.
- `headbang_change_action` — inspect checks/reviewers, merge, or close.
- `headbang_review_publish` — publish an explicitly approved review comment.
- `headbang_init` — detect a project and preview or write a preset.
- `headbang_config_migrate` — migrate v1 config to v2 with backup.
- `headbang_resume` — resume only provably safe incomplete remote/package release steps.
- `headbang_repair` — repair only provably stale HEADBANG state.

`headbang_flow_start` and `headbang_flow_finish` require the selected profile
to use `branch.strategy: "git-flow"`, `permissions.flow: true`, and a clean
working tree. The finish tool always runs deterministic review/quality gates
before integration; merge conflicts are surfaced, never auto-resolved.

### Event-aware remote delivery

MCP callers cannot spoof a release event through `headbang_deliver` or
`headbang_push`. Direct delivery is always treated as `manual`, so a profile
restricted to `release-finish` refuses direct delivery but publishes
automatically after a tagged `headbang_flow_finish` release/hotfix. The model
cannot bypass a stable-release policy merely by claiming a release happened.

### Resources and prompts

Read-only MCP resources expose redacted effective configuration, profiles and
channels, workflow status, the latest review snapshot, operation history, the
latest release plan, provider capabilities and plugin manifests. A built-in
`headbang-code-review` prompt routes the host model through deterministic
HEADBANG gates before LLM analysis.

The MCP transport uses stdio. Protocol messages are written to stdout and
HEADBANG diagnostics go to stderr so the protocol stream is never polluted by
the CLI wordmark or debug logs.

## Recommended AI-agent workflow

For an AI coding agent, a safe default sequence is:

```text
1. headbang_status
2. headbang_review
3. human/agent fixes findings
4. headbang_review again
5. headbang_commit
6. headbang_preview
7. headbang_push with dryRun=true
8. explicit user approval via the confirmation digest
9. headbang_push with dryRun=false
```

The point is not to make dangerous Git operations invisible. HEADBANG makes
them reproducible and inspectable.

## Configuration locations

Reusable defaults can live at:

```text
~/.config/headbang/config.json
```

Repository-specific config lives at:

```text
<repo>/.headbang.json
```

HEADBANG loads global config first and then overlays the repository config.
Keep destination-specific profiles with the repository when they are part of
that project's intended publication model. Keep machine-local reusable
task/profile defaults globally.

Validate config at any time:

```bash
headbang config validate
```

## Development

```bash
git clone <your-fork>
cd headbang
npm install
npm run build
npm test
node dist/cli.js help
```

## License

HEADBANG is open source under the **Apache License 2.0**. You may use, modify
and distribute it, including commercially, subject to the license terms. See
[`LICENSE`](LICENSE) and [`NOTICE`](NOTICE).

## Contributing

Issues and pull requests are welcome. Keep contributions focused, include
tests for behavior changes, use Conventional Commits, and avoid introducing
runtime dependencies when the Node.js standard library can solve the problem
cleanly.
