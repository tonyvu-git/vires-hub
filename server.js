const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');
const sharp = require('sharp');


const db = require('./database');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const SECRET_KEY = 'vires-hub-corporate-secret-2024';
const PORT = process.env.PORT || 4000;

// ─── Multer for uploads ────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// DM file upload config
const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.ps1', '.vbs', '.msi', '.scr', '.dll', '.hta', '.com', '.pif', '.reg', '.inf', '.ws', '.wsf', '.cpl'];
const dmStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(__dirname, 'public', 'uploads', 'dm');
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_'));
  }
});
const dmUpload = multer({
  storage: dmStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      return cb(new Error('File type not allowed'), false);
    }
    cb(null, true);
  }
});

app.use(express.json());
app.use(express.static('public'));

// ─── Seed: Tài khoản test mặc định ────────────────────────
function seedDefaultAccounts() {
  const count = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (count > 0) return; // Đã có dữ liệu, bỏ qua

  const users = [
    { username: 'admin', password: 'admin123', fullname: 'Quản Trị Viên', role: 'admin' },
    { username: 'nguyenvana', password: 'vires123', fullname: 'Nguyễn Văn A', role: 'user' },
    { username: 'tranthib', password: 'vires123', fullname: 'Trần Thị B', role: 'user' },
    { username: 'lethic', password: 'vires123', fullname: 'Lê Thị C', role: 'user' },
  ];

  const stmt = db.prepare('INSERT INTO users (username, password, fullname, role) VALUES (?, ?, ?, ?)');
  for (const u of users) {
    const hash = bcrypt.hashSync(u.password, 10);
    stmt.run(u.username, hash, u.fullname, u.role);
  }
  console.log('✅ Đã tạo tài khoản mặc định:');
  console.log('   👑 admin / admin123 (Quản trị viên)');
  console.log('   👤 nguyenvana / vires123');
  console.log('   👤 tranthib / vires123');
  console.log('   👤 lethic / vires123');
}

seedDefaultAccounts();

// ─── JWT Auth Middleware ────────────────────────────────────
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// ─── Auth API ──────────────────────────────────────────────
app.post('/api/register', (req, res) => {
  const { username, password, fullname, department_id } = req.body;
  if (!username || !password || !fullname) return res.status(400).json({ error: 'Thiếu thông tin đăng ký' });
  const hash = bcrypt.hashSync(password, 10);
  try {
    const stmt = db.prepare('INSERT INTO users (username, password, fullname, role, department_id) VALUES (?, ?, ?, ?, ?)');
    const info = stmt.run(username, hash, fullname, 'user', department_id || null);
    res.json({ success: true, userId: info.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (user && bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, fullname: user.fullname },
      SECRET_KEY
    );
    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role, fullname: user.fullname, avatar: user.avatar }
    });
  } else {
    res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
  }
});

// ─── Departments API ────────────────────────────────────────
app.get('/api/departments', (req, res) => {
  const depts = db.prepare('SELECT * FROM departments ORDER BY sort_order').all();
  res.json(depts);
});

