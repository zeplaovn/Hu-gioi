/* DailyService — nhiệm vụ ngày, điểm danh 7 ngày và hộp thư ở cấp tài khoản.
   Mọi thay đổi đi qua repository.accountTransact: khóa owner → account_state →
   player, nên claim không thể chen giữa lúc tạo/xóa nhân vật. Phần thưởng chỉ
   được phát trong cùng giao dịch với receipt idempotent; replay không cấp lại.
   Ngày reset cố định theo UTC+7 (Asia/Ho_Chi_Minh), không theo múi giờ máy khách. */
'use strict';
const crypto = require('node:crypto');
const H = require('../../engine/game.js');
const C = require('../../engine/protocol/commands.js');
const { GameError } = require('../errors.js');
const { snapshot, assertStateSafe } = require('./player-service.js');

const DAY = 24 * 3600 * 1000;
const TZ_OFFSET = 7 * 3600 * 1000;
const REQUEST_ID = /^[A-Za-z0-9_-]{1,128}$/;
const ACCOUNT_MAX_BYTES = 16384;
const DAILY_TARGET = 3;

/* 5 nhiệm vụ, chọn 3 theo SHA-256(owner + ngày). Tiến độ lấy từ state.progress
   (cộng dồn do engine ghi) trừ baseline đầu ngày đã lưu trong account_state. */
const QUEST_POOL = Object.freeze([
  {
    id: 'kill', name: 'Trừ yêu hộ đạo', desc: 'Hạ yêu thú trong chiến đấu hoặc lịch luyện.',
    counter: 'kill', target: 30, unit: 'yêu thú', stone: 80, item: H.pill(1), qty: 1, go: 'combat'
  },
  {
    id: 'meditate', name: 'Tĩnh tâm nhập định', desc: 'Tu luyện online đủ thời gian trong ngày.',
    counter: 'meditate', target: 600, unit: 'giây', stone: 70, item: H.pill(2), qty: 1, go: 'idle'
  },
  {
    id: 'travel', name: 'Tầm tiên vấn đạo', desc: 'Đặt chân đến vùng đất mới lần đầu.',
    counter: 'travel', target: 2, unit: 'vùng', stone: 90, item: 'HERB-001', qty: 2, go: 'combat'
  },
  {
    id: 'alchemy', name: 'Luyện đan kỳ tài', desc: 'Hoàn thành các mẻ luyện đan.',
    counter: 'alchemy', target: 2, unit: 'mẻ', stone: 100, item: 'HERB-002', qty: 2, go: 'craft:dan'
  },
  {
    id: 'breaks', name: 'Phá kén thành tiên', desc: 'Đột phá tiểu cảnh giới hoặc đại cảnh giới.',
    counter: 'breaks', target: 1, unit: 'lần', stone: 120, item: H.pill(7), qty: 1, go: 'tribulation'
  }
]);
const QUEST_BY_ID = Object.freeze(Object.fromEntries(QUEST_POOL.map(q => [q.id, q])));

/* Phần thưởng nhỏ, có trần; mốc 7 là mốc đáng chờ nhất. */
const CHECKIN_REWARDS = Object.freeze([
  { stone: 50, item: null, qty: 0 },
  { stone: 60, item: 'HERB-001', qty: 1 },
  { stone: 70, item: H.pill(1), qty: 1 },
  { stone: 80, item: 'HERB-002', qty: 2 },
  { stone: 100, item: H.pill(2), qty: 1 },
  { stone: 120, item: 'HERB-001', qty: 3 },
  { stone: 200, item: H.pill(7), qty: 1 }
]);

