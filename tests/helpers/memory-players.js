/* Kho người chơi in-memory CHỈ dành cho test: cùng hợp đồng PlayerRepository như PostgresPlayers
   (xem server/repositories/player-repository.js). Thay SqlitePlayers đã gỡ. Không dùng ở production.
   Giao dịch tuần tự theo FIFO; callback ném lỗi → hoàn tác toàn bộ (snapshot structuredClone). */
'use strict';
const crypto = require('node:crypto');
const { PlayerRepository } = require('../../server/repositories/player-repository.js');
const GAME = require('../../engine/game.js');
const { GameError } = require('../../server/errors.js');
const { encodePavilionReceipt, decodePavilionReceipt } = require('../../server/repositories/pavilion-receipt.js');

const DAY = 24 * 3600 * 1000;
const STATE_LIMIT = 65536;
const nameKey = name => String(name).normalize('NFC').toLocaleLowerCase('vi');
const bytes = text => Buffer.byteLength(text);
const lastOf = list => list.reduce((best, x) => (!best || x.createdAt >= best.createdAt ? x : best), null);

function hydrate(row) {
  return {
    id: row.id, ownerId: row.ownerId, name: row.name, state: JSON.parse(row.state), revision: row.revision,
    schemaVersion: row.schemaVersion, contentVersion: row.contentVersion, rngSeed: row.rngSeed,
    rngCounter: row.rngCounter, lastSeenAt: row.lastSeenAt, createdAt: row.createdAt
  };
}
function hydrateMail(row) {
  return {
    id: row.id, seedKey: row.seedKey, kind: row.kind, title: row.title, body: row.body,
    attachments: JSON.parse(row.attachments), createdAt: row.createdAt,
    expiresAt: row.expiresAt, claimedAt: row.claimedAt
  };
}
const emptyPavilion = () => ({ version: 0, balance: 0, totalEarned: 0, rebirths: 0, upgrades: '{}', relics: '{}' });

class MemoryPlayers extends PlayerRepository {
  constructor() {
    super();
    this.queue = Promise.resolve();
    this.s = {
      players: new Map(), playerReceipts: new Map(), tickets: new Map(), pavilion: new Map(),
      pavilionReceipts: new Map(), accountState: new Map(), accountReceipts: new Map(), mail: new Map()
    };
  }

  /* ---- Hook white-box cho test (thay các câu UPDATE SQL trực tiếp trước đây) ---- */
  testSetSeed(playerId, seed) { const p = this.s.players.get(playerId); p.rngSeed = seed; p.rngCounter = 0; }
  testSetRawState(playerId, raw) { const p = this.s.players.get(playerId); p.state = raw; }
  testSetPavilionFingerprint(ownerId, requestId, fingerprint) {
    this.s.pavilionReceipts.set(ownerId + '|' + requestId, fingerprint);
  }

  async run(work) {
    const previous = this.queue;
    let release;
    this.queue = new Promise(resolve => { release = resolve; });
    await previous;
    const snapshot = structuredClone(this.s);
    try { return await work(); }
    catch (err) { this.s = snapshot; throw err; }
    finally { release(); }
  }

  byOwner(ownerId) { for (const p of this.s.players.values()) if (p.ownerId === ownerId) return p; return null; }
  dropPlayer(id) {
    this.s.players.delete(id);
    for (const key of [...this.s.playerReceipts.keys()]) if (key.startsWith(id + '|')) this.s.playerReceipts.delete(key);
  }
  dropPavilion(ownerId) {
    const had = this.s.pavilion.delete(ownerId);
    for (const key of [...this.s.pavilionReceipts.keys()]) if (key.startsWith(ownerId + '|')) this.s.pavilionReceipts.delete(key);
    return had ? 1 : 0;
  }
  ensurePavilion(ownerId, balance = 0) {
    if (!this.s.pavilion.has(ownerId))
      this.s.pavilion.set(ownerId, { ...emptyPavilion(), balance, totalEarned: balance });
  }
  pavilionView(ownerId) {
    const row = this.s.pavilion.get(ownerId);
    return row ? {
      version: row.version, balance: row.balance, totalEarned: row.totalEarned, rebirths: row.rebirths,
      upgrades: JSON.parse(row.upgrades), relics: JSON.parse(row.relics)
    } : { version: 0, balance: 0, totalEarned: 0, rebirths: 0, upgrades: {}, relics: {} };
  }
  ownerTickets(ownerId, after) {
    return [...this.s.tickets.values()].filter(t => t.ownerId === ownerId && t.createdAt > after);
  }

