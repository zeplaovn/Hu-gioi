/* PlayerService — gameplay server-authoritative (backend-plan cũ @1bd987b §3.3, §7).
   Client chỉ gửi ý định (type + payload); đồng hồ, RNG, thời gian bế quan và phần thưởng do máy chủ quyết định.
   Mỗi lệnh là một giao dịch: khóa người chơi → kiểm receipt (idempotent) → kiểm revision → advance(now) → execute → ghi.
   Engine chạy cùng luật với client (engine/), không sao chép công thức sang backend. */
'use strict';
const crypto = require('node:crypto');
const H = require('../../engine/game.js');
const C = require('../../engine/protocol/commands.js');
const { GameError } = require('../errors.js');
const { SYNC_INTERVAL_MS, ONLINE_GRACE_MS } = require('../presence-config.js');

const DAY = 24 * 3600 * 1000;
const DEFAULTS = Object.freeze({
  onlineGraceMs: ONLINE_GRACE_MS,      // sau 15s không heartbeat từ JWT: không tính tiếp tiến trình (grace cho mạng trễ)
  receiptTtlMs: 7 * DAY,
  ticketTtlMs: 10 * 60000,
  previewsPerDay: 5,
  nextSyncInMs: SYNC_INTERVAL_MS,
  maxStateBytes: 65536
});
const ERASE_CONFIRMATION = 'delete-my-game-data';
const DELETE_ACCOUNT_CONFIRMATION = 'delete-my-account';
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
    if (this.cfg.onlineGraceMs < this.cfg.nextSyncInMs * 3)
      throw Error('onlineGraceMs phải >= 3 × nextSyncInMs.');
    this.onError = onError;
  }

  /* Tọa hóa thực: xóa được bất kỳ tử vong nào đã được engine xác nhận. */
  async resetAfterDeath(ownerId, playerId) {
    const rec = this.#own(await this.repo.get(playerId), ownerId);
    if (!new H.Game(this.#state(rec, this.clock())).isDead())
      throw new GameError('GAME_RULE_VIOLATION', 'Đạo thân chưa tọa hóa.');
    const deleted = await this.repo.deletePlayer(ownerId, playerId);
    return { ...deleted, pavilion: await this.repo.getPavilion(ownerId) };
  }

  /* Quyền truy cập dữ liệu: bản sao dữ liệu gameplay của chính tài khoản (không có seed RNG/seed bí cảnh). */
  async exportData(ownerId) {
    const data = await this.repo.exportOwnerData(ownerId);
    return {
      format: 'hu-gioi-data-export', exportedAt: this.clock(), accountId: ownerId, policyNote: 'Dữ liệu gameplay lưu trên máy chủ Hư Giới; dữ liệu đăng nhập do Supabase Auth quản lý riêng.',
      player: data?.player ? { ...data.player, state: snapshot(data.player.state) } : null,
      pendingCreationTickets: data?.tickets || 0, pavilion: data?.pavilion || await this.repo.getPavilion(ownerId)
    };
  }

  /* Quyền xóa dữ liệu: khác resetAfterDeath, không yêu cầu nhân vật đã tọa hóa. Cần xác nhận rõ ràng. */
  async eraseData(ownerId, body) {
    onlyKeys(body, ['confirm']);
    if (body.confirm !== ERASE_CONFIRMATION) throw invalid('INVALID_REQUEST', 'Cần xác nhận xóa dữ liệu.');
    return { erased: true, ...await this.repo.deleteOwnerData(ownerId) };
  }

  /* Xóa tài khoản: xóa dữ liệu gameplay trước (cục bộ, đáng tin), rồi xóa người dùng Supabase (kéo theo bản ghi chấp thuận).
     Nếu bước Supabase lỗi, dữ liệu gameplay đã xóa và người dùng có thể gọi lại; thao tác idempotent. */
  async deleteAccount(ownerId, body, accountAdmin) {
    onlyKeys(body, ['confirm']);
    if (body.confirm !== DELETE_ACCOUNT_CONFIRMATION) throw invalid('INVALID_REQUEST', 'Cần xác nhận xóa tài khoản.');
    if (!accountAdmin) throw new GameError('NOT_IMPLEMENTED', 'Máy chủ chưa bật xóa tài khoản tự động. Hãy gửi email yêu cầu.');
    const erased = await this.repo.deleteOwnerData(ownerId);
    await accountAdmin.deleteUser(ownerId);
    return { accountDeleted: true, ...erased };
  }

  /* ---------- Truy vấn ---------- */
  async bootstrap(ownerId) {
    const rec = await this.repo.getByOwner(ownerId);
    const now = this.clock(), pavilion = await this.repo.getPavilion(ownerId);
    // Trả snapshot đọc-thuần trong bootstrap để tránh thêm GET /state khi tải lại.
    // Không advance offline: chỉ sync/command đã khóa hàng mới thay đổi state.
    const snapshotData = rec ? await this.#response({
      rec, revision: rec.revision, now, state: this.#state(rec, now),
      died: new H.Game(rec.state).isDead(), pavilionView: pavilion
    }) : null;
    return {
      protocolVersion: C.VERSION, schemaVersion: H.VERSION, contentVersion: this.contentVersion, serverTime: now,
      player: rec ? { id: rec.id, name: rec.name, revision: rec.revision } : null,
      previewsPerDay: this.cfg.previewsPerDay, nextSyncInMs: this.cfg.nextSyncInMs,
      pavilion, snapshot: snapshotData
    };
  }

  /* Đọc không catch-up, không ghi: dùng để hiển thị lại sau khi tải trang. */
  async state(ownerId, playerId) {
    const now = this.clock(), rec = this.#own(await this.repo.get(playerId), ownerId);
    const state = this.#state(rec, now);
    return this.#response({ rec, revision: rec.revision, now, state, died: new H.Game(state).isDead() });
  }

  /* ---------- Tạo nhân vật ---------- */
  async previewCreation(ownerId) {
    const now = this.clock();
    if (await this.repo.getByOwner(ownerId)) throw new GameError('PLAYER_EXISTS', 'Tài khoản đã có đạo thân.');
    const race = H.rollRace(secureRng), age = 14 + Math.floor(secureRng() * 17);
    const preview = { age, race, ...H.rollRoots(secureRng) };
    const t = await this.repo.issueTicket(ownerId, preview, { now, ttlMs: this.cfg.ticketTtlMs, dailyLimit: this.cfg.previewsPerDay });
    if (t.limited) throw new GameError('RATE_LIMITED', 'Hôm nay đã gieo quá nhiều lần.', { retryAfterMs: t.retryAfterMs });
    return { ticketId: t.id, expiresAt: t.expiresAt, rollsLeft: t.rollsLeft, preview };
  }

  /* Tuổi/chủng tộc/linh căn từ ticket; tên, giới tính, thiên phú và 1 Thiên mệnh do client chọn. */
  async createPlayer(ownerId, body) {
    onlyKeys(body, ['ticketId', 'name', 'gender', 'talent', 'destiny']);
    if (typeof body.destiny !== 'string' || !Object.hasOwn(H.META_UPGRADES, body.destiny))
      throw invalid('INVALID_PROFILE', 'Hãy chọn một Thiên mệnh khởi nguyên hợp lệ.');
    if (typeof body.ticketId !== 'string' || body.ticketId.length > 64) throw invalid('INVALID_REQUEST', 'Thiếu phiếu khởi nguyên.');
    if (body.talent !== undefined && !isPlain(body.talent)) throw invalid('INVALID_PROFILE', 'Thiên phú không hợp lệ.');
    const now = this.clock();
    const rec = await this.repo.createWithTicket({
      ownerId, ticketId: body.ticketId, now,
      build: (preview, pavilion) => {
        const seed = crypto.randomBytes(32).toString('hex'), rng = seededRng(seed, 0);
        let state;
        try {
          state = H.createCharacter({ ...preview, name: body.name, gender: body.gender, talent: body.talent, destiny: body.destiny }, now, rng);
          H.applyPavilionOnCreate(state, pavilion.upgrades, pavilion.consumed);
        }
        catch (err) { throw invalid('INVALID_PROFILE', err.message); }
        assertStateSafe(state, this.cfg.maxStateBytes);
        return { name: state.name, state, schemaVersion: H.VERSION, contentVersion: this.contentVersion, rngSeed: seed, rngCounter: rng.counter() };
      }
    });
    return { ...await this.#response({ rec, revision: rec.revision, now, state: rec.state, logs: rec.state.logs.slice(0, 2) }), playerId: rec.id };
  }

  /* Mua tại Thiên Mệnh Các không dùng protocol command, vì đồng tiền thuộc tài khoản.
     Vẫn có idempotency, optimistic version và hàng đợi của RemoteSession. */
  async pavilionPurchase(ownerId, body) {
    onlyKeys(body, ['requestId', 'expectedVersion', 'kind', 'key']);
    if (typeof body.requestId !== 'string' || !REQUEST_ID.test(body.requestId) ||
      !Number.isSafeInteger(body.expectedVersion) || body.expectedVersion < 0 ||
      typeof body.key !== 'string' || typeof body.kind !== 'string')
      throw invalid('INVALID_REQUEST', 'Yêu cầu Thiên Mệnh Các không hợp lệ.');
    const now = this.clock();
    const out = await this.repo.purchasePavilion(ownerId, { ...body, now, catalog: H.PAVILION });
    if (out.record) {
      return this.#response({
        rec: out.record, revision: out.record.revision, now, state: out.record.state,
        result: { kind: body.kind, key: body.key, cost: out.cost ?? null },
        died: new H.Game(out.record.state).isDead(), replayed: out.replayed
      });
    }
    return { protocolVersion: C.VERSION, schemaVersion: H.VERSION, contentVersion: this.contentVersion,
      serverTime: now, pavilion: out.pavilion, result: { kind: body.kind, key: body.key, cost: out.cost ?? null }, replayed: out.replayed };
  }

  /* ---------- Đồng bộ: heartbeat JWT, tuyệt đối không tính thời gian offline ---------- */
  async sync(ownerId, playerId, body = {}) {
    onlyKeys(body, ['lastRevision']);
    if (body.lastRevision !== undefined && !(Number.isSafeInteger(body.lastRevision) && body.lastRevision >= 0)) throw invalid('INVALID_REQUEST', 'lastRevision không hợp lệ.');
    const now = this.clock();
    const out = await this.repo.transact(playerId, async tx => {
      const rec = this.#own(tx.record, ownerId);
      const before = JSON.stringify(rec.state);
      const at = this.#monotonic(rec, now), run = this.#run(rec, at);
      let report, achievements = [];
      try {
        if (run.game.isDead()) {
          if (!run.game.s.death) run.game.markDeath('lifespan', at);
          run.game.s.lastUpdate = at;
          report = { died: true, cause: run.game.s.death?.cause || 'lifespan' };
        } else {
          report = run.game.advance(at, run.offline);
          if (!run.game.isDead()) achievements = run.game.checkMeta(at);
        }
        run.game.s.presencePaused = false;
      } catch (err) {
        const e = classify(err);
        if (e.code === 'INTERNAL') this.onError(err);
        // Never advance lastSeenAt without committing state.lastUpdate:
        // on engine failure, discard partial changes and keep the old checkpoint.
        return { value: { error: e } };
      }
      const changed = JSON.stringify(run.game.s) !== before, revision = rec.revision + (changed ? 1 : 0);
      assertStateSafe(run.game.s, this.cfg.maxStateBytes);
      return {
        save: { state: run.game.s, revision, rngCounter: run.rng.counter(), lastSeenAt: at, schemaVersion: H.VERSION, contentVersion: this.contentVersion },
        value: { rec, state: run.game.s, revision, report, achievements: clean(achievements), logs: run.logs, died: run.game.isDead() }
      };
    }, this.#dbRate('sync', ownerId, now));
    if (out.error) throw out.error;
    return this.#response({ rec: out.rec, revision: out.revision, now, state: out.state, report: out.report, logs: out.logs, achievements: out.achievements, died: out.died });
  }

  /* Xác nhận ngừng chơi: tab ẩn/đóng. Đóng băng timers, kể cả khi quay lại ngay. */
  async pause(ownerId, playerId) {
    const now = this.clock();
    const out = await this.repo.transact(playerId, async tx => {
      const rec = this.#own(tx.record, ownerId);
      // Pause lặp lại không thay đổi gameplay: tránh ghi DB và tăng revision.
      // Khi trở lại sync, presencePaused vẫn buộc advance đóng băng toàn bộ thời gian ẩn.
      if (rec.state.presencePaused && rec.schemaVersion === H.VERSION)
        return { value: { rec, revision: rec.revision, state: rec.state } };
      const at = this.#monotonic(rec, now), run = this.#run(rec, at);
      if (!run.game.isDead()) run.game.advance(at, run.offline);
      else run.game.s.lastUpdate = at;
      run.game.s.presencePaused = true;
      assertStateSafe(run.game.s, this.cfg.maxStateBytes);
      const revision = rec.revision + 1;
      return {
        save: { state: run.game.s, revision, rngCounter: run.rng.counter(), lastSeenAt: at, schemaVersion: H.VERSION, contentVersion: this.contentVersion },
        value: { rec, revision, state: run.game.s }
      };
    }, this.#dbRate('pause', ownerId, now));
    return this.#response({ rec: out.rec, revision: out.revision, now, state: out.state, died: new H.Game(out.state).isDead() });
  }

  /* ---------- Lệnh gameplay ---------- */
  async command(ownerId, playerId, body) {
    const { requestId, expectedRevision, command } = this.#envelope(body);
    const fingerprint = fingerprintOf(command), now = this.clock();
    const out = await this.repo.transact(playerId, async tx => {
      const rec = this.#own(tx.record, ownerId);
      const prior = await tx.receipt(requestId, now);
      if (prior) {
        if (prior.fingerprint !== fingerprint) throw new GameError('REQUEST_ID_REUSED', 'requestId này đã dùng cho lệnh khác.');
        return { value: { rec, state: rec.state, revision: rec.revision, replayed: prior.response, died: new H.Game(rec.state).isDead() } };
      }
      if (rec.revision !== expectedRevision) throw new GameError('REVISION_CONFLICT', 'Tiến trình đã thay đổi. Hãy đồng bộ lại.', { currentRevision: rec.revision });

      const previousRealm = rec.state.realm;
      const at = this.#monotonic(rec, now), run = this.#run(rec, at), save = revision => ({
        state: run.game.s, revision, rngCounter: run.rng.counter(), lastSeenAt: at, schemaVersion: H.VERSION, contentVersion: this.contentVersion
      });
      let report, result = null, achievements = [], failure = null;
      // Chốt trạng thái sau advance, trước khi thực thi intent không đáng tin.
      let advancedState = null, advancedCounter = rec.rngCounter;
      try {
        if (run.game.isDead()) throw new GameError('PLAYER_DEAD', 'Đạo thân đã tọa hóa; hãy trở về Khởi Nguyên.');
        report = run.game.advance(at, run.offline);
        run.game.s.presencePaused = false;
        advancedState = JSON.stringify(run.game.s);
        advancedCounter = run.rng.counter();
        if (run.game.isDead()) {
          // Thọ nguyên cạn ngay trên heartbeat/lệnh: ghi chết và trả snapshot
          // thay vì ném lỗi làm trình duyệt không nhận kết quả.
          result = { died: true, cause: run.game.s.death?.cause || 'lifespan' };
        } else {
          result = C.execute(run.game, command, at);
          if (!run.game.isDead()) achievements = run.game.checkMeta(at);
        }
      } catch (err) { failure = classify(err); if (failure.code === 'INTERNAL') this.onError(err); }

      if (failure) {
        // Chỉ lưu state sau advance; mọi sửa đổi hoặc RNG từ lệnh bị từ chối đều bị loại.
        if (advancedState === null) return { value: { error: failure } };
        const preserved = JSON.parse(advancedState);
        if (advancedState !== JSON.stringify(rec.state)) {
          assertStateSafe(preserved, this.cfg.maxStateBytes);
          failure.details = { ...(failure.details || {}), currentRevision: rec.revision + 1 };
          return { save: {
            state: preserved, revision: rec.revision + 1, rngCounter: advancedCounter,
            lastSeenAt: at, schemaVersion: H.VERSION, contentVersion: this.contentVersion
          }, value: { error: failure } };
        }
        return { touch: { rngCounter: advancedCounter, lastSeenAt: at }, value: { error: failure } };
      }
      assertStateSafe(run.game.s, this.cfg.maxStateBytes);
      const earned = command.type === 'breakthrough' && result?.success && run.game.s.realm > previousRealm
        ? H.PAVILION.realmReward(run.game.s.realm)
        : command.type === 'fragments' && result === 10 ? 10 : 0;
      if (earned) {
        if (typeof result === 'object' && result !== null) result = { ...result, thienTinh: earned };
        // claimFragments vẫn trả số 10 theo protocol hiện có; không đổi dạng result.
        run.logs.push((command.type === 'fragments' ? 'Hợp nhất đạo ấn' : 'Đột phá đại cảnh giới') +
          ' · nhận +' + earned + ' Thiên Tinh.');
      }
      const revision = rec.revision + 1;
      const response = { serverTime: now, revision, result: clean(result), report: clean(report), logs: run.logs, achievements: clean(achievements), died: run.game.isDead() };
      return {
        save: save(revision), pavilionAward: earned,
        receipt: { requestId, fingerprint, revision, response, expiresAt: now + this.cfg.receiptTtlMs },
        value: { rec, state: run.game.s, revision, fresh: response }
      };
    }, this.#dbRate('command', ownerId, now));
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
  /* Đồng hồ giao dịch không được lùi. `now` được lấy trước khi giữ khóa hàng, nên có thể cũ hơn
     bản ghi mà request khác vừa commit; dùng nó trực tiếp sẽ lùi lastUpdate/lastSeenAt và lần sau
     cộng trùng khoảng bị chồng. Kẹp về mốc lớn nhất đã được ghi (chỉ làm chậm, không bao giờ cộng thêm). */
  #monotonic(rec, now) {
    const stamp = v => Number.isFinite(Number(v)) ? Number(v) : 0;
    return Math.max(now, stamp(rec.lastSeenAt), stamp(rec.state?.lastUpdate));
  }
  #state(rec, now) {
    if (rec.schemaVersion === H.VERSION) return rec.state;
    const migrated = H.normalize(rec.state, now);
    if (!migrated) throw new GameError('STATE_CORRUPT', 'Trạng thái đạo thân không hợp lệ.');
    return migrated;
  }
  #run(rec, now) {
    const rng = seededRng(rec.rngSeed, rec.rngCounter), logs = [];
    const state = structuredClone(this.#state(rec, now));
    return { rng, logs, game: new H.Game(state, rng, m => logs.push(m)), offline: !!state.presencePaused || now - rec.lastSeenAt > this.cfg.onlineGraceMs };
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
  #dbRate(key, ownerId, now) {
    if (!this.cfg.repositoryRates) return {};
    const rules = {
      sync: { capacity: 12, perMinute: 6 },
      pause: { capacity: 8, perMinute: 4 },
      command: { capacity: 30, perMinute: 600 }
    };
    return { rate: { ...rules[key], key, ownerId, now } };
  }
  async #response({ rec, revision, now, state, result = null, report = null, logs = [], achievements = [], died = false, replayed = false, pavilionView = null }) {
    return {
      protocolVersion: C.VERSION, revision, serverTime: now, schemaVersion: H.VERSION, contentVersion: this.contentVersion,
      state: snapshot(state), pavilion: pavilionView || await this.repo.getPavilion(rec.ownerId), result, report, logs, achievements, died, replayed, nextSyncInMs: this.cfg.nextSyncInMs
    };
  }
}
module.exports = { PlayerService, ERASE_CONFIRMATION, DELETE_ACCOUNT_CONFIRMATION, snapshot, seededRng, canonical, assertStateSafe };