// ─── Users API (Danh bạ) ───────────────────────────────────
app.get('/api/users', authenticateToken, (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.fullname, u.role, u.avatar,
           u.vires_id, u.phone, u.email_work, u.email_personal, u.department_id,
           d.name as department_name, d.short_name as department_short,
           u.created_at
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    ORDER BY u.role DESC, u.fullname ASC
  `).all();
  res.json(users);
});

// ─── Profile Update (tự sửa của mình) ─────────────────────────
app.put('/api/profile', authenticateToken, (req, res) => {
  const { fullname, vires_id, phone, email_work, email_personal, department_id } = req.body;
  if (!fullname) return res.status(400).json({ error: 'Họ và Tên không được để trống' });
  db.prepare(`
    UPDATE users SET fullname=?, vires_id=?, phone=?, email_work=?, email_personal=?, department_id=?
    WHERE id=?
  `).run(fullname, vires_id || null, phone || null, email_work || null, email_personal || null, department_id || null, req.user.id);

  const updated = db.prepare(`
    SELECT u.*, d.name as department_name, d.short_name as department_short
    FROM users u LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.id = ?
  `).get(req.user.id);
  res.json({ success: true, user: { id: updated.id, username: updated.username, role: updated.role, fullname: updated.fullname, avatar: updated.avatar, vires_id: updated.vires_id, phone: updated.phone, email_work: updated.email_work, email_personal: updated.email_personal, department_id: updated.department_id, department_name: updated.department_name } });
});

// ─── Change Password ──────────────────────────────────────────
app.put('/api/profile/password', authenticateToken, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Thiếu thông tin mật khẩu' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });

  const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
  if (!user || !bcrypt.compareSync(oldPassword, user.password)) {
    return res.status(401).json({ error: 'Mật khẩu hiện tại không đúng' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.user.id);

  res.json({ success: true, message: 'Đổi mật khẩu thành công' });
});

// ─── Avatar Upload API ─────────────────────────────────────
app.post('/api/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Không có file ảnh' });

  try {
    const avatarDir = path.join(__dirname, 'public', 'avatars');
    if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

    const outFilename = `avatar-${req.user.id}-${Date.now()}.jpg`;
    const outPath = path.join(avatarDir, outFilename);

    // Resize to 100x100 using sharp
    await sharp(req.file.path)
      .resize(100, 100, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 85 })
      .toFile(outPath);

    // Delete original upload
    fs.unlinkSync(req.file.path);

    const avatarPath = `/avatars/${outFilename}`;
    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatarPath, req.user.id);

    res.json({ success: true, avatar: avatarPath });
  } catch (err) {
    console.error('Avatar resize error:', err);
    res.status(500).json({ error: 'Lỗi xử lý ảnh: ' + err.message });
  }
});

// ─── News API ──────────────────────────────────────────────
app.get('/api/news', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const news = db.prepare(`
    SELECT n.*, u.fullname as author_name
    FROM news n
    JOIN users u ON n.author_id = u.id
    ORDER BY n.created_at DESC LIMIT ?
  `).all(limit);
  res.json(news);
});

app.post('/api/news', authenticateToken, upload.single('image'), async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Chỉ quản trị viên mới có quyền đăng tin' });
  const { title, content, content_md, type } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Thiếu tiêu đề hoặc nội dung' });

  let imagePath = null;
  if (req.file) {
    try {
      const newsImgDir = path.join(__dirname, 'public', 'news-images');
      if (!fs.existsSync(newsImgDir)) fs.mkdirSync(newsImgDir, { recursive: true });
      const outFile = `news-${Date.now()}.jpg`;
      const outPath = path.join(newsImgDir, outFile);
      await sharp(req.file.path)
        .resize(800, 450, { fit: 'cover', position: 'center' })
        .jpeg({ quality: 88 })
        .toFile(outPath);
      fs.unlinkSync(req.file.path);
      imagePath = `/news-images/${outFile}`;
    } catch (e) {
      imagePath = `/uploads/${req.file.filename}`;
    }
  }

  const stmt = db.prepare('INSERT INTO news (title, content, content_md, image, type, author_id) VALUES (?, ?, ?, ?, ?, ?)');
  const info = stmt.run(title, content, content_md || null, imagePath, type || 'news', req.user.id);

  const created = db.prepare('SELECT n.*, u.fullname as author_name FROM news n JOIN users u ON n.author_id=u.id WHERE n.id=?').get(info.lastInsertRowid);
  io.emit('new_post', { title, author_name: req.user.fullname });
  res.json({ success: true, news: created });
});

app.put('/api/news/:id', authenticateToken, upload.single('image'), async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Chỉ quản trị viên mới có quyền sửa tin' });
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM news WHERE id=?').get(id);
  if (!existing) return res.status(404).json({ error: 'Không tìm thấy bản tin' });

  const { title, content, content_md } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Thiếu tiêu đề hoặc nội dung' });

  let imagePath = existing.image;
  if (req.file) {
    try {
      const newsImgDir = path.join(__dirname, 'public', 'news-images');
      if (!fs.existsSync(newsImgDir)) fs.mkdirSync(newsImgDir, { recursive: true });
      const outFile = `news-${Date.now()}.jpg`;
      const outPath = path.join(newsImgDir, outFile);
      await sharp(req.file.path)
        .resize(800, 450, { fit: 'cover', position: 'center' })
        .jpeg({ quality: 88 })
        .toFile(outPath);
      fs.unlinkSync(req.file.path);
      imagePath = `/news-images/${outFile}`;
    } catch (e) {
      imagePath = `/uploads/${req.file.filename}`;
    }
  }
  // If explicitly cleared
  if (req.body.remove_image === '1') imagePath = null;

  db.prepare('UPDATE news SET title=?, content=?, content_md=?, image=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .run(title, content, content_md || null, imagePath, id);

  const updated = db.prepare('SELECT n.*, u.fullname as author_name FROM news n JOIN users u ON n.author_id=u.id WHERE n.id=?').get(id);
  res.json({ success: true, news: updated });
});

app.delete('/api/news/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Chỉ quản trị viên mới có quyền xóa tin' });
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM news WHERE id=?').get(id);
  if (!existing) return res.status(404).json({ error: 'Không tìm thấy bản tin' });

  // Delete image file if local
  if (existing.image && (existing.image.startsWith('/news-images/') || existing.image.startsWith('/uploads/'))) {
    const imgPath = path.join(__dirname, 'public', existing.image);
    try { if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath); } catch (e) { }
  }

  db.prepare('DELETE FROM news WHERE id=?').run(id);
  res.json({ success: true });
});

// ─── Announcements API ──────────────────────────────────────
app.get('/api/announcements', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const announcements = db.prepare(`
    SELECT a.*, u.fullname as author_name
    FROM announcements a
    JOIN users u ON a.author_id = u.id
    ORDER BY a.created_at DESC LIMIT ?
  `).all(limit);
  res.json(announcements);
});

app.post('/api/announcements', authenticateToken, upload.single('image'), (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Chỉ quản trị viên mới có quyền đăng thông báo' });
  const { title, content, content_md } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Thiếu tiêu đề hoặc nội dung' });

  let imageUrl = null;
  if (req.file) {
    imageUrl = '/uploads/' + req.file.filename;
  }

  const stmt = db.prepare('INSERT INTO announcements (title, content, content_md, author_id, image) VALUES (?, ?, ?, ?, ?)');
  const info = stmt.run(title, content, content_md || null, req.user.id, imageUrl);

  const created = db.prepare('SELECT a.*, u.fullname as author_name FROM announcements a JOIN users u ON a.author_id=u.id WHERE a.id=?').get(info.lastInsertRowid);
  io.emit('new_announcement', { title, author_name: req.user.fullname });
  res.json({ success: true, announcement: created });
});

app.put('/api/announcements/:id', authenticateToken, upload.single('image'), (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Chỉ quản trị viên mới có quyền sửa thông báo' });
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM announcements WHERE id=?').get(id);
  if (!existing) return res.status(404).json({ error: 'Không tìm thấy thông báo' });

  const { title, content, content_md, remove_image } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Thiếu tiêu đề hoặc nội dung' });

  let imageUrl = existing.image;
  if (req.file) {
    // Delete old image if exists
    if (existing.image) {
      const oldPath = path.join(__dirname, 'public', existing.image);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    imageUrl = '/uploads/' + req.file.filename;
  } else if (remove_image === '1') {
    if (existing.image) {
      const oldPath = path.join(__dirname, 'public', existing.image);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    imageUrl = null;
  }

  db.prepare('UPDATE announcements SET title=?, content=?, content_md=?, image=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .run(title, content, content_md || null, imageUrl, id);

  const updated = db.prepare('SELECT a.*, u.fullname as author_name FROM announcements a JOIN users u ON a.author_id=u.id WHERE a.id=?').get(id);
  res.json({ success: true, announcement: updated });
});

app.delete('/api/announcements/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Chỉ quản trị viên mới có quyền xóa thông báo' });
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM announcements WHERE id=?').get(id);
  if (existing && existing.image) {
    const imgPath = path.join(__dirname, 'public', existing.image);
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  }
  db.prepare('DELETE FROM announcements WHERE id=?').run(id);
  res.json({ success: true });
});

// ─── Tasks API ─────────────────────────────────────────────

app.get('/api/tasks', authenticateToken, (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY deadline ASC').all(req.user.id);
  res.json(tasks);
});

app.post('/api/tasks', authenticateToken, (req, res) => {
  const { title, deadline } = req.body;
  if (!title || !deadline) return res.status(400).json({ error: 'Thiếu thông tin công việc' });
  const stmt = db.prepare('INSERT INTO tasks (user_id, title, deadline) VALUES (?, ?, ?)');
  stmt.run(req.user.id, title, deadline);
  res.json({ success: true });
});

app.delete('/api/tasks/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const task = db.prepare('SELECT user_id FROM tasks WHERE id = ?').get(id);
  if (!task) return res.status(404).json({ error: 'Không tìm thấy công việc' });
  if (task.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Bạn không có quyền xóa công việc này' });
  }
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  res.json({ success: true });
});

// ─── Direct Messages API ────────────────────────────────────

// Lấy danh sách conversations (gần nhất + unread count)
app.get('/api/dm/conversations', authenticateToken, (req, res) => {
  const myId = req.user.id;
  const convos = db.prepare(`
    SELECT 
      u.id, u.fullname, u.avatar,
      (SELECT content FROM direct_messages 
       WHERE (sender_id = ? AND receiver_id = u.id) OR (sender_id = u.id AND receiver_id = ?)
       ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT created_at FROM direct_messages 
       WHERE (sender_id = ? AND receiver_id = u.id) OR (sender_id = u.id AND receiver_id = ?)
       ORDER BY created_at DESC LIMIT 1) as last_time,
      (SELECT COUNT(*) FROM direct_messages 
       WHERE sender_id = u.id AND receiver_id = ? AND read_at IS NULL) as unread
    FROM users u
    WHERE u.id != ?
    ORDER BY last_time DESC NULLS LAST, u.fullname ASC
  `).all(myId, myId, myId, myId, myId, myId);
  res.json(convos);
});

// ─── DM File Upload API ────────────────────────────────────
app.post('/api/dm/upload', authenticateToken, dmUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Không có file hoặc loại file không được phép' });
  const receiverId = parseInt(req.body.receiverId);
  if (!receiverId) return res.status(400).json({ error: 'Thiếu receiverId' });

  const filePath = '/uploads/dm/' + req.file.filename;
  const fileName = req.file.originalname;
  const expiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days

  const stmt = db.prepare(
    'INSERT INTO direct_messages (sender_id, receiver_id, content, file_path, file_name, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const info = stmt.run(req.user.id, receiverId, `📎 ${fileName}`, filePath, fileName, expiresAt);

  const newMsg = {
    id: info.lastInsertRowid,
    sender_id: req.user.id,
    receiver_id: receiverId,
    sender_name: req.user.fullname,
    content: `📎 ${fileName}`,
    file_path: filePath,
    file_name: fileName,
    created_at: new Date().toISOString(),
    read_at: null
  };

  io.to(`user:${receiverId}`).emit('dm_message', newMsg);
  io.to(`user:${req.user.id}`).emit('dm_message', newMsg);

  const newUnread = db.prepare('SELECT COUNT(*) as count FROM direct_messages WHERE receiver_id = ? AND read_at IS NULL').get(receiverId);
  io.to(`user:${receiverId}`).emit('unread_total', newUnread.count);
  io.to(`user:${receiverId}`).emit('dm_notify', { from_id: req.user.id, from_name: req.user.fullname, content: `📎 ${fileName}` });

  res.json({ success: true, message: newMsg });
});

// ─── Online count API ──────────────────────────────────────
app.get('/api/stats/online', (req, res) => {
  const online = io.sockets.sockets.size;
  const visitors = db.prepare('SELECT setting_value FROM system_settings WHERE setting_key = ?').get('total_visitors');
  res.json({ online, totalVisitors: parseInt(visitors?.setting_value || '0') });
});

// Lấy messages với 1 người
app.get('/api/dm/:userId', authenticateToken, (req, res) => {
  const myId = req.user.id;
  const otherId = parseInt(req.params.userId);
  const messages = db.prepare(`
    SELECT dm.*, 
      s.fullname as sender_name, s.avatar as sender_avatar
    FROM direct_messages dm
    JOIN users s ON dm.sender_id = s.id
    WHERE (dm.sender_id = ? AND dm.receiver_id = ?)
       OR (dm.sender_id = ? AND dm.receiver_id = ?)
    ORDER BY dm.created_at ASC
    LIMIT 100
  `).all(myId, otherId, otherId, myId);

  // Mark as read
  db.prepare(`UPDATE direct_messages SET read_at = CURRENT_TIMESTAMP 
    WHERE sender_id = ? AND receiver_id = ? AND read_at IS NULL`)
    .run(otherId, myId);

  res.json(messages);
});

// Tổng số unread
app.get('/api/dm/unread', authenticateToken, (req, res) => {
  const total = db.prepare(
    'SELECT COUNT(*) as count FROM direct_messages WHERE receiver_id = ? AND read_at IS NULL'
  ).get(req.user.id);
  res.json({ total: total.count });
});

// ─── Admin: Account Management ─────────────────────────────
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Chỉ quản trị viên mới có quyền' });
  next();
}

// Lấy danh sách all users (full info)
app.get('/api/admin/accounts', authenticateToken, requireAdmin, (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.fullname, u.role, u.avatar,
           u.vires_id, u.phone, u.email_work, u.email_personal, u.department_id,
           d.name as department_name, d.short_name as department_short,
           u.created_at
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    ORDER BY u.role DESC, u.fullname ASC
  `).all();
  res.json(users);
});

