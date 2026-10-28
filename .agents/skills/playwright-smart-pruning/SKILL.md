---
name: playwright-smart-pruning
description: High-speed, token-optimized browser automation using the dedicated Playwright Smart Pruning MCP server (sub-15ms interactions, 96% token savings, anti-hang navigation). Use /playwright-smart-pruning [url] to navigate, browse, search, and interact with web pages.
---

# Playwright Smart Pruning MCP Server (v3.3)

This skill provides comprehensive instructions and best practices for browser automation using the independent **`playwright-smart-pruning`** MCP server.

Use the slash command `/playwright-smart-pruning [url]` to directly launch and automate high-speed browsing sessions.

## ⚡ Why Use This Server Instead of Standard Playwright MCP?

1. **Sub-15ms In-Page Actions**: Direct synthetic pointer dispatch (`pointerdown` -> `mousedown` -> `pointerup` -> `mouseup` -> `click`) eliminates slow 30-second locator re-evaluations.
2. **96% Token Savings**: Smart Viewport DOM Pruning extracts only visible, high-intent interactive elements into compact semantic lines (`[1] <button> Submit`), avoiding 15,000-30,000 token context overflows.
3. **Anti-Hang Navigation**: Default `domcontentloaded` wait condition with graceful fallback avoids 60-second timeouts on heavy SPAs (YouTube, Twitter, news portals) with infinite streaming/analytics.
4. **Built-in Network Ad & Tracker Filter**: Blocks ad networks (Google Ads, DoubleClick, Taboola, Outbrain) and video ad streams at the Chromium route level, dramatically speeding up page loads.
5. **Autonomic Client Guard**: Background mutation guard automatically fast-forwards/skips video ads and dismisses GDPR/cookie consent modals without requiring agent turns.
6. **Action Chaining with `autoSnapshot`**: `browser_click`, `browser_type`, and `browser_press_key` can immediately return the newly visible elements in the same turn, eliminating redundant snapshot round-trips.

---

## 🛠️ Available MCP Tools (`ServerName: "playwright-smart-pruning"`)

| Tool | Parameters | Description |
|---|---|---|
| `browser_navigate` | `url`, `mode` (`"existing"` default \| `"isolated"`), `waitUntil` (default: `domcontentloaded`), `timeout` (default: 15000), `autoSnapshot` (default: `true`) | Fast navigation. Automatically attaches to open Chrome via `DevToolsActivePort` + Chrome 144+ Auto-Allow when `mode: "existing"`, and returns visible interactive elements! |
| `browser_snapshot` | `format` (`"semantic"` or `"json"`), `mode` (`"existing"` \| `"isolated"`) | Scans viewport and assigns `data-ag-id` identifiers. Returns ultra-compact list. |
| `browser_click` | `target` (required — `data-ag-id` number/string, CSS selector, or text; `selector`/`id`/`ref` aliases supported), `doubleClick` (bool), `autoSnapshot` (bool) | Instant in-page click (<15ms). Set `autoSnapshot: true` to get new elements immediately. |
| `browser_type` | `target` (required), `text` (required; `value` alias supported), `submit` (bool), `clear` (bool), `autoSnapshot` (bool) | Instant input typing with React/Vue & `contenteditable` sync. Set `autoSnapshot: true` to get new elements immediately. |
| `browser_hover` | `target` (e.g. `"1"` or selector/text) | Hover cursor over element (<15ms). |
| `browser_select_option` | `target` (e.g. `"1"` or selector), `value` (string; `label`/`option` aliases supported) | Selects option from dropdown by value or text label. |
| `browser_press_key` | `key` (e.g. `"Enter"`), `autoSnapshot` (bool) | Presses keyboard key on active page. Set `autoSnapshot: true` to get new elements immediately. |
| `browser_wait_for` | `selector` (or `target`), `text`, `timeMs` (or `timeout`/`duration`), `state` | Waits for selector, text, or duration. |
| `browser_handle_dialog` | `action` (`"accept"`, `"dismiss"`), `promptText` | Configures automated dialog handling and inspects last dialog. |
| `browser_scroll` | `direction` (`"down"`, `"up"`, `"top"`, `"bottom"`), `amount` (default: 600), `autoSnapshot` (default: `true`) | Scrolls viewport (or largest inner scrollable container/modal) and automatically returns newly visible elements. |
| `browser_take_screenshot` | `fullPage` (bool), `path` (string) | Captures screenshot (automatically hides HUD lock overlay). |
| `browser_resize` | `width` (number), `height` (number) | Resizes viewport dimensions dynamically. |
| `browser_tabs` | `action` (`"list"`, `"new"`, `"switch"`, `"close"`), `index` (or `tabId`), `url`, `mode` (`"existing"` \| `"isolated"`) | Tab management. |
| `browser_evaluate` | `function` (required — arrow function `"() => ..."`, IIFE `"(() => { ... })()"`, or JS code; `expression`/`script`/`code` aliases supported) | Evaluates custom JavaScript or arrow function in page context. |
| `browser_lock` | `action` (`"lock"`, `"unlock"`), `message` (string) | Toggles agent HUD lock overlay to block accidental user interference. |
| `browser_close` | *(none)* | Closes browser session cleanly. |

---

## 🎯 High-Speed Automation Golden Rules

0. **Immediate First-Turn Invocation (Zero Pre-Check Policy)**:
   - **NEVER** run terminal commands (`Get-Process`, `Test-NetConnection`, `Get-ChildItem`, reading `DevToolsActivePort` or inspecting `browser.js` / JSON schemas) before calling `playwright-smart-pruning` tools.
   - Note: `run_command` on Windows runs in an isolated sandbox desktop (`MainWindowHandle = 0`) where UIAutomation cannot see `Chrome_WidgetWin_1`. Only the **`playwright-smart-pruning` MCP server** runs in the interactive desktop session with native `DevToolsActivePort` discovery, `_dismissStaleRemoteDebuggingDialogs`, and `_spawnRemoteDebuggingAutoAllow`.
   - Call `browser_navigate` (with `mode: "existing"` for the user's open browser, or `"isolated"` for a separate browser) **immediately on the first tool call**.

1. **Direct Deep-linking**: Never open a homepage just to type into a search bar! Navigate directly to the search URL:
   - YouTube: `https://www.youtube.com/results?search_query=...`
   - Google: `https://www.google.com/search?q=...`
   - GitHub: `https://github.com/search?q=...`
   *Saves 2-3 round-trips and 10+ seconds instantly.*

2. **Action Chaining (`autoSnapshot: true`)**:
   - Whenever clicking a link or submitting a form that changes the page, pass `"autoSnapshot": true`.
   - The response will contain both the click confirmation and the newly visible interactive elements in 1 turn!

3. **Zero-Wait Policy**:
   - Do NOT insert arbitrary `browser_wait_for` (e.g., 2000ms - 3000ms).
   - Use `waitUntil: "domcontentloaded"` and let `autoSnapshot` capture the rendered elements automatically.