/* Thư mẫu chỉ gieo một lần cho mỗi tài khoản nhờ seed_key duy nhất. */
const MAIL_SEEDS = Object.freeze([
  {
    seedKey: 'welcome', kind: 'system', title: 'Chào mừng đến Hư Giới',
    body: 'Đạo hữu đã bước vào Hư Giới. Món quà nhập môn này mong giúp buổi đầu tu hành bớt gian nan. Hãy mở Nhiệm vụ để xem việc hôm nay và điểm danh nhận thêm linh thạch.',
    attachments: { stone: 100, items: { 'HERB-001': 3 } }, ttlMs: null
  },
  {
    seedKey: 'event', kind: 'event', title: 'Lễ hội linh khí',
    body: 'Linh khí trời đất đang dồi dào. Nhận phần quà sự kiện và tranh thủ tu luyện trước khi lễ hội kết thúc.',
    attachments: { stone: 60, items: { [H.pill(2)]: 1 } }, ttlMs: 30 * DAY
  },
  {
    seedKey: 'support', kind: 'support', title: 'Hỗ trợ khiếu nại',
    body: 'Nếu gặp lỗi mất tiến trình hoặc cần hỗ trợ, hãy gửi yêu cầu kèm đạo hiệu và thời điểm xảy ra. Hộp thư này dùng để phản hồi các trường hợp cá nhân; không chứa mật khẩu hay token.',
    attachments: {}, ttlMs: null
  }
]);

const isPlain = v => !!v && typeof v === 'object' && !Array.isArray(v) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(v));
const onlyKeys = (body, allowed) => {
  if (!isPlain(body) || Object.keys(body).some(k => !allowed.includes(k)))
    throw new GameError('INVALID_REQUEST', 'Yêu cầu không hợp lệ.');
};
const int = v => {
  const n = Number(v);
  return Number.isSafeInteger(n) && n >= 0 ? n : 0;
};
const dayKey = now => new Date(now + TZ_OFFSET).toISOString().slice(0, 10);
const dayIndex = key => {
  const [y, m, d] = key.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY);
};
const resetAt = now => (Math.floor((now + TZ_OFFSET) / DAY) + 1) * DAY - TZ_OFFSET;
const digest = text => crypto.createHash('sha256').update(text).digest('hex');

function pickQuests(ownerId, day) {
  return QUEST_POOL
    .map(q => ({ id: q.id, score: digest(ownerId + '|' + day + '|' + q.id) }))
    .sort((a, b) => a.score < b.score ? -1 : a.score > b.score ? 1 : 0)
    .slice(0, DAILY_TARGET)
    .map(x => x.id);
}

function progressOf(state) {
  const p = state?.progress || {};
  return { kill: int(p.kill), meditate: int(p.meditate), travel: int(p.travel), breaks: int(p.breaks), alchemy: int(p.alchemy) };
}

function normalizeAttachments(raw) {
  const stone = int(raw?.stone);
  const items = {};
  if (raw?.items && typeof raw.items === 'object' && !Array.isArray(raw.items)) {
    for (const [key, qty] of Object.entries(raw.items)) {
      const n = int(qty);
      if (H.item(key) && n > 0) items[key] = Math.min(1e9, n);
    }
  }
  return { stone, items };
}
const hasAttachments = a => a.stone > 0 || Object.keys(a.items).length > 0;
const attachmentView = a => ({
  stone: a.stone,
  items: Object.entries(a.items).map(([key, qty]) => ({ key, name: H.item(key)?.name || key, qty }))
});
const rewardView = reward => ({
  stone: reward.stone,
  item: reward.item || null,
  itemName: reward.item ? H.item(reward.item)?.name || null : null,
  qty: reward.qty || 0
});

class DailyService {
  constructor({ repository, playerService = null, clock = Date.now, contentVersion = 'dev', config = {} } = {}) {
    if (!repository) throw Error('DailyService cần repository.');
    this.repo = repository;
    this.clock = clock;
    this.contentVersion = contentVersion;
    this.maxStateBytes = config.maxStateBytes || playerService?.cfg?.maxStateBytes || 65536;
    this.receiptTtlMs = config.receiptTtlMs || 7 * DAY;
  }

