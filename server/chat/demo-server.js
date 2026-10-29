/* Máy chủ chat demo cùng origin: HTTP + SSE, chỉ dùng thư viện chuẩn Node. */
'use strict';
const http = require('node:http');
const { randomBytes, randomUUID } = require('node:crypto');
const { createReadStream, readFileSync } = require('node:fs');
const { stat, realpath } = require('node:fs/promises');
const { resolve, sep, extname } = require('node:path');

function createDemoServer({ rootDir = resolve(__dirname, '../..'), clock = Date.now } = {}) {
  const sessions = new Map(), peers = new Map(), joins = new Map(), history = [];
  const cookieName = 'huGioiChatDemo', sessionLife = 24 * 3600e3;
  const csp = readFileSync(resolve(rootDir, '_headers'), 'utf8').match(/Content-Security-Policy: (.+)/)[1];
  const fail = (status, message) => Object.assign(Error(message), { status });
  const json = (res, status, value) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(value));
  };
  const online = () => new Set(peers.values()).size;
  const writeEvent = (res, event, data) => {
    if (res.destroyed) return;
    if (res.writableLength > 256 * 1024) { res.destroy(); return; }
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
  const broadcast = (event, data) => { for (const res of peers.keys()) writeEvent(res, event, data); };
  const presence = () => broadcast('presence', { online: online() });
  const tokenOf = req => (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  const sessionOf = req => {
    const session = sessions.get(tokenOf(req));
    if (!session || session.expires <= clock()) throw fail(401, 'Phiên chat đã hết hạn. Hãy kết nối lại.');
    return session;
  };
  const body = async (req, keys) => {
    if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) throw fail(415, 'Cần gửi JSON.');
    const chunks = await new Promise((resolve, reject) => {
      let size = 0, chunks = [];
      const cleanup = () => { req.off('data', data); req.off('end', end); req.off('error', error); req.off('aborted', aborted); };
      const error = value => { cleanup(); reject(value); };
      const aborted = () => error(fail(400, 'Yêu cầu bị ngắt.'));
      const end = () => { cleanup(); resolve(chunks); };
      const data = chunk => {
        size += chunk.length;
        if (size > 4096) { error(fail(413, 'Nội dung quá dài.')); req.resume(); return; }
        chunks.push(chunk);
      };
      req.on('data', data); req.once('end', end); req.once('error', error); req.once('aborted', aborted);
    });
    let value;
    try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw fail(400, 'JSON không hợp lệ.'); }
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) throw fail(400, 'Dữ liệu không hợp lệ.');
    return value;
  };
  const text = (value, max) => {
    if (typeof value !== 'string') throw fail(400, 'Nội dung không hợp lệ.');
    const result = value.normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').trim();
    if (!result || result.length > max) throw fail(400, `Nội dung phải có từ 1 đến ${max} ký tự.`);
    return result;
  };

  async function api(req, res, path) {
    if (req.headers['sec-fetch-site'] === 'cross-site') throw fail(403, 'Chỉ kết nối từ trang game.');
    if (req.method === 'POST') {
      let origin;
      try { origin = new URL(req.headers.origin); } catch { throw fail(403, 'Thiếu origin hợp lệ.'); }
      if (!['http:', 'https:'].includes(origin.protocol) || origin.host !== req.headers.host) throw fail(403, 'Origin không hợp lệ.');
    }
    if (path === '/api/chat/join' && req.method === 'POST') {
      const input = await body(req, ['name']), name = text(input.name, 24), now = clock();
      const ip = req.socket.remoteAddress;
      const limit = joins.get(ip) || { since: now, count: 0 };
      if (now - limit.since >= 60000) { limit.since = now; limit.count = 0; }
      if (++limit.count > 20) throw fail(429, 'Kết nối quá nhanh. Thử lại sau một phút.');
      if (!joins.has(ip) && joins.size >= 1000) throw fail(503, 'Máy chủ demo đang bận.');
      joins.set(ip, limit);
      let token = tokenOf(req), session = sessions.get(token);
      if (!session || session.expires <= now || session.name !== name) {
        if (sessions.size >= 1000) throw fail(503, 'Máy chủ demo đã đầy phiên.');
        token = randomBytes(32).toString('hex');
        session = { id: randomUUID(), name, expires: now + sessionLife, lastMessage: -Infinity, receipts: new Map() };
        sessions.set(token, session);
      }
      session.expires = now + sessionLife;
      res.setHeader('Set-Cookie', `${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/api/chat; Max-Age=86400${req.socket.encrypted ? '; Secure' : ''}`);
      json(res, 200, { self: { id: session.id, name: session.name }, maxLength: 400 });
      return;
    }
    if (path === '/api/chat/events' && req.method === 'GET') {
      const session = sessionOf(req);
      if (peers.size >= 100 || [...peers.values()].filter(s => s === session).length >= 3) throw fail(429, 'Đã đạt giới hạn kết nối chat.');
      res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
      res.flushHeaders();
      res.write('retry: 3000\n\n');
      peers.set(res, session);
      writeEvent(res, 'snapshot', { messages: history, online: online() });
      presence();
      res.on('close', () => { peers.delete(res); presence(); });
      return;
    }
    if (path === '/api/chat/messages' && req.method === 'POST') {
      const session = sessionOf(req), input = await body(req, ['requestId', 'text']);
      if (typeof input.requestId !== 'string' || !/^[a-zA-Z0-9_-]{8,64}$/.test(input.requestId)) throw fail(400, 'Mã tin nhắn không hợp lệ.');
      const content = text(input.text, 400), previous = session.receipts.get(input.requestId);
      if (previous) {
        if (previous.text !== content) throw fail(409, 'Mã tin nhắn đã dùng cho nội dung khác.');
        json(res, 200, { message: previous }); return;
      }
      const now = clock();
      if (now - session.lastMessage < 2000) throw fail(429, 'Chờ 2 giây giữa hai tin nhắn.');
      const message = { id: randomUUID(), senderId: session.id, name: session.name, text: content, at: now };
      session.lastMessage = now;
      session.receipts.set(input.requestId, message);
      if (session.receipts.size > 100) session.receipts.delete(session.receipts.keys().next().value);
      history.push(message);
      if (history.length > 100) history.shift();
      broadcast('message', message);
      json(res, 201, { message });
      return;
    }
    throw fail(404, 'Không có API này.');
  }

  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.ico': 'image/x-icon' };
  async function asset(req, res, path) {
    if (!['GET', 'HEAD'].includes(req.method)) throw fail(405, 'Phương thức không hỗ trợ.');
    const relative = path === '/' ? 'index.html' : path.slice(1);
    if (relative !== 'index.html' && !/^(client|shared|css|media)\//.test(relative)) throw fail(404, 'Không tìm thấy tài nguyên.');
    const publicRoot = relative === 'index.html' ? resolve(rootDir) : resolve(rootDir, relative.split('/')[0]);
    const file = await realpath(resolve(rootDir, relative));
    if (!file.startsWith(publicRoot + sep) || !mime[extname(file)] || relative !== 'index.html' && extname(file) === '.html') throw fail(404, 'Không tìm thấy tài nguyên.');
    const info = await stat(file);
    if (!info.isFile()) throw fail(404, 'Không tìm thấy tài nguyên.');
    let start = 0, end = info.size - 1, status = 200;
    if (req.headers.range && extname(file) === '.mp3') {
      const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
      if (!range) throw fail(416, 'Khoảng tải không hợp lệ.');
      start = Number(range[1]); end = range[2] ? Math.min(end, Number(range[2])) : end;
      if (start > end || !Number.isSafeInteger(start)) { res.setHeader('Content-Range', `bytes */${info.size}`); throw fail(416, 'Khoảng tải không hợp lệ.'); }
      status = 206;
      res.setHeader('Content-Range', `bytes ${start}-${end}/${info.size}`);
    }
    res.writeHead(status, { 'Content-Type': mime[extname(file)], 'Content-Length': Math.max(0, end - start + 1), 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' });
    if (req.method === 'HEAD' || !info.size) { res.end(); return; }
    const stream = createReadStream(file, { start, end });
    stream.on('error', () => res.destroy());
    res.on('close', () => stream.destroy());
    stream.pipe(res);
  }

  const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Security-Policy', csp);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    try {
      const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (path.includes('\0') || path.includes('\\')) throw fail(400, 'Đường dẫn không hợp lệ.');
      if (path.startsWith('/api/chat/')) await api(req, res, path);
      else await asset(req, res, path);
    } catch (error) {
      if (res.headersSent || res.destroyed) { res.destroy(); return; }
      const status = error.status || (['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : error instanceof URIError ? 400 : 500);
      json(res, status, { error: error.status ? error.message : status === 404 ? 'Không tìm thấy tài nguyên.' : 'Không thể xử lý yêu cầu.' });
    }
  });
  const heartbeat = setInterval(() => {
    const now = clock();
    for (const [res, session] of peers) {
      if (session.expires <= now) res.end();
      else res.write(': heartbeat\n\n');
    }
    for (const [token, session] of sessions) if (session.expires <= now) sessions.delete(token);
    for (const [ip, limit] of joins) if (now - limit.since >= 60000) joins.delete(ip);
  }, 15000);
  heartbeat.unref();
  server.on('close', () => clearInterval(heartbeat));
  return server;
}
module.exports = { createDemoServer };
