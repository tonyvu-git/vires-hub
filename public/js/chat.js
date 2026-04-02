/* ══════════════════════════════════════════════════════
   DIRECT MESSAGES (DM)
══════════════════════════════════════════════════════ */
let cachedConvos = [];

async function loadDMConversations() {
    try {
        const res = await fetch('/api/dm/conversations', { headers: { 'Authorization': `Bearer ${TOKEN}` } });
        cachedConvos = await res.json();
        renderDMConversations(cachedConvos);
    } catch (e) { }
}

function renderDMConversations(convos, filterText) {
    const list = document.getElementById('dm-convo-list');
    let filtered = convos;
    if (filterText) {
        const q = filterText.toLowerCase();
        filtered = convos.filter(c => c.fullname.toLowerCase().includes(q));
    }
    if (!filtered.length) {
        list.innerHTML = '<div class="empty-hint">Chưa có tin nhắn.<br>Nhắn tin từ Danh bạ!</div>';
        return;
    }
    list.innerHTML = filtered.map(c => {
        const avatarSrc = getAvatar(c);
        const isActive = c.id === dmActivePeerId;
        return `<div class="dm-convo-item ${isActive ? 'active' : ''}" onclick="openDMWith(${c.id}, '${c.fullname.replace(/'/g, "\\'")}', '${avatarSrc}')">
            <img src="${avatarSrc}" alt="${c.fullname}" onerror="this.src='/default-avatar.svg'">
            <div class="dm-convo-info">
                <div class="dm-convo-name">${c.fullname}</div>
                <div class="dm-convo-preview">${c.last_message || 'Bắt đầu nhắn tin...'}</div>
            </div>
            ${c.unread > 0 ? `<div class="dm-convo-unread">${c.unread}</div>` : ''}
        </div>`;
    }).join('');
}

// DM Search
document.getElementById('dm-search').addEventListener('input', (e) => {
    renderDMConversations(cachedConvos, e.target.value);
});

async function openDMWith(peerId, peerName) {
    if (currentView !== 'dm') switchView('dm');
    dmActivePeerId = peerId;
    dmActivePeerName = peerName;

    // Look up avatar from cached users list, fallback to default
    const peerUser = allUsers.find(u => u.id === peerId);
    const peerAvatar = getAvatar(peerUser);

    document.getElementById('dm-peer-name').textContent = peerName;
    const peerAvatarEl = document.getElementById('dm-peer-avatar');
    peerAvatarEl.src = peerAvatar;
    peerAvatarEl.onerror = () => { peerAvatarEl.src = '/default-avatar.svg'; };
    document.getElementById('dm-placeholder').classList.add('hidden');
    document.getElementById('dm-chat').classList.remove('dm-chat-hidden');

    document.querySelectorAll('.dm-convo-item').forEach(el => el.classList.remove('active'));

    try {
        const res = await fetch(`/api/dm/${peerId}`, { headers: { 'Authorization': `Bearer ${TOKEN}` } });
        const messages = await res.json();
        const box = document.getElementById('dm-messages');
        box.innerHTML = '';
        messages.forEach(msg => appendDMMessage(msg));
        scrollDMChat();
    } catch (e) { }

    socket.emit('dm_mark_read', { senderId: peerId });
    loadDMConversations();
}

function appendDMMessage(msg) {
    const box = document.getElementById('dm-messages');
    const isMine = msg.sender_id === USER.id;
    const div = document.createElement('div');
    div.className = `message ${isMine ? 'mine' : ''}`;
    div.id = `dm-msg-row-${msg.id}`;
    const src = getAvatar(msg.sender_id === USER.id ? USER : allUsers.find(u => u.id === msg.sender_id));

    const deleteBtn = isMine
        ? `<button class="msg-delete-btn" onclick="deleteDMMessage(${msg.id})" title="Thu hồi tin nhắn">✕</button>`
        : '';

    let contentHtml;
    if (msg.file_path) {
        contentHtml = `<a href="${msg.file_path}" target="_blank" download="${msg.file_name || ''}" class="dm-file-link">📎 ${msg.file_name || 'File'}</a>`;
    } else {
        contentHtml = typeof marked !== 'undefined' ? DOMPurify.sanitize(marked.parse(msg.content)) : msg.content;
    }

    div.innerHTML = `
        <img src="${src}" alt="${msg.sender_name}" onerror="this.src='/default-avatar.svg'">
        <div>
            <div class="msg-sender">${msg.sender_name}${deleteBtn}</div>
            <div class="msg-bubble" id="dm-msg-${msg.id}">
                <div class="msg-text">${contentHtml}</div>
                <div class="reactions-container" id="dm-reacts-${msg.id}">
                    ${renderReactions(msg.reactions, msg.id, 'dm')}
                </div>
                <div class="emoji-picker-container">
                    <span class="emoji-picker-trigger" onclick="toggleEmojiPicker(${msg.id}, this, 'dm')">😀+</span>
                    <div class="emoji-picker" id="dm-picker-${msg.id}">
                        ${renderEmojiOptions(msg.id, 'dm')}
                    </div>
                </div>
            </div>
        </div>`;
    box.appendChild(div);
}

