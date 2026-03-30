/* ══════════════════════════════════════════════════════
   TASKS
══════════════════════════════════════════════════════ */
async function loadTasks() {
    try {
        const res   = await fetch('/api/tasks', { headers: { 'Authorization': `Bearer ${TOKEN}` } });
        const tasks = await res.json();
        renderTasksFull(tasks);
    } catch (e) {}
}

async function loadWidgetTasks() {
    try {
        const res   = await fetch('/api/tasks', { headers: { 'Authorization': `Bearer ${TOKEN}` } });
        const tasks = await res.json();
        const now   = new Date();
        const upcoming = tasks
            .filter(t => t.status !== 'completed')
            .slice(0, 10);
        const widget = document.getElementById('widget-tasks');
        if (!upcoming.length) {
            widget.innerHTML = '<div class="empty-hint">Không có deadline.</div>';
        } else {
            widget.innerHTML = upcoming.map(t => {
                const dl       = new Date(t.deadline);
                const diffDays = (dl - now) / (1000 * 60 * 60 * 24);
                const isLate   = dl < now;
                const isSoon   = !isLate && diffDays <= 3;
                const dotCls   = isLate ? 'dot-red' : isSoon ? 'dot-yellow' : 'dot-gray';
                const dateStr  = dl.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' });
                const metaText = isLate ? `⚠ Quá hạn · ${dateStr}` : `📅 ${dateStr}`;
                const metaCls  = isLate ? 'si-meta overdue' : isSoon ? 'si-meta soon' : 'si-meta';
                return `<div class="sidebar-item" onclick="switchView('tasks')">
                    <div class="si-top">
                        <span class="si-dot ${dotCls}"></span>
                        <span class="si-title">${t.title}</span>
                    </div>
                    <div class="${metaCls}">${metaText}</div>
                </div>`;
            }).join('');
        }
    } catch (e) {}
}

function renderTasksFull(tasks) {
    const list = document.getElementById('tasks-list-full');
    if (!tasks.length) {
        list.innerHTML = '<div class="empty-hint">Chưa có công việc nào. Thêm mới ở trên!</div>';
        return;
    }
    list.innerHTML = tasks.map(t => {
        const dl     = new Date(t.deadline);
        const isLate = dl < new Date() && t.status !== 'completed';
        return `<div class="task-item ${isLate ? 'overdue' : ''}">
            <div class="task-item-main">
                <div class="task-title">${t.title}</div>
                <div class="task-deadline">Hạn: ${dl.toLocaleString('vi-VN')}</div>
            </div>
            <div class="task-item-actions">
                <span class="task-status" style="background:${isLate ? 'rgba(220,38,38,0.1)' : 'var(--accent-light)'};color:${isLate ? 'var(--danger)' : 'var(--accent)'}">
                    ${isLate ? '⚠ Quá hạn' : '⏳ Đang chờ'}
                </span>
                <button class="btn-task-del" onclick="deleteTask(${t.id})" title="Xóa công việc">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
            </div>
        </div>`;
    }).join('');
}

document.getElementById('btn-add-task').onclick = async () => {
    const title    = document.getElementById('new-task-title').value.trim();
    const deadline = document.getElementById('new-task-deadline').value;
    if (!title || !deadline) { alert('Vui lòng nhập tên công việc và ngày hết hạn.'); return; }
    await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` }, body: JSON.stringify({ title, deadline }) });
    document.getElementById('new-task-title').value = '';
    loadTasks();
    loadWidgetTasks();
};

async function deleteTask(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa công việc này?')) return;
    try {
        const res = await fetch(`/api/tasks/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (res.ok) {
            loadTasks();
            loadWidgetTasks();
        } else {
            const data = await res.json();
            alert('Lỗi: ' + data.error);
        }
    } catch (e) {
        alert('Lỗi kết nối máy chủ.');
    }
}

