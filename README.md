# JIJAH BAKE4U — Tempahan Biskut Raya Jijah Bake4U 2027

> **Laman baru (salinan daripada laman Ansuran Biskut Raya 2027), dengan perubahan:**
> - Tajuk: **TEMPAHAN BISKUT RAYA JIJAH BAKE4U 2027**. No. tempahan bermula `TBR-` (bukan `JB4U-`).
> - **30 produk** ikut Katalog Biskut Raya 2027 (tambah Snow Almond, Rainbow Cookies, Mix Pack 4 Jenis, Mix Pack 6 Jenis, Pandan Nyoir RM40, Combo Box RM36, Gift Box RM55 — medan `"note"` = catatan kecil di bawah penerangan).
> - **Harga ikut setiap biskut** (RM26–RM41). Ubah harga dalam `catalog/products.json` (medan `"price"`).
> - **TIADA ansuran.** Pelanggan bayar penuh: jumlah biskut + kos postage.
> - **Dua cara bayar:** ToyyibPay, ATAU pindahan bank + muat naik resit. Resit disemak admin di `/admin/resit` (SAHKAN / TOLAK). Fail resit disimpan dalam `data/receipts/` (folder `data/` mesti Volume kekal di Railway).
> - **Tambah biskut kemudian:** pelanggan buka *Semak Tempahan Saya* → **+ TAMBAH BISKUT**. Setiap tambahan jadi satu bayaran baru (termasuk beza kos postage jika bekas bertambah). Hanya untuk biskut yang masih ada stok.
> - Harga ejen: harga biskut **tolak RM5 sebekas** (komisyen RM5) bermula 50 bekas terkumpul. **Produk bawah RM39 (Mix Pack 4 & 6, Combo Box): tolak RM4 sahaja; Rainbow Cookies: tolak RM3** (medan `"agentDiscount": 3` dalam katalog) — automatik ikut harga (`AGENT_LOW_PRICE_THRESHOLD` dalam `lib/helpers.js`). Tetapan dalam `lib/helpers.js` → `AGENT_PRICE_TIERS`.
> - **Stok:** admin isi stok di `/admin/stok`. Stok berkurang automatik setiap tempahan / tambahan. Pelanggan hanya boleh **tambah biskut selagi ada stok**.
> - Akaun bank lalai: Maybank 5630 1928 4855 (Bake For You Enterprise) — boleh ditukar melalui Environment Variables.


Website tempahan pelanggan + katalog produk + cart + sistem ansuran 5 bulan + payment gateway (sandbox) +
admin dashboard + laporan jualan/bayaran/pengeluaran + pengurusan ejen + cabutan bertuah + export Excel/CSV + backup.

Dibina **tanpa sebarang "npm install"** — hanya guna Node.js sahaja (termasuk pangkalan data SQLite terbina-dalam),
supaya mudah dijalankan oleh sesiapa sahaja tanpa banyak langkah teknikal.

---

## 1. Cara Jalankan Website Ini (Local / Untuk Testing)

