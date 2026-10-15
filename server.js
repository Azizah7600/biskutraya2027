const { loadEnv } = require('./lib/env');
loadEnv();

const path = require('path');
const { App } = require('./lib/app');
require('./lib/db'); // initialise + sync products on boot

const { registerSiteRoutes } = require('./routes/site');
const { registerApiRoutes } = require('./routes/api');
const { registerAdminRoutes } = require('./routes/admin');
const toyyibpay = require('./lib/gateways/toyyibpay');

const app = new App();

app.static('/images', path.join(__dirname, 'public', 'images'));
app.static('/css', path.join(__dirname, 'public', 'css'));
app.static('/js', path.join(__dirname, 'public', 'js'));

registerSiteRoutes(app);
registerApiRoutes(app);
registerAdminRoutes(app);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n  JIJAH BAKE4U — Tempahan Biskut Raya Jijah Bake4U 2027`);
  console.log(`  Server berjalan di: http://localhost:${PORT}`);
  console.log(`  Admin dashboard:    http://localhost:${PORT}/admin/login`);

  // --- Diagnostik ToyyibPay (untuk semak status sambungan tanpa dedah Secret Key) ---
  const gatewaySelected = process.env.PAYMENT_GATEWAY || '(tiada — lalai: sandbox)';
  const gatewayReady = process.env.PAYMENT_GATEWAY === 'toyyibpay' && toyyibpay.isConfigured();
  console.log(`\n  --- Status Pembayaran ---`);
  console.log(`  PAYMENT_GATEWAY dalam .env : ${gatewaySelected}`);
  console.log(`  TOYYIBPAY_SECRET_KEY       : ${process.env.TOYYIBPAY_SECRET_KEY ? 'DIJUMPAI ✓' : 'TIDAK DIJUMPAI ✗'}`);
  console.log(`  TOYYIBPAY_CATEGORY_CODE    : ${process.env.TOYYIBPAY_CATEGORY_CODE ? 'DIJUMPAI ✓' : 'TIDAK DIJUMPAI ✗'}`);
  console.log(`  TOYYIBPAY_BASE_URL         : ${process.env.TOYYIBPAY_BASE_URL || '(tiada)'}`);
  console.log(gatewayReady
    ? `  => ToyyibPay AKTIF. Butang BAYAR sebenar akan keluar di halaman pembayaran.\n`
    : `  => ToyyibPay BELUM aktif — halaman pembayaran akan tunjuk SIMULASI (mod sandbox dalaman).\n     Jika ini tidak dijangka, semak fail .env (nama fail mesti tepat ".env", letak sebaris\n     dengan server.js, dan mesti restart "node server.js" selepas ubah fail .env).\n`);
});
