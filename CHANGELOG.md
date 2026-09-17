# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.2.0] - 2026-09-17

### Added
- **Network-level Ad & Tracker Filter**: Automatically aborts incoming requests to Google Ads, DoubleClick, Taboola, Outbrain, and video ad streaming endpoints at the Chromium routing layer.
- **Autonomic Client Guard**: Background page mutation guard that auto-skips YouTube ads, fast-forwards unskippable ads, and auto-dismisses GDPR/cookie consent overlays without requiring agent intervention.
- **Action Chaining (`autoSnapshot: true`)**: Added `autoSnapshot` parameter to `browser_click`, `browser_type`, and `browser_press_key` to immediately return newly visible interactive elements in 1 turn.
- Comprehensive end-to-end MCP client test for `autoSnapshot` validation.

### Changed
- Bumped project version to `3.2.0`.
- Enhanced MCP tool schemas in `antigravity/mcp` and `antigravity-ide/mcp` with `autoSnapshot` flag.
- Updated skill documentation (`SKILL.md`) with high-speed automation golden rules (deep-linking, action chaining, zero-wait policy).

## [3.1.0] - 2026-09-15

### Added
- Direct synthetic pointer lifecycle dispatch (`pointerdown` -> `mousedown` -> `pointerup` -> `mouseup` -> `click`).
- React 18 and Vue 3 prototype setter synchronization for form inputs.
- HUD lock mechanism (`browser_lock`) to prevent accidental user interference.

## [3.0.0] - 2026-09-12

### Added
- Smart Viewport DOM Pruning engine reducing snapshot context by 96%.
- Anti-hang navigation with `domcontentloaded` default strategy and graceful timeout fallbacks.
- Semantic compact line format (`[id] <tag> text`) for LLM context optimization.

## [2.0.0] - 2026-09-10

### Added
- Initial standalone MCP server implementation for Playwright browser automation.