  /* Đọc nhiệm vụ hôm nay. Lần đầu trong ngày (hoặc sau khi đổi nhân vật) sẽ
     ghi baseline hiện tại; không cộng tiến trình offline. */
  async daily(ownerId) {
    const now = this.clock();
    const out = await this.repo.accountTransact(ownerId, async tx => {
      const player = tx.player;
      const state = player ? this.#state(player, now) : null;
      this.#normalizeDaily(tx.doc, ownerId, player, state, now);
      const mailRows = await this.#ensureMail(tx, now);
      return {
        doc: tx.doc,
        value: {
          daily: this.#dailyView(tx.doc, state, now),
          mail: this.#mailSummary(mailRows, now),
          state,
          revision: player?.revision ?? null
        }
      };
    }, { now });
    return this.#response({ now, ...out });
  }

  /* Hộp thư đầy đủ; gieo thư mẫu nếu chưa có. */
  async mail(ownerId) {
    const now = this.clock();
    const out = await this.repo.accountTransact(ownerId, async tx => {
      const player = tx.player;
      const state = player ? this.#state(player, now) : null;
      this.#normalizeDaily(tx.doc, ownerId, player, state, now);
      const rows = await this.#ensureMail(tx, now);
      return {
        doc: tx.doc,
        value: {
          mail: this.#mailView(rows, now),
          daily: this.#dailyView(tx.doc, state, now),
          state,
          revision: player?.revision ?? null
        }
      };
    }, { now });
    return this.#response({ now, ...out });
  }

  async claimQuest(ownerId, body) {
    onlyKeys(body, ['requestId', 'questId']);
    if (typeof body.requestId !== 'string' || !REQUEST_ID.test(body.requestId))
      throw new GameError('INVALID_REQUEST', 'requestId không hợp lệ.');
    if (typeof body.questId !== 'string' || !Object.hasOwn(QUEST_BY_ID, body.questId))
      throw new GameError('INVALID_REQUEST', 'Nhiệm vụ không hợp lệ.');

    const now = this.clock(), def = QUEST_BY_ID[body.questId];
    const fingerprint = 'daily:claim:' + body.questId;
    const out = await this.repo.accountTransact(ownerId, async tx => {
      const player = tx.player;
      if (!player) throw new GameError('PLAYER_NOT_FOUND', 'Không tìm thấy đạo thân.');
      const state = this.#state(player, now);
      this.#normalizeDaily(tx.doc, ownerId, player, state, now);

      const prior = await tx.receipt(body.requestId);
      if (prior) {
        if (prior.fingerprint !== fingerprint)
          throw new GameError('REQUEST_ID_REUSED', 'requestId này đã dùng cho giao dịch khác.');
        return { value: {
          replayed: true,
          result: prior.response?.result ?? null,
          state, revision: player.revision,
          daily: this.#dailyView(tx.doc, state, now),
          mail: this.#mailSummary(await tx.mail.list(), now)
        } };
      }

      const d = tx.doc.daily;
      if (!d.questIds.includes(def.id))
        throw new GameError('GAME_RULE_VIOLATION', 'Nhiệm vụ này không có trong hôm nay.');
      if (d.claimed.includes(def.id))
        throw new GameError('GAME_RULE_VIOLATION', 'Nhiệm vụ này đã nhận thưởng.');
      const progress = progressOf(state);
      const value = Math.max(0, (progress[def.counter] || 0) - int(d.baseline[def.counter]));
      if (value < def.target)
        throw new GameError('GAME_RULE_VIOLATION', 'Chưa đủ tiến độ nhiệm vụ.');

      this.#grant(state, { stone: def.stone, items: def.item ? { [def.item]: def.qty } : {} });
      d.claimed = [...new Set([...d.claimed, def.id])];
      const save = this.#savePlayer(player, state);
      const result = { questId: def.id, reward: rewardView(def) };
      return {
        doc: tx.doc,
        save,
        receipt: {
          requestId: body.requestId, fingerprint, revision: save.revision,
          response: { result }, expiresAt: now + this.receiptTtlMs
        },
        value: {
          replayed: false, result, state, revision: save.revision,
          daily: this.#dailyView(tx.doc, state, now),
          mail: this.#mailSummary(await tx.mail.list(), now)
        }
      };
    }, { now });
    return this.#response({ now, ...out });
  }

