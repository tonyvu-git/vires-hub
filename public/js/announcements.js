/* ══════════════════════════════════════════════════════
   THÔNG BÁO (ANNOUNCEMENTS) — Logic, CRUD, UI
══════════════════════════════════════════════════════ */
let allAnnouncements = [];
let editingAnnouncementId = null;
let removeAnnouncementImageFlag = false;

// Removed local formatDate, using core.js helpers

// ─── Widget: Load & Render ────────────────────────────

async function loadAnnouncements() {
    try {
        const res = await fetch('/api/announcements?limit=10', {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) return;
        allAnnouncements = await res.json();
        renderAnnouncementsWidget(allAnnouncements);
    } catch (e) {
        console.error('Lỗi tải thông báo:', e);
    }
}

function renderAnnouncementsWidget(list) {
    const listEl = document.getElementById('widget-announcements');
    if (!list || list.length === 0) {
        listEl.innerHTML = '<div class="empty-hint">Chưa có thông báo.</div>';
        return;
    }
    listEl.innerHTML = list.map(a => {
        const dateStr = formatDateTime(a.created_at + ' UTC');
        return `<div class="sidebar-item ann-item" data-id="${a.id}">
            <div class="si-top">
                <span class="si-dot dot-blue"></span>
                <span class="si-title">${a.title}</span>
            </div>
            <div class="si-meta">${a.author_name} · ${dateStr}</div>
        </div>`;
    }).join('');
    listEl.querySelectorAll('.ann-item').forEach(el => {
        el.addEventListener('click', () => openAnnouncementReader(el.dataset.id));
    });
}

// ─── Reader ───────────────────────────────────────────

function openAnnouncementReader(id) {
    const item = allAnnouncements.find(a => a.id == id);
    if (!item) return;
    document.getElementById('announcement-reader-title').textContent = item.title;
    document.getElementById('announcement-reader-meta').innerHTML =
        `Đăng bởi <b>${item.author_name}</b> · ${formatDateTime(item.created_at + ' UTC')}`;

    const contentEl = document.getElementById('announcement-reader-content');
    let html = item.content_md
        ? DOMPurify.sanitize(marked.parse(item.content_md))
        : `<p>${item.content}</p>`;
    contentEl.innerHTML = html;

    const imgWrap = document.getElementById('announcement-reader-img-wrap');
    const img     = document.getElementById('announcement-reader-img');
    if (item.image) {
        img.src = item.image;
        imgWrap.classList.remove('hidden');
    } else {
        imgWrap.classList.add('hidden');
        img.src = '';
    }

    document.getElementById('announcement-reader-modal').classList.add('open');
}

document.getElementById('btn-announcement-reader-close').onclick = () => {
    document.getElementById('announcement-reader-modal').classList.remove('open');
};
document.getElementById('announcement-reader-modal').onclick = e => {
    if (e.target === e.currentTarget)
        document.getElementById('announcement-reader-modal').classList.remove('open');
};

// ─── ADMIN: Manager ──────────────────────────────────

async function loadAnnouncementsManager() {
    try {
        const res = await fetch('/api/announcements?limit=100', {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        allAnnouncements = await res.json();
        renderAnnouncementsManagerTable(allAnnouncements);
    } catch (e) {}
}

function renderAnnouncementsManagerTable(list) {
    const tbody = document.getElementById('announcement-manager-tbody');
    const empty = document.getElementById('announcement-manager-empty');
    if (!list || list.length === 0) {
        tbody.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');
    tbody.innerHTML = list.map(a => `
        <tr>
            <td style="font-weight:500">${a.title}</td>
            <td style="font-size:0.85rem">${formatDateTime(a.created_at + ' UTC')}</td>
            <td>
                <button class="btn btn-ghost btn-xs btn-edit-ann" data-id="${a.id}">Sửa</button>
                <button class="btn btn-ghost btn-xs btn-delete-ann" data-id="${a.id}" style="color:var(--danger)">Xóa</button>
            </td>
        </tr>
    `).join('');
    tbody.querySelectorAll('.btn-edit-ann').forEach(b => {
        b.onclick = () => openAnnouncementEditor(b.dataset.id);
    });
    tbody.querySelectorAll('.btn-delete-ann').forEach(b => {
        b.onclick = async () => {
            if (!confirm('Bạn có chắc chắn muốn xóa thông báo này?')) return;
            try {
                const res = await fetch(`/api/announcements/${b.dataset.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${TOKEN}` }
                });
                if (res.ok) {
                    await loadAnnouncementsManager();
                    await loadAnnouncements();
                }
            } catch (err) { alert('Lỗi: ' + err.message); }
        };
    });
}

// ─── Manager Modal Open/Close ─────────────────────────

const btnManageAnnouncements = document.getElementById('btn-manage-announcements');
if (btnManageAnnouncements) {
    btnManageAnnouncements.addEventListener('click', () => {
        loadAnnouncementsManager();
        document.getElementById('announcement-manager-modal').classList.add('open');
    });
}

document.getElementById('btn-announcement-manager-close').onclick = () => {
    document.getElementById('announcement-manager-modal').classList.remove('open');
};

document.getElementById('btn-new-announcement').onclick = () => openAnnouncementEditor(null);

// ─── Create / Edit Modal ──────────────────────────────

function openAnnouncementEditor(id = null) {
    editingAnnouncementId = id;
    removeAnnouncementImageFlag = false;
    const titleEl   = document.getElementById('announcement-title');
    const contentEl = document.getElementById('announcement-content');
    const preview   = document.getElementById('announcement-preview');
    const imgCurrent = document.getElementById('announcement-image-current');
    const imgPreview = document.getElementById('announcement-image-preview');

    // Reset image
    document.getElementById('announcement-image').value = '';
    imgCurrent.classList.add('hidden');
    imgPreview.src = '';

    if (id) {
        document.getElementById('announcement-modal-title').textContent = '📝 Sửa Thông báo';
        const item = allAnnouncements.find(a => a.id == id);
        if (item) {
            titleEl.value   = item.title;
            contentEl.value = item.content_md || item.content;
            preview.innerHTML = DOMPurify.sanitize(marked.parse(contentEl.value));
            if (item.image) {
                imgPreview.src = item.image;
                imgCurrent.classList.remove('hidden');
            }
        }
    } else {
        document.getElementById('announcement-modal-title').textContent = '📢 Tạo Thông báo Mới';
        titleEl.value   = '';
        contentEl.value = '';
        preview.innerHTML = '<em class="preview-hint">Bắt đầu đánh máy để xem trước...</em>';
    }
    document.getElementById('announcement-modal').classList.add('open');
}

const closeAnnEditor = () => {
    document.getElementById('announcement-modal').classList.remove('open');
    editingAnnouncementId = null;
};
document.getElementById('btn-announcement-close').onclick  = closeAnnEditor;
document.getElementById('btn-announcement-cancel').onclick = closeAnnEditor;
document.getElementById('announcement-modal').onclick = e => {
    if (e.target === e.currentTarget) closeAnnEditor();
};

// Live Markdown Preview
document.getElementById('announcement-content').addEventListener('input', e => {
    const preview = document.getElementById('announcement-preview');
    const val = e.target.value;
    if (val.trim()) {
        preview.innerHTML = DOMPurify.sanitize(marked.parse(val));
    } else {
        preview.innerHTML = '<em class="preview-hint">Bắt đầu đánh máy để xem trước...</em>';
    }
});

// Image upload preview
document.getElementById('announcement-image').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        document.getElementById('announcement-image-preview').src = ev.target.result;
        document.getElementById('announcement-image-current').classList.remove('hidden');
        removeAnnouncementImageFlag = false;
    };
    reader.readAsDataURL(file);
});

