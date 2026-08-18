# Troubleshooting

## `No profile provided and no defaultProfile is configured`

Pass a profile name (`headbang preview github-public`) or set `defaultProfile` in `.headbang.json`.

## `Profile does not permit 'push'`

Mutating delivery requires `permissions.push: true`. HEADBANG does not infer permission from the fact that your Git credential can push.

## `Profile does not permit 'forcePush'`

Snapshot publication replaces generated history and requires `permissions.forcePush: true`. Do not enable it on a shared branch unless replacing that branch is the deliberate publication model.

## `Projection with history=preserve is not supported in v1`

HEADBANG v1 preserves history only for normal, unprojected Git pushes. Filtered-history rewriting is intentionally not hidden behind a simple option. Use `history: "snapshot"` for projections.

## `Safety scan blocked delivery`

Read every reported file and line. Remove the secret from the source or projection. Do not work around a real secret by weakening a regex. For false positives, narrow the projection or use an approved external scanner workflow; file an issue with a sanitized example if the built-in rule is unreasonable.

## `force-with-lease` rejected the push

Someone or something changed the target branch after HEADBANG observed its SHA. This is intentional protection. Fetch/inspect the destination, run preview again and decide whether replacing the new remote state is still correct.


## `Profile is not eligible for 'manual'`

The profile has an event-aware delivery policy and intentionally does not allow direct/manual publishing. This is common for `stable` or emergency mirrors that should only change after `release-finish` or `hotfix-finish`. Do not bypass the policy by changing the event; use the configured Git Flow lifecycle.

## `Profile requires a tagged delivery`

The profile sets `delivery.requireTag: true`, but the current lifecycle event has no tag. Release finishes always use a SemVer version and create a tag. Hotfixes create a tag only when their name is SemVer-shaped.

## `Git Flow mutation is disabled`

Set `permissions.flow: true` only on the profile that is allowed to create/merge/tag/delete Git Flow lifecycle branches. HEADBANG deliberately requires explicit permission.

## Git Flow merge conflict

HEADBANG never auto-resolves source conflicts. A failed multi-step finish aborts the active merge, removes a tag created during the failed transaction, restores the original `main`/`develop` SHAs, and returns to the lifecycle branch. Resolve the underlying conflict deliberately and run the finish operation again.

## Automatic delivery failed after Git Flow completed

Local Git Flow and remote delivery are separate safety boundaries. If the local feature/release/hotfix finish succeeded but an `autoOn` profile failed to push, HEADBANG reports that clearly and does not attempt a blind remote rollback. Fix authentication/policy/remote state and retry the appropriate delivery deliberately.

## Quality gate timed out

Increase the task's `timeoutMs` or fix the command. Keep long-running dev servers out of gates; gates must terminate.

## MCP client cannot connect

Build/install HEADBANG and verify `headbang-mcp` is on PATH. With a local checkout run `node dist/mcp.js`. MCP stdio reserves stdout for protocol messages, so custom modifications must never add `console.log` diagnostics to the MCP entry point.

## Windows notes

npm creates `.cmd` shims for package `bin` entries. Use forward slashes in HEADBANG projection patterns even when repository paths are on Windows. Git commands themselves are spawned without a shell; only explicitly declared tasks use the platform shell.

## `headbang push --all` says no profiles are configured

`git remote -v` and `headbang status` show Git remotes. `headbang push --all` operates on **HEADBANG delivery profiles**, not raw remotes.

This distinction is a safety feature. A remote named `github` may require a public projection while `origin` may receive the complete private repository. Automatically treating both remotes as equivalent could publish excluded files.

Check configured profiles:

```bash
headbang profiles
```

If none exist, create `.headbang.json` and map each destination explicitly. After configuration:

```bash
headbang preview github-public
headbang push github-public --dry-run
headbang push --all
```

If you truly want an unrestricted raw Git push, use Git directly. HEADBANG does not silently bypass missing policy.

## Why does normal CLI output no longer show JavaScript objects?

Starting with 1.1.2, human terminal output is rendered as readable sections and summaries. JSON is opt-in:

```bash
headbang status --json
headbang push --all --json
```
