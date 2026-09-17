# Playwright Smart Viewport DOM Pruner & Standalone MCP Server (v3.0)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![MCP Server](https://img.shields.io/badge/MCP-Server%20Ready-success.svg)](https://modelcontextprotocol.io)
[![Token Reduction](https://img.shields.io/badge/Token%20Savings-96.1%25-brightgreen.svg)](#benchmark-matrix)
[![Latency](https://img.shields.io/badge/Action%20Latency-sub--10ms-orange.svg)](#key-innovations)

> **High-speed, token-optimized, standalone Model Context Protocol (MCP) server for Playwright browser automation.**  
> *Máy chủ MCP độc lập hiệu năng cao: Tiết kiệm 96.1% token, giảm thời gian thao tác từ ~1 phút xuống dưới 15ms, hoàn toàn độc lập không bị ảnh hưởng bởi các bản cập nhật Playwright MCP mặc định.*

---

🌐 **Language / Ngôn ngữ**: [English](#english) | [Tiếng Việt](#tiếng-việt)

---

<a name="english"></a>
## 🇬🇧 English

### Why Standalone MCP?
Standard `@playwright/mcp` often encounters issues on heavy SPAs (YouTube, Twitter, infinite feeds):
- **~1 Minute Hangs**: Navigations wait on `networkidle` or `load` which block indefinitely on streaming websockets and analytics beacons.
- **Context Window Blowup**: Raw accessibility tree snapshots routinely produce 15,000 to 30,000 tokens of offscreen links and SVG noise.
- **Update Vulnerability**: Updates to `@playwright/mcp@latest` can overwrite custom behaviors or break workflows.

**`playwright-smart-pruning`** packages Smart Viewport DOM Pruning directly as an **independent, self-hosted MCP Server**:
1. **Anti-Hang Navigation**: Uses fast `domcontentloaded` with timeout graceful recovery.
2. **Instant In-Page Pointer Lifecycle**: Dispatches `pointerdown` -> `mousedown` -> `pointerup` -> `mouseup` -> `click` directly with React 18/Vue 3 property setters (<15ms).
3. **1-Turn Navigation + Observation**: `browser_navigate` automatically returns pruned viewport interactive elements immediately.
4. **96% Token Reduction**: Emits compact semantic lines `[id] <tag> text` tagged with `data-ag-id`.

---

### Available MCP Tools (`ServerName: "playwright-smart-pruning"`)

| Tool | Parameters | Description |
|---|---|---|
| `browser_navigate` | `url`, `waitUntil`, `timeout`, `autoSnapshot` | Navigate with anti-hang timeouts and instant viewport DOM extraction |
| `browser_snapshot` | `format` (`"semantic"` or `"json"`) | Extract visible, high-intent interactive elements tagged with `data-ag-id` |
| `browser_click` | `target` (e.g. `"1"` or selector/text), `doubleClick` | Instant click (<15ms latency) |
| `browser_type` | `target`, `text`, `submit`, `clear` | Fast text input with React 18/Vue 3 prototype setter synchronization |
| `browser_hover` | `target` (e.g. `"1"` or selector/text) | Hover cursor over element (<15ms latency) |
| `browser_select_option` | `target` (e.g. `"1"` or selector), `value` | Select option from dropdown (<select>) element |
| `browser_press_key` | `key` (e.g. `"Enter"`, `"Tab"`, `"Escape"`) | Press keyboard key on active page |
| `browser_wait_for` | `selector`, `text`, `timeMs`, `state` | Wait for element, text, or specific duration |
| `browser_handle_dialog` | `action` (`"accept"`, `"dismiss"`), `promptText` | Configure automated dialog handling and inspect last dialog |
| `browser_scroll` | `direction`, `amount`, `autoSnapshot` | Scroll viewport and automatically return newly visible elements |
| `browser_take_screenshot` | `fullPage`, `path` | Capture screenshot (interaction overlay is automatically hidden) |
| `browser_tabs` | `action` (`"list"`, `"new"`, `"switch"`, `"close"`), `index`, `url` | Multi-tab browser management |
| `browser_evaluate` | `function` | Execute custom JavaScript code or arrow function in page context |
| `browser_lock` | `action` (`"lock"`, `"unlock"`), `message` | Toggle non-intrusive HUD interaction lock overlay |
| `browser_close` | *(none)* | Cleanly close browser session |

---

### MCP Configuration

Add this server to your `mcp_config.json`:

```json
{
  "mcpServers": {
    "playwright-smart-pruning": {
      "command": "node",
      "args": [
        "C:\\Users\\cuong1\\.gemini\\antigravity\\scratch\\playwright-smart-pruning\\src\\server.js"
      ]
    }
  }
}
```

---

<a name="tiếng-việt"></a>
## 🇻🇳 Tiếng Việt

### Tính Năng Nổi Bật

1. **Hoàn Toàn Độc Lập**: Tách biệt 100% khỏi `@playwright/mcp@latest`. Không bị ảnh hưởng hoặc ghi đè mỗi khi Playwright cập nhật.
2. **Khắc Phục Hoàn Toàn Hiện Tượng Chờ ~1 Phút**:
   - `browser_navigate` sử dụng `domcontentloaded` kết hợp cơ chế phục hồi timeout thông minh, mở YouTube và báo chí chỉ trong 1 - 2 giây.
   - Trả về ngay danh sách phần tử tương tác trong khung nhìn ngay khi mở trang (giảm 1 vòng gọi tool).
3. **Thao Tác Siêu Tốc (<15ms)**:
   - Thay vì chờ đợi Playwright locator resolution (~1 - 7 giây), server phát trực tiếp chuỗi sự kiện con trỏ (`pointerdown` -> `mousedown` -> `pointerup` -> `mouseup` -> `click`) thông qua định danh `data-ag-id`.
   - Hỗ trợ React 18 / Vue 3 qua prototype setter descriptor, đảm bảo nhập text vào ô tìm kiếm không bị nuốt chữ hoặc mất state.
4. **Tiết Kiệm 96% Token**:
   - Thay vì 15,000 - 30,000 tokens của cây Accessibility Snapshot chuẩn, Smart Viewport DOM Pruner chỉ xuất ~500 tokens dạng dòng ngữ nghĩa siêu gọn:
     ```text
     [1] <button> Hướng dẫn
     [2] <a> Trang chủ YouTube
     [3] <input:text> Tìm kiếm
     [4] <button> Tìm kiếm
     ```

---

## 🧪 Đo Kiểm & Xác Minh / Benchmark & Testing

Chạy bộ kiểm thử tự động:

```bash
# Kiểm tra giao thức MCP qua stdio client
npm test

# Kiểm tra tương tác trình duyệt (BrowserController)
npm run test:browser
```

Kết quả đo kiểm thực tế trên YouTube & Web:
- Thời gian mở YouTube & trích xuất phần tử: **~1.3 giây** (so với >60 giây trước đây)
- Độ trễ gõ phím / click bằng `data-ag-id`: **3ms - 7ms**
- Độ trễ quét DOM toàn khung nhìn: **2ms - 10ms**

---

## 📂 Cấu Trúc Dự Án / Project Structure

```
playwright-smart-pruning/
├── bin/
│   └── cli.js                  # CLI executable entrypoint
├── src/
│   ├── browser.js              # Quản lý phiên trình duyệt & anti-hang navigation
│   ├── interact.js             # Dispatch sự kiện chuột/phím & lock overlay
│   ├── pruner.js               # Thuật toán DOM Pruning v3.0 (checkVisibility)
│   └── server.js               # MCP Server (Model Context Protocol stdio)
├── test/
│   ├── test_browser.js         # Unit test BrowserController
│   ├── test_mcp_client.js      # Integration test toàn diện qua MCP Stdio client
│   └── test_youtube.js         # Benchmark thực tế trên YouTube
├── package.json
└── README.md
```

## 📄 Bản Quyền / License
MIT License.