document.getElementById('btn-remove-announcement-image').onclick = () => {
    removeAnnouncementImageFlag = true;
    document.getElementById('announcement-image-current').classList.add('hidden');
    document.getElementById('announcement-image').value = '';
};

// ─── Submit (Create / Update) ─────────────────────────

document.getElementById('btn-announcement-submit').onclick = async () => {
    const title   = document.getElementById('announcement-title').value.trim();
    const content = document.getElementById('announcement-content').value.trim();
    if (!title || !content) {
        alert('Vui lòng nhập đủ tiêu đề và nội dung.'); return;
    }
    const btn = document.getElementById('btn-announcement-submit');
    btn.disabled = true; btn.textContent = 'Đang lưu...';

    try {
        const method = editingAnnouncementId ? 'PUT' : 'POST';
        const url    = editingAnnouncementId
            ? `/api/announcements/${editingAnnouncementId}`
            : '/api/announcements';

        // Build FormData to support image upload
        const formData = new FormData();
        formData.append('title',      title);
        formData.append('content',    content);
        formData.append('content_md', content);
        if (removeAnnouncementImageFlag) formData.append('remove_image', '1');
        const imgFile = document.getElementById('announcement-image').files[0];
        if (imgFile) formData.append('image', imgFile);

        const res = await fetch(url, {
            method,
            headers: { 'Authorization': `Bearer ${TOKEN}` },
            body: formData
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Lỗi lưu thông báo');
        }

        closeAnnEditor();
        await loadAnnouncementsManager();
        await loadAnnouncements();
        if (typeof showToast === 'function') showToast('Đã lưu thông báo!', 'success');

    } catch (e) {
        alert('Lỗi: ' + e.message);
    }
    btn.disabled = false; btn.textContent = '📤 Đăng ngay';
};

// ─── Search (Manager) ─────────────────────────────────

const annSearch = document.getElementById('am-search');
if (annSearch) {
    annSearch.addEventListener('input', e => {
        const v = e.target.value.toLowerCase();
        document.getElementById('announcement-manager-tbody')
            .querySelectorAll('tr')
            .forEach(r => {
                r.style.display = r.children[0].textContent.toLowerCase().includes(v) ? '' : 'none';
            });
    });
}
