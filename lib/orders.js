const { db, generateOrderId } = require('./db');
const { CONFIG, calcAgentDiscount, calcPostage, round2 } = require('./helpers');
const { findApprovedAgentByName } = require('./agents');
const { recalcOrderPaymentStatus } = require('./payment');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sahkan senarai item dari pelanggan terhadap produk AKTIF dalam pangkalan data. Harga SENTIASA
// diambil dari pangkalan data (catalog/products.json), bukan dari pelayar pelanggan.
function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Tiada produk dalam tempahan.');
  }
  const productStmt = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1');
  const merged = new Map();
  for (const it of items) {
    const qty = parseInt(it.qty, 10);
    if (!qty || qty < 1) continue;
    const product = productStmt.get(it.productId);
    if (!product) continue;
    const prev = merged.get(product.id);
    if (prev) prev.quantity += qty;
    else merged.set(product.id, { productId: product.id, productName: product.name, basePrice: Number(product.installment_price), agentDiscount: product.agent_discount, quantity: qty });
  }
  const validItems = [...merged.values()];
  const totalContainers = validItems.reduce((s, it) => s + it.quantity, 0);
  if (validItems.length === 0 || totalContainers < 1) {
    throw new Error('Tiada produk sah dalam tempahan.');
  }
  return { validItems, totalContainers };
}

function agentPriorContainers(agentName, excludeOrderId = null) {
  const row = db.prepare(
    `SELECT COALESCE(SUM(total_containers), 0) AS total FROM orders WHERE LOWER(TRIM(agent_name)) = LOWER(TRIM(?)) AND id != ?`
  ).get(agentName, excludeOrderId || '');
  return row ? row.total : 0;
}

// Harga sebekas IKUT SETIAP BISKUT (Katalog 2027). Jika tempahan ejen, tolak diskaun ejen
// (RM4 / RM5 sebekas) ikut jumlah bekas TERKUMPUL ejen tu.
function priceItems(validItems, discount) {
  const orderItems = validItems.map((it) => {
    // Jika ejen layak (discount > 0), produk tertentu boleh ada potongan khas (cth. Combo Box RM4).
    const itemDiscount = discount > 0 && it.agentDiscount !== null && it.agentDiscount !== undefined ? Number(it.agentDiscount) : discount;
    const unitPrice = round2(Math.max(0, it.basePrice - itemDiscount));
    return { ...it, unitPrice, subtotal: round2(unitPrice * it.quantity) };
  });
  const itemsTotal = round2(orderItems.reduce((sum, it) => sum + it.subtotal, 0));
  return { orderItems, itemsTotal };
}

function insertItems(orderId, orderItems, nowIso) {
  // Gabung dengan baris sedia ada jika biskut & harga sama — supaya senarai kekal kemas.
  const findStmt = db.prepare('SELECT id FROM order_items WHERE order_id = ? AND product_id = ? AND unit_price = ?');
  const bumpStmt = db.prepare('UPDATE order_items SET quantity = quantity + ?, subtotal = ROUND(subtotal + ?, 2) WHERE id = ?');
  const insStmt = db.prepare('INSERT INTO order_items (order_id, product_id, product_name, quantity, base_price, unit_price, subtotal, added_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  orderItems.forEach((it) => {
    const existing = findStmt.get(orderId, it.productId, it.unitPrice);
    if (existing) bumpStmt.run(it.quantity, it.subtotal, existing.id);
    else insStmt.run(orderId, it.productId, it.productName, it.quantity, it.basePrice, it.unitPrice, it.subtotal, nowIso);
  });
}

// Stok berkurang automatik bila tempahan / tambahan dibuat (tidak kurang daripada 0).
function deductStock(orderItems) {
  const stmt = db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?');
  orderItems.forEach((it) => stmt.run(it.quantity, it.productId));
}

function addPaymentRow(orderId, amount, label) {
  const row = db.prepare('SELECT COALESCE(MAX(installment_number), 0) AS n FROM installments WHERE order_id = ?').get(orderId);
  const next = (row ? row.n : 0) + 1;
  db.prepare('INSERT INTO installments (order_id, installment_number, amount, due_date, status, label) VALUES (?, ?, ?, NULL, ?, ?)')
    .run(orderId, next, round2(amount), 'UNPAID', label);
  return next;
}

