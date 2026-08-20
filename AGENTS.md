# Publication runbook

## Non-negotiable rules

- Use interactive web authentication for GitHub and npm. Never ask the user for tokens or OTP values.
- When npm is the requested target, finish npm before investigating unrelated GitHub checks.
- Treat the npm website as eventually consistent. A stale or temporarily malformed page is not evidence that the published tarball or registry README is damaged.
- Never change the README or bump the package version only to work around an npm website cache.

## npm: shortest correct path

1. Run `npm.cmd whoami`.
2. Only if unauthenticated, run `npm.cmd login --auth-type=web` in an interactive terminal, press Enter immediately when prompted, let the browser open, and wait for completion.
3. Run `npm.cmd publish --access public` in an interactive terminal.
4. When npm prints `Press ENTER to open in the browser`, press Enter immediately. Wait for browser approval and keep the publish process alive until it prints `+ <package>@<version>`.
5. Verify with `npm.cmd view <package> version`.
6. If the npm page looks stale, wait for its cache. Verify the registry payload before touching files or publishing another version.

Do not use `headbang package publish` until its `npm pack --json` parser tolerates lifecycle-script output before the JSON payload. The package prepack script prints test output, so the current parser rejects a valid pack result.

On Windows PowerShell, do not diagnose README corruption from captured `npm view ... readme` output: PowerShell can decode Unicode CLI output incorrectly. Compare the local UTF-8 README with the registry JSON inside Node instead.

## GitHub web authentication

1. Run `git credential-manager github login --web`.
2. If multiple GitHub accounts are stored, run `git credential-manager github list` and bind this repository to its owner with `git config credential.https://github.com.username <owner>`.
3. Then use HEADBANG's confirmed `change plan` and `change create` flow.

## Incident record: 2026-08-20

The publication was delayed by avoidable detours. Do not repeat them:

- Assumed missing credentials required manually supplied tokens instead of opening web authentication.
- Ran redundant credential diagnostics after the user had already specified the authentication method.
- Used HEADBANG's package publisher even though prepack output breaks its JSON-only pack parser.
- Ran `npm publish` without an interactive terminal, causing the web-auth prompt to exit as `EOTP`.
- Extracted and polled npm authentication URLs instead of pressing Enter in the live interactive publish process.
- Investigated GitHub Actions while the user was explicitly waiting for npm publication.
- Mistook PowerShell Unicode decoding for a damaged npm README.
- Mistook npm website cache lag for a bad publication and started an unnecessary README rewrite and version bump; that publish was cancelled and the files were reverted.
- Marked publication work complete before external publication had actually succeeded.

The correct result was obtained with one interactive `npm publish`, one Enter keypress, browser approval, and registry verification.
