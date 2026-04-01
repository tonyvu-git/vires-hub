const xlsx = require('xlsx');
const path = require('path');

const CSV_PATH = path.join(__dirname, 'DanhSachNhanSu(full).xlsx');
const workbook = xlsx.readFile(CSV_PATH);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

console.log('First 5 rows:');
console.log(data.slice(0, 5));
