const { db } = require('../lib/db');
const { layout } = require('../views/layout');
const pages = require('../views/pages');
const { getOrderWithDetails } = require('../lib/payment');
const { listApprovedAgents } = require('../lib/agents');
const toyyibpay = require('../lib/gateways/toyyibpay');
const { addItemsAllowed } = require('../lib/orders');

function isGatewayReady() {
  return process.env.PAYMENT_GATEWAY === 'toyyibpay' && toyyibpay.isConfigured();
}

function getActiveProducts() {
  return db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY sort_order ASC').all();
}

function phoneMatches(a, b) {
  const norm = (s) => String(s || '').replace(/\D/g, '');
  return norm(a) && norm(a) === norm(b);
}

function registerSiteRoutes(app) {
  app.get('/', (req, res) => {
    res.send(layout({
      title: 'Tempahan Biskut Raya Jijah Bake4U 2027',
      description: 'Tempah biskut raya kegemaran anda — bayar melalui ToyyibPay atau hantar resit. Jijah Bake4U.',
      activeNav: 'home',
      bodyHtml: pages.homeBody(),
    }));
  });

  app.get('/produk', (req, res) => {
    const products = getActiveProducts();
    res.send(layout({
      title: 'Katalog Biskut Raya 2027',
      description: 'Katalog Biskut Raya 2027 Jijah Bake4U — 30 pilihan biskut, harga dari RM26 sebekas.',
      activeNav: 'produk',
      bodyHtml: pages.productsBody(products),
    }));
  });

  // Laman ini tiada ansuran — pautan lama /ansuran dihalakan ke katalog.
  app.get('/ansuran', (req, res) => res.redirect('/produk'));

  app.get('/cara-tempahan', (req, res) => {
    res.send(layout({ title: 'Cara Tempahan', activeNav: 'cara', bodyHtml: pages.caraTempahanBody() }));
  });

  app.get('/cabutan-bertuah', (req, res) => {
    res.send(layout({ title: 'Cabutan Bertuah', activeNav: 'cabutan', bodyHtml: pages.cabutanBody() }));
  });

  app.get('/ejen', (req, res) => {
    res.send(layout({ title: 'Peluang Ejen', activeNav: 'ejen', bodyHtml: pages.ejenBody() }));
  });

  app.get('/ejen/daftar', (req, res) => {
    res.send(layout({
      title: 'Pendaftaran Ejen',
      description: 'Daftar sebagai Ejen Jijah Bake4U — raih pendapatan tambahan menjelang musim raya.',
      activeNav: 'ejen',
      bodyHtml: pages.daftarEjenBody(),
    }));
  });

  app.get('/ejen/daftar/berjaya', (req, res) => {
    res.send(layout({ title: 'Pendaftaran Diterima', activeNav: 'ejen', bodyHtml: pages.daftarEjenSuccessBody() }));
  });

  app.get('/hubungi', (req, res) => {
    res.send(layout({ title: 'Hubungi Kami', activeNav: 'hubungi', bodyHtml: pages.hubungiBody() }));
  });

  app.get('/tempahan/keranjang', (req, res) => {
    res.send(layout({ title: 'Tempahan Saya (Cart)', bodyHtml: pages.cartBody() }));
  });

  app.get('/tempahan/checkout', (req, res) => {
    const approvedAgents = listApprovedAgents();
    res.send(layout({ title: 'Checkout', bodyHtml: pages.checkoutBody(approvedAgents) }));
  });

  app.get('/tempahan/berjaya', (req, res) => {
    const orderId = req.query.id;
    const details = orderId ? getOrderWithDetails(orderId) : null;
    if (!details) return res.redirect('/');
    res.send(layout({ title: 'Tempahan Berjaya', bodyHtml: pages.orderSuccessBody(details.order, details.items, details.installments) }));
  });

  app.get('/tempahan-saya', (req, res) => {
    res.send(layout({ title: 'Semak Tempahan Saya', bodyHtml: pages.orderLookupBody() }));
  });

  app.get('/tempahan/status/:id', (req, res) => {
    const details = getOrderWithDetails(req.params.id);
    if (!details || !phoneMatches(details.order.phone, req.query.phone)) {
      return res.send(layout({
        title: 'Tidak Dijumpai',
        bodyHtml: `<section class="section-tight"><div class="container text-center"><h1 class="section-title">Tempahan Tidak Dijumpai</h1><p>Sila semak semula Order ID dan No. Telefon anda.</p><a href="/tempahan-saya" class="btn btn-primary">Semak Semula</a></div></section>`,
      }));
    }
    res.send(layout({ title: `Status ${details.order.id}`, bodyHtml: pages.orderStatusBody(details.order, details.items, details.installments, !!req.query.justReturned, addItemsAllowed(details.order), req.query.notice || '') }));
  });

  // Pelanggan tambah biskut pada tempahan sedia ada.
  app.get('/tempahan/tambah/:id', (req, res) => {
    const details = getOrderWithDetails(req.params.id);
    if (!details || !phoneMatches(details.order.phone, req.query.phone)) return res.redirect('/tempahan-saya');
    const statusUrl = `/tempahan/status/${details.order.id}?phone=${encodeURIComponent(details.order.phone)}`;
    if (!addItemsAllowed(details.order)) return res.redirect(statusUrl);
    res.send(layout({ title: 'Tambah Biskut', bodyHtml: pages.addItemsBody(details.order, getActiveProducts()) }));
  });

  app.get('/bayar/:orderId/:installmentNumber', (req, res) => {
    const details = getOrderWithDetails(req.params.orderId);
    if (!details || !phoneMatches(details.order.phone, req.query.phone)) return res.redirect('/tempahan-saya');
    const installment = details.installments.find(i => i.installment_number === parseInt(req.params.installmentNumber, 10));
    if (!installment) return res.redirect(`/tempahan/status/${details.order.id}?phone=${encodeURIComponent(details.order.phone)}`);
    if (installment.status === 'PAID') return res.redirect(`/tempahan/status/${details.order.id}?phone=${encodeURIComponent(details.order.phone)}`);
    res.send(layout({ title: 'Buat Bayaran', bodyHtml: pages.paymentSandboxBody(details.order, installment, isGatewayReady()) }));
  });

  app.get('/pembayaran/keputusan', (req, res) => {
    const details = getOrderWithDetails(req.query.orderId);
    if (!details) return res.redirect('/');
    const installment = details.installments.find(i => i.installment_number === parseInt(req.query.installment, 10));
    res.send(layout({ title: 'Keputusan Pembayaran', bodyHtml: pages.paymentResultBody(req.query.status, details.order, installment) }));
  });
}

module.exports = { registerSiteRoutes, getActiveProducts, phoneMatches };
