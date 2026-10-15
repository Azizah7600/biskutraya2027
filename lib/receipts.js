// Bayaran melalui PINDAHAN BANK + HANTAR RESIT.
// Pelanggan muat naik gambar/PDF resit -> bayaran berstatus SEMAKAN -> admin semak di
// /admin/resit dan klik SAHKAN (bayaran jadi PAID) atau TOLAK (pelanggan boleh hantar semula).
// Fail resit disimpan dalam data/receipts/ (folder data/ ialah storan kekal / Volume di Railway).
const fs = require('fs');
const path = require('path');
const { db } = require('./db');
const { processPaymentEvent } = require('./payment');

const RECEIPT_DIR = path.join(__dirname, '..', 'data', 'receipts');
const MAX_BYTES = 4 * 1024 * 1024; // 4MB
const ALLOWED = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};
const MIME_BY_EXT = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' };

function ensureDir() {
  if (!fs.existsSync(RECEIPT_DIR)) fs.mkdirSync(RECEIPT_DIR, { recursive: true });
}

function saveReceipt({ orderId, installmentNumber, dataUrl }) {
  const inst = db.prepare('SELECT * FROM installments WHERE order_id = ? AND installment_number = ?').get(orderId, installmentNumber);
  if (!inst) throw new Error('Bayaran tidak dijumpai.');
  if (inst.status === 'PAID') throw new Error('Bayaran ini sudah disahkan.');
  if (inst.status === 'SEMAKAN') throw new Error('Resit untuk bayaran ini sudah dihantar dan sedang disemak.');

  const m = /^data:([a-z/+.-]+);base64,(.+)$/i.exec(String(dataUrl || ''));
  if (!m) throw new Error('Fail resit tidak sah. Sila pilih gambar (JPG/PNG) atau PDF.');
  const mime = m[1].toLowerCase();
  const ext = ALLOWED[mime];
  if (!ext) throw new Error('Jenis fail tidak disokong. Sila guna gambar (JPG/PNG) atau PDF.');
  const buf = Buffer.from(m[2], 'base64');
  if (!buf.length) throw new Error('Fail resit kosong.');
  if (buf.length > MAX_BYTES) throw new Error('Saiz fail terlalu besar (maksimum 4MB).');

  ensureDir();
  const safeOrder = String(orderId).replace(/[^A-Za-z0-9-]/g, '');
  const fileName = `${safeOrder}-${installmentNumber}-${Date.now()}.${ext}`;
  fs.writeFileSync(path.join(RECEIPT_DIR, fileName), buf);

  const now = new Date().toISOString();
  db.prepare(`UPDATE installments SET status = 'SEMAKAN', receipt_file = ?, receipt_uploaded_at = ?, receipt_note = NULL, gateway = 'resit'
              WHERE order_id = ? AND installment_number = ?`).run(fileName, now, orderId, installmentNumber);
  db.prepare(`INSERT INTO payment_log (order_id, installment_number, transaction_id, gateway, amount, status, raw_payload, created_at)
              VALUES (?, ?, NULL, 'resit', ?, 'SEMAKAN', ?, ?)`).run(orderId, installmentNumber, inst.amount, JSON.stringify({ receipt: fileName }), now);
  return fileName;
}

function listReceiptsAwaiting() {
  return db.prepare(`
    SELECT i.*, o.customer_name, o.phone
    FROM installments i JOIN orders o ON o.id = i.order_id
    WHERE i.status = 'SEMAKAN'
    ORDER BY i.receipt_uploaded_at ASC
  `).all();
}

function listRecentReceipts(limit = 30) {
  return db.prepare(`
    SELECT i.*, o.customer_name, o.phone
    FROM installments i JOIN orders o ON o.id = i.order_id
    WHERE i.receipt_file IS NOT NULL AND i.status != 'SEMAKAN'
    ORDER BY i.receipt_uploaded_at DESC LIMIT ?
  `).all(limit);
}

function approveReceipt(orderId, installmentNumber) {
  const inst = db.prepare('SELECT * FROM installments WHERE order_id = ? AND installment_number = ?').get(orderId, installmentNumber);
  if (!inst || inst.status !== 'SEMAKAN') throw new Error('Resit tidak menunggu semakan.');
  processPaymentEvent({
    orderId, installmentNumber, status: 'PAID', gateway: 'resit',
    rawPayload: { approvedByAdmin: true, receipt: inst.receipt_file },
  });
}

function rejectReceipt(orderId, installmentNumber, note) {
  const inst = db.prepare('SELECT * FROM installments WHERE order_id = ? AND installment_number = ?').get(orderId, installmentNumber);
  if (!inst || inst.status !== 'SEMAKAN') throw new Error('Resit tidak menunggu semakan.');
  const now = new Date().toISOString();
  db.prepare(`UPDATE installments SET status = 'FAILED', receipt_note = ? WHERE order_id = ? AND installment_number = ?`)
    .run(String(note || 'Resit tidak sah / tidak sepadan. Sila hantar semula.').slice(0, 300), orderId, installmentNumber);
  db.prepare(`INSERT INTO payment_log (order_id, installment_number, transaction_id, gateway, amount, status, raw_payload, created_at)
              VALUES (?, ?, NULL, 'resit', ?, 'DITOLAK', ?, ?)`).run(orderId, installmentNumber, inst.amount, JSON.stringify({ note }), now);
}

// Pulangkan laluan fail resit yang SAH sahaja (elak path traversal).
function receiptFilePath(fileName) {
  const clean = path.basename(String(fileName || ''));
  if (!/^[A-Za-z0-9-]+\.(jpg|png|webp|pdf)$/.test(clean)) return null;
  const full = path.join(RECEIPT_DIR, clean);
  if (!fs.existsSync(full)) return null;
  return { full, mime: MIME_BY_EXT[clean.split('.').pop()] };
}

module.exports = { saveReceipt, listReceiptsAwaiting, listRecentReceipts, approveReceipt, rejectReceipt, receiptFilePath, MAX_BYTES };