// Tạo tài khoản mới (admin)
app.post('/api/admin/accounts', authenticateToken, requireAdmin, (req, res) => {
  const { username, password, fullname, role, vires_id, phone, email_work, email_personal, department_id } = req.body;
  if (!username || !password || !fullname) return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
  const hash = bcrypt.hashSync(password, 10);
  try {
    const info = db.prepare(`
      INSERT INTO users (username, password, fullname, role, vires_id, phone, email_work, email_personal, department_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(username, hash, fullname, role || 'user', vires_id || null, phone || null, email_work || null, email_personal || null, department_id || null);
    res.json({ success: true, id: info.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
  }
});

// Cập nhật tài khoản (admin)
app.put('/api/admin/accounts/:id', authenticateToken, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const { username, password, fullname, role, vires_id, phone, email_work, email_personal, department_id } = req.body;
  if (!fullname) return res.status(400).json({ error: 'Họ và Tên không được để trống' });

  if (password && password.trim()) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare(`UPDATE users SET password=?, fullname=?, role=?, vires_id=?, phone=?, email_work=?, email_personal=?, department_id=? WHERE id=?`)
      .run(hash, fullname, role || 'user', vires_id || null, phone || null, email_work || null, email_personal || null, department_id || null, id);
  } else {
    db.prepare(`UPDATE users SET fullname=?, role=?, vires_id=?, phone=?, email_work=?, email_personal=?, department_id=? WHERE id=?`)
      .run(fullname, role || 'user', vires_id || null, phone || null, email_work || null, email_personal || null, department_id || null, id);
  }
  res.json({ success: true });
});

// Xóa tài khoản (admin)
app.delete('/api/admin/accounts/:id', authenticateToken, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: 'Không thể xóa tài khoản đang đăng nhập' });
  db.prepare('DELETE FROM direct_messages WHERE sender_id = ? OR receiver_id = ?').run(id, id);
  db.prepare('DELETE FROM tasks WHERE user_id = ?').run(id);
  db.prepare('DELETE FROM messages WHERE user_id = ?').run(id);
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ success: true });
});

// ─── Socket.io (Chat) ──────────────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Xác thực thất bại'));
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return next(new Error('Xác thực thất bại'));
    socket.user = user;
    next();
  });
});

let isChatEnabled = true;

// ─── Caro State ────────────────────────────────────────────
let caroWaitingQueue = []; // { socket, id, fullname, avatar }
let caroRooms = {}; // { roomId: { players: [socketId1, socketId2], board:[], turn: 'X'|'O' } }

// ─── Ba Lá State ───────────────────────────────────────────
let balaWaitingQueue = [];
let balaRooms = {};

// Ba Lá helper: tạo bộ bài 52 lá
function createDeck() {
  const suits = ['spade', 'heart', 'diamond', 'club'];
  const deck = [];
  for (const suit of suits) {
    for (let rank = 1; rank <= 13; rank++) {
      // value: A=1, 2-9=face, 10/J/Q/K=0 (bài cào)
      const value = rank >= 10 ? 0 : rank;
      deck.push({ rank, suit, value });
    }
  }
  return deck;
}

function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function dealBalaCards() {
  const deck = shuffleDeck(createDeck());
  return deck.slice(0, 3);
}

function calcBalaScore(cards) {
  const total = cards.reduce((sum, c) => sum + c.value, 0);
  return total % 10;
}

// Check win 3x3
function checkCaroWin(board) {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
        [0, 4, 8], [2, 4, 6]             // Diags
    ];
    for (const [a, b, c] of lines) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return { winner: board[a], line: [a, b, c] };
        }
    }
    if (!board.includes(null)) return { winner: 'draw', line: [] };
    return null;
}

io.on('connection', (socket) => {
  console.log(`🟢 ${socket.user.fullname} đã kết nối`);

  // Increment visitor count
  db.prepare('UPDATE system_settings SET setting_value = CAST(CAST(setting_value AS INTEGER) + 1 AS TEXT) WHERE setting_key = ?').run('total_visitors');

  // Broadcast online count
  io.emit('online_count', io.sockets.sockets.size);
  
  // Gửi trạng thái chat hiện tại
  socket.emit('chat_status', isChatEnabled);

  // Join personal room for DM delivery
  socket.join(`user:${socket.user.id}`);

  const lastMessages = db.prepare(`
    SELECT m.*, u.fullname, u.avatar
    FROM messages m
    JOIN users u ON m.user_id = u.id
    ORDER BY m.created_at DESC LIMIT 50
  `).all().reverse();
  socket.emit('init_messages', lastMessages);

  // Gửi unread count khi vừa kết nối
  const unreadCount = db.prepare(
    'SELECT COUNT(*) as count FROM direct_messages WHERE receiver_id = ? AND read_at IS NULL'
  ).get(socket.user.id);
  socket.emit('unread_total', unreadCount.count);

  // ─── Reactions Logic ────────────────────────────────────
  function handleReaction(table, msgId, emoji) {
    try {
      const msg = db.prepare(`SELECT reactions FROM ${table} WHERE id = ?`).get(msgId);
      if (!msg) return null;

      let reactions = {};
      try { reactions = JSON.parse(msg.reactions || '{}'); } catch (e) { reactions = {}; }

      const userId = socket.user.id;
      const userName = socket.user.fullname;

      // Structure: { "👍": { "1": "User A", "2": "User B" }, "❤️": { "3": "User C" } }
      if (!reactions[emoji]) reactions[emoji] = {};

      if (reactions[emoji][userId]) {
        // Same emoji → toggle off
        delete reactions[emoji][userId];
        if (Object.keys(reactions[emoji]).length === 0) delete reactions[emoji];
      } else {
        // Different emoji → remove previous reaction from this user first (1 emoji limit)
        Object.keys(reactions).forEach(e => {
          if (reactions[e][userId]) {
            delete reactions[e][userId];
            if (Object.keys(reactions[e]).length === 0) delete reactions[e];
          }
        });
        reactions[emoji][userId] = userName;

      }

      const reactionsStr = JSON.stringify(reactions);
      db.prepare(`UPDATE ${table} SET reactions = ? WHERE id = ?`).run(reactionsStr, msgId);

      return reactions;
    } catch (err) {
      console.error(`Reaction error in ${table}:`, err);
      return null;
    }
  }

  socket.on('message_react', ({ msgId, emoji }) => {
    const updatedReactions = handleReaction('messages', msgId, emoji);
    if (updatedReactions) {
      io.emit('message_react_update', { msgId, reactions: updatedReactions });
    }
  });

  socket.on('dm_react', ({ msgId, emoji, receiverId }) => {
    const updatedReactions = handleReaction('direct_messages', msgId, emoji);
    if (updatedReactions) {
      io.to(`user:${receiverId}`).emit('dm_react_update', { msgId, reactions: updatedReactions });
      socket.emit('dm_react_update', { msgId, reactions: updatedReactions });
    }
  });

  socket.on('send_message', (content) => {
    if (!isChatEnabled && socket.user.role !== 'admin') return;
    if (!content || !content.trim()) return;
    const stmt = db.prepare('INSERT INTO messages (user_id, content) VALUES (?, ?)');
    const info = stmt.run(socket.user.id, content.trim());

    io.emit('message', {
      id: info.lastInsertRowid,
      user_id: socket.user.id,
      fullname: socket.user.fullname,
      content: content.trim(),
      created_at: new Date()
    });
  });

  // ─── Admin Chat Controls ────────────────────────────────
  socket.on('admin_toggle_chat', () => {
    if (socket.user.role !== 'admin') return;
    isChatEnabled = !isChatEnabled;
    io.emit('chat_status', isChatEnabled);
  });

  socket.on('admin_clear_chat', () => {
    if (socket.user.role !== 'admin') return;
    db.prepare('DELETE FROM messages').run();
    io.emit('chat_cleared');
  });

  socket.on('delete_message', (msgId) => {
    const msg = db.prepare('SELECT user_id FROM messages WHERE id = ?').get(msgId);
    if (!msg) return;
    
    // Only author or admin can delete
    if (msg.user_id === socket.user.id || socket.user.role === 'admin') {
      db.prepare('DELETE FROM messages WHERE id = ?').run(msgId);
      io.emit('message_deleted', msgId);
    }
  });

  // ─── Polls Logic ─────────────────────────────────────────
  socket.on('submit_vote', ({ pollId, optionId }) => {
    if (!pollId || !optionId) return;
    try {
      // Check if expired
      const pollInfo = db.prepare('SELECT expires_at FROM polls WHERE id = ?').get(pollId);
      if (!pollInfo || pollInfo.expires_at < Date.now()) {
        socket.emit('poll_error', { message: 'Bình chọn đã kết thúc, không thể bỏ phiếu.' });
        return;
      }

      db.prepare('INSERT INTO poll_votes (poll_id, option_id, user_id) VALUES (?, ?, ?)').run(pollId, optionId, socket.user.id);
    } catch(err) {
      // Ignore if user already voted or DB error
      return;
    }

    const votes = db.prepare('SELECT option_id, COUNT(*) as vote_count FROM poll_votes WHERE poll_id = ? GROUP BY option_id').all(pollId);
    const totalVotes = votes.reduce((sum, v) => sum + v.vote_count, 0);
    
    io.emit('poll_updated', {
      pollId,
      totalVotes,
      votes: votes.map(v => ({
        option_id: v.option_id,
        count: v.vote_count,
        percent: totalVotes > 0 ? Math.round((v.vote_count / totalVotes) * 100) : 0
      }))
    });
  });

  // ─── DM Events ──────────────────────────────────────────
  socket.on('dm_send', ({ receiverId, content }) => {
    if (!content || !content.trim() || !receiverId) return;
    const text = content.trim();

    const stmt = db.prepare(
      'INSERT INTO direct_messages (sender_id, receiver_id, content) VALUES (?, ?, ?)'
    );
    const info = stmt.run(socket.user.id, receiverId, text);

    const newMsg = {
      id: info.lastInsertRowid,
      sender_id: socket.user.id,
      receiver_id: receiverId,
      sender_name: socket.user.fullname,
      content: text,
      created_at: new Date().toISOString(),
      read_at: null
    };

    // Gửi tới người nhận (nếu online)
    io.to(`user:${receiverId}`).emit('dm_message', newMsg);
    // Gửi lại cho chính mình (để confirm)
    socket.emit('dm_message', newMsg);

    // Cập nhật unread count cho receiver
    const newUnread = db.prepare(
      'SELECT COUNT(*) as count FROM direct_messages WHERE receiver_id = ? AND read_at IS NULL'
    ).get(receiverId);
    io.to(`user:${receiverId}`).emit('unread_total', newUnread.count);

    // Gửi DM notification tới receiver
    io.to(`user:${receiverId}`).emit('dm_notify', {
      from_id: socket.user.id,
      from_name: socket.user.fullname,
      content: text
    });
  });

  // ─── DM Delete Message ─────────────────────────────────
  socket.on('dm_delete_message', ({ msgId, peerId }) => {
    const msg = db.prepare('SELECT sender_id, file_path FROM direct_messages WHERE id = ?').get(msgId);
    if (!msg) return;
    if (msg.sender_id !== socket.user.id) return; // Only sender can delete

    // Delete file if exists
    if (msg.file_path) {
      const fullPath = path.join(__dirname, 'public', msg.file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    db.prepare('DELETE FROM direct_messages WHERE id = ?').run(msgId);
    socket.emit('dm_message_deleted', msgId);
    if (peerId) io.to(`user:${peerId}`).emit('dm_message_deleted', msgId);
  });

  socket.on('dm_mark_read', ({ senderId }) => {
    db.prepare(`UPDATE direct_messages SET read_at = CURRENT_TIMESTAMP 
      WHERE sender_id = ? AND receiver_id = ? AND read_at IS NULL`)
      .run(senderId, socket.user.id);

    const newUnread = db.prepare(
      'SELECT COUNT(*) as count FROM direct_messages WHERE receiver_id = ? AND read_at IS NULL'
    ).get(socket.user.id);
    socket.emit('unread_total', newUnread.count);
  });

  // ─── Caro Game Events ───────────────────────────────────
  socket.on('caro_join_queue', (userProfile) => {
    // Ngăn chặn 1 người join 2 lần
    if (caroWaitingQueue.find(p => p.socket.id === socket.id)) return;
    
    const player = { socket, info: userProfile };
    caroWaitingQueue.push(player);
    
    if (caroWaitingQueue.length >= 2) {
      const p1 = caroWaitingQueue.shift();
      const p2 = caroWaitingQueue.shift();
      const roomId = 'caro_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      
      p1.socket.join(roomId);
      p2.socket.join(roomId);
      p1.socket.caroRoomId = roomId;
      p2.socket.caroRoomId = roomId;
      
      caroRooms[roomId] = {
        p1: { socket: p1.socket, info: p1.info, symbol: 'X' },
        p2: { socket: p2.socket, info: p2.info, symbol: 'O' },
        board: Array(9).fill(null),
        turn: 'X',
        status: 'playing',
        rematchVotes: []
      };
      
      // Let players know match is found
      p1.socket.emit('caro_match_found', { roomId, opponent: p2.info, symbol: 'X', turn: 'X' });
      p2.socket.emit('caro_match_found', { roomId, opponent: p1.info, symbol: 'O', turn: 'X' });
    }
  });

  socket.on('caro_leave_queue', () => {
    caroWaitingQueue = caroWaitingQueue.filter(p => p.socket.id !== socket.id);
  });

  socket.on('caro_make_move', ({ roomId, index, symbol }) => {
    const room = caroRooms[roomId];
    if (!room) return;
    
    // Validate turn
    if (room.turn !== symbol || room.board[index] !== null) return;
    
    room.board[index] = symbol;
    room.turn = symbol === 'X' ? 'O' : 'X';
    
    const winResult = checkCaroWin(room.board);
    if (winResult) {
      io.to(roomId).emit('caro_update', { board: room.board, turn: room.turn, winner: winResult.winner, winLine: winResult.line });
      room.status = 'finished'; // Giữ lại room để chờ rematch
    } else {
      io.to(roomId).emit('caro_update', { board: room.board, turn: room.turn });
    }
  });

  socket.on('caro_request_rematch', () => {
    const roomId = socket.caroRoomId;
    const room = caroRooms[roomId];
    if (room && room.status === 'finished') {
      if (!room.rematchVotes.includes(socket.id)) {
        room.rematchVotes.push(socket.id);
      }
      if (room.rematchVotes.length === 2) {
        // Cả 2 đồng ý -> Đổi symbol
        room.p1.symbol = room.p1.symbol === 'X' ? 'O' : 'X';
        room.p2.symbol = room.p2.symbol === 'X' ? 'O' : 'X';
        room.board = Array(9).fill(null);
        room.turn = 'X';
        room.status = 'playing';
        room.rematchVotes = [];
        
        // Gửi hiệu lệnh bắt đầu
        room.p1.socket.emit('caro_rematch_started', { symbol: room.p1.symbol, turn: 'X' });
        room.p2.socket.emit('caro_rematch_started', { symbol: room.p2.symbol, turn: 'X' });
      }
    }
  });

  socket.on('caro_leave_match', () => {
    const roomId = socket.caroRoomId;
    if (roomId && caroRooms[roomId]) {
      socket.to(roomId).emit('caro_enemy_left');
      delete caroRooms[roomId];
    }
  });

  // ─── Ba Lá (3-Card) Game Events ─────────────────────
  socket.on('bala_join_queue', (userProfile) => {
    if (balaWaitingQueue.find(p => p.socket.id === socket.id)) return;
    const player = { socket, info: userProfile };
    balaWaitingQueue.push(player);

    if (balaWaitingQueue.length >= 2) {
      const p1 = balaWaitingQueue.shift();
      const p2 = balaWaitingQueue.shift();
      const roomId = 'bala_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

      p1.socket.join(roomId);
      p2.socket.join(roomId);
      p1.socket.balaRoomId = roomId;
      p2.socket.balaRoomId = roomId;

      const p1Cards = dealBalaCards();
      const p2Cards = dealBalaCards();

      balaRooms[roomId] = {
        p1: { socket: p1.socket, info: p1.info, cards: p1Cards, flipped: 0, ready: false },
        p2: { socket: p2.socket, info: p2.info, cards: p2Cards, flipped: 0, ready: false },
        status: 'playing',
        rematchVotes: []
      };

      p1.socket.emit('bala_match_found', { roomId, opponent: p2.info, cards: p1Cards });
      p2.socket.emit('bala_match_found', { roomId, opponent: p1.info, cards: p2Cards });
    }
  });

  socket.on('bala_leave_queue', () => {
    balaWaitingQueue = balaWaitingQueue.filter(p => p.socket.id !== socket.id);
  });

  socket.on('bala_flip_card', ({ roomId, index }) => {
    const room = balaRooms[roomId];
    if (!room) return;
    const player = room.p1.socket.id === socket.id ? room.p1 : room.p2;
    player.flipped = Math.min(player.flipped + 1, 3);
  });

  socket.on('bala_compare', ({ roomId }) => {
    const room = balaRooms[roomId];
    if (!room || room.status !== 'playing') return;

    const player = room.p1.socket.id === socket.id ? room.p1 : room.p2;
    player.ready = true;

    // Cả 2 đều sẵn sàng → so điểm
    if (room.p1.ready && room.p2.ready) {
      const s1 = calcBalaScore(room.p1.cards);
      const s2 = calcBalaScore(room.p2.cards);
      room.status = 'finished';

      let r1 = 'draw', r2 = 'draw';
      if (s1 > s2) { r1 = 'win'; r2 = 'lose'; }
      else if (s2 > s1) { r1 = 'lose'; r2 = 'win'; }

      room.p1.socket.emit('bala_result', {
        myScore: s1, enemyScore: s2, result: r1,
        myCards: room.p1.cards, enemyCards: room.p2.cards
      });
      room.p2.socket.emit('bala_result', {
        myScore: s2, enemyScore: s1, result: r2,
        myCards: room.p2.cards, enemyCards: room.p1.cards
      });
    }
  });

  socket.on('bala_request_rematch', () => {
    const roomId = socket.balaRoomId;
    const room = balaRooms[roomId];
    if (room && room.status === 'finished') {
      if (!room.rematchVotes.includes(socket.id)) {
        room.rematchVotes.push(socket.id);
      }
      if (room.rematchVotes.length === 2) {
        room.p1.cards = dealBalaCards();
        room.p2.cards = dealBalaCards();
        room.p1.flipped = 0; room.p1.ready = false;
        room.p2.flipped = 0; room.p2.ready = false;
        room.status = 'playing';
        room.rematchVotes = [];

        room.p1.socket.emit('bala_rematch_started', { cards: room.p1.cards });
        room.p2.socket.emit('bala_rematch_started', { cards: room.p2.cards });
      }
    }
  });

  socket.on('bala_leave_match', () => {
    const roomId = socket.balaRoomId;
    if (roomId && balaRooms[roomId]) {
      socket.to(roomId).emit('bala_enemy_left');
      delete balaRooms[roomId];
    }
  });

  // ─── Disconnect (cleanup cả Caro lẫn Ba Lá) ───────
  socket.on('disconnect', () => {
    caroWaitingQueue = caroWaitingQueue.filter(p => p.socket.id !== socket.id);
    const caroRoom = socket.caroRoomId;
    if (caroRoom && caroRooms[caroRoom]) {
      socket.to(caroRoom).emit('caro_enemy_left');
      delete caroRooms[caroRoom];
    }

    balaWaitingQueue = balaWaitingQueue.filter(p => p.socket.id !== socket.id);
    const balaRoom = socket.balaRoomId;
    if (balaRoom && balaRooms[balaRoom]) {
      socket.to(balaRoom).emit('bala_enemy_left');
      delete balaRooms[balaRoom];
    }

    console.log(`🔴 ${socket.user.fullname} đã ngắt kết nối`);

    // Broadcast updated online count
    io.emit('online_count', io.sockets.sockets.size);
  });
});

// ─── Cleanup expired DM files (every hour) ─────────────────
setInterval(() => {
  try {
    const expired = db.prepare(
      "SELECT id, file_path FROM direct_messages WHERE file_path IS NOT NULL AND expires_at IS NOT NULL AND expires_at < datetime('now')"
    ).all();
    for (const row of expired) {
      const fullPath = path.join(__dirname, 'public', row.file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      db.prepare('UPDATE direct_messages SET file_path = NULL, file_name = NULL, content = ? WHERE id = ?')
        .run('📎 File đã hết hạn (tự xóa sau 2 ngày)', row.id);
    }
    if (expired.length > 0) console.log(`🗑️ Đã dọn ${expired.length} file DM hết hạn`);
  } catch (e) { /* ignore */ }
}, 60 * 60 * 1000); // 1 hour

server.listen(PORT, () => {
  console.log(`\n🚀 VIRES Hub đang chạy tại: http://localhost:${PORT}`);
  console.log(`   Truy cập từ mạng nội bộ: http://<IP-máy>:${PORT}\n`);
});
