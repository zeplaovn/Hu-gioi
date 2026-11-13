/* Định tuyến: /api/* do dịch vụ xử lý, còn lại là file tĩnh. */
'use strict';
const { serveStatic } = require('./static.js');

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

/* CHỈ DÙNG CHO CI/test (Playwright, kiểm thử tĩnh). Production chạy Cloudflare static + Supabase Edge. */
function createRouter(gameApi = null) {
  return (req, res) => {
    const pathname = (req.url || '/').split('?')[0];
    if (pathname === '/api/health' && req.method === 'GET')
      return json(res, 200, { ok: true, service: 'hu-gioi', gameplay: !!gameApi });
    if (gameApi && pathname.startsWith('/api/v1/')) {
      gameApi.handle(req, res, pathname).catch(() => { if (!res.writableEnded) json(res, 500, { error: 'Máy chủ đang gặp lỗi.' }); });
      return;
    }
    if (pathname.startsWith('/api/')) return json(res, 404, { error: 'Chưa có API này.' });
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'Phương thức không được hỗ trợ.' });
    return serveStatic(req, res);
  };
}
module.exports = { createRouter, json };
