// Dependency-free CSV writer (opens fine in Microsoft Excel and Google Sheets).
function csvEscape(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (/[",\n]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
  return str;
}

function toCsv(rows, columns) {
  const header = columns.map(c => csvEscape(c.label)).join(',');
  const lines = rows.map((row, idx) => columns.map(c => csvEscape(typeof c.value === 'function' ? c.value(row, idx) : row[c.value])).join(','));
  return '﻿' + [header, ...lines].join('\r\n'); // BOM for Excel UTF-8 compatibility
}

module.exports = { toCsv };
