# Playwright Smart Viewport DOM Pruner (v3.0)

> **Kỹ thuật trích xuất phần tử tương tác tối ưu hóa cho AI Agent: Tiết kiệm tới 96.1% token và giảm độ trễ phản hồi từ 7,000ms xuống dưới 15ms.**

Dự án này lưu trữ thuật toán **Smart Viewport DOM Pruning (v3.0)** được phát triển và kiểm thử thực nghiệm đối đầu với Microsoft Playwright chuẩn (`browser_snapshot`).

---

## 1. So Sánh Tiến Hóa Thuật Toán: Microsoft vs v1 vs v2 vs v3

| Tiêu Chí | Microsoft Playwright Chuẩn (`browser_snapshot`) | Smart Pruning v1 | Smart Pruning v2 | Smart Pruning v3.0 (Mới nhất) |
| :--- | :--- | :--- | :--- | :--- |
| **Cơ chế quét DOM** | Cây trợ năng AXTree toàn trang | `getComputedStyle` toàn bộ DOM | Bỏ SVG, thêm anti-nesting cơ bản | **Native `checkVisibility()` + Card-aware pruning** |
| **Tốc độ quét (In-Page)**| ~500 ms (Roundtrip snapshot) | 57.2 ms | 30.3 ms | **5.3 ms - 10.8 ms (nhanh hơn 3x)** |
| **Số phần tử (YouTube)**| 753 dòng AXTree | 656 items | 202 items | **82 items (chỉ giữ đúng hành động cốt lõi)** |
| **Token ước tính (YouTube)**| ~14,131 tokens | ~13,838 tokens | ~3,550 tokens | **544 tokens (tiết kiệm 96.1%)** |
| **Token ước tính (VnExpress)**| ~21,223 tokens | ~10,500 tokens | ~2,867 tokens | **480 tokens (tiết kiệm 97.7%)** |
| **Định dạng dữ liệu** | YAML AXTree phân cấp phức tạp | JSON Objects | JSON Objects | **Semantic Lines (`[id] <tag:type> text`)** |
| **Tốc độ hành động (Action)**| ~1,000 ms - 7,000 ms | ~17.8 ms | ~15.0 ms | **~10.4 ms (Chuỗi MouseEvent đầy đủ)** |

---

## 2. Các Đột Phá Kỹ Thuật Trong Phiên Bản v3.0

1. **Native `el.checkVisibility()`**:
   - Thay thế toàn bộ lệnh `window.getComputedStyle(el)` bằng API native hiện đại của Chromium.
   - Triệt tiêu hiện tượng *Layout Thrashing*, giảm thời gian quét DOM xuống chỉ còn **5 - 10 ms**.

2. **Chặn Đứng Thừa Kế Con Trỏ (Pointer Inheritance Suppression)**:
   - Theo chuẩn CSS, `cursor: pointer` tự động thừa kế xuống mọi thẻ con (`span`, `div`, `badge`, timestamp, view counts).
   - v3.0 phát hiện và loại bỏ triệt để các thẻ con thụ động chỉ thừa kế con trỏ từ thẻ cha, giúp giảm thêm **57% phần tử rác** trên các trang mạng xã hội / video như YouTube.

3. **Ngăn Chặn Trùng Lặp Cấp Thẻ (Card-Aware Anti-Nesting)**:
   - Trong các khối hiển thị (card/article/feed item) đã có thẻ `<a>` hoặc `<button>`, v3.0 tự động loại bỏ các wrapper `div` bao quanh có cùng nội dung, tránh tình trạng 1 video sinh ra 7-10 node trùng lặp.

4. **Định Dạng Semantic Line Tối Giản**:
   - Thay vì trả về JSON lặp lại các trường `{"id":..., "tag":..., "text":...}`, v3.0 xuất danh sách dạng dòng:
     ```
     [1] <button> Guide
     [2] <a> YouTube Home
     [3] <input:text> Search
     [4] <button> Search
     ```
   - Cắt giảm thêm **55% byte payload**, giúp LLM đọc hiểu trực quan và tiết kiệm token kỷ lục.

5. **Bộ Kích Hoạt Sự Kiện Chuột Đầy Đủ (Full Pointer Event Lifecycle)**:
   - Mô phỏng hoàn chỉnh `mousedown -> mouseup -> click` đảm bảo tương thích 100% với các thư viện Reactive SPA (React 18, Vue 3, Angular).
