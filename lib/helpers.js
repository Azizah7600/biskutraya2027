const CONFIG = {
  // Harga sebekas kini IKUT SETIAP BISKUT (lihat catalog/products.json — Katalog Biskut Raya 2027).
  // EXAMPLE_PRICE hanya untuk contoh pakej di muka depan & nilai lalai kalkulator ansuran.
  EXAMPLE_PRICE: 40,
  // TIADA ansuran untuk laman ini — pelanggan bayar penuh (1 bayaran) bagi setiap tempahan /
  // setiap kali tambah biskut.
  INSTALLMENT_MONTHS: 1,
  // Butiran akaun bank untuk pelanggan yang pilih "Pindahan Bank / Hantar Resit".
  // Boleh juga ditetapkan melalui Environment Variables di Railway (BANK_NAME, BANK_ACCOUNT_NO, BANK_ACCOUNT_NAME).
  BANK_NAME: process.env.BANK_NAME || 'Maybank',
  BANK_ACCOUNT_NO: process.env.BANK_ACCOUNT_NO || '5630 1928 4855',
  BANK_ACCOUNT_NAME: process.env.BANK_ACCOUNT_NAME || 'Bake For You Enterprise',
  // Pelanggan boleh tambah biskut pada tempahan sedia ada (dari halaman Semak Tempahan) SELAGI
  // ADA STOK biskut tersebut (stok diisi admin di /admin/stok dan berkurang automatik setiap tempahan).
  // Pilihan: tetapkan ADD_ITEMS_UNTIL=YYYY-MM-DD untuk tutup fungsi ini selepas tarikh tersebut.
  ADD_ITEMS_UNTIL: process.env.ADD_ITEMS_UNTIL || '',
  LUCKY_DRAW_MIN_CONTAINERS: Number(process.env.LUCKY_DRAW_MIN_CONTAINERS || 10),
  WHATSAPP_NUMBER: process.env.WHATSAPP_NUMBER || '60199894745',
  STORE_ADDRESS: process.env.STORE_ADDRESS || 'Kg Pengkalan Atap, Batu Rakit, Terengganu',
  CONTAINER_OPTIONS: [5, 10, 15, 20],
  // Tarikh akhir bayaran TETAP untuk setiap ansuran (ikut arahan Jijah Bake4U — bukan dikira
  // secara automatik dari tarikh tempahan). Setiap tempahan, tak kira bila dibuat, guna
  // tarikh-tarikh yang sama ini. Untuk ubah tarikh, tukar senarai di bawah (format: YYYY-MM-DD)
  // dan mulakan semula server.
  INSTALLMENT_DUE_DATES: [
    '2026-10-15', // Ansuran 1
    '2026-11-15', // Ansuran 2
    '2026-12-15', // Ansuran 3
    '2027-01-15', // Ansuran 4
    '2027-02-15', // Ansuran 5
  ],
  // Kaedah penghantaran yang PERCUMA (tiada kos postage) — ikut arahan Jijah Bake4U.
  POSTAGE_FREE_METHODS: ['Pickup di Kedai', 'Ambil dengan Ejen'],
  // Kadar postage ikut jumlah bekas (Semenanjung sahaja setakat ini) — ikut arahan Jijah Bake4U.
  // maxContainers = had ATAS (inklusif) bagi setiap tier.
  POSTAGE_TIERS: [
    { maxContainers: 3, amount: 10 },  // 1-3 bekas
    { maxContainers: 10, amount: 15 }, // 4-10 bekas
    { maxContainers: 20, amount: 20 }, // 11-20 bekas
  ],
  // Diskaun khas EJEN ikut jumlah bekas TERKUMPUL (merentasi SEMUA tempahan ejen tu, bukan
  // setakat satu tempahan). Hanya terpakai jika ruangan "Nama Ejen" diisi semasa checkout.
  // discount = RM ditolak daripada harga SETIAP bekas (sama kadar seperti laman lama:
  // tolak RM5). Diskaun ini = komisyen ejen.
  AGENT_PRICE_TIERS: [
    { minCumulative: 50, discount: 5 }, // 50 bekas terkumpul ke atas -> harga ejen = harga biskut tolak RM5 sebekas
  ],
  // Produk yang harganya BAWAH RM39 (cth. Rainbow Cookies, Mix Pack, Combo Box) hanya dapat
  // potongan/komisyen ejen RM4 sebekas (bukan RM5). Produk RM39 ke atas kekal RM5.
  AGENT_LOW_PRICE_THRESHOLD: 39,
  AGENT_LOW_PRICE_DISCOUNT: 4,
};

