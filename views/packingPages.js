// Halaman admin Packing & Penghantaran + Slip Packing (boleh dicetak / simpan PDF).
const { escapeHtml, money, formatDateTimeMY } = require('../lib/helpers');

function shippingBadge(o) {
  if (o.shipping_status === 'DIHANTAR') {
    return `<span class="badge badge-paid">SUDAH DIHANTAR</span>`;
  }
  return `<span class="badge badge-unpaid">BELUM DIHANTAR</span>`;
}

function paymentWord(o) {
  if (o.payment_status === 'LENGKAP') return 'SUDAH BAYAR PENUH';
  if (o.payment_status === 'SEBAHAGIAN') return `ADA BAKI ${money(o.balance)}`;
  return 'BELUM BAYAR';
}

function shipForm(o, back) {
  return `<form method="POST" action="/admin/orders/${encodeURIComponent(o.id)}/hantar" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;"
      onsubmit="return confirm('Tandakan ${escapeHtml(o.id)} sebagai SUDAH POS / HANTAR?');">
    <input type="hidden" name="back" value="${back}" />
    ${o.delivery_method === 'Pos/Kurier' ? `
    <input type="text" name="courier" placeholder="Kurier (cth: J&T)" style="width:120px;padding:6px 8px;border:1px solid var(--border-soft);border-radius:8px;" />
    <input type="text" name="trackingNo" placeholder="No. tracking (pilihan)" style="width:160px;padding:6px 8px;border:1px solid var(--border-soft);border-radius:8px;" />` : ''}
    <button type="submit" class="btn btn-emerald btn-sm">✓ SUDAH POS / HANTAR</button>
  </form>`;
}

function unshipForm(o, back) {
  return `<form method="POST" action="/admin/orders/${encodeURIComponent(o.id)}/batal-hantar" style="display:inline;"
      onsubmit="return confirm('Batalkan status SUDAH DIHANTAR untuk ${escapeHtml(o.id)}?');">
    <input type="hidden" name="back" value="${back}" />
    <button type="submit" class="btn btn-outline btn-sm">Batal status hantar</button>
  </form>`;
}

function shippingInfo(o) {
  if (o.shipping_status !== 'DIHANTAR') return '';
  return `<div style="font-size:.8rem;color:var(--text-muted);margin-top:4px;">
    Dihantar: ${formatDateTimeMY(o.shipped_at)}${o.courier ? ` &middot; ${escapeHtml(o.courier)}` : ''}${o.tracking_no ? ` &middot; <b>${escapeHtml(o.tracking_no)}</b>` : ''}
  </div>`;
}

