# HEADBANG 🤘

**Policy-driven Git workflows for humans and AI agents.**

HEADBANG sits between your working repository and the places you publish code. It lets one local repository deliver different, explicitly defined views to different remotes: a full private mirror to Codeberg, a cleaned public projection to GitHub, only a backend subtree to GitLab, a frontend-only snapshot to Bitbucket, or any other combination your workflow needs.

```text
  ██╗  ██╗███████╗ █████╗ ██████╗ ██████╗  █████╗ ███╗   ██╗ ██████╗
  ██║  ██║██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔══██╗████╗  ██║██╔════╝
  ███████║█████╗  ███████║██║  ██║██████╔╝███████║██╔██╗ ██║██║  ███╗
  ██╔══██║██╔══╝  ██╔══██║██║  ██║██╔══██╗██╔══██║██║╚██╗██║██║   ██║
  ██║  ██║███████╗██║  ██║██████╔╝██████╔╝██║  ██║██║ ╚████║╚██████╔╝
  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝

  policy-driven git workflows  ·  review → commit → deliver  🤘
```

HEADBANG is both a normal CLI and an MCP server. You can use it yourself from a terminal or expose the same guarded workflow to Claude, Codex, OpenCode, an IDE, or any MCP-capable client.

## Why HEADBANG exists

A `.gitignore` answers **what should not enter this repository**. It does not answer **what subset of this repository is allowed to leave for a particular destination**.

HEADBANG introduces **delivery profiles** and **repository projections**. Each profile can define its own remote, destination branch, visibility, include/exclude rules, path mapping, quality gates, branch strategy, permissions and history model.

For example, one project can safely do all of these:

```text
local monorepo
├─ Codeberg private  → full repository, normal history
├─ GitHub public     → source + public assets only, clean snapshot
├─ GitLab client     → backend + shared contracts only
└─ Bitbucket web     → frontend + shared UI only
```

The core delivery path uses ordinary Git, so provider-specific APIs are not required just to publish. HEADBANG detects GitHub, GitLab, Bitbucket and Forgejo/Codeberg for capability metadata, while generic SSH/HTTPS Git remotes remain fully supported.

## Requirements

- Node.js 20 or newer.
- Git available on `PATH`.
- Authentication already configured for the remotes you intend to use. HEADBANG deliberately delegates credentials to Git credential helpers, SSH, or provider tooling rather than storing tokens in its config.

## Installation

Global CLI and MCP server:

```bash
npm install -g headbang-mcp
```

Or run without a global install:

```bash
npx --package=headbang-mcp headbang status
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
        "exclude": [
          "docs/internal/**",
          ".agents/**",
          "_bmad/**",
          "**/*.secret.*"
        ]
      },
      "review": { "tasks": ["test", "build"] },
      "preDelivery": ["test", "build"],
      "requireClean": true
    }
  }
}
```

Then inspect before mutating anything:

```bash
headbang doctor
headbang review github-public
headbang preview github-public
headbang deliver github-public --dry-run
```

When the preview is correct:

```bash
headbang deliver github-public
```

## CLI

### `headbang status`

Shows repository root, current branch, commit, cleanliness and configured remotes.

```bash
headbang status
headbang status --json
```

### `headbang doctor`

Checks that the current directory is a Git repository, config parses correctly, Node is compatible, and profiles are discoverable.

```bash
headbang doctor
```

Run this first when setting up a new machine or repository.

### `headbang profiles`

Lists configured profiles and their major behavior: remote, branch, visibility and history mode.

```bash
headbang profiles
```

### `headbang review [profile]`

Builds a deterministic code-review context and runs configured quality gates. Review checks include current branch policy, working-tree cleanliness when required, changed files relative to the profile's main branch, unusually large changed files, and named test/build/lint tasks.

```bash
headbang review github-public
headbang review github-public --json
```

HEADBANG does **not** secretly call a hosted LLM. In MCP mode the structured review result becomes context the host model can inspect, so your AI review remains provider-independent. Deterministic checks always happen locally first.

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

`--all` is explicit because silently turning every working-tree change into a commit is unsafe for both humans and agents.

