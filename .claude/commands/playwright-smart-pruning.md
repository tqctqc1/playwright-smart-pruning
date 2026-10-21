---
description: Fast browser automation with Playwright Smart Pruning MCP server
---

You are executing a browser task using the **`playwright-smart-pruning`** MCP server.

## Instructions
1. Check the target URL or action provided in `$ARGUMENTS`.
2. Use tool `playwright-smart-pruning:browser_navigate` with `autoSnapshot: true` to open the URL.
3. Review the returned compact semantic interactive elements (`[id] <tag> text`).
4. Interact with elements using `playwright-smart-pruning:browser_click` or `browser_type` referencing the target ID (e.g. `"1"`). Always set `autoSnapshot: true` to get the updated page state in 1 turn.
5. Close the session with `playwright-smart-pruning:browser_close` once the task is finished if no longer needed.