function createOrder(input) {
  const { customerName, phone, email, address, postcode, state, agentName, deliveryMethod, notes, items } = input;

  if (!customerName || !phone || !email || !address || !postcode || !state || !deliveryMethod) {
    throw new Error('Sila lengkapkan semua maklumat wajib (*).');
  }
  if (!EMAIL_PATTERN.test(String(email).trim())) {
    throw new Error('Format email tidak sah. Sila semak semula.');
  }
  const { validItems, totalContainers } = validateItems(items);

  const agent = (agentName || '').trim();
  // Nama ejen kena padan dengan ejen yang DILULUSKAN admin — elak typo nama ejen.
  let agentRecord = null;
  if (agent) {
    agentRecord = findApprovedAgentByName(agent);
    if (!agentRecord) {
      throw new Error('Nama ejen tidak sah. Sila pilih nama ejen daripada senarai yang disediakan, atau kosongkan jika bukan tempahan ejen.');
    }
  }

  const discount = agent ? calcAgentDiscount(agentPriorContainers(agent) + totalContainers) : 0;
  const { orderItems, itemsTotal } = priceItems(validItems, discount);

  // Kos postage (RM10/RM15/RM20 ikut jumlah bekas, Semenanjung sahaja) — percuma jika pickup.
  const postageAmount = calcPostage(totalContainers, deliveryMethod);
  const totalAmount = round2(itemsTotal + postageAmount);
  const orderId = generateOrderId();
  const nowIso = new Date().toISOString();

  db.prepare(`
    INSERT INTO orders (
      id, created_at, customer_name, phone, email, address, postcode, state, agent_name, agent_id,
      delivery_method, postage_amount, notes, total_containers, total_amount, paid_amount, balance,
      installment_months, order_status, payment_status, lucky_draw_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 1, 'BARU', 'BELUM_BAYAR', ?)
  `).run(
    orderId, nowIso, customerName.trim(), phone.trim(), String(email).trim(), address.trim(), postcode.trim(), state.trim(),
    agent || 'DIRECT / JIJAH BAKE4U', agentRecord ? agentRecord.id : null, deliveryMethod, postageAmount, (notes || '').trim(),
    totalContainers, totalAmount, totalAmount,
    totalContainers >= CONFIG.LUCKY_DRAW_MIN_CONTAINERS ? 'LAYAK' : 'TIDAK_LAYAK'
  );

  insertItems(orderId, orderItems, nowIso);
  deductStock(orderItems);
  addPaymentRow(orderId, totalAmount, 'Bayaran Tempahan');
  return orderId;
}

function addItemsAllowed(order) {
  if (!order || order.order_status === 'DIBATALKAN') return false;
  if (order.shipping_status === 'DIHANTAR') return false; // sudah dipos / dihantar
  if (CONFIG.ADD_ITEMS_UNTIL) {
    const until = new Date(`${CONFIG.ADD_ITEMS_UNTIL}T23:59:59+08:00`);
    if (!Number.isNaN(until.getTime()) && Date.now() > until.getTime()) return false;
  }
  return true;
}

// Kira (tanpa simpan) kos tambahan jika pelanggan tambah biskut — untuk pratonton & untuk simpan.
function quoteAddItems(order, items) {
  const { validItems, totalContainers: addContainers } = validateItems(items);
  // Tambah biskut hanya SELAGI ADA STOK.
  const stockStmt = db.prepare('SELECT stock FROM products WHERE id = ?');
  validItems.forEach((it) => {
    const row = stockStmt.get(it.productId);
    const stock = row ? Number(row.stock) || 0 : 0;
    if (stock <= 0) throw new Error(`Maaf, ${it.productName} sudah habis stok.`);
    if (it.quantity > stock) throw new Error(`Maaf, stok ${it.productName} tinggal ${stock} bekas sahaja.`);
  });
  const isAgent = order.agent_id || (order.agent_name && order.agent_name !== 'DIRECT / JIJAH BAKE4U');
  const discount = isAgent
    ? calcAgentDiscount(agentPriorContainers(order.agent_name, order.id) + order.total_containers + addContainers)
    : 0;
  const { orderItems, itemsTotal } = priceItems(validItems, discount);
  const newContainers = order.total_containers + addContainers;
  const newPostage = calcPostage(newContainers, order.delivery_method);
  const postageDiff = round2(Math.max(0, newPostage - Number(order.postage_amount || 0)));
  return { orderItems, itemsTotal, addContainers, newContainers, newPostage, postageDiff, discount, amount: round2(itemsTotal + postageDiff) };
}

// Pelanggan TAMBAH BISKUT pada tempahan sedia ada. Satu bayaran tambahan baru dicipta untuk
// jumlah tambahan (harga biskut + beza kos postage jika ada).
function addItemsToOrder(orderId, items) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) throw new Error('Tempahan tidak dijumpai.');
  if (!addItemsAllowed(order)) throw new Error('Tempahan ini tidak lagi boleh ditambah. Sila hubungi Jijah Bake4U melalui WhatsApp.');

  const q = quoteAddItems(order, items);
  const nowIso = new Date().toISOString();
  insertItems(orderId, q.orderItems, nowIso);
  deductStock(q.orderItems);

  const newTotal = round2(Number(order.total_amount) + q.amount);
  db.prepare(`UPDATE orders SET total_containers = ?, total_amount = ?, postage_amount = ?, lucky_draw_status = ? WHERE id = ?`)
    .run(
      q.newContainers, newTotal, Math.max(Number(order.postage_amount || 0), q.newPostage),
      q.newContainers >= CONFIG.LUCKY_DRAW_MIN_CONTAINERS ? 'LAYAK' : order.lucky_draw_status,
      orderId
    );
  const countRow = db.prepare("SELECT COUNT(*) c FROM installments WHERE order_id = ? AND label LIKE 'Tambahan%'").get(orderId);
  const paymentNo = addPaymentRow(orderId, q.amount, `Tambahan Biskut ${(countRow ? countRow.c : 0) + 1}`);
  recalcOrderPaymentStatus(orderId);
  return { paymentNo, amount: q.amount };
}

module.exports = { createOrder, addItemsToOrder, quoteAddItems, addItemsAllowed };
