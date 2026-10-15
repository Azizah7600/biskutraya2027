const crypto = require('crypto');
const { db } = require('./db');

const SESSION_COOKIE = 'jb4u_admin';
const SESSION_HOURS = 12;

function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_HOURS * 3600 * 1000);
  db.prepare('INSERT INTO admin_sessions (token, created_at, expires_at) VALUES (?, ?, ?)')
    .run(token, now.toISOString(), expires.toISOString());
  return token;
}

function isValidSession(token) {
  if (!token) return false;
  const row = db.prepare('SELECT * FROM admin_sessions WHERE token = ?').get(token);
  if (!row) return false;
  if (new Date(row.expires_at) < new Date()) {
    db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(token);
    return false;
  }
  return true;
}

function destroySession(token) {
  if (token) db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(token);
}

function requireAdmin(req, res, next) {
  const token = req.cookies[SESSION_COOKIE];
  if (isValidSession(token)) {
    return next();
  }
  return res.redirect('/admin/login');
}

module.exports = { SESSION_COOKIE, createSession, isValidSession, destroySession, requireAdmin };
