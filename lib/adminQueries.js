const { db } = require('./db');
const { round2 } = require('./helpers');

function dashboardStats() {
  const orderCount = db.prepare('SELECT COUNT(*) c FROM orders').get().c;
  const customerCount = db.prepare('SELECT COUNT(DISTINCT phone) c FROM orders').get().c;
  const totals = db.prepare('SELECT COALESCE(SUM(total_containers),0) containers, COALESCE(SUM(total_amount),0) amount, COALESCE(SUM(paid_amount),0) paid, COALESCE(SUM(balance),0) balance FROM orders').get();
  const luckyDrawCount = db.prepare("SELECT COUNT(*) c FROM orders WHERE lucky_draw_status = 'LAYAK'").get().c;
  const pendingPayments = db.prepare("SELECT COUNT(*) c FROM installments WHERE status = 'PENDING'").get().c;
  const receiptsAwaiting = db.prepare("SELECT COUNT(*) c FROM installments WHERE status = 'SEMAKAN'").get().c;
  const unpaidCustomers = db.prepare("SELECT COUNT(*) c FROM orders WHERE balance > 0.001").get().c;
  return {
    orderCount, customerCount,
    totalContainers: totals.containers, totalAmount: totals.amount, totalPaid: totals.paid, totalBalance: totals.balance,
    luckyDrawCount, pendingPayments, unpaidCustomers, receiptsAwaiting,
  };
}

function listOrders({ search = '', filter = 'ALL', agent = '', month = '', sort = 'DESC' } = {}) {
  let sql = 'SELECT * FROM orders WHERE 1=1';
  const args = [];
  if (search) {
    sql += ' AND (customer_name LIKE ? OR phone LIKE ? OR id LIKE ?)';
    const term = `%${search}%`;
    args.push(term, term, term);
  }
  if (agent) {
    // Case/spacing-insensitive — sepadan dengan cara harga ejen & agentSummary() kenal pasti ejen.
    sql += ' AND LOWER(TRIM(agent_name)) = LOWER(TRIM(?))';
    args.push(agent);
  }
  if (month) {
    sql += " AND strftime('%Y-%m', created_at) = ?";
    args.push(month);
  }
  switch (filter) {
    case 'BELUM_BAYAR': sql += " AND payment_status = 'BELUM_BAYAR'"; break;
    case 'SEBAHAGIAN': sql += " AND payment_status = 'SEBAHAGIAN'"; break;
    case 'LENGKAP': sql += " AND payment_status = 'LENGKAP'"; break;
    case 'LAYAK': sql += " AND lucky_draw_status = 'LAYAK'"; break;
    case 'TIDAK_LAYAK': sql += " AND lucky_draw_status = 'TIDAK_LAYAK'"; break;
    case 'SEDIA_PACK': sql += " AND payment_status = 'LENGKAP' AND COALESCE(shipping_status,'BELUM') != 'DIHANTAR'"; break;
    case 'DIHANTAR': sql += " AND shipping_status = 'DIHANTAR'"; break;
    default: break;
  }
  sql += ` ORDER BY created_at ${sort === 'ASC' ? 'ASC' : 'DESC'}`;
  return db.prepare(sql).all(...args);
}

function getOrderDetail(orderId) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return null;
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(orderId);
  const installments = db.prepare('SELECT * FROM installments WHERE order_id = ? ORDER BY installment_number').all(orderId);
  return { order, items, installments };
}

function productSummary() {
  return db.prepare(`
    SELECT p.id, p.name, p.image, COALESCE(SUM(oi.quantity), 0) totalQty
    FROM products p
    LEFT JOIN order_items oi ON oi.product_id = p.id
    WHERE p.active = 1
    GROUP BY p.id
    ORDER BY totalQty DESC, p.sort_order ASC
  `).all();
}

// Komisyen ejen = jumlah (harga biasa biskut - harga ejen yang dikenakan) x bekas, bagi setiap
// item dalam tempahan ejen tu — dijumlahkan ikut ejen. Tempahan bukan-ejen (harga penuh)
// sumbang RM0 komisyen secara automatik.
// Dikumpulkan ikut LOWER(TRIM(agent_name)) — SAMA seperti logik harga ejen di lib/orders.js —
// supaya "Kak Mah" dan "kak mah" (nama sama, ejaan/spacing lain) disatukan sebagai SATU ejen.
function agentSummary() {
  return db.prepare(`
    SELECT MIN(o.agent_name) AS agentName,
           COUNT(*) orderCount,
           COUNT(DISTINCT o.phone) customerCount,
           COALESCE(SUM(o.total_containers),0) containers,
           COALESCE(SUM(o.total_amount),0) sales,
           COALESCE(SUM(
             (SELECT COALESCE(SUM((COALESCE(oi.base_price, oi.unit_price) - oi.unit_price) * oi.quantity), 0)
              FROM order_items oi WHERE oi.order_id = o.id)
           ), 0) AS commission
    FROM orders o
    GROUP BY LOWER(TRIM(o.agent_name))
    ORDER BY sales DESC
  `).all();
}

function luckyDrawParticipants() {
  return db.prepare(`
    SELECT customer_name, phone, id AS orderId, total_containers, order_status
    FROM orders WHERE lucky_draw_status = 'LAYAK'
    ORDER BY total_containers DESC, created_at ASC
  `).all();
}

function monthlyReport() {
  return db.prepare(`
    SELECT strftime('%Y-%m', created_at) ym,
           COUNT(*) orderCount,
           COUNT(DISTINCT phone) customerCount,
           COALESCE(SUM(total_containers),0) containers,
           COALESCE(SUM(total_amount),0) amount,
           COALESCE(SUM(paid_amount),0) paid,
           COALESCE(SUM(balance),0) balance
    FROM orders
    GROUP BY ym
    ORDER BY ym ASC
  `).all();
}

function distinctAgents() {
  return db.prepare('SELECT DISTINCT agent_name FROM orders ORDER BY agent_name').all().map(r => r.agent_name);
}

function allPayments() {
  return db.prepare(`
    SELECT o.customer_name, o.id AS orderId, i.installment_number, i.amount, i.payment_date, i.transaction_id, i.gateway, i.status
    FROM installments i
    JOIN orders o ON o.id = i.order_id
    WHERE i.status = 'PAID'
    ORDER BY i.payment_date DESC
  `).all();
}

module.exports = {
  dashboardStats, listOrders, getOrderDetail, productSummary, agentSummary, luckyDrawParticipants, monthlyReport, distinctAgents, allPayments,
};
