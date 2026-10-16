const { escapeHtml, money, CONFIG, formatDateTimeMY } = require('../lib/helpers');
const { waLink, mapsLink } = require('./layout');

function productPhotoHtml(p, cssClass = 'product-photo') {
  if (p.image) {
    return `<div class="${cssClass}"><img src="/images/${p.image}" alt="${escapeHtml(p.name)}" loading="lazy" /></div>`;
  }
  return `<div class="${cssClass} placeholder">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="1.8"/><path d="M21 15l-5-5-9 9"/></svg>
    <span>Gambar akan dikemaskini</span>
  </div>`;
}

// Paparan stok bekas untuk makluman pelanggan sahaja — tempahan TETAP dibenarkan walaupun
// stok 0 (ikut arahan Jijah Bake4U, bukan sekatan automatik).
// Unit jualan: produk kotak (Combo Box / Gift Box) dikira "kotak", selebihnya "bekas".
function productUnit(p) {
  return /kotak/i.test(String(p.size || '')) ? 'kotak' : 'bekas';
}

function productStockHtml(p) {
  const unit = productUnit(p);
  const stock = Number(p.stock) || 0;
  if (stock <= 0) {
    return `<div class="product-stock stock-out">Habis Stok Buat Masa Ini</div>`;
  }
  if (stock <= 5) {
    return `<div class="product-stock stock-low">Baki ${stock} ${unit} sahaja</div>`;
  }
  return `<div class="product-stock">Baki ${stock} ${unit}</div>`;
}

function productCard(p) {
  return `
  <div class="product-card" data-id="${p.id}" data-name="${escapeHtml(p.name)}" data-image="${p.image || ''}"
       data-description="${escapeHtml(p.description || '')}" data-note="${escapeHtml(p.note || '')}" data-unit="${productUnit(p)}" data-agent-discount="${p.agent_discount === null || p.agent_discount === undefined ? '' : Number(p.agent_discount)}" data-price="${Number(p.installment_price)}"
       data-size="${escapeHtml(p.size || '')}">
    ${productPhotoHtml(p)}
    <div class="product-body">
      <h3 class="product-name">${escapeHtml(p.name)}</h3>
      <div class="product-size">${escapeHtml(p.size || '')}</div>
      <p class="product-desc">${escapeHtml(p.description || '')}</p>
      ${p.note ? `<p class="product-note" style="font-size:.74rem;font-style:italic;color:var(--text-muted);margin:-4px 0 8px;">${escapeHtml(p.note)}</p>` : ''}
      <div class="product-prices">
        <span class="price-installment">${money(p.installment_price)}</span>
      </div>
      <div class="price-note">Harga Se${productUnit(p)}</div>
      ${productStockHtml(p)}
      <div class="qty-row">
        <div class="qty-stepper">
          <button type="button" class="qty-minus">-</button>
          <input type="number" class="qty-input" value="1" min="1" />
          <button type="button" class="qty-plus">+</button>
        </div>
        <button type="button" class="btn btn-primary btn-sm add-cart-btn">Tambah</button>
      </div>
    </div>
  </div>`;
}

function productModalHtml() {
  return `
  <div class="modal-overlay" id="productModal">
    <div class="modal-box">
      <button class="modal-close" aria-label="Tutup">&times;</button>
      <div class="modal-photo">
        <img class="modal-photo-img" src="" alt="" style="display:none;" />
        <div class="modal-photo-placeholder" style="display:none;flex-direction:column;align-items:center;gap:8px;color:var(--gold-dark);">
          <svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="1.8"/><path d="M21 15l-5-5-9 9"/></svg>
          <span>Gambar akan dikemaskini</span>
        </div>
      </div>
      <div class="modal-info">
        <h2 class="modal-name"></h2>
        <div class="product-size modal-size"></div>
        <p class="modal-desc"></p>
        <p class="modal-note" style="font-size:.8rem;font-style:italic;color:var(--text-muted);margin-top:-6px;"></p>
        <div class="product-prices">
          <span class="price-installment modal-installment-price"></span>
        </div>
        <div class="price-note modal-price-note">Harga Sebekas</div>
        <div class="qty-row" style="margin-top:20px;">
          <div class="qty-stepper">
            <button type="button" class="modal-qty-minus">-</button>
            <input type="number" class="modal-qty" value="1" min="1" />
            <button type="button" class="modal-qty-plus">+</button>
          </div>
        </div>
        <div class="order-line" style="margin-top:14px;"><span>Subtotal</span><span class="modal-subtotal" style="font-weight:700;color:var(--gold-dark);"></span></div>
        <button type="button" class="btn btn-primary btn-block modal-add-btn" style="margin-top:16px;">TAMBAH KE TEMPAHAN</button>
      </div>
    </div>
  </div>`;
}

function waFloat() {
  return `<a class="wa-float" href="${waLink('Assalamualaikum Jijah Bake4U. Saya berminat untuk membuat Tempahan Biskut Raya Jijah Bake4U 2027.')}" target="_blank" rel="noopener" aria-label="WhatsApp">
    <svg viewBox="0 0 32 32" fill="currentColor"><path d="M16.04 2.67C8.9 2.67 3.1 8.46 3.1 15.6c0 2.47.68 4.78 1.87 6.76L3 29.33l7.15-1.9a12.9 12.9 0 0 0 5.9 1.43h.01c7.14 0 12.94-5.79 12.94-12.93 0-3.46-1.35-6.71-3.79-9.15a12.83 12.83 0 0 0-9.17-3.8v.01Zm0 23.6h-.01c-1.85 0-3.66-.5-5.24-1.44l-.38-.22-4.24 1.13 1.13-4.13-.24-.42a10.65 10.65 0 0 1-1.63-5.7c0-5.9 4.8-10.7 10.71-10.7 2.86 0 5.55 1.12 7.57 3.14a10.63 10.63 0 0 1 3.13 7.57c0 5.9-4.8 10.7-10.7 10.7Zm5.87-8.02c-.32-.16-1.9-.94-2.2-1.04-.3-.11-.51-.16-.73.16-.21.32-.83 1.04-1.02 1.25-.19.22-.38.24-.7.08-.32-.16-1.34-.5-2.55-1.58-.94-.84-1.58-1.88-1.76-2.2-.19-.32-.02-.5.14-.65.14-.14.32-.38.48-.57.16-.19.21-.32.32-.54.11-.22.05-.4-.03-.57-.08-.16-.73-1.76-1-2.42-.26-.63-.53-.55-.73-.56h-.62c-.22 0-.57.08-.86.4-.3.32-1.13 1.1-1.13 2.7 0 1.6 1.16 3.14 1.32 3.35.16.22 2.28 3.48 5.53 4.88.77.33 1.37.53 1.84.68.77.25 1.48.21 2.03.13.62-.09 1.9-.78 2.17-1.53.27-.75.27-1.4.19-1.53-.08-.14-.29-.22-.61-.38Z"/></svg>
  </a>`;
}

