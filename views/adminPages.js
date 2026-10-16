const { escapeHtml, money, formatDateTimeMY, monthLabelMY, CONFIG } = require('../lib/helpers');
const { shippingBadge, shippingInfo, shipForm, unshipForm } = require('./packingPages');

function loginPage(error) {
  return `<!DOCTYPE html>
<html lang="ms"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Admin Login | Jijah Bake4U</title><link rel="stylesheet" href="/css/style.css"/></head>
<body>
<div class="login-shell">
  <div class="login-card">
    <img src="/images/logo.png" alt="Jijah Bake4U"/>
    <h2>ADMIN DASHBOARD</h2>
    <p style="margin-bottom:20px;">Jijah Bake4U — Tempahan Biskut Raya Jijah Bake4U 2027</p>
    ${error ? `<div class="alert alert-error">${escapeHtml(error)}</div>` : ''}
    <form method="POST" action="/admin/login">
      <div class="form-group text-left">
        <label>Username</label>
        <input type="text" name="username" required autofocus />
      </div>
      <div class="form-group text-left">
        <label>Password</label>
        <input type="password" name="password" required />
      </div>
      <button type="submit" class="btn btn-primary btn-block">LOG MASUK</button>
    </form>
  </div>
</div>
</body></html>`;
}

function statCards(stats) {
  const cards = [
    { lbl: 'Jumlah Tempahan', val: stats.orderCount, cls: '' },
    { lbl: 'Jumlah Pelanggan', val: stats.customerCount, cls: '' },
    { lbl: 'Jumlah Bekas', val: stats.totalContainers, cls: '' },
    { lbl: 'Layak Cabutan', val: stats.luckyDrawCount, cls: 'emerald' },
    { lbl: 'Jumlah Nilai Tempahan', val: money(stats.totalAmount), cls: '' },
    { lbl: 'Jumlah Bayaran Diterima', val: money(stats.totalPaid), cls: 'emerald' },
    { lbl: 'Jumlah Baki Belum Bayar', val: money(stats.totalBalance), cls: 'red' },
    { lbl: 'Pelanggan Ada Baki', val: stats.unpaidCustomers, cls: 'red' },
    { lbl: 'Resit Menunggu Semakan', val: `<a href="/admin/resit" style="color:inherit;">${stats.receiptsAwaiting || 0}</a>`, cls: stats.receiptsAwaiting ? 'red' : '' },
  ];
  return `<div class="stat-cards">${cards.map(c => `<div class="stat-card ${c.cls}"><div class="lbl">${c.lbl}</div><div class="val">${c.val}</div></div>`).join('')}</div>`;
}

function dashboardPage(stats, monthly, productSummary, agentSummary) {
  const topProducts = productSummary.slice(0, 8);
  const monthLabels = monthly.map(m => m.ym);
  const monthOrders = monthly.map(m => m.orderCount);
  const monthPaid = monthly.map(m => m.paid);
  return `
  <div class="admin-topbar"><h1>Dashboard — Jijah Bake4U</h1><span style="font-size:.8rem;color:var(--text-muted);">Dikira automatik daripada database sebenar</span></div>
  ${statCards(stats)}
  <div class="two-charts">
    <div class="admin-panel">
      <h2>Tempahan &amp; Bayaran Mengikut Bulan</h2>
      <div class="chart-wrap"><canvas id="chartMonthly"></canvas></div>
    </div>
    <div class="admin-panel">
      <h2>Biskut Paling Banyak Ditempah</h2>
      <div class="chart-wrap"><canvas id="chartProducts"></canvas></div>
    </div>
  </div>
  <div class="admin-panel">
    <h2>Prestasi Ejen</h2>
    <div class="chart-wrap"><canvas id="chartAgents"></canvas></div>
  </div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.4/chart.umd.min.js"></script>
  <script>
  if (typeof Chart === 'undefined') {
    document.querySelectorAll('.chart-wrap').forEach(function (el) {
      el.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding-top:100px;">Chart memerlukan sambungan internet (cdnjs.cloudflare.com). Angka di kad atas tetap tepat.</p>';
    });
  } else {
    const monthLabels = ${JSON.stringify(monthLabels)};
    new Chart(document.getElementById('chartMonthly'), {
      type: 'bar',
      data: { labels: monthLabels, datasets: [
        { label: 'Jumlah Tempahan', data: ${JSON.stringify(monthOrders)}, backgroundColor: '#c8a24d' },
        { label: 'Jumlah Dibayar (RM)', data: ${JSON.stringify(monthPaid)}, backgroundColor: '#0f4d3a', type: 'line', yAxisID: 'y1' },
      ]},
      options: { responsive: true, maintainAspectRatio: false, scales: { y1: { position: 'right', grid: { drawOnChartArea: false } } } }
    });
    new Chart(document.getElementById('chartProducts'), {
      type: 'bar',
      data: { labels: ${JSON.stringify(topProducts.map(p => p.name))}, datasets: [{ label: 'Jumlah Bekas', data: ${JSON.stringify(topProducts.map(p => p.totalQty))}, backgroundColor: '#3a2416' }] },
      options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y' }
    });
    new Chart(document.getElementById('chartAgents'), {
      type: 'bar',
      data: { labels: ${JSON.stringify(agentSummary.map(a => a.agentName))}, datasets: [{ label: 'Jumlah Jualan (RM)', data: ${JSON.stringify(agentSummary.map(a => a.sales))}, backgroundColor: '#c8a24d' }] },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
  </script>
  `;
}

