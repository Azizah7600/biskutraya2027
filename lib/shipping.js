// Packing & penghantaran. Status penghantaran disimpan berasingan daripada status bayaran:
//   shipping_status: 'BELUM' (lalai) atau 'DIHANTAR'
//   shipped_at, courier, tracking_no — diisi bila admin tekan "SUDAH POS / HANTAR".
const { db } = require('./db');

function markShipped(orderId, { courier = '', trackingNo = '' } = {}) {
  const order = db.prepare('SELECT id FROM orders WHERE id = ?').get(orderId);
  if (!order) throw new Error('Tempahan tidak dijumpai.');
  db.prepare(`UPDATE orders SET shipping_status = 'DIHANTAR', shipped_at = ?, courier = ?, tracking_no = ? WHERE id = ?`)
    .run(new Date().toISOString(), String(courier || '').trim().slice(0, 60), String(trackingNo || '').trim().slice(0, 60), orderId);
}

function unmarkShipped(orderId) {
  db.prepare(`UPDATE orders SET shipping_status = 'BELUM', shipped_at = NULL, courier = NULL, tracking_no = NULL WHERE id = ?`).run(orderId);
}

// Senarai tempahan untuk halaman Packing.
//   sedia   = sudah bayar penuh, belum dihantar (sedia untuk pack)
//   belum   = semua yang belum dihantar (termasuk belum bayar)
//   dihantar = sudah dipos / dihantar
function listForPacking(view = 'sedia') {
  let where = "o.order_status != 'DIBATALKAN'";
  if (view === 'sedia') where += " AND o.payment_status = 'LENGKAP' AND COALESCE(o.shipping_status,'BELUM') != 'DIHANTAR'";
  else if (view === 'belum') where += " AND COALESCE(o.shipping_status,'BELUM') != 'DIHANTAR'";
  else if (view === 'dihantar') where += " AND o.shipping_status = 'DIHANTAR'";
  const orders = db.prepare(`SELECT o.* FROM orders o WHERE ${where} ORDER BY ${view === 'dihantar' ? 'o.shipped_at DESC' : 'o.created_at ASC'}`).all();
  const itemStmt = db.prepare('SELECT product_name, SUM(quantity) AS quantity FROM order_items WHERE order_id = ? GROUP BY product_id, product_name ORDER BY MIN(id)');
  return orders.map((o) => ({ ...o, items: itemStmt.all(o.id) }));
}

function getOrderForSlip(orderId) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return null;
  const items = db.prepare('SELECT product_name, SUM(quantity) AS quantity FROM order_items WHERE order_id = ? GROUP BY product_id, product_name ORDER BY MIN(id)').all(orderId);
  return { ...order, items };
}

// Jumlah setiap biskut yang perlu disediakan bagi senarai tempahan (untuk team packing).
function totalsByProduct(orders) {
  const map = new Map();
  orders.forEach((o) => o.items.forEach((it) => map.set(it.product_name, (map.get(it.product_name) || 0) + Number(it.quantity))));
  return [...map.entries()].map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty);
}

module.exports = { markShipped, unmarkShipped, listForPacking, getOrderForSlip, totalsByProduct };
