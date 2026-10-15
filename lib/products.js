// Pengurusan Stok Biskut. Admin isi stok (bekas) di /admin/stok — nilai ini disimpan terus
// dalam pangkalan data dan TIDAK diusik oleh syncProductsFromJson() (yang hanya kemaskini
// nama/harga/gambar dari data/products.json setiap kali server start). Stok dipaparkan pada
// laman katalog (/produk) untuk makluman pelanggan sahaja — tempahan TIDAK disekat walaupun
// stok menunjukkan 0 (ikut arahan Jijah Bake4U).
const { db } = require('./db');

function listProductsForStock() {
  return db.prepare(`SELECT id, name, size, image, stock, active FROM products ORDER BY sort_order ASC`).all();
}

function updateStockBulk(formBody) {
  const products = db.prepare(`SELECT id FROM products`).all();
  const validIds = new Set(products.map((p) => p.id));
  const update = db.prepare(`UPDATE products SET stock = ? WHERE id = ?`);
  Object.keys(formBody || {}).forEach((key) => {
    if (!key.startsWith('stock_')) return;
    const id = key.slice('stock_'.length);
    if (!validIds.has(id)) return;
    const parsed = parseInt(formBody[key], 10);
    const safeStock = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    update.run(safeStock, id);
  });
}

module.exports = { listProductsForStock, updateStockBulk };
