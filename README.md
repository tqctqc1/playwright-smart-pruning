# Playwright Smart Viewport DOM Pruner (v3.0)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Playwright MCP](https://img.shields.io/badge/Playwright-MCP-green.svg)](https://github.com/modelcontextprotocol/servers)
[![Token Reduction](https://img.shields.io/badge/Token%20Savings-96.1%25-brightgreen.svg)](#benchmark-matrix)
[![Latency](https://img.shields.io/badge/Action%20Latency-10ms-orange.svg)](#key-innovations)

> **High-efficiency interactive DOM extraction for Agentic AI: Cut token consumption by up to 96% and reduce browser interaction latency from 7,000ms to sub-15ms.**  
> *Kỹ thuật trích xuất phần tử tương tác tối ưu hóa cho AI Agent: Tiết kiệm tới 96.1% token và giảm độ trễ phản hồi từ 7,000ms xuống dưới 15ms.*

---

🌐 **Language / Ngôn ngữ**: [English](#english) | [Tiếng Việt](#tiếng-việt)

---

<a name="english"></a>
## 🇬🇧 English

### Overview

Standard browser automation with Large Language Models (LLMs) often relies on full Accessibility Tree snapshots (`page.accessibility.snapshot()`). On complex modern Single-Page Applications (SPAs) or infinite-feed websites, accessibility trees routinely generate 15,000 to 30,000+ tokens filled with offscreen elements, deeply nested advertisement links, and SVG graphic noise.

**Smart Viewport DOM Pruner (v3.0)** solves this bottleneck by surgically extracting only visible, high-intent interactive elements within the current browser viewport, tagging them with temporary in-page identifiers (`data-ag-id`), and returning a clean semantic stream.

### Benchmark Matrix

Empirical head-to-head comparison conducted on real browser sessions (headed mode, 2560x1440 resolution) across diverse web architectures:

| Scenario / Website | Method | Elements Extracted | Scan Latency | Payload Size | Estimated Tokens | Action Latency | % Token Savings |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **YouTube (SPA)**<br>*Search & video play* | **Standard Snapshot**<br>Pruner v1<br>Pruner v2<br>**Pruner v3.0** | 753 AX lines<br>656 items<br>202 items<br>**82 items** | ~500 ms (Roundtrip)<br>57.2 ms<br>30.3 ms<br>**10.8 ms** | 56,527 B<br>55,353 B<br>14,200 B<br>**2,334 B** | 14,131 tokens<br>13,838 tokens<br>3,550 tokens<br>**544 tokens** | ~7,000 ms<br>17.8 ms<br>15.0 ms<br>**10.4 ms** | *Baseline*<br>2.1%<br>74.8%<br>**96.1%** |
| **VnExpress (News)**<br>*Long scroll feed* | **Standard Snapshot**<br>Pruner v2<br>**Pruner v3.0** | 1,263 AX lines<br>119 items<br>**76 items** | ~500 ms (Roundtrip)<br>13.9 ms<br>**8.0 ms** | 84,895 B<br>11,471 B<br>**2,150 B** | 21,223 tokens<br>2,867 tokens<br>**480 tokens** | ~1,200 ms<br>10.8 ms<br>**10.8 ms** | *Baseline*<br>86.5%<br>**97.7%** |
| **GitHub Search (App)**<br>*Complex query UI* | **Standard Snapshot**<br>Pruner v2<br>**Pruner v3.0** | 597 AX lines<br>94 items<br>**94 items** | ~500 ms (Roundtrip)<br>9.1 ms<br>**5.3 ms** | 35,181 B<br>3,212 B<br>**1,960 B** | 8,795 tokens<br>803 tokens<br>**490 tokens** | ~1,100 ms<br>9.6 ms<br>**9.6 ms** | *Baseline*<br>90.8%<br>**94.4%** |

### Key Innovations in v3.0

1. **Native `el.checkVisibility()`**:
   - Replaces CPU-expensive `getComputedStyle()` calls across thousands of DOM nodes.
   - Eliminates layout thrashing, delivering in-page scan times of **5.3 ms to 10.8 ms** (3x faster).
2. **Pointer Inheritance Suppression**:
   - In CSS, `cursor: pointer` automatically cascades down to every descendant (`span`, `div`, timestamps, badges).
   - v3.0 strips passive descendants that merely inherit pointer styling from parent cards, eliminating 57% of residual noise on modern SPAs.
3. **Card-Aware Anti-Nesting**:
   - When a card container already contains a primary link `<a>` or `<button>`, outer wrapper `div`s with redundant text are filtered out.
4. **Semantic Lines Output Format**:
   - Eliminates JSON boilerplate (`"id":`, `"tag":`, `"text":`), delivering compact lines:
     ```text
     [1] <button> Guide
     [2] <a> YouTube Home
     [3] <input:text> Search
     [63] <a> lofi hip hop mix 📚 beats to relax/study to
     ```
5. **Full Pointer Event Dispatch**:
   - Emits synthetic `mousedown -> mouseup -> click` lifecycle, ensuring immediate execution across React 18, Vue 3, and Web Components without waiting for Playwright locator re-resolution.

### Quick Start

```javascript
import { getViewportInteractiveElements } from './src/pruner.js';
import { clickElementById, typeIntoElementById } from './src/interact.js';

// 1. Extract elements in browser context
const elements = getViewportInteractiveElements('semantic');

// 2. Perform low-latency direct interaction
clickElementById(63);
typeIntoElementById(3, 'agentic workflow', true);
```

---

<a name="tiếng-việt"></a>
## 🇻🇳 Tiếng Việt

### Tổng Quan

Khi điều khiển trình duyệt bằng mô hình ngôn ngữ lớn (LLM), kỹ thuật chụp cây trợ năng mặc định (`page.accessibility.snapshot()`) thường gây quá tải context. Trên các trang SPA nặng (như YouTube) hoặc trang báo chí cuộn dài, snapshot sinh ra 15,000 - 30,000+ tokens chứa đầy link quảng cáo ngoài màn hình và các thẻ đồ họa rác.

**Smart Viewport DOM Pruner (v3.0)** giải quyết triệt để vấn đề này bằng cách chỉ trích xuất các phần tử tương tác thực tế hiển thị trong khung nhìn (viewport), gắn thẻ định danh trực tiếp `data-ag-id` và xuất dữ liệu dạng dòng ngữ nghĩa siêu gọn.

### Đột Phá Kỹ Thuật v3.0

1. **Chromium Native `el.checkVisibility()`**:
   - Thay thế toàn bộ lệnh `window.getComputedStyle(el)`, loại bỏ hiện tượng *Layout Thrashing*.
   - Giảm độ trễ quét DOM nội trang xuống chỉ còn **5.3 ms - 10.8 ms** (nhanh gấp 3 lần).
2. **Triệt Tiêu Kế Thừa Con Trỏ (Pointer Inheritance Suppression)**:
   - Trong CSS, thuộc tính `cursor: pointer` tự động thừa kế xuống mọi thẻ con (`span`, `div`, lượt xem, ngày đăng, badge).
   - Thuật toán v3.0 loại bỏ triệt để các node thụ động thừa kế con trỏ, cắt giảm thêm **57% phần tử rác** trên YouTube.
3. **Chống Trùng Lặp Cấp Thẻ (Card-Aware Anti-Nesting)**:
   - Nếu khối hiển thị (card/article) đã chứa thẻ liên kết `<a>` hoặc `<button>`, các wrapper `div` bao quanh có cùng nội dung sẽ bị loại bỏ.
4. **Định Dạng Semantic Line Siêu Gọn**:
   - Thay vì JSON cồng kềnh lặp lại các khóa trường, v3.0 xuất định dạng dòng:
     ```text
     [1] <button> Guide
     [2] <a> YouTube Home
     [3] <input:text> Search
     [4] <button> Search
     ```
   - Tiết kiệm tới **96.1% token** so với snapshot chuẩn của Microsoft.
5. **Kích Hoạt Sự Kiện Chuột Đầy Đủ**:
   - Chuỗi `mousedown -> mouseup -> click` chạy trực tiếp trong trang với độ trễ chỉ **~10 ms**, tương thích 100% với React 18, Vue 3 và Angular.

---

## 📂 Cấu Trúc Dự Án / Project Structure

```
playwright-smart-pruning/
├── src/
│   ├── pruner.js        # Thuật toán trích xuất DOM v3.0 (DOM extraction engine)
│   └── interact.js      # Bộ điều khiển tương tác chuột/phím (Action helpers)
├── examples/
│   └── benchmark_results.json  # Dữ liệu đo kiểm thực nghiệm (Empirical benchmark data)
├── package.json
└── README.md
```

## 📄 Bản Quyền / License

Phát hành theo giấy phép [MIT License](LICENSE).
