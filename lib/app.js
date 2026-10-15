// Minimal dependency-free HTTP router (Express-like) built on Node's http module.
const http = require('http');
const url = require('url');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.csv': 'text/csv; charset=utf-8',
};

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const k = pair.slice(0, idx).trim();
    const v = decodeURIComponent(pair.slice(idx + 1).trim());
    out[k] = v;
  });
  return out;
}

function parseMultipartFormFields(raw, contentType) {
  const out = {};
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '');
  const boundary = m ? (m[1] || m[2]) : null;
  if (!boundary) return out;
  const parts = raw.split(`--${boundary}`);
  parts.forEach((part) => {
    const clean = part.replace(/^\r\n/, '').replace(/\r\n--$|\r\n$/, '');
    if (!clean || clean === '--') return;
    const headerEnd = clean.indexOf('\r\n\r\n');
    if (headerEnd === -1) return;
    const headers = clean.slice(0, headerEnd);
    const value = clean.slice(headerEnd + 4).replace(/\r\n$/, '');
    const nameMatch = /name="([^"]+)"/i.exec(headers);
    if (nameMatch && !/filename="/i.test(headers)) {
      out[nameMatch[1]] = value;
    }
  });
  return out;
}

function compilePath(routePath) {
  const paramNames = [];
  const regexStr = routePath
    .replace(/\/:[a-zA-Z0-9_]+/g, (match) => {
      paramNames.push(match.slice(2));
      return '/([^/]+)';
    });
  return { regex: new RegExp('^' + regexStr + '$'), paramNames };
}

class App {
  constructor() {
    this.routes = { GET: [], POST: [] };
    this.staticDirs = [];
  }

  static(urlPrefix, dir) {
    this.staticDirs.push({ urlPrefix, dir });
  }

  get(routePath, handler) {
    const { regex, paramNames } = compilePath(routePath);
    this.routes.GET.push({ regex, paramNames, handler });
  }

  post(routePath, handler) {
    const { regex, paramNames } = compilePath(routePath);
    this.routes.POST.push({ regex, paramNames, handler });
  }

  async handleStatic(pathname, res) {
    for (const { urlPrefix, dir } of this.staticDirs) {
      if (pathname.startsWith(urlPrefix)) {
        const rel = pathname.slice(urlPrefix.length);
        const filePath = path.join(dir, decodeURIComponent(rel));
        if (!filePath.startsWith(dir)) return false; // path traversal guard
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath).toLowerCase();
          res.writeHead(200, {
            'Content-Type': MIME[ext] || 'application/octet-stream',
            'Cache-Control': ext.match(/\.(jpg|jpeg|png|svg|woff2?|ico)$/) ? 'public, max-age=604800' : 'public, max-age=3600',
          });
          fs.createReadStream(filePath).pipe(res);
          return true;
        }
      }
    }
    return false;
  }

  listen(port, cb) {
    const server = http.createServer(async (req, res) => {
      try {
        const parsed = url.parse(req.url);
        const pathname = decodeURIComponent(parsed.pathname);
        const query = querystring.parse(parsed.query || '');

        const served = await this.handleStatic(pathname, res);
        if (served) return;

        const list = this.routes[req.method] || [];
        let matched = null;
        let params = {};
        for (const route of list) {
          const m = route.regex.exec(pathname);
          if (m) {
            matched = route;
            route.paramNames.forEach((name, i) => { params[name] = decodeURIComponent(m[i + 1]); });
            break;
          }
        }

        const cookies = parseCookies(req.headers.cookie);

        let body = {};
        if (req.method === 'POST') {
          const raw = await new Promise((resolve, reject) => {
            let chunks = [];
            let size = 0;
            req.on('data', (c) => {
              size += c.length;
              if (size > 7 * 1024 * 1024) { reject(new Error('Payload too large')); req.destroy(); return; } // muat naik resit (base64) perlukan ruang lebih
              chunks.push(c);
            });
            req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
            req.on('error', reject);
          });
          const contentType = req.headers['content-type'] || '';
          if (contentType.includes('application/json')) {
            try { body = raw ? JSON.parse(raw) : {}; } catch (e) { body = {}; }
          } else if (contentType.includes('application/x-www-form-urlencoded')) {
            body = querystring.parse(raw);
          } else if (contentType.includes('multipart/form-data')) {
            // Sesetengah gateway pembayaran (cth. ToyyibPay) hantar callback sebagai
            // multipart/form-data (biasa untuk borang PHP), bukan x-www-form-urlencoded.
            // Parser ringkas ini hanya kendalikan medan teks (bukan fail) — cukup untuk
            // payload webhook pembayaran yang semuanya nilai teks.
            body = parseMultipartFormFields(raw, contentType);
          } else if (raw && raw.includes('=') && !contentType) {
            // Tiada header Content-Type langsung dihantar tapi badan nampak macam
            // "key=value&key2=value2" — cuba parse sebagai fallback supaya webhook
            // tidak gagal senyap-senyap disebabkan header yang hilang/tidak standard.
            try { body = querystring.parse(raw); } catch (e) { body = {}; }
          }
        }

        const reqCtx = { raw: req, method: req.method, pathname, query, params, cookies, body, headers: req.headers };

        const resCtx = {
          _status: 200,
          status(code) { this._status = code; return this; },
          type(t) { this._contentType = t; return this; },
          setCookie(name, value, opts = {}) {
            let str = `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly`;
            if (opts.maxAge) str += `; Max-Age=${opts.maxAge}`;
            if (opts.sameSite !== false) str += `; SameSite=Lax`;
            const existing = res.getHeader('Set-Cookie');
            const arr = existing ? (Array.isArray(existing) ? existing : [existing]) : [];
            arr.push(str);
            res.setHeader('Set-Cookie', arr);
            return this;
          },
          clearCookie(name) {
            return this.setCookie(name, '', { maxAge: 0 });
          },
          send(strOrBuf) {
            res.writeHead(this._status, { 'Content-Type': this._contentType || 'text/html; charset=utf-8' });
            res.end(strOrBuf);
          },
          json(obj) {
            res.writeHead(this._status, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(obj));
          },
          redirect(loc) {
            res.writeHead(302, { Location: loc });
            res.end();
          },
          download(content, filename, mime = 'text/csv; charset=utf-8') {
            res.writeHead(this._status, {
              'Content-Type': mime,
              'Content-Disposition': `attachment; filename="${filename}"`,
            });
            res.end(content);
          },
          notFound() {
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<h1>404 - Halaman tidak dijumpai</h1><p><a href="/">Kembali ke Laman Utama</a></p>');
          },
        };

        if (matched) {
          await matched.handler(reqCtx, resCtx);
        } else {
          resCtx.notFound();
        }
      } catch (err) {
        console.error('Server error:', err);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>500 - Ralat Pelayan</h1><pre>' + (err && err.message ? err.message : 'Unknown error') + '</pre>');
        }
      }
    });
    server.listen(port, cb);
    return server;
  }
}

module.exports = { App };
