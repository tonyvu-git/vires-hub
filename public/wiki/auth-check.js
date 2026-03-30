(function() {
    // 1. Kiểm tra Token trong LocalStorage
    // Docsify chạy trên cùng domain nên truy cập được localStorage của Hub
    const token = localStorage.getItem('vires_token');
    const user  = JSON.parse(localStorage.getItem('vires_user') || 'null');

    const authGuard = document.getElementById('auth-guard');

    if (!token || !user) {
        // Nếu không có token, đá về trang login chính kèm tham số redirect cho chuyên nghiệp
        window.location.href = '/index.html?reason=unauth&redirect=wiki';
        return;
    }

    // 2. Nếu có token, ẩn màn hình xác thực và tiếp tục load Docsify
    window.addEventListener('load', () => {
        if (authGuard) {
            authGuard.style.opacity = '0';
            setTimeout(() => authGuard.classList.add('hidden'), 300);
        }
    });

    // 3. Optional: Gắn tên người dùng vào tiêu đề hoặc log
    console.log(`🔒 Wiki Authenticated: ${user.fullname} (${user.role})`);

})();
