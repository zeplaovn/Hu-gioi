/* PlayerService — gameplay server-authoritative (docs/backend-plan.md §3.3, §7).
   Client chỉ gửi ý định (type + payload); đồng hồ, RNG, thời gian bế quan và phần thưởng do máy chủ quyết định.
   Mỗi lệnh là một giao dịch: khóa người chơi → kiểm receipt (idempotent) → kiểm revision → advance(now) → execute → ghi.
   Engine chạy cùng luật với client (engine/), không sao chép công thức sang backend. */
'use strict';
const crypto = require('node:crypto');
const H = require('../../engine/game.js');
const C = require('../../engine/protocol/commands.js');
const { GameError } = require('../errors.js');

const DAY = 24 * 3600 * 1000;
const DEFAULTS = Object.freeze({
  onlineGraceMs: 300000,     // quá ngưỡng này kể từ lần thấy gần nhất → tính là offline (cap + hiệu suất offline)
  receiptTtlMs: 7 * DAY,
  ticketTtlMs: 10 * 60000,
  previewsPerDay: 5,
  nextSyncInMs: 30000,
  maxStateBytes: 65536
});
const REQUEST_ID = /^[A-Za-z0-9_-]{1,128}$/;
const isPlain = v => !!v && typeof v === 'object' && !Array.isArray(v) && [Object.prototype, null].includes(Object.getPrototypeOf(v));
const invalid = (code, message) => new GameError(code, message);

/* RNG bảo mật cho gieo hồ sơ; RNG theo người chơi: HMAC(seed, counter) nên không đoán được và tái lập được khi điều tra. */
const secureRng = () => crypto.randomBytes(6).readUIntBE(0, 6) / 2 ** 48;
function seededRng(seedHex, counter) {
  const key = Buffer.from(seedHex, 'hex');
  let n = counter;
  const rng = () => crypto.createHmac('sha256', key).update(String(n++)).digest().readUIntBE(0, 6) / 2 ** 48;
  rng.counter = () => n;
  return rng;
}

/* JSON ổn định (khóa sắp xếp) để băm dấu vân tay lệnh. */
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
const fingerprintOf = command => crypto.createHash('sha256').update(canonical(command)).digest('hex');
const clean = v => v === undefined ? null : JSON.parse(JSON.stringify(v));

/* Bản gửi client: bỏ mọi trường chỉ máy chủ được biết (seed bí cảnh). */
function snapshot(state) {
  const s = structuredClone(state);
  if (s.dungeon?.active) delete s.dungeon.active.seed;
  return s;
}

/* State phải là JSON an toàn (không NaN/Infinity/undefined/hàm) và không vượt giới hạn kích thước. */
function assertStateSafe(state, maxBytes) {
  const walk = (v, depth) => {
    if (depth > 24) return false;
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return true;
    if (typeof v === 'number') return Number.isFinite(v);
    if (Array.isArray(v)) return v.every(x => walk(x, depth + 1));
    if (isPlain(v)) return Object.values(v).every(x => walk(x, depth + 1));
    return false;
  };
  if (!walk(state, 0) || Buffer.byteLength(JSON.stringify(state)) > maxBytes) throw new GameError('STATE_CORRUPT', 'Trạng thái đạo thân không hợp lệ.');
}

function classify(err) {
  if (err instanceof GameError) return err;
  if (err?.code === 'INVALID_COMMAND') return new GameError('INVALID_COMMAND', 'Lệnh game không hợp lệ.');
  if (err?.code === 'NOT_IMPLEMENTED') return new GameError('NOT_IMPLEMENTED', 'Lệnh này chưa được hỗ trợ.');
  /* Luật game từ chối bằng Error thường (thông báo tiếng Việt); TypeError, RangeError... là lỗi lập trình. */
  if (err && Object.getPrototypeOf(err) === Error.prototype && !err.code) return new GameError('GAME_RULE_VIOLATION', err.message);
  const wrapped = new GameError('INTERNAL', 'Máy chủ đang gặp lỗi.');
  wrapped.cause = err;
  return wrapped;
}

