// Persistent SQLite database (Node.js built-in node:sqlite — file-based, survives restarts).
// One source of truth for Products, Orders, Order Items, Installments, Agents.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { CONFIG } = require('./helpers');

const DB_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'jijahbake4u.sqlite');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  size TEXT,
  retail_price REAL,
  installment_price REAL NOT NULL,  -- harga sebekas ikut katalog (setiap biskut berbeza)
  description TEXT,
  image TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0
);

-- Pendaftaran ejen: ejen isi borang di /ejen/daftar (status MENUNGGU), admin semak dalam
-- dashboard dan LULUSKAN (beri No. Ahli Ejen) atau TOLAK. Hanya ejen berstatus DILULUSKAN
-- muncul dalam senarai pilihan "Nama Ejen" di borang checkout — ini elak typo nama ejen
-- (yang boleh pecahkan pengiraan komisyen) berbanding ruangan teks bebas yang lama.
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  member_no TEXT,
  status TEXT NOT NULL DEFAULT 'MENUNGGU',  -- MENUNGGU, DILULUSKAN, DITOLAK
  created_at TEXT NOT NULL,
  approved_at TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,               -- Order ID e.g. JB4U-2026-0001
  created_at TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT,
  postcode TEXT,
  state TEXT,
  agent_name TEXT NOT NULL DEFAULT 'DIRECT / JIJAH BAKE4U',
  agent_id TEXT,
  delivery_method TEXT,
  postage_amount REAL NOT NULL DEFAULT 0,
  notes TEXT,
  total_containers INTEGER NOT NULL,
  total_amount REAL NOT NULL,
  paid_amount REAL NOT NULL DEFAULT 0,
  balance REAL NOT NULL,
  installment_months INTEGER NOT NULL DEFAULT 5,
  order_status TEXT NOT NULL DEFAULT 'BARU',       -- BARU, DIPROSES, SELESAI, DIBATALKAN
  payment_status TEXT NOT NULL DEFAULT 'BELUM_BAYAR', -- BELUM_BAYAR, SEBAHAGIAN, LENGKAP
  lucky_draw_status TEXT NOT NULL DEFAULT 'TIDAK_LAYAK' -- LAYAK, TIDAK_LAYAK
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  base_price REAL,                    -- harga biasa produk semasa tempahan (sebelum diskaun ejen)
  unit_price REAL NOT NULL,           -- harga sebenar dikenakan (selepas diskaun ejen, jika ada)
  subtotal REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS installments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  amount REAL NOT NULL,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'UNPAID',  -- UNPAID, PENDING (gateway), SEMAKAN (resit menunggu semakan admin), PAID, FAILED, REFUNDED
  payment_date TEXT,
  transaction_id TEXT UNIQUE,
  payment_reference TEXT,
  gateway TEXT
);

CREATE TABLE IF NOT EXISTS payment_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  installment_number INTEGER,
  transaction_id TEXT UNIQUE,
  gateway TEXT,
  amount REAL,
  status TEXT,
  raw_payload TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS counters (
  name TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);