function ordersPage(orders, filters, agents) {
  return `
  <div class="admin-topbar"><h1>Semua Tempahan</h1><a href="/admin/export/orders.csv" class="btn btn-emerald btn-sm">DOWNLOAD SEMUA DATA (CSV)</a></div>
  <div class="admin-panel">
    <form class="admin-toolbar" method="GET" action="/admin/orders">
      <input type="text" name="search" placeholder="Cari Nama / Telefon / Order ID" value="${escapeHtml(filters.search || '')}" />
      <select name="filter">
        <option value="ALL" ${filters.filter === 'ALL' ? 'selected' : ''}>Semua Status</option>
        <option value="BELUM_BAYAR" ${filters.filter === 'BELUM_BAYAR' ? 'selected' : ''}>Belum Bayar</option>
        <option value="SEBAHAGIAN" ${filters.filter === 'SEBAHAGIAN' ? 'selected' : ''}>Sebahagian Bayar</option>
        <option value="LENGKAP" ${filters.filter === 'LENGKAP' ? 'selected' : ''}>Sudah Lengkap</option>
        <option value="LAYAK" ${filters.filter === 'LAYAK' ? 'selected' : ''}>Layak Cabutan</option>
        <option value="TIDAK_LAYAK" ${filters.filter === 'TIDAK_LAYAK' ? 'selected' : ''}>Tidak Layak</option>
        <option value="SEDIA_PACK" ${filters.filter === 'SEDIA_PACK' ? 'selected' : ''}>Sedia Untuk Pack</option>
        <option value="DIHANTAR" ${filters.filter === 'DIHANTAR' ? 'selected' : ''}>Sudah Dihantar</option>
      </select>
      <select name="agent">
        <option value="">Semua Ejen</option>
        ${agents.map(a => `<option value="${escapeHtml(a)}" ${filters.agent === a ? 'selected' : ''}>${escapeHtml(a)}</option>`).join('')}
      </select>
      <input type="month" name="month" value="${filters.month || ''}" />
      <button class="btn btn-primary btn-sm" type="submit">TAPIS</button>
      <a href="/admin/orders" class="btn btn-outline btn-sm">RESET</a>
    </form>
    <div class="table-scroll">
      <table class="data-table">
        <thead><tr>
          <th>Order ID</th><th>Tarikh</th><th>Nama</th><th>Telefon</th><th>Ejen</th><th>Bekas</th>
          <th>Jumlah</th><th>Dibayar</th><th>Baki</th><th>Status</th><th>Penghantaran</th><th>Cabutan</th><th></th>
        </tr></thead>
        <tbody>
          ${orders.length === 0 ? `<tr><td colspan="13" style="text-align:center;padding:30px;color:var(--text-muted);">Tiada tempahan lagi.</td></tr>` : orders.map(o => `
          <tr>
            <td><b>${o.id}</b></td>
            <td>${formatDateTimeMY(o.created_at)}</td>
            <td>${escapeHtml(o.customer_name)}</td>
            <td>${escapeHtml(o.phone)}</td>
            <td>${escapeHtml(o.agent_name)}</td>
            <td>${o.total_containers}</td>
            <td>${money(o.total_amount)}</td>
            <td>${money(o.paid_amount)}</td>
            <td>${money(o.balance)}</td>
            <td>${statusBadge(o.payment_status === 'LENGKAP' ? 'PAID' : o.payment_status === 'SEBAHAGIAN' ? 'PENDING' : 'UNPAID')}</td>
            <td>${shippingBadge(o)}</td>
            <td>${o.lucky_draw_status === 'LAYAK' ? '<span class="badge badge-eligible">LAYAK</span>' : '<span class="badge badge-not-eligible">TIDAK</span>'}</td>
            <td style="white-space:nowrap;"><a href="/admin/orders/${o.id}" class="btn btn-outline btn-sm">DETAIL</a> <a href="/admin/orders/${o.id}/slip" target="_blank" class="btn btn-outline btn-sm" title="Slip Packing">🖨</a></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>
  `;
}

function orderDetailPage(order, items, installments) {
  return `
  <div class="admin-topbar"><h1>Tempahan ${order.id}</h1><div style="display:flex;gap:8px;flex-wrap:wrap;"><a href="/admin/orders/${encodeURIComponent(order.id)}/slip" target="_blank" class="btn btn-primary btn-sm">🖨 SLIP PACKING / PDF</a><a href="/admin/orders" class="btn btn-outline btn-sm">&larr; Kembali</a></div></div>
  <div class="admin-panel" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
    <div><b>Penghantaran:</b> ${shippingBadge(order)}${shippingInfo(order)}</div>
    <div>${order.shipping_status === 'DIHANTAR' ? unshipForm(order, `/admin/orders/${encodeURIComponent(order.id)}`) : shipForm(order, `/admin/orders/${encodeURIComponent(order.id)}`)}</div>
  </div>
  <div class="two-col" style="align-items:flex-start;">
    <div class="admin-panel">
      <h2>Maklumat Pelanggan</h2>
      <p><b>Nama:</b> ${escapeHtml(order.customer_name)}</p>
      <p><b>Telefon:</b> ${escapeHtml(order.phone)}</p>
      <p><b>Email:</b> ${escapeHtml(order.email)}</p>
      <p><b>Alamat:</b> ${escapeHtml(order.address)}, ${escapeHtml(order.postcode)}, ${escapeHtml(order.state)}</p>
      <p><b>Ejen:</b> ${escapeHtml(order.agent_name)}</p>
      <p><b>Penghantaran:</b> ${escapeHtml(order.delivery_method || '-')}${Number(order.postage_amount) > 0 ? ` (Postage: ${money(order.postage_amount)})` : ''}</p>
      <p><b>Catatan:</b> ${escapeHtml(order.notes || '-')}</p>

      <h2 style="margin-top:20px;">Produk</h2>
      <table class="data-table"><thead><tr><th>Nama</th><th>Kuantiti</th><th>Harga Sebekas</th><th>Subtotal</th></tr></thead>
      <tbody>${items.map(it => `<tr><td>${escapeHtml(it.product_name)}</td><td>${it.quantity} bekas</td><td>${money(it.unit_price)}${it.base_price && Number(it.base_price) > Number(it.unit_price) ? ` <small style="color:var(--text-muted);text-decoration:line-through;">${money(it.base_price)}</small>` : ''}</td><td>${money(it.subtotal)}</td></tr>`).join('')}</tbody></table>

      <h2 style="margin-top:20px;">Rekod Bayaran</h2>
      <table class="data-table"><thead><tr><th>Bayaran</th><th>Jumlah</th><th>Status</th><th>Cara</th><th>Tarikh Bayar</th><th>Resit / Transaction ID</th></tr></thead>
      <tbody>${installments.map(i => `<tr>
        <td>${escapeHtml(i.label || `Bayaran ${i.installment_number}`)}</td>
        <td>${money(i.amount)}</td>
        <td>${statusBadge(i.status)}${i.receipt_note && i.status === 'FAILED' ? `<br><small style="color:var(--text-muted);">${escapeHtml(i.receipt_note)}</small>` : ''}</td>
        <td>${i.gateway === 'resit' ? 'Resit' : i.gateway === 'toyyibpay' ? 'ToyyibPay' : (i.gateway || '-')}</td>
        <td>${i.payment_date ? formatDateTimeMY(i.payment_date) : '-'}</td>
        <td style="font-size:.76rem;">${i.receipt_file ? `<a href="/admin/resit/fail/${encodeURIComponent(i.receipt_file)}" target="_blank">Lihat resit</a>` : ''}${i.transaction_id ? `<br>${i.transaction_id}` : ''}
          ${i.status === 'SEMAKAN' ? receiptActions(order.id, i.installment_number, `/admin/orders/${encodeURIComponent(order.id)}`) : ''}</td>
      </tr>`).join('')}</tbody></table>
    </div>
    <div class="admin-panel">
      <h2>Kewangan</h2>
      ${(() => {
        const commission = items.reduce((sum, it) => sum + (Number(it.base_price || it.unit_price) - Number(it.unit_price)) * it.quantity, 0);
        if (commission <= 0.001) return '';
        return `<div class="order-line"><span>Komisyen Ejen</span><span>${money(commission)}</span></div>`;
      })()}
      ${Number(order.postage_amount) > 0 ? `<div class="order-line"><span>Kos Penghantaran</span><span>${money(order.postage_amount)}</span></div>` : ''}
      <div class="order-line"><span>Jumlah</span><span>${money(order.total_amount)}</span></div>
      <div class="order-line"><span>Dibayar</span><span>${money(order.paid_amount)}</span></div>
      <div class="order-line"><span>Baki</span><span><b>${money(order.balance)}</b></span></div>
      <h2 style="margin-top:20px;">Status</h2>
      <p><b>Payment Status:</b> ${statusBadge(order.payment_status === 'LENGKAP' ? 'PAID' : order.payment_status === 'SEBAHAGIAN' ? 'PENDING' : 'UNPAID')}</p>
      <p><b>Order Status:</b> ${escapeHtml(order.order_status)}</p>
      <p><b>Lucky Draw:</b> ${order.lucky_draw_status === 'LAYAK' ? '<span class="badge badge-eligible">LAYAK</span>' : '<span class="badge badge-not-eligible">TIDAK LAYAK</span>'}</p>
    </div>
  </div>
  `;
}

function statusBadge(status) {
  const map = {
    UNPAID: ['badge-unpaid', 'BELUM BAYAR'], PENDING: ['badge-pending', 'MENUNGGU'], SEMAKAN: ['badge-pending', 'RESIT PERLU DISEMAK'],
    PAID: ['badge-paid', 'SUDAH BAYAR'], FAILED: ['badge-failed', 'GAGAL / DITOLAK'], REFUNDED: ['badge-failed', 'DIREFUND'],
  };
  const [cls, label] = map[status] || ['badge-unpaid', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

function receiptActions(orderId, n, back) {
  const base = `/admin/resit/${encodeURIComponent(orderId)}/${n}`;
  return `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">
    <form method="POST" action="${base}/sahkan" onsubmit="return confirm('Sahkan bayaran ini? Pastikan wang sudah masuk ke akaun.');"><input type="hidden" name="back" value="${back}"/><button class="btn btn-emerald btn-sm" type="submit">✓ SAHKAN</button></form>
    <form method="POST" action="${base}/tolak" onsubmit="var n=prompt('Sebab resit ditolak (akan dipaparkan kepada pelanggan):','Resit tidak sah / jumlah tidak sepadan. Sila hantar semula.'); if(n===null) return false; this.note.value=n; return true;"><input type="hidden" name="back" value="${back}"/><input type="hidden" name="note" value=""/><button class="btn btn-danger btn-sm" type="submit">✗ TOLAK</button></form>
  </div>`;
}

function receiptsPage(awaiting, recent) {
  const preview = (r) => /\.pdf$/i.test(r.receipt_file)
    ? `<a href="/admin/resit/fail/${encodeURIComponent(r.receipt_file)}" target="_blank" class="btn btn-outline btn-sm">📄 Buka PDF</a>`
    : `<a href="/admin/resit/fail/${encodeURIComponent(r.receipt_file)}" target="_blank"><img src="/admin/resit/fail/${encodeURIComponent(r.receipt_file)}" alt="resit" style="width:120px;max-height:160px;object-fit:contain;background:#f6f0e2;border-radius:8px;"/></a>`;
  return `
  <div class="admin-topbar"><h1>Semak Resit Bayaran</h1></div>
  <div class="admin-panel">
    <h2>Menunggu Semakan (${awaiting.length})</h2>
    <p style="margin-bottom:14px;color:var(--text-muted);font-size:.85rem;">Semak resit dengan akaun bank anda. Klik <b>SAHKAN</b> bila wang sudah masuk — bayaran akan direkod sebagai SUDAH BAYAR. Klik <b>TOLAK</b> jika resit tidak sah — pelanggan boleh hantar semula.</p>
    <table class="data-table">
      <thead><tr><th>Resit</th><th>Order</th><th>Pelanggan</th><th>Bayaran</th><th>Jumlah</th><th>Dihantar</th><th>Tindakan</th></tr></thead>
      <tbody>${awaiting.length === 0 ? `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-muted);">Tiada resit menunggu semakan.</td></tr>` : awaiting.map(r => `<tr>
        <td>${preview(r)}</td>
        <td><a href="/admin/orders/${encodeURIComponent(r.order_id)}">${escapeHtml(r.order_id)}</a></td>
        <td>${escapeHtml(r.customer_name)}<br><small>${escapeHtml(r.phone)}</small></td>
        <td>${escapeHtml(r.label || `Bayaran ${r.installment_number}`)}</td>
        <td><b>${money(r.amount)}</b></td>
        <td>${r.receipt_uploaded_at ? formatDateTimeMY(r.receipt_uploaded_at) : '-'}</td>
        <td>${receiptActions(r.order_id, r.installment_number, '/admin/resit')}</td>
      </tr>`).join('')}</tbody>
    </table>
  </div>
  <div class="admin-panel">
    <h2>Resit Terkini Yang Sudah Disemak</h2>
    <table class="data-table">
      <thead><tr><th>Order</th><th>Pelanggan</th><th>Jumlah</th><th>Status</th><th>Resit</th></tr></thead>
      <tbody>${recent.length === 0 ? `<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted);">Tiada rekod.</td></tr>` : recent.map(r => `<tr>
        <td><a href="/admin/orders/${encodeURIComponent(r.order_id)}">${escapeHtml(r.order_id)}</a></td>
        <td>${escapeHtml(r.customer_name)}</td><td>${money(r.amount)}</td><td>${statusBadge(r.status)}</td>
        <td><a href="/admin/resit/fail/${encodeURIComponent(r.receipt_file)}" target="_blank">Lihat</a></td>
      </tr>`).join('')}</tbody>
    </table>
  </div>
  `;
}

function productionPage(rows) {
  const maxQty = Math.max(1, ...rows.map(r => r.totalQty));
  return `
  <div class="admin-topbar"><h1>Perancangan Pengeluaran</h1><a href="/admin/export/products.csv" class="btn btn-emerald btn-sm">DOWNLOAD RINGKASAN BISKUT</a></div>
  <div class="admin-panel">
    <p style="margin-bottom:16px;">Ranking mengikut jumlah bekas ditempah — gunakan untuk perancangan bahan mentah, bekas, label dan stok.</p>
    <table class="data-table">
      <thead><tr><th>Ranking</th><th>Nama Biskut</th><th>Jumlah Ditempah</th><th></th></tr></thead>
      <tbody>
      ${rows.map((r, i) => `<tr>
        <td><span class="rank-badge">${i + 1}</span></td>
        <td>${escapeHtml(r.name)}</td>
        <td>${r.totalQty} bekas</td>
        <td style="width:220px;"><div class="progress-bar"><div class="fill" style="width:${(r.totalQty / maxQty) * 100}%;"></div></div></td>
      </tr>`).join('')}
      </tbody>
    </table>
  </div>
  `;
}

function productsAdminPage(rows) {
  return `
  <div class="admin-topbar"><h1>Ringkasan Biskut</h1><a href="/admin/export/products.csv" class="btn btn-emerald btn-sm">DOWNLOAD RINGKASAN BISKUT</a></div>
  <div class="admin-panel">
    <p style="margin-bottom:16px;">Untuk menambah/mengubah produk (nama, gambar, harga, penerangan, status), edit fail <code>catalog/products.json</code> lalu mulakan semula pelayan (server).</p>
    <table class="data-table">
      <thead><tr><th>Gambar</th><th>Nama</th><th>Jumlah Bekas Ditempah</th></tr></thead>
      <tbody>${rows.map(r => `<tr><td>${r.image ? `<img src="/images/${r.image}" style="width:44px;height:44px;object-fit:contain;background:#f6f0e2;border-radius:8px;"/>` : '—'}</td><td>${escapeHtml(r.name)}</td><td>${r.totalQty} bekas</td></tr>`).join('')}</tbody>
    </table>
  </div>
  `;
}

// Halaman admin untuk isi/kemaskini stok (bilangan bekas) setiap jenis biskut. Satu borang
// meliputi semua produk — admin isi nombor untuk mana-mana yang berubah, klik SIMPAN sekali
// sahaja. Stok ni dipaparkan pada laman /produk untuk makluman pelanggan (tempahan tetap
// dibenarkan walaupun stok 0, ikut arahan Jijah Bake4U — bukan paksaan/sekatan).
function stockPage(products) {
  return `
  <div class="admin-topbar"><h1>Stok Biskut</h1></div>
  <div class="admin-panel">
    <p style="margin-bottom:16px;color:var(--text-muted);font-size:.85rem;">Isi/kemaskini bilangan bekas untuk setiap jenis biskut, kemudian klik SIMPAN STOK di bawah. Stok ini akan dipaparkan kepada pelanggan di laman <a href="/produk" target="_blank">Katalog Biskut</a>. Tempahan tetap dibenarkan walaupun stok menunjukkan 0 — angka ini untuk makluman sahaja.</p>
    <form method="POST" action="/admin/stok">
      <table class="data-table">
        <thead><tr><th>Gambar</th><th>Nama Biskut</th><th>Saiz</th><th>Stok Semasa (bekas)</th></tr></thead>
        <tbody>${products.map((p) => `
          <tr>
            <td>${p.image ? `<img src="/images/${p.image}" alt="${escapeHtml(p.name)}" style="width:44px;height:44px;object-fit:contain;background:#f6f0e2;border-radius:8px;"/>` : '—'}</td>
            <td><b>${escapeHtml(p.name)}</b>${p.active ? '' : ' <span class="badge badge-unpaid">TIDAK AKTIF</span>'}</td>
            <td>${escapeHtml(p.size || '-')}</td>
            <td><input type="number" name="stock_${escapeHtml(p.id)}" value="${p.stock}" min="0" step="1" style="width:100px;padding:6px 8px;border:1px solid var(--border-soft);border-radius:8px;" /></td>
          </tr>
        `).join('')}</tbody>
      </table>
      <button type="submit" class="btn btn-primary" style="margin-top:16px;">SIMPAN STOK</button>
    </form>
  </div>
  `;
}

// Paparan lajur Komisyen Ejen di Prestasi Ejen. Komisyen ejen HANYA bermula selepas 50 bekas
// terkumpul (ikut CONFIG.AGENT_PRICE_TIERS) — sebelum tu komisyen sah 0, bukan ralat. Sebelum ni
// lajur ni papar "-" sahaja bila komisyen 0, yang buat nampak macam sistem tak kira komisyen
// langsung. Sekarang papar kemajuan (contoh "23/50 bekas") supaya jelas ia SEDANG dikira dan
// ejen boleh nampak berapa lagi bekas diperlukan — lebih memberi semangat ejen.
function commissionCell(r) {
  if (r.containers >= 50 && r.commission > 0) {
    const rate = 'RM5/bekas, bawah RM39: RM4, Rainbow: RM3 (50+ bekas terkumpul)';
    return `<b>${money(r.commission)}</b><br><small style="color:var(--text-muted);">${rate}</small>`;
  }
  const remaining = Math.max(0, 50 - r.containers);
  return `<span style="color:var(--text-muted);">RM0.00</span><br><small style="color:var(--text-muted);">${remaining} lagi bekas untuk mula komisyen</small>`;
}

function agentStatusBadge(status) {
  const map = {
    MENUNGGU: ['badge-pending', 'MENUNGGU SEMAKAN'],
    DILULUSKAN: ['badge-paid', 'DILULUSKAN'],
    DITOLAK: ['badge-failed', 'DITOLAK'],
  };
  const [cls, label] = map[status] || ['badge-unpaid', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

function agentRegistrationsPage(pending, approved, rejected, suggestedMemberNo = '0001') {
  return `
  <div class="admin-topbar"><h1>Pendaftaran Ejen</h1></div>
  <div class="admin-panel">
    <h2>Menunggu Semakan (${pending.length})</h2>
    <p style="margin-bottom:14px;color:var(--text-muted);font-size:.85rem;">Semak maklumat ejen di bawah. No. Ahli Ejen sudah dicadangkan secara automatik (ikut turutan) — terus klik LULUSKAN, atau tukar nombor tu dahulu jika mahu guna nombor lain. Atau TOLAK jika pendaftaran tidak sah.</p>
    ${pending.length === 0 ? `<p style="padding:20px 0;color:var(--text-muted);text-align:center;">Tiada pendaftaran menunggu semakan.</p>` : `
    <table class="data-table">
      <thead><tr><th>Nama</th><th>No. WhatsApp</th><th>Alamat</th><th>Tarikh Daftar</th><th>Tindakan</th></tr></thead>
      <tbody>
        ${pending.map(a => `
          <tr>
            <td><b>${escapeHtml(a.name)}</b></td>
            <td>${escapeHtml(a.phone)}</td>
            <td>${escapeHtml(a.address)}</td>
            <td>${formatDateTimeMY(a.created_at)}</td>
            <td>
              <form method="POST" action="/admin/ejen-daftar/${encodeURIComponent(a.id)}/luluskan" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:6px;">
                <input type="text" name="memberNo" value="${escapeHtml(suggestedMemberNo)}" required style="width:130px;padding:6px 8px;border:1px solid var(--border-soft);border-radius:8px;" />
                <button type="submit" class="btn btn-emerald btn-sm">LULUSKAN</button>
              </form>
              <form method="POST" action="/admin/ejen-daftar/${encodeURIComponent(a.id)}/tolak">
                <button type="submit" class="btn btn-danger btn-sm">TOLAK</button>
              </form>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    `}
  </div>
  <div class="admin-panel">
    <h2>Ejen Diluluskan (${approved.length})</h2>
    <table class="data-table">
      <thead><tr><th>No. Ahli</th><th>Nama</th><th>No. WhatsApp</th><th>Alamat</th><th>Tarikh Diluluskan</th></tr></thead>
      <tbody>${approved.length === 0 ? `<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted);">Tiada ejen diluluskan lagi.</td></tr>` : approved.map(a => `<tr><td><b>${escapeHtml(a.member_no || '-')}</b></td><td>${escapeHtml(a.name)}</td><td>${escapeHtml(a.phone)}</td><td>${escapeHtml(a.address)}</td><td>${formatDateTimeMY(a.approved_at)}</td></tr>`).join('')}</tbody>
    </table>
  </div>
  ${rejected.length > 0 ? `
  <div class="admin-panel">
    <h2>Ditolak (${rejected.length})</h2>
    <table class="data-table">
      <thead><tr><th>Nama</th><th>No. WhatsApp</th><th>Tarikh Daftar</th></tr></thead>
      <tbody>${rejected.map(a => `<tr><td>${escapeHtml(a.name)}</td><td>${escapeHtml(a.phone)}</td><td>${formatDateTimeMY(a.created_at)}</td></tr>`).join('')}</tbody>
    </table>
  </div>
  ` : ''}
  `;
}

function agentsPage(rows) {
  return `
  <div class="admin-topbar"><h1>Prestasi Ejen</h1></div>
  <div class="admin-panel">
    <p style="margin-bottom:16px;color:var(--text-muted);font-size:.85rem;">Harga khas ejen: harga biskut tolak RM5 sebekas (produk bawah RM39 — Mix Pack, Combo Box — tolak RM4; Rainbow Cookies tolak RM3), bermula selepas ejen berdaftar cecah 50 bekas terkumpul. Komisyen ejen = jumlah potongan tersebut.</p>
    <table class="data-table">
      <thead><tr><th>Ejen</th><th>Jumlah Order</th><th>Jumlah Pelanggan</th><th>Jumlah Bekas</th><th>Jumlah Jualan</th><th>Komisyen Ejen</th></tr></thead>
      <tbody>${rows.map(r => `<tr><td><b>${escapeHtml(r.agentName)}</b></td><td>${r.orderCount}</td><td>${r.customerCount}</td><td>${r.containers}</td><td>${money(r.sales)}</td><td>${commissionCell(r)}</td></tr>`).join('')}</tbody>
    </table>
  </div>
  `;
}

function luckyDrawPage(rows) {
  return `
  <div class="admin-topbar"><h1>Senarai Peserta Cabutan Bertuah</h1><a href="/admin/export/lucky-draw.csv" class="btn btn-emerald btn-sm">EXPORT SENARAI PESERTA</a></div>
  <div class="admin-panel">
    <p style="margin-bottom:16px;">Syarat: tempahan 10 bekas atau lebih. Jumlah peserta: <b>${rows.length}</b></p>
    <table class="data-table">
      <thead><tr><th>No.</th><th>Nama</th><th>Telefon</th><th>Order ID</th><th>Jumlah Bekas</th><th>Status</th></tr></thead>
      <tbody>${rows.length === 0 ? `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-muted);">Tiada peserta lagi.</td></tr>` : rows.map((r, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(r.customer_name)}</td><td>${escapeHtml(r.phone)}</td><td>${r.orderId}</td><td>${r.total_containers} bekas</td><td>${escapeHtml(r.order_status)}</td></tr>`).join('')}</tbody>
    </table>
  </div>
  `;
}

function reportsPage(monthly) {
  return `
  <div class="admin-topbar"><h1>Laporan Bulanan</h1></div>
  <div class="admin-panel">
    <table class="data-table">
      <thead><tr><th>Bulan</th><th>Jumlah Order</th><th>Jumlah Pelanggan</th><th>Jumlah Bekas</th><th>Jumlah Nilai</th><th>Jumlah Dibayar</th><th>Baki</th></tr></thead>
      <tbody>${monthly.length === 0 ? `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-muted);">Tiada data lagi.</td></tr>` : monthly.map(m => `<tr><td><b>${monthLabelMY(m.ym + '-01')}</b></td><td>${m.orderCount}</td><td>${m.customerCount}</td><td>${m.containers}</td><td>${money(m.amount)}</td><td>${money(m.paid)}</td><td>${money(m.balance)}</td></tr>`).join('')}</tbody>
    </table>
  </div>
  `;
}

function exportPage() {
  return `
  <div class="admin-topbar"><h1>Export &amp; Backup Data</h1></div>
  <div class="admin-panel">
    <h2>Export Excel / CSV</h2>
    <p>Semua fail boleh dibuka dalam Microsoft Excel dan Google Sheets.</p>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:14px;">
      <a href="/admin/export/orders.csv" class="btn btn-primary">DOWNLOAD SEMUA DATA TEMPAHAN</a>
      <a href="/admin/export/products.csv" class="btn btn-outline">DOWNLOAD RINGKASAN BISKUT</a>
      <a href="/admin/export/payments.csv" class="btn btn-outline">DOWNLOAD REKOD BAYARAN</a>
      <a href="/admin/export/lucky-draw.csv" class="btn btn-outline">DOWNLOAD SENARAI CABUTAN</a>
    </div>
  </div>
  <div class="admin-panel">
    <h2>Backup Data</h2>
    <p>Muat turun salinan penuh pangkalan data (semua tempahan, pelanggan dan bayaran) dalam format JSON. Simpan salinan ini dengan selamat secara berkala.</p>
    <a href="/admin/backup.json" class="btn btn-emerald">BACKUP DATA (JSON)</a>
  </div>
  `;
}

module.exports = {
  loginPage, dashboardPage, ordersPage, orderDetailPage, receiptsPage, productionPage, productsAdminPage, stockPage, agentsPage, agentRegistrationsPage, luckyDrawPage, reportsPage, exportPage,
};
