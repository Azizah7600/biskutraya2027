const { escapeHtml } = require('../lib/helpers');

const MENU = [
  { href: '/admin/dashboard', label: 'Dashboard', key: 'dashboard', icon: '📊' },
  { href: '/admin/orders', label: 'Semua Tempahan', key: 'orders', icon: '🧾' },
  { href: '/admin/resit', label: 'Semak Resit Bayaran', key: 'receipts', icon: '🧾' },
  { href: '/admin/packing', label: 'Packing & Penghantaran', key: 'packing', icon: '📦' },
  { href: '/admin/products', label: 'Ringkasan Biskut', key: 'products', icon: '🍪' },
  { href: '/admin/production', label: 'Perancangan Pengeluaran', key: 'production', icon: '🏭' },
  { href: '/admin/stok', label: 'Stok Biskut', key: 'stock', icon: '📦' },
  { href: '/admin/ejen-daftar', label: 'Pendaftaran Ejen', key: 'agent-registrations', icon: '📝' },
  { href: '/admin/agents', label: 'Prestasi Ejen', key: 'agents', icon: '🤝' },
  { href: '/admin/lucky-draw', label: 'Cabutan Bertuah', key: 'lucky', icon: '🎁' },
  { href: '/admin/reports', label: 'Laporan Bulanan', key: 'reports', icon: '📅' },
  { href: '/admin/export', label: 'Export & Backup', key: 'export', icon: '💾' },
];

function adminLayout({ title, active = '', bodyHtml = '', extraHead = '', extraScripts = '' }) {
  return `<!DOCTYPE html>
<html lang="ms">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)} | Admin Jijah Bake4U</title>
<link rel="icon" href="/images/logo.png" />
<link rel="stylesheet" href="/css/style.css" />
${extraHead}
</head>
<body class="admin-body">
  <div class="admin-shell">
    <aside class="admin-sidebar">
      <div class="brand-mini"><img src="/images/logo.png" alt="logo" /><span>JIJAH BAKE4U<br/><small style="opacity:.7;font-weight:400;">Admin Dashboard</small></span></div>
      ${MENU.map(m => `<a href="${m.href}" class="${active === m.key ? 'active' : ''}">${m.icon} ${m.label}</a>`).join('')}
      <a href="/admin/logout" style="margin-top:16px;border-top:1px solid rgba(255,255,255,.1);padding-top:16px;">🚪 Log Keluar</a>
      <a href="/" target="_blank" style="opacity:.6;">🌐 Lihat Website</a>
    </aside>
    <main class="admin-main">
      ${bodyHtml}
    </main>
  </div>
${extraScripts}
</body>
</html>`;
}

module.exports = { adminLayout, MENU };