// Gambar hero utama muka depan (gambar keluarga sebenar Jijah Bake4U yang diberikan).
// Nak tukar gambar ni di masa depan?
// 1) Letak fail gambar baru dalam folder public/images/
// 2) Tukar nilai HERO_MAIN_IMAGE di bawah kepada nama fail gambar baru itu
// 3) Mulakan semula server (node server.js)
const HERO_MAIN_IMAGE = 'hero-banner-2027.jpg';

function homeBody() {
  return `
  <section class="hero-banner">
    <h1 class="visually-hidden">Tempahan Biskut Raya Jijah Bake4U 2027</h1>
    <div class="hero-banner-img">
      <img src="/images/${HERO_MAIN_IMAGE}" alt="Biskut Raya Jijah Bake4U 2027 — pelbagai biskut raya, Combo Box dan Gift Box" width="1672" height="941" />
    </div>
    <div class="hero-banner-bar">
      <div class="hero-banner-inner">
        <p class="hero-desc">Tempah awal biskut raya kegemaran keluarga. Bayar terus secara online melalui ToyyibPay atau hantar resit pindahan bank.</p>
        <div class="hero-ctas">
          <a href="/produk" class="btn btn-primary">TEMPAH SEKARANG</a>
          <a href="/produk" class="btn btn-outline">LIHAT KATALOG BISKUT</a>
        </div>
        <div class="hero-highlights">
          <div class="hero-highlight-item"><span class="hero-highlight-icon" aria-hidden="true">&#10022;</span>21 TAHUN DI PASARAN</div>
          <div class="hero-highlight-item"><span class="hero-highlight-icon" aria-hidden="true">&#10022;</span>30 PILIHAN BISKUT</div>
          <div class="hero-highlight-item"><span class="hero-highlight-icon" aria-hidden="true">&#10022;</span>BAYARAN MUDAH &amp; SELAMAT</div>
        </div>
      </div>
    </div>
  </section>

  <section class="section-tight" style="background:var(--ivory);border-bottom:1px solid var(--border-soft);">
    <div class="container text-center">
      <span class="eyebrow">Cara Bayaran</span>
      <h2 class="section-title">Dua Cara Mudah Untuk Bayar</h2>
      <p class="section-sub">Bayar penuh selepas buat tempahan. Pilih cara yang paling mudah untuk anda.</p>
      <div class="package-grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr));max-width:720px;margin-left:auto;margin-right:auto;">
        <div class="package-card">
          <div class="package-qty">PILIHAN 1</div>
          <div class="package-total" style="font-size:1.4rem;">ToyyibPay</div>
          <div class="package-monthly">FPX online banking / kad — disahkan automatik</div>
        </div>
        <div class="package-card">
          <div class="package-qty">PILIHAN 2</div>
          <div class="package-total" style="font-size:1.4rem;">Hantar Resit</div>
          <div class="package-monthly">Pindahan bank, kemudian muat naik resit di website</div>
        </div>
      </div>
      <p style="margin-top:18px;font-size:.9rem;">Terlupa sesuatu? Anda boleh <b>tambah biskut lain</b> pada tempahan yang sama melalui <a href="/tempahan-saya">Semak Tempahan Saya</a>.</p>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="promo-grid">
        <div class="promo-card">
          <div class="promo-icon">🍪</div>
          <h3>PELBAGAI JENIS BISKUT</h3>
          <p>Pelbagai pilihan biskut raya untuk keluarga.</p>
        </div>
        <div class="promo-card">
          <div class="promo-icon">💰</div>
          <h3>HARGA DARI RM26</h3>
          <p>Harga ikut jenis biskut — dari RM26 sebekas. Ada Combo Box &amp; Gift Box.</p>
        </div>
        <div class="promo-card">
          <div class="promo-icon">📅</div>
          <h3>TAMBAH BILA-BILA MASA</h3>
          <p>Boleh tambah biskut lain pada tempahan anda kemudian.</p>
        </div>
        <div class="promo-card">
          <div class="promo-icon">🎁</div>
          <h3>BELI 10 BEKAS ATAU LEBIH</h3>
          <p>Layak menyertai cabutan bertuah.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="section" style="background:var(--ivory);border-top:1px solid var(--border-soft);border-bottom:1px solid var(--border-soft);">
    <div class="container">
      <div class="two-col">
        <div>
          <span class="eyebrow">Cara Tempahan</span>
          <h2 class="section-title">Mudah Dalam 4 Langkah</h2>
          <p>Daripada memilih biskut kegemaran sehingga menerima biskut raya di rumah — semuanya diurus secara telus dengan rekod tempahan dan bayaran yang jelas.</p>
          <a href="/cara-tempahan" class="btn btn-outline" style="margin-top:10px;">LIHAT CARA TEMPAHAN</a>
        </div>
        <div class="steps-grid" style="grid-template-columns:1fr 1fr;">
          <div class="step-card"><div class="step-num">01</div><h4>Pilih Biskut</h4></div>
          <div class="step-card"><div class="step-num">02</div><h4>Pilih Jumlah Bekas</h4></div>
          <div class="step-card"><div class="step-num">03</div><h4>Bayar Online / Hantar Resit</h4></div>
          <div class="step-card"><div class="step-num">04</div><h4>Terima Biskut Raya</h4></div>
        </div>
      </div>
    </div>
  </section>

  <section class="section text-center">
    <div class="container">
      <span class="eyebrow">Jangan Lepaskan Peluang</span>
      <h2 class="section-title">Tempah Biskut Raya Kegemaran Anda Sekarang</h2>
      <p class="section-sub">Stok terhad setiap tahun. Tempah awal supaya biskut kegemaran keluarga tidak terlepas.</p>
      <a href="/produk" class="btn btn-primary">TEMPAH SEKARANG</a>
    </div>
  </section>
  ${waFloat()}
  `;
}

