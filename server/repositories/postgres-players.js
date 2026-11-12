/* PostgresPlayers — kho dữ liệu riêng schema game, server-authoritative.
   Deno Postgres PoolClient.queryObject({ text, args }), không ORM, không HTTP.
   Mọi request ghi khóa một hàng game.players FOR UPDATE. Cổng Node dùng SQLite adapter.
   Không bao giờ gửi SQL/state/seed vào log. */
'use strict';
const { GameError, mapPostgresError } = require('../errors.js');
const { PlayerRepository } = require('./player-repository.js');
const GAME = require('../../engine/game.js');
const { encodePavilionReceipt, decodePavilionReceipt } = require('./pavilion-receipt.js');

const DAY = 86400000;
const emptyPavilion = () => ({ version: 0, balance: 0, totalEarned: 0, rebirths: 0, upgrades: {}, relics: {} });
const nameKey = n => String(n).normalize('NFC').toLocaleLowerCase('vi');
const json = x => typeof x === 'string' ? JSON.parse(x) : x;
const num = x => typeof x === 'bigint' ? Number(x) : Number(x);
const big = x => String(x);
const toInt = x => {
  const n = num(x);
  if (!Number.isSafeInteger(n)) throw new GameError('STATE_CORRUPT', 'Dữ liệu tài khoản không hợp lệ.');
  return n;
};
const unique = err => err?.code === '23505' || err?.cause?.code === '23505';
const bytes = s => new TextEncoder().encode(s).byteLength;
/* Tính chiến lực bằng engine server, không dựa vào client hay SQL gần đúng. */
const combatPower = state => {
  const value = new GAME.Game(state).stats().CP;
  if (!Number.isFinite(value) || value < 0)
    throw new GameError('STATE_CORRUPT', 'Chiến lực nhân vật không hợp lệ.');
  return Math.min(Number.MAX_SAFE_INTEGER, Math.round(value));
};

function hydrate(r) {
  if (!r) return null;
  return {
    id: r.id, ownerId: r.owner_id, name: r.name, state: json(r.state),
    revision: toInt(r.revision), schemaVersion: num(r.schema_version),
    contentVersion: r.content_version, rngSeed: r.rng_seed,
    rngCounter: toInt(r.rng_counter), lastSeenAt: toInt(r.last_seen_at),
    createdAt: toInt(r.created_at), updatedAt: toInt(r.updated_at),
    rateTokens: json(r.rate_tokens) || {}, tokensAt: toInt(r.tokens_at)
  };
}
const pavilion = r => r ? ({
  version: toInt(r.version), balance: toInt(r.balance), totalEarned: toInt(r.total_earned),
  rebirths: toInt(r.rebirths), upgrades: json(r.upgrades) || {}, relics: json(r.relics) || {}
}) : emptyPavilion();

async function rows(client, sql, args = []) {
  return (await client.queryObject({ text: sql, args })).rows;
}
async function one(client, sql, args = []) {
  return (await rows(client, sql, args))[0] || null;
}
async function exec(client, sql, args = []) {
  return client.queryObject({ text: sql, args });
}
function applyRate(row, rate, now) {
  if (!rate) return null;
  const { key, capacity, perMinute } = rate;
  if (typeof key !== 'string' || !(capacity > 0) || !(perMinute > 0))
    throw new Error('Cấu hình rate limit không hợp lệ.');
  const prior = row.rateTokens[key] || { tokens: capacity, at: now };
  const elapsed = Math.max(0, now - (Number.isFinite(Number(prior.at)) ? Number(prior.at) : now));
  const current = Math.min(capacity, Math.max(0, Number(prior.tokens) || 0) + elapsed * perMinute / 60000);
  if (current < 1) {
    const retryAfterMs = Math.ceil((1 - current) * 60000 / perMinute);
    throw new GameError('RATE_LIMITED', 'Thao tác quá nhanh. Hãy thử lại sau.', { retryAfterMs });
  }
  return { ...row.rateTokens, [key]: { tokens: current - 1, at: now } };
}

class PostgresPlayers extends PlayerRepository {
  constructor({ pool, statementTimeoutMs = 1500, lockTimeoutMs = 900, clock = Date.now } = {}) {
    super();
    if (!pool || typeof pool.connect !== 'function') throw Error('PostgresPlayers cần pool.connect().');
    this.pool = pool;
    this.statementTimeoutMs = statementTimeoutMs;
    this.lockTimeoutMs = lockTimeoutMs;
    this.clock = clock;
    this.cleanedAt = new Map();
    this.cleanupRetryAfter = new Map();
  }

