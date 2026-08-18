# Security Policy

## Reporting a vulnerability

Please do not open a public issue for a suspected credential leak or command-execution vulnerability. Use GitHub private vulnerability reporting when enabled for the repository, or contact the maintainer privately through the repository profile.

## Security model

HEADBANG treats repository configuration as trusted local configuration, but it still refuses several dangerous actions unless the active profile explicitly permits them. MCP callers cannot invent shell commands: gates reference named tasks declared in configuration. Secret scanning is defense-in-depth, not a replacement for a dedicated scanner such as Gitleaks or TruffleHog.

Credentials must never be stored in `.headbang.json`. Authentication is delegated to Git credential helpers, SSH, or provider CLIs configured by the user.