function onlyKeys(body, allowed) {
  if (!isPlain(body) || Object.keys(body).some(k => !allowed.includes(k))) throw invalid('INVALID_REQUEST', 'Yêu cầu không hợp lệ.');
}

class PlayerService {
  constructor({ repository, clock = Date.now, contentVersion = 'dev', config = {}, onError = err => console.error('[player-service]', err.stack || err) } = {}) {
    if (!repository) throw Error('PlayerService cần repository.');
    if (!H.READY) throw Error('Engine chưa READY: ' + H.MISSING.join(', '));
    this.repo = repository;
    this.clock = clock;
    this.contentVersion = contentVersion;
    this.cfg = { ...DEFAULTS, ...config };
    this.onError = onError;
  }

  /* Tọa hóa thực: chỉ người sở hữu có nhân vật đã hết thọ nguyên mới có thể xóa để tạo lại. */
  resetAfterDeath(ownerId, playerId) {
    const rec = this.#own(this.repo.get(playerId), ownerId);
    if (!new H.Game(this.#state(rec, this.clock())).isDead())
      throw new GameError('GAME_RULE_VIOLATION', 'Đạo thân chưa tọa hóa.');
    return this.repo.deletePlayer(ownerId, playerId);
  }

  /* ---------- Truy vấn ---------- */
  bootstrap(ownerId) {
    const rec = this.repo.getByOwner(ownerId);
    return {
      protocolVersion: C.VERSION, schemaVersion: H.VERSION, contentVersion: this.contentVersion, serverTime: this.clock(),
      player: rec ? { id: rec.id, name: rec.name, revision: rec.revision } : null,
      previewsPerDay: this.cfg.previewsPerDay
    };
  }

  /* Đọc không catch-up, không ghi: dùng để hiển thị lại sau khi tải trang. */
  state(ownerId, playerId) {
    const now = this.clock(), rec = this.#own(this.repo.get(playerId), ownerId);
    const state = this.#state(rec, now);
    return this.#response({ rec, revision: rec.revision, now, state, died: new H.Game(state).isDead() });
  }

  /* ---------- Tạo nhân vật ---------- */
  previewCreation(ownerId) {
    const now = this.clock();
    if (this.repo.getByOwner(ownerId)) throw new GameError('PLAYER_EXISTS', 'Tài khoản đã có đạo thân.');
    const race = H.rollRace(secureRng), age = 14 + Math.floor(secureRng() * 17);
    const preview = { age, race, ...H.rollRoots(secureRng) };
    const t = this.repo.issueTicket(ownerId, preview, { now, ttlMs: this.cfg.ticketTtlMs, dailyLimit: this.cfg.previewsPerDay });
    if (t.limited) throw new GameError('RATE_LIMITED', 'Hôm nay đã gieo quá nhiều lần.', { retryAfterMs: t.retryAfterMs });
    return { ticketId: t.id, expiresAt: t.expiresAt, rollsLeft: t.rollsLeft, preview };
  }

  /* age, race, linh căn lấy từ ticket do máy chủ gieo; client chỉ chọn đạo hiệu, giới tính và thiên phú. */
  createPlayer(ownerId, body) {
    onlyKeys(body, ['ticketId', 'name', 'gender', 'talent']);
    if (typeof body.ticketId !== 'string' || body.ticketId.length > 64) throw invalid('INVALID_REQUEST', 'Thiếu phiếu khởi nguyên.');
    if (body.talent !== undefined && !isPlain(body.talent)) throw invalid('INVALID_PROFILE', 'Thiên phú không hợp lệ.');
    const now = this.clock();
    const rec = this.repo.createWithTicket({
      ownerId, ticketId: body.ticketId, now,
      build: preview => {
        const seed = crypto.randomBytes(32).toString('hex'), rng = seededRng(seed, 0);
        let state;
        try { state = H.createCharacter({ ...preview, name: body.name, gender: body.gender, talent: body.talent }, now, rng); }
        catch (err) { throw invalid('INVALID_PROFILE', err.message); }
        assertStateSafe(state, this.cfg.maxStateBytes);
        return { name: state.name, state, schemaVersion: H.VERSION, contentVersion: this.contentVersion, rngSeed: seed, rngCounter: rng.counter() };
      }
    });
    return { ...this.#response({ rec, revision: rec.revision, now, state: rec.state, logs: rec.state.logs.slice(0, 2) }), playerId: rec.id };
  }

  /* ---------- Đồng bộ (catch-up bế quan) ---------- */
  sync(ownerId, playerId, body = {}) {
    onlyKeys(body, ['lastRevision']);
    if (body.lastRevision !== undefined && !(Number.isSafeInteger(body.lastRevision) && body.lastRevision >= 0)) throw invalid('INVALID_REQUEST', 'lastRevision không hợp lệ.');
    const now = this.clock();
    const out = this.repo.transact(playerId, tx => {
      const rec = this.#own(tx.record, ownerId);
      const before = JSON.stringify(rec.state);
      const run = this.#run(rec, now);
      let report, achievements = [];
      try {
        report = run.game.advance(now, run.offline);
        achievements = run.game.checkMeta(now);
      } catch (err) {
        const e = classify(err);
        if (e.code === 'INTERNAL') this.onError(err);
        return { touch: { rngCounter: rec.rngCounter, lastSeenAt: now }, value: { error: e } };
      }
      const changed = JSON.stringify(run.game.s) !== before, revision = rec.revision + (changed ? 1 : 0);
      assertStateSafe(run.game.s, this.cfg.maxStateBytes);
      return {
        save: { state: run.game.s, revision, rngCounter: run.rng.counter(), lastSeenAt: now, schemaVersion: H.VERSION, contentVersion: this.contentVersion },
        value: { rec, state: run.game.s, revision, report, achievements: clean(achievements), logs: run.logs, died: run.game.isDead() }
      };
    });
    if (out.error) throw out.error;
    return this.#response({ rec: out.rec, revision: out.revision, now, state: out.state, report: out.report, logs: out.logs, achievements: out.achievements, died: out.died });
  }

  /* ---------- Lệnh gameplay ---------- */
  command(ownerId, playerId, body) {
    const { requestId, expectedRevision, command } = this.#envelope(body);
    const fingerprint = fingerprintOf(command), now = this.clock();
    const out = this.repo.transact(playerId, tx => {
      const rec = this.#own(tx.record, ownerId);
      const prior = tx.receipt(requestId, now);
      if (prior) {
        if (prior.fingerprint !== fingerprint) throw new GameError('REQUEST_ID_REUSED', 'requestId này đã dùng cho lệnh khác.');
        return { value: { rec, state: rec.state, revision: rec.revision, replayed: prior.response, died: new H.Game(rec.state).isDead() } };
      }
      if (rec.revision !== expectedRevision) throw new GameError('REVISION_CONFLICT', 'Tiến trình đã thay đổi. Hãy đồng bộ lại.', { currentRevision: rec.revision });

      const run = this.#run(rec, now), save = revision => ({
        state: run.game.s, revision, rngCounter: run.rng.counter(), lastSeenAt: now, schemaVersion: H.VERSION, contentVersion: this.contentVersion
      });
      let report, result = null, achievements = [], failure = null;
      try {
        report = run.game.advance(now, run.offline);
        if (run.game.isDead() && command.type !== 'reincarnate') failure = new GameError('PLAYER_DEAD', 'Thọ nguyên đã cạn. Hãy chuyển thế.');
        else { result = C.execute(run.game, command, now); achievements = run.game.checkMeta(now); }
      } catch (err) { failure = classify(err); if (failure.code === 'INTERNAL') this.onError(err); }

      if (failure?.code === 'PLAYER_DEAD') { // phần catch-up đã xảy ra thật: ghi lại cái chết rồi mới báo lỗi
        assertStateSafe(run.game.s, this.cfg.maxStateBytes);
        failure.details = { currentRevision: rec.revision + 1, died: true };
        return { save: save(rec.revision + 1), value: { error: failure } };
      }
      if (failure) { // hoàn tác state, nhưng vẫn tiến bộ đếm RNG để không thể thử lại cùng kết quả ngẫu nhiên
        return { touch: { rngCounter: run.rng.counter(), lastSeenAt: now }, value: { error: failure } };
      }
      assertStateSafe(run.game.s, this.cfg.maxStateBytes);
      const revision = rec.revision + 1;
      const response = { serverTime: now, revision, result: clean(result), report: clean(report), logs: run.logs, achievements: clean(achievements), died: run.game.isDead() };
      return {
        save: save(revision),
        receipt: { requestId, fingerprint, revision, response, expiresAt: now + this.cfg.receiptTtlMs },
        value: { rec, state: run.game.s, revision, fresh: response }
      };
    });
    if (out.error) throw out.error;
    if (out.replayed) {
      const r = out.replayed;
      return this.#response({ rec: out.rec, revision: out.revision, now, state: out.state, result: r.result, report: r.report, logs: r.logs, achievements: r.achievements, died: out.died, replayed: true });
    }
    const r = out.fresh;
    return this.#response({ rec: out.rec, revision: out.revision, now, state: out.state, result: r.result, report: r.report, logs: r.logs, achievements: r.achievements, died: r.died });
  }

  /* ---------- Nội bộ ---------- */
  #own(rec, ownerId) {
    // Không phân biệt "không tồn tại" và "của người khác" để tránh dò ID.
    if (!rec || rec.ownerId !== ownerId) throw new GameError('PLAYER_NOT_FOUND', 'Không tìm thấy đạo thân.');
    return rec;
  }
  #state(rec, now) {
    if (rec.schemaVersion === H.VERSION) return rec.state;
    const migrated = H.normalize(rec.state, now);
    if (!migrated) throw new GameError('STATE_CORRUPT', 'Trạng thái đạo thân không hợp lệ.');
    return migrated;
  }
  #run(rec, now) {
    const rng = seededRng(rec.rngSeed, rec.rngCounter), logs = [];
    return { rng, logs, game: new H.Game(this.#state(rec, now), rng, m => logs.push(m)), offline: now - rec.lastSeenAt > this.cfg.onlineGraceMs };
  }
  #envelope(body) {
    onlyKeys(body, ['protocolVersion', 'requestId', 'expectedRevision', 'type', 'payload']);
    if (body.protocolVersion !== C.VERSION) throw invalid('INVALID_REQUEST', 'Phiên bản giao thức không được hỗ trợ.');
    if (typeof body.requestId !== 'string' || !REQUEST_ID.test(body.requestId)) throw invalid('INVALID_REQUEST', 'requestId không hợp lệ.');
    if (!Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0) throw invalid('INVALID_REQUEST', 'expectedRevision không hợp lệ.');
    let command;
    try { command = C.validate({ type: body.type, payload: body.payload }); }
    catch { throw invalid('INVALID_COMMAND', 'Lệnh game không hợp lệ.'); }
    return { requestId: body.requestId, expectedRevision: body.expectedRevision, command };
  }
  #response({ rec, revision, now, state, result = null, report = null, logs = [], achievements = [], died = false, replayed = false }) {
    return {
      protocolVersion: C.VERSION, revision, serverTime: now, schemaVersion: H.VERSION, contentVersion: this.contentVersion,
      state: snapshot(state), result, report, logs, achievements, died, replayed, nextSyncInMs: this.cfg.nextSyncInMs
    };
  }
}
module.exports = { PlayerService, snapshot, seededRng, canonical, assertStateSafe };