function deleteDMMessage(msgId) {
    if (confirm('Thu hồi tin nhắn này?')) {
        socket.emit('dm_delete_message', { msgId, peerId: dmActivePeerId });
    }
}

function scrollDMChat() {
    const box = document.getElementById('dm-messages');
    box.scrollTop = box.scrollHeight;
}

document.getElementById('btn-send-dm').onclick = () => {
    const inp = document.getElementById('dm-input');
    if (!inp.value.trim() || !dmActivePeerId) return;
    socket.emit('dm_send', { receiverId: dmActivePeerId, content: inp.value });
    inp.value = '';
};
document.getElementById('dm-input').onkeydown = e => { if (e.key === 'Enter') document.getElementById('btn-send-dm').click(); };

// DM File Upload
document.getElementById('dm-file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !dmActivePeerId) return;

    const BLOCKED = ['.exe', '.bat', '.cmd', '.ps1', '.vbs', '.msi', '.scr', '.dll', '.hta', '.com', '.pif', '.reg', '.inf', '.ws', '.wsf', '.cpl'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (BLOCKED.includes(ext)) {
        alert('Loại file này không được phép gửi vì lý do bảo mật!\n\nCác loại file bị chặn: ' + BLOCKED.join(', '));
        e.target.value = '';
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        alert('File quá lớn! Giới hạn 10MB.');
        e.target.value = '';
        return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('receiverId', dmActivePeerId);

    try {
        const res = await fetch('/api/dm/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${TOKEN}` },
            body: formData
        });
        if (!res.ok) {
            const err = await res.json();
            alert(err.error || 'Lỗi upload file');
        }
    } catch (err) {
        alert('Lỗi kết nối khi upload file');
    }
    e.target.value = '';
});


/* ══════════════════════════════════════════════════════
   GROUP CHAT (DASHBOARD)
══════════════════════════════════════════════════════ */

// Dashboard sidebar chat (mirrors main group chat)
document.getElementById('btn-send-dashboard-chat').onclick = () => {
    const inp = document.getElementById('dashboard-chat-input');
    if (!inp.value.trim() || !socket) return;
    socket.emit('send_message', inp.value);
    inp.value = '';
};
document.getElementById('dashboard-chat-input').onkeydown = e => { if (e.key === 'Enter') document.getElementById('btn-send-dashboard-chat').click(); };

function appendDashboardChatMessage(msg) {
    const box = document.getElementById('dashboard-chat-messages');
    if (!box) return;
    
    // Convert to numbers for safe comparison
    const currentUserId = USER ? Number(USER.id) : 0;
    const msgUserId = Number(msg.user_id);
    const isMine = msgUserId === currentUserId;
    const isAdmin = USER && USER.role && String(USER.role).toLowerCase().trim() === 'admin';
    
    const div = document.createElement('div');
    div.id = `chat-msg-row-${msg.id}`;
    div.className = `widget-chat-msg${isMine ? ' mine' : ''}`;
    
    // Find sender avatar
    const sender = isMine ? USER : allUsers.find(u => Number(u.id) === msgUserId);
    const avatarSrc = getAvatar(sender);
    
    const deleteBtn = (isMine || isAdmin) 
        ? `<button class="msg-delete-btn" onclick="deleteGlobalMessage(${msg.id})" title="Thu hồi tin nhắn">✕</button>` 
        : '';

    div.innerHTML = `
        <img src="${avatarSrc}" alt="${msg.fullname || 'Nhân viên'}" onerror="this.src='/default-avatar.svg'">
        <div>
            <div class="widget-chat-msg-sender">
                ${isMine ? 'TÔI' : (msg.fullname || 'Nhân viên')}
                ${deleteBtn}
            </div>
            <div class="widget-chat-msg-text" id="msg-${msg.id}">
                <div class="msg-text">${typeof marked !== 'undefined' ? DOMPurify.sanitize(marked.parse(msg.content)) : msg.content}</div>
                <div class="reactions-container" id="group-reacts-${msg.id}">
                    ${renderReactions(msg.reactions, msg.id, 'group')}
                </div>
                <div class="emoji-picker-container">
                    <span class="emoji-picker-trigger" onclick="toggleEmojiPicker(${msg.id}, this, 'group')">😀+</span>
                    <div class="emoji-picker" id="group-picker-${msg.id}">
                        ${renderEmojiOptions(msg.id, 'group')}
                    </div>
                </div>
            </div>
        </div>`;
    box.appendChild(div);
}

