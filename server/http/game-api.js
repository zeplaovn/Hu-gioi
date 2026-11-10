/* API gameplay /api/v1 (docs/backend-plan.md §6). Một người chơi cho mỗi tài khoản.
     GET  /api/v1/bootstrap
     POST /api/v1/creation/preview
     POST /api/v1/players
     GET  /api/v1/players/{id}/state
     POST /api/v1/players/{id}/sync
     POST /api/v1/players/{id}/commands
     GET  /api/v1/me/export        (quyền truy cập dữ liệu gameplay của chính tài khoản)
     POST /api/v1/me/erase         (quyền xóa dữ liệu gameplay; body { confirm: 'delete-my-game-data' })
     POST /api/v1/me/delete-account (xóa dữ liệu gameplay + tài khoản Supabase; body { confirm: 'delete-my-account' };
                                    cần SUPABASE_SERVICE_ROLE_KEY ở máy chủ, nếu không trả NOT_IMPLEMENTED)
   Ba API /me/* không đòi hỏi bản đồng ý chính sách còn hiệu lực: quyền dữ liệu cá nhân không được phụ thuộc đồng ý.
   Xác thực qua Bearer JWT hoặc cookie (xem server/auth/principal.js). Lỗi theo envelope { error: { code, message, requestId, retryable } }. */
'use strict';
const crypto = require('node:crypto');
const { GameError, toEnvelope } = require('../errors.js');
const { RateLimiter, LIMITS } = require('./rate-limit.js');
const { quotaIpKey } = require('./client-ip.js');

const MAX_BODY = 64 * 1024;
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const PLAYER_ROUTE = new RegExp(`^/api/v1/players/(${UUID})/(state|sync|commands|pause|reset-after-death)$`, 'i');

const DATA_RIGHTS = new Set(['exportData', 'eraseData', 'deleteAccount']);