1. Pasang **Node.js versi 22 atau lebih baharu** (https://nodejs.org) pada komputer.
2. Buka Terminal / Command Prompt, masuk ke folder ini:
   ```
   cd jijah-bake4u
   ```
3. Jalankan:
   ```
   node server.js
   ```
4. Buka pelayar (browser) pergi ke: **http://localhost:3000**
5. Admin Dashboard: **http://localhost:3000/admin/login**
   - Username: `jijah`
   - Password: `JijahBake4U2027!`
   - **PENTING: Tukar password ini di dalam fail `.env` sebelum website live.**

Tiada `npm install` diperlukan — semua fungsi (web server, router, pangkalan data) menggunakan ciri terbina-dalam Node.js sahaja.

---

## 2. Struktur Folder (Ringkas)

```
jijah-bake4u/
  server.js            <- fail utama, start server
  .env                 <- semua tetapan (password admin, WhatsApp, payment gateway, dsb.)
  data/
    products.json      <- SENARAI 23 BISKUT — edit fail ini untuk tambah/ubah biskut
    jijahbake4u.sqlite  <- PANGKALAN DATA SEBENAR (tempahan, pelanggan, bayaran) — JANGAN PADAM
  public/images/        <- gambar produk & logo
  lib/                  <- logik sistem (pengiraan ansuran, payment, database)
  routes/                <- laluan website (customer + admin + API)
  views/                 <- paparan HTML setiap halaman
```

---

## 3. Macam Mana Nak Tambah / Ubah Biskut?

Buka fail **`data/products.json`** dengan Notepad / VSCode. Setiap biskut ada bentuk begini:

```json
{
  "id": "P01",
  "name": "Ferrocher Cookies",
  "size": "40-42 pcs",
  "price": 41,
  "description": "Penerangan biskut...",
  "image": "ferrocher-cookies.jpg",
  "active": true
}
```

- Untuk **tukar gambar**: letak fail gambar baru dalam folder `public/images/`, kemudian tukar nilai `"image"`.
- Untuk **sembunyikan biskut** (habis stok dll): tukar `"active": true` kepada `"active": false`.
- Untuk **tambah biskut baru**: salin satu blok `{ ... }`, tukar semua nilai, pastikan `"id"` adalah unik (cth `P24`).
- **Harga ansuran (`installmentPrice`) sentiasa RM36** untuk semua biskut — jangan diubah melainkan pihak Jijah Bake4U
  memutuskan untuk menukar harga program ansuran.
- Selepas ubah fail ini, **mulakan semula server** (`node server.js`) untuk perubahan berkuat kuasa.

### ⚠️ Nota tentang 25 jenis biskut
Daripada senarai harga (Senarai_Harga_Biskut_Raya_2027) yang diberikan, item **#10** dan **#16** kosong (tiada nama),
jadi hanya **23 biskut sebenar** yang dimasukkan ke dalam sistem ini. Sila beritahu jika ada 2 lagi biskut yang
patut ditambah untuk cukupkan 25.

### ⚠️ Nota tentang gambar produk
**Semua 23 biskut** kini menggunakan **gambar sebenar** yang diberikan (dipadankan mengikut nama fail asal —
cth `BISKUT_MAKMUR.jpg`, `TART_HAZELNUT.jpg`, `SUJI_BADAM.jpg`). Tiada gambar AI/stock digunakan.

Nota kecil: keterangan **Suji Badam** dalam `products.json` masih tertulis "berbentuk bulat" tetapi gambar sebenar
yang diberikan menunjukkan bentuk hati (love shape). Sila semak/betulkan keterangan ini dalam `products.json` jika
perlu — sistem tidak menukar teks keterangan asal tanpa pengesahan Jijah Bake4U.

**Pandan Nyoir** — gambar ini diberikan tetapi bukan sebahagian daripada 23 biskut dalam senarai harga rasmi.
Ia sudah dimasukkan ke dalam `products.json` sebagai produk `P24` dengan gambar sebenar, TETAPI **disembunyikan
daripada pelanggan** (`"active": false`) kerana saiz/bekas, harga retail dan penerangan penuh belum diberikan —
sistem tidak mereka-reka maklumat ini. Untuk aktifkan: isikan `size`, `retailPrice`, `description` yang betul dalam
`products.json`, tukar `"active"` kepada `true`, mulakan semula server.

---

## 4. Fail `.env` — Semua Tetapan Penting

Salin `.env.example` kepada `.env` (sudah dibuat) dan kemaskini:

- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — log masuk admin dashboard. **WAJIB TUKAR sebelum live.**
- `SESSION_SECRET` — tukar kepada rentetan rawak yang panjang.
- `INSTALLMENT_PRICE_PER_CONTAINER` — RM36 (jangan ubah melainkan harga program berubah).
- `WHATSAPP_NUMBER` / `STORE_ADDRESS` — nombor WhatsApp & alamat kedai yang dipaparkan di seluruh website.
- `PAYMENT_GATEWAY` — `sandbox` (default, ujian sahaja) atau `toyyibpay` / `billplz` / `senangpay` apabila sudah
  ada akaun sebenar (lihat Bahagian 6).

---

## 5. Pangkalan Data (Database)

Sistem ini menggunakan **SQLite** (fail `data/jijahbake4u.sqlite`) — pangkalan data sebenar, BUKAN localStorage
pelayar. Semua tempahan, pelanggan, item, ansuran dan bayaran disimpan di sini secara **kekal (persistent)** dan
tidak hilang apabila server dimulakan semula atau website dikemaskini.

- **Backup**: Admin Dashboard → Export & Backup → "BACKUP DATA (JSON)" — muat turun salinan penuh secara berkala.
- **Jangan padam** fail `data/jijahbake4u.sqlite` — itu adalah SEMUA rekod tempahan sebenar.
- Website ini **bermula dengan 0 tempahan** — semua data ujian (dummy) yang digunakan semasa pembangunan telah
  dipadam sepenuhnya sebelum diserahkan.

### Migrasi ke Supabase / PostgreSQL (pilihan, untuk masa depan)
Semua logik pangkalan data diasingkan dalam `lib/db.js`, `lib/orders.js` dan `lib/payment.js`. Jika perniagaan
berkembang dan perlukan pangkalan data awan (cloud) seperti Supabase/PostgreSQL, seorang developer boleh menukar
fail-fail ini sahaja tanpa mengubah reka bentuk website.

---

## 6. Payment Gateway — Mod SANDBOX Sekarang

Website ini **TIDAK** membuat sebarang transaksi wang sebenar. Butang bayaran menggunakan simulasi
("✅ SIMULASI BAYARAN BERJAYA" / "⏳ MENUNGGU" / "❌ GAGAL") supaya seluruh sistem (ansuran, baki, dashboard,
export) boleh diuji dengan selamat.

**Struktur sudah disediakan** untuk disambungkan kepada gateway Malaysia sebenar:
- ToyyibPay, Billplz, senangPay, iPay88 — pilih SATU dalam `.env` (`PAYMENT_GATEWAY=...`) apabila akaun sudah sedia.
- Isikan API key / secret dalam `.env` (bukan dalam kod) — lihat `.env.example`.
- Webhook sebenar: `POST /api/payment/webhook/:gateway` — ini SATU-SATUNYA tempat bayaran boleh ditanda **PAID**.
  Pelanggan kembali ke website tidak akan menanda bayaran sebagai berjaya — mesti disahkan pelayan gateway.
- Fungsi `verifySignature()` dalam `lib/payment.js` perlu dikemaskini dengan cara pengesahan signature gateway
  yang dipilih (developer akan buat ini sebaik sahaja credentials sebenar diberikan).
- **JANGAN buat transaksi sebenar** sehingga akaun gateway + kebenaran pemilik disahkan.

---

## 7. Nak "Go Live" (Letakkan di Internet)

Sesi pembangunan ini berjalan dalam persekitaran sandbox tertutup dan **tidak boleh menerbitkan website terus ke
internet**. Untuk live:

1. Pilih hosting yang menyokong Node.js — contoh: Railway, Render, DigitalOcean App Platform, atau VPS biasa (cPanel
   dengan Node.js App / Passenger).
2. Muat naik kesemua fail dalam folder ini (kecuali `.env` sebenar — buat baru terus di server).
3. Set `PORT`, `ADMIN_PASSWORD`, `SESSION_SECRET`, dan tetapan payment gateway di server.
4. Pasangkan domain (cth `www.jijahbake4u.com`) + HTTPS (SSL) — kebanyakan hosting sediakan ini secara automatik.
5. Uji sekali lagi dalam mod sandbox, kemudian tukar `PAYMENT_GATEWAY` kepada gateway sebenar hanya selepas berpuas hati.

---

## 8. Apa Yang Sudah Diuji

- Kiraan ansuran (bekas × RM36 ÷ 5 bulan) untuk 5 / 10 / 15 / 20 bekas — **tepat**.
- Tempahan → Order ID unik (`JB4U-2026-0001`, dst.) → 5 ansuran dijana automatik.
- Cart → Checkout → Tempahan disimpan dalam database sebenar (bukan localStorage).
- Bayaran sandbox → status ansuran dikemaskini → baki dikira semula → dashboard admin dikemaskini automatik.
- Percubaan bayar 2 kali (duplicate webhook) — **tidak** direkod dua kali (idempotent).
- Cabutan Bertuah — tempahan ≥10 bekas ditanda "LAYAK" automatik.
- Semua nombor dashboard admin (jumlah tempahan, bekas, jualan, bayaran, baki) dikira automatik daripada database.
- Export CSV (Tempahan, Ringkasan Biskut, Rekod Bayaran, Cabutan Bertuah) dan Backup JSON — berfungsi.
- Responsive — desktop, tablet, mobile.
- Semua 14 gambar produk sebenar dipaparkan **penuh, tidak dipotong** (`object-fit: contain`).

## 9. Apa Yang Masih Perlu Maklumat Daripada Jijah Bake4U

- 9 gambar biskut yang belum ada (lihat Bahagian 3).
- 2 slot biskut kosong (#10, #16) dalam senarai harga asal — sama ada nak isi atau kekalkan 23 jenis.
- Akaun payment gateway sebenar (ToyyibPay/Billplz/senangPay/iPay88) apabila sedia untuk terima bayaran sebenar.
- Pautan pendaftaran ejen sebenar (buat masa ini butang "NAK JADI EJEN?" terus ke WhatsApp).
- Pengesahan pautan Facebook (`facebook.com/JijahBake4U`) dan TikTok (`@jijahbake4u`) — sila sahkan/betulkan jika salah.
