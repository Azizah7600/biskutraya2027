const { db } = require('../lib/db');
const { createOrder, addItemsToOrder, quoteAddItems, addItemsAllowed } = require('../lib/orders');
const { saveReceipt } = require('../lib/receipts');
const { registerAgent, findApprovedAgentByName } = require('../lib/agents');
const { getOrderWithDetails, processPaymentEvent, verifySignature } = require('../lib/payment');
const { phoneMatches } = require('./site');
const toyyibpay = require('../lib/gateways/toyyibpay');
const { calcAgentDiscount } = require('../lib/helpers');

function registerApiRoutes(app) {
  app.post('/api/checkout', (req, res) => {
    try {
      const orderId = createOrder(req.body);
      res.status(201).json({ orderId });
    } catch (err) {
      res.status(400).json({ error: err.message || 'Ralat semasa membuat tempahan.' });
    }
  });

  app.post('/api/ejen/daftar', (req, res) => {
    try {
      const id = registerAgent(req.body);
      res.status(201).json({ id });
    } catch (err) {
      res.status(400).json({ error: err.message || 'Ralat semasa menghantar pendaftaran.' });
    }
  });

  // Pratonton diskaun ejen SEBELUM checkout — supaya ringkasan tempahan tunjuk harga sebenar
  // (harga biskut tolak RM4/RM5 sebekas) yang akan dikenakan, dikira dari jumlah bekas TERKUMPUL ejen tu
  // (semua tempahan lepas + bekas dalam troli sekarang). Tidak mengubah apa-apa data.
  app.get('/api/agent-price-preview', (req, res) => {
    const agent = String(req.query.name || '').trim();
    const cartContainers = parseInt(req.query.containers, 10) || 0;
    if (!agent) return res.json({ discount: 0, priorContainers: 0 });
    // Hanya ejen yang BERDAFTAR & DILULUSKAN admin layak harga ejen.
    if (!findApprovedAgentByName(agent)) return res.json({ discount: 0, priorContainers: 0 });
    const priorRow = db.prepare(
      `SELECT COALESCE(SUM(total_containers), 0) AS total FROM orders WHERE LOWER(TRIM(agent_name)) = LOWER(?)`
    ).get(agent);
    const priorContainers = priorRow ? priorRow.total : 0;
    const discount = calcAgentDiscount(priorContainers + cartContainers);
    res.json({ discount, priorContainers });
  });

  // ---- Bayaran melalui pindahan bank: pelanggan muat naik resit ----
  app.post('/api/payment/resit', (req, res) => {
    try {
      const { orderId, phone, installmentNumber, dataUrl } = req.body;
      const details = orderId ? getOrderWithDetails(String(orderId).trim()) : null;
      if (!details || !phoneMatches(details.order.phone, phone)) {
        return res.status(404).json({ error: 'Tempahan tidak dijumpai.' });
      }
      saveReceipt({ orderId: details.order.id, installmentNumber: parseInt(installmentNumber, 10), dataUrl });
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err.message || 'Ralat semasa menghantar resit.' });
    }
  });

  // ---- Pelanggan TAMBAH BISKUT pada tempahan sedia ada ----
  function loadOwnOrder(req) {
    const { orderId, phone } = req.body;
    const details = orderId ? getOrderWithDetails(String(orderId).trim()) : null;
    if (!details || !phoneMatches(details.order.phone, phone)) throw new Error('Tempahan tidak dijumpai.');
    if (!addItemsAllowed(details.order)) throw new Error('Tempahan ini tidak lagi boleh ditambah. Sila hubungi Jijah Bake4U melalui WhatsApp.');
    return details.order;
  }
  app.post('/api/tempahan/tambah/semak', (req, res) => {
    try {
      const order = loadOwnOrder(req);
      const q = quoteAddItems(order, req.body.items);
      res.json({
        items: q.orderItems.map(it => ({ name: it.productName, qty: it.quantity, unitPrice: it.unitPrice, subtotal: it.subtotal })),
        itemsTotal: q.itemsTotal, postageDiff: q.postageDiff, discount: q.discount, amount: q.amount,
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
  app.post('/api/tempahan/tambah', (req, res) => {
    try {
      const order = loadOwnOrder(req);
      const result = addItemsToOrder(order.id, req.body.items);
      res.json({ ok: true, paymentNo: result.paymentNo, amount: result.amount });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/order-status', (req, res) => {
    const { orderId, phone } = req.body;
    const details = orderId ? getOrderWithDetails(orderId.trim()) : null;
    if (!details || !phoneMatches(details.order.phone, phone)) {
      return res.status(404).json({ error: 'Order ID atau No. Telefon tidak sepadan.' });
    }
    res.json({ orderId: details.order.id });
  });

  // Sandbox "gateway" — acts as a stand-in for the real gateway's redirect + webhook call.
  // It calls the SAME processPaymentEvent() used by the real webhook below, so the money
  // logic being tested here is identical to what live mode will run.
  app.post('/api/payment/sandbox/simulate', (req, res) => {
    const { orderId, installmentNumber, result } = req.body;
    const realGatewaySelected = process.env.PAYMENT_GATEWAY && process.env.PAYMENT_GATEWAY !== 'sandbox';
    const realGatewayConfigured = process.env.PAYMENT_GATEWAY === 'toyyibpay' && toyyibpay.isConfigured();
    if (realGatewaySelected && realGatewayConfigured) {
      return res.status(400).json({ error: 'Gateway sebenar sudah dikonfigurasi — guna butang BAYAR di halaman pembayaran, bukan endpoint sandbox ini.' });
    }
    try {
      const status = result === 'SUCCESS' ? 'PAID' : result === 'PENDING' ? 'PENDING' : 'FAILED';
      const { installment } = processPaymentEvent({
        orderId, installmentNumber: parseInt(installmentNumber, 10), status, gateway: 'sandbox',
        rawPayload: { simulated: true, result },
      });
      res.json({ status: installment.status, transactionId: installment.transaction_id });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Create a ToyyibPay bill for one installment and return the hosted payment URL.
  // The browser is redirected there; ToyyibPay itself calls back to /api/payment/webhook/toyyibpay
  // server-to-server once the bank/card confirms — that webhook is the only place PAID is set.
  app.post('/api/payment/toyyibpay/create-bill', async (req, res) => {
    try {
      const { orderId, installmentNumber } = req.body;
      const details = getOrderWithDetails(orderId);
      if (!details) return res.status(404).json({ error: 'Tempahan tidak dijumpai.' });
      const installment = details.installments.find(i => i.installment_number === parseInt(installmentNumber, 10));
      if (!installment) return res.status(404).json({ error: 'Ansuran tidak dijumpai.' });
      if (installment.status === 'PAID') return res.status(400).json({ error: 'Bayaran ini sudah dibuat.' });
      if (installment.status === 'SEMAKAN') return res.status(400).json({ error: 'Resit untuk bayaran ini sedang disemak oleh Jijah Bake4U.' });

      const siteUrl = process.env.SITE_URL || `http://localhost:${process.env.PORT || 3000}`;
      const callbackUrl = `${siteUrl}/api/payment/webhook/toyyibpay`;
      if (!process.env.SITE_URL) {
        console.log(`\n  [BAYARAN] AMARAN: SITE_URL tidak ditetapkan — callback URL guna localhost (${callbackUrl}). ToyyibPay TIDAK AKAN dapat hubungi server ini. Sila set SITE_URL dalam Environment Variables.\n`);
      } else {
        console.log(`\n  [BAYARAN] Bil baru dicipta untuk ${details.order.id} (ansuran ${installment.installment_number}). Callback URL yang dihantar ke ToyyibPay: ${callbackUrl}\n`);
      }
      const { paymentUrl } = await toyyibpay.createBill({
        orderId: details.order.id,
        installmentNumber: installment.installment_number,
        amount: installment.amount,
        customerName: details.order.customer_name,
        email: details.order.email,
        phone: details.order.phone,
        returnUrl: `${siteUrl}/pembayaran/toyyibpay/return?orderId=${encodeURIComponent(details.order.id)}&phone=${encodeURIComponent(details.order.phone)}`,
        callbackUrl,
      });
      res.json({ paymentUrl });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Real gateway webhook endpoint (ToyyibPay live; Billplz / senangPay / iPay88 follow the same pattern
  // once their credentials + payload mapping are added). This is the ONLY place (besides the sandbox
  // simulator above) allowed to mark an installment as PAID — a browser "return" visit never does this.
  app.post('/api/payment/webhook/:gateway', (req, res) => {
    const gateway = req.params.gateway;
    console.log(`\n  [WEBHOOK] Panggilan diterima dari gateway="${gateway}". order_id=${req.body && req.body.order_id}, status=${req.body && req.body.status}, refno=${req.body && req.body.refno}`);
    console.log(`  [WEBHOOK] DIAGNOSTIK — Content-Type header: "${req.headers['content-type']}" | body yang berjaya diparse: ${JSON.stringify(req.body)}`);
    if (!verifySignature(gateway, req.body, req.headers)) {
      console.log(`  [WEBHOOK] DITOLAK — signature/hash tidak sah, atau gateway belum dikonfigurasi. Ansuran TIDAK dikemaskini.\n`);
      return res.status(401).json({ error: 'Invalid signature / gateway not configured yet.' });
    }
    try {
      if (gateway === 'toyyibpay') {
        const { orderId, installmentNumber } = toyyibpay.parseExternalRef(req.body.order_id);
        const status = toyyibpay.mapStatus(req.body.status);
        processPaymentEvent({ orderId, installmentNumber, status, gateway, transactionId: req.body.refno, rawPayload: req.body });
        console.log(`  [WEBHOOK] BERJAYA — ${orderId} ansuran ${installmentNumber} dikemaskini kepada status: ${status}\n`);
        return res.json({ ok: true });
      }
      // TODO once Billplz / senangPay / iPay88 are connected: map their payload fields here the same way.
      const { orderId, installmentNumber, status, transactionId } = req.body;
      processPaymentEvent({ orderId, installmentNumber: parseInt(installmentNumber, 10), status, gateway, transactionId, rawPayload: req.body });
      res.json({ ok: true });
    } catch (err) {
      console.log(`  [WEBHOOK] RALAT semasa proses: ${err.message}\n`);
      res.status(400).json({ error: err.message });
    }
  });

  // Browser lands here after ToyyibPay redirects back. Per spec this NEVER marks anything paid —
  // it just sends the customer to the status page, which reflects whatever the webhook has (or
  // hasn't) confirmed yet in the database.
  app.get('/pembayaran/toyyibpay/return', (req, res) => {
    const { orderId, phone } = req.query;
    res.redirect(`/tempahan/status/${encodeURIComponent(orderId)}?phone=${encodeURIComponent(phone || '')}&justReturned=1`);
  });
}

module.exports = { registerApiRoutes };
