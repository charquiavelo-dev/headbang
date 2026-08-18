# Workflows

## Git Flow

Set `branch.strategy` to `git-flow`. HEADBANG recognizes `main`, `develop`, `feature/*`, `release/*`, and `hotfix/*`. It validates the current branch during review. HEADBANG does not silently create or merge branches for you in v1; branch policy is validation-first.

## GitHub Flow

Set `github-flow` for short-lived branches targeting `main`. The strategy name describes branching behavior, not the hosting provider; it also works with GitLab, Bitbucket, Codeberg, or generic Git remotes.

## Trunk-based

Set `trunk` and optionally `allowed` branch globs. Keep branches short and let review/delivery gates enforce quality before integration.

## Conventional Commits

HEADBANG accepts: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, and `revert`, with optional scope and breaking-change marker. Example: `fix(risk): preserve ratchet floor after drawdown`.

## SemVer-lite

`headbang release 1.4.2` inspects commit messages since the most recent tag. Breaking changes recommend major, `feat` recommends minor, and `fix`/`perf` recommend patch. Other types default to no release unless profile rules override them. It recommends only; v1 does not publish npm packages automatically.
