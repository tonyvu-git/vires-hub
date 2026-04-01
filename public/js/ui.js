/* ══════════════════════════════════════════════════════
   APP INIT
══════════════════════════════════════════════════════ */
function showApp() {
    document.getElementById('auth-overlay').classList.remove('active');
    document.getElementById('app-container').classList.remove('hidden');

    const avatarSrc = getAvatar(USER);
    document.getElementById('user-fullname').textContent = USER.fullname;
    const ROLE_LABELS = { admin: 'Quản trị viên', director: 'Giám đốc', deputy_director: 'Phó Giám đốc', dept_head: 'Trưởng phòng', deputy_dept_head: 'Phó trưởng phòng', user: 'Nhân viên' };
    document.getElementById('user-role').textContent = ROLE_LABELS[USER.role] || 'Nhân viên';
    const hdrAv = document.getElementById('user-avatar');
    hdrAv.src = avatarSrc;
    hdrAv.onerror = () => { hdrAv.src = '/default-avatar.png'; };

    const settingsPreview = document.getElementById('settings-avatar-preview');
    if (settingsPreview) {
        settingsPreview.src = avatarSrc;
        settingsPreview.onerror = () => { settingsPreview.src = '/default-avatar.png'; };
    }

    // Logo click → về trang chủ
    const brandEl = document.getElementById('hdr-brand-home');
    if (brandEl && !brandEl._clickBound) {
        brandEl._clickBound = true;
        brandEl.addEventListener('click', () => switchView('dashboard'));
    }

    if (USER.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
        
        // Allow admin to click THÔNG BÁO header manage btn
        const btnManageAnn = document.getElementById('btn-manage-announcements');
        if (btnManageAnn) btnManageAnn.classList.remove('hidden');
    }

    startClock();
    initSocket();
    loadDashboard();
    loadWidgetTasks();
    loadWidgetMembers();
}

async function loadDepartments() {
    try {
        const res = await fetch('/api/departments');
        departments = await res.json();
        populateDeptSelects();
    } catch (e) {}
}

function populateDeptSelects() {
    const opts = departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    const selects = ['r-department', 'pf-department', 'af-department', 'admin-filter-dept'];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const isFilter = id === 'admin-filter-dept';
        const defaultOpt = isFilter ? '<option value="">Tất cả các phòng</option>' : '<option value="">-- Chọn phòng ban --</option>';
        el.innerHTML = defaultOpt + opts;
    });
}


/* ══════════════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════════════ */
function switchView(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    document.getElementById(`view-${view}`)?.classList.add('active');
    document.querySelector(`[data-view="${view}"]`)?.classList.add('active');

    const titles = {
        dashboard: 'Trang chính',
        dm:        'Tin nhắn',
        tasks:     'Công việc & Deadline',
        directory: 'Danh bạ nội bộ',
        admin:     'Quản trị tài khoản'
    };

    const title = titles[view] || view;
    document.getElementById('footer-view').textContent = title;
    currentView = view;

    if (view === 'dashboard') loadDashboard();
    if (view === 'tasks')     loadTasks();
    if (view === 'directory') loadDirectory();
    if (view === 'dm')        loadDMConversations();
    if (view === 'admin')     loadAdminAccounts();
}

document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.onclick = e => { e.preventDefault(); switchView(item.dataset.view); };
});

document.getElementById('go-tasks').onclick = () => switchView('tasks');

if (document.getElementById('btn-toggle-chat')) {
    document.getElementById('btn-toggle-chat').addEventListener('click', () => {
        document.body.classList.toggle('chat-expanded');
    });
}


/* ══════════════════════════════════════════════════════
   THEME
══════════════════════════════════════════════════════ */
function applyTheme(theme) {
    document.body.className = `theme-${theme}`;
    currentTheme = theme;
    localStorage.setItem('vires_theme', theme);
    document.getElementById('btn-theme-light')?.classList.toggle('active', theme === 'light');
    document.getElementById('btn-theme-dark')?.classList.toggle('active', theme === 'dark');
}
document.getElementById('btn-theme-light').onclick = () => applyTheme('light');
document.getElementById('btn-theme-dark').onclick  = () => applyTheme('dark');