  async checkIn(ownerId, body) {
    onlyKeys(body, ['requestId']);
    if (typeof body.requestId !== 'string' || !REQUEST_ID.test(body.requestId))
      throw new GameError('INVALID_REQUEST', 'requestId không hợp lệ.');

    const now = this.clock(), fingerprint = 'daily:checkin';
    const out = await this.repo.accountTransact(ownerId, async tx => {
      const player = tx.player;
      if (!player) throw new GameError('PLAYER_NOT_FOUND', 'Không tìm thấy đạo thân.');
      const state = this.#state(player, now);
      this.#normalizeDaily(tx.doc, ownerId, player, state, now);

      const prior = await tx.receipt(body.requestId);
      if (prior) {
        if (prior.fingerprint !== fingerprint)
          throw new GameError('REQUEST_ID_REUSED', 'requestId này đã dùng cho giao dịch khác.');
        return { value: {
          replayed: true,
          result: prior.response?.result ?? null,
          state, revision: player.revision,
          daily: this.#dailyView(tx.doc, state, now),
          mail: this.#mailSummary(await tx.mail.list(), now)
        } };
      }

      const checkin = tx.doc.checkin, today = dayKey(now);
      if (checkin.lastDay === today) {
        return { value: {
          replayed: true, already: true,
          result: { already: true, streak: checkin.streak },
          state, revision: player.revision,
          daily: this.#dailyView(tx.doc, state, now),
          mail: this.#mailSummary(await tx.mail.list(), now)
        } };
      }

      const gap = checkin.lastDay ? dayIndex(today) - dayIndex(checkin.lastDay) : null;
      const streak = gap === 1 ? (checkin.streak % 7) + 1 : 1;
      const reward = CHECKIN_REWARDS[streak - 1];
      this.#grant(state, { stone: reward.stone, items: reward.item ? { [reward.item]: reward.qty } : {} });
      tx.doc.checkin = { streak, lastDay: today };
      const save = this.#savePlayer(player, state);
      const result = { day: streak, streak, reward: rewardView(reward) };
      return {
        doc: tx.doc,
        save,
        receipt: {
          requestId: body.requestId, fingerprint, revision: save.revision,
          response: { result }, expiresAt: now + this.receiptTtlMs
        },
        value: {
          replayed: false, result, state, revision: save.revision,
          daily: this.#dailyView(tx.doc, state, now),
          mail: this.#mailSummary(await tx.mail.list(), now)
        }
      };
    }, { now });
    return this.#response({ now, ...out });
  }

