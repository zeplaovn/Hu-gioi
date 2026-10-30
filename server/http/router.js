/* Định tuyến: /api/* do dịch vụ xử lý, còn lại là file tĩnh. Thêm route mới vào bảng ROUTES. */
'use strict';
const { serveStatic } = require('./static.js');

const json = (res, status, body) => {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(data), 'Cache-Control': 'no-store' });
  res.end(data);
};

/* "METHOD /đường-dẫn" → handler(req, res). Gameplay (PlayerService) và chat sẽ được nối tại đây. */
const ROUTES = {
  'GET /api/health': (req, res) => json(res, 200, { ok: true, service: 'hu-gioi', gameplay: false })
};

function createRouter(routes = ROUTES) {
  return (req, res) => {
    const pathname = (req.url || '/').split('?')[0];
    const handler = routes[`${req.method} ${pathname}`];
    if (handler) return handler(req, res);
    if (pathname.startsWith('/api/')) return json(res, 404, { error: 'Chưa có API này.' });
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'Phương thức không được hỗ trợ.' });
    return serveStatic(req, res);
  };
}
module.exports = { createRouter, json };