/* ══════════════════════════════════════════════════════
   SETTINGS MODAL (tabbed)
══════════════════════════════════════════════════ */
function openSettings(tab = 'profile') {
    // Fill profile form
    document.getElementById('pf-fullname').value       = USER.fullname || '';
    document.getElementById('pf-vires-id').value       = USER.vires_id || '';
    document.getElementById('pf-phone').value          = USER.phone || '';
    document.getElementById('pf-email-work').value     = USER.email_work || '';
    document.getElementById('pf-email-personal').value = USER.email_personal || '';
    document.getElementById('pf-department').value     = USER.department_id || '';

    const src = getAvatar(USER);
    const settingsAv = document.getElementById('settings-avatar-preview');
    settingsAv.src = src;
    settingsAv.onerror = () => { settingsAv.src = '/default-avatar.png'; };
    document.getElementById('avatar-upload-status').textContent = '';

    switchSettingsTab(tab);
    document.getElementById('settings-modal').classList.add('open');
}
function closeSettings() { document.getElementById('settings-modal').classList.remove('open'); }

function switchSettingsTab(tab) {
    ['profile', 'appearance', 'security'].forEach(t => {
        document.getElementById(`stab-${t}`).classList.toggle('active', t === tab);
        document.getElementById(`stab-${t}-panel`).classList.toggle('hidden', t !== tab);
    });
}
document.getElementById('stab-profile').onclick    = () => switchSettingsTab('profile');
document.getElementById('stab-appearance').onclick = () => switchSettingsTab('appearance');
document.getElementById('stab-security').onclick   = () => switchSettingsTab('security');

document.getElementById('btn-settings').onclick        = () => openSettings();
document.getElementById('btn-settings-close').onclick  = closeSettings;
document.getElementById('btn-settings-close2').onclick = closeSettings;
document.getElementById('btn-settings-close3').onclick = closeSettings;
document.getElementById('btn-appearance-close').onclick = closeSettings;
document.getElementById('settings-modal').onclick = e => { if (e.target === e.currentTarget) closeSettings(); };

