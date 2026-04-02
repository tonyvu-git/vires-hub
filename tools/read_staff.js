const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const wb = XLSX.readFile(path.join(__dirname, '..', 'DS_Nhan_Su_VIRES.xlsx'));
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

// Write all data to a temp file for reading
const output = data.map((row, i) => `Row ${i}: ${JSON.stringify(row)}`).join('\n');
fs.writeFileSync(path.join(__dirname, 'staff_data.txt'), output, 'utf8');
console.log(`Wrote ${data.length} rows to tools/staff_data.txt`);
