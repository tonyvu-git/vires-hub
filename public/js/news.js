/* ══════════════════════════════════════════════════════
   NEWS — Dashboard Grid + Manager + Reader
══════════════════════════════════════════════════════ */
let allNews = [];           // cache toàn bộ tin
let editingNewsId = null;   // null = đăng mới, number = sửa
let removeImageFlag = false;

/* ─── Compose / Edit modal ─────────────────────────── */
function openNewsModal(newsId = null) {
    editingNewsId = newsId;
    removeImageFlag = false;
    const isEdit = newsId !== null;

    document.getElementById('news-modal-title').textContent = isEdit ? '✏️ Sửa bản tin' : '📢 Đăng tin mới';
    document.getElementById('btn-news-submit').textContent  = isEdit ? '💾 Lưu thay đổi' : '📤 Đăng ngay';
    document.getElementById('news-title').value   = '';
    document.getElementById('news-content').value = '';
    document.getElementById('news-preview').innerHTML = '<em class="preview-hint">Bắt đầu đánh máy để xem trước...</em>';
    document.getElementById('news-image').value   = '';

    // Image preview section
    const imgCurrent = document.getElementById('news-image-current');
    const imgPreview = document.getElementById('news-image-preview');
    imgCurrent.classList.add('hidden');
    imgPreview.src = '';

    if (isEdit) {
        const n = allNews.find(x => x.id === newsId);
        if (n) {
            document.getElementById('news-title').value   = n.title;
            document.getElementById('news-content').value = n.content_md || '';
            if (n.content_md) {
                document.getElementById('news-preview').innerHTML = marked.parse(n.content_md);
            }
            if (n.image) {
                imgPreview.src = n.image;
                imgCurrent.classList.remove('hidden');
            }
        }
    }

    document.getElementById('news-modal').classList.add('open');
}
function closeNewsModal() { document.getElementById('news-modal').classList.remove('open'); }

document.getElementById('btn-post-news').onclick  = () => openNewsModal(null);
document.getElementById('btn-news-cancel').onclick  = closeNewsModal;
document.getElementById('btn-news-cancel2').onclick = closeNewsModal;
document.getElementById('news-modal').onclick = e => { if (e.target === e.currentTarget) closeNewsModal(); };

document.getElementById('news-content').addEventListener('input', e => {
    const md = e.target.value.trim();
    document.getElementById('news-preview').innerHTML = md
        ? marked.parse(md)
        : '<em class="preview-hint">Bắt đầu đánh máy để xem trước...</em>';
});

// Image preview on file select
document.getElementById('news-image').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        document.getElementById('news-image-preview').src = ev.target.result;
        document.getElementById('news-image-current').classList.remove('hidden');
        removeImageFlag = false;
    };
    reader.readAsDataURL(file);
});
document.getElementById('btn-remove-image').onclick = () => {
    removeImageFlag = true;
    document.getElementById('news-image-current').classList.add('hidden');
    document.getElementById('news-image').value = '';
};

document.getElementById('btn-news-submit').onclick = async () => {
    const title     = document.getElementById('news-title').value.trim();
    const mdContent = document.getElementById('news-content').value.trim();
    if (!title || !mdContent) { alert('Vui lòng nhập tiêu đề và nội dung.'); return; }

    const htmlContent = marked.parse(mdContent);
    const formData    = new FormData();
    formData.append('title', title);
    formData.append('content', htmlContent);
    formData.append('content_md', mdContent);
    if (removeImageFlag) formData.append('remove_image', '1');
    const fileEl = document.getElementById('news-image');
    if (fileEl.files[0]) formData.append('image', fileEl.files[0]);

    const btn = document.getElementById('btn-news-submit');
    btn.textContent = 'Đang lưu...'; btn.disabled = true;

    try {
        const isEdit = editingNewsId !== null;
        const url    = isEdit ? `/api/news/${editingNewsId}` : '/api/news';
        const method = isEdit ? 'PUT' : 'POST';
        const res    = await fetch(url, { method, headers: { 'Authorization': `Bearer ${TOKEN}` }, body: formData });
        const data   = await res.json();
        if (!res.ok) throw new Error(data.error);

        closeNewsModal();
        document.getElementById('news-image').value = '';
        allNews = [];   // bust cache
        await loadDashboard();
        if (document.getElementById('news-manager-modal').classList.contains('open')) {
            await loadNewsManager();
        }
    } catch (err) { alert('Lỗi: ' + err.message); }

    btn.textContent = editingNewsId ? '💾 Lưu thay đổi' : '📤 Đăng ngay';
    btn.disabled = false;
};

