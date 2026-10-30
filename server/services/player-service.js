/* PlayerService: điều phối createPlayer / sync / command trên engine dùng chung (docs/backend-knowledge.md §2–5).

   Phụ thuộc (tiêm vào để test được với engine giả):
     repository  hợp đồng ở server/repositories/player-repository.js
     engine      { READY, MISSING, Game, createCharacter(profile, now, rng) }
                 Game: new Game(state, rng, onLog), advance(now, offline), isDead(), checkMeta()
     protocol    { validate({type,payload}), execute(game, command, now) }
     clock, rng  do server cấp; client không bao giờ gửi `now` hay RNG.

   Bảo đảm cho mỗi lệnh:
     - Idempotent: cùng requestId + cùng nội dung → trả kết quả cũ (replayed), không áp dụng lại.
       Cùng requestId khác nội dung → IDEMPOTENCY_KEY_REUSED. Lệnh bị từ chối KHÔNG lưu receipt.
     - Revision: expectedRevision lệch revision hiện tại → REVISION_CONFLICT, không đổi gì.
     - Nguyên tử: advance + execute + revision + receipt + outbox cùng commit, hoặc không gì cả.
     - Đồng hồ server, không lùi: now = max(clock(), state.lastUpdate).
   sync() đẩy tiến trình theo thời gian (bế quan) nhưng KHÔNG tăng revision: revision chỉ đếm ý định của người chơi,
   tránh xung đột giả giữa hai thiết bị cùng sync. */
'use strict';
const { AppError, badRequest, conflict, unprocessable, engineNotReady } = require('../http/errors.js');
const { stableStringify, sha256Hex, secureRandom, redact } = require('../lib/util.js');

const REQUEST_ID = /^[A-Za-z0-9_-]{8,64}$/;
const ENVELOPE_KEYS = ['requestId', 'expectedRevision', 'type', 'payload'];
/* Lỗi lập trình của engine/server: không được gán nhãn là "vi phạm luật" hay lộ nội dung cho client. */
const BUG_TYPES = [TypeError, RangeError, ReferenceError, SyntaxError, EvalError];

const isObject = v => v && typeof v === 'object' && !Array.isArray(v);

class PlayerService {
  constructor({ repository, engine, protocol, clock = Date.now, rng = secureRandom, receiptTtlMs = 72 * 3600 * 1000, offlineThresholdMs = 15000, secretKeys } = {}) {
    if (!repository || !engine || !protocol) throw Error('PlayerService cần repository, engine và protocol.');
    Object.assign(this, { repository, engine, protocol, clock, rng, receiptTtlMs, offlineThresholdMs, secretKeys });
  }

  assertReady() {
    if (!this.engine.READY) throw engineNotReady(this.engine.MISSING?.length ?? null);
  }

  snapshot(state) { return redact(state, this.secretKeys); }

  /* Tạo nhân vật. Cùng requestId gọi lại → trả bản đã tạo (không tạo hai lần); requestId khác khi đã có → PLAYER_EXISTS. */
  async createPlayer(playerId, body) {
    this.assertReady();
    if (!isObject(body) || !REQUEST_ID.test(body.requestId) || !isObject(body.profile)) throw badRequest('Cần requestId hợp lệ và profile.');
    const existing = await this.repository.get(playerId);
    if (existing) return this.#replayCreate(existing, body.requestId);
    const now = this.clock();
    let state;
    try { state = this.engine.createCharacter(body.profile, now, this.rng); } catch (e) { throw this.#classify(e); }
    try {
      await this.repository.create(playerId, { state, revision: 1, receipts: {}, createRequestId: body.requestId });
    } catch (e) {
      if (e.code === 'PLAYER_EXISTS') return this.#replayCreate(await this.repository.get(playerId), body.requestId); // tạo song song
      throw e;
    }
    return { revision: 1, replayed: false, state: this.snapshot(state) };
  }

  #replayCreate(record, requestId) {
    if (record.createRequestId !== requestId) throw conflict('PLAYER_EXISTS', 'Tài khoản này đã có nhân vật.');
    return { revision: record.revision, replayed: true, state: this.snapshot(record.state) };
  }