  async connection(work) {
    let client;
    try {
      client = await this.pool.connect();
      return await work(client);
    } catch (err) {
      // Bao gồm cả lỗi connect và query/transaction; rollback chạy trước khi map.
      throw mapPostgresError(err);
    } finally {
      if (client) client.release();
    }
  }
  async transaction(work) {
    return this.connection(async client => {
      await exec(client, 'BEGIN');
      try {
        // Một round-trip thay vì hai: mỗi transaction gameplay chạy qua pooler từ Edge,
        // nên mỗi câu lệnh bớt đi là bớt một lượt mạng. Vẫn là set_config(..., true) = cục bộ giao dịch.
        await exec(client,
          "SELECT set_config('statement_timeout', $1, true) AS statement_timeout, set_config('lock_timeout', $2, true) AS lock_timeout",
          [String(this.statementTimeoutMs) + 'ms', String(this.lockTimeoutMs) + 'ms']);
        const result = await work(client);
        await exec(client, 'COMMIT');
        return result;
      } catch (err) {
        try { await exec(client, 'ROLLBACK'); } catch { /* không che lỗi đầu tiên */ }
        throw err;
      }
    });
  }
  async ownerLock(c, ownerId) {
    // Ngăn hai request tạo ticket/nhân vật cho cùng tài khoản cùng lúc.
    await exec(c, 'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [ownerId]);
  }
  async sweep(c, ownerId, now, playerId = null) {
    // Best-effort, giao dịch con an toàn: lỗi DELETE không được làm hỏng
    // transaction gameplay. Không chạy vòng lặp vượt statement_timeout.
    const last = this.cleanedAt.get(ownerId) || 0;
    if (now - last < 10 * 60000 || now < (this.cleanupRetryAfter.get(ownerId) || 0)) return;
    await exec(c, 'SAVEPOINT hu_cleanup');
    try {
      if (playerId) await exec(c,
        'DELETE FROM game.player_receipts WHERE player_id = $1 AND expires_at <= $2',
        [playerId, big(now)]);
      await exec(c,
        'DELETE FROM game.creation_tickets WHERE owner_id = $1 AND expires_at <= $2',
        [ownerId, big(now - 7 * DAY)]);
    } catch {
      // PostgreSQL hủy transaction khi statement lỗi: bắt buộc ROLLBACK TO
      // trước khi chạy tiếp. Lỗi rollback/release phải nổi để không COMMIT lỗi.
      await exec(c, 'ROLLBACK TO SAVEPOINT hu_cleanup');
      // Không để mỗi request gameplay trả giá cho DELETE chậm/lỗi.
      this.cleanupRetryAfter.set(ownerId, now + 60000);
      if (this.cleanupRetryAfter.size > 1024)
        this.cleanupRetryAfter.delete(this.cleanupRetryAfter.keys().next().value);
      return; // chỉ thử lại sau cooldown 60 giây
    } finally {
      await exec(c, 'RELEASE SAVEPOINT hu_cleanup');
    }
    this.cleanupRetryAfter.delete(ownerId);
    this.cleanedAt.set(ownerId, now);
    if (this.cleanedAt.size > 1024) this.cleanedAt.delete(this.cleanedAt.keys().next().value);
  }

  async getByOwner(ownerId) {
    return this.connection(async c => hydrate(await one(c, 'SELECT * FROM game.players WHERE owner_id = $1', [ownerId])));
  }
  async get(playerId) {
    return this.connection(async c => hydrate(await one(c, 'SELECT * FROM game.players WHERE id = $1', [playerId])));
  }
  async getPavilion(ownerId) {
    return this.connection(async c => pavilion(await one(c, 'SELECT * FROM game.pavilion_accounts WHERE owner_id = $1', [ownerId])));
  }
  async issueTicket(ownerId, preview, { now, ttlMs, dailyLimit }) {
    return this.transaction(async c => {
      await this.ownerLock(c, ownerId);
      const existing = await one(c,
        'SELECT count(*)::bigint AS n, min(created_at) AS oldest FROM game.creation_tickets WHERE owner_id = $1 AND created_at > $2',
        [ownerId, big(now - DAY)]);
      const n = toInt(existing.n);
      if (n >= dailyLimit) return { limited: true, retryAfterMs: Math.max(1000, toInt(existing.oldest) + DAY - now) };
      const id = crypto.randomUUID();
      await exec(c, `INSERT INTO game.creation_tickets (id, owner_id, preview, created_at, expires_at)
        VALUES ($1, $2, $3::jsonb, $4, $5)`, [id, ownerId, JSON.stringify(preview), big(now), big(now + ttlMs)]);
      await this.sweep(c, ownerId, now);
      return { id, preview, expiresAt: now + ttlMs, rollsLeft: dailyLimit - n - 1 };
    });
  }
  async createWithTicket({ ownerId, ticketId, now, build }) {
    return this.transaction(async c => {
      await this.ownerLock(c, ownerId);
      const ticket = await one(c, 'SELECT * FROM game.creation_tickets WHERE id = $1 FOR UPDATE', [ticketId]);
      if (!ticket || ticket.owner_id !== ownerId || ticket.used_at !== null)
        throw new GameError('TICKET_INVALID', 'Phiếu khởi nguyên không hợp lệ hoặc đã dùng.');
      if (toInt(ticket.expires_at) <= now)
        throw new GameError('TICKET_EXPIRED', 'Phiếu khởi nguyên đã hết hạn. Hãy gieo lại.');
      if (await one(c, 'SELECT id FROM game.players WHERE owner_id = $1', [ownerId]))
        throw new GameError('PLAYER_EXISTS', 'Tài khoản đã có đạo thân.');
      await exec(c, 'INSERT INTO game.pavilion_accounts (owner_id) VALUES ($1) ON CONFLICT DO NOTHING', [ownerId]);
      const account = pavilion(await one(c, 'SELECT * FROM game.pavilion_accounts WHERE owner_id = $1 FOR UPDATE', [ownerId]));
      const consumed = { ...account.relics }; // Hàng Khởi Nguyên đã mua, chỉ phát một lần.
      const rec = await build(json(ticket.preview), { ...account, consumed });
      const serialized = JSON.stringify(rec.state);
      if (bytes(serialized) > 65536) throw new GameError('STATE_CORRUPT', 'Trạng thái nhân vật vượt giới hạn.');
      const id = crypto.randomUUID();
      try {
        await exec(c, `INSERT INTO game.players
          (id, owner_id, name, name_key, revision, schema_version, content_version, state,
           rng_seed, rng_counter, last_seen_at, created_at, updated_at, combat_power)
          VALUES ($1,$2,$3,$4,0,$5,$6,$7::jsonb,$8,$9,$10,$10,$10,$11)`, [
          id, ownerId, rec.name, nameKey(rec.name), rec.schemaVersion, rec.contentVersion,
          serialized, rec.rngSeed, big(rec.rngCounter), big(now), big(combatPower(rec.state))
        ]);
      } catch (err) {
        if (unique(err)) {
          if (String(err.constraint || '').includes('owner_id')) throw new GameError('PLAYER_EXISTS', 'Tài khoản đã có đạo thân.');
          throw new GameError('NAME_TAKEN', 'Đạo hiệu này đã có người dùng.');
        }
        throw err;
      }
      await exec(c, 'UPDATE game.creation_tickets SET used_at = $1 WHERE id = $2', [big(now), ticketId]);
      if (Object.keys(consumed).length)
        await exec(c, "UPDATE game.pavilion_accounts SET relics = '{}'::jsonb, version = version + 1 WHERE owner_id = $1 AND version = $2", [ownerId, big(account.version)]);
      await this.sweep(c, ownerId, now, id);
      return hydrate(await one(c, 'SELECT * FROM game.players WHERE id = $1', [id]));
    });
  }
  async transact(playerId, fn, options = {}) {
    const outcome = await this.transaction(async c => {
      const rec = hydrate(await one(c, 'SELECT * FROM game.players WHERE id = $1 FOR UPDATE', [playerId]));
      if (options.rate && rec && options.rate.ownerId !== rec.ownerId)
        throw new GameError('PLAYER_NOT_FOUND', 'Không tìm thấy đạo thân.');
      const rateTokens = rec ? applyRate(rec, options.rate, options.rate?.now ?? this.clock()) : null;
      const tx = {
        record: rec,
        receipt: async (requestId, now) => {
          const r = await one(c,
            `SELECT fingerprint, revision, response FROM game.player_receipts
             WHERE player_id = $1 AND request_id = $2 AND expires_at > $3`, [playerId, requestId, big(now)]);
          return r ? { requestId, fingerprint: r.fingerprint, revision: toInt(r.revision), response: json(r.response) } : null;
        }
      };
      let out;
      try {
        out = await fn(tx) || {};
      } catch (err) {
        // Recognized game rejections leave the SQL transaction valid. Commit
        // their already-debited quota without writing state or a receipt.
        // Unknown/SQL errors still roll back the entire transaction.
        if (!rateTokens || !(err instanceof GameError) ||
          !['REVISION_CONFLICT', 'REQUEST_ID_REUSED', 'PLAYER_DEAD'].includes(err.code)) throw err;
        await exec(c, 'UPDATE game.players SET rate_tokens = $1::jsonb, tokens_at = $2 WHERE id = $3', [
          JSON.stringify(rateTokens), big(options.rate.now), playerId
        ]);
        return { rejected: err };
      }
      if (out.save) {
        const s = out.save, state = JSON.stringify(s.state);
        if (bytes(state) > 65536) throw new GameError('STATE_CORRUPT', 'Trạng thái nhân vật vượt giới hạn.');
        const changed = await rows(c, `UPDATE game.players SET
          state = $1::jsonb, revision = $2, rng_counter = $3, last_seen_at = $4,
          schema_version = $5, content_version = $6, updated_at = $7,
          rate_tokens = $8::jsonb, tokens_at = $7, combat_power = $11
          WHERE id = $9 AND revision = $10 RETURNING id`, [
          state, big(s.revision), big(s.rngCounter), big(s.lastSeenAt), s.schemaVersion,
          s.contentVersion, big(s.lastSeenAt), JSON.stringify(rateTokens || rec.rateTokens),
          playerId, big(rec.revision), big(combatPower(s.state))
        ]);
        if (changed.length !== 1) throw new GameError('REVISION_CONFLICT', 'Tiến trình đã thay đổi. Hãy đồng bộ lại.');
        if (new GAME.Game(s.state).isDead()) {
          // Nhân vật đã tọa hóa lập tức rời bảng xếp hạng; không chờ bấm bắt đầu lại.
          await exec(c, 'DELETE FROM game.player_leaderboard WHERE player_id = $1', [playerId]);
        }
      } else if (out.touch || rateTokens) {
        await exec(c, `UPDATE game.players SET rng_counter = $1, last_seen_at = $2,
          rate_tokens = $3::jsonb, tokens_at = $4 WHERE id = $5`, [
          big(out.touch?.rngCounter ?? rec.rngCounter), big(out.touch?.lastSeenAt ?? rec.lastSeenAt),
          JSON.stringify(rateTokens || rec.rateTokens), big(options.rate?.now ?? this.clock()), playerId
        ]);
      }
      if (out.pavilionAward) {
        await exec(c, 'INSERT INTO game.pavilion_accounts (owner_id) VALUES ($1) ON CONFLICT DO NOTHING', [rec.ownerId]);
        await exec(c, `UPDATE game.pavilion_accounts SET
          balance = balance + $1, total_earned = total_earned + $1, version = version + 1
          WHERE owner_id = $2`, [big(out.pavilionAward), rec.ownerId]);
      }
      if (out.receipt) {
        const r = out.receipt;
        await exec(c, `INSERT INTO game.player_receipts
          (player_id, request_id, fingerprint, revision, response, created_at, expires_at)
          VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7)`, [
          playerId, r.requestId, r.fingerprint, big(r.revision),
          JSON.stringify(r.response), big(out.save?.lastSeenAt ?? this.clock()), big(r.expiresAt)
        ]);
      }
      if (rec) await this.sweep(c, rec.ownerId, options.rate?.now ?? this.clock(), playerId);
      return { value: out.value };
    });
    if (outcome.rejected) throw outcome.rejected;
    return outcome.value;
  }
  async purchasePavilion(ownerId, { requestId, expectedVersion, kind, key, now, catalog }) {
    return this.transaction(async c => {
      await this.ownerLock(c, ownerId);
      const player = await one(c, 'SELECT * FROM game.players WHERE owner_id = $1 FOR UPDATE', [ownerId]);
      // Tặng ngân sách thử nghiệm một lần khi đổi món Khởi Nguyên đầu tiên.
      // Chỉ INSERT khi chưa có đạo thân, không cấp lại bằng request trùng.
      if (kind === 'starter' && !player)
        await exec(c, 'INSERT INTO game.pavilion_accounts (owner_id, balance, total_earned) VALUES ($1,$2,$2) ON CONFLICT DO NOTHING', [ownerId, big(catalog.starterGrant)]);
      else
        await exec(c, 'INSERT INTO game.pavilion_accounts (owner_id) VALUES ($1) ON CONFLICT DO NOTHING', [ownerId]);
      const row = await one(c, 'SELECT * FROM game.pavilion_accounts WHERE owner_id = $1 FOR UPDATE', [ownerId]);
      const account = pavilion(row);
      const prior = await one(c, 'SELECT fingerprint FROM game.pavilion_receipts WHERE owner_id = $1 AND request_id = $2', [ownerId, requestId]);
      if (prior) {
        const cost = decodePavilionReceipt(prior.fingerprint, kind, key);
        return { replayed: true, cost, pavilion: account, record: hydrate(player) };
      }
      if (kind === 'starter' && player)
        throw new GameError('GAME_RULE_VIOLATION', 'Hàng Khởi Nguyên chỉ đổi trước khi tạo đạo thân.');
      if (account.version !== expectedVersion)
        throw new GameError('PAVILION_CONFLICT', 'Thiên Mệnh Các đã thay đổi. Xin đồng bộ lại.', { currentVersion: account.version });
      const upgrades = { ...account.upgrades }, relics = { ...account.relics };
      let cost;
      if (kind === 'upgrade' && Object.hasOwn(catalog.stats, key)) {
        const current = upgrades[key] || 0;
        cost = catalog.upgradeCost(current);
        if (cost === null) throw new GameError('GAME_RULE_VIOLATION', 'Thuộc tính Thiên Mệnh đã viên mãn cấp 20.');
        upgrades[key] = current + 1;
      } else if (kind === 'starter' && Object.hasOwn(catalog.starter, key)) {
        const product = catalog.starter[key], held = relics[key] || 0;
        if (!Number.isInteger(held) || held < 0 || held >= product.max)
          throw new GameError('GAME_RULE_VIOLATION', 'Hàng Khởi Nguyên đã đạt giới hạn.');
        cost = product.cost;
        relics[key] = held + 1;
      } else throw new GameError('INVALID_REQUEST', 'Loại giao dịch Thiên Mệnh Các không hợp lệ.');
      if (account.balance < cost) throw new GameError('INSUFFICIENT_TINH', 'Không đủ Thiên Tinh để đổi.');
      await exec(c, `UPDATE game.pavilion_accounts SET
        balance = $1, upgrades = $2::jsonb, relics = $3::jsonb, version = version + 1
        WHERE owner_id = $4 AND version = $5`, [
        big(account.balance - cost), JSON.stringify(upgrades), JSON.stringify(relics), ownerId, big(account.version)
      ]);
      let updatedPlayer = player;
      if (player && kind === 'upgrade') {
        const state = json(player.state);
        state.pavilion = { ...upgrades };
        const serialized = JSON.stringify(state);
        if (bytes(serialized) > 65536) throw new GameError('STATE_CORRUPT', 'Trạng thái nhân vật vượt giới hạn.');
        updatedPlayer = await one(c, `UPDATE game.players SET
          state = $1::jsonb, revision = revision + 1, updated_at = $2, combat_power = $4
          WHERE owner_id = $3 RETURNING *`, [serialized, big(now), ownerId, big(combatPower(state))]);
      }
      await exec(c, `INSERT INTO game.pavilion_receipts
        (owner_id, request_id, fingerprint, created_at) VALUES ($1,$2,$3,$4)`,
      [ownerId, requestId, encodePavilionReceipt(kind, key, cost), big(now)]);
      await this.sweep(c, ownerId, now, updatedPlayer?.id);
      return { replayed: false, cost, pavilion: { ...account, balance: account.balance - cost,
        version: account.version + 1, upgrades, relics }, record: hydrate(updatedPlayer) };
    });
  }
  /* Tử vong: xóa sạch tiến trình và Thiên Tinh nhưng giữ auth.users cùng phiếu
   * khởi nguyên cũ để hạn mức gieo lại không thể bị reset bằng chết liên tục.
   * Kiểm tra sống/chết trong transaction đã khóa hàng, không tin browser. */
  async deletePlayer(ownerId, playerId) {
    return this.transaction(async c => {
      await this.ownerLock(c, ownerId);
      const player = await one(c, 'SELECT id, state FROM game.players WHERE id = $1 AND owner_id = $2 FOR UPDATE', [playerId, ownerId]);
      if (!player) throw new GameError('PLAYER_NOT_FOUND','Không tìm thấy đạo thân.');
      if (!new GAME.Game(json(player.state)).isDead())
        throw new GameError('GAME_RULE_VIOLATION','Đạo thân chưa tọa hóa.');
      // Bản ghi xếp hạng tự xóa bằng FK CASCADE, không cộng chỉ số chuyển kiếp.
      await exec(c, 'DELETE FROM game.world_chat_messages WHERE owner_id = $1', [ownerId]);
      await exec(c, 'DELETE FROM game.world_chat_presence WHERE owner_id = $1', [ownerId]);
      await exec(c, 'DELETE FROM game.players WHERE id = $1 AND owner_id = $2', [playerId, ownerId]);
      await exec(c, 'DELETE FROM game.pavilion_accounts WHERE owner_id = $1', [ownerId]);
      return { deleted: true };
    });
  }
  async exportOwnerData(ownerId) {
    return this.connection(async c => {
      const player = await one(c, 'SELECT * FROM game.players WHERE owner_id = $1', [ownerId]);
      const ticketRow = await one(c, 'SELECT count(*)::bigint AS n FROM game.creation_tickets WHERE owner_id = $1', [ownerId]);
      const account = pavilion(await one(c, 'SELECT * FROM game.pavilion_accounts WHERE owner_id = $1', [ownerId]));
      const tickets = toInt(ticketRow.n);
      const chatRows = await rows(c, `SELECT id, sender_name, body, created_at
        FROM game.world_chat_messages WHERE owner_id = $1 ORDER BY id ASC`, [ownerId]);
      if (!player && !tickets && account.totalEarned === 0 && account.rebirths === 0 && !chatRows.length) return null;
      return { chatMessages: chatRows.map(r => ({
        id: String(r.id), name: String(r.sender_name), text: String(r.body), at: toInt(r.created_at)
      })), player: player ? {
        id: player.id, name: player.name, revision: toInt(player.revision), schemaVersion: player.schema_version,
        state: json(player.state), lastSeenAt: toInt(player.last_seen_at),
        createdAt: toInt(player.created_at), updatedAt: toInt(player.updated_at)
      } : null, tickets, pavilion: account };
    });
  }
  async deleteOwnerData(ownerId) {
    return this.transaction(async c => {
      await this.ownerLock(c, ownerId);
      const player = await one(c, 'SELECT id FROM game.players WHERE owner_id = $1 FOR UPDATE', [ownerId]);
      const receipts = player ? toInt((await one(c,
        'SELECT count(*)::bigint AS n FROM game.player_receipts WHERE player_id = $1', [player.id])).n) : 0;
      // Erasure phải xóa cả tin nhắn/presence; đây là dữ liệu mới ngoài gameplay state.
      const deletedChat = await rows(c, 'DELETE FROM game.world_chat_messages WHERE owner_id = $1 RETURNING id', [ownerId]);
      await exec(c, 'DELETE FROM game.world_chat_presence WHERE owner_id = $1', [ownerId]);
      const deletedPlayer = await rows(c, 'DELETE FROM game.players WHERE owner_id = $1 RETURNING id', [ownerId]);
      const deletedTickets = await rows(c, 'DELETE FROM game.creation_tickets WHERE owner_id = $1 RETURNING id', [ownerId]);
      const deletedPavilion = await rows(c, 'DELETE FROM game.pavilion_accounts WHERE owner_id = $1 RETURNING owner_id', [ownerId]);
      return { players: deletedPlayer.length, tickets: deletedTickets.length, receipts, pavilionAccounts: deletedPavilion.length, chatMessages: deletedChat.length };
    });
  }
  async purgeExpired(now) {
    // Chỉ phục vụ local/test; Edge dọn theo người chơi trong cùng giao dịch.
    return { receipts: 0, tickets: 0 };
  }
  async close() {
    // Pool dùng chung trong isolate; caller có thể tắt khi test kết thúc.
    if (typeof this.pool.end === 'function') await this.pool.end();
  }
}
module.exports = { PostgresPlayers, nameKey, applyRate };
