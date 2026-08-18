# Contributing to HEADBANG

Thanks for helping improve HEADBANG. The project is intentionally small, auditable and policy-first.

## Before opening a pull request

1. Open or reference an issue for behavior changes that affect configuration, safety, Git history or MCP tools.
2. Keep runtime dependencies to a minimum. Prefer Node.js and Git primitives.
3. Use Conventional Commits.
4. Add tests for new behavior, especially mutating Git operations.
5. Run `npm run check` and `npm pack --dry-run`.
6. Never commit real credentials, tokens, `.env` files, private repository URLs from customers, or private fixture data.

## Design rules

- Read-only operations should remain useful even when mutation permissions are denied.
- Mutating operations must require explicit profile permission.
- Destructive history replacement must use a lease/expectation where Git supports it.
- MCP callers may invoke named tasks but may not invent arbitrary shell commands.
- Provider-specific APIs belong behind adapters; core delivery must stay generic Git where possible.
- The active working tree should not be switched, stashed or rewritten just to produce a projection.

## License of contributions

Unless you explicitly state otherwise, contributions intentionally submitted to this project are licensed under Apache-2.0, consistent with the repository license.
