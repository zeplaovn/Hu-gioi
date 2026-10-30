/* Bảng route API. Mỗi handler nhận ctx và trả { status?, body?, headers? }; lỗi ném AppError (server/http/errors.js).
   ctx: { req, body(), account, sessionToken, ip, requestId, deps }.  auth: 'none' | 'session'.  limit: tên xô token bucket ngoài xô IP.
   Thêm endpoint: thêm một mục vào ROUTES, không sửa router. */
'use strict';
const { badRequest, unauthenticated } = require('../http/errors.js');

const ROUTES = {
  'GET /api/health': {
    auth: 'none',
    handler: ({ deps }) => ({ body: { ok: true, service: 'hu-gioi', engineReady: deps.engine.READY, missing: deps.engine.READY ? 0 : deps.engine.MISSING.length } })
  },

  'POST /api/auth/register': {
    auth: 'none', limit: 'auth',
    async handler({ body, deps }) {
      const { username, password } = await body();
      const account = await deps.accounts.register(username, password);
      const token = deps.sessions.create(account.id);
      return { status: 201, body: { account }, headers: { 'Set-Cookie': deps.sessions.serializeCookie(token) } };
    }
  },

  'POST /api/auth/login': {
    auth: 'none', limit: 'auth',
    async handler({ body, deps }) {
      const { username, password } = await body();
      const account = await deps.accounts.authenticate(username, password);
      if (!account) throw unauthenticated('Sai tên đăng nhập hoặc mật khẩu.');
      const token = deps.sessions.create(account.id); // cấp ID mới mỗi lần đăng nhập
      return { body: { account }, headers: { 'Set-Cookie': deps.sessions.serializeCookie(token) } };
    }
  },

  'POST /api/auth/logout': {
    auth: 'session',
    handler: ({ sessionToken, deps }) => {
      deps.sessions.destroy(sessionToken);
      return { status: 204, headers: { 'Set-Cookie': deps.sessions.clearCookie() } };
    }
  },

  'GET /api/me': {
    auth: 'session',
    handler: ({ account }) => ({ body: { account } })
  },

  /* Tạo nhân vật: { requestId, profile }. playerId = account.id (một nhân vật mỗi tài khoản ở bản khung). */
  'POST /api/players': {
    auth: 'session',
    async handler({ account, body, deps }) {
      const result = await deps.players.createPlayer(account.id, await body());
      return { status: result.replayed ? 200 : 201, body: result };
    }
  },

  'POST /api/sync': {
    auth: 'session',
    handler: async ({ account, deps }) => ({ body: await deps.players.sync(account.id) })
  },

  /* Lệnh: { requestId, expectedRevision, type, payload }. Xô token riêng 'command'. */
  'POST /api/commands': {
    auth: 'session', limit: 'command',
    async handler({ account, body, deps }) {
      const envelope = await body();
      if (!Object.keys(envelope).length) throw badRequest('Thiếu nội dung lệnh.');
      return { body: await deps.players.command(account.id, envelope) };
    }
  }
};

module.exports = { ROUTES };