/* ─── Dashboard – load 6 tin mới nhất ────────────────── */
async function loadDashboard() {
    try {
        const res  = await fetch('/api/news?limit=6', { headers: { 'Authorization': `Bearer ${TOKEN}` } });
        const news = await res.json();
        allNews = news;
        renderNewsGrid(news);
        // Update news count in stats widget
        const statNews = document.getElementById('stat-news');
        if (statNews) statNews.textContent = news.length || '—';

        if (typeof loadAnnouncements === 'function') {
            await loadAnnouncements();
        }
    } catch (e) {}
}

function renderNewsGrid(news) {
    const grid = document.getElementById('news-grid');
    const isAdmin = USER?.role === 'admin';

    if (!news.length) {
        grid.innerHTML = `<div class="news-empty-card">
            <div style="font-size:2rem;margin-bottom:8px">📭</div>
            Chưa có bản tin nào. ${isAdmin ? 'Nhấn <strong>Đăng tin</strong> để tạo bản tin đầu tiên!' : ''}
        </div>`;
        return;
    }

    grid.innerHTML = news.map(n => {
        const thumb = n.image
            ? `<img src="${n.image}" alt="${n.title}" loading="lazy">`
            : `<div class="news-card-thumb-placeholder">📰</div>`;
        const adminBtns = isAdmin ? `
            <div class="news-card-actions">
                <button class="news-card-action-btn nc-edit" onclick="event.stopPropagation(); editNews(${n.id})" title="Sửa">✏️</button>
                <button class="news-card-action-btn nc-del"  onclick="event.stopPropagation(); deleteNews(${n.id}, '${escHtml(n.title)}')" title="Xóa">🗑️</button>
            </div>` : '';
        const excerpt = n.content.replace(/<[^>]+>/g, '').substring(0, 80);
        const dateStr = new Date(n.created_at + ' UTC').toLocaleDateString('vi-VN');
        return `<article class="news-card" onclick="openNewsReader(${n.id})">
            <div class="news-card-thumb">${thumb}${adminBtns}</div>
            <div class="news-card-body">
                <h3 class="news-card-title">${escHtml(n.title)}</h3>
                <div class="news-card-meta">${n.author_name} · ${dateStr}</div>
                <div class="news-card-excerpt">${escHtml(excerpt)}</div>
            </div>
        </article>`;
    }).join('');
}

function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ─── News Reader modal ─────────────────────────────── */
function openNewsReader(newsId) {
    const n = allNews.find(x => x.id === newsId);
    if (!n) return;

    document.getElementById('news-reader-title').textContent = n.title;
    document.getElementById('news-reader-meta').textContent  =
        `Đăng bởi ${n.author_name} · ${new Date(n.created_at + ' UTC').toLocaleString('vi-VN')}${n.updated_at ? ' (đã cập nhật)' : ''}`;
    document.getElementById('news-reader-content').innerHTML = n.content;

    const imgWrap = document.getElementById('news-reader-img-wrap');
    const img     = document.getElementById('news-reader-img');
    if (n.image) {
        img.src = n.image;
        imgWrap.classList.remove('hidden');
    } else {
        imgWrap.classList.add('hidden');
        img.src = '';
    }
    document.getElementById('news-reader-modal').classList.add('open');
}
document.getElementById('btn-news-reader-close').onclick = () => {
    document.getElementById('news-reader-modal').classList.remove('open');
};
document.getElementById('news-reader-modal').onclick = e => {
    if (e.target === e.currentTarget) document.getElementById('news-reader-modal').classList.remove('open');
};