// Save profile
document.getElementById('btn-save-profile').onclick = async () => {
    const body = {
        fullname:       document.getElementById('pf-fullname').value.trim(),
        vires_id:       document.getElementById('pf-vires-id').value.trim() || null,
        phone:          document.getElementById('pf-phone').value.trim() || null,
        email_work:     document.getElementById('pf-email-work').value.trim() || null,
        email_personal: document.getElementById('pf-email-personal').value.trim() || null,
        department_id:  document.getElementById('pf-department').value || null,
    };
    if (!body.fullname) { alert('Họ và Tên không được để trống.'); return; }
    const btn = document.getElementById('btn-save-profile');
    btn.textContent = 'Đang lưu...'; btn.disabled = true;
    try {
        const res  = await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` }, body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        // Update local USER state
        Object.assign(USER, data.user);
        localStorage.setItem('vires_user', JSON.stringify(USER));
        document.getElementById('user-fullname').textContent = USER.fullname;
        const dept = departments.find(d => d.id === USER.department_id);
        btn.textContent = '✅ Đã lưu!';
        setTimeout(() => { btn.textContent = '💾 Lưu thông tin'; btn.disabled = false; }, 2000);

        // Refresh members widget
        allUsers = [];
        loadWidgetMembers();
    } catch (err) {
        btn.textContent = '💾 Lưu thông tin'; btn.disabled = false;
        alert('Lỗi: ' + err.message);
    }
};

// Avatar upload
document.getElementById('settings-avatar-file').onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    const status  = document.getElementById('avatar-upload-status');
    const preview = document.getElementById('settings-avatar-preview');
    status.textContent = 'Đang tải lên...';
    status.className   = 'upload-status';
    const reader = new FileReader();
    reader.onload = ev => { preview.src = ev.target.result; };
    reader.readAsDataURL(file);
    const formData = new FormData();
    formData.append('avatar', file);
    try {
        const res  = await fetch('/api/avatar', { method: 'POST', headers: { 'Authorization': `Bearer ${TOKEN}` }, body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        USER.avatar = data.avatar;
        localStorage.setItem('vires_user', JSON.stringify(USER));
        document.getElementById('user-avatar').src = data.avatar;
        preview.src = data.avatar;
        status.textContent = '✅ Cập nhật ảnh thành công!';
        status.className   = 'upload-status success';
    } catch (err) {
        status.textContent = '❌ Lỗi: ' + err.message;
        status.className   = 'upload-status error';
    }
};

// Change password
document.getElementById('btn-change-password').onclick = async () => {
    const oldPassword = document.getElementById('pf-password-old').value;
    const newPassword = document.getElementById('pf-password-new').value;
    const confirmPassword = document.getElementById('pf-password-confirm').value;
    const status = document.getElementById('password-status');

    if (!oldPassword || !newPassword || !confirmPassword) {
        status.textContent = '❌ Vui lòng điền đầy đủ các trường';
        status.className = 'upload-status error';
        return;
    }

    if (newPassword !== confirmPassword) {
        status.textContent = '❌ Mật khẩu mới không khớp';
        status.className = 'upload-status error';
        return;
    }

    if (newPassword.length < 6) {
        status.textContent = '❌ Mật khẩu phải có ít nhất 6 ký tự';
        status.className = 'upload-status error';
        return;
    }

    const btn = document.getElementById('btn-change-password');
    btn.disabled = true;
    btn.textContent = 'Đang xử lý...';
    status.textContent = '';

    try {
        const res = await fetch('/api/profile/password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            },
            body: JSON.stringify({ oldPassword, newPassword })
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error);

        status.textContent = '✅ Đổi mật khẩu thành công!';
        status.className = 'upload-status success';
        
        // Clear fields
        document.getElementById('pf-password-old').value = '';
        document.getElementById('pf-password-new').value = '';
        document.getElementById('pf-password-confirm').value = '';
        
        setTimeout(() => {
            status.textContent = '';
        }, 3000);
    } catch (err) {
        status.textContent = '❌ ' + err.message;
        status.className = 'upload-status error';
    } finally {
        btn.disabled = false;
        btn.textContent = '🔐 Cập nhật mật khẩu';
    }
};


/* ══════════════════════════════════════════════════════
   DIRECTORY + MEMBERS WIDGET
══════════════════════════════════════════════════════ */
let allUsers = [];

async function loadDirectory() {
    try {
        if (!allUsers.length) {
            const res = await fetch('/api/users', { headers: { 'Authorization': `Bearer ${TOKEN}` } });
            allUsers  = await res.json();
            updateStats(allUsers.length);
        }
        renderDirectory(allUsers);
    } catch (e) {}
}


function getRoleBadgeInfo(role) {
    const roles = {
        admin: { label: '👑 Quản trị viên', cls: 'role-admin' },
        director: { label: '💼 Giám đốc', cls: 'role-director' },
        deputy_director: { label: '💼 Phó Giám đốc', cls: 'role-director' },
        dept_head: { label: '👔 Trưởng phòng', cls: 'role-manager' },
        deputy_dept_head: { label: '👔 Phó trưởng phòng', cls: 'role-manager' },
        user: { label: '👤 Nhân viên', cls: 'role-user' }
    };
    return roles[role] || roles.user;
}

function renderDirectory(users) {
    const grid = document.getElementById('directory-list');
    grid.innerHTML = users.map(u => {
        const avatarSrc = getAvatar(u);
        const isSelf    = u.id === USER.id;
        const roleInfo  = getRoleBadgeInfo(u.role);

        const contacts = [];
        if (u.department_name) contacts.push('<span class="dir-contact-item">🏢 ' + u.department_name + '</span>');
        if (u.phone)           contacts.push('<span class="dir-contact-item">📞 ' + u.phone + '</span>');
        if (u.email_work)      contacts.push('<span class="dir-contact-item">✉️ <a href="mailto:' + u.email_work + '">' + u.email_work + '</a></span>');

        const dmBtn = !isSelf
            ? '<button class="btn btn-primary btn-sm" onclick="openDMWith(' + u.id + ', \'' + u.fullname.replace(/'/g, "\\'") + '\')">💬 Gửi Tin nhắn</button>'
            : '<span class="dir-self-label">Hồ sơ của bạn</span>';

        return '<div class="directory-card">' +
            '<div class="dir-card-top">' +
                '<img src="' + avatarSrc + '" alt="' + u.fullname + '" class="dir-card-avatar" onerror="this.src=\'/default-avatar.png\'">' +
                '<div class="dir-card-info">' +
                    '<div class="dir-card-name">' + u.fullname + '</div>' +
                    '<span class="role-badge ' + roleInfo.cls + '">' + roleInfo.label + '</span>' +
                    '<div class="dir-card-contacts">' + contacts.join('') + '</div>' +
                '</div>' +
            '</div>' +
            '<div class="dir-card-footer">' + dmBtn + '</div>' +
        '</div>';
    }).join('');
}

async function loadWidgetMembers() {
    try {
        const res  = await fetch('/api/users', { headers: { 'Authorization': `Bearer ${TOKEN}` } });
        allUsers   = await res.json();
        updateStats(allUsers.length);
        const widget = document.getElementById('widget-members');
        widget.innerHTML = allUsers.map(u => {
            const avatarSrc = getAvatar(u);
            const isSelf    = u.id === USER.id;
            return `<div class="member-item" onclick="${isSelf ? 'openSettings()' : `openDMWith(${u.id}, '${u.fullname.replace(/'/g, "\\'")}')`}">
                <img src="${avatarSrc}" alt="${u.fullname}">
                <div>
                    <div class="member-item-name">${u.fullname}${isSelf ? ' <small>(Tôi)</small>' : ''}</div>
                    <div class="member-item-role">${getRoleBadgeInfo(u.role).label}</div>
                </div>
            </div>`;
        }).join('');
    } catch (e) {}
}

