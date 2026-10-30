/* Ghép ứng dụng: tạo mọi thành phần từ cấu hình và trả handler HTTP + worker. Tiêm engine/protocol/repository để test.
   Tách khỏi main.js để test dựng được app mà không mở cổng cố định. */
'use strict';
const { loadConfig } = require('./config.js');
const { createLogger } = require('./lib/logger.js');
const { TokenBucketLimiter } = require('./http/rate-limit.js');
const { SessionStore } = require('./auth/sessions.js');
const { AccountStore } = require('./auth/accounts.js');
const { MemoryPlayerRepository } = require('./repositories/memory-player-repository.js');
const { PlayerService } = require('./services/player-service.js');
const { OutboxWorker } = require('./workers/outbox-worker.js');
const { createRouter } = require('./http/router.js');
const { ROUTES } = require('./api/routes.js');

function createApp(overrides = {}) {
  const config = overrides.config || loadConfig();
  const now = overrides.clock || Date.now;
  const logger = overrides.logger || createLogger({ level: config.logLevel });
  const engine = overrides.engine || require('../engine/game.js');
  const protocol = overrides.protocol || require('../engine/protocol/commands.js');
  const repository = overrides.repository || new MemoryPlayerRepository({ now });

  const sessions = new SessionStore({ ...config.session, secureCookies: config.secureCookies, now });
  const accounts = overrides.accounts || new AccountStore();
  const players = new PlayerService({
    repository, engine, protocol, clock: now, rng: overrides.rng,
    receiptTtlMs: config.receiptTtlHours * 3600 * 1000, offlineThresholdMs: config.offlineThresholdMs
  });
  const limiters = Object.fromEntries(Object.entries(config.rateLimit).map(([name, v]) => [name, new TokenBucketLimiter({ ...v, now })]));
  const outbox = new OutboxWorker({ repository, handlers: overrides.outboxHandlers || {}, logger });
  const deps = { engine, accounts, sessions, players, repository };
  const handler = createRouter({ routes: ROUTES, deps, config, limiters, logger });
  return { config, handler, outbox, deps, limiters };
}

module.exports = { createApp };
