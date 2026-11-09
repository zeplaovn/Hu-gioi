/* Chỉ dành cho Playwright CI: API gameplay thực với principal thử nghiệm,
   không dùng Supabase production. Không bao giờ import trong server/main.js. */
'use strict';
const http = require('node:http');
const { createRouter } = require('../server/http/router.js');
const { createGameApi } = require('../server/http/game-api.js');
const { PlayerService } = require('../server/services/player-service.js');
const { SqlitePlayers } = require('../server/repositories/sqlite-players.js');
const { computeContentVersion } = require('../server/content-version.js');

const repo = new SqlitePlayers(':memory:');
const service = new PlayerService({ repository: repo, contentVersion: computeContentVersion() });
const api = createGameApi({
  service,
  resolvePrincipal: async req => req.headers.authorization === 'Bearer ci-access-token'
    ? { accountId: 'ci-browser-user', via: 'test' } : null,
  log: error => console.error('[CI API]', error)
});
const server = http.createServer(createRouter(null, null, api));
const port = Number(process.env.PORT || 8001);
server.listen(port, '127.0.0.1', () => console.log('CI-only online game server at http://127.0.0.1:' + port));
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () => server.close(() => { repo.close(); process.exit(0); }));