function productsBody(products) {
  return `
  <section class="section-tight">
    <div class="container text-center">
      <span class="eyebrow">Katalog Premium</span>
      <h1 class="section-title">Pilihan Biskut Raya</h1>
      <p class="section-sub">Harga sebekas ikut Katalog Biskut Raya 2027. Pilih biskut, masukkan bilangan bekas dan tekan Tambah.</p>
    </div>
  </section>
  <section class="section-tight">
    <div class="container">
      <div class="filter-bar">
        <input type="text" id="productSearch" placeholder="Cari nama biskut..." oninput="JB4U_filterProducts(this.value)" />
      </div>
      <div class="product-grid" id="productGrid">
        ${products.map(productCard).join('')}
      </div>
    </div>
  </section>
  ${productModalHtml()}
  ${waFloat()}
  <script>
  function JB4U_filterProducts(q) {
    q = q.toLowerCase();
    document.querySelectorAll('#productGrid .product-card').forEach(function(card){
      var name = card.dataset.name.toLowerCase();
      card.style.display = name.indexOf(q) !== -1 ? '' : 'none';
    });
  }
  </script>
  `;
}

function caraTempahanBody() {
  const steps = [
    { n: '01', t: 'PILIH BISKUT', d: 'Layari 30 pilihan biskut raya kami dan pilih biskut kegemaran keluarga anda.' },
    { n: '02', t: 'ISI MAKLUMAT', d: 'Semak troli, isi nama, alamat dan pilihan penghantaran / pickup, kemudian hantar tempahan.' },
    { n: '03', t: 'BAYAR', d: 'Bayar penuh secara online melalui ToyyibPay, ATAU buat pindahan bank dan muat naik resit di website.' },
    { n: '04', t: 'TERIMA BISKUT RAYA', d: 'Biskut raya akan disediakan mengikut jadual penghantaran/pickup. Nak tambah biskut? Buka Semak Tempahan Saya bila-bila masa.' },
  ];
  return `
  <section class="section-tight">
    <div class="container text-center">
      <span class="eyebrow">Panduan</span>
      <h1 class="section-title">Cara Tempahan</h1>
      <p class="section-sub">Empat langkah mudah untuk menempah biskut raya Jijah Bake4U.</p>
    </div>
  </section>
  <section class="section-tight">
    <div class="container">
      <div class="steps-grid">
        ${steps.map(s => `<div class="step-card"><div class="step-num">${s.n}</div><h3>${s.t}</h3><p>${s.d}</p></div>`).join('')}
      </div>
      <div class="text-center" style="margin-top:40px;">
        <a href="/produk" class="btn btn-primary">MULA TEMPAH SEKARANG</a>
      </div>
    </div>
  </section>
  ${waFloat()}
  `;
}

function cabutanBody() {
  return `
  <section class="section-tight">
    <div class="container text-center">
      <span class="eyebrow">Peluang Istimewa</span>
      <h1 class="section-title">Cabutan Bertuah</h1>
      <p class="section-sub">Tempahan 10 bekas atau lebih (dalam satu tempahan) layak disertakan secara automatik ke dalam Cabutan Bertuah Jijah Bake4U.</p>
    </div>
  </section>
  <section class="section-tight" style="padding-top:0;">
    <div class="container">
      <div class="poster-frame">
        <img src="/images/cabutan-bertuah-poster.jpg" alt="Cabutan Bertuah Tempahan Biskut Raya Jijah Bake4U 2027 — tempah 10 bekas layak cabutan, hadiah barangan elektrik" loading="lazy" />
      </div>
    </div>
  </section>
  <section class="section-tight">
    <div class="container">
      <div class="panel text-center" style="max-width:640px;margin:0 auto;">
        <div class="stat-pill">🎁 BELI 10 BEKAS ATAU LEBIH = LAYAK CABUTAN</div>
        <p style="margin-top:20px;">Sistem kami akan menandakan tempahan anda sebagai <b>LAYAK CABUTAN BERTUAH</b> secara automatik sebaik sahaja jumlah bekas dalam tempahan mencapai 10 bekas atau lebih. Tiada tindakan tambahan diperlukan.</p>
        <a href="/produk" class="btn btn-primary" style="margin-top:10px;">TEMPAH 10 BEKAS SEKARANG</a>
      </div>
    </div>
  </section>
  ${waFloat()}
  `;
}

function ejenBody() {
  return `
  <section class="section-tight">
    <div class="container text-center">
      <span class="eyebrow">Peluang Perniagaan</span>
      <h1 class="section-title">Peluang Ejen Jijah Bake4U</h1>
      <p class="section-sub">Jijah Bake4U membuka peluang kepada ejen di seluruh Malaysia.</p>
    </div>
  </section>
  <section class="section-tight" style="padding-top:0;">
    <div class="container">
      <div class="poster-frame">
        <img src="/images/jadi-ejen-poster.jpg" alt="Jemputan menjadi Ejen Jijah Bake4U — peluang menjana pendapatan dari rumah, harga istimewa ejen, bahan promosi disediakan, sesuai untuk suri rumah, ibu tunggal dan mahasiswa" loading="lazy" />
      </div>
    </div>
  </section>
  <section class="section-tight">
    <div class="container">
      <div class="panel text-center" style="max-width:640px;margin:0 auto;">
        <div class="stat-pill">👥 100 EJEN SELURUH MALAYSIA</div>
        <p style="margin-top:20px;">Sertai keluarga ejen Jijah Bake4U dan raih pendapatan tambahan menjelang musim raya. Setiap tempahan yang dibuat melalui ejen akan direkodkan bersama nama ejen dalam sistem kami untuk pengiraan prestasi yang telus.</p>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:8px;">
          <a href="/ejen/daftar" class="btn btn-primary">DAFTAR SEBAGAI EJEN</a>
          <a href="${waLink('Assalamualaikum Jijah Bake4U. Saya berminat untuk menjadi Ejen Jijah Bake4U.')}" target="_blank" rel="noopener" class="btn btn-whatsapp">TANYA DI WHATSAPP</a>
        </div>
        <p style="margin-top:14px;font-size:.8rem;">*Pendaftaran akan disemak oleh pihak Jijah Bake4U. No. Ahli Ejen akan diberikan selepas pendaftaran diluluskan.</p>
      </div>
    </div>
  </section>
  ${waFloat()}
  `;
}