Supported types are `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, and `revert`.

### `headbang preview [profile]`

Resolves the selected profile and shows source commit, branch, remote URL, provider, target branch, history mode, projection and review result without modifying a remote.

```bash
headbang preview gitlab-backend
```

This is the command to use when you are unsure what a profile will publish.

### `headbang deliver [profile]`

Executes policy-driven delivery.

```bash
headbang deliver codeberg-private
headbang deliver github-public
headbang deliver gitlab-backend
```

A profile with `history: "preserve"` and no projection performs a normal Git push from the exact source commit.

A projected or `snapshot` profile uses an isolated temporary workspace and an explicit `--force-with-lease=<ref>:<expected-sha>` guard when replacing an existing remote snapshot. HEADBANG does **not** checkout an orphan branch in your active working tree and does not need `stash → checkout → stash pop`. It creates a detached Git worktree at the selected commit, constructs the requested projection in a temporary directory, scans it, creates a temporary snapshot repository, pushes it, and cleans everything up.

### `headbang providers [profile]`

Reports the detected hosting provider and high-level capabilities.

```bash
headbang providers github-public
```

Delivery itself remains generic Git. Provider-specific pull-request/release API mutations are intentionally not required for v1's core workflow.

### `headbang release <current-version>`

Runs the built-in SemVer-lite analyzer against Conventional Commits since the most recent tag.

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

This command recommends a version. v1 intentionally does not auto-publish npm packages, auto-tag, or auto-create releases. That keeps release reasoning transparent and lets projects integrate a heavier release system later if they need one.

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
        "exclude": ["docs/internal/**", ".agents/**", ".env*"]
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

Patterns support `*`, `**`, and `?`. Always use `/` in patterns, even on Windows.

## GitHub, GitLab, Bitbucket, Codeberg and generic Git

HEADBANG's Git transport is provider-independent. A profile can target any configured Git remote:

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

If `provider` is omitted, common hosted URLs are detected automatically. Explicit configuration is better for self-hosted systems.

## Branch strategies

HEADBANG validates branch strategy during review instead of forcing every repository into one branching religion.

### Git Flow

```json
{
  "branch": {
    "strategy": "git-flow",
    "main": "main",
    "develop": "develop"
  }
}
```

Recognized working branches include `feature/*`, `release/*`, and `hotfix/*` in addition to main/develop.

### GitHub Flow

```json
{
  "branch": {
    "strategy": "github-flow",
    "main": "main"
  }
}
```

The name describes the branching model, not the provider. You can use GitHub Flow with GitLab or Codeberg.

### Trunk-based

```json
{
  "branch": {
    "strategy": "trunk",
    "main": "main",
    "allowed": ["feature/**", "fix/**", "chore/**"]
  }
}
```

### Custom

```json
{
  "branch": {
    "strategy": "custom",
    "main": "production",
    "allowed": ["task/**", "release/**"]
  }
}
```

## Quality gates

Agents must not be allowed to invent arbitrary shell commands. HEADBANG therefore separates **declared tasks** from **gate references**.

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

An MCP caller can ask HEADBANG to review or deliver, but it cannot replace `task:test` with an arbitrary command unless a human changed trusted local config first.

## Safety model

HEADBANG is designed around least surprise and policy enforcement.

### Credentials

Never put access tokens, passwords or private keys in `.headbang.json`. HEADBANG uses the same Git authentication you already configured.

### Public-profile scanning

Projected snapshots are scanned before push for common high-risk material including:

- `.env` files other than `.env.example`;
- private-key blocks;
- likely GitHub tokens;
- likely AWS access keys;
- assignments such as `password=`, `secret=`, `api_key=` and `DATABASE_URL=`;
- account identity fields such as `account_login` and `account_server`.

The built-in scanner is deliberately conservative and lightweight. For high-assurance repositories, run Gitleaks, TruffleHog or your organization's scanner as a named pre-delivery task as well.

### Permissions

A profile may deny capabilities even when your credentials would technically allow them:

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
    "release": false
  }
}
```

HEADBANG treats local policy as a second boundary on top of provider permissions.

### Snapshot history replacement

A projected snapshot normally needs to replace the destination branch because the remote represents a generated view rather than the source repository's real history. Therefore snapshot profiles require `permissions.forcePush: true`.

Do not enable snapshot delivery on a branch where unrelated contributors maintain meaningful history. Use a dedicated publication repository or branch.

## MCP server

Start it directly:

```bash
headbang-mcp
```

Example client configuration:

```json
{
  "mcpServers": {
    "headbang": {
      "command": "headbang-mcp"
    }
  }
}
```

Tools:

- `headbang_status` — read-only repository status.
- `headbang_review` — deterministic review and configured quality gates.
- `headbang_preview` — read-only delivery plan.
- `headbang_deliver` — policy-driven delivery; defaults to `dryRun: true`.
- `headbang_commit` — Conventional Commit creation.
- `headbang_release_inspect` — read-only SemVer recommendation.

The MCP transport uses stdio. Protocol messages are written to stdout and HEADBANG diagnostics go to stderr so the protocol stream is never polluted by the CLI wordmark or debug logs.

## Recommended AI-agent workflow

For an AI coding agent, a safe default sequence is:

```text
1. headbang_status
2. headbang_review
3. human/agent fixes findings
4. headbang_review again
5. headbang_commit
6. headbang_preview
7. headbang_deliver with dryRun=true
8. explicit user approval where the host supports confirmation
9. headbang_deliver with dryRun=false
```

The point is not to make dangerous Git operations invisible. HEADBANG makes them reproducible and inspectable.

## Global configuration

Reusable defaults can live at:

```text
~/.config/headbang/config.json
```

Repository-specific config lives at:

```text
<repo>/.headbang.json
```

HEADBANG loads global config first and then overlays the repository config. Keep destination-specific profiles with the repository when they are part of that project's intended publication model. Keep machine-local reusable task/profile defaults globally.

See [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md) for the field reference and [`examples/basic.headbang.json`](examples/basic.headbang.json) for a multi-remote example.

## Publishing HEADBANG itself to npm

Maintainers should validate before publishing:

```bash
npm install
npm run check
npm pack --dry-run
```

Inspect the dry-run file list. Then publish:

```bash
npm publish
```

The `files` allow-list in `package.json` keeps source tests and local config out of the package while including the compiled CLI/MCP entry points, documentation, README and Apache-2.0 license.

## Development

```bash
git clone <your-fork>
cd headbang
npm install
npm run build
npm test
node dist/cli.js help
```

To inspect MCP behavior with the official MCP Inspector after building:

```bash
npx @modelcontextprotocol/inspector node dist/mcp.js
```

## Scope of v1

HEADBANG v1 focuses on the hard core: profile-driven multi-remote delivery, repository projections, safe snapshot publication, deterministic review gates, Conventional Commits, branch-policy validation, SemVer recommendation, CLI and MCP.

Provider-native PR/MR creation, merge automation, automatic npm publishing, complex independent monorepo releases and hosted policy administration are intentionally left for later versions rather than making the first release fragile or opaque.

## License

HEADBANG is open source under the **Apache License 2.0**. You may use, modify and distribute it, including commercially, subject to the license terms. See [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE).

## Contributing

Issues and pull requests are welcome. Keep contributions focused, include tests for behavior changes, use Conventional Commits, and avoid introducing runtime dependencies when the Node.js standard library can solve the problem cleanly.
