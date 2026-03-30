# VIRES Hub & Wiki — Project Summary

> Tài liệu hướng dẫn dành cho AI assistant và Developer để duy trì và phát triển hệ thống.
> Cập nhật lần cuối: **30/03/2026**

---

## 1. Overview

**VIRES Hub** là một hệ thống tích hợp (Hybrid Portal) dành cho nhân viên công ty VIRES, vận hành hoàn toàn trong mạng LAN nội bộ. Hệ thống bao gồm hai thành phần cốt lõi:

1.  **VIRES Hub (Portal):** Trung tâm giao tiếp real-time, quản lý công việc và tin tức ngày.
2.  **VIRES Wiki (Knowledge Base):** Hệ thống lưu trữ quy trình, chính sách và biểu mẫu chuyên sâu của 7 phòng ban.

### Mục tiêu chiến lược
- Số hóa quy trình làm việc và tài liệu nội bộ.
- Tập trung hóa giao tiếp, loại bỏ sự phụ thuộc vào các công cụ chat bên ngoài cho dữ liệu nhạy cảm.
- Đảm bảo tính bảo mật và tốc độ truy cập cao trên hạ tầng Dell Server nội bộ.

---

## 2. Tech Stack

### Backend & Core
- **Node.js (Express 5.x):** Framework máy chủ mạnh mẽ và linh hoạt.
- **Socket.io:** Xử lý giao tiếp hai chiều real-time (Chat, Reactions, Unread Badges).
- **SQLite (better-sqlite3):** Cơ sở dữ liệu quan hệ đồng bộ, nhẹ và không cần cấu hình phức tạp.
- **JWT (JsonWebToken):** Cơ chế xác thực không trạng thái (stateless) cho toàn hệ thống.
- **Sharp:** Xử lý và tối ưu hóa hình ảnh (Avatar, tin tức).

### Frontend
- **Vanilla JS/CSS/HTML:** Tối ưu hóa hiệu suất, không dùng framework nặng nề.
- **Docsify (Wiki):** Engine hiển thị tài liệu Markdown trực tiếp không cần build.
- **Marked.js & DOMPurify:** Xử lý nội dung Markdown an toàn, chống XSS.

---

## 3. Architecture

Hệ thống sử dụng kiến trúc **Monolith Tích hợp**, trong đó một máy chủ Express duy nhất phục vụ cả Portal và Wiki.

### Cấu trúc thư mục chính
```
mind-hub/
├── server.js           # Server chính (Auth, API, Socket.io)
├── database.js         # Schema & Migrations (SQLite)
├── public/             # Thư mục tĩnh (Frontend)
│   ├── js/             # JS Modules (core.js, ui.js, chat.js, tasks.js...)
│   ├── style.css       # Design System & Main Styles
│   └── wiki/           # 🚀 VIRES Wiki (Docsify App)
│       ├── auth-check.js  # Cầu nối bảo mật (Shared Auth Bridge)
│       └── docs/          # Quy trình chi tiết của 7 phòng ban
```

### Cơ chế Cầu nối Bảo mật (Auth Bridge)
Vì Wiki nằm trong thư mục con `/wiki` của Hub, chúng chia sẻ cùng một **Domain Origin**. 
1.  Người dùng đăng nhập tại Hub -> Lưu `vires_token` vào LocalStorage.
2.  Khi truy cập `/wiki`, file `auth-check.js` sẽ kiểm tra token trong LocalStorage.
3.  Nếu không hợp lệ, người dùng bị đẩy về trang login chính.

---

## 4. Feature Map

| Tính năng | Backend Logic | Frontend Logic |
| :--- | :--- | :--- |
| **Hệ thống Auth** | `server.js` (JWT & bcrypt) | `js/auth.js` |
| **Chat & Emoji** | `server.js` (Socket.io) | `js/chat.js` |
| **Quản lý Task** | `/api/tasks` (CRUD) | `js/tasks.js` |
| **Tin tức (News)** | `/api/news` (Multer upload) | `js/news.js` |
| **Danh bạ (Directory)**| `/api/users` | `js/ui.js` |
| **VIRES Wiki** | Static serving | `/wiki/auth-check.js` |
| **Quản trị Admin** | `/api/admin/accounts` | `js/admin.js` |

### Cấu trúc Wiki (7 Phòng ban)
Lưu trữ tại `public/wiki/docs/` với các thư mục chuyên biệt:
- `org-admin`: Tổ chức - Hành chính
- `finance`: Tài chính kế toán
- `ship`: Tàu biển
- `offshore`: Công trình biển
- `design`: Thẩm định thiết kế
- `inland`: Phương tiện thủy nội địa
- `cert`: Chứng nhận hệ thống

---

## 5. Server & Deployment

### Dell Server (LAN)
- **Port:** Mặc định `4000`.
- **Dữ liệu:** File `database.db` cần được backup định kỳ.
- **Cấu hình:** Sử dụng file `.env` cho `JWT_SECRET` và `PORT`.

### Docker (Gợi ý triển khai)
Dùng Docker để đóng gói toàn bộ môi trường Node.js. Lưu ý mount volume cho thư mục `/uploads` và file `database.db` để không mất dữ liệu khi restart container.

---

## 6. Naming & Coding Conventions

### Quy tắc đặt tên (Project-wide)
- **CSS:** Bắt buộc `kebab-case` (`.nav-item`, `.sidebar-item`). Sử dụng biến CSS `--accent-color` thay vì mã màu cứng.
- **JavaScript:** `camelCase` cho biến và hàm. Prefix `load*` cho fetch, `render*` cho DOM update.
- **Database:** `snake_case` cho tên cột (`created_at`, `user_id`).

### Nguyên tắc Phát triển (The "Golden Rules")
1.  **Shared Origin:** Không bao giờ tách Wiki sang port khác để giữ cơ chế SSO đơn giản qua LocalStorage.
2.  **No Placeholders:** Mọi hình ảnh phải được tạo thực tế (dùng tool hoặc upload), không dùng link placeholder.
3.  **Content Security:** Luôn chạy `DOMPurify.sanitize()` cho bất kỳ nội dung `innerHTML` nào đến từ người dùng hoặc Markdown.
4.  **Wiki Content:** File quy trình phải đặt tên không dấu, gạch ngang (slug) để URL Wiki đẹp.

---

*Tài liệu này là "Sách trắng" cho dự án, vui lòng cập nhật mỗi khi có thay đổi kiến trúc lớn.*
