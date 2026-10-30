/* Định tuyến + vòng đời yêu cầu: requestId → header bảo mật → xô IP → CSRF → xác thực → xô riêng → handler → lỗi chuẩn.
   /api/* do bảng route xử lý; phần còn lại là file tĩnh (chỉ GET/HEAD). */
'use strict';
const crypto = require('node:crypto');
const { serveStatic } = require('./static.js');
const { readJson } = require('./json.js');
const { AppError, notFound, unauthenticated, forbidden, tooMany, toResponse } = require('./errors.js');

const SECURITY_HEADERS = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store' };
const WRITE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function send(res, status, body, headers = {}) {
  const data = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, { ...SECURITY_HEADERS, ...(data ? { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(data) } : {}), ...headers });
  res.end(data);
}

/* CSRF: yêu cầu ghi có Origin thì phải trùng Host. Kết hợp SameSite=Lax và chỉ nhận application/json. */
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}

function createRouter({ routes, deps, config, limiters, logger }) {
  const clientIp = req => req.socket.remoteAddress || 'unknown'; // sau proxy tin cậy: đọc X-Forwarded-For có kiểm soát (chưa làm)

  return async function handle(req, res) {
    const started = Date.now();
    const requestId = crypto.randomUUID();
    const url = new URL(req.url || '/', 'http://x');
    const pathname = url.pathname;
    res.setHeader('X-Request-Id', requestId);

    if (!pathname.startsWith('/api/')) {
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Phương thức không được hỗ trợ.', requestId } }, { Allow: 'GET, HEAD' });
      return serveStatic(req, res);
    }

    let status = 500;
    try {
      const ip = clientIp(req);
      const ipLimit = limiters.ip.take(ip);
      if (!ipLimit.ok) throw tooMany(ipLimit.retryAfterSeconds);

      const route = routes[`${req.method} ${pathname}`];
      if (!route) {
        if (Object.keys(routes).some(k => k.endsWith(' ' + pathname))) throw new AppError(405, 'METHOD_NOT_ALLOWED', 'Phương thức không được hỗ trợ.');
        throw notFound('Chưa có API này.');
      }
      if (WRITE.has(req.method) && !sameOrigin(req)) throw forbidden('CROSS_ORIGIN', 'Yêu cầu từ nguồn không được phép.');

      const ctx = { req, ip, requestId, deps, account: null, sessionToken: null, body: () => readJson(req, config.maxBodyBytes) };
      if (route.auth === 'session') {
        const token = deps.sessions.parseCookie(req.headers.cookie);
        const session = deps.sessions.resolve(token);
        const account = session && deps.accounts.get(session.accountId);
        if (!account) throw unauthenticated();
        ctx.account = account; ctx.sessionToken = token;
      }
      if (route.limit) {
        const key = route.limit === 'auth' ? ip : ctx.account?.id ?? ip;
        const result = limiters[route.limit].take(key);
        if (!result.ok) throw tooMany(result.retryAfterSeconds);
      }

      const out = (await route.handler(ctx)) || {};
      status = out.status ?? 200;
      send(res, status, out.body, out.headers);
    } catch (error) {
      const r = toResponse(error, requestId);
      status = r.status;
      if (status >= 500) logger.error('yêu cầu lỗi', { requestId, path: pathname, error: error?.message, stack: error?.stack });
      send(res, status, r.body, r.headers);
    } finally {
      logger.info('http', { requestId, method: req.method, path: pathname, status, ms: Date.now() - started });
    }
  };
}

module.exports = { createRouter, send };
