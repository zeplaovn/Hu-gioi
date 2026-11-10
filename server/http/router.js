/* Định tuyến: /api/* do dịch vụ xử lý, còn lại là file tĩnh. */
'use strict';
const { serveStatic } = require('./static.js');
const { GameError, toEnvelope } = require('../errors.js');
const crypto = require('node:crypto');

const json = (res, status, body) => {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer'
  });
  res.end(data);
};

function createRouter(routes = null, auth = null, gameApi = null, loginGateway = null) {
  // Tài khoản trình duyệt sử dụng Supabase. Chỉ bật legacy auth khi test
  // hoặc chủ động truyền dịch vụ vào router; không phơi API demo trên production.
  const handlers = routes || {
    'GET /api/health': () => ({ ok: true, service: 'hu-gioi', gameplay: !!gameApi, auth: !!auth, supabaseClient: true }),
    ...(auth ? {
      'GET /api/auth/session': req => ({ account: auth.session(req) }),
      'POST /api/auth/signup': async (req, res) => ({ account: await auth.signup(req, res) }),
      'POST /api/auth/login': async (req, res) => ({ account: await auth.login(req, res) }),
      'POST /api/auth/logout': (req, res) => auth.logout(req, res)
    } : {})
  };
  return (req, res) => {
    const pathname = (req.url || '/').split('?')[0];
    if (pathname === '/api/auth/supabase-login' && loginGateway) {
      loginGateway.handle(req, res).catch(() => { if (!res.writableEnded) json(res, 503, { error: 'Dịch vụ xác thực đang gặp sự cố.' }); });
      return;
    }
    if (!gameApi && pathname.startsWith('/api/v1/')) {
      const requestId = crypto.randomUUID();
      const out = toEnvelope(new GameError('MAINTENANCE', 'Gameplay chưa sẵn sàng vì máy chủ chưa được cấu hình.'), requestId);
      res.setHeader('X-Request-Id', requestId);
      return json(res, out.status, out.body);
    }
    if (gameApi && pathname.startsWith('/api/v1/')) {
      gameApi.handle(req, res, pathname).catch(() => {
        if (!res.writableEnded) {
          const requestId = crypto.randomUUID();
          const out = toEnvelope(new GameError('INTERNAL', 'Máy chủ đang gặp lỗi.'), requestId);
          res.setHeader('X-Request-Id', requestId);
          json(res, out.status, out.body);
        }
      });
      return;
    }
    const handler = handlers[`${req.method} ${pathname}`];
    if (handler) {
      Promise.resolve().then(() => handler(req, res)).then(value => {
        if (!res.writableEnded) json(res, pathname === '/api/auth/signup' ? 201 : 200, value);
      }).catch(err => {
        if (!res.writableEnded) json(res, err.status || 500, { error: err.status ? err.message : 'Máy chủ đang gặp lỗi.' });
      });
      return;
    }
    if (pathname.startsWith('/api/')) return json(res, 404, { error: 'Chưa có API này.' });
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'Phương thức không được hỗ trợ.' });
    return serveStatic(req, res);
  };
}
module.exports = { createRouter, json };