function money(n) {
  const num = Number(n) || 0;
  return 'RM' + num.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Pelan ansuran daripada JUMLAH TEMPAHAN (RM). Jumlah tempahan = jumlah (harga setiap biskut x bekas).
// ANSURAN BULANAN = JUMLAH TEMPAHAN / 5 BULAN. Ansuran terakhir serap baki pembundaran.
function calcInstallmentPlanFromTotal(totalAmountRaw, months = CONFIG.INSTALLMENT_MONTHS) {
  const totalAmount = round2(totalAmountRaw);
  // Kira dalam SEN (integer) supaya tiada ralat perpuluhan (cth RM189 / 5 = RM37.80, bukan RM37.79).
  const totalCents = Math.round(totalAmount * 100);
  const baseInstallment = Math.floor(totalCents / months) / 100;
  const installments = [];
  let allocated = 0;
  for (let i = 1; i <= months; i++) {
    let amt = baseInstallment;
    if (i === months) {
      amt = round2(totalAmount - allocated);
    }
    installments.push(amt);
    allocated = round2(allocated + amt);
  }
  return { totalAmount, monthlyAmount: baseInstallment, installments };
}

// Untuk contoh pakej sahaja (bekas x satu harga contoh).
function calcInstallmentPlan(totalContainers, months = CONFIG.INSTALLMENT_MONTHS, perContainer = CONFIG.EXAMPLE_PRICE) {
  return calcInstallmentPlanFromTotal(totalContainers * perContainer, months);
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

// Diskaun sebekas untuk EJEN ikut jumlah bekas TERKUMPUL (cumulativeContainers = jumlah bekas
// semua tempahan ejen tu setakat ini, TERMASUK tempahan semasa). Pulangkan 0 jika belum cecah
// tier ejen yang paling rendah (50 bekas).
function calcAgentDiscount(cumulativeContainers) {
  const tiers = CONFIG.AGENT_PRICE_TIERS; // disusun dari tier tertinggi ke rendah
  for (const tier of tiers) {
    if (cumulativeContainers >= tier.minCumulative) return tier.discount;
  }
  return 0;
}

// Kira kos postage ikut kaedah penghantaran + jumlah bekas.
// Percuma untuk pickup sendiri / ambil dengan ejen. Selain itu, ikut tier CONFIG.POSTAGE_TIERS.
function calcPostage(totalContainers, deliveryMethod) {
  if (CONFIG.POSTAGE_FREE_METHODS.includes(deliveryMethod)) return 0;
  const tiers = CONFIG.POSTAGE_TIERS;
  const tier = tiers.find(t => totalContainers <= t.maxContainers);
  // Jika melebihi had tertinggi (>20 bekas), guna kadar tertinggi sebagai lalai selamat.
  return tier ? tier.amount : tiers[tiers.length - 1].amount;
}

// Tambah kos postage (sekali sahaja) kepada Ansuran 1 dalam pelan ansuran sedia ada.
function applyPostageToPlan(plan, postageAmount) {
  if (!postageAmount) return { ...plan, postageAmount: 0 };
  const installments = plan.installments.slice();
  installments[0] = round2(installments[0] + postageAmount);
  return {
    totalAmount: round2(plan.totalAmount + postageAmount),
    monthlyAmount: plan.monthlyAmount,
    installments,
    postageAmount,
  };
}

function addMonths(dateObj, months) {
  const d = new Date(dateObj);
  d.setMonth(d.getMonth() + months);
  return d;
}

function isoDate(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function formatDateMY(d) {
  const date = new Date(d);
  return date.toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTimeMY(d) {
  const date = new Date(d);
  return date.toLocaleString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function monthLabelMY(d) {
  const date = new Date(d);
  return date.toLocaleDateString('ms-MY', { month: 'long', year: 'numeric' });
}

module.exports = {
  CONFIG, money, escapeHtml, calcInstallmentPlan, calcInstallmentPlanFromTotal, calcAgentDiscount, calcPostage, applyPostageToPlan, round2, addMonths, isoDate, formatDateMY, formatDateTimeMY, monthLabelMY,
};
