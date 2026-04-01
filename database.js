const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'database.db');
const db = new Database(DB_PATH);

// ─── Schema ────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    short_name TEXT,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    fullname TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    avatar TEXT,
    vires_id TEXT,
    phone TEXT,
    email_work TEXT,
    email_personal TEXT,
    department_id INTEGER REFERENCES departments(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image TEXT,
    author_id INTEGER,
    type TEXT DEFAULT 'news',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(author_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    content TEXT NOT NULL,
    reactions TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );


  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT NOT NULL,
    deadline DATETIME,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS direct_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    read_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sender_id) REFERENCES users(id),
    FOREIGN KEY(receiver_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_md TEXT,
    image TEXT,
    author_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(author_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS system_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS polls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    created_by INTEGER,
    expires_at INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS poll_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_id INTEGER NOT NULL,
    option_text TEXT NOT NULL,
    FOREIGN KEY(poll_id) REFERENCES polls(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS poll_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_id INTEGER NOT NULL,
    option_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(poll_id) REFERENCES polls(id) ON DELETE CASCADE,
    FOREIGN KEY(option_id) REFERENCES poll_options(id) ON DELETE CASCADE,
    UNIQUE(poll_id, user_id)
  );
`);

// Migration: add image column if missing (safe for existing DBs)
try {
  db.prepare('ALTER TABLE announcements ADD COLUMN image TEXT').run();
} catch (e) { /* column already exists */ }

// Migration: Polls v2 (with expires_at limit)
try {
  db.prepare('SELECT expires_at FROM polls LIMIT 1').get();
} catch (e) {
  // If column doesn't exist, drop old poll tables and recreate
  console.log('Migrating Polls table to v2 (adding expires_at)...');
  db.exec(`
    DROP TABLE IF EXISTS poll_votes;
    DROP TABLE IF EXISTS poll_options;
    DROP TABLE IF EXISTS polls;
    
    CREATE TABLE IF NOT EXISTS polls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      created_by INTEGER,
      expires_at INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(created_by) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS poll_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poll_id INTEGER NOT NULL,
      option_text TEXT NOT NULL,
      FOREIGN KEY(poll_id) REFERENCES polls(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS poll_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poll_id INTEGER NOT NULL,
      option_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(poll_id) REFERENCES polls(id) ON DELETE CASCADE,
      FOREIGN KEY(option_id) REFERENCES poll_options(id) ON DELETE CASCADE,
      UNIQUE(poll_id, user_id)
    );
  `);
}

// Seed system settings
const lockCheck = db.prepare('SELECT setting_value FROM system_settings WHERE setting_key = ?').get('poll_creation_locked');
if (!lockCheck) {
  db.prepare('INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?)').run('poll_creation_locked', 'false');
}

// ─── Migrate existing DB: add new user columns if missing ──
const alterCols = ['vires_id TEXT', 'phone TEXT', 'email_work TEXT', 'email_personal TEXT', 'department_id INTEGER'];
for (const col of alterCols) {
  try { db.exec(`ALTER TABLE users ADD COLUMN ${col}`); } catch (e) { /* already exists */ }
}

// ─── Migrate news table ────────────────────────────────────
const newsAlterCols = ['content_md TEXT', 'updated_at DATETIME'];
for (const col of newsAlterCols) {
  try { db.exec(`ALTER TABLE news ADD COLUMN ${col}`); } catch (e) { /* already exists */ }
}

// ─── Migrate message tables: add reactions column ───────────
const msgTables = ['messages', 'direct_messages'];
for (const table of msgTables) {
  try { db.exec(`ALTER TABLE ${table} ADD COLUMN reactions TEXT DEFAULT '{}'`); } catch (e) { /* already exists */ }
}

// ─── Seed departments ─────────────────────────────────────
const deptCount = db.prepare('SELECT COUNT(*) as c FROM departments').get().c;
if (deptCount === 0) {
  const insertDept = db.prepare('INSERT OR IGNORE INTO departments (id, name, short_name, sort_order) VALUES (?, ?, ?, ?)');
  const depts = [
    [1, 'Ban Giám đốc', 'BGĐ', 0],
    [2, 'Phòng Tổ chức - Hành chính', 'TCHC', 1],
    [3, 'Phòng Tài chính kế toán', 'TCKK', 2],
    [4, 'Phòng Tàu biển (Ship Survey Department)', 'SSD', 3],
    [5, 'Phòng Công trình biển (Offshore Oil and Gas Installation Department)', 'OGD', 4],
    [6, 'Phòng Thẩm định thiết kế (Rule Development and Plan Approval Department)', 'RPA', 5],
    [7, 'Phòng Phương tiện thủy nội địa (Inland Waterway Department)', 'IWD', 6],
    [8, 'Phòng Chứng nhận hệ thống (Management System Certification Department)', 'MSC', 7],
  ];
  for (const d of depts) insertDept.run(...d);
  console.log('✅ Đã nạp danh mục 8 phòng ban VIRES');
}

module.exports = db;