  async getByOwner(ownerId) { const row = this.byOwner(ownerId); return row ? hydrate(row) : null; }
  async get(playerId) { const row = this.s.players.get(playerId); return row ? hydrate(row) : null; }
  async getPavilion(ownerId) { return this.pavilionView(ownerId); }

  async purchasePavilion(ownerId, { requestId, expectedVersion, kind, key, now, catalog }) {
    return this.run(async () => {
      const player = this.byOwner(ownerId);
      if (kind === 'starter' && !player) this.ensurePavilion(ownerId, catalog.starterGrant);
      else this.ensurePavilion(ownerId);
      const prior = this.s.pavilionReceipts.get(ownerId + '|' + requestId);
      if (prior) {
        const cost = decodePavilionReceipt(prior, kind, key);
        return { replayed: true, cost, pavilion: this.pavilionView(ownerId), record: await this.getByOwner(ownerId) };
      }
      if (kind === 'starter' && player)
        throw new GameError('GAME_RULE_VIOLATION', 'Hàng Khởi Nguyên chỉ đổi trước khi tạo đạo thân.');
      const account = this.pavilionView(ownerId);
      if (account.version !== expectedVersion)
        throw new GameError('PAVILION_CONFLICT', 'Thiên Mệnh Các đã thay đổi. Xin đồng bộ lại.', { currentVersion: account.version });
      let cost; const upgrades = { ...account.upgrades }, relics = { ...account.relics };
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
      Object.assign(this.s.pavilion.get(ownerId), {
        balance: account.balance - cost, upgrades: JSON.stringify(upgrades), relics: JSON.stringify(relics), version: account.version + 1
      });
      if (player && kind === 'upgrade') {
        const state = JSON.parse(player.state);
        state.pavilion = { ...upgrades };
        const json = JSON.stringify(state);
        if (bytes(json) > STATE_LIMIT) throw new GameError('STATE_CORRUPT', 'Trạng thái nhân vật vượt giới hạn.');
        player.state = json; player.revision += 1; player.updatedAt = now;
      }
      this.s.pavilionReceipts.set(ownerId + '|' + requestId, encodePavilionReceipt(kind, key, cost));
      return { replayed: false, cost, pavilion: this.pavilionView(ownerId), record: await this.getByOwner(ownerId) };
    });
  }

  async issueTicket(ownerId, preview, { now, ttlMs, dailyLimit, fresh = false }) {
    return this.run(() => {
      const recent = this.ownerTickets(ownerId, now - DAY);
      const n = recent.length;
      const oldest = n ? Math.min(...recent.map(t => t.createdAt)) : null;
      if (!fresh) {
        const latest = lastOf(recent.filter(t => t.usedAt == null));
        if (latest) {
          const expiresAt = latest.expiresAt > now ? latest.expiresAt : now + ttlMs;
          latest.expiresAt = expiresAt;
          return { id: latest.id, preview: JSON.parse(latest.preview), expiresAt, rollsLeft: Math.max(0, dailyLimit - n), reused: true };
        }
      }
      if (n >= dailyLimit) {
        if (!fresh) {
          const used = lastOf(recent.filter(t => t.usedAt != null));
          if (used) {
            const expiresAt = now + ttlMs;
            used.usedAt = null; used.expiresAt = expiresAt;
            return { id: used.id, preview: JSON.parse(used.preview), expiresAt, rollsLeft: 0, reused: true, revived: true };
          }
        }
        return { limited: true, retryAfterMs: Math.max(1000, oldest + DAY - now) };
      }
      const id = crypto.randomUUID();
      this.s.tickets.set(id, { id, ownerId, preview: JSON.stringify(preview), createdAt: now, expiresAt: now + ttlMs, usedAt: null });
      return { id, preview, expiresAt: now + ttlMs, rollsLeft: dailyLimit - n - 1 };
    });
  }