function createGameApi({ service, accountAdmin = null, clientIp = req => req.socket?.remoteAddress || 'unknown', resolvePrincipal, allowedOrigins = [], limiter = new RateLimiter(), log = () => {} }) {
  const allowed = new Set(allowedOrigins);

  function cors(req, res) {
    const origin = req.headers.origin;
    res.setHeader('Vary', 'Origin');
    if (!origin || !allowed.has(origin)) return;
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type, x-request-id');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Max-Age', '600');
    res.setHeader('Access-Control-Expose-Headers', 'x-request-id, retry-after');
  }

  function send(res, status, body, requestId, extra = {}) {
    const data = JSON.stringify(body);
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(data), 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Request-Id': requestId, ...extra
    });
    res.end(data);
  }

  async function readBody(req) {
    if (req.method !== 'POST') return {};
    const type = String(req.headers['content-type'] || '');
    const declared = Number(req.headers['content-length'] || 0);
    if (declared > MAX_BODY) throw new GameError('PAYLOAD_TOO_LARGE', 'Dữ liệu quá lớn.');
    const chunks = []; let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > MAX_BODY) throw new GameError('PAYLOAD_TOO_LARGE', 'Dữ liệu quá lớn.');
      chunks.push(chunk);
    }
    if (!size) return {};
    if (!type.startsWith('application/json')) throw new GameError('UNSUPPORTED_MEDIA_TYPE', 'Dữ liệu phải là JSON.');
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw new GameError('INVALID_REQUEST', 'JSON không hợp lệ.'); }
  }

  function limit(key, rule) {
    const r = limiter.take(key, rule);
    if (!r.ok) throw Object.assign(new GameError('RATE_LIMITED', 'Thao tác quá nhanh. Hãy thử lại sau.', { retryAfterMs: r.retryAfterMs }), { retryAfterSec: Math.ceil(r.retryAfterMs / 1000) });
  }

  /* Trả true nếu đã xử lý (kể cả lỗi). */
  async function handle(req, res, pathname) {
    const requestId = /^[A-Za-z0-9_-]{8,64}$/.test(String(req.headers['x-request-id'] || '')) ? req.headers['x-request-id'] : crypto.randomUUID();
    cors(req, res);
    try {
      if (req.method === 'OPTIONS') { res.writeHead(204, { 'X-Request-Id': requestId }).end(); return true; }
      const route = matchRoute(req.method, pathname);
      if (!route) throw new GameError('NOT_FOUND', 'Chưa có API này.');
      // IP quota dành cho request chưa xác thực / JWT sai; người chơi đã xác thực
      // chịu quota riêng theo account, không chặn hàng trăm người sau cùng NAT.
      const hasCredential = !!(req.headers.authorization || req.headers.cookie);
      if (!hasCredential) limit('ip:' + quotaIpKey(clientIp(req)), LIMITS.ip);
      let principal;
      try {
        principal = await resolvePrincipal(req, { consent: !DATA_RIGHTS.has(route.name) });
      } catch (error) {
        if (hasCredential && error.code === 'UNAUTHENTICATED') limit('ip:' + quotaIpKey(clientIp(req)), LIMITS.ip);
        throw error;
      }
      if (!principal) {
        if (hasCredential) limit('ip:' + quotaIpKey(clientIp(req)), LIMITS.ip);
        throw new GameError('UNAUTHENTICATED', 'Bạn cần đăng nhập.');
      }
      const who = principal.accountId, body = await readBody(req);
      let out, status = 200;
      switch (route.name) {
        case 'bootstrap': limit('read:' + who, LIMITS.read); out = service.bootstrap(who); break;
        case 'pavilionPurchase': limit('cmd:' + who, LIMITS.command); out = service.pavilionPurchase(who, body); break;
        case 'preview': limit('preview:' + who, LIMITS.preview); out = service.previewCreation(who); status = 201; break;
        case 'create': limit('create:' + who, LIMITS.create); out = service.createPlayer(who, body); status = 201; break;
        case 'state': limit('read:' + who, LIMITS.read); out = service.state(who, route.id); break;
        case 'sync': limit('sync:' + who, LIMITS.sync); out = service.sync(who, route.id, body); break;
        case 'pause': limit('pause:' + who, LIMITS.pause); out = service.pause(who, route.id); break;
        case 'commands': limit('cmd:' + who, LIMITS.command); out = service.command(who, route.id, body); break;
        case 'exportData': limit('export:' + who, LIMITS.export); out = service.exportData(who); break;
        case 'eraseData': limit('erase:' + who, LIMITS.erase); out = service.eraseData(who, body); break;
        case 'deleteAccount': limit('erase:' + who, LIMITS.erase); out = await service.deleteAccount(who, body, accountAdmin); break;
        case 'resetAfterDeath': limit('create:' + who, LIMITS.create); out = service.resetAfterDeath(who, route.id); break;
      }
      send(res, status, out, requestId, route.name === 'exportData' ? { 'Content-Disposition': 'attachment; filename="hu-gioi-du-lieu.json"' } : {});
    } catch (err) {
      const { status, body } = toEnvelope(err, requestId);
      if (body.error.code === 'INTERNAL') log(err);
      send(res, status, body, requestId, err.retryAfterSec ? { 'Retry-After': String(err.retryAfterSec) } : {});
    }
    return true;
  }

  function matchRoute(method, pathname) {
    if (method === 'OPTIONS') return { name: 'options' };
    if (method === 'GET' && pathname === '/api/v1/bootstrap') return { name: 'bootstrap' };
    if (method === 'POST' && pathname === '/api/v1/pavilion/purchase') return { name: 'pavilionPurchase' };
    if (method === 'POST' && pathname === '/api/v1/creation/preview') return { name: 'preview' };
    if (method === 'POST' && pathname === '/api/v1/players') return { name: 'create' };
    if (method === 'GET' && pathname === '/api/v1/me/export') return { name: 'exportData' };
    if (method === 'POST' && pathname === '/api/v1/me/erase') return { name: 'eraseData' };
    if (method === 'POST' && pathname === '/api/v1/me/delete-account') return { name: 'deleteAccount' };
    const m = PLAYER_ROUTE.exec(pathname);
    if (m) {
      const expected = m[2] === 'state' ? 'GET' : 'POST';
      if (method === expected) return { name: m[2] === 'reset-after-death' ? 'resetAfterDeath' : m[2], id: m[1].toLowerCase() };
    }
    return null;
  }

  return { handle };
}
module.exports = { createGameApi };
