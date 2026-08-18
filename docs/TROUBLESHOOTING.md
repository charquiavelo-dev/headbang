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

## Quality gate timed out

Increase the task's `timeoutMs` or fix the command. Keep long-running dev servers out of gates; gates must terminate.

## MCP client cannot connect

Build/install HEADBANG and verify `headbang-mcp` is on PATH. With a local checkout run `node dist/mcp.js`. MCP stdio reserves stdout for protocol messages, so custom modifications must never add `console.log` diagnostics to the MCP entry point.

## Windows notes

npm creates `.cmd` shims for package `bin` entries. Use forward slashes in HEADBANG projection patterns even when repository paths are on Windows. Git commands themselves are spawned without a shell; only explicitly declared tasks use the platform shell.
