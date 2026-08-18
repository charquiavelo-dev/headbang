# Workflows

HEADBANG 1.1 adds a native Git Flow lifecycle implemented with ordinary Git. You do **not** install the separate `git-flow` executable. HEADBANG creates, merges, tags and cleans branches itself while enforcing repository policy.

It also connects Git Flow lifecycle events to delivery profiles. This means a repository can publish development work frequently while another branch or remote receives only stable releases.

## Git Flow configuration

Select the strategy on the profile that governs development and explicitly allow flow mutations:

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

Optional prefixes are supported:

```json
{
  "branch": {
    "strategy": "git-flow",
    "featurePrefix": "feature/",
    "releasePrefix": "release/",
    "hotfixPrefix": "hotfix/"
  }
}
```

The tag prefix comes from `release.tagPrefix` and defaults to `v`.

## Inspect Git Flow state

```bash
headbang flow status
headbang flow status --profile=codeberg-private
```

This is read-only and reports the active branch, Git Flow classification, base branches/prefixes, local branches and working-tree cleanliness.

## Features

A feature starts from `develop`:

```bash
headbang feature start order-flow
```

HEADBANG requires a clean working tree, checks that `develop` exists, checks that `feature/order-flow` does not already exist, checks out `develop`, then creates `feature/order-flow`.

Finish while checked out on the feature branch:

```bash
headbang feature finish order-flow
```

Before integration, HEADBANG runs deterministic review and configured quality gates against `develop`. Critical/high findings block the finish. A successful finish checks out `develop`, performs a `--no-ff` merge with a Conventional Commit-compatible merge message, then deletes the feature branch unless `--keep-branch` is used.

The emitted lifecycle event is `feature-finish`. Profiles with `delivery.autoOn: ["feature-finish"]` are delivered after the local merge succeeds.

## Releases

A release must use a SemVer-shaped version and starts from `develop`:

```bash
headbang release start 1.1.0
```

Finish while checked out on `release/1.1.0`:

```bash
headbang release finish 1.1.0
```

A successful release finish performs:

```text
release/1.1.0
  -> review + configured gates
  -> merge --no-ff into main
  -> annotated tag v1.1.0
  -> merge --no-ff back into develop
  -> delete release/1.1.0
  -> emit release-finish with sourceRef=main and tag=v1.1.0
  -> run matching auto-delivery profiles
```

HEADBANG refuses to overwrite an existing release tag.

The existing SemVer-lite inspection command remains backward compatible:

```bash
headbang release 1.0.0
headbang release inspect 1.0.0
```

Those commands recommend a version only; they are different from `release start/finish`.

## Hotfixes

A hotfix starts from `main`:

```bash
headbang hotfix start 1.1.1
```

Finish it while checked out on the hotfix branch:

```bash
headbang hotfix finish 1.1.1
```

HEADBANG reviews the hotfix against `main`, merges it to `main`, creates `v1.1.1` when the name is SemVer-shaped, merges it back to `develop`, removes the hotfix branch, and emits `hotfix-finish`.

A non-SemVer hotfix name is allowed, but no tag is invented. Therefore a profile with `delivery.requireTag: true` will not publish from that event.

## Stable/emergency mirror pattern

A common setup is one remote repository with a daily branch and a stable branch:

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

`headbang deliver stable` is blocked because that is a `manual` delivery and `stable` does not allow it. Finishing a tagged release or hotfix automatically publishes `main` to the stable branch.

The same pattern works across different remotes or providers, and each profile may also use a different projection.

## Safety and rollback

All Git Flow mutations require `permissions.flow: true`. Start/finish require a clean working tree. Finish requires the expected lifecycle branch to be checked out, so an agent cannot silently finish another branch.

Merge conflicts are never auto-resolved. If a multi-step finish fails, HEADBANG aborts any active merge, removes a tag it created during the failed transaction, restores the original `main`/`develop` SHAs, and returns to the lifecycle branch. This rollback only runs after HEADBANG has verified the working tree was clean.

Remote delivery happens after the local Git Flow operation succeeds. A remote push cannot always be rolled back safely; if an automatic delivery fails, HEADBANG reports that the local flow completed but the remote delivery failed so the user can retry deliberately.

## GitHub Flow

Set `github-flow` for short-lived branches targeting `main`. The strategy name describes branching behavior, not the hosting provider; it also works with GitLab, Bitbucket, Codeberg, or generic Git remotes.

## Trunk-based

Set `trunk` and optionally `allowed` branch globs. Keep branches short and let review/delivery gates enforce quality before integration.

## Conventional Commits

HEADBANG accepts: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, and `revert`, with optional scope and breaking-change marker. Example: `fix(risk): preserve ratchet floor after drawdown`.

Git Flow merge commits created by HEADBANG use Conventional Commit-compatible subjects such as `chore(flow): merge feature/order-flow` and `chore(release): merge release/1.1.0`.

## SemVer-lite

`headbang release 1.4.2` inspects commit messages since the most recent tag. Breaking changes recommend major, `feat` recommends minor, and `fix`/`perf` recommend patch. Other types default to no release unless profile rules override them. It recommends only; HEADBANG does not publish npm packages automatically.


## Manual push compatibility

`headbang push [profile]` is the primary manual push command. It executes the profile's normal HEADBANG pipeline: review gates, projection rules, safety scanning and the configured Git remote/branch. `headbang deliver [profile]` remains supported as an advanced alias.

`headbang push --all` attempts every profile eligible for the `manual` event and reports release-only profiles as skipped.