function packingPage(view, orders, totals) {
  const tabs = [
    ['sedia', 'Sedia Untuk Pack (sudah bayar, belum hantar)'],
    ['belum', 'Semua Belum Dihantar'],
    ['dihantar', 'Sudah Dihantar'],
  ];
  const back = `/admin/packing?view=${view}`;
  return `
  <div class="admin-topbar"><h1>Packing &amp; Penghantaran</h1>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <a href="/admin/packing/slip?view=${view}" target="_blank" class="btn btn-primary btn-sm">🖨 CETAK SEMUA SLIP (${orders.length})</a>
      <a href="/admin/export/packing.csv?view=${view}" class="btn btn-emerald btn-sm">DOWNLOAD SENARAI PACKING (CSV)</a>
    </div>
  </div>
  <div class="admin-panel">
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
      ${tabs.map(([k, l]) => `<a href="/admin/packing?view=${k}" class="btn btn-sm ${view === k ? 'btn-primary' : 'btn-outline'}">${l}</a>`).join('')}
    </div>
    ${totals.length && view !== 'dihantar' ? `
    <details style="margin-bottom:16px;">
      <summary style="cursor:pointer;font-weight:600;">Jumlah biskut perlu disediakan untuk senarai ini (${totals.reduce((s, t) => s + t.qty, 0)} bekas/kotak)</summary>
      <table class="data-table" style="margin-top:10px;"><thead><tr><th>Biskut</th><th>Kuantiti</th></tr></thead>
      <tbody>${totals.map(t => `<tr><td>${escapeHtml(t.name)}</td><td><b>${t.qty}</b></td></tr>`).join('')}</tbody></table>
    </details>` : ''}
    <div class="table-scroll">
      <table class="data-table">
        <thead><tr><th>Order</th><th>Pelanggan</th><th>Penghantaran</th><th>Biskut</th><th>Bayaran</th><th>Status Hantar</th><th>Tindakan</th></tr></thead>
        <tbody>
        ${orders.length === 0 ? `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-muted);">Tiada tempahan dalam senarai ini.</td></tr>` : orders.map(o => `
          <tr>
            <td><a href="/admin/orders/${encodeURIComponent(o.id)}"><b>${escapeHtml(o.id)}</b></a><br><small>${formatDateTimeMY(o.created_at)}</small></td>
            <td>${escapeHtml(o.customer_name)}<br><small>${escapeHtml(o.phone)}</small></td>
            <td>${escapeHtml(o.delivery_method || '-')}${o.delivery_method === 'Ambil dengan Ejen' ? `<br><small>${escapeHtml(o.agent_name)}</small>` : ''}</td>
            <td style="font-size:.82rem;">${o.items.map(it => `${escapeHtml(it.product_name)} × <b>${it.quantity}</b>`).join('<br>')}<br><small><b>Jumlah: ${o.total_containers}</b></small></td>
            <td style="font-size:.8rem;">${paymentWord(o)}</td>
            <td>${shippingBadge(o)}${shippingInfo(o)}</td>
            <td style="min-width:220px;">
              <a href="/admin/orders/${encodeURIComponent(o.id)}/slip" target="_blank" class="btn btn-outline btn-sm" style="margin-bottom:6px;">🖨 SLIP PACKING</a>
              ${o.shipping_status === 'DIHANTAR' ? unshipForm(o, back) : shipForm(o, back)}
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

// Satu slip packing (satu halaman bercetak setiap tempahan).
function slipHtml(o) {
  const isPos = o.delivery_method === 'Pos/Kurier';
  return `
  <section class="slip">
    <div class="slip-head">
      <div>
        <div class="brand">JIJAH BAKE4U</div>
        <div class="muted">Tempahan Biskut Raya 2027 &middot; Slip Packing</div>
      </div>
      <div class="order-id">${escapeHtml(o.id)}</div>
    </div>
    ${o.payment_status !== 'LENGKAP' ? `<div class="warn">⚠ ${paymentWord(o)} — semak sebelum hantar</div>` : ''}
    ${o.shipping_status === 'DIHANTAR' ? `<div class="done">✓ SUDAH DIHANTAR ${formatDateTimeMY(o.shipped_at)}${o.tracking_no ? ` &middot; ${escapeHtml(o.tracking_no)}` : ''}</div>` : ''}
    <div class="grid">
      <div class="box">
        <div class="label">${isPos ? 'HANTAR KEPADA' : 'PELANGGAN'}</div>
        <div class="name">${escapeHtml(o.customer_name)}</div>
        <div>${escapeHtml(o.phone)}</div>
        ${isPos ? `<div class="addr">${escapeHtml(o.address)}<br>${escapeHtml(o.postcode)} ${escapeHtml(o.state)}</div>` : ''}
      </div>
      <div class="box">
        <div class="label">PENGHANTARAN</div>
        <div class="name">${escapeHtml(o.delivery_method || '-')}</div>
        ${o.delivery_method === 'Ambil dengan Ejen' ? `<div>Ejen: <b>${escapeHtml(o.agent_name)}</b></div>` : ''}
        <div class="muted">Tarikh tempah: ${formatDateTimeMY(o.created_at)}</div>
      </div>
    </div>
    <table>
      <thead><tr><th style="width:44px;">✓</th><th>Biskut</th><th style="width:90px;text-align:center;">Kuantiti</th></tr></thead>
      <tbody>
        ${o.items.map(it => `<tr><td><span class="tick"></span></td><td>${escapeHtml(it.product_name)}</td><td style="text-align:center;font-weight:700;font-size:1.1rem;">${it.quantity}</td></tr>`).join('')}
        <tr class="total"><td></td><td>JUMLAH</td><td style="text-align:center;">${o.total_containers}</td></tr>
      </tbody>
    </table>
    ${o.notes ? `<div class="notes"><b>Catatan pelanggan:</b> ${escapeHtml(o.notes)}</div>` : ''}
    <div class="sign">
      <div>Dipack oleh: ____________________</div>
      <div>Disemak oleh: ____________________</div>
    </div>
  </section>`;
}