  /* Đưa nhân vật tới thời điểm hiện tại theo đồng hồ server và trả snapshot. */
  async sync(playerId) {
    this.assertReady();
    try {
      return await this.repository.transact(playerId, async record => {
        const run = this.#advance(record);
        return { revision: record.revision, dead: run.dead, logs: run.logs, achievements: run.achievements, state: this.snapshot(record.state) };
      });
    } catch (e) { throw this.#classify(e); }
  }

  /* envelope = { requestId, expectedRevision, type, payload } */
  async command(playerId, envelope) {
    this.assertReady();
    const { requestId, expectedRevision, command } = this.#parseEnvelope(envelope);
    const fingerprint = sha256Hex(stableStringify(command));
    try {
      return await this.repository.transact(playerId, async record => {
        const now = this.clock();
        this.#pruneReceipts(record, now);

        const prior = record.receipts[requestId];
        if (prior) {
          if (prior.fingerprint !== fingerprint) throw conflict('IDEMPOTENCY_KEY_REUSED', 'requestId này đã dùng cho một lệnh khác.');
          return { ...prior.result, replayed: true, state: this.snapshot(record.state) };
        }
        if (expectedRevision !== record.revision) {
          throw conflict('REVISION_CONFLICT', 'Trạng thái đã thay đổi, hãy đồng bộ lại.', { currentRevision: record.revision });
        }

        const run = this.#advance(record);
        const game = run.game;
        const outcome = this.protocol.execute(game, command, record.state.lastUpdate ?? now);
        const achievements = [...run.achievements, ...(game.checkMeta?.() ?? [])];

        record.state = game.s;
        record.revision += 1;
        record.events.push({ type: 'command.applied', payload: { type: command.type, revision: record.revision } });
        for (const a of achievements) record.events.push({ type: 'meta.achievement', payload: { achievement: a, revision: record.revision } });

        const result = { revision: record.revision, requestId, outcome: outcome ?? null, logs: run.logs, achievements, dead: game.isDead() };
        record.receipts[requestId] = { fingerprint, result, at: now };
        return { ...result, replayed: false, state: this.snapshot(record.state) };
      });
    } catch (e) { throw this.#classify(e); }
  }

  /* Tiến state tới now (đồng hồ server, không lùi). Trả game đang giữ state của record. */
  #advance(record) {
    const state = record.state;
    const logs = [];
    const game = new this.engine.Game(state, this.rng, message => logs.push(message));
    const achievements = [];
    if (state.created) {
      const now = Math.max(this.clock(), state.lastUpdate ?? 0);
      const offline = now - (state.lastUpdate ?? now) > this.offlineThresholdMs;
      game.advance(now, offline);
      achievements.push(...(game.checkMeta?.() ?? []));
    }
    record.state = game.s;
    return { game, logs, achievements, dead: !!state.created && game.isDead() };
  }

  #parseEnvelope(envelope) {
    if (!isObject(envelope) || Object.keys(envelope).some(k => !ENVELOPE_KEYS.includes(k))) throw badRequest('Phong bì lệnh không hợp lệ.');
    const { requestId, expectedRevision, type, payload } = envelope;
    if (typeof requestId !== 'string' || !REQUEST_ID.test(requestId)) throw badRequest('requestId phải dài 8–64 ký tự chữ, số, gạch ngang hoặc gạch dưới.');
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw badRequest('expectedRevision phải là số nguyên không âm.');
    let command;
    try { command = this.protocol.validate({ type, payload }); } catch (e) { throw this.#classify(e); }
    return { requestId, expectedRevision, command };
  }

  #pruneReceipts(record, now) {
    for (const [id, receipt] of Object.entries(record.receipts)) if (now - receipt.at > this.receiptTtlMs) delete record.receipts[id];
  }

  /* AppError giữ nguyên; lỗi lập trình → 500 (không lộ); lỗi luật tiếng Việt từ engine → 422. */
  #classify(e) {
    if (e instanceof AppError) return e;
    if (e?.code === 'INVALID_COMMAND') return unprocessable('INVALID_COMMAND', e.message);
    if (e?.code === 'NOT_IMPLEMENTED') return engineNotReady(this.engine.MISSING?.length ?? null);
    if (!(e instanceof Error) || BUG_TYPES.some(T => e instanceof T) || e.code) return e;
    return unprocessable('GAME_RULE_VIOLATION', e.message);
  }
}

module.exports = { PlayerService };
