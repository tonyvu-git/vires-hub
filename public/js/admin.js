/* ══════════════════════════════════════════════════════
   ADMIN — ACCOUNT MANAGEMENT
══════════════════════════════════════════════════════ */
async function loadAdminAccounts() {
    try {
        const res = await fetch('/api/admin/accounts', { headers: { 'Authorization': `Bearer ${TOKEN}` } });
        allAccounts = await res.json();
        renderAccounts(allAccounts);
    } catch (e) { console.error('loadAdminAccounts', e); }
}

function renderAccounts(accounts) {
    const tbody = document.getElementById('accounts-tbody');
    const empty = document.getElementById('accounts-empty');
    if (!accounts.length) { tbody.innerHTML = ''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    tbody.innerHTML = accounts.map(u => {
        const avatar = getAvatar(u);
        const deptHtml = u.department_short
            ? `<span class="acc-dept-badge">${u.department_short}</span>`
            : `<span style="color:var(--text-muted);font-size:0.75rem">—</span>`;
        const contact = [u.phone, u.email_work].filter(Boolean).join('<br>') || '—';
        return `<tr>
          <td>
            <div class="acc-avatar-cell">
              <img class="acc-avatar" src="${avatar}" alt="${u.fullname}" onerror="this.src='/default-avatar.svg'">
              <div>
                <div class="acc-name">${u.fullname}</div>
                <div class="acc-sub">@${u.username}</div>
              </div>
            </div>
          </td>
          <td class="acc-sub">${u.username}</td>
          <td class="acc-sub">${u.vires_id || '—'}</td>
          <td>${deptHtml}</td>
          <td><div class="acc-contact">${contact}</div></td>
          <td>
            <div class="acc-actions">
              <button class="btn-icon" onclick="openAccountModal(${u.id})" title="Sửa">✏️</button>
              <button class="btn-icon del" onclick="confirmDeleteAccount(${u.id}, '${u.fullname}')" title="Xóa">🗑️</button>
            </div>
          </td>
        </tr>`;
    }).join('');
}

// Filter accounts
document.getElementById('admin-search')?.addEventListener('input', filterAccounts);
document.getElementById('admin-filter-dept')?.addEventListener('change', filterAccounts);

function filterAccounts() {
    const q    = (document.getElementById('admin-search')?.value || '').toLowerCase();
    const dept = document.getElementById('admin-filter-dept')?.value || '';
    const filtered = allAccounts.filter(u => {
        const matchQ = !q || u.fullname.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || (u.vires_id || '').toLowerCase().includes(q);
        const matchD = !dept || String(u.department_id) === dept;
        return matchQ && matchD;
    });
    renderAccounts(filtered);
}

// Open account modal
function openAccountModal(userId = null) {
    editingAccountId = userId;
    const isNew = userId === null;
    document.getElementById('account-modal-title').textContent = isNew ? 'Tạo tài khoản mới' : 'Chỉnh sửa tài khoản';
    document.getElementById('af-password-hint').textContent   = isNew ? '(bắt buộc)' : '(để trống = giữ mật khẩu cũ)';

    const fields = ['af-username', 'af-password', 'af-fullname', 'af-vires-id', 'af-phone', 'af-email-work', 'af-email-personal'];
    fields.forEach(id => { document.getElementById(id).value = ''; });

    document.getElementById('af-username').disabled = !isNew;  // cannot rename existing user
    document.getElementById('af-role').value        = 'user';
    document.getElementById('af-department').value  = '';

    if (!isNew) {
        const u = allAccounts.find(a => a.id === userId);
        if (u) {
            document.getElementById('af-username').value       = u.username;
            document.getElementById('af-fullname').value       = u.fullname;
            document.getElementById('af-vires-id').value       = u.vires_id || '';
            document.getElementById('af-phone').value          = u.phone || '';
            document.getElementById('af-email-work').value     = u.email_work || '';
            document.getElementById('af-email-personal').value = u.email_personal || '';
            document.getElementById('af-role').value           = u.role;
            document.getElementById('af-department').value     = u.department_id || '';
        }
    }
    document.getElementById('account-modal').classList.add('open');
}

function closeAccountModal() { document.getElementById('account-modal').classList.remove('open'); }
document.getElementById('btn-create-account')?.addEventListener('click', () => openAccountModal(null));
document.getElementById('btn-account-modal-close')?.addEventListener('click', closeAccountModal);
document.getElementById('btn-account-modal-cancel')?.addEventListener('click', closeAccountModal);
document.getElementById('account-modal')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeAccountModal(); });

