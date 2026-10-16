const { db } = require('../lib/db');
const { adminLayout } = require('../views/adminLayout');
const adminPages = require('../views/adminPages');
const { createSession, isValidSession, destroySession, SESSION_COOKIE } = require('../lib/session');
const {
  dashboardStats, listOrders, getOrderDetail, productSummary, agentSummary, luckyDrawParticipants, monthlyReport, distinctAgents, allPayments,
} = require('../lib/adminQueries');
const { listAgentsByStatus, approveAgent, rejectAgent, getSuggestedMemberNo } = require('../lib/agents');
const { listProductsForStock, updateStockBulk } = require('../lib/products');
const { toCsv } = require('../lib/csv');
const { formatDateTimeMY } = require('../lib/helpers');
const fs = require('fs');
const packingPages = require('../views/packingPages');
const { markShipped, unmarkShipped, listForPacking, getOrderForSlip, totalsByProduct } = require('../lib/shipping');
const { listReceiptsAwaiting, listRecentReceipts, approveReceipt, rejectReceipt, receiptFilePath } = require('../lib/receipts');

function requireAdmin(req, res) {
  const token = req.cookies[SESSION_COOKIE];
  if (!isValidSession(token)) {
    res.redirect('/admin/login');
    return false;
  }
  return true;
}

