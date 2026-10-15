const { CONFIG, escapeHtml } = require('../lib/helpers');

const NAV_LINKS = [
  { href: '/', label: 'HOME', key: 'home' },
  { href: '/produk', label: 'KATALOG BISKUT', key: 'produk' },
  { href: '/cara-tempahan', label: 'CARA TEMPAHAN', key: 'cara' },
  { href: '/cabutan-bertuah', label: 'CABUTAN BERTUAH', key: 'cabutan' },
  { href: '/ejen', label: 'EJEN', key: 'ejen' },
  { href: '/hubungi', label: 'HUBUNGI KAMI', key: 'hubungi' },
];

function waLink(message) {
  return `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function mapsLink() {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONFIG.STORE_ADDRESS)}`;
}

function header(activeNav) {
  return `
  <div class="top-bar">
    <div class="top-bar-inner">
      <a href="${waLink('Assalamualaikum Jijah Bake4U. Saya berminat untuk membuat Tempahan Biskut Raya Jijah Bake4U 2027.')}" target="_blank" rel="noopener" class="top-bar-item">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12.04 2A9.94 9.94 0 0 0 2.1 12.04c0 1.77.46 3.45 1.27 4.9L2 22l5.2-1.36a9.9 9.9 0 0 0 4.84 1.24h.01c5.5 0 9.95-4.46 9.95-9.96C21.99 6.46 17.54 2 12.04 2Z" opacity="0"/><path d="M12.04 2.67C6.98 2.67 2.87 6.77 2.87 11.83c0 1.63.43 3.14 1.19 4.46L3 21.33l5.19-1.36a9.95 9.95 0 0 0 3.85.77c5.05 0 9.16-4.1 9.16-9.16 0-2.45-.95-4.75-2.68-6.48a9.1 9.1 0 0 0-6.48-2.43Z"/></svg>
        019-989 4745
      </a>
      <span class="top-bar-item"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>8:00 Pagi – 6:30 Petang | Jumaat Tutup</span>
      <a href="${mapsLink()}" target="_blank" rel="noopener" class="top-bar-item top-bar-address">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        ${escapeHtml(CONFIG.STORE_ADDRESS)}
      </a>
    </div>
  </div>
  <header class="site-header" id="siteHeader">
    <div class="header-inner">
      <a href="/" class="brand">
        <img src="/images/logo.png" alt="Jijah Bake4U" class="brand-logo" />
        <span class="brand-text">
          <span class="brand-name">Jijah Bake4U</span>
          <span class="brand-tagline">Tempahan Biskut Raya 2027</span>
        </span>
      </a>
      <nav class="main-nav" id="mainNav">
        ${NAV_LINKS.map(l => `<a href="${l.href}" class="${activeNav === l.key ? 'active' : ''}">${l.label}</a>`).join('')}
      </nav>
      <div class="header-actions">
        <a href="/tempahan-saya" class="header-icon-link" title="Semak Tempahan Saya" aria-label="Semak Tempahan Saya">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 12c2.7 0 4.9-2.2 4.9-4.9S14.7 2.2 12 2.2 7.1 4.4 7.1 7.1 9.3 12 12 12Zm0 2.2c-3.6 0-9.8 1.8-9.8 5.5v2.1h19.6v-2.1c0-3.7-6.2-5.5-9.8-5.5Z"/></svg>
        </a>
        <a href="/tempahan/keranjang" class="header-icon-link cart-link" title="Tempahan Saya" aria-label="Cart">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M1 1h3l2.6 13.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6L22 5H6"/></svg>
          <span class="cart-badge" id="cartBadge">0</span>
        </a>
        <button class="hamburger" id="hamburgerBtn" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
    <nav class="mobile-nav" id="mobileNav">
      ${NAV_LINKS.map(l => `<a href="${l.href}" class="${activeNav === l.key ? 'active' : ''}">${l.label}</a>`).join('')}
      <a href="/tempahan-saya">SEMAK TEMPAHAN SAYA</a>
    </nav>
  </header>`;
}