function daftarEjenBody() {
  return `
  <section class="section-tight">
    <div class="container" style="max-width:640px;">
      <h1 class="section-title text-center">Pendaftaran Ejen Jijah Bake4U</h1>
      <p class="section-sub text-center">Isikan borang di bawah. Pendaftaran anda akan disemak oleh pihak Jijah Bake4U dan No. Ahli Ejen akan diberikan selepas diluluskan.</p>
      <div class="panel">
        <form id="daftarEjenForm">
          <div class="form-grid">
            <div class="form-group full">
              <label>Nama Penuh *</label>
              <input type="text" name="name" required />
            </div>
            <div class="form-group full">
              <label>No. WhatsApp *</label>
              <input type="tel" name="phone" required placeholder="cth: 0123456789" />
            </div>
            <div class="form-group full">
              <label>Alamat *</label>
              <textarea name="address" rows="3" required></textarea>
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-block">HANTAR PENDAFTARAN</button>
          <div id="daftarEjenResult" style="margin-top:14px;"></div>
        </form>
      </div>
    </div>
  </section>
  ${waFloat()}
  `;
}

function daftarEjenSuccessBody() {
  return `
  <section class="section-tight">
    <div class="container" style="max-width:560px;">
      <div class="panel text-center" style="border-color:var(--emerald);">
        <div style="font-size:3rem;">✅</div>
        <h1 class="section-title">Pendaftaran Diterima!</h1>
        <p>Terima kasih kerana mendaftar sebagai Ejen Jijah Bake4U. Pendaftaran anda kini sedang disemak. No. Ahli Ejen anda akan diberikan melalui WhatsApp sebaik sahaja diluluskan.</p>
        <a href="/" class="btn btn-primary" style="margin-top:16px;">KEMBALI KE LAMAN UTAMA</a>
      </div>
    </div>
  </section>
  ${waFloat()}
  `;
}

function hubungiBody() {
  return `
  <section class="section-tight">
    <div class="container text-center">
      <span class="eyebrow">Kami Sedia Membantu</span>
      <h1 class="section-title">Hubungi Kami</h1>
    </div>
  </section>
  <section class="section-tight">
    <div class="container">
      <div class="two-col">
        <div class="panel">
          <h3>JIJAH BAKE4U</h3>
          <p>${escapeHtml(CONFIG.STORE_ADDRESS)}</p>
          <p><b>WhatsApp:</b> 0199894745</p>
          <p><b>Waktu Operasi:</b> 8:00 Pagi – 6:30 Petang (Jumaat Tutup)</p>
          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:16px;">
            <a href="${waLink('Assalamualaikum Jijah Bake4U. Saya berminat untuk membuat Tempahan Biskut Raya Jijah Bake4U 2027.')}" target="_blank" rel="noopener" class="btn btn-whatsapp">WHATSAPP JIJAH BAKE4U</a>
            <a href="${mapsLink()}" target="_blank" rel="noopener" class="btn btn-outline">LIHAT LOKASI KEDAI</a>
          </div>
        </div>
        <div class="panel">
          <h3>Semak Tempahan Anda</h3>
          <p>Sudah membuat tempahan? Semak status bayaran, hantar resit atau tambah biskut.</p>
          <a href="/tempahan-saya" class="btn btn-emerald btn-block">SEMAK TEMPAHAN SAYA</a>
        </div>
      </div>
    </div>
  </section>
  ${waFloat()}
  `;
}

function cartBody() {
  return `
  <section class="section-tight">
    <div class="container cart-page">
      <h1 class="section-title">Tempahan Saya (Cart)</h1>
      <div id="cartPageItems"></div>
      <div class="cart-summary" id="cartSummaryBox" style="display:none;">
        <div class="summary-row"><span>Jumlah Bekas</span><span id="sumContainers">0</span></div>
        <div class="summary-row total"><span>JUMLAH (sebelum postage)</span><span id="sumTotal">RM0.00</span></div>
        <a href="/tempahan/checkout" id="goCheckoutBtn" class="btn btn-primary btn-block" style="margin-top:18px;display:flex;">TERUSKAN KE CHECKOUT</a>
      </div>
    </div>
  </section>
  `;
}

function checkoutBody(approvedAgents = []) {
  return `
  <section class="section-tight">
    <div class="container">
      <h1 class="section-title text-center">Checkout Tempahan</h1>
      <div class="two-col" style="align-items:flex-start;">
        <div class="panel">
          <h3>Maklumat Pelanggan</h3>
          <form id="checkoutForm">
            <div class="form-grid">
              <div class="form-group full">
                <label>Nama Penuh *</label>
                <input type="text" name="customerName" required />
              </div>
              <div class="form-group">
                <label>No. Telefon *</label>
                <input type="tel" name="phone" required placeholder="cth: 0123456789" />
              </div>
              <div class="form-group">
                <label>Email *</label>
                <input type="email" name="email" required placeholder="cth: nama@email.com" />
                <p style="font-size:.72rem;color:var(--text-muted);margin-top:4px;">Digunakan untuk resit pembayaran ToyyibPay.</p>
              </div>
              <div class="form-group">
                <label>Nama Ejen (jika ada)</label>
                <select name="agentName" id="agentNameInput">
                  <option value="">-- Tiada / Bukan Tempahan Ejen --</option>
                  ${approvedAgents.map(a => `<option value="${escapeHtml(a.name)}">${escapeHtml(a.name)}${a.member_no ? ` (No. Ahli: ${escapeHtml(a.member_no)})` : ''}</option>`).join('')}
                </select>
                <p style="font-size:.72rem;color:var(--text-muted);margin-top:4px;">Hanya ejen berdaftar &amp; diluluskan Jijah Bake4U dipaparkan di sini. <a href="/ejen/daftar">Belum daftar sebagai ejen?</a></p>
              </div>
              <div class="form-group full">
                <label>Alamat *</label>
                <textarea name="address" rows="3" required></textarea>
              </div>
              <div class="form-group">
                <label>Poskod *</label>
                <input type="text" name="postcode" required />
              </div>
              <div class="form-group">
                <label>Negeri *</label>
                <select name="state" required>
                  <option value="">Pilih Negeri</option>
                  ${['Johor','Kedah','Kelantan','Melaka','Negeri Sembilan','Pahang','Perak','Perlis','Pulau Pinang','Sabah','Sarawak','Selangor','Terengganu','WP Kuala Lumpur','WP Labuan','WP Putrajaya'].map(s => `<option value="${s}">${s}</option>`).join('')}
                </select>
              </div>
              <div class="form-group full">
                <label>Pilihan Penghantaran / Pickup *</label>
                <select name="deliveryMethod" id="deliveryMethodSelect" required>
                  <option value="Pos/Kurier">Pos/Kurier (kos penghantaran dikira ikut jumlah bekas)</option>
                  <option value="Pickup di Kedai">Pick Up di Kedai (Kg Pengkalan Atap, Batu Rakit, Terengganu) — Percuma</option>
                  <option value="Ambil dengan Ejen">Ambil dengan Ejen — Percuma</option>
                </select>
                <p style="font-size:.75rem;color:var(--text-muted);margin-top:6px;">Kos Pos/Kurier: RM10 (1-3 bekas) · RM15 (4-10 bekas) · RM20 (11-20 bekas). Setakat ini untuk Semenanjung sahaja.</p>
              </div>
              <div class="form-group full">
                <label>Catatan (pilihan)</label>
                <textarea name="notes" rows="2"></textarea>
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-block">HANTAR TEMPAHAN</button>
            <p style="font-size:.75rem;text-align:center;margin-top:10px;">Selepas tempahan direkodkan, anda boleh bayar melalui <b>ToyyibPay</b> atau <b>hantar resit pindahan bank</b>.</p>
          </form>
        </div>
        <div class="order-box">
          <h3>Ringkasan Tempahan</h3>
          <div id="checkoutSummary"></div>
        </div>
      </div>
    </div>
  </section>
  `;
}