  async claimMail(ownerId, body) {
    onlyKeys(body, ['requestId', 'mailId']);
    if (typeof body.requestId !== 'string' || !REQUEST_ID.test(body.requestId))
      throw new GameError('INVALID_REQUEST', 'requestId không hợp lệ.');
    if (typeof body.mailId !== 'string' || !body.mailId.length || body.mailId.length > 64)
      throw new GameError('INVALID_REQUEST', 'mailId không hợp lệ.');

    const now = this.clock(), fingerprint = 'mail:claim:' + body.mailId;
    const out = await this.repo.accountTransact(ownerId, async tx => {
      const player = tx.player;
      const state = player ? this.#state(player, now) : null;
      this.#normalizeDaily(tx.doc, ownerId, player, state, now);

      const prior = await tx.receipt(body.requestId);
      if (prior) {
        if (prior.fingerprint !== fingerprint)
          throw new GameError('REQUEST_ID_REUSED', 'requestId này đã dùng cho giao dịch khác.');
        return { value: {
          replayed: true,
          result: prior.response?.result ?? null,
          state, revision: player?.revision ?? null,
          mail: this.#mailView(await tx.mail.list(), now),
          daily: this.#dailyView(tx.doc, state, now)
        } };
      }

      const mail = (await tx.mail.list()).find(m => m.id === body.mailId);
      if (!mail) throw new GameError('NOT_FOUND', 'Không tìm thấy thư.');
      if (mail.claimedAt) throw new GameError('GAME_RULE_VIOLATION', 'Thư này đã nhận.');
      if (mail.expiresAt != null && mail.expiresAt <= now)
        throw new GameError('GAME_RULE_VIOLATION', 'Thư này đã hết hạn.');

      const attachments = normalizeAttachments(mail.attachments);
      const has = hasAttachments(attachments);
      if (has && !player) throw new GameError('PLAYER_NOT_FOUND', 'Không tìm thấy đạo thân.');
      if (!await tx.mail.claim(mail.id, now))
        throw new GameError('GAME_RULE_VIOLATION', 'Thư này đã nhận.');

      let save = null, revision = player?.revision ?? null;
      if (has) {
        this.#grant(state, attachments);
        save = this.#savePlayer(player, state);
        revision = save.revision;
      }
      const result = { mailId: mail.id, attachments: attachmentView(attachments) };
      return {
        doc: tx.doc,
        ...(save ? { save } : {}),
        receipt: {
          requestId: body.requestId, fingerprint, revision: revision ?? 0,
          response: { result }, expiresAt: now + this.receiptTtlMs
        },
        value: {
          replayed: false, result, state, revision,
          mail: this.#mailView(await tx.mail.list(), now),
          daily: this.#dailyView(tx.doc, state, now)
        }
      };
    }, { now });
    return this.#response({ now, ...out });
  }

