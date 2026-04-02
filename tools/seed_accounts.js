/**
 * Seed accounts from DS_Nhan_Su_VIRES.xlsx
 * Rule from 3 examples:
 *   "Vũ Anh"          → "anhv"     (firstName + initials of remaining)
 *   "Trần Hiếu Nhân"  → "nhanth"   (firstName + initials of remaining)
 *   "Đỗ Đức Huy"      → "huydd"    (firstName + initials of remaining)
 */
const XLSX = require('xlsx');
const path = require('path');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'database.db');
const db = new Database(DB_PATH);

// Vietnamese diacritic remover
function removeDiacritics(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

// Generate username: firstName (lowercase, no diacritics) + initials of remaining parts
function generateUsername(fullname) {
  const parts = fullname.trim().split(/\s+/);
  if (parts.length === 0) return '';
  // Last word = first name
  const firstName = removeDiacritics(parts[parts.length - 1]).toLowerCase();
  // All preceding words → take first letter of each
  const initials = parts.slice(0, -1)
    .map(p => removeDiacritics(p).charAt(0).toLowerCase())
    .join('');
  return firstName + initials;
}

// Department mapping: short name in Excel → department_id in DB
const DEPT_MAP = {
  'BGĐ': 1,        // Ban Giám đốc
  'P. TCHC': 2,     // Phòng Tổ chức - Hành chính
  'P. TCKT': 3,     // Phòng Tài chính kế toán
  'P. Tàu biển': 4, // Phòng Tàu biển
  'P. CTB': 5,      // Phòng Công trình biển
  'P. TĐTK': 6,     // Phòng Thẩm định thiết kế
  'P. PTTNĐ': 7,    // Phòng Phương tiện thủy nội địa
  'P.CNHT': 8,      // Phòng Chứng nhận hệ thống
};

// Role mapping
function mapRole(title) {
  if (!title) return 'user';
  const t = title.trim();
  if (t.includes('Giám đốc')) return 'manager';
  if (t.includes('Trưởng phòng') || t.includes('Phó Trưởng phòng')) return 'manager';
  return 'user';
}

// ─── Main ──────────────────────────────────────────────────
const wb = XLSX.readFile(path.join(__dirname, '..', 'DS_Nhan_Su_VIRES.xlsx'));
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

// Step 1: Clear all existing users and related data
console.log('🗑️  Xóa toàn bộ dữ liệu cũ...');
db.pragma('foreign_keys = OFF');
db.exec('DELETE FROM poll_votes');
db.exec('DELETE FROM direct_messages');
db.exec('DELETE FROM messages');
db.exec('DELETE FROM tasks');
db.exec('DELETE FROM news');
db.exec('DELETE FROM users');
db.exec("DELETE FROM sqlite_sequence WHERE name='users'");
db.pragma('foreign_keys = ON');

const defaultHash = bcrypt.hashSync('vires123', 10);
const adminHash = bcrypt.hashSync('admin123', 10);

const insert = db.prepare(`
  INSERT INTO users (username, password, fullname, role, department_id) 
  VALUES (?, ?, ?, ?, ?)
`);

// Step 2: Insert admin account first
insert.run('admin', adminHash, 'Quản Trị Viên', 'admin', null);
console.log('✅ Tạo account: admin (admin123)');

// Step 3: Insert all staff from Excel
let count = 0;
const usernameTracker = {};

for (let i = 1; i < rows.length; i++) { // Skip header row 0
  const row = rows[i];
  if (!row || !row[1]) continue; // Skip empty rows

  const deptShort = row[0];
  const fullname = row[1].trim();
  const title = row[2] ? row[2].trim() : '';
  const explicitAccount = row[3]; // First 3 rows have explicit account names

  let username = explicitAccount 
    ? String(explicitAccount).trim().toLowerCase()
    : generateUsername(fullname);

  // Handle duplicates by appending number
  if (usernameTracker[username]) {
    usernameTracker[username]++;
    username = username + usernameTracker[username];
  } else {
    usernameTracker[username] = 1;
  }

  const deptId = DEPT_MAP[deptShort] || null;
  const role = mapRole(title);

  try {
    insert.run(username, defaultHash, fullname, role, deptId);
    count++;
    console.log(`  ✅ ${username.padEnd(20)} | ${fullname.padEnd(25)} | ${deptShort || ''} | ${title}`);
  } catch (e) {
    console.error(`  ❌ FAILED: ${username} (${fullname}): ${e.message}`);
  }
}

console.log(`\n🎉 Hoàn tất! Đã tạo ${count} tài khoản nhân viên + 1 admin.`);
console.log(`   Password mặc định: vires123`);
console.log(`   Admin password: admin123`);

db.close();
