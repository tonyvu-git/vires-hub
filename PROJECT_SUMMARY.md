# 📘 VIRES Hub - Project Technical Summary

**Lưu ý:** Tài liệu này được tự động trích xuất từ source code, phục vụ cho AI system (RAG) và Developer Onboarding.

---

## 1. Overview
- **Mục tiêu hệ thống:** Xây dựng một nền tảng văn phòng nội bộ (Internal Hub) đa chức năng, bảo mật và chạy theo thời gian thực dành cho nhân sự của VIRES.
- **Loại ứng dụng:** Single-Page Application (SPA) lai / Monolithic Web App tích hợp Real-time Websockets.
- **Các use-case chính:**
  - Nhắn tin theo thời gian thực (Chat chung toàn công ty & Tin nhắn riêng DM).
  - Cập nhật thông báo, tin tức nội bộ, tạo Polls (bình chọn).
  - Quản lý công việc cá nhân qua bảng Kanban (Kéo-Thả).
  - Lưu trữ Danh bạ nhân viên chi tiết theo phòng ban.
  - Giải trí nội bộ: Cờ Caro, Bài Ba Lá (có hệ thống Matchmaking).

---

## 2. Tech Stack

Dữ liệu được trích xuất trực tiếp từ `package.json` và cấu trúc dự án.

| Phân loại | Công nghệ / Thư viện | Vai trò |
| :--- | :--- | :--- |
| **Backend Core** | Node.js, Express (v5.2.1) | Xử lý HTTP Server, API Router. |
| **Real-time** | Socket.io (v4.8.3) | Đồng bộ trạng thái, Chat, Game, Notifications. |
| **Database** | SQLite, better-sqlite3 (v12.8.0) | Cơ sở dữ liệu chính, thiết kế light-weight, tích hợp sẵn. |
| **Security/Auth**| jsonwebtoken (v9.0.3), bcryptjs | Mã hóa mật khẩu, tạo phiên đăng nhập (JWT Token). |
| **File & Media** | multer (v2.1.1), sharp (v0.34.5) | Upload file (DM), xử lý/resize avatar ảnh. |
| **Data Parse** | xlsx (v0.18.5) | Công cụ chạy script seed data nhân sự từ Excel. |
| **UI/Frontend** | Vanilla JS, HTML5, CSS3 Variables | Xây dựng giao diện không phụ thuộc framework (React/Vue). |
| **FE Utils** | DOMPurify, Marked.js | (Via CDN) Render Markdown an toàn, chống XSS. |

---

## 3. Architecture

Hệ thống sử dụng kiến trúc **Monolithic Client-Server**, phân tách rõ ràng Frontend (tĩnh) và Backend (API + Websocket).

```mermaid
graph TD
    Client[Client Browser (Vanilla JS/HTML/CSS)]
    Backend[Node.js / Express Server]
    DB[(SQLite: database.db)]
    Storage[Local Disk: /public/uploads]

    Client -- REST API (JSON) --> Backend
    Client -- Socket.io (Events) --> Backend
    Backend -- Read/Write --> DB
    Backend -- Local I/O --> Storage
```

### 📂 Vai trò các thư mục chính:
- **`server.js`**: Entry point của Backend. Khởi tạo Express, cài đặt Multer/Socket, định nghĩa các API routes và toàn bộ Socket.io events.
- **`database.js`**: Định nghĩa Database Schema (Table creation migrations) và khởi tạo kết nối `better-sqlite3`.
- **`public/`**: Thư mục Root của Frontend, chứa `index.html` (SPA main file) và `style.css` (global design tokens).
- **`public/js/`**: Source code JS Frontend, được chia module logic thay vì gộp chung:
  - `core.js`: Utilities cốt lõi (fetch, token).
  - `auth.js`, `ui.js`: Xử lý đăng nhập, quản lý giao diện Modal & Sidebar view switching.
  - `chat.js`: Xử lý Group Chat, DM Chat, File Upload frontend.
  - `tasks.js`: Logic Drag-and-Drop Kanban board.
  - `news.js`, `announcements.js`: Chức năng bảng tin và hiển thị Wiki.
  - `caro.js`, `bala.js`: Client-side logic cho các Minigames.