// Bar tulisan bergerak (marquee) di bawah header — cadangan tulisan terus daripada Jijah Bake4U.
// Kandungan diulang beberapa kali dalam SATU track, kemudian track itu sendiri diduplikasi (lihat
// CSS .marquee-track) supaya pergerakan nampak "tanpa sambungan" (seamless loop).
const MARQUEE_ITEMS = ['BISKUT PREMIUM', '21 TAHUN DI PASARAN', 'JANGAN TUNGGU HABIS STOK'];

function marqueeBar() {
  const itemsHtml = MARQUEE_ITEMS.map((t) => `<span class="marquee-item">${escapeHtml(t)}</span><span class="marquee-sep" aria-hidden="true">&#10022;</span>`).join('');
  return `
  <div class="marquee-bar" role="marquee" aria-label="Pengumuman Jijah Bake4U">
    <div class="marquee-track">
      <span class="marquee-group">${itemsHtml}</span>
      <span class="marquee-group" aria-hidden="true">${itemsHtml}</span>
    </div>
  </div>`;
}

function footer() {
  const year = new Date().getFullYear();
  return `
  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-col footer-brand">
        <img src="/images/logo.png" alt="Jijah Bake4U" class="footer-logo" />
        <h3>JIJAH BAKE4U</h3>
        <p>Tempahan Biskut Raya Jijah Bake4U 2027</p>
        <p class="footer-address">${escapeHtml(CONFIG.STORE_ADDRESS)}</p>
      </div>
      <div class="footer-col">
        <h4>Pautan Pantas</h4>
        <a href="/produk">Katalog Biskut</a>
        <a href="/tempahan-saya">Semak Tempahan</a>
        <a href="/cara-tempahan">Cara Tempahan</a>
        <a href="/cabutan-bertuah">Cabutan Bertuah</a>
        <a href="/ejen">Jadi Ejen</a>
      </div>
      <div class="footer-col">
        <h4>Hubungi Kami</h4>
        <a href="${waLink('Assalamualaikum Jijah Bake4U. Saya berminat untuk membuat Tempahan Biskut Raya Jijah Bake4U 2027.')}" target="_blank" rel="noopener">WhatsApp: 0199894745</a>
        <a href="https://facebook.com/JijahBake4U" target="_blank" rel="noopener">Facebook: JijahBake4U</a>
        <a href="https://tiktok.com/@jijahbake4u" target="_blank" rel="noopener">TikTok: @jijahbake4u</a>
        <a href="${mapsLink()}" target="_blank" rel="noopener">Lihat Lokasi Kedai</a>
      </div>
      <div class="footer-col">
        <h4>Waktu Operasi</h4>
        <p>8:00 Pagi – 6:30 Petang</p>
        <p>Jumaat – Tutup</p>
        <a href="/admin/login" class="footer-admin-link">Admin Login</a>
      </div>
    </div>
    <div class="footer-bottom">&copy; ${year} Jijah Bake4U. Hak Cipta Terpelihara.</div>
  </footer>`;
}

function layout({ title, description = '', activeNav = '', bodyHtml = '', extraHead = '', extraScripts = '', bodyClass = '' }) {
  return `<!DOCTYPE html>
<html lang="ms">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)} | Jijah Bake4U</title>
<meta name="description" content="${escapeHtml(description)}" />
<link rel="icon" href="/images/logo.png" />
<link rel="stylesheet" href="/css/style.css" />
${extraHead}
</head>
<body class="${bodyClass}">
${header(activeNav)}
${marqueeBar()}
<main>
${bodyHtml}
</main>
${footer()}
<div class="toast" id="toast"></div>
<script src="/js/main.js"></script>
${extraScripts}
</body>
</html>`;
}

module.exports = { layout, waLink, mapsLink, NAV_LINKS };
