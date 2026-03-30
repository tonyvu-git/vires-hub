/* ══════════════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════════════ */
document.getElementById('to-register').onclick = () => {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
};
document.getElementById('to-login').onclick = () => {
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
};

document.getElementById('btn-login').onclick = async () => {
    const username = document.getElementById('l-username').value.trim();
    const password = document.getElementById('l-password').value;
    if (!username || !password) { alert('Vui lòng nhập đầy đủ thông tin.'); return; }
    try {
        const res  = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        localStorage.setItem('vires_token', data.token);
        localStorage.setItem('vires_user', JSON.stringify(data.user));
        TOKEN = data.token; USER = data.user;
        showApp();
    } catch (e) { alert('Đăng nhập thất bại: ' + e.message); }
};
document.getElementById('l-password').onkeydown = e => { if (e.key === 'Enter') document.getElementById('btn-login').click(); };

document.getElementById('btn-register').onclick = async () => {
    const username   = document.getElementById('r-username').value.trim();
    const password   = document.getElementById('r-password').value;
    const fullname   = document.getElementById('r-fullname').value.trim();
    const department_id = document.getElementById('r-department').value || null;
    if (!username || !password || !fullname) { alert('Vui lòng điền đầy đủ thông tin.'); return; }
    if (password.length < 6) { alert('Mật khẩu phải có ít nhất 6 ký tự.'); return; }
    try {
        const res  = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password, fullname, department_id }) });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        alert('Tạo tài khoản thành công! Vui lòng đăng nhập.');
        document.getElementById('to-login').click();
        ['r-username', 'r-password', 'r-fullname'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('r-department').value = '';
    } catch (e) { alert('Lỗi: ' + e.message); }
};

document.getElementById('btn-logout').onclick = () => {
    localStorage.removeItem('vires_token');
    localStorage.removeItem('vires_user');
    location.reload();
};

