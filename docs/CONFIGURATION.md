# Configuration reference

HEADBANG merges two JSON files: `~/.config/headbang/config.json` first, then `<repo>/.headbang.json`. Repository profiles with the same name override global profiles. Secrets do not belong in either file.

## Top-level fields

`version` must be `1`. `defaultProfile` is optional. `profiles` contains named delivery policies. `tasks` contains explicitly authorized commands that review/delivery gates may invoke.

## Profile

- `remote`: required Git remote name.
- `provider`: `github`, `gitlab`, `bitbucket`, `forgejo`, or `generic`. If omitted HEADBANG detects common hosted providers from the remote URL.
- `targetBranch`: destination branch; otherwise the current branch.
- `visibility`: `public`, `private`, or `internal`; public profiles apply stricter safety severity.
- `history`: `preserve` performs a normal Git push when no projection is needed. `snapshot` creates an isolated projected repository and replaces the destination branch.
- `permissions`: local policy guard. Set dangerous capabilities to `false` even if your Git credentials can do more.
- `projection`: include/exclude/map rules.
- `review.tasks`: named quality gates.
- `branch.strategy`: `git-flow`, `github-flow`, `trunk`, or `custom`.
- `preDelivery` / `postDelivery`: named tasks only. Arbitrary tool-supplied shell commands are intentionally unsupported.
- `requireClean`: refuse delivery from a dirty working tree.
- `release.rules`: override Conventional Commit type → SemVer bump mapping.

## Projection semantics

`include` is an allow-list. If omitted or empty, everything is initially eligible. `exclude` is evaluated after inclusion and always wins. `map` can move an included subtree to another destination root. For example `{ "from": "backend", "to": "" }` publishes the contents of `backend/` at the remote repository root.

Patterns support `*`, `**`, and `?`. Use forward slashes in config on every OS.

## Snapshot delivery

Snapshot mode never checks out an orphan branch in your active workspace. HEADBANG creates an isolated detached Git worktree at the selected source commit, builds the projection into a temporary directory, scans it, initializes a temporary Git repository, creates one delivery commit, pushes it, then removes the temporary data. Your current branch and unstaged changes are not switched or stashed.