function registerAdminRoutes(app) {
  app.get('/admin', (req, res) => res.redirect('/admin/dashboard'));

  app.get('/admin/login', (req, res) => {
    if (isValidSession(req.cookies[SESSION_COOKIE])) return res.redirect('/admin/dashboard');
    res.send(adminPages.loginPage());
  });

  app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    const expectedUser = process.env.ADMIN_USERNAME || 'jijah';
    const expectedPass = process.env.ADMIN_PASSWORD || 'JijahBake4U2027!';
    if (username === expectedUser && password === expectedPass) {
      const token = createSession();
      res.setCookie(SESSION_COOKIE, token, { maxAge: 12 * 3600 });
      return res.redirect('/admin/dashboard');
    }
    res.status(401).send(adminPages.loginPage('Username atau password tidak sah.'));
  });

  app.get('/admin/logout', (req, res) => {
    destroySession(req.cookies[SESSION_COOKIE]);
    res.clearCookie(SESSION_COOKIE);
    res.redirect('/admin/login');
  });

  app.get('/admin/dashboard', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const stats = dashboardStats();
    const monthly = monthlyReport();
    const products = productSummary();
    const agents = agentSummary();
    res.send(adminLayout({ title: 'Dashboard', active: 'dashboard', bodyHtml: adminPages.dashboardPage(stats, monthly, products, agents) }));
  });

  app.get('/admin/orders', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const filters = { search: req.query.search || '', filter: req.query.filter || 'ALL', agent: req.query.agent || '', month: req.query.month || '' };
    const orders = listOrders(filters);
    const agents = distinctAgents();
    res.send(adminLayout({ title: 'Semua Tempahan', active: 'orders', bodyHtml: adminPages.ordersPage(orders, filters, agents) }));
  });

  app.get('/admin/orders/:id', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const detail = getOrderDetail(req.params.id);
    if (!detail) return res.notFound();
    res.send(adminLayout({ title: `Tempahan ${req.params.id}`, active: 'orders', bodyHtml: adminPages.orderDetailPage(detail.order, detail.items, detail.installments) }));
  });

  // ---- Semak resit pindahan bank ----
  app.get('/admin/resit', (req, res) => {
    if (!requireAdmin(req, res)) return;
    res.send(adminLayout({ title: 'Semak Resit', active: 'receipts', bodyHtml: adminPages.receiptsPage(listReceiptsAwaiting(), listRecentReceipts()) }));
  });

  app.get('/admin/resit/fail/:name', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const f = receiptFilePath(req.params.name);
    if (!f) return res.notFound();
    res.type(f.mime).send(fs.readFileSync(f.full));
  });

  const safeBack = (b) => (typeof b === 'string' && /^\/admin\/[A-Za-z0-9/%_-]*$/.test(b) ? b : '/admin/resit');

  app.post('/admin/resit/:orderId/:n/sahkan', (req, res) => {
    if (!requireAdmin(req, res)) return;
    try { approveReceipt(req.params.orderId, parseInt(req.params.n, 10)); } catch (err) { /* sudah disemak */ }
    res.redirect(safeBack(req.body.back));
  });

  app.post('/admin/resit/:orderId/:n/tolak', (req, res) => {
    if (!requireAdmin(req, res)) return;
    try { rejectReceipt(req.params.orderId, parseInt(req.params.n, 10), req.body.note); } catch (err) { /* sudah disemak */ }
    res.redirect(safeBack(req.body.back));
  });

  // ---- Packing & penghantaran ----
  const packView = (v) => (['sedia', 'belum', 'dihantar'].includes(v) ? v : 'sedia');

  app.get('/admin/packing', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const view = packView(req.query.view);
    const orders = listForPacking(view);
    res.send(adminLayout({ title: 'Packing & Penghantaran', active: 'packing', bodyHtml: packingPages.packingPage(view, orders, totalsByProduct(orders)) }));
  });

  // Semua slip packing dalam satu halaman (setiap tempahan satu muka surat) — cetak / Save as PDF.
  app.get('/admin/packing/slip', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const view = packView(req.query.view);
    res.send(packingPages.slipDocument(listForPacking(view), `Slip Packing (${view}) — Jijah Bake4U`));
  });

  app.get('/admin/orders/:id/slip', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const o = getOrderForSlip(req.params.id);
    if (!o) return res.notFound();
    res.send(packingPages.slipDocument([o], `Slip Packing ${o.id} — Jijah Bake4U`));
  });

  const safeAdminBack = (b) => (typeof b === 'string' && /^\/admin\/[A-Za-z0-9/%_?=&-]*$/.test(b) ? b : '/admin/packing');

  app.post('/admin/orders/:id/hantar', (req, res) => {
    if (!requireAdmin(req, res)) return;
    try { markShipped(req.params.id, { courier: req.body.courier, trackingNo: req.body.trackingNo }); } catch (err) { /* diabaikan */ }
    res.redirect(safeAdminBack(req.body.back));
  });

  app.post('/admin/orders/:id/batal-hantar', (req, res) => {
    if (!requireAdmin(req, res)) return;
    try { unmarkShipped(req.params.id); } catch (err) { /* diabaikan */ }
    res.redirect(safeAdminBack(req.body.back));
  });

  app.get('/admin/export/packing.csv', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const view = packView(req.query.view);
    const rows = [];
    listForPacking(view).forEach((o) => o.items.forEach((it) => rows.push({ ...o, product_name: it.product_name, qty: it.quantity })));
    const csv = toCsv(rows, [
      { label: 'Order ID', value: 'id' },
      { label: 'Nama', value: 'customer_name' },
      { label: 'Telefon', value: 'phone' },
      { label: 'Penghantaran', value: 'delivery_method' },
      { label: 'Ejen', value: 'agent_name' },
      { label: 'Alamat', value: (r) => (r.delivery_method === 'Pos/Kurier' ? `${r.address}, ${r.postcode}, ${r.state}` : '') },
      { label: 'Biskut', value: 'product_name' },
      { label: 'Kuantiti', value: 'qty' },
      { label: 'Status Bayaran', value: 'payment_status' },
      { label: 'Status Hantar', value: (r) => r.shipping_status || 'BELUM' },
      { label: 'No. Tracking', value: (r) => r.tracking_no || '' },
      { label: 'Catatan', value: (r) => r.notes || '' },
    ]);
    res.download(csv, `JijahBake4U-SenaraiPacking-${view}-${Date.now()}.csv`);
  });

  app.get('/admin/products', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const rows = productSummary();
    res.send(adminLayout({ title: 'Ringkasan Biskut', active: 'products', bodyHtml: adminPages.productsAdminPage(rows) }));
  });

  app.get('/admin/production', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const rows = productSummary();
    res.send(adminLayout({ title: 'Perancangan Pengeluaran', active: 'production', bodyHtml: adminPages.productionPage(rows) }));
  });

  app.get('/admin/agents', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const rows = agentSummary();
    res.send(adminLayout({ title: 'Prestasi Ejen', active: 'agents', bodyHtml: adminPages.agentsPage(rows) }));
  });

  app.get('/admin/stok', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const products = listProductsForStock();
    res.send(adminLayout({ title: 'Stok Biskut', active: 'stock', bodyHtml: adminPages.stockPage(products) }));
  });

  app.post('/admin/stok', (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      updateStockBulk(req.body);
    } catch (err) { /* diabaikan */ }
    res.redirect('/admin/stok');
  });

  app.get('/admin/ejen-daftar', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const pending = listAgentsByStatus('MENUNGGU');
    const approved = listAgentsByStatus('DILULUSKAN');
    const rejected = listAgentsByStatus('DITOLAK');
    const suggestedMemberNo = getSuggestedMemberNo();
    res.send(adminLayout({ title: 'Pendaftaran Ejen', active: 'agent-registrations', bodyHtml: adminPages.agentRegistrationsPage(pending, approved, rejected, suggestedMemberNo) }));
  });

  app.post('/admin/ejen-daftar/:id/luluskan', (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      approveAgent(req.params.id, req.body.memberNo);
    } catch (err) { /* diabaikan — admin akan nampak rekod tak berubah dalam senarai */ }
    res.redirect('/admin/ejen-daftar');
  });

  app.post('/admin/ejen-daftar/:id/tolak', (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      rejectAgent(req.params.id);
    } catch (err) { /* diabaikan */ }
    res.redirect('/admin/ejen-daftar');
  });

  app.get('/admin/lucky-draw', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const rows = luckyDrawParticipants();
    res.send(adminLayout({ title: 'Cabutan Bertuah', active: 'lucky', bodyHtml: adminPages.luckyDrawPage(rows) }));
  });

  app.get('/admin/reports', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const monthly = monthlyReport();
    res.send(adminLayout({ title: 'Laporan Bulanan', active: 'reports', bodyHtml: adminPages.reportsPage(monthly) }));
  });

  app.get('/admin/export', (req, res) => {
    if (!requireAdmin(req, res)) return;
    res.send(adminLayout({ title: 'Export & Backup', active: 'export', bodyHtml: adminPages.exportPage() }));
  });

  // ---------- CSV Exports ----------
  app.get('/admin/export/orders.csv', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const orders = listOrders({});
    const rows = orders.map((o) => {
      const items = db.prepare('SELECT product_name, quantity FROM order_items WHERE order_id = ? ORDER BY id').all(o.id);
      const pays = db.prepare('SELECT COUNT(*) c FROM installments WHERE order_id = ?').get(o.id).c;
      return { ...o, itemList: items.map(it => `${it.product_name} x${it.quantity}`).join('; '), payCount: pays };
    });
    const csv = toCsv(rows, [
      { label: 'Order ID', value: 'id' },
      { label: 'Tarikh', value: (r) => formatDateTimeMY(r.created_at) },
      { label: 'Nama', value: 'customer_name' },
      { label: 'Telefon', value: 'phone' },
      { label: 'Email', value: 'email' },
      { label: 'Alamat', value: (r) => `${r.address}, ${r.postcode}, ${r.state}` },
      { label: 'Ejen', value: 'agent_name' },
      { label: 'Kaedah Penghantaran', value: 'delivery_method' },
      { label: 'Kos Penghantaran', value: 'postage_amount' },
      { label: 'Jumlah Bekas', value: 'total_containers' },
      { label: 'Jumlah Harga', value: 'total_amount' },
      { label: 'Senarai Biskut', value: 'itemList' },
      { label: 'Bilangan Bil Bayaran', value: 'payCount' },
      { label: 'Jumlah Dibayar', value: 'paid_amount' },
      { label: 'Baki', value: 'balance' },
      { label: 'Status Bayaran', value: 'payment_status' },
      { label: 'Status Tempahan', value: 'order_status' },
      { label: 'Status Hantar', value: (r) => r.shipping_status || 'BELUM' },
      { label: 'Tarikh Hantar', value: (r) => (r.shipped_at ? formatDateTimeMY(r.shipped_at) : '') },
      { label: 'No. Tracking', value: (r) => r.tracking_no || '' },
      { label: 'Lucky Draw', value: 'lucky_draw_status' },
      { label: 'Catatan', value: 'notes' },
    ]);
    res.download(csv, `JijahBake4U-Tempahan-${Date.now()}.csv`);
  });

  app.get('/admin/export/products.csv', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const rows = productSummary();
    const csv = toCsv(rows, [{ label: 'Nama Biskut', value: 'name' }, { label: 'Jumlah Bekas', value: 'totalQty' }]);
    res.download(csv, `JijahBake4U-RingkasanBiskut-${Date.now()}.csv`);
  });

  app.get('/admin/export/payments.csv', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const rows = allPayments();
    const csv = toCsv(rows, [
      { label: 'Nama', value: 'customer_name' },
      { label: 'Order ID', value: 'orderId' },
      { label: 'Bayaran No.', value: 'installment_number' },
      { label: 'Jumlah', value: 'amount' },
      { label: 'Tarikh', value: (r) => r.payment_date ? formatDateTimeMY(r.payment_date) : '' },
      { label: 'Transaction ID', value: 'transaction_id' },
      { label: 'Gateway', value: 'gateway' },
      { label: 'Status', value: 'status' },
    ]);
    res.download(csv, `JijahBake4U-RekodBayaran-${Date.now()}.csv`);
  });

  app.get('/admin/export/lucky-draw.csv', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const rows = luckyDrawParticipants();
    const csv = toCsv(rows, [
      { label: 'No.', value: (r, i) => i + 1 },
      { label: 'Nama', value: 'customer_name' },
      { label: 'Telefon', value: 'phone' },
      { label: 'Order ID', value: 'orderId' },
      { label: 'Jumlah Bekas', value: 'total_containers' },
      { label: 'Status', value: 'order_status' },
    ]);
    res.download(csv, `JijahBake4U-CabutanBertuah-${Date.now()}.csv`);
  });

  // ---------- Backup ----------
  app.get('/admin/backup.json', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const backup = {
      generatedAt: new Date().toISOString(),
      products: db.prepare('SELECT * FROM products').all(),
      agents: db.prepare('SELECT * FROM agents').all(),
      orders: db.prepare('SELECT * FROM orders').all(),
      orderItems: db.prepare('SELECT * FROM order_items').all(),
      installments: db.prepare('SELECT * FROM installments').all(),
      paymentLog: db.prepare('SELECT * FROM payment_log').all(),
    };
    res.download(JSON.stringify(backup, null, 2), `JijahBake4U-Backup-${Date.now()}.json`, 'application/json; charset=utf-8');
  });
}

module.exports = { registerAdminRoutes };
