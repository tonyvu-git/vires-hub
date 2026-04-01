const xlsx = require('xlsx');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'database.db');
const XLSX_PATH = path.join(__dirname, 'DanhSachNhanSu(full).xlsx');
const DEFAULT_PASSWORD = 'vires123';

if (!fs.existsSync(XLSX_PATH)) {
    console.error('❌ Không tìm thấy tệp DanhSachNhanSu(full).xlsx');
    process.exit(1);
}

const db = new Database(DB_PATH);
const hash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);

const workbook = xlsx.readFile(XLSX_PATH);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

const stmtInsert = db.prepare('INSERT OR IGNORE INTO users (username, password, fullname, role) VALUES (?, ?, ?, ?)');
const stmtUpdate = db.prepare('UPDATE users SET fullname = ? WHERE username = ?');

let newCount = 0;
let updateCount = 0;

for (let row of data) {
    if (!row || row.length < 2) continue;
    
    const fullname = String(row[0]).trim();
    const username = String(row[1]).trim().toLowerCase();
    
    if (!fullname || !username || username === 'username' || username === 'admin') continue;

    try {
        const info = stmtInsert.run(username, hash, fullname, 'user');
        if (info.changes > 0) {
            newCount++;
            console.log(`✅ Đã thêm mới: ${fullname} (${username})`);
        } else {
            // If already exists, update the fullname (since CSV might have encoding issues, XLSX fixes it)
            const infoUpdate = stmtUpdate.run(fullname, username);
            if (infoUpdate.changes > 0) {
                updateCount++;
                console.log(`🔄 Đã cập nhật tên: ${fullname} (${username})`);
            }
        }
    } catch (err) {
        console.error(`❌ Lỗi khi xử lý ${username}:`, err.message);
    }
}

console.log(`\n🎉 Hoàn tất nạp nhân sự:`);
console.log(`   - Thêm mới: ${newCount}`);
console.log(`   - Cập nhật định dạng tên: ${updateCount}`);
db.close();