document.getElementById('btn-account-modal-save')?.addEventListener('click', async () => {
    const isNew = editingAccountId === null;
    const body = {
        username:       document.getElementById('af-username').value.trim(),
        password:       document.getElementById('af-password').value,
        fullname:       document.getElementById('af-fullname').value.trim(),
        vires_id:       document.getElementById('af-vires-id').value.trim() || null,
        phone:          document.getElementById('af-phone').value.trim() || null,
        email_work:     document.getElementById('af-email-work').value.trim() || null,
        email_personal: document.getElementById('af-email-personal').value.trim() || null,
        role:           document.getElementById('af-role').value,
        department_id:  document.getElementById('af-department').value || null,
    };

    if (isNew && (!body.username || !body.password || !body.fullname)) { alert('Vui lòng điền đủ các trường bắt buộc (*)'); return; }
    if (!isNew && !body.fullname) { alert('Họ và Tên không được để trống.'); return; }

    const btn = document.getElementById('btn-account-modal-save');
    btn.textContent = 'Đang lưu...'; btn.disabled = true;
    try {
        const url    = isNew ? '/api/admin/accounts' : `/api/admin/accounts/${editingAccountId}`;
        const method = isNew ? 'POST' : 'PUT';
        const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` }, body: JSON.stringify(body) });
        const data   = await res.json();
        if (!res.ok) throw new Error(data.error);
        closeAccountModal();
        await loadAdminAccounts();
        // Also refresh members widget
        allUsers = []; loadWidgetMembers();
    } catch (err) { alert('Lỗi: ' + err.message); }
    btn.textContent = '💾 Lưu tài khoản'; btn.disabled = false;
});

// Delete account
function confirmDeleteAccount(id, name) {
    pendingDeleteId = id;
    document.getElementById('confirm-delete-text').innerHTML = `Bạn có chắc muốn xóa tài khoản của <strong>${name}</strong>?<br><small>Tất cả tin nhắn, công việc liên quan sẽ bị xóa cùng.</small>`;
    document.getElementById('confirm-delete-modal').classList.add('open');
}
document.getElementById('btn-delete-cancel')?.addEventListener('click', () => {
    document.getElementById('confirm-delete-modal').classList.remove('open');
    pendingDeleteId = null;
    pendingDeleteNewsId = null;
    const btn = document.getElementById('btn-delete-confirm');
    if (btn) { btn._newsMode = false; btn.textContent = 'Xóa'; }
});
document.getElementById('btn-delete-confirm')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-delete-confirm');

    // ── News deletion
    if (btn._newsMode && pendingDeleteNewsId !== null) {
        try {
            const res = await fetch(`/api/news/${pendingDeleteNewsId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${TOKEN}` } });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            document.getElementById('confirm-delete-modal').classList.remove('open');
            btn._newsMode = false; btn.textContent = 'Xóa'; pendingDeleteNewsId = null;
            allNews = [];
            await loadDashboard();
            if (document.getElementById('news-manager-modal').classList.contains('open')) await loadNewsManager();
        } catch (err) { alert('Lỗi: ' + err.message); }
        return;
    }

    // ── Account deletion
    if (!pendingDeleteId) return;
    try {
        const res = await fetch(`/api/admin/accounts/${pendingDeleteId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${TOKEN}` } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        document.getElementById('confirm-delete-modal').classList.remove('open');
        pendingDeleteId = null; btn.textContent = 'Xóa';
        await loadAdminAccounts();
        allUsers = []; loadWidgetMembers();
    } catch (err) { alert('Lỗi: ' + err.message); }
});
