# 📄 Tài Liệu Đặc Tả Yêu Cầu Sản Phẩm (PRD)
**Sản phẩm:** VIRES Hub  
**Phiên bản:** 1.0.0  

---

## 1. Tổng quan & Mục tiêu sản phẩm (Vision & Goals)
**VIRES Hub** là một nền tảng văn phòng nội bộ ảo (Internal Hub) đa chức năng, được xây dựng riêng biệt cho nhân sự của Cục Đăng kiểm (hoặc phòng ban VIRES). 
Mục tiêu cốt lõi của sản phẩm là:
- **Tập trung hóa:** Đưa toàn bộ các công cụ liên lạc và tiện ích nhỏ hằng ngày (Thông báo, Theo dõi công việc, Biểu quyết) vào một nơi duy nhất.
- **Bảo mật & Nội bộ:** Ngăn chặn việc rò rỉ thông tin ra các nền tảng chat công cộng (Zalo, Messenger) bằng cách tự host hoàn toàn bộ dữ liệu nội bộ.
- **Tăng tính gắn kết:** Cung cấp tính năng giải trí Real-time ngắn hạn (Caro, Bài Ba Lá) cho giờ nghỉ giải lao, kết nối đồng nghiệp đa phòng ban.

## 2. Đối tượng sử dụng (Target Audience)
- **Nhân sự (User):** Cán bộ, nhân viên tại các đơn vị (P. Tổng hợp, P. Kế toán, Ban Giám Đốc...).
- **Quản trị viên (Admin):** Ban Giám đốc hoặc nhân sự bộ phận IT chuyên trách vận hành, có quyền reset hệ thống và thông báo diện rộng.

## 3. Chức năng hệ thống (Functional Requirements)

### 3.1. Hệ thống Tài khoản & Định danh
- Nhân sự không tự đăng ký tài khoản. Tài khoản được cấp sẵn theo danh sách Excel tự động.
- **Username Pattern:** Tên + Các chữ cái đầu của phần còn lại viết thường, không dấu (VD: _Vũ Tùng Linh -> linhvt_).
- Phân quyền (Roles): `admin`, `manager`, `user`.

### 3.2. Không gian Liên lạc (Communication)
#### A. Chat chung Toàn Công ty (Global Chat)
- Tất cả nhân sự trong hệ thống đều vào chung một không gian chat.
- Tin nhắn gửi theo thời gian thực nhờ công nghệ Socket.io.
- **Tính năng mở rộng:**
  - `Thu hồi tin nhắn`: Người gửi có quyền thu hồi tin nhắn của chính mình.
  - `Reaction`: Thả cảm xúc (👍, ❤️, 😂...) lên tin nhắn.
  - `Admin Control`: Quản trị viên có nút [Clear Chat] xóa sạch tin nhắn cũ và [Bật/Tắt Chat] để biến phòng chat thành kênh Thông báo một chiều.

#### B. Tin nhắn riêng tư (Direct Messaging)
- Giao tiếp 1-1 riêng biệt, bảo mật tuyệt đối.
- Có ô tìm kiếm (Search) theo tên nhân viên để bắt đầu chat.
- **Gửi File (File Sharing):**
  - Cho phép người dùng gửi File đính kèm qua DM. Giới hạn **10MB / file**.
  - **Security Filter:** Chặn chặt chẽ các file khả nghi `(.exe, .bat, .cmd, .vbs, .dll,...)`.
  - **Tự động hủy (Auto-delete):** Nhằm tiết kiệm dung lượng phía Server, tất cả File DM sẽ tự động bị xóa khỏi ổ cứng sau **48 giờ**. Lời nhắn thông báo file hết hạn sẽ thay thế file gốc.
- **Cảnh báo (Badges):** Hiển thị số lượng tin nhắn chưa đọc màu đỏ ngay trên Header menu và trên từng cuộc hội thoại ở Sidebar.

### 3.3. Không gian Làm việc & Tiện ích
#### A. Quản lý Công việc Cá nhân (Kanban Tasks)
- Board chia 3 cột: `Chờ xử lý`, `Đang làm`, `Hoàn thành`.
- Giao diện Kéo-Thả (Drag & Drop) mượt mà để thay đổi trạng thái thẻ công việc.
- Hỗ trợ nhập nội dung và chọn Deadline (hạn chót).
- User tự xóa công việc của mình khi không còn cần thiết.

