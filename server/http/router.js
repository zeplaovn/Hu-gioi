/* Định tuyến: /api/* do dịch vụ xử lý, còn lại là file tĩnh. */
'use strict';
const { serveStatic } = require('./static.js');
const { AuthService } = require('../services/auth-service.js');

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

function createRouter(routes = null, auth = new AuthService()) {
  const handlers = routes || {
    'GET /api/health': () => ({ ok: true, service: 'hu-gioi', gameplay: false, auth: true }),
    'GET /api/auth/session': req => ({ account: auth.session(req) }),
    'POST /api/auth/signup': async (req, res) => ({ account: await auth.signup(req, res) }),
    'POST /api/auth/login': async (req, res) => ({ account: await auth.login(req, res) }),
    'POST /api/auth/logout': (req, res) => auth.logout(req, res)
  };
  return (req, res) => {
    const pathname = (req.url || '/').split('?')[0];
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
