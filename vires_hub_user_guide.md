# Hướng Dẫn Sử Dụng Hệ Thống VIRES Hub
*Cổng thông tin nội bộ đa tiện ích dành cho cán bộ - công nhân viên.*

---

## 1. Truy Cập & Đăng Nhập
Để sử dụng VIRES Hub, người dùng cần có tài khoản do Quản trị viên (Phòng Tổ chức - Hành chính) cung cấp.
1. Mở trình duyệt Web nội bộ và truy cập qua đường link được cấp (VD: `http://localhost:4000` hoặc IP máy chủ công ty).
2. Hệ thống hiển thị hộp thoại đăng nhập có Logo của VIRES.
3. Điền **Tên đăng nhập** (Account) và **Mật khẩu**. 
   *(Mặc định Admin là `admin` / `admin123`)*.
4. Nhấn **Đăng Nhập**.

---

## 2. Bảng Điều Khiển (Trang Chính)
Sau khi đăng nhập thành công, bạn sẽ được đưa tới màn hình Dashboard chia thành 3 phần chính gọn gàng:
- **Cột Trái (Thống kê & Thông báo):** Biểu diễn các con số nhân sự, tin tức của cơ quan. Khu vực dưới cùng là danh sách **Thông báo** cấp tốc từ Ban Giám đốc — người dùng có thể nhấp vào đó để đọc chi tiết các quy định, văn bản.
- **Cột Giữa (Tin Tức Toàn cơ quan):** Khu vực lưới thẻ hình ảnh lớn hiển thị toàn cảnh Tin Tức. Mỗi khi có thẻ mới cập nhật, bạn có thể bấm trực tiếp vào thẻ để mở cửa sổ phóng to.
- **Cột Phải (Trò chuyện Chung):** Một cửa sổ Chat real-time, cho phép tất cả mọi người khi có mặt trực tuyến đều được quyền trao đổi.

---

## 3. Hệ thống Trò Chuyện (Chat)
### 3.1 Chat Chung
- Vị trí: Cột bên phải ngoài Dashboard.
- Nhập thông điệp vào thanh Chat và biểu tượng ✈️ để nói chuyện. Mọi người đều nhìn thấy hộp thoại này theo thời gian thực.

### 3.2 Chat Cá nhân (Tin nhắn riêng / DM)
- Bấm vào mục **Tin nhắn** ở Header hoặc Menu chính để mở giao diện Chat 1-1 riêng tư.
- Khi có ai đó chat riêng, **Huy hiệu màu đỏ** sẽ hiển thị lượng tin bạn chưa đọc kèm theo 1 hộp thoại Popup (Toast thông báo nhỏ) tạch lên để kéo sự chú ý của bạn.
- Bạn có thể vào Danh bạ để liên hệ tin nhắn hoặc trực tiếp gõ tên đồng nghiệp vào ô Chat DM.

---

## 4. Quản lý Danh bạ & Tổ chức
- Truy cập mục **Danh bạ** trên Menu ngang.
- Bạn sẽ thấy lưới thẻ hiện thông tin của mọi đồng nghiệp: Mã Nhân Viên (VIRES ID), Phòng Ban Trực Thuộc, Số Điện Thoại di động và Email (Cá nhân/Công việc). Cấu trúc phản ánh 7 phòng tham mưu chính của VIRES.
- Thanh tìm kiếm bên trên giúp tra cứu số điện thoại siêu nhanh.

---

## 5. Quản lý Nhắc Việc (To-do List)
- Truy cập phần **Công việc** tại Menu trên cùng.
- Nhập từ khoá / Tên đầu việc cần theo dõi và **Ngày đến hạn** (Deadline) muốn thực hiện.
- Ấn nút `+ Thêm công việc`.
- *Tính năng tự động:* Các công việc sắp đến hạn hoặc quá vòng sẽ **chuyển màu chữ cảnh báo đỏ/vàng** giúp bạn giữ tiến độ.

---

## 6. Thiết lập Trang Cá Nhân & Giao Diện
- Ở trên cùng bên phải màn hình có nút **Cài đặt** (hoặc nhấn trực tiếp vào Tên/Mã nhân sự của bạn).
- Một bảng tuỳ chỉnh mở ra với 2 Tab (thẻ):
  1. **Thông tin cá nhân:** Tới đây, bạn ấn nút **"📷 Chọn ảnh"** để upload tấm hình Profile chân dung mới nhất. Bạn tự do điều chỉnh Họ tên, sđt liên lạc và cấp thẩm quyền Email của bản thân mình để hiển thị cho đồng nghiệp xem ở Danh bạ chung. Bấm "Lưu thông tin" sau khi cập nhật.
  2. **Giao diện:** Chọn Chủ đề Trắng (Sáng) hoặc Đen (Tối) tùy theo nhạy cảm mắt lưới của bạn nhé!

---

## 7. Cẩm nang Dành Riêng Cho QUẢN TRỊ VIÊN (Admin)

### 7.1 Đăng Bài Viết (Tin Tức / Thông Báo)
1. Trong màn hình Trang chính / Hoặc Tab "Quản trị", Quản trị viên dùng biểu tượng Nhấn "Tạo tin tức" (hoặc Tạo thông báo).
2. Hệ thống cung cấp **Khung Soạn thảo Markdown màn hình đôi**. Bạn gõ nội dung (bên trái) và mọi hiệu ứng căn lề/tô đậm tự động sẽ sinh thành bản hiển thị thực ở phần **"Xem Trước"** bên phải.
   - Bôi đậm: `**văn bản**`
   - In nghiêng: `*văn bản*`
   - Tạo tiêu đề cấp 1: `# Tiêu đề`
3. Bạn có thể nhấn **Tải File minh hoạ** để đính kèm 1 ảnh nổi bật cho Thông báo hoặc Tin bản này.
4. Bấm **Đăng Ngay**. (Ảnh sẽ được tự động resize/giảm dung lượng bởi hệ thống quản lý ở Node Server - Do đó bạn không cần bận tâm về dung lượng thẻ hình).

### 7.2 Quản lý Nhân sự / User
1. Vào tab **Quản trị / Danh bạ**. Bạn sẽ nhìn thấy biểu tượng Bút Sửa/Xóa bên cạnh mọi nhân sự.
2. Để nhập một cá nhân mới, ấn `Tạo tài khoản`.
3. Điền Tài khoản (Dùng làm ID Đăng nhập), Mật khẩu tuỳ biến (Tạm cấp), Phân cấp quyền (Admin hay Nhân Viên User) và đưa họ vào cấu hình 7 phòng ban Vires.
4. Chọn "Lưu tài khoản". Bạn cũng có thể reset pass hoặc xóa vĩnh viễn user đã nghỉ việc (Dữ liệu chat sẽ được bảo lưu nặc danh).

---
*Mọi thắc mắc kỹ thuật vui lòng báo cáo lỗi về bộ phận Kỹ thuật nội bộ.*
