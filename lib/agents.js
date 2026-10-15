// Pendaftaran & pengurusan Ejen Jijah Bake4U.
// Alur: ejen isi borang di /ejen/daftar -> rekod status MENUNGGU -> admin semak dalam
// dashboard -> LULUSKAN (admin beri No. Ahli Ejen sendiri) atau TOLAK. Hanya ejen
// DILULUSKAN keluar dalam senarai pilihan "Nama Ejen" di borang checkout.
const { db, generateAgentId } = require('./db');

const PHONE_PATTERN = /^[0-9+\-\s]{7,20}$/;

function registerAgent({ name, phone, address }) {
  const cleanName = (name || '').trim();
  const cleanPhone = (phone || '').trim();
  const cleanAddress = (address || '').trim();

  if (!cleanName || !cleanPhone || !cleanAddress) {
    throw new Error('Sila lengkapkan semua maklumat wajib (*).');
  }
  if (!PHONE_PATTERN.test(cleanPhone)) {
    throw new Error('Format No. WhatsApp tidak sah. Sila semak semula.');
  }

  const existing = db.prepare(
    `SELECT id FROM agents WHERE LOWER(TRIM(name)) = LOWER(?) AND status != 'DITOLAK'`
  ).get(cleanName);
  if (existing) {
    throw new Error('Nama ini sudah didaftarkan sebagai ejen. Jika ini silap, sila hubungi Jijah Bake4U melalui WhatsApp.');
  }

  const id = generateAgentId();
  const nowIso = new Date().toISOString();
  db.prepare(`
    INSERT INTO agents (id, name, phone, address, member_no, status, created_at, approved_at)
    VALUES (?, ?, ?, ?, NULL, 'MENUNGGU', ?, NULL)
  `).run(id, cleanName, cleanPhone, cleanAddress, nowIso);

  return id;
}

function listApprovedAgents() {
  return db.prepare(`SELECT id, name, member_no FROM agents WHERE status = 'DILULUSKAN' ORDER BY name ASC`).all();
}

function listAgentsByStatus(status) {
  return db.prepare(`SELECT * FROM agents WHERE status = ? ORDER BY created_at DESC`).all(status);
}

function listAllAgents() {
  return db.prepare(`SELECT * FROM agents ORDER BY (status = 'MENUNGGU') DESC, created_at DESC`).all();
}

// Cadangan No. Ahli Ejen seterusnya (0001, 0002, ...) supaya admin boleh terus klik LULUSKAN
// tanpa perlu taip — dikira daripada No. Ahli tertinggi yang pernah diberikan setakat ini.
// Admin masih boleh tukar nilai ni secara manual dalam borang jika perlu (contoh: nak skip
// nombor atau guna format lain).
function getSuggestedMemberNo() {
  const rows = db.prepare(`SELECT member_no FROM agents WHERE member_no IS NOT NULL`).all();
  let maxNum = 0;
  rows.forEach((r) => {
    const match = String(r.member_no).match(/(\d+)\s*$/);
    if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
  });
  return String(maxNum + 1).padStart(4, '0');
}

function approveAgent(id, memberNo) {
  const cleanMemberNo = (memberNo || '').trim();
  if (!cleanMemberNo) {
    throw new Error('Sila masukkan No. Ahli Ejen.');
  }
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
  if (!agent) throw new Error('Pendaftaran ejen tidak dijumpai.');
  db.prepare(`UPDATE agents SET status = 'DILULUSKAN', member_no = ?, approved_at = ? WHERE id = ?`)
    .run(cleanMemberNo, new Date().toISOString(), id);
}

function rejectAgent(id) {
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
  if (!agent) throw new Error('Pendaftaran ejen tidak dijumpai.');
  db.prepare(`UPDATE agents SET status = 'DITOLAK' WHERE id = ?`).run(id);
}

function findApprovedAgentByName(name) {
  const cleanName = (name || '').trim();
  if (!cleanName) return null;
  return db.prepare(
    `SELECT * FROM agents WHERE status = 'DILULUSKAN' AND LOWER(TRIM(name)) = LOWER(?)`
  ).get(cleanName);
}

module.exports = {
  registerAgent, listApprovedAgents, listAgentsByStatus, listAllAgents,
  approveAgent, rejectAgent, findApprovedAgentByName, getSuggestedMemberNo,
};