- **`tools/`**: Chứa các script utility chạy độc lập (VD: `seed_accounts.js` đọc file Excel tạo DB).

---

## 4. Feature Map

Liệt kê các tính năng cốt lõi dựa trên mapping từ source code.

- **Feature: Authentication & Users**
  - *Description:* Đăng nhập, đổi mật khẩu, đổi avatar, phân quyền Admin/User.
  - *API:* `POST /api/login`, `PUT /api/auth/password`, `POST /api/avatar`
  - *Related Files:* `public/js/auth.js`, `server.js` 
- **Feature: Global & Direct Messaging**
  - *Description:* Chat hệ thống và chat cá nhân (DM), hiển thị trạng thái read/unread, search user, thu hồi tin nhắn.
  - *Socket Events:* `send_message`, `dm_send`, `dm_delete_message`, `online_count`
  - *Related Files:* `public/js/chat.js`
- **Feature: DM File Upload**
  - *Description:* Gửi file qua tin nhắn (max 10MB, filter blacklist `.exe`, tự xóa sau 48h).
  - *API:* `POST /api/dm/upload`
  - *Cronjob:* `setInterval` chạy mỗi giờ trong `server.js` dọn file hết hạn.
- **Feature: Kanban Task Management**
  - *Description:* Tạo, xóa và kéo thả tasks cá nhân giữa 3 cột trạng thái.
  - *API:* `GET/POST/PUT/DELETE /api/tasks`
  - *Related Files:* `public/js/tasks.js`
- **Feature: Real-time Minigames**
  - *Description:* Game Cờ Caro (có tính năng Rematch) và Game Bài Ba Lá (Room-based matchmaking).
  - *Socket Events:* `caro_*`, `bala_*`
  - *Related Files:* `public/js/caro.js`, `public/js/bala.js`, Server State queue.

---

## 5. Server & Deployment

Hệ thống được thiết kế cực kỳ nhỏ gọn để dễ dàng deploy on-premise.

- **Cách chạy Local:** 
  ```bash
  npm install
  node server.js
  ```
- **Port:** Mặc định `4000` (Có thể đổi qua biến môi trường `process.env.PORT`).
- **Database:** Tự động gen `database.db` tại root folder nếu chưa có.
- **Lưu ý triển khai mạng LAN / Production:**
  - Cần mở/Forward Port `4000` trên Firewall.
  - Nếu truy cập từ thiết bị ngoài hoặc muốn dùng các tính năng web đặc thù (Clipboards, WebRTC), **bắt buộc cấu hình Reverse Proxy (Nginx) có SSL (HTTPS)**.
  - Backup định kỳ file `database.db` và thư mục `public/uploads/` cùng `public/avatars/`.

---

## 6. Naming Convention & Code Style

Bằng chứng từ quy tắc code thực tế trong source:

- **JS Frontend / Backend Variables**: Sử dụng `camelCase` (VD: `unreadCount`, `dmActivePeerId`).
- **CSS / UI Classes**: Sử dụng `kebab-case`, ưu tiên cấu trúc theo component (VD: `dm-sidebar`, `msg-bubble`, `btn-primary`).
- **Database / SQL / Backend API data**: Sử dụng `snake_case` (VD: `user_id`, `created_at`, `file_path`). Tương tự cho các thuộc tính JSON trả về từ DB qua API.
- **Kiến trúc hàm Frontend**: Ưu tiên mô hình Module ngầm (các hàm global được gọi qua `onclick` từ HTML). DOM manipulation trực tiếp bằng Vanilla JS (`document.getElementById`).
- **Security Logic**: Mọi innerHTML chứa text do user tự nhập đều được bọc qua thư viện `DOMPurify.sanitize()` trước khi render.