function deleteGlobalMessage(msgId) {
    if (confirm('Bạn có chắc chắn muốn thu hồi tin nhắn này?')) {
        socket.emit('delete_message', msgId);
    }
}
async function loadDashboardChatHistory() {
    // Already handled by init_messages socket event.
}
function scrollDashboardChat() {
    const box = document.getElementById('dashboard-chat-messages');
    if (box) box.scrollTop = box.scrollHeight;
}


/* ══════════════════════════════════════════════════════
   SOCKET.IO
══════════════════════════════════════════════════════ */
function initSocket() {
    socket = io({ auth: { token: TOKEN } });

    socket.on('init_messages', messages => {
        const dbBox = document.getElementById('dashboard-chat-messages');
        if (dbBox) dbBox.innerHTML = '';
        messages.forEach(msg => {
            appendDashboardChatMessage(msg);
        });
        scrollDashboardChat();
    });
    socket.on('message', msg => {
        appendDashboardChatMessage(msg);
        scrollDashboardChat();
    });
    socket.on('new_post', () => {
        if (currentView === 'dashboard') loadDashboard();
    });

    socket.on('chat_status', enabled => {
        const inp = document.getElementById('dashboard-chat-input');
        const btn = document.getElementById('btn-send-dashboard-chat');
        if (inp) {
            inp.disabled = !enabled && USER.role !== 'admin';
            inp.placeholder = enabled ? "Nhắn tin nhóm..." : "Hệ thống Chat hiện đang khóa";
        }
        if (btn) btn.disabled = !enabled && USER.role !== 'admin';
        
        // Update admin toggle button text if exists
        const toggleBtn = document.getElementById('btn-admin-toggle-chat');
        if (toggleBtn) {
            toggleBtn.textContent = enabled ? '🔒 Khóa Chat' : '🔓 Mở Chat';
            toggleBtn.classList.toggle('chat-disabled', !enabled);
        }
    });

    socket.on('chat_cleared', () => {
        const box = document.getElementById('dashboard-chat-messages');
        if (box) box.innerHTML = '<div class="chat-system-msg">Lịch sử chat đã được xóa bởi Admin.</div>';
    });

    socket.on('message_deleted', msgId => {
        const el = document.getElementById(`chat-msg-row-${msgId}`);
        if (el) {
            el.classList.add('msg-deleting');
            setTimeout(() => el.remove(), 400);
        }
    });

    // DM
    socket.on('unread_total', count => updateDMBadge(count));

    socket.on('dm_message', msg => {
        if (dmActivePeerId && (msg.sender_id === dmActivePeerId || msg.receiver_id === dmActivePeerId)) {
            appendDMMessage(msg);
            scrollDMChat();
            if (msg.sender_id === dmActivePeerId) socket.emit('dm_mark_read', { senderId: dmActivePeerId });
        }
        if (currentView === 'dm') loadDMConversations();
    });
    socket.on('dm_notify', data => {
        if (currentView === 'dm' && dmActivePeerId === data.from_id) return;
        showDMToast(data);
        if (currentView === 'dm') loadDMConversations();
    });

    socket.on('message_react_update', ({ msgId, reactions }) => {
        const container = document.getElementById(`group-reacts-${msgId}`);
        if (container) container.innerHTML = renderReactions(reactions, msgId, 'group');
    });

    socket.on('dm_react_update', ({ msgId, reactions }) => {
        const container = document.getElementById(`dm-reacts-${msgId}`);
        if (container) container.innerHTML = renderReactions(reactions, msgId, 'dm');
    });

    socket.on('dm_message_deleted', (msgId) => {
        const el = document.getElementById(`dm-msg-row-${msgId}`);
        if (el) {
            el.classList.add('msg-deleting');
            setTimeout(() => el.remove(), 400);
        }
    });

    socket.on('online_count', (count) => {
        const el = document.getElementById('stat-online');
        if (el) el.textContent = count;
    });

    // Load visitors count on connect
    fetch('/api/stats/online').then(r => r.json()).then(data => {
        const vEl = document.getElementById('stat-visitors');
        if (vEl) vEl.textContent = data.totalVisitors;
        const oEl = document.getElementById('stat-online');
        if (oEl) oEl.textContent = data.online;
    }).catch(() => {});
}


