# HEADBANG

HEADBANG is a Node.js CLI and MCP server for reviewing, committing, and pushing Git changes with repository-defined safeguards.

## Installation

```bash
npm install -g headbang-mcp
```

Or run it without installing globally:

```bash
npx headbang status
```

## Basic use

Run these commands from a Git repository:

```bash
headbang status
headbang doctor
headbang profiles
headbang review
headbang push --dry-run
```

Use `headbang help` to see all commands.

## Development

```bash
git clone <your-fork>
cd headbang
npm install
npm run check
```

## License

HEADBANG is available under the [Apache License 2.0](LICENSE). See [NOTICE](NOTICE).

## Contributing

Issues and pull requests are welcome. See the repository guidelines before contributing.
