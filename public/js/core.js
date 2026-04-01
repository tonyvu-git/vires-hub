/* ========================================================
   VIRES Hub — App Logic
   Layout: Header | Nav | [Left | Main | Right] | Footer
======================================================== */

// ─── State ────────────────────────────────────────────────
let TOKEN = localStorage.getItem('vires_token');
let USER  = JSON.parse(localStorage.getItem('vires_user') || 'null');
let currentView   = 'dashboard';
let socket;
let currentTheme  = localStorage.getItem('vires_theme') || 'light';
let dmActivePeerId   = null;
let dmActivePeerName = '';
let toastTimer       = null;
let departments      = [];          // cache phòng ban
let allAccounts      = [];          // cache tài khoản (admin)
let editingAccountId = null;        // null = tạo mới, number = sửa
let pendingDeleteId  = null;

// ── Default avatar helper ──────────────────────────────
function getAvatar(u) {
    if (!u) return '/default-avatar.png';
    const av = typeof u === 'string' ? u : u.avatar;
    return av || '/default-avatar.png';
}

// ── Date/Time Format Helpers ─────────────────────────────
function formatDateTime(dateInput, includeSeconds = false) {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const opts = { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' };
    if (includeSeconds) opts.second = '2-digit';
    return d.toLocaleString('vi-VN', opts);
}

function formatDate(dateInput) {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' });
}

function formatTime(dateInput) {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

// ─── Apply theme immediately ─────────────────────────────
applyTheme(currentTheme);

// ─── Auto-login if token exists ──────────────────────────
if (TOKEN && USER) showApp();