#### B. Bảng tin (News & Announcements)
- Đăng tải các bài viết chuyên sâu có hỗ trợ bộ gõ Markdown rendering (In đậm, In nghiêng, Link, Sơ đồ...).
- Hỗ trợ hiển thị ảnh đính kèm minh họa thông báo.
- Cho phép Admin xóa bỏ các bản tin lỗi thời.

#### C. Lấy ý kiến biểu quyết (Polls System)
- Tạo một câu hỏi khảo sát nhanh với tùy ý số lượng Option (ví dụ: Trưa nay đi ăn ở đâu?).
- Có giới hạn thời gian tự đóng bình chọn.
- Biểu đồ Bar-chart hiển thị Phần trăm (%) số phiếu của từng lựa chọn thay đổi thời gian thực mỗi khi có người vote.

#### D. Danh bạ điện tử (Directory)
- Dạng thẻ (Grid view) chứa thông tin của hơn 60+ thành viên theo từng phòng ban và Avatar tùy biến cá nhân.

### 3.4. Không gian Giải trí Thời gian thực (Entertainment)
Hệ thống có một Sidebar chuyên phục vụ Gaming, giải toả stress giờ nghỉ.
- **Cờ Caro (1vs1 Tic-Tac-Toe):**
  - Có hàng chờ (Queue) để bắt cặp với người khác.
  - Đánh cờ thời gian thực với luật chuẩn, nhận diện thắng thua báo ngay lập tức.
  - Nút biểu quyết [Ván mới] (Rematch) giữ nguyên phòng chơi nếu 2 bên đồng ý.
- **Bài Ba Lá (3-Card):**
  - Chơi luật tính điểm cộng thẻ dồn Mod 10 kiểu truyền thống.
  - Engine bài ngẫu nhiên 52 lá sinh ra trên server. 
  - Animation người chơi tự nhấn để "Lật bài" từ từ giúp tạo sự kịch tính. Sau khi đủ 3 lá lật, biểu diễn kết quả phân định So Điểm phân Thắng/Bại.

### 3.5. Hệ thống thống kê (Footer Stats)
- Thống kê trực tiếp tại cuối trang Dashboard 2 thông số:
  - **Online:** Chỉ số Realtime cho biết chính xác bao nhiêu tab/thiết bị đang cắm rễ trên hệ thống lúc này.
  - **Lượt truy cập:** Số đếm tăng theo thời gian thực phản ánh sức tương tác chung của dự án qua thời gian.

---

## 4. Yêu cầu Phi chức năng (Non-Functional Requirements)

1. **Bảo mật Nội dung (Security & Sanitation):**
   - Không cho phép gõ trực tiếp thẻ HTML trong nội dung chat để phòng ngừa XSS Injection. Thư viện `DOMPurify` được dùng để lọc và khử mã độc.
   - Hash mật khẩu băm 1 chiều trong Database (không lưu cleartext password).
2. **Hiệu suất & Giao thức (Performance):**
   - Đảm bảo app hoạt động mà **KHÔNG CẦN F5 (Refresh)** trang. Từ việc nhận tin nhắn, chuyển giao diện, bình chọn, hay lật bài... đều thông qua `WebSocket` siêu tốc.
   - Ảnh Tải lên hoặc Avatar không tồn tại sẽ mượt mà Fallback sang ảnh SVG `< 1KB` để triệt tiêu độ trễ tải trang.
3. **Responsive Design (Tính thích ứng):**
   - UI/UX được thiết kế cấu trúc CSS `Flexbox` và `Grid` kết hợp phong cách Glassmorphism.
   - Tương thích trải nghiệm màn hình máy tính truyền thống và màn hình nhỏ.

---

## 5. Tầm nhìn Tương lai (Roadmap)
Để biến hệ thống thành một siêu ứng dụng của Cục, các giai đoạn sau có thể nghiên cứu phát triển:
- [ ] (Phase 2) Tích hợp Hệ thống Quản trị Tài liệu / Trình ký số liên thông thẳng sang cơ sở dữ liệu quốc gia.
- [ ] (Phase 2) Ứng dụng AI Chatbot nội bộ đóng vai trò là "Thư ký số tìm kiếm bộ luật".
- [ ] (Phase 3) Call Video nội bộ (sử dụng tín hiệu WebRTC qua SSL/HTTPS P2P).
- [ ] (Phase 3) Tích hợp thông báo qua Zalo ZNS / SMS tự động nhắc việc cho nhân sự.