`);

// --- Migrasi ringan: "CREATE TABLE IF NOT EXISTS" tidak tambah lajur baru pada jadual yang
// SUDAH wujud (contoh: fail .sqlite lama pengguna dari sebelum ciri Pendaftaran Ejen ditambah).
// Fungsi ini semak lajur sedia ada dan tambah lajur yang hilang, supaya update kod baru tetap
// berfungsi pada pangkalan data sedia ada tanpa perlu padam fail .sqlite setiap kali.
function ensureColumn(table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  const exists = cols.some((c) => c.name === column);
  if (!exists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}
ensureColumn('agents', 'address', 'address TEXT');
ensureColumn('agents', 'member_no', 'member_no TEXT');
ensureColumn('agents', 'approved_at', 'approved_at TEXT');
// Stok biskut (bekas) diisi admin di /admin/stok — TIDAK diusik oleh syncProductsFromJson()
// supaya stok yang admin isi tak hilang/reset setiap kali server dimulakan semula.
ensureColumn('products', 'stock', 'stock INTEGER NOT NULL DEFAULT 0');
// Harga biasa produk direkodkan pada setiap item tempahan — supaya komisyen ejen
// (harga biasa - harga ejen) boleh dikira tepat walaupun setiap biskut harga berbeza.
ensureColumn('order_items', 'base_price', 'base_price REAL');
// Catatan kecil produk (cth. "corak kotak bergantung pada stok pembekal").
ensureColumn('products', 'note', 'note TEXT');
// Potongan harga ejen khas untuk produk tertentu (cth. Combo Box RM4). Kosong = guna kadar biasa (RM5).
ensureColumn('products', 'agent_discount', 'agent_discount REAL');
// Laman ini TIADA ansuran: jadual "installments" digunakan sebagai senarai BAYARAN bagi setiap
// tempahan. Bayaran 1 = bayaran penuh tempahan asal. Setiap kali pelanggan TAMBAH BISKUT, satu
// bayaran tambahan baru dicipta. Pelanggan bayar setiap satu melalui ToyyibPay ATAU hantar resit.
ensureColumn('installments', 'label', 'label TEXT');
ensureColumn('installments', 'receipt_file', 'receipt_file TEXT');
ensureColumn('installments', 'receipt_uploaded_at', 'receipt_uploaded_at TEXT');
ensureColumn('installments', 'receipt_note', 'receipt_note TEXT');
ensureColumn('order_items', 'added_at', 'added_at TEXT');

// --- Seed / sync products from catalog/products.json (owner edits that file to update catalogue) ---
// NOTE: sengaja diletakkan di folder catalog/ (BUKAN data/) — sebab data/ ialah folder yang
// dijadikan "Volume" (storan kekal) bila website live di hosting (Railway dll). Volume akan
// menggantikan/menutup apa-apa fail yang asalnya ada di dalam data/, jadi kalau products.json
// diletak dalam data/, ia akan "hilang" pada server live walaupun wujud dalam kod di GitHub.
const CATALOG_DIR = path.join(__dirname, '..', 'catalog');
function syncProductsFromJson() {
  const jsonPath = path.join(CATALOG_DIR, 'products.json');
  if (!fs.existsSync(jsonPath)) {
    console.log(`\n  [PRODUK] AMARAN: Fail katalog TIDAK DIJUMPAI di: ${jsonPath}`);
    console.log(`  [PRODUK] Sebab tu katalog biskut kosong. Pastikan fail catalog/products.json wujud di GitHub.\n`);
    return;
  }
  const products = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`\n  [PRODUK] Fail katalog dijumpai (${jsonPath}) — ${products.length} produk akan disync.`);
  const upsert = db.prepare(`
    INSERT INTO products (id, name, size, retail_price, installment_price, description, image, active, sort_order, note, agent_discount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, size=excluded.size, retail_price=excluded.retail_price,
      installment_price=excluded.installment_price, description=excluded.description, note=excluded.note, agent_discount=excluded.agent_discount,
      image=excluded.image, active=excluded.active, sort_order=excluded.sort_order
  `);
  products.forEach((p, idx) => {
    if (!(Number(p.price) > 0)) {
      console.log(`  [PRODUK] AMARAN: ${p.name} tiada harga ("price") yang sah dalam catalog/products.json — produk ini dilangkau.`);
      return;
    }
    upsert.run(
      p.id, p.name, p.size || null,
      null, // tiada lagi harga retail berasingan — harga dalam katalog ialah harga tempahan
      Number(p.price),
      p.description || '',
      p.image || null,
      p.active === false ? 0 : 1,
      idx,
      p.note || null,
      // Potongan ejen khas: nilai "agentDiscount" dalam katalog jika ada; jika tiada, produk
      // berharga bawah RM39 automatik dapat RM4 (lihat CONFIG.AGENT_LOW_PRICE_*); selebihnya kadar biasa.
      p.agentDiscount !== undefined && p.agentDiscount !== null
        ? Number(p.agentDiscount)
        : (Number(p.price) < CONFIG.AGENT_LOW_PRICE_THRESHOLD ? CONFIG.AGENT_LOW_PRICE_DISCOUNT : null)
    );
  });
}
syncProductsFromJson();

function getCounter(name) {
  const row = db.prepare('SELECT value FROM counters WHERE name = ?').get(name);
  if (!row) {
    db.prepare('INSERT INTO counters (name, value) VALUES (?, 0)').run(name);
    return 0;
  }
  return row.value;
}

function incCounter(name) {
  const current = getCounter(name);
  const next = current + 1;
  db.prepare('UPDATE counters SET value = ? WHERE name = ?').run(next, name);
  return next;
}

function generateOrderId() {
  const year = new Date().getFullYear();
  const counterKey = `order_seq_${year}`;
  const seq = incCounter(counterKey);
  const padded = String(seq).padStart(4, '0');
  // Awalan "TBR" (Tempahan Biskut Raya) — beza daripada "JB4U-" laman Ansuran supaya
  // nombor tempahan dua laman tidak bercampur.
  return `TBR-${year}-${padded}`;
}

function generateAgentId() {
  const seq = incCounter('agent_seq');
  return `EJEN-${String(seq).padStart(4, '0')}`;
}

function generateTransactionId(prefix = 'TXN') {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

module.exports = { db, generateOrderId, generateAgentId, generateTransactionId, syncProductsFromJson, DB_PATH };