function updateStats(userCount) {
    const el = document.getElementById('stat-users');
    if (el) el.textContent = userCount;
    // Refresh news count from allNews cache if available
    const statNews = document.getElementById('stat-news');
    if (statNews && allNews.length > 0) statNews.textContent = allNews.length;
}

// Directory search
document.getElementById('dir-search').addEventListener('input', e => {
    const q     = e.target.value.toLowerCase();
    const users = allUsers.filter(u => 
        u.fullname.toLowerCase().includes(q) || 
        u.username.toLowerCase().includes(q) || 
        (u.phone && u.phone.includes(q)) || 
        (u.email_work && u.email_work.toLowerCase().includes(q)) || 
        (u.department_name && u.department_name.toLowerCase().includes(q)) ||
        (u.department_short && u.department_short.toLowerCase().includes(q))
    );
    renderDirectory(users);
});


/* ══════════════════════════════════════════════════════
   UNREAD BADGE
══════════════════════════════════════════════════════ */
function updateDMBadge(count) {
    const badge = document.getElementById('nav-dm-badge');
    if (!badge) return;
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}


/* ══════════════════════════════════════════════════════
   TOAST NOTIFICATION
══════════════════════════════════════════════════════ */
function showDMToast(data) {
    const toast  = document.getElementById('dm-toast');
    const src    = getAvatar(allUsers.find(u => u.id === data.from_id));
    document.getElementById('dm-toast-name').textContent = data.from_name;
    document.getElementById('dm-toast-msg').textContent  = data.content;
    document.getElementById('dm-toast-img').src          = src;

    toast.classList.remove('hidden', 'hiding');
    toast.onclick = () => { openDMWith(data.from_id, data.from_name); hideToast(); };

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 4000);
}
function hideToast() {
    const toast = document.getElementById('dm-toast');
    toast.classList.add('hiding');
    setTimeout(() => toast.classList.add('hidden'), 300);
}