  async createWithTicket({ ownerId, ticketId, now, build }) {
    return this.run(async () => {
      const t = this.s.tickets.get(ticketId);
      if (!t || t.ownerId !== ownerId || t.usedAt) throw new GameError('TICKET_INVALID', 'Phiếu khởi nguyên không hợp lệ hoặc đã dùng.');
      if (t.expiresAt <= now) throw new GameError('TICKET_EXPIRED', 'Phiếu khởi nguyên đã hết hạn. Hãy gieo lại.');
      if (this.byOwner(ownerId)) throw new GameError('PLAYER_EXISTS', 'Tài khoản đã có đạo thân.');
      this.ensurePavilion(ownerId);
      const account = this.pavilionView(ownerId);
      const consumed = { ...account.relics };
      const rec = await build(JSON.parse(t.preview), { ...account, consumed });
      const key = nameKey(rec.name);
      for (const p of this.s.players.values()) if (p.nameKey === key) throw new GameError('NAME_TAKEN', 'Đạo hiệu này đã có người dùng.');
      const id = crypto.randomUUID(), state = JSON.stringify(rec.state);
      if (bytes(state) > STATE_LIMIT) throw Error('CHECK constraint failed: state_bytes <= 65536');
      this.s.players.set(id, {
        id, ownerId, name: rec.name, nameKey: key, revision: 0, schemaVersion: rec.schemaVersion, contentVersion: rec.contentVersion,
        state, rngSeed: rec.rngSeed, rngCounter: rec.rngCounter, lastSeenAt: now, createdAt: now, updatedAt: now
      });
      t.usedAt = now;
      if (Object.keys(consumed).length) {
        const row = this.s.pavilion.get(ownerId);
        if (row.version !== account.version) throw new GameError('PAVILION_CONFLICT', 'Vật phẩm Khởi Nguyên đã thay đổi.');
        row.relics = '{}'; row.version += 1;
      }
      return await this.get(id);
    });
  }

  async transact(playerId, fn) {
    return this.run(async () => {
      const row = this.s.players.get(playerId);
      const tx = {
        record: row ? hydrate(row) : null,
        receipt: async (requestId, now) => {
          const r = this.s.playerReceipts.get(playerId + '|' + requestId);
          return r && r.expiresAt > now ? { requestId, fingerprint: r.fingerprint, revision: r.revision, response: JSON.parse(r.response) } : null;
        }
      };
      const out = await fn(tx) || {};
      if (out.save) {
        const s = out.save, json = JSON.stringify(s.state);
        if (bytes(json) > STATE_LIMIT) throw Error('CHECK constraint failed: state_bytes <= 65536');
        if (!row || row.revision !== tx.record.revision) throw new GameError('REVISION_CONFLICT', 'Tiến trình đã thay đổi. Hãy đồng bộ lại.');
        Object.assign(row, {
          state: json, revision: s.revision, rngCounter: s.rngCounter, lastSeenAt: s.lastSeenAt,
          schemaVersion: s.schemaVersion, contentVersion: s.contentVersion, updatedAt: s.lastSeenAt
        });
      } else if (out.touch && row) {
        row.rngCounter = out.touch.rngCounter; row.lastSeenAt = out.touch.lastSeenAt;
      }
      if (out.pavilionAward) {
        this.ensurePavilion(tx.record.ownerId);
        const p = this.s.pavilion.get(tx.record.ownerId);
        p.balance += out.pavilionAward; p.totalEarned += out.pavilionAward; p.version += 1;
      }
      if (out.receipt) {
        const r = out.receipt, key = playerId + '|' + r.requestId;
        if (this.s.playerReceipts.has(key)) throw Error('UNIQUE constraint failed: player_receipts');
        this.s.playerReceipts.set(key, {
          fingerprint: r.fingerprint, revision: r.revision, response: JSON.stringify(r.response),
          createdAt: out.save?.lastSeenAt ?? 0, expiresAt: r.expiresAt
        });
      }
      return out.value;
    });
  }

