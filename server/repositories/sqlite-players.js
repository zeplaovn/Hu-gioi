/* Kho người chơi bền vững bằng SQLite có sẵn trong Node (node:sqlite). Một process ghi; WAL + synchronous=FULL.
   Giao dịch BEGIN IMMEDIATE tuần tự hóa mọi thay đổi theo người chơi. Dùng ':memory:' cho test. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { PlayerRepository } = require('./player-repository.js');
const GAME = require('../../engine/game.js');
const { GameError } = require('../errors.js');
const { encodePavilionReceipt, decodePavilionReceipt } = require('./pavilion-receipt.js');

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
CREATE TABLE IF NOT EXISTS account_state (
  owner_id TEXT PRIMARY KEY,
  doc TEXT NOT NULL DEFAULT '{}',
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS account_receipts (
  owner_id TEXT NOT NULL REFERENCES account_state(owner_id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (owner_id, request_id)
);
CREATE INDEX IF NOT EXISTS account_receipts_expires ON account_receipts (expires_at);
CREATE TABLE IF NOT EXISTS account_mail (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  seed_key TEXT,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  attachments TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  claimed_at INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS account_mail_seed ON account_mail (owner_id, seed_key) WHERE seed_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS account_mail_owner_created ON account_mail (owner_id, created_at DESC, id);
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

function hydrateMail(row) {
  return {
    id: row.id, seedKey: row.seed_key, kind: row.kind, title: row.title, body: row.body,
    attachments: JSON.parse(row.attachments), createdAt: row.created_at,
    expiresAt: row.expires_at, claimedAt: row.claimed_at
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
    this.queue = Promise.resolve();
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
      latestTicket: p('SELECT * FROM creation_tickets WHERE owner_id = ? AND used_at IS NULL AND created_at > ? ORDER BY created_at DESC LIMIT 1'),
      putTicket: p('INSERT INTO creation_tickets (id, owner_id, preview, created_at, expires_at) VALUES (?, ?, ?, ?, ?)'),
      extendTicket: p('UPDATE creation_tickets SET expires_at = ? WHERE id = ?'),
      ticket: p('SELECT * FROM creation_tickets WHERE id = ?'),
      useTicket: p('UPDATE creation_tickets SET used_at = ? WHERE id = ? AND used_at IS NULL'),
      deletePlayer: p('DELETE FROM players WHERE id = ? AND owner_id = ?'),
      deleteOwnerPlayers: p('DELETE FROM players WHERE owner_id = ?'),
      deleteOwnerTickets: p('DELETE FROM creation_tickets WHERE owner_id = ?'),
      countReceipts: p('SELECT COUNT(*) AS n FROM player_receipts WHERE player_id = ?'),
      purgeReceipts: p('DELETE FROM player_receipts WHERE expires_at <= ?'),
      purgeTickets: p('DELETE FROM creation_tickets WHERE expires_at <= ? AND created_at <= ?'),
      pavilionEnsure: p('INSERT OR IGNORE INTO pavilion_accounts (owner_id) VALUES (?)'),
      pavilionEnsureStarter: p('INSERT OR IGNORE INTO pavilion_accounts (owner_id, balance, total_earned) VALUES (?, ?, ?)'),
      pavilionConsumeStarter: p("UPDATE pavilion_accounts SET relics = '{}', version = version + 1 WHERE owner_id = ? AND version = ?"),
      pavilionGet: p('SELECT * FROM pavilion_accounts WHERE owner_id = ?'),
      pavilionSave: p('UPDATE pavilion_accounts SET balance = ?, total_earned = ?, rebirths = ?, upgrades = ?, relics = ?, version = ? WHERE owner_id = ? AND version = ?'),
      pavilionReward: p('UPDATE pavilion_accounts SET balance = balance + ?, total_earned = total_earned + ?, version = version + 1 WHERE owner_id = ?'),
      pavilionReceipt: p('SELECT fingerprint FROM pavilion_receipts WHERE owner_id = ? AND request_id = ?'),
      pavilionPutReceipt: p('INSERT INTO pavilion_receipts (owner_id, request_id, fingerprint) VALUES (?, ?, ?)'),
      pavilionSyncPlayer: p('UPDATE players SET state = ?, state_bytes = ?, revision = revision + 1, updated_at = ? WHERE owner_id = ?'),
      deletePavilion: p('DELETE FROM pavilion_accounts WHERE owner_id = ?'),
      accountEnsure: p("INSERT OR IGNORE INTO account_state (owner_id, doc, updated_at) VALUES (?, '{}', ?)"),
      accountGet: p('SELECT * FROM account_state WHERE owner_id = ?'),
      accountSave: p('UPDATE account_state SET doc = ?, updated_at = ? WHERE owner_id = ?'),
      accountReceipt: p('SELECT * FROM account_receipts WHERE owner_id = ? AND request_id = ? AND expires_at > ?'),
      accountPutReceipt: p(`INSERT INTO account_receipts (owner_id, request_id, fingerprint, response, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)`),
      accountSavePlayer: p(`UPDATE players SET state = ?, state_bytes = ?, revision = ?, rng_counter = ?,
        last_seen_at = ?, schema_version = ?, content_version = ?, updated_at = ? WHERE id = ? AND revision = ?`),
      mailList: p('SELECT * FROM account_mail WHERE owner_id = ? ORDER BY created_at DESC, id ASC'),
      mailInsert: p(`INSERT OR IGNORE INTO account_mail
        (id, owner_id, seed_key, kind, title, body, attachments, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`),
      mailClaim: p(`UPDATE account_mail SET claimed_at = ?
        WHERE id = ? AND owner_id = ? AND claimed_at IS NULL AND (expires_at IS NULL OR expires_at > ?)`),
      deleteAccountMail: p('DELETE FROM account_mail WHERE owner_id = ?'),
      deleteAccountState: p('DELETE FROM account_state WHERE owner_id = ?'),
      countAccountReceipts: p('SELECT COUNT(*) AS n FROM account_receipts WHERE owner_id = ?'),
      purgeAccountReceipts: p('DELETE FROM account_receipts WHERE expires_at <= ?')
    };
  }

  async getByOwner(ownerId) { const row = this.q.byOwner.get(ownerId); return row ? hydrate(row) : null; }
  async get(playerId) { const row = this.q.byId.get(playerId); return row ? hydrate(row) : null; }
  async getPavilion(ownerId) {
    const row = this.q.pavilionGet.get(ownerId);
    return row ? {
      version: row.version, balance: row.balance, totalEarned: row.total_earned, rebirths: row.rebirths,
      upgrades: JSON.parse(row.upgrades), relics: JSON.parse(row.relics)
    } : { version: 0, balance: 0, totalEarned: 0, rebirths: 0, upgrades: {}, relics: {} };
  }

  /* Mua hàng bằng intent, không nhận giá/tiền/state từ client. Receipt gắn theo account,
     không bị xóa khi nhân vật tọa hóa; cùng requestId chỉ được trả thưởng một lần. */
  async purchasePavilion(ownerId, { requestId, expectedVersion, kind, key, now, catalog }) {
    return this.run(async () => {
      const player = this.q.byOwner.get(ownerId);
      if (kind === 'starter' && !player)
        this.q.pavilionEnsureStarter.run(ownerId, catalog.starterGrant, catalog.starterGrant);
      else this.q.pavilionEnsure.run(ownerId);
      const prior = this.q.pavilionReceipt.get(ownerId, requestId);
      if (prior) {
        const cost = decodePavilionReceipt(prior.fingerprint, kind, key);
        return { replayed: true, cost, pavilion: await this.getPavilion(ownerId), record: await this.getByOwner(ownerId) };
      }
      if (kind === 'starter' && player)
        throw new GameError('GAME_RULE_VIOLATION', 'Hàng Khởi Nguyên chỉ đổi trước khi tạo đạo thân.');
      const account = await this.getPavilion(ownerId);
      if (account.version !== expectedVersion) throw new GameError('PAVILION_CONFLICT', 'Thiên Mệnh Các đã thay đổi. Xin đồng bộ lại.', { currentVersion: account.version });
      let cost, upgrades = { ...account.upgrades }, relics = { ...account.relics };
      if (kind === 'upgrade' && Object.hasOwn(catalog.stats, key)) {
        const current = upgrades[key] || 0;
        cost = catalog.upgradeCost(current);
        if (cost === null) throw new GameError('GAME_RULE_VIOLATION', 'Thuộc tính Thiên Mệnh đã viên mãn cấp 20.');
        upgrades[key] = current + 1;
      } else if (kind === 'starter' && Object.hasOwn(catalog.starter, key)) {
        const product = catalog.starter[key], held = relics[key] || 0;
        if (!Number.isInteger(held) || held < 0 || held >= product.max)
          throw new GameError('GAME_RULE_VIOLATION', 'Hàng Khởi Nguyên đã đạt giới hạn.');
        if (catalog.starterConflict?.(relics, key))
          throw new GameError('GAME_RULE_VIOLATION', 'Chỉ được chọn một Dấu ấn Thiên Mệnh.');
        cost = product.cost;
        relics[key] = held + 1;
      } else throw new GameError('INVALID_REQUEST', 'Loại giao dịch Thiên Mệnh Các không hợp lệ.');
      if (account.balance < cost) throw new GameError('INSUFFICIENT_TINH', 'Không đủ Thiên Tinh để đổi.');
      const res = this.q.pavilionSave.run(account.balance - cost, account.totalEarned, account.rebirths,
        JSON.stringify(upgrades), JSON.stringify(relics), account.version + 1, ownerId, account.version);
      if (res.changes !== 1) throw new GameError('PAVILION_CONFLICT', 'Thiên Mệnh Các đang thay đổi.');
      if (player && kind === 'upgrade') {
        const state = JSON.parse(player.state);
        state.pavilion = { ...upgrades };
        const json = JSON.stringify(state);
        if (Buffer.byteLength(json) > 65536) throw new GameError('STATE_CORRUPT', 'Trạng thái nhân vật vượt giới hạn.');
        this.q.pavilionSyncPlayer.run(json, Buffer.byteLength(json), now, ownerId);
      }
      this.q.pavilionPutReceipt.run(ownerId, requestId, encodePavilionReceipt(kind, key, cost));
      return { replayed: false, cost, pavilion: await this.getPavilion(ownerId), record: await this.getByOwner(ownerId) };
    });
  }

  /* Mọi thay đổi chạy trong BEGIN IMMEDIATE ... COMMIT; lỗi bất kỳ → ROLLBACK. */
  async run(work) {
    // Một kết nối SQLite đồng bộ: giữ mutex qua mọi await trong callback.
    // Không được mở BEGIN thứ hai khi transaction còn đang chờ async fn.
    const previous = this.queue;
    let release;
    this.queue = new Promise(resolve => { release = resolve; });
    await previous;
    try {
      this.db.exec('BEGIN IMMEDIATE');
      try {
        const result = await work();
        this.db.exec('COMMIT');
        return result;
      } catch (err) {
        try { this.db.exec('ROLLBACK'); } catch { /* giao dịch đã đóng */ }
        throw err;
      }
    } finally { release(); }
  }

  async issueTicket(ownerId, preview, { now, ttlMs, dailyLimit, fresh = false }) {
    return this.run(() => {
      const { n, oldest } = this.q.ticketCount.get(ownerId, now - DAY);
      if (!fresh) {
        const latest = this.q.latestTicket.get(ownerId, now - DAY);
        if (latest) {
          const expiresAt = latest.expires_at > now ? latest.expires_at : now + ttlMs;
          if (expiresAt !== latest.expires_at) this.q.extendTicket.run(expiresAt, latest.id);
          return { id: latest.id, preview: JSON.parse(latest.preview), expiresAt,
            rollsLeft: Math.max(0, dailyLimit - n), reused: true };
        }
      }
      if (n >= dailyLimit) return { limited: true, retryAfterMs: Math.max(1000, oldest + DAY - now) };
      const id = crypto.randomUUID();
      this.q.putTicket.run(id, ownerId, JSON.stringify(preview), now, now + ttlMs);
      return { id, preview, expiresAt: now + ttlMs, rollsLeft: dailyLimit - n - 1 };
    });
  }

  async createWithTicket({ ownerId, ticketId, now, build }) {
    return this.run(async () => {
      const t = this.q.ticket.get(ticketId);
      if (!t || t.owner_id !== ownerId || t.used_at) throw new GameError('TICKET_INVALID', 'Phiếu khởi nguyên không hợp lệ hoặc đã dùng.');
      if (t.expires_at <= now) throw new GameError('TICKET_EXPIRED', 'Phiếu khởi nguyên đã hết hạn. Hãy gieo lại.');
      if (this.q.byOwner.get(ownerId)) throw new GameError('PLAYER_EXISTS', 'Tài khoản đã có đạo thân.');
      this.q.pavilionEnsure.run(ownerId);
      const account = await this.getPavilion(ownerId);
      const consumed = { ...account.relics }; // Chỉ hàng Khởi Nguyên đã mua cho đạo thân này.
      const rec = await build(JSON.parse(t.preview), { ...account, consumed });
      const key = nameKey(rec.name);
      if (this.q.byNameKey.get(key)) throw new GameError('NAME_TAKEN', 'Đạo hiệu này đã có người dùng.');
      const id = crypto.randomUUID(), state = JSON.stringify(rec.state);
      this.q.insert.run(id, ownerId, rec.name, key, rec.schemaVersion, rec.contentVersion, state, Buffer.byteLength(state),
        rec.rngSeed, rec.rngCounter, now, now, now);
      this.q.useTicket.run(now, ticketId);
      if (Object.keys(consumed).length) {
        const done = this.q.pavilionConsumeStarter.run(ownerId, account.version);
        if (done.changes !== 1) throw new GameError('PAVILION_CONFLICT', 'Vật phẩm Khởi Nguyên đã thay đổi.');
      }
      return await this.get(id);
    });
  }

  async transact(playerId, fn) {
    return this.run(async () => {
      const row = this.q.byId.get(playerId);
      const tx = {
        record: row ? hydrate(row) : null,
        receipt: async (requestId, now) => {
          const r = this.q.receipt.get(playerId, requestId, now);
          return r ? { requestId, fingerprint: r.fingerprint, revision: r.revision, response: JSON.parse(r.response) } : null;
        }
      };
      const out = await fn(tx) || {};
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

  /* Giao dịch cấp tài khoản cho nhiệm vụ ngày/điểm danh/hộp thư. Mutex FIFO của
     SQLite thay cho advisory lock; thứ tự đọc account_state → player giống Postgres. */
  async accountTransact(ownerId, fn, { now = Date.now() } = {}) {
    return this.run(async () => {
      this.q.accountEnsure.run(ownerId, now);
      const account = this.q.accountGet.get(ownerId);
      const playerRow = this.q.byOwner.get(ownerId);
      const doc = JSON.parse(account.doc);
      const originalDoc = JSON.stringify(doc);
      const tx = {
        doc,
        player: playerRow ? hydrate(playerRow) : null,
        receipt: async requestId => {
          const r = this.q.accountReceipt.get(ownerId, requestId, now);
          return r ? { requestId, fingerprint: r.fingerprint, response: JSON.parse(r.response) } : null;
        },
        mail: {
          list: async () => this.q.mailList.all(ownerId).map(hydrateMail),
          insert: async items => {
            for (const m of items) this.q.mailInsert.run(m.id, ownerId, m.seedKey ?? null, m.kind,
              m.title, m.body, JSON.stringify(m.attachments || {}), m.createdAt, m.expiresAt ?? null);
          },
          claim: async (id, at) => this.q.mailClaim.run(at, id, ownerId, at).changes === 1
        }
      };
      const out = await fn(tx) || {};
      const nextDoc = out.doc !== undefined ? out.doc : tx.doc;
      const serializedDoc = JSON.stringify(nextDoc);
      if (serializedDoc !== originalDoc) {
        if (Buffer.byteLength(serializedDoc) > 16384)
          throw new GameError('STATE_CORRUPT', 'Dữ liệu tài khoản vượt giới hạn.');
        this.q.accountSave.run(serializedDoc, now, ownerId);
      }
      if (out.save) {
        const s = out.save, state = JSON.stringify(s.state), size = Buffer.byteLength(state);
        if (size > 65536) throw new GameError('STATE_CORRUPT', 'Trạng thái nhân vật vượt giới hạn.');
        const res = this.q.accountSavePlayer.run(state, size, s.revision, s.rngCounter,
          playerRow.last_seen_at, s.schemaVersion, s.contentVersion, now, playerRow.id, playerRow.revision);
        if (res.changes !== 1) throw new GameError('REVISION_CONFLICT', 'Tiến trình đã thay đổi. Hãy đồng bộ lại.');
      }
      if (out.receipt) {
        const r = out.receipt;
        this.q.accountPutReceipt.run(ownerId, r.requestId, r.fingerprint, JSON.stringify(r.response), now, r.expiresAt);
      }
      return out.value;
    });
  }

  async deletePlayer(ownerId, playerId, { allowAlive = false } = {}) {
    return this.run(() => {
      const row = this.q.byId.get(playerId);
      if (!row || row.owner_id !== ownerId) throw new GameError('PLAYER_NOT_FOUND', 'Không tìm thấy đạo thân.');
      if (!allowAlive && !new GAME.Game(JSON.parse(row.state)).isDead())
        throw new GameError('GAME_RULE_VIOLATION', 'Đạo thân chưa tọa hóa.');
      this.q.deletePlayer.run(playerId, ownerId);
      // Xóa tự nguyện đặt lại lượt gieo; tọa hóa vẫn giữ giới hạn cũ.
      if (allowAlive) this.q.deleteOwnerTickets.run(ownerId);
      this.q.deletePavilion.run(ownerId);
      return { deleted: true };
    });
  }

  /* Quyền truy cập/sao chép dữ liệu: chỉ dữ liệu của chính chủ, không bao giờ gồm rng_seed. */
  async exportOwnerData(ownerId) {
    const row = this.q.byOwner.get(ownerId);
    const tickets = Number(this.q.ticketCount.get(ownerId, 0).n);
    const pavilion = await this.getPavilion(ownerId);
    const accountRow = this.q.accountGet.get(ownerId);
    const mail = this.q.mailList.all(ownerId).map(hydrateMail);
    if (!row && !tickets && pavilion.totalEarned === 0 && pavilion.rebirths === 0 && !accountRow && !mail.length) return null;
    return {
      player: row ? { id: row.id, name: row.name, revision: row.revision, schemaVersion: row.schema_version,
        state: JSON.parse(row.state), lastSeenAt: row.last_seen_at, createdAt: row.created_at, updatedAt: row.updated_at } : null,
      tickets, pavilion, account: accountRow ? JSON.parse(accountRow.doc) : null, mail
    };
  }

  /* Quyền xóa dữ liệu: xóa nhân vật (kèm receipt qua ON DELETE CASCADE) và mọi phiếu khởi nguyên của tài khoản. */
  async deleteOwnerData(ownerId) {
    return this.run(() => {
      const row = this.q.byOwner.get(ownerId);
      let receipts = 0;
      if (row) receipts = Number(this.q.countReceipts.get(row.id).n);
      const accountReceipts = Number(this.q.countAccountReceipts.get(ownerId).n);
      const players = Number(this.q.deleteOwnerPlayers.run(ownerId).changes);
      const tickets = Number(this.q.deleteOwnerTickets.run(ownerId).changes);
      const pavilionAccounts = Number(this.q.deletePavilion.run(ownerId).changes);
      const accountMail = Number(this.q.deleteAccountMail.run(ownerId).changes);
      const accountState = Number(this.q.deleteAccountState.run(ownerId).changes);
      return { players, tickets, receipts, pavilionAccounts, accountMail, accountReceipts, accountState };
    });
  }

  async purgeExpired(now) {
    return this.run(() => ({
      receipts: Number(this.q.purgeReceipts.run(now).changes),
      tickets: Number(this.q.purgeTickets.run(now, now - 7 * DAY).changes),
      accountReceipts: Number(this.q.purgeAccountReceipts.run(now).changes)
    }));
  }

  close() { this.db.close(); }
}
module.exports = { SqlitePlayers, nameKey };
