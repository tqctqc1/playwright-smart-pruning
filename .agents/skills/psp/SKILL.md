---
name: psp
description: Quick browser automation using high-speed Playwright Smart Pruning MCP server. Use /psp [url] to navigate, browse, search, and interact with web pages.
---

# Playwright Smart Pruning Quick Command (`/psp`)

This skill activates high-speed web browsing and automation using **`playwright-smart-pruning`**.

## Guidelines
- Use MCP server `playwright-smart-pruning`.
- Always prefer direct deep-linking over typing search queries from homepages.
- Leverage `autoSnapshot: true` on `browser_navigate`, `browser_click`, `browser_type`, and `browser_press_key` to receive updated viewport interactive elements in a single turn.
- For interactive clicks, use the semantic `data-ag-id` numeric ID (e.g. `"1"`, `"2"`).