  async accountTransact(ownerId, fn, { now = Date.now() } = {}) {
    return this.run(async () => {
      if (!this.s.accountState.has(ownerId)) this.s.accountState.set(ownerId, { doc: '{}', updatedAt: now });
      const account = this.s.accountState.get(ownerId);
      const playerRow = this.byOwner(ownerId);
      const doc = JSON.parse(account.doc);
      const originalDoc = JSON.stringify(doc);
      const tx = {
        doc,
        player: playerRow ? hydrate(playerRow) : null,
        receipt: async requestId => {
          const r = this.s.accountReceipts.get(ownerId + '|' + requestId);
          return r && r.expiresAt > now ? { requestId, fingerprint: r.fingerprint, response: JSON.parse(r.response) } : null;
        },
        mail: {
          list: async () => [...this.s.mail.values()].filter(m => m.ownerId === ownerId)
            .sort((a, b) => b.createdAt - a.createdAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).map(hydrateMail),
          insert: async items => {
            for (const m of items) {
              const dup = this.s.mail.has(m.id) || (m.seedKey != null &&
                [...this.s.mail.values()].some(x => x.ownerId === ownerId && x.seedKey === m.seedKey));
              if (dup) continue;
              this.s.mail.set(m.id, {
                id: m.id, ownerId, seedKey: m.seedKey ?? null, kind: m.kind, title: m.title, body: m.body,
                attachments: JSON.stringify(m.attachments || {}), createdAt: m.createdAt, expiresAt: m.expiresAt ?? null, claimedAt: null
              });
            }
          },
          claim: async (id, at) => {
            const m = this.s.mail.get(id);
            if (!m || m.ownerId !== ownerId || m.claimedAt != null || (m.expiresAt != null && m.expiresAt <= at)) return false;
            m.claimedAt = at;
            return true;
          }
        }
      };
      const out = await fn(tx) || {};
      const nextDoc = out.doc !== undefined ? out.doc : tx.doc;
      const serializedDoc = JSON.stringify(nextDoc);
      if (serializedDoc !== originalDoc) {
        if (bytes(serializedDoc) > 16384) throw new GameError('STATE_CORRUPT', 'Dữ liệu tài khoản vượt giới hạn.');
        account.doc = serializedDoc; account.updatedAt = now;
      }
      if (out.save) {
        const s = out.save, state = JSON.stringify(s.state);
        if (bytes(state) > STATE_LIMIT) throw new GameError('STATE_CORRUPT', 'Trạng thái nhân vật vượt giới hạn.');
        const live = this.s.players.get(playerRow.id);
        if (!live || live.revision !== playerRow.revision) throw new GameError('REVISION_CONFLICT', 'Tiến trình đã thay đổi. Hãy đồng bộ lại.');
        Object.assign(live, {
          state, revision: s.revision, rngCounter: s.rngCounter, schemaVersion: s.schemaVersion,
          contentVersion: s.contentVersion, updatedAt: now
        });
      }
      if (out.receipt) {
        const r = out.receipt, key = ownerId + '|' + r.requestId;
        if (this.s.accountReceipts.has(key)) throw Error('UNIQUE constraint failed: account_receipts');
        this.s.accountReceipts.set(key, {
          fingerprint: r.fingerprint, response: JSON.stringify(r.response), createdAt: now, expiresAt: r.expiresAt
        });
      }
      return out.value;
    });
  }

