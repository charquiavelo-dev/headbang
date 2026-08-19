# Configuration reference

HEADBANG merges two JSON files: `~/.config/headbang/config.json` first, then `<repo>/.headbang.json`. Repository profiles with the same name override global profiles. Secrets do not belong in either file.

## Top-level fields

`version` may be `1` for backward compatibility or `2` for the complete feature set. `defaultProfile` is optional. `profiles` contains named delivery policies. `tasks` contains explicitly authorized commands that review/delivery gates may invoke. Version 2 also supports `deliverySets`, `channels`, and `plugins`.

Version 2 profile fields include `changeRequest`, `packagePublish`, `scanners`, expanded release planning/publishing/artifact settings, and permissions `publishPackage`, `publishReview`, and `repair`. See `docs/V2.md` and this repository's `.headbang.json` for a complete self-release example.

`packagePublish` is opt-in. Its npm adapter accepts repository-relative `path`, `registry`, `access`, `tag`, `provenance`, and named `prePublish` tasks. In a workspace repository, `workspaces: true` plans and publishes each impacted non-private package in dependency order; independent mode reads explicit versions from root `package.json` under `headbang.releaseVersions`.

## Profile

- `remote`: required Git remote name.
- `provider`: `github`, `gitlab`, `bitbucket`, `forgejo`, or `generic`. If omitted HEADBANG detects common hosted providers from the remote URL.
- `sourceRef`: source Git ref to publish. Defaults to `HEAD`. Set this when one remote or repository should receive a specific branch such as `develop` or `main`.
- `targetBranch`: destination branch; otherwise the current branch.
- `visibility`: `public`, `private`, or `internal`; public profiles apply stricter safety severity.
- `history`: `preserve` performs a normal Git push when no projection is needed. `snapshot` creates an isolated projected repository and replaces the destination branch.
- `permissions`: local policy guard. Set dangerous capabilities to `false` even if your Git credentials can do more.
- `projection`: include/exclude/map rules.
- `review.tasks`: named quality gates.
- `branch.strategy`: `git-flow`, `github-flow`, `trunk`, or `custom`.
- `delivery`: controls which lifecycle events may publish this profile and which events publish automatically.
- `preDelivery` / `postDelivery`: named tasks only. Arbitrary tool-supplied shell commands are intentionally unsupported.
- `requireClean`: refuse delivery from a dirty working tree.
- `release.rules`: override Conventional Commit type → SemVer bump mapping.

## Source ref vs destination branch

`sourceRef` and `targetBranch` are deliberately independent.

```json
{
  "remote": "origin",
  "sourceRef": "develop",
  "targetBranch": "daily"
}
```

publishes the local `develop` commit to `origin/daily`.

A second profile can target the same remote but publish a different ref:

```json
{
  "remote": "origin",
  "sourceRef": "main",
  "targetBranch": "stable"
}
```

This lets one remote repository contain branches with different purposes and content policies.

## Event-aware delivery policy

Supported events are:

- `manual`
- `feature-start`
- `feature-finish`
- `release-start`
- `release-finish`
- `hotfix-start`
- `hotfix-finish`
- `tag`

`delivery.allowOn` is an allow-list. If it is omitted, HEADBANG preserves the v1 behavior and manual delivery remains available. `delivery.autoOn` identifies Git Flow events that automatically run the profile after the local lifecycle operation succeeds. Every `autoOn` event is implicitly allowed.

`delivery.requireTag` blocks delivery unless the lifecycle event produced a tag. This is useful for stable or emergency mirrors.

Example:

```json
{
  "profiles": {
    "daily": {
      "remote": "origin",
      "sourceRef": "develop",
      "targetBranch": "daily",
      "history": "preserve",
      "permissions": {
        "inspect": true,
        "review": true,
        "push": true
      },
      "delivery": {
        "allowOn": ["manual", "feature-finish", "release-finish", "hotfix-finish"],
        "autoOn": ["feature-finish"]
      }
    },
    "emergency-stable": {
      "remote": "origin",
      "sourceRef": "main",
      "targetBranch": "stable",
      "history": "preserve",
      "permissions": {
        "inspect": true,
        "review": true,
        "push": true
      },
      "delivery": {
        "allowOn": ["release-finish", "hotfix-finish"],
        "autoOn": ["release-finish", "hotfix-finish"],
        "requireTag": true
      }
    }
  }
}
```

With that configuration, a feature finish may refresh `daily`, while `stable` cannot be manually pushed and changes only after a tagged release/hotfix finishes.

## Git Flow fields

For a Git Flow profile:

```json
{
  "branch": {
    "strategy": "git-flow",
    "main": "main",
    "develop": "develop",
    "featurePrefix": "feature/",
    "releasePrefix": "release/",
    "hotfixPrefix": "hotfix/"
  },
  "release": {
    "tagPrefix": "v"
  },
  "permissions": {
    "flow": true
  }
}
```

`permissions.flow` must be explicitly `true` before HEADBANG will create, merge, tag, or delete lifecycle branches.

## Projection semantics

`include` is an allow-list. If omitted or empty, everything is initially eligible. `exclude` is evaluated after inclusion and always wins. `map` can move an included subtree to another destination root. For example `{ "from": "backend", "to": "" }` publishes the contents of `backend/` at the remote repository root.

Patterns support `*`, `**`, and `?`. Use forward slashes in config on every OS.

## Snapshot delivery

Snapshot mode never checks out an orphan branch in your active workspace. HEADBANG creates an isolated detached Git worktree at the selected source commit, builds the projection into a temporary directory, scans it, initializes a temporary Git repository, creates one delivery commit, pushes it, then removes the temporary data. Your current branch and unstaged changes are not switched or stashed.

Snapshot history replacement uses `--force-with-lease` with the observed remote SHA instead of an unconditional `--force`.
