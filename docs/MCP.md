# MCP setup

Install HEADBANG globally or execute it through npm. The MCP server uses stdio; stdout is reserved for MCP protocol messages and diagnostics are written to stderr.

## Generic client configuration

```json
{
  "mcpServers": {
    "headbang": {
      "command": "headbang-mcp"
    }
  }
}
```

If you prefer not to install globally:

```json
{
  "mcpServers": {
    "headbang": {
      "command": "npx",
      "args": ["-y", "headbang", "mcp"]
    }
  }
}
```

Available tools are `headbang_status`, `headbang_review`, `headbang_preview`, `headbang_deliver`, `headbang_commit`, and `headbang_release_inspect`.

`headbang_deliver` defaults to `dryRun=true`. A client must explicitly set it to false before HEADBANG attempts a remote mutation, and the selected profile must permit push/force-push as required.