  async deletePlayer(ownerId, playerId, { allowAlive = false } = {}) {
    return this.run(() => {
      const row = this.s.players.get(playerId);
      if (!row || row.ownerId !== ownerId) throw new GameError('PLAYER_NOT_FOUND', 'Không tìm thấy đạo thân.');
      if (!allowAlive && !new GAME.Game(JSON.parse(row.state)).isDead())
        throw new GameError('GAME_RULE_VIOLATION', 'Đạo thân chưa tọa hóa.');
      this.dropPlayer(playerId);
      if (allowAlive) for (const [id, t] of this.s.tickets) if (t.ownerId === ownerId) this.s.tickets.delete(id);
      this.dropPavilion(ownerId);
      return { deleted: true };
    });
  }

  async exportOwnerData(ownerId) {
    const row = this.byOwner(ownerId);
    const tickets = this.ownerTickets(ownerId, 0).length;
    const pavilion = this.pavilionView(ownerId);
    const accountRow = this.s.accountState.get(ownerId);
    const mail = [...this.s.mail.values()].filter(m => m.ownerId === ownerId)
      .sort((a, b) => b.createdAt - a.createdAt || (a.id < b.id ? -1 : 1)).map(hydrateMail);
    if (!row && !tickets && pavilion.totalEarned === 0 && pavilion.rebirths === 0 && !accountRow && !mail.length) return null;
    return {
      player: row ? { id: row.id, name: row.name, revision: row.revision, schemaVersion: row.schemaVersion,
        state: JSON.parse(row.state), lastSeenAt: row.lastSeenAt, createdAt: row.createdAt, updatedAt: row.updatedAt } : null,
      tickets, pavilion, account: accountRow ? JSON.parse(accountRow.doc) : null, mail
    };
  }

  async deleteOwnerData(ownerId) {
    return this.run(() => {
      const row = this.byOwner(ownerId);
      const receipts = row ? [...this.s.playerReceipts.keys()].filter(k => k.startsWith(row.id + '|')).length : 0;
      const accountReceipts = [...this.s.accountReceipts.keys()].filter(k => k.startsWith(ownerId + '|')).length;
      let players = 0, tickets = 0, accountMail = 0;
      for (const [id, p] of [...this.s.players]) if (p.ownerId === ownerId) { this.dropPlayer(id); players++; }
      for (const [id, t] of [...this.s.tickets]) if (t.ownerId === ownerId) { this.s.tickets.delete(id); tickets++; }
      const pavilionAccounts = this.dropPavilion(ownerId);
      for (const [id, m] of [...this.s.mail]) if (m.ownerId === ownerId) { this.s.mail.delete(id); accountMail++; }
      const accountState = this.s.accountState.delete(ownerId) ? 1 : 0;
      for (const key of [...this.s.accountReceipts.keys()]) if (key.startsWith(ownerId + '|')) this.s.accountReceipts.delete(key);
      return { players, tickets, receipts, pavilionAccounts, accountMail, accountReceipts, accountState };
    });
  }

  async purgeExpired(now) {
    return this.run(() => {
      let receipts = 0, tickets = 0, accountReceipts = 0;
      for (const [k, r] of [...this.s.playerReceipts]) if (r.expiresAt <= now) { this.s.playerReceipts.delete(k); receipts++; }
      for (const [k, t] of [...this.s.tickets]) if (t.expiresAt <= now && t.createdAt <= now - 7 * DAY) { this.s.tickets.delete(k); tickets++; }
      for (const [k, r] of [...this.s.accountReceipts]) if (r.expiresAt <= now) { this.s.accountReceipts.delete(k); accountReceipts++; }
      return { receipts, tickets, accountReceipts };
    });
  }

  close() {}
}
module.exports = { MemoryPlayers, nameKey };
