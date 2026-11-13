/* Chỉ dành cho Playwright CI: API gameplay thực với principal thử nghiệm,
   không dùng Supabase production. Kho dữ liệu in-memory; không phải runtime production. */
'use strict';
const http = require('node:http');
const { createRouter } = require('./ci-server/router.js');
const { createGameApi } = require('./ci-server/game-api.js');
const { PlayerService } = require('../server/services/player-service.js');
const { MemoryPlayers } = require('../tests/helpers/memory-players.js');
const { computeContentVersion } = require('../server/content-version.js');

const repo = new MemoryPlayers();
const service = new PlayerService({ repository: repo, contentVersion: computeContentVersion() });
const api = createGameApi({
  service,
  resolvePrincipal: async req => {
    const match = /^Bearer (ci-access-token-[A-Za-z0-9_-]{4,100})$/.exec(String(req.headers.authorization || ''));
    return match ? { accountId: match[1], via: 'test' } : null;
  },
  log: error => console.error('[CI API]', error)
});
const server = http.createServer(createRouter(api));
const port = Number(process.env.PORT || 8001);
server.listen(port, '127.0.0.1', () => console.log('CI-only online game server at http://127.0.0.1:' + port));
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () => server.close(async () => { await repo.close(); process.exit(0); }));