/* ══════════════════════════════════════════════════════
   CLOCK & CALENDAR
══════════════════════════════════════════════════════ */
function startClock() {
    function tick() {
        const now = new Date();
        document.getElementById('clock').textContent = formatTime(now);
        document.getElementById('date-display').textContent = now.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    tick();
    setInterval(tick, 1000);
}

let calCurrentDate = new Date();

function renderCalendar(date) {
    const month = date.getMonth();
    const year = date.getFullYear();
    const today = new Date();
    
    // Set Header Title
    document.getElementById('cal-month-year').textContent = `Tháng ${month + 1}, ${year}`;
    
    // Calculate days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    // Adjust first day to start on Monday (0=Sun, 1=Mon ... 6=Sat)
    let startOffset = firstDay === 0 ? 6 : firstDay - 1;
    
    const grid = document.getElementById('cal-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    // Previous Month Days
    for (let i = startOffset - 1; i >= 0; i--) {
        const d = document.createElement('div');
        d.className = 'cal-day other-month';
        d.textContent = daysInPrevMonth - i;
        grid.appendChild(d);
    }
    
    // Current Month Days
    for (let i = 1; i <= daysInMonth; i++) {
        const d = document.createElement('div');
        d.className = 'cal-day';
        if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            d.classList.add('today');
        }
        d.textContent = i;
        grid.appendChild(d);
    }
    
    // Next Month Days (fill grid to complete rows)
    const totalCells = startOffset + daysInMonth;
    const paddingCells = totalCells <= 35 ? 35 - totalCells : 42 - totalCells;
    for (let i = 1; i <= paddingCells; i++) {
        const d = document.createElement('div');
        d.className = 'cal-day other-month empty';
        d.textContent = i;
        grid.appendChild(d);
    }
}

function initCalendar() {
    const popup = document.getElementById('calendar-popup');
    const trigger = document.getElementById('hdr-clock-area');
    
    if (!trigger || !popup) return;
    
    trigger.addEventListener('click', (e) => {
        // Prevent click if clicking inside the calendar itself
        if (popup.contains(e.target)) return;
        
        const isHidden = popup.classList.contains('hidden');
        if (isHidden) {
            calCurrentDate = new Date(); // Xoay về hôm nay khi mở
            renderCalendar(calCurrentDate);
            popup.classList.remove('hidden');
            // Small timeout to allow element to render before adding transition class
            setTimeout(() => popup.classList.add('show'), 10);
        } else {
            popup.classList.remove('show');
            setTimeout(() => popup.classList.add('hidden'), 200);
        }
    });
    
    // Nhấp bên ngoài để đóng
    document.addEventListener('click', (e) => {
        if (!trigger.contains(e.target) && !popup.contains(e.target)) {
            if (popup.classList.contains('show')) {
                popup.classList.remove('show');
                setTimeout(() => popup.classList.add('hidden'), 200);
            }
        }
    });
    
    // Điều hướng tháng
    document.getElementById('btn-cal-prev').addEventListener('click', (e) => {
        e.stopPropagation();
        calCurrentDate.setMonth(calCurrentDate.getMonth() - 1);
        renderCalendar(calCurrentDate);
    });
    document.getElementById('btn-cal-next').addEventListener('click', (e) => {
        e.stopPropagation();
        calCurrentDate.setMonth(calCurrentDate.getMonth() + 1);
        renderCalendar(calCurrentDate);
    });
    document.getElementById('btn-cal-today').addEventListener('click', (e) => {
        e.stopPropagation();
        calCurrentDate = new Date();
        renderCalendar(calCurrentDate);
    });
}

// ─── Global Initializations ────────────────────────────────
loadDepartments();
initCalendar();