function orderSuccessBody(order, items, installments) {
  const statusUrl = `/tempahan/status/${order.id}?phone=${encodeURIComponent(order.phone)}`;
  const first = installments[0];
  return `
  <section class="section-tight">
    <div class="container" style="max-width:720px;">
      <div class="panel text-center" style="border-color:var(--emerald);">
        <div style="font-size:3rem;">✅</div>
        <h1 class="section-title">Tempahan Berjaya Direkodkan!</h1>
        <p>Terima kasih ${escapeHtml(order.customer_name)}, tempahan anda telah disimpan. Sila buat bayaran untuk mengesahkan tempahan.</p>
        <div class="order-box text-left" style="margin-top:20px;">
          <div class="order-line"><span>Order ID</span><span><b>${order.id}</b></span></div>
          <div class="order-line"><span>Jumlah Bekas</span><span>${order.total_containers} bekas</span></div>
          <div class="order-line"><span>Kaedah Penghantaran</span><span>${escapeHtml(order.delivery_method || '-')}</span></div>
          ${Number(order.postage_amount) > 0 ? `<div class="order-line"><span>Kos Penghantaran</span><span>${money(order.postage_amount)}</span></div>` : ''}
          <div class="order-line" style="font-weight:700;"><span>Jumlah Perlu Dibayar</span><span>${money(first ? first.amount : order.total_amount)}</span></div>
        </div>
        <p style="font-size:.85rem;margin-top:14px;">Simpan <b>Order ID</b> dan no. telefon anda — gunakan di <a href="/tempahan-saya">Semak Tempahan Saya</a> untuk bayar, hantar resit atau tambah biskut kemudian.</p>
        <div style="display:flex;gap:12px;justify-content:center;margin-top:20px;flex-wrap:wrap;">
          ${first ? `<a href="/bayar/${order.id}/${first.installment_number}?phone=${encodeURIComponent(order.phone)}" class="btn btn-primary">BAYAR SEKARANG</a>` : ''}
          <a href="${statusUrl}" class="btn btn-outline">LIHAT STATUS TEMPAHAN</a>
        </div>
      </div>
    </div>
  </section>
  `;
}

function orderLookupBody() {
  return `
  <section class="section-tight">
    <div class="container" style="max-width:520px;">
      <h1 class="section-title text-center">Semak Tempahan Saya</h1>
      <div class="panel">
        <form id="orderLookupForm">
          <div class="form-group">
            <label>Order ID *</label>
            <input type="text" name="orderId" required placeholder="cth: JB4U-2026-0001" />
          </div>
          <div class="form-group">
            <label>No. Telefon (semasa tempahan) *</label>
            <input type="tel" name="phone" required placeholder="cth: 0123456789" />
          </div>
          <button type="submit" class="btn btn-primary btn-block">SEMAK STATUS</button>
        </form>
        <div id="orderLookupResult" style="margin-top:16px;"></div>
      </div>
    </div>
  </section>
  `;
}

