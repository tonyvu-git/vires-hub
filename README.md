# 🏢 VIRES Hub & Wiki — Hệ thống Quản trị & Truyền thông Nội bộ

Chào mừng bạn đến với **VIRES Hub**, cổng thông tin tích hợp được thiết kế riêng cho **Trung Tâm Đăng Kiểm Phương Tiện Thủy và Công Trình Biển (VIRES)**. Đây là một giải pháp hợp nhất giữa mạng xã hội doanh nghiệp, quản lý công việc và kho tri thức số.

---

## 🌟 Tính năng Cốt lõi

### 1. VIRES Hub (Cổng thông tin & Cộng tác)

- **Bản tin (News Feed):** Cập nhật thông tin nóng hổi hỗ trợ định dạng Markdown.
- **Chat Real-time:** Thảo luận nhóm và nhắn tin riêng (DM) tức thì với hệ thống cảm xúc (Emoji reactions).
- **Công việc (Tasks):** Theo dõi tiến độ và nhận cảnh báo deadline cho từng nhân viên.
- **Danh bạ (Directory):** Tìm kiếm đồng nghiệp, chức vụ và liên hệ nhanh chóng.

### 2. VIRES Wiki (Kho tri thức & Quy trình)

- 🚀 **Hệ thống Wiki 7 Phòng ban:** Chuyên nghiệp hóa việc lưu trữ quy trình và chính sách.
- **Đăng nhập một lần (SSO):** Tự động đồng bộ tài khoản từ Portal sang Wiki.
- **Quản lý thông minh:** Tìm kiếm toàn văn (Full-text search) và menu phân cấp linh hoạt.

---

## 🛠️ Yêu cầu Hệ thống & Cài đặt

### Yêu cầu

- **Node.js:** Phiên bản LTS 20.x trở lên.
- **Môi trường:** Chạy tốt trên Windows Server / Dell PC nội bộ (Mạng LAN).
- **Trình duyệt:** Chrome, Edge, Safari phiên bản mới nhất.

### Các bước khởi tạo nhanh (Quick Start)

1. **Cài đặt thư viện:**

    ```bash
    npm install
    ```

2. **Khởi chạy máy chủ:**

    ```bash
    node server.js
    ```

    *Hệ thống sẽ mặc định chạy tại: `http://localhost:4000`*

---

## 🏗️ Kiến trúc & Bảo mật

- **Backend:** Node.js (Express) + SQLite (better-sqlite3).
- **Real-time:** Socket.io Engine v4.
- **Bảo mật:** Xác thực 100% qua JWT (Json Web Token). Dữ liệu được cô lập trong mạng LAN.
- **Tài liệu:** Wiki vận hành trên nền tảng Docsify (Tốc độ cực nhanh, không cần database riêng).

---

## 💾 Lưu ý về Dữ liệu & Sao lưu

Vì hệ thống chạy SQLite, việc sao lưu cực kỳ đơn giản (chỉ cần copy file/thư mục):

- **`database.db`**: Chứa toàn bộ dữ liệu (User, Chat, Task, News).
- **`public/uploads/`**: Chứa ảnh đại diện người dùng.
- **`public/news-images/`**: Chứa ảnh trong các bài viết tin tức.
- **`public/wiki/docs/`**: Chứa toàn bộ file quy trình Markdown của 7 phòng ban.

---

## 🤝 Liên hệ & Phát triển

Hệ thống được thiết kế mở, dễ dàng bổ sung tính năng. Mọi chi tiết kỹ thuật chuyên sâu vui lòng tham khảo file: [**`PROJECT_SUMMARY.md`**](./PROJECT_SUMMARY.md).

---
*Phát triển bởi LINHVT-VIRES. © 2026.*