  /* ---------- Nội bộ ---------- */
  #state(player, now) {
    if (player.schemaVersion === H.VERSION) return structuredClone(player.state);
    const migrated = H.normalize(player.state, now);
    if (!migrated) throw new GameError('STATE_CORRUPT', 'Trạng thái đạo thân không hợp lệ.');
    return migrated;
  }

  #normalizeDaily(doc, ownerId, player, state, now) {
    const day = dayKey(now);
    if (!isPlain(doc.checkin)) {
      doc.checkin = { streak: 0, lastDay: null };
    } else {
      const lastDay = typeof doc.checkin.lastDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(doc.checkin.lastDay)
        ? doc.checkin.lastDay : null;
      doc.checkin = { streak: Math.min(7, int(doc.checkin.streak)), lastDay };
    }
    if (!player) {
      doc.daily = null;
      return;
    }
    const progress = progressOf(state);
    const d = doc.daily;
    const valid = isPlain(d) && d.day === day && d.playerId === player.id &&
      Array.isArray(d.questIds) && d.questIds.length === DAILY_TARGET &&
      d.questIds.every(id => Object.hasOwn(QUEST_BY_ID, id)) &&
      isPlain(d.baseline) && Array.isArray(d.claimed);
    if (!valid) {
      doc.daily = {
        day, playerId: player.id,
        questIds: pickQuests(ownerId, day),
        baseline: progress,
        claimed: []
      };
      return;
    }
    d.claimed = [...new Set(d.claimed.filter(id => d.questIds.includes(id)))];
    d.baseline = progressOf({ progress: d.baseline });
  }

  #dailyView(doc, state, now) {
    const d = doc.daily;
    if (!d) return null;
    const progress = progressOf(state);
    const quests = d.questIds.map(id => {
      const def = QUEST_BY_ID[id];
      const value = Math.max(0, (progress[def.counter] || 0) - int(d.baseline[def.counter]));
      const claimed = d.claimed.includes(id);
      return {
        id, name: def.name, desc: def.desc, counter: def.counter, unit: def.unit,
        target: def.target, progress: Math.min(def.target, value),
        ready: !claimed && value >= def.target, claimed,
        reward: rewardView(def), go: def.go
      };
    });
    return {
      day: d.day, playerId: d.playerId, quests,
      total: quests.length, claimable: quests.filter(q => q.ready).length,
      checkin: this.#checkinView(doc, now, !!state)
    };
  }

  #checkinView(doc, now, hasPlayer) {
    const today = dayKey(now), c = doc.checkin;
    const checkedToday = c.lastDay === today;
    let nextStreak;
    if (checkedToday) nextStreak = (c.streak % 7) + 1;
    else if (c.lastDay && dayIndex(today) - dayIndex(c.lastDay) === 1) nextStreak = (c.streak % 7) + 1;
    else nextStreak = 1;
    return {
      streak: c.streak, lastDay: c.lastDay, today, checkedToday,
      canCheckIn: !checkedToday && hasPlayer, nextStreak,
      rewards: CHECKIN_REWARDS.map((reward, i) => ({
        day: i + 1, ...rewardView(reward),
        current: checkedToday && c.streak === i + 1,
        next: !checkedToday && nextStreak === i + 1
      }))
    };
  }

  async #ensureMail(tx, now) {
    const existing = await tx.mail.list();
    const seeds = new Set(existing.map(m => m.seedKey).filter(Boolean));
    const inserts = MAIL_SEEDS
      .map((seed, index) => ({ seed, index }))
      .filter(({ seed }) => !seeds.has(seed.seedKey))
      .map(({ seed, index }) => ({
        id: crypto.randomUUID(), seedKey: seed.seedKey, kind: seed.kind,
        title: seed.title, body: seed.body, attachments: seed.attachments,
        createdAt: now - index * 1000,
        expiresAt: seed.ttlMs == null ? null : now + seed.ttlMs
      }));
    if (inserts.length) await tx.mail.insert(inserts);
    return inserts.length ? tx.mail.list() : existing;
  }

  #mailSummary(rows, now) {
    const view = this.#mailView(rows, now);
    return { total: view.total, unread: view.unread, claimable: view.claimable };
  }

  #mailView(rows, now) {
    const items = rows.map(mail => {
      const attachments = normalizeAttachments(mail.attachments);
      const expired = mail.expiresAt != null && mail.expiresAt <= now;
      return {
        id: mail.id, kind: mail.kind, title: mail.title, body: mail.body,
        attachments: attachmentView(attachments),
        hasAttachments: hasAttachments(attachments),
        createdAt: mail.createdAt, expiresAt: mail.expiresAt, claimedAt: mail.claimedAt,
        expired, claimable: !mail.claimedAt && !expired
      };
    });
    return {
      items, total: items.length,
      unread: items.filter(m => !m.claimedAt).length,
      claimable: items.filter(m => m.claimable && m.hasAttachments).length
    };
  }

  #grant(state, attachments) {
    const a = normalizeAttachments(attachments);
    if (a.stone > 0) {
      if (!Number.isFinite(state.stone)) throw new GameError('STATE_CORRUPT', 'Tài nguyên đạo thân không hợp lệ.');
      state.stone = Math.min(Number.MAX_SAFE_INTEGER, Math.floor(state.stone) + a.stone);
    }
    if (Object.keys(a.items).length) {
      if (!isPlain(state.bag)) state.bag = {};
      const game = new H.Game(state);
      for (const [key, qty] of Object.entries(a.items)) game.add(key, qty);
    }
  }

  #savePlayer(player, state) {
    assertStateSafe(state, this.maxStateBytes);
    return {
      state, revision: player.revision + 1, rngCounter: player.rngCounter,
      schemaVersion: H.VERSION, contentVersion: this.contentVersion
    };
  }

  #response({ now, daily, mail, state = null, revision = null, result, replayed = false, already = false }) {
    const out = {
      protocolVersion: C.VERSION, schemaVersion: H.VERSION, contentVersion: this.contentVersion,
      serverTime: now, resetAt: resetAt(now)
    };
    if (daily !== undefined) out.daily = daily;
    if (mail !== undefined) out.mail = mail;
    if (state) {
      out.revision = revision;
      out.state = snapshot(state);
      out.died = new H.Game(state).isDead();
    }
    if (result !== undefined) out.result = result;
    if (replayed) out.replayed = true;
    if (already) out.already = true;
    return out;
  }
}

module.exports = { DailyService, QUEST_POOL, CHECKIN_REWARDS, dayKey, pickQuests, resetAt };