function statusBadge(status) {
  const map = {
    UNPAID: ['badge-unpaid', 'BELUM BAYAR'],
    PENDING: ['badge-pending', 'MENUNGGU PEMBAYARAN'],
    SEMAKAN: ['badge-pending', 'RESIT SEDANG DISEMAK'],
    PAID: ['badge-paid', 'SUDAH BAYAR'],
    FAILED: ['badge-failed', 'GAGAL / DITOLAK'],
    REFUNDED: ['badge-failed', 'DIREFUND'],
  };
  const [cls, label] = map[status] || ['badge-unpaid', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

function orderStatusBody(order, items, installments, justReturned, canAddItems = true, notice = '') {
  const phoneQ = encodeURIComponent(order.phone);
  return `
  <section class="section-tight">
    <div class="container" style="max-width:760px;">
      <h1 class="section-title text-center">Status Tempahan ${order.id}</h1>
      ${justReturned ? `<div class="alert" style="background:#fdf1cf;color:#9a7c14;">Terima kasih! Kami sedang mengesahkan bayaran anda dengan bank/gateway. Status di bawah akan dikemaskini secara automatik sebaik sahaja disahkan (biasanya dalam beberapa saat hingga minit).</div>` : ''}
      ${notice === 'resit' ? `<div class="alert" style="background:#e3f3ea;color:#1d6b45;">Resit anda telah diterima. Jijah Bake4U akan menyemak dan mengesahkan bayaran anda secepat mungkin.</div>` : ''}
      ${notice === 'tambah' ? `<div class="alert" style="background:#e3f3ea;color:#1d6b45;">Biskut tambahan telah dimasukkan ke dalam tempahan anda. Sila buat bayaran tambahan di bawah.</div>` : ''}
      <div class="panel">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
          <div><b>${escapeHtml(order.customer_name)}</b><br/><span style="font-size:.85rem;color:var(--text-muted);">${escapeHtml(order.phone)} &middot; ${escapeHtml(order.delivery_method || '')}</span></div>
          <div>${statusBadge(order.payment_status === 'LENGKAP' ? 'PAID' : order.payment_status === 'SEBAHAGIAN' ? 'PENDING' : 'UNPAID')}</div>
        </div>
        ${order.shipping_status === 'DIHANTAR' ? `<div class="alert" style="background:#e3f3ea;color:#1d6b45;margin-bottom:16px;">📦 <b>Tempahan anda sudah ${order.delivery_method === 'Pos/Kurier' ? 'dipos' : 'dihantar / sedia diambil'}</b> pada ${formatDateTimeMY(order.shipped_at)}.${order.courier ? ` Kurier: <b>${escapeHtml(order.courier)}</b>.` : ''}${order.tracking_no ? ` No. tracking: <b>${escapeHtml(order.tracking_no)}</b>.` : ''}</div>` : ''}
        <h3>Biskut Ditempah</h3>
        <table class="installment-table">
          <thead><tr><th>Biskut</th><th>Kuantiti</th><th>Harga</th><th>Subtotal</th></tr></thead>
          <tbody>
            ${items.map(it => `<tr><td>${escapeHtml(it.product_name)}</td><td>${it.quantity} bekas</td><td>${money(it.unit_price)}</td><td>${money(it.subtotal)}</td></tr>`).join('')}
            ${Number(order.postage_amount) > 0 ? `<tr><td colspan="3">Kos Penghantaran (Pos/Kurier)</td><td>${money(order.postage_amount)}</td></tr>` : ''}
          </tbody>
        </table>
        ${canAddItems ? `
        <div style="margin-top:14px;padding:14px 16px;border:1px dashed var(--gold);border-radius:12px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
          <span style="font-size:.9rem;">Nak tambah biskut lain pada tempahan ini?</span>
          <a class="btn btn-outline btn-sm" href="/tempahan/tambah/${order.id}?phone=${phoneQ}">+ TAMBAH BISKUT</a>
        </div>` : ''}

        <h3 style="margin-top:24px;">Rekod Bayaran</h3>
        <table class="installment-table">
          <thead><tr><th>Bayaran</th><th>Jumlah</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${installments.map(inst => `
              <tr>
                <td>${escapeHtml(inst.label || `Bayaran ${inst.installment_number}`)}${inst.status === 'FAILED' && inst.receipt_note ? `<br/><small style="color:var(--red-accent);">${escapeHtml(inst.receipt_note)}</small>` : ''}</td>
                <td>${money(inst.amount)}</td>
                <td>${statusBadge(inst.status)}</td>
                <td>${inst.status === 'UNPAID' || inst.status === 'FAILED' || inst.status === 'PENDING' ? `<a class="btn btn-primary btn-sm" href="/bayar/${order.id}/${inst.installment_number}?phone=${phoneQ}">BAYAR</a>` : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="cart-summary" style="margin-top:22px;">
          <div class="summary-row"><span>Jumlah Keseluruhan</span><span>${money(order.total_amount)}</span></div>
          <div class="summary-row"><span>Jumlah Sudah Dibayar</span><span>${money(order.paid_amount)}</span></div>
          <div class="summary-row total"><span>BAKI</span><span>${money(order.balance)}</span></div>
        </div>
      </div>
    </div>
  </section>
  `;
}

function paymentSandboxBody(order, installment, gatewayReady) {
  const statusUrl = `/tempahan/status/${order.id}?phone=${encodeURIComponent(order.phone)}`;
  const bankReady = CONFIG.BANK_ACCOUNT_NO && CONFIG.BANK_NAME;
  const onlineBlock = gatewayReady ? `
          <p style="font-size:.85rem;">Bayar secara online melalui FPX (online banking) atau kad. Status disahkan secara automatik selepas bayaran selesai.</p>
          <button class="btn btn-primary btn-block" style="margin-top:12px;" onclick="JB4U_payReal()">BAYAR DENGAN TOYYIBPAY</button>` : `
          <span class="sandbox-tag">MOD SANDBOX / TEST — TIADA WANG SEBENAR</span>
          <p style="font-size:.85rem;margin-top:8px;">ToyyibPay belum diaktifkan. Butang di bawah hanya untuk menguji sistem.</p>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px;">
            <button class="btn btn-emerald btn-sm" onclick="JB4U_pay('SUCCESS')">✅ SIMULASI BAYARAN BERJAYA</button>
            <button class="btn btn-danger btn-sm" onclick="JB4U_pay('FAILED')">❌ SIMULASI BAYARAN GAGAL</button>
          </div>`;
  return `
  <section class="section-tight">
    <div class="container" style="max-width:860px;">
      <h1 class="section-title text-center">Buat Bayaran</h1>
      <div class="order-box" style="max-width:520px;margin:0 auto 22px;">
        <div class="order-line"><span>Order ID</span><span>${order.id}</span></div>
        <div class="order-line"><span>Bayaran</span><span>${escapeHtml(installment.label || `Bayaran ${installment.installment_number}`)}</span></div>
        <div class="order-line" style="font-weight:700;font-size:1.05rem;"><span>Jumlah Perlu Dibayar</span><span>${money(installment.amount)}</span></div>
      </div>
      ${installment.status === 'SEMAKAN' ? `<div class="alert" style="background:#fdf1cf;color:#9a7c14;text-align:center;">Resit untuk bayaran ini sedang disemak oleh Jijah Bake4U.</div>` : `
      <div class="two-col" style="align-items:stretch;">
        <div class="panel">
          <h3>Pilihan 1: ToyyibPay</h3>
          ${onlineBlock}
          <div id="payResult" style="margin-top:12px;"></div>
        </div>
        <div class="panel" style="border-color:var(--gold);">
          <h3>Pilihan 2: Pindahan Bank &amp; Hantar Resit</h3>
          ${bankReady ? `
          <div class="order-box" style="margin:10px 0;">
            <div class="order-line"><span>Bank</span><span><b>${escapeHtml(CONFIG.BANK_NAME)}</b></span></div>
            <div class="order-line"><span>No. Akaun</span><span><b>${escapeHtml(CONFIG.BANK_ACCOUNT_NO)}</b></span></div>
            ${CONFIG.BANK_ACCOUNT_NAME ? `<div class="order-line"><span>Nama Akaun</span><span>${escapeHtml(CONFIG.BANK_ACCOUNT_NAME)}</span></div>` : ''}
            <div class="order-line"><span>Rujukan</span><span>${order.id}</span></div>
          </div>` : `<p style="font-size:.85rem;">Sila WhatsApp <b>019-989 4745</b> untuk butiran akaun bank.</p>`}
          <p style="font-size:.85rem;">Selepas pindahan, muat naik gambar atau PDF resit di bawah (maksimum 4MB).</p>
          <input type="file" id="receiptInput" accept="image/*,application/pdf" style="margin-top:8px;width:100%;" />
          <button class="btn btn-primary btn-block" style="margin-top:12px;" id="receiptBtn" onclick="JB4U_sendReceipt()">HANTAR RESIT</button>
          <div id="receiptResult" style="margin-top:12px;"></div>
        </div>
      </div>`}
      <div class="text-center" style="margin-top:20px;"><a href="${statusUrl}" class="btn btn-outline btn-sm">&larr; KEMBALI KE STATUS TEMPAHAN</a></div>
    </div>
  </section>
  <script>
  var JB4U_ORDER = { orderId: ${JSON.stringify(order.id)}, phone: ${JSON.stringify(order.phone)}, n: ${installment.installment_number} };
  async function JB4U_payReal() {
    const box = document.getElementById('payResult');
    box.innerHTML = '<p>Menyediakan pautan pembayaran...</p>';
    try {
      const resp = await fetch('/api/payment/toyyibpay/create-bill', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ orderId: JB4U_ORDER.orderId, installmentNumber: JB4U_ORDER.n })
      });
      const data = await resp.json();
      if (!resp.ok) { box.innerHTML = '<div class="alert alert-error">' + (data.error||'Ralat') + '</div>'; return; }
      window.location.href = data.paymentUrl;
    } catch (e) { box.innerHTML = '<div class="alert alert-error">Ralat sambungan.</div>'; }
  }
  async function JB4U_pay(result) {
    const box = document.getElementById('payResult');
    box.innerHTML = '<p>Memproses...</p>';
    try {
      const resp = await fetch('/api/payment/sandbox/simulate', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ orderId: JB4U_ORDER.orderId, installmentNumber: JB4U_ORDER.n, result: result })
      });
      const data = await resp.json();
      if (!resp.ok) { box.innerHTML = '<div class="alert alert-error">' + (data.error||'Ralat') + '</div>'; return; }
      window.location.href = '/pembayaran/keputusan?orderId=' + encodeURIComponent(JB4U_ORDER.orderId) + '&installment=' + JB4U_ORDER.n + '&status=' + data.status;
    } catch(e) { box.innerHTML = '<div class="alert alert-error">Ralat sambungan.</div>'; }
  }
  // Gambar resit dikecilkan dahulu (maks 1600px) supaya cepat dihantar walaupun dari telefon.
  function JB4U_readReceipt(file) {
    return new Promise(function (resolve, reject) {
      if (file.type === 'application/pdf') {
        if (file.size > 3.5 * 1024 * 1024) return reject(new Error('Fail PDF terlalu besar (maksimum 3.5MB).'));
        const r = new FileReader(); r.onload = function () { resolve(r.result); }; r.onerror = reject; r.readAsDataURL(file); return;
      }
      if (String(file.type).indexOf('image/') !== 0) return reject(new Error('Sila pilih gambar (JPG/PNG) atau PDF.'));
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = function () {
        const max = 1600; let w = img.width, h = img.height;
        if (w > max || h > max) { const k = max / Math.max(w, h); w = Math.round(w * k); h = Math.round(h * k); }
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = function () { reject(new Error('Gambar tidak dapat dibaca. Sila cuba gambar lain.')); };
      img.src = url;
    });
  }
  async function JB4U_sendReceipt() {
    const input = document.getElementById('receiptInput');
    const box = document.getElementById('receiptResult');
    const btn = document.getElementById('receiptBtn');
    if (!input.files || !input.files[0]) { box.innerHTML = '<div class="alert alert-error">Sila pilih gambar atau PDF resit dahulu.</div>'; return; }
    btn.disabled = true; btn.textContent = 'Menghantar...';
    try {
      const dataUrl = await JB4U_readReceipt(input.files[0]);
      const resp = await fetch('/api/payment/resit', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ orderId: JB4U_ORDER.orderId, phone: JB4U_ORDER.phone, installmentNumber: JB4U_ORDER.n, dataUrl: dataUrl })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Ralat semasa menghantar resit.');
      window.location.href = '/tempahan/status/' + encodeURIComponent(JB4U_ORDER.orderId) + '?phone=' + encodeURIComponent(JB4U_ORDER.phone) + '&notice=resit';
    } catch (e) {
      box.innerHTML = '<div class="alert alert-error">' + (e.message || 'Ralat sambungan.') + '</div>';
      btn.disabled = false; btn.textContent = 'HANTAR RESIT';
    }
  }
  </script>
  `;
}

function addItemsBody(order, products) {
  const statusUrl = `/tempahan/status/${order.id}?phone=${encodeURIComponent(order.phone)}`;
  return `
  <section class="section-tight">
    <div class="container" style="max-width:860px;">
      <h1 class="section-title text-center">Tambah Biskut</h1>
      <p class="section-sub text-center">Tempahan <b>${order.id}</b> &middot; ${escapeHtml(order.customer_name)}. Masukkan bilangan bekas untuk biskut yang ingin ditambah, kemudian tekan butang Semak Jumlah. Tambahan hanya untuk biskut yang masih ada stok.</p>
      <div class="panel">
        <table class="installment-table" id="addItemsTable">
          <thead><tr><th></th><th>Biskut</th><th>Harga</th><th>Stok</th><th style="width:130px;">Tambah (bekas)</th></tr></thead>
          <tbody>
            ${products.map(p => `<tr>
              <td style="width:56px;">${p.image ? `<img src="/images/${p.image}" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:8px;" loading="lazy"/>` : ''}</td>
              <td><b>${escapeHtml(p.name)}</b><br/><small style="color:var(--text-muted);">${escapeHtml(p.size || '')}</small>${p.note ? `<br/><small style="color:var(--text-muted);font-style:italic;">${escapeHtml(p.note)}</small>` : ''}</td>
              <td>${money(p.installment_price)}</td>
              <td>${Number(p.stock) > 0 ? `${p.stock} bekas` : '<span style="color:var(--red-accent);font-weight:600;">Habis</span>'}</td>
              <td>${Number(p.stock) > 0 ? `<input type="number" min="0" max="${Number(p.stock)}" value="0" data-id="${p.id}" class="add-qty" style="width:90px;padding:6px 8px;border:1px solid var(--border-soft);border-radius:8px;" />` : '<span style="color:var(--text-muted);">—</span>'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        <div id="addQuote" style="margin-top:18px;"></div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:16px;">
          <button class="btn btn-outline" onclick="JB4U_quoteAdd()">SEMAK JUMLAH</button>
          <button class="btn btn-primary" id="confirmAddBtn" style="display:none;" onclick="JB4U_confirmAdd()">SAHKAN TAMBAH BISKUT</button>
          <a href="${statusUrl}" class="btn btn-outline" style="margin-left:auto;">BATAL</a>
        </div>
      </div>
    </div>
  </section>
  <script>
  var JB4U_ADD = { orderId: ${JSON.stringify(order.id)}, phone: ${JSON.stringify(order.phone)} };
  function JB4U_money(n) { return 'RM' + Number(n).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function JB4U_addItems() {
    return Array.prototype.slice.call(document.querySelectorAll('.add-qty'))
      .map(function (el) { return { productId: el.dataset.id, qty: parseInt(el.value, 10) || 0 }; })
      .filter(function (it) { return it.qty > 0; });
  }
  document.querySelectorAll('.add-qty').forEach(function (el) {
    el.addEventListener('input', function () { document.getElementById('confirmAddBtn').style.display = 'none'; document.getElementById('addQuote').innerHTML = ''; });
  });
  async function JB4U_quoteAdd() {
    const box = document.getElementById('addQuote');
    const items = JB4U_addItems();
    if (!items.length) { box.innerHTML = '<div class="alert alert-error">Sila masukkan sekurang-kurangnya 1 bekas.</div>'; return; }
    box.innerHTML = '<p>Mengira...</p>';
    try {
      const resp = await fetch('/api/tempahan/tambah/semak', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ orderId: JB4U_ADD.orderId, phone: JB4U_ADD.phone, items: items }) });
      const d = await resp.json();
      if (!resp.ok) throw new Error(d.error || 'Ralat');
      box.innerHTML = '<div class="order-box">' + d.items.map(function (it) { return '<div class="order-line"><span>' + it.name.replace(/</g,'&lt;') + ' × ' + it.qty + '</span><span>' + JB4U_money(it.subtotal) + '</span></div>'; }).join('')
        + (d.postageDiff > 0 ? '<div class="order-line"><span>Tambahan kos penghantaran</span><span>' + JB4U_money(d.postageDiff) + '</span></div>' : '')
        + '<div class="order-line" style="font-weight:700;font-size:1.05rem;"><span>JUMLAH BAYARAN TAMBAHAN</span><span>' + JB4U_money(d.amount) + '</span></div></div>';
      document.getElementById('confirmAddBtn').style.display = '';
    } catch (e) { box.innerHTML = '<div class="alert alert-error">' + e.message + '</div>'; }
  }
  async function JB4U_confirmAdd() {
    const btn = document.getElementById('confirmAddBtn');
    btn.disabled = true; btn.textContent = 'Menyimpan...';
    try {
      const resp = await fetch('/api/tempahan/tambah', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ orderId: JB4U_ADD.orderId, phone: JB4U_ADD.phone, items: JB4U_addItems() }) });
      const d = await resp.json();
      if (!resp.ok) throw new Error(d.error || 'Ralat');
      window.location.href = '/tempahan/status/' + encodeURIComponent(JB4U_ADD.orderId) + '?phone=' + encodeURIComponent(JB4U_ADD.phone) + '&notice=tambah';
    } catch (e) {
      document.getElementById('addQuote').innerHTML += '<div class="alert alert-error">' + e.message + '</div>';
      btn.disabled = false; btn.textContent = 'SAHKAN TAMBAH BISKUT';
    }
  }
  </script>
  `;
}

function paymentResultBody(status, order, installment) {
  const isSuccess = status === 'PAID';
  const isPending = status === 'PENDING';
  return `
  <section class="section-tight">
    <div class="container" style="max-width:520px;">
      <div class="panel text-center" style="border-color:${isSuccess ? 'var(--emerald)' : isPending ? 'var(--gold)' : 'var(--red-accent)'};">
        <div style="font-size:3rem;">${isSuccess ? '✅' : isPending ? '⏳' : '❌'}</div>
        <h1 class="section-title">${isSuccess ? 'BAYARAN BERJAYA' : isPending ? 'MENUNGGU PEMBAYARAN' : 'Bayaran Tidak Berjaya'}</h1>
        ${isSuccess ? `
        <div class="order-box text-left">
          <div class="order-line"><span>Order</span><span>${order.id}</span></div>
          <div class="order-line"><span>Bayaran</span><span>${escapeHtml(installment.label || `Bayaran ${installment.installment_number}`)}</span></div>
          <div class="order-line"><span>Jumlah</span><span>${money(installment.amount)}</span></div>
          <div class="order-line"><span>Transaction ID</span><span style="font-size:.78rem;">${installment.transaction_id}</span></div>
          <div class="order-line"><span>Tarikh</span><span>${installment.payment_date}</span></div>
          <div class="order-line"><span>Baki</span><span><b>${money(order.balance)}</b></span></div>
        </div>` : isPending ? `<p>Pembayaran anda sedang menunggu pengesahan gateway. Status akan dikemaskini secara automatik sebaik sahaja disahkan.</p>` : `<p>Bayaran tidak berjaya. Sila cuba semula.</p>`}
        <a href="/tempahan/status/${order.id}?phone=${encodeURIComponent(order.phone)}" class="btn btn-primary" style="margin-top:20px;">LIHAT STATUS TEMPAHAN</a>
      </div>
    </div>
  </section>
  `;
}

module.exports = {
  homeBody, productsBody, caraTempahanBody, cabutanBody, ejenBody, daftarEjenBody, daftarEjenSuccessBody, hubungiBody,
  cartBody, checkoutBody, orderSuccessBody, orderLookupBody, orderStatusBody, paymentSandboxBody, paymentResultBody, addItemsBody,
  waFloat, statusBadge,
};