/* ══════════════════════════════════════════════════════
   REACTIONS LOGIC
   ══════════════════════════════════════════════════════ */
const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👏', '🔥', '✅'];

function renderEmojiOptions(msgId, type) {
    return EMOJIS.map(e => `<div class="emoji-option" onclick="reactTo(${msgId}, '${e}', '${type}')">${e}</div>`).join('');
}

function renderReactions(reactions, msgId, type) {
    if (!reactions) return '';
    let data = {};
    if (typeof reactions === 'string') {
        try { data = JSON.parse(reactions); } catch (e) { data = {}; }
    } else {
        data = reactions;
    }

    return Object.entries(data).map(([emoji, users]) => {
        const count = Object.keys(users).length;
        if (count === 0) return '';
        const isMine = users[USER.id] !== undefined;
        const userList = Object.values(users).join(', ');
        return `<div class="reaction-badge ${isMine ? 'mine' : ''}" 
                     title="${userList}" 
                     onclick="reactTo(${msgId}, '${emoji}', '${type}')">
            ${emoji} <span class="reaction-count">${count}</span>
        </div>`;
    }).join('');
}

function toggleEmojiPicker(msgId, trigger, type) {
    const pickerId = `${type}-picker-${msgId}`;
    const picker = document.getElementById(pickerId);
    if (!picker) return;

    // Close others
    document.querySelectorAll('.emoji-picker').forEach(p => {
        if (p.id !== pickerId) p.classList.remove('active');
    });

    picker.classList.toggle('active');

    // Close on click outside
    const closePicker = (e) => {
        if (!picker.contains(e.target) && e.target !== trigger) {
            picker.classList.remove('active');
            document.removeEventListener('click', closePicker);
        }
    };
    if (picker.classList.contains('active')) {
        setTimeout(() => document.addEventListener('click', closePicker), 10);
    }
}

function reactTo(msgId, emoji, type) {
    if (type === 'group') {
        socket.emit('message_react', { msgId, emoji });
    } else {
        socket.emit('dm_react', { msgId, emoji, receiverId: dmActivePeerId });
    }
    // Close picker
    const picker = document.getElementById(`${type}-picker-${msgId}`);
    if (picker) picker.classList.remove('active');
}

// ─── Admin UI Injection ───────────────────────────────────
function injectAdminChatControls() {
    const userRole = (USER && USER.role) ? String(USER.role).toLowerCase().trim() : '';

    if (userRole !== 'admin') {
        // Remove controls if not admin (failsafe)
        document.querySelectorAll('.admin-chat-controls').forEach(el => el.remove());
        return;
    }
    
    const header = document.querySelector('.dashboard-chat-widget .widget-header');
    // If header not found or controls already exist, don't duplicate
    if (!header || document.getElementById('btn-admin-clear-chat')) return;

    const adminControls = document.createElement('div');
    adminControls.className = 'admin-chat-controls';
    adminControls.innerHTML = `
        <button id="btn-admin-clear-chat" class="btn-admin-small" title="Xóa toàn bộ lịch sử">🗑️</button>
        <button id="btn-admin-toggle-chat" class="btn-admin-small" title="Khóa/Mở Chat">🔒</button>
    `;
    
    const toggleBtn = document.getElementById('btn-toggle-chat');
    if (toggleBtn) {
        header.insertBefore(adminControls, toggleBtn);
    } else {
        header.appendChild(adminControls);
    }

    document.getElementById('btn-admin-clear-chat').onclick = () => {
        if (confirm('BẠN CÓ CHẮC CHẮN MUỐN XÓA TOÀN BỘ LỊCH SỬ CHAT CHUNG? Thao tác này không thể hoàn tác.')) {
            socket.emit('admin_clear_chat');
        }
    };
    document.getElementById('btn-admin-toggle-chat').onclick = () => {
        socket.emit('admin_toggle_chat');
    };
}

// Initial check
setTimeout(injectAdminChatControls, 1000);
// Also call when dashboard matches
setInterval(() => {
    if (currentView === 'dashboard' && !document.getElementById('btn-admin-clear-chat')) {
        injectAdminChatControls();
    }
}, 3000);

