// Payment core — single place that mutates payment state.
// Real gateways (ToyyibPay/Billplz/senangPay/iPay88) must call POST /api/payment/webhook,
// which verifies the signature (see verifySignature below) then calls processPaymentEvent().
// The sandbox "simulate" endpoint calls the SAME function, so the money logic is identical
// in test mode and live mode — only the trigger (real webhook vs. simulated one) differs.
const { db, generateTransactionId } = require('./db');
const { round2 } = require('./helpers');

function getOrderWithDetails(orderId) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return null;
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(orderId);
  const installments = db.prepare('SELECT * FROM installments WHERE order_id = ? ORDER BY installment_number').all(orderId);
  return { order, items, installments };
}

function recalcOrderPaymentStatus(orderId) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  const installments = db.prepare('SELECT * FROM installments WHERE order_id = ?').all(orderId);
  const paid = round2(installments.filter(i => i.status === 'PAID').reduce((s, i) => s + i.amount, 0));
  const balance = round2(order.total_amount - paid);
  let paymentStatus = 'BELUM_BAYAR';
  if (paid > 0 && balance > 0.001) paymentStatus = 'SEBAHAGIAN';
  if (balance <= 0.001) paymentStatus = 'LENGKAP';
  let orderStatus = order.order_status;
  if (orderStatus !== 'DIBATALKAN') {
    if (paymentStatus === 'LENGKAP') orderStatus = 'SELESAI';
    // Pelanggan tambah biskut selepas bayar penuh -> ada baki baru, tempahan kembali DIPROSES.
    else if (paid > 0) orderStatus = 'DIPROSES';
  }
  db.prepare('UPDATE orders SET paid_amount = ?, balance = ?, payment_status = ?, order_status = ? WHERE id = ?')
    .run(paid, balance, paymentStatus, orderStatus, orderId);
}

// Idempotent: if this installment is already PAID, a duplicate webhook delivery is ignored.
function processPaymentEvent({ orderId, installmentNumber, status, gateway = 'sandbox', rawPayload = {}, transactionId = null }) {
  const installment = db.prepare('SELECT * FROM installments WHERE order_id = ? AND installment_number = ?').get(orderId, installmentNumber);
  if (!installment) throw new Error('Bayaran tidak dijumpai.');

  const txnId = transactionId || generateTransactionId(gateway.toUpperCase());

  // Guard against double payment: if already PAID, do not reprocess (idempotency by installment + prior transaction).
  if (installment.status === 'PAID' && status === 'PAID') {
    return { installment, duplicate: true };
  }

  const now = new Date().toISOString();
  let newStatus = installment.status;
  if (status === 'PAID') newStatus = 'PAID';
  else if (status === 'PENDING') newStatus = 'PENDING';
  else if (status === 'FAILED') newStatus = 'FAILED';

  db.prepare(`
    UPDATE installments SET status = ?, payment_date = ?, transaction_id = ?, gateway = ?, payment_reference = ?
    WHERE order_id = ? AND installment_number = ?
  `).run(
    newStatus,
    status === 'PAID' ? now : installment.payment_date,
    status === 'PAID' ? txnId : installment.transaction_id,
    gateway,
    status === 'PAID' ? txnId : installment.payment_reference,
    orderId, installmentNumber
  );

  db.prepare(`
    INSERT INTO payment_log (order_id, installment_number, transaction_id, gateway, amount, status, raw_payload, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(orderId, installmentNumber, txnId, gateway, installment.amount, status, JSON.stringify(rawPayload), now);

  recalcOrderPaymentStatus(orderId);

  const updated = db.prepare('SELECT * FROM installments WHERE order_id = ? AND installment_number = ?').get(orderId, installmentNumber);
  return { installment: updated, duplicate: false };
}

// Signature verification per gateway — real gateways must prove the callback is genuine
// before we ever touch payment state. Wire in Billplz/senangPay/iPay88 the same way once
// their credentials exist; ToyyibPay is already implemented (see lib/gateways/toyyibpay.js).
function verifySignature(gateway, payload, headers) {
  if (gateway === 'sandbox') return true;
  if (gateway === 'toyyibpay') {
    const toyyibpay = require('./gateways/toyyibpay');
    return toyyibpay.verifyCallback(payload);
  }
  // TODO: implement real verification once BILLPLZ_X_SIGNATURE_KEY / SENANGPAY_SECRET_KEY are set in .env
  return false;
}

module.exports = { getOrderWithDetails, recalcOrderPaymentStatus, processPaymentEvent, verifySignature };
