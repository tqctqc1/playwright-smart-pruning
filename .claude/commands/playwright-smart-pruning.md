---
description: Fast browser automation with Playwright Smart Pruning MCP server
---

You are executing a browser task using the **`playwright-smart-pruning`** MCP server.

## Instructions
1. If `mcp__playwright-smart-pruning__*` tools are listed as deferred tools, call `ToolSearch` (`query: "playwright-smart-pruning"`, `max_results: 20`) first to load their schemas.
2. Check the target URL or action provided in `$ARGUMENTS`.
3. Use `mcp__playwright-smart-pruning__browser_navigate` with `{ url, autoSnapshot: true }` to open the URL.
4. Review the returned compact semantic interactive elements (`[id] <tag> text`).
5. Interact with elements using `mcp__playwright-smart-pruning__browser_click` (`{ target: id, autoSnapshot: true }`) or `mcp__playwright-smart-pruning__browser_type` (`{ target: id, text: "...", submit: true, autoSnapshot: true }`). For JS evaluation, use `mcp__playwright-smart-pruning__browser_evaluate` (`{ function: "() => ..." }`).
6. Close the session with `mcp__playwright-smart-pruning__browser_close` once the task is finished if no longer needed.