function slipDocument(orders, title) {
  return `<!DOCTYPE html>
<html lang="ms"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1d1a16; margin: 0; background: #eee; }
  .toolbar { position: sticky; top: 0; background: #2b1a0f; color: #fff; padding: 12px 16px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; z-index: 2; }
  .toolbar button { background: #c8a24d; color: #2b1a0f; border: 0; border-radius: 999px; padding: 10px 18px; font-weight: 700; cursor: pointer; font-size: 14px; }
  .toolbar small { opacity: .8; }
  .slip { background: #fff; width: 190mm; max-width: 100%; margin: 16px auto; padding: 12mm; border-radius: 6px; page-break-after: always; break-after: page; }
  .slip:last-child { page-break-after: auto; break-after: auto; }
  .slip-head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1d1a16; padding-bottom: 8px; margin-bottom: 10px; gap: 12px; }
  .brand { font-size: 20px; font-weight: 800; letter-spacing: .04em; }
  .order-id { font-size: 24px; font-weight: 800; border: 3px solid #1d1a16; padding: 4px 10px; border-radius: 6px; white-space: nowrap; }
  .muted { color: #666; font-size: 12px; }
  .warn { background: #fde2d2; color: #8a2b0e; font-weight: 700; padding: 8px 10px; border-radius: 6px; margin-bottom: 10px; }
  .done { background: #dff1e6; color: #1d6b45; font-weight: 700; padding: 8px 10px; border-radius: 6px; margin-bottom: 10px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
  .box { border: 1.5px solid #1d1a16; border-radius: 6px; padding: 8px 10px; font-size: 14px; line-height: 1.45; }
  .label { font-size: 11px; font-weight: 700; color: #666; letter-spacing: .06em; }
  .name { font-size: 17px; font-weight: 800; }
  .addr { margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 15px; }
  th, td { border: 1.5px solid #1d1a16; padding: 7px 8px; text-align: left; }
  th { background: #f1ece2; font-size: 12px; letter-spacing: .04em; }
  .tick { display: inline-block; width: 18px; height: 18px; border: 2px solid #1d1a16; border-radius: 3px; }
  tr.total td { font-weight: 800; font-size: 16px; background: #f7f3ea; }
  .notes { margin-top: 10px; border: 1.5px dashed #1d1a16; padding: 8px 10px; border-radius: 6px; font-size: 14px; }
  .sign { display: flex; justify-content: space-between; margin-top: 22px; font-size: 13px; gap: 12px; flex-wrap: wrap; }
  .empty { text-align: center; padding: 60px 16px; }
  @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } .slip { padding: 16px; margin: 8px; width: auto; } }
  @media print {
    body { background: #fff; }
    .toolbar { display: none; }
    .slip { margin: 0; width: auto; border-radius: 0; padding: 0; }
    @page { size: A5; margin: 8mm; }
  }
</style></head>
<body>
  <div class="toolbar">
    <button onclick="window.print()">🖨 CETAK / SIMPAN PDF</button>
    <small>${orders.length} slip &middot; Pilih "Save as PDF" pada tetingkap cetak untuk simpan sebagai fail PDF. Saiz kertas A5 (atau A4).</small>
  </div>
  ${orders.length ? orders.map(slipHtml).join('') : '<div class="empty">Tiada tempahan untuk dicetak.</div>'}
</body></html>`;
}

module.exports = { packingPage, slipDocument, shippingBadge, shippingInfo, shipForm, unshipForm };
