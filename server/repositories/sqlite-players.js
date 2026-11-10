/* Kho người chơi bền vững bằng SQLite có sẵn trong Node (node:sqlite). Một process ghi; WAL + synchronous=FULL.
   Giao dịch BEGIN IMMEDIATE tuần tự hóa mọi thay đổi theo người chơi. Dùng ':memory:' cho test. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { PlayerRepository } = require('./player-repository.js');
const { GameError } = require('../errors.js');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_key TEXT NOT NULL UNIQUE,
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  schema_version INTEGER NOT NULL,
  content_version TEXT NOT NULL,
  state TEXT NOT NULL,
  state_bytes INTEGER NOT NULL CHECK (state_bytes <= 65536),
  rng_seed TEXT NOT NULL,
  rng_counter INTEGER NOT NULL DEFAULT 0,
  last_seen_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS player_receipts (
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  revision INTEGER NOT NULL,
  response TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (player_id, request_id)
);
CREATE INDEX IF NOT EXISTS player_receipts_expires ON player_receipts (expires_at);
CREATE TABLE IF NOT EXISTS creation_tickets (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  preview TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE INDEX IF NOT EXISTS creation_tickets_owner ON creation_tickets (owner_id, created_at);
CREATE TABLE IF NOT EXISTS pavilion_accounts (
  owner_id TEXT PRIMARY KEY,
  version INTEGER NOT NULL DEFAULT 0,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_earned INTEGER NOT NULL DEFAULT 0 CHECK (total_earned >= 0),
  rebirths INTEGER NOT NULL DEFAULT 0,
  upgrades TEXT NOT NULL DEFAULT '{}',
  relics TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS pavilion_receipts (
  owner_id TEXT NOT NULL REFERENCES pavilion_accounts(owner_id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  PRIMARY KEY (owner_id, request_id)
);
`;
const DAY = 24 * 3600 * 1000;
const nameKey = name => String(name).normalize('NFC').toLocaleLowerCase('vi');

function hydrate(row) {
  return {
    id: row.id, ownerId: row.owner_id, name: row.name, state: JSON.parse(row.state), revision: row.revision,
    schemaVersion: row.schema_version, contentVersion: row.content_version, rngSeed: row.rng_seed,
    rngCounter: row.rng_counter, lastSeenAt: row.last_seen_at, createdAt: row.created_at
  };
}

class SqlitePlayers extends PlayerRepository {
  constructor(file = ':memory:') {
    super();
    if (file !== ':memory:') {
      const dest = path.resolve(file), dir = path.dirname(dest);
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      if (fs.statSync(dir).mode & 0o077) throw Error('Thư mục HU_DB_FILE phải có quyền 0700.');
      if (fs.existsSync(dest) && fs.lstatSync(dest).isSymbolicLink())
        throw Error('HU_DB_FILE không được là symbolic link.');
      file = dest;
    }
    this.db = new DatabaseSync(file);
    if (file !== ':memory:') fs.chmodSync(file, 0o600);
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    this.db.exec(SCHEMA);
    const p = sql => this.db.prepare(sql);
    this.q = {
      byId: p('SELECT * FROM players WHERE id = ?'),
      byOwner: p('SELECT * FROM players WHERE owner_id = ?'),
      byNameKey: p('SELECT id FROM players WHERE name_key = ?'),
      insert: p(`INSERT INTO players (id, owner_id, name, name_key, revision, schema_version, content_version, state, state_bytes,
        rng_seed, rng_counter, last_seen_at, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
      save: p(`UPDATE players SET state = ?, state_bytes = ?, revision = ?, rng_counter = ?, last_seen_at = ?,
        schema_version = ?, content_version = ?, updated_at = ? WHERE id = ? AND revision = ?`),
      touch: p('UPDATE players SET rng_counter = ?, last_seen_at = ? WHERE id = ?'),
      receipt: p('SELECT * FROM player_receipts WHERE player_id = ? AND request_id = ? AND expires_at > ?'),
      putReceipt: p(`INSERT INTO player_receipts (player_id, request_id, fingerprint, revision, response, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`),
      ticketCount: p('SELECT COUNT(*) AS n, MIN(created_at) AS oldest FROM creation_tickets WHERE owner_id = ? AND created_at > ?'),
      putTicket: p('INSERT INTO creation_tickets (id, owner_id, preview, created_at, expires_at) VALUES (?, ?, ?, ?, ?)'),
      ticket: p('SELECT * FROM creation_tickets WHERE id = ?'),
      useTicket: p('UPDATE creation_tickets SET used_at = ? WHERE id = ? AND used_at IS NULL'),
      deletePlayer: p('DELETE FROM players WHERE id = ? AND owner_id = ?'),
      deleteOwnerPlayers: p('DELETE FROM players WHERE owner_id = ?'),
      deleteOwnerTickets: p('DELETE FROM creation_tickets WHERE owner_id = ?'),
      countReceipts: p('SELECT COUNT(*) AS n FROM player_receipts WHERE player_id = ?'),
      purgeReceipts: p('DELETE FROM player_receipts WHERE expires_at <= ?'),
      purgeTickets: p('DELETE FROM creation_tickets WHERE expires_at <= ? AND created_at <= ?'),
      pavilionEnsure: p('INSERT OR IGNORE INTO pavilion_accounts (owner_id) VALUES (?)'),
      pavilionGet: p('SELECT * FROM pavilion_accounts WHERE owner_id = ?'),
      pavilionSave: p('UPDATE pavilion_accounts SET balance = ?, total_earned = ?, rebirths = ?, upgrades = ?, relics = ?, version = ? WHERE owner_id = ? AND version = ?'),
      pavilionReward: p('UPDATE pavilion_accounts SET balance = balance + ?, total_earned = total_earned + ?, version = version + 1 WHERE owner_id = ?'),
      pavilionRebirth: p('UPDATE pavilion_accounts SET rebirths = rebirths + 1, version = version + 1 WHERE owner_id = ?'),
      pavilionReceipt: p('SELECT fingerprint FROM pavilion_receipts WHERE owner_id = ? AND request_id = ?'),
      pavilionPutReceipt: p('INSERT INTO pavilion_receipts (owner_id, request_id, fingerprint) VALUES (?, ?, ?)'),
      pavilionSyncPlayer: p('UPDATE players SET state = ?, state_bytes = ?, revision = revision + 1, updated_at = ? WHERE owner_id = ?'),
      deletePavilion: p('DELETE FROM pavilion_accounts WHERE owner_id = ?')
    };
  }

  getByOwner(ownerId) { const row = this.q.byOwner.get(ownerId); return row ? hydrate(row) : null; }
  get(playerId) { const row = this.q.byId.get(playerId); return row ? hydrate(row) : null; }
  getPavilion(ownerId) {
    const row = this.q.pavilionGet.get(ownerId);
    return row ? {
      version: row.version, balance: row.balance, totalEarned: row.total_earned, rebirths: row.rebirths,
      upgrades: JSON.parse(row.upgrades), relics: JSON.parse(row.relics)
    } : { version: 0, balance: 0, totalEarned: 0, rebirths: 0, upgrades: {}, relics: {} };
  }

  /* Mua hàng bằng intent, không nhận giá/tiền/state từ client. Receipt gắn theo account,
     không bị xóa khi nhân vật tọa hóa; cùng requestId chỉ được trả thưởng một lần. */
  purchasePavilion(ownerId, { requestId, expectedVersion, kind, key, now, catalog }) {
    return this.run(() => {
      this.q.pavilionEnsure.run(ownerId);
      const fingerprint = kind + ':' + key;
      const prior = this.q.pavilionReceipt.get(ownerId, requestId);
      if (prior) {
        if (prior.fingerprint !== fingerprint) throw new GameError('REQUEST_ID_REUSED', 'Mã yêu cầu đã dùng cho giao dịch khác.');
        return { replayed: true, pavilion: this.getPavilion(ownerId), record: this.getByOwner(ownerId) };
      }
      const account = this.getPavilion(ownerId);
      if (account.version !== expectedVersion) throw new GameError('PAVILION_CONFLICT', 'Thiên Mệnh Các đã thay đổi. Xin đồng bộ lại.', { currentVersion: account.version });
      let cost, upgrades = { ...account.upgrades }, relics = { ...account.relics };
      if (kind === 'upgrade' && Object.hasOwn(catalog.stats, key)) {
        const current = upgrades[key] || 0;
        cost = catalog.upgradeCost(current);
        if (cost === null) throw new GameError('GAME_RULE_VIOLATION', 'Thuộc tính Thiên Mệnh đã viên mãn cấp 20.');
        upgrades[key] = current + 1;
      } else if (kind === 'relic' && Object.hasOwn(catalog.relics, key)) {
        const def = catalog.relics[key];
        if ((relics[key] || 0) >= def.maxStored) throw new GameError('GAME_RULE_VIOLATION', 'Kho Kỳ Trân đã đạt giới hạn.');
        cost = def.cost;
        relics[key] = (relics[key] || 0) + 1;
      } else throw new GameError('INVALID_REQUEST', 'Loại giao dịch Thiên Mệnh Các không hợp lệ.');
      if (account.balance < cost) throw new GameError('INSUFFICIENT_TINH', 'Không đủ Thiên Tinh để đổi.');
      const res = this.q.pavilionSave.run(account.balance - cost, account.totalEarned, account.rebirths,
        JSON.stringify(upgrades), JSON.stringify(relics), account.version + 1, ownerId, account.version);
      if (res.changes !== 1) throw new GameError('PAVILION_CONFLICT', 'Thiên Mệnh Các đang thay đổi.');
      const player = this.q.byOwner.get(ownerId);
      if (player && kind === 'upgrade') {
        const state = JSON.parse(player.state);
        state.pavilion = { ...upgrades };
        const json = JSON.stringify(state);
        if (Buffer.byteLength(json) > 65536) throw new GameError('STATE_CORRUPT', 'Trạng thái nhân vật vượt giới hạn.');
        this.q.pavilionSyncPlayer.run(json, Buffer.byteLength(json), now, ownerId);
      }
      this.q.pavilionPutReceipt.run(ownerId, requestId, fingerprint);
      return { replayed: false, cost, pavilion: this.getPavilion(ownerId), record: this.getByOwner(ownerId) };
    });
  }

  /* Mọi thay đổi chạy trong BEGIN IMMEDIATE ... COMMIT; lỗi bất kỳ → ROLLBACK. */
  run(work) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const out = work();
      this.db.exec('COMMIT');
      return out;
    } catch (err) {
      try { this.db.exec('ROLLBACK'); } catch { /* giao dịch đã đóng */ }
      throw err;
    }
  }

  issueTicket(ownerId, preview, { now, ttlMs, dailyLimit }) {
    return this.run(() => {
      const { n, oldest } = this.q.ticketCount.get(ownerId, now - DAY);
      if (n >= dailyLimit) return { limited: true, retryAfterMs: Math.max(1000, oldest + DAY - now) };
      const id = crypto.randomUUID();
      this.q.putTicket.run(id, ownerId, JSON.stringify(preview), now, now + ttlMs);
      return { id, preview, expiresAt: now + ttlMs, rollsLeft: dailyLimit - n - 1 };
    });
  }

  createWithTicket({ ownerId, ticketId, now, build }) {
    return this.run(() => {
      const t = this.q.ticket.get(ticketId);
      if (!t || t.owner_id !== ownerId || t.used_at) throw new GameError('TICKET_INVALID', 'Phiếu khởi nguyên không hợp lệ hoặc đã dùng.');
      if (t.expires_at <= now) throw new GameError('TICKET_EXPIRED', 'Phiếu khởi nguyên đã hết hạn. Hãy gieo lại.');
      if (this.q.byOwner.get(ownerId)) throw new GameError('PLAYER_EXISTS', 'Tài khoản đã có đạo thân.');
      this.q.pavilionEnsure.run(ownerId);
      const account = this.getPavilion(ownerId);
      const consumed = Object.fromEntries(Object.keys(account.relics).filter(k => account.relics[k] > 0).map(k => [k, 1]));
      const rec = build(JSON.parse(t.preview), { ...account, consumed });
      const key = nameKey(rec.name);
      if (this.q.byNameKey.get(key)) throw new GameError('NAME_TAKEN', 'Đạo hiệu này đã có người dùng.');
      const id = crypto.randomUUID(), state = JSON.stringify(rec.state);
      this.q.insert.run(id, ownerId, rec.name, key, rec.schemaVersion, rec.contentVersion, state, Buffer.byteLength(state),
        rec.rngSeed, rec.rngCounter, now, now, now);
      this.q.useTicket.run(now, ticketId);
      if (Object.keys(consumed).length) {
        const relics = { ...account.relics };
        for (const key of Object.keys(consumed)) relics[key]--;
        this.q.pavilionSave.run(account.balance, account.totalEarned, account.rebirths,
          JSON.stringify(account.upgrades), JSON.stringify(relics), account.version + 1, ownerId, account.version);
      }
      return this.get(id);
    });
  }

  transact(playerId, fn) {
    return this.run(() => {
      const row = this.q.byId.get(playerId);
      const tx = {
        record: row ? hydrate(row) : null,
        receipt: (requestId, now) => {
          const r = this.q.receipt.get(playerId, requestId, now);
          return r ? { requestId, fingerprint: r.fingerprint, revision: r.revision, response: JSON.parse(r.response) } : null;
        }
      };
      const out = fn(tx) || {};
      if (out.save) {
        const s = out.save, json = JSON.stringify(s.state), bytes = Buffer.byteLength(json);
        const res = this.q.save.run(json, bytes, s.revision, s.rngCounter, s.lastSeenAt, s.schemaVersion, s.contentVersion,
          s.lastSeenAt, playerId, tx.record.revision);
        if (res.changes !== 1) throw new GameError('REVISION_CONFLICT', 'Tiến trình đã thay đổi. Hãy đồng bộ lại.');
      } else if (out.touch) {
        this.q.touch.run(out.touch.rngCounter, out.touch.lastSeenAt, playerId);
      }
      if (out.pavilionAward) {
        this.q.pavilionEnsure.run(tx.record.ownerId);
        this.q.pavilionReward.run(out.pavilionAward, out.pavilionAward, tx.record.ownerId);
      }
      if (out.receipt) {
        const r = out.receipt;
        this.q.putReceipt.run(playerId, r.requestId, r.fingerprint, r.revision, JSON.stringify(r.response), out.save?.lastSeenAt ?? 0, r.expiresAt);
      }
      return out.value;
    });
  }

  deletePlayer(ownerId, playerId) {
    return this.run(() => {
      const row = this.q.byId.get(playerId);
      if (!row || row.owner_id !== ownerId) throw new GameError('PLAYER_NOT_FOUND', 'Không tìm thấy đạo thân.');
      this.q.deletePlayer.run(playerId, ownerId);
      this.q.deleteOwnerTickets.run(ownerId);
      this.q.pavilionEnsure.run(ownerId);
      this.q.pavilionRebirth.run(ownerId);
      return { deleted: true };
    });
  }

  /* Quyền truy cập/sao chép dữ liệu: chỉ dữ liệu của chính chủ, không bao giờ gồm rng_seed. */
  exportOwnerData(ownerId) {
    const row = this.q.byOwner.get(ownerId);
    const tickets = Number(this.q.ticketCount.get(ownerId, 0).n);
    const pavilion = this.getPavilion(ownerId);
    if (!row && !tickets && pavilion.totalEarned === 0 && pavilion.rebirths === 0) return null;
    return {
      player: row ? { id: row.id, name: row.name, revision: row.revision, schemaVersion: row.schema_version,
        state: JSON.parse(row.state), lastSeenAt: row.last_seen_at, createdAt: row.created_at, updatedAt: row.updated_at } : null,
      tickets, pavilion
    };
  }

  /* Quyền xóa dữ liệu: xóa nhân vật (kèm receipt qua ON DELETE CASCADE) và mọi phiếu khởi nguyên của tài khoản. */
  deleteOwnerData(ownerId) {
    return this.run(() => {
      const row = this.q.byOwner.get(ownerId);
      let receipts = 0;
      if (row) receipts = Number(this.q.countReceipts.get(row.id).n);
      const players = Number(this.q.deleteOwnerPlayers.run(ownerId).changes);
      const tickets = Number(this.q.deleteOwnerTickets.run(ownerId).changes);
      const pavilionAccounts = Number(this.q.deletePavilion.run(ownerId).changes);
      return { players, tickets, receipts, pavilionAccounts };
    });
  }

  purgeExpired(now) {
    return this.run(() => ({
      receipts: Number(this.q.purgeReceipts.run(now).changes),
      tickets: Number(this.q.purgeTickets.run(now, now - 7 * DAY).changes)
    }));
  }

  close() { this.db.close(); }
}
module.exports = { SqlitePlayers, nameKey };