/* ─── Edit / Delete from card ──────────────────────── */
function editNews(newsId) {
    // Ensure allNews has up-to-date entry
    openNewsModal(newsId);
}

let pendingDeleteNewsId = null;
function deleteNews(newsId, title) {
    pendingDeleteNewsId = newsId;
    document.getElementById('confirm-delete-text').innerHTML =
        `Bạn có chắc muốn xóa bản tin <strong>"${title}"</strong>?<br><small>Hành động này không thể hoàn tác.</small>`;
    // Temporarily hijack confirm button
    const confirmBtn = document.getElementById('btn-delete-confirm');
    const cancelBtn  = document.getElementById('btn-delete-cancel');
    confirmBtn.textContent = 'Xóa bản tin';
    document.getElementById('confirm-delete-modal').classList.add('open');
    confirmBtn._newsMode = true;
}

/* ─── News Manager (Admin) ──────────────────────────── */
document.getElementById('btn-manage-news')?.addEventListener('click', () => {
    document.getElementById('news-manager-modal').classList.add('open');
    loadNewsManager();
});
document.getElementById('btn-news-manager-close')?.addEventListener('click', () => {
    document.getElementById('news-manager-modal').classList.remove('open');
});
document.getElementById('news-manager-modal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) document.getElementById('news-manager-modal').classList.remove('open');
});
document.getElementById('btn-new-news')?.addEventListener('click', () => {
    document.getElementById('news-manager-modal').classList.remove('open');
    openNewsModal(null);
});
document.getElementById('nm-search')?.addEventListener('input', () => {
    const q = document.getElementById('nm-search').value.toLowerCase();
    renderNewsManagerTable(allNews.filter(n => n.title.toLowerCase().includes(q)));
});

async function loadNewsManager() {
    try {
        const res  = await fetch('/api/news?limit=100');
        const news = await res.json();
        allNews = news;
        renderNewsManagerTable(news);
    } catch (e) {}
}

function renderNewsManagerTable(news) {
    const tbody = document.getElementById('news-manager-tbody');
    const empty = document.getElementById('news-manager-empty');
    if (!news.length) { tbody.innerHTML = ''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    tbody.innerHTML = news.map(n => {
        const thumb = n.image
            ? `<img class="nm-thumb" src="${n.image}" alt="">`
            : `<div class="nm-thumb-placeholder">📰</div>`;
        const dateStr = new Date(n.created_at + ' UTC').toLocaleDateString('vi-VN');
        const editedStr = n.updated_at ? `<div class="nm-last-edit">Đã sửa</div>` : '';
        return `<tr>
            <td>${thumb}</td>
            <td><div class="nm-title">${escHtml(n.title)}${editedStr}</div></td>
            <td class="acc-sub">${n.author_name}</td>
            <td class="acc-sub">${dateStr}</td>
            <td>
                <div class="acc-actions">
                    <button class="btn-icon" onclick="nmEditNews(${n.id})" title="Sửa">✏️</button>
                    <button class="btn-icon del" onclick="nmDeleteNews(${n.id}, '${escHtml(n.title)}')" title="Xóa">🗑️</button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function nmEditNews(newsId) {
    document.getElementById('news-manager-modal').classList.remove('open');
    openNewsModal(newsId);
}
function nmDeleteNews(newsId, title) {
    pendingDeleteNewsId = newsId;
    document.getElementById('confirm-delete-text').innerHTML =
        `Xóa bản tin <strong>"${title}"</strong>?<br><small>Hành động này không thể hoàn tác.</small>`;
    const confirmBtn = document.getElementById('btn-delete-confirm');
    confirmBtn.textContent = 'Xóa bản tin';
    confirmBtn._newsMode = true;
    document.getElementById('confirm-delete-modal').classList.add('open');
}


