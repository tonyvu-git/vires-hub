# Tài Liệu Đặc Tả Yêu Cầu Sản Phẩm (PRD)
**Dự án:** VIRES Hub — Cổng Thông Tin Nội Bộ
**Khách hàng / Tổ chức:** Trung Tâm Đăng Kiểm Phương Tiện Thủy và Công Trình Biển (VIRES)
**Trạng thái:** Hoàn tất (V1.0)

---

## 1. Mục tiêu dự án (Project Target)
Xây dựng một Cổng thông tin nội bộ (Intranet Hub) giúp hiện đại hóa không gian làm việc số cho đội ngũ cán bộ, kỹ sư và nhân viên của VIRES. Nền tảng này đóng vai trò là một "trung tâm (hub)" tiếp nhận và trao đổi:
- **Thông tin một chiều:** Phổ biến tin tức chung, thông báo nội bộ từ Ban Giám đốc và bộ phận Hành chính.
- **Tương tác hai chiều:** Trò chuyện trực tuyến (Real-time chat) theo cả hình thức nhóm chung và đàm thoại cá nhân (DM).
- **Quản lý cá nhân:** Tra cứu danh bạ (dựa trên sơ đồ tổ chức), theo dõi công việc cá nhân.
- **Trải nghiệm UX/UI chuyên nghiệp:** Đạt độ thẩm mỹ cao, giao diện tối/sáng linh hoạt (Dark/Light mode).

## 2. Đối tượng Người dùng (User Personas)
Dự án phục vụ 2 nhóm người dùng chính được phân quyền rõ rệt:
1. **Quản trị viên (Admin):**
   - Ban giám đốc, hoặc nhân sự phòng Tổ chức - Hành chính.
   - Có toàn quyền quản lý hệ thống: Thêm mới, chỉnh sửa, xóa tin tức, thông báo, tài khoản.
   - Quản trị tài khoản của toàn bộ nhân viên (Tạo account, cấp quyền, cấu hình nhân sự).
2. **Nhân viên (User):**
   - Kỹ sư, nhân sự thuộc 7 phòng chuyên môn tham mưu của VIRES.
   - Có thể đọc tin tức/thông báo, xem danh bạ chung, chat với đồng nghiệp, tự quản lý todolist và chỉnh sửa ảnh đại diện/thông tin liên hệ của chính mình.

## 3. Danh sách Tính năng Chính (Features list)

### 3.1. Phân hệ Quản trị Mạng nội bộ (Trang chính - Dashboard)
- **Hiển thị Tin tức (News):** Trình bày trực quan dưới dạng thẻ (cards) lưới (grid). Hỗ trợ ảnh thumbnail, tiêu đề và tóm tắt. Click để mở chế độ đọc toàn màn hình với thanh cuộn (Reader Modal).
- **Thông báo (Announcements):** Widget Danh sách thông báo ngắn gọn nằm dọc bên trái, hỗ trợ người xem tra cứu nhanh các quyết định, chỉ đạo.
- **Thống kê (Stats):** Hiển thị các chỉ số sống động (Tổng số nhân sự, Tổng số tin bài...).

### 3.2. Quản lý Tin tức & Thông báo (Dành cho Admin)
- **Trình soạn thảo Markdown chuyên nghiệp:** Cho phép viết nội dung dưới dạng Markdown, có hỗ trợ giao diện xem trước song song thời gian thực (Split-view Live Preview).
- **Đính kèm hình ảnh:** Cho phép Admin tải tệp hình ảnh trực tiếp từ máy (sử dụng Multer trên Node.js), tự động phân giải lên máy chủ cục bộ.
- **Xóa & Tự dọn dẹp:** Khi xóa bài viết, hệ thống tự động nhận diện và xóa luôn ảnh vật lý khỏi máy chủ để tiết kiệm dung lượng.

### 3.3. Hệ thống Giao tiếp (Chat & DM)
- Bản chất thời gian thực (Real-time) sử dụng công nghệ WebSockets (`Socket.io`).
- **Chat Chung:** Phòng chat thảo luận mở cho toàn cơ quan hiện luôn trên phần bên phải của Dashboard.
- **Chat Cá nhân (DM - Direct Messages):** Nhắn tin riêng tư 1-1. Tích hợp huy hiệu đếm (Badge) lượng tin nhắn chưa đọc màu đỏ nổi bật. Cảnh báo hiển thị Popup ngay khi có tin nhắn mới (khi người dùng đang không mở hộp thoại). 

### 3.4. Danh bạ & Cơ cấu Tổ chức (Directory)
- Quản lý danh bạ tất cả các thành viên theo chuẩn sơ đồ cơ cấu VIRES hiện hành bao gồm:
  1. Phòng Tổ chức - Hành chính
  2. Phòng Tài chính kế toán
  3. Phòng Tàu biển (SSD)
  4. Phòng Công trình biển (OGD)
  5. Phòng Thẩm định thiết kế (RPA)
  6. Phòng Phương tiện thủy nội địa (IWD)
  7. Phòng Quản lý công tác đăng kiểm (QMD)
- Hỗ trợ xem thông tin liên lạc chi tiết cho mọi User: Họ Tên, VIRES ID (Mã NV), Số ĐTDĐ, Email công việc, Email cá nhân.
- Cơ chế tìm kiếm nhanh tài khoản linh hoạt bằng bộ lọc Tên.

### 3.5. Nhắc việc (Task Management)
- Tích hợp To-do list cá nhân thuần tuý cho mỗi tài khoản, cho phép nhập ngày đến hạn (Deadline).
- Tự động thay đổi màu sắc dòng thời gian biểu để cảnh báo nếu công việc đã bị trễ hạn.

### 3.6. Thông tin cá nhân & Thiết lập
- Cho phép User tự thay ảnh đại diện thật (Server tự động resize cắt về dạng ảnh thẻ `100x100px` bằng thư viện Sharp để tối ưu load chung).
- Đổi giao diện Hệ thống: Chế độ Sáng màu (Light theme) và Tối màu (Dark mode theme), tự động lưu giữ cài đặt bằng `localStorage`.

## 4. Công nghệ triển khai (Tech Stack)
Hệ thống là một Ứng dụng Web đơn thẻ (SPA) không đòi hỏi Cloud hay DevOps phức tạp, dễ dàng duy trì nội bộ:
- **Frontend Core:** HTML5, CSS3 tĩnh (không phụ thuộc Tailwind), JavaScript thuần (Vanilla JS).
- **Thư viện tích hợp FE:** `Marked.js` (phân giải Markdown), `DOMPurify` (bảo vệ chống mã độc hại XSS attack).
- **Backend:** Runtime Node.js kết hợp Web framework `Express.js`.
- **Giao tiếp Realtime:** Dùng `Socket.io`.
- **Xử lý tệp (Upload):** Backend dùng library `multer` và thư viện xử lý resize ảnh tĩnh `sharp`.
- **Cơ sở dữ liệu:** Hệ quản trị cục bộ siêu nhẹ `SQLite` (Lưu trữ tập trung bằng 1 tệp `database.db` duy nhất, cho phép Backup cực kỳ an toàn chỉ với 1 cú click copy).
- **Bảo mật (Auth):** Dữ liệu mã thông báo `JWT` để duyệt Session truy cập.

---
*Tài liệu PRD này sẽ là gốc để phân tích hệ thống sau này nếu muốn mở rộng thêm quy mô.*
