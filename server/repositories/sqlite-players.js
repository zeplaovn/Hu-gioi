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
    if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(file);
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
      purgeReceipts: p('DELETE FROM player_receipts WHERE expires_at <= ?'),
      purgeTickets: p('DELETE FROM creation_tickets WHERE expires_at <= ? AND created_at <= ?')
    };
  }

  getByOwner(ownerId) { const row = this.q.byOwner.get(ownerId); return row ? hydrate(row) : null; }
  get(playerId) { const row = this.q.byId.get(playerId); return row ? hydrate(row) : null; }

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
      const rec = build(JSON.parse(t.preview));
      const key = nameKey(rec.name);
      if (this.q.byNameKey.get(key)) throw new GameError('NAME_TAKEN', 'Đạo hiệu này đã có người dùng.');
      const id = crypto.randomUUID(), state = JSON.stringify(rec.state);
      this.q.insert.run(id, ownerId, rec.name, key, rec.schemaVersion, rec.contentVersion, state, Buffer.byteLength(state),
        rec.rngSeed, rec.rngCounter, now, now, now);
      this.q.useTicket.run(now, ticketId);
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
      if (out.receipt) {
        const r = out.receipt;
        this.q.putReceipt.run(playerId, r.requestId, r.fingerprint, r.revision, JSON.stringify(r.response), out.save?.lastSeenAt ?? 0, r.expiresAt);
      }
      return out.value;
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
