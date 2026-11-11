/* HƯ GIỚI · RemoteSession v1.
   Gameplay qua cấu hình /api/v1 (Node) hoặc Supabase Edge; trình duyệt giữ snapshot
   CHỈ ĐỌC để hiển thị. Mọi thay đổi kinh tế/thời gian/RNG do máy chủ quyết định. */
(function (root) {
  'use strict';
  const H = root.HU_GAME, C = root.HU_COMMANDS;
  const API = String(root.HU_API_BASE || '/api/v1').replace(/\/+$/, '');

  function endpoint() { return API; }

  // Safari cũ không có crypto.randomUUID() nhưng vẫn có getRandomValues().
  // Giữ UUID v4 theo CSPRNG; tuyệt đối không dùng Math.random cho idempotency.
  function secureRequestId() {
    const secure = root.crypto;
    if (typeof secure?.randomUUID === 'function') return secure.randomUUID();
    if (typeof secure?.getRandomValues !== 'function') throw Error('Trình duyệt không hỗ trợ mã giao dịch an toàn.');
    const bytes = new Uint8Array(16);
    secure.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
  }

  class RemoteSession {
    constructor({ fetchImpl = (...args) => root.fetch(...args), auth = root.HU_SUPABASE, clock = Date.now } = {}) {
      this.fetch = fetchImpl;
      this.auth = auth;
      this.clock = clock;
      this.game = new H.Game(H.create(clock()));
      this.accountId = null;
      this.playerId = null;
      this.revision = 0;
      this.ticket = null;
      this.pavilion = { version: 0, balance: 0, totalEarned: 0, rebirths: 0, upgrades: {}, relics: {} };
      this.serverContentVersion = '';
      this.listeners = new Set();
      this.achievements = [];
      this.pending = Promise.resolve();
      this.lastSyncAttempt = 0;
      this.lastSuccessfulCommandAt = 0;
      this.nextSyncInMs = Number.POSITIVE_INFINITY;
      this.syncInFlight = null;
    }
    get ready() { return !!this.accountId && !!this.playerId && !!this.game.s.created; }
    subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
    emit(event) { this.listeners.forEach(fn => fn(event)); }

    async request(path, method = 'GET', body, options = {}) {
      if (!this.auth?.accessToken) throw Error('Vui lòng đăng nhập để tiếp tục hành trình.');
      const accessToken = await this.auth.accessToken();
      if (!accessToken) throw Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
      // AbortSignal.timeout() không tồn tại trên Safari/iOS cũ: fallback
      // AbortController đảm bảo request vẫn chạy và có giới hạn thời gian.
      const timeoutSignal = root.AbortSignal;
      const controller = typeof timeoutSignal?.timeout === 'function' ? null
        : typeof root.AbortController === 'function' ? new root.AbortController() : null;
      const signal = controller?.signal || timeoutSignal?.timeout?.(20000);
      if (!signal) throw Error('Trình duyệt không hỗ trợ hủy yêu cầu mạng an toàn.');
      const deadline = controller ? root.setTimeout(() => controller.abort(), 20000) : null;
      let response;
      try {
        response = await this.fetch(endpoint() + path, {
          method, headers: {
            Authorization: 'Bearer ' + accessToken,
            ...(this.auth.publishableKey ? { apikey: this.auth.publishableKey } : {}),
            'Content-Type': 'application/json', Accept: 'application/json',
            ...(body?.requestId ? { 'X-Request-Id': body.requestId } : {})
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer',
          keepalive: options.keepalive === true,
          signal
        });
      } catch {
        throw Object.assign(Error('Không thể kết nối với trò chơi. Hãy kiểm tra mạng rồi thử lại.'), { code: 'NETWORK_UNAVAILABLE' });
      } finally {
        if (deadline !== null) root.clearTimeout(deadline);
      }
      let data;
      try { data = await response.json(); }
      catch { throw Object.assign(Error('Đã xảy ra sự cố kết nối. Vui lòng thử lại.'), { code: 'INVALID_RESPONSE' }); }
      if (!response.ok) {
        const info = data?.error || {};
        const error = Error(typeof info.message === 'string' ? info.message : 'Máy chủ game tạm thời không xử lý được yêu cầu.');
        error.code = info.code || 'HTTP_' + response.status;
        error.status = response.status;
        error.details = info.details;
        const rawRetry = response.headers?.get?.('retry-after') || '';
        const seconds = Number(rawRetry);
        const retryMs = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(rawRetry) - this.clock();
        error.retryAfterMs = Number.isFinite(retryMs) && retryMs > 0 ? Math.min(60000, retryMs) : 0;
        if (response.status === 401) error.message = 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.';
        else if (response.status === 429 && !info.message) error.message = 'Thao tác quá nhanh. Hãy thử lại sau.';
        else if (response.status >= 500) error.message = 'Máy chủ game tạm thời không khả dụng. Hãy thử lại sau.';
        throw error;
      }
      return data;
    }

    // Chỉ retry lỗi mạng/5xx/429 có giới hạn; body/requestId không đổi để
    // receipt server bảo đảm idempotency. Không retry intent khi 409 conflict.
    async requestWithRetry(path, method, body, options = {}) {
      let last;
      for (let attempt = 0; attempt < 3; attempt++) {
        try { return await this.request(path, method, body, options); }
        catch (error) {
          last = error;
          if (!['NETWORK_UNAVAILABLE', 'INVALID_RESPONSE', 'RATE_LIMITED'].includes(error.code) &&
              !(error.status >= 500) && error.status !== 429) throw error;
          if (attempt === 2) break;
          const delay = Math.max(error.retryAfterMs || 0, 250 * 2 ** attempt);
          await new Promise(resolve => root.setTimeout(resolve, delay));
        }
      }
      throw last;
    }
    run(work) {
      const next = this.pending.catch(() => {}).then(work);
      this.pending = next.catch(() => {});
      return next;
    }
    disconnect() {
      this.accountId = null; this.playerId = null; this.ticket = null;
      this.revision = 0; this.serverContentVersion = ''; this.achievements = [];
      this.pavilion = { version: 0, balance: 0, totalEarned: 0, rebirths: 0, upgrades: {}, relics: {} };
      this.lastSyncAttempt = 0;
      this.lastSuccessfulCommandAt = 0;
      this.nextSyncInMs = Number.POSITIVE_INFINITY;
      this.paused = false;
      this.deathNotified = false;
      this.game = new H.Game(H.create(this.clock()));
    }
    async connect(account) {
      if (!account?.id) throw Error('Phải đăng nhập và chấp thuận chính sách để chơi online.');
      this.disconnect();
      this.accountId = account.id;
      const info = await this.request('/bootstrap');
      if (info.protocolVersion !== C.VERSION || info.schemaVersion !== H.VERSION)
        throw Error('Trò chơi đã được cập nhật. Vui lòng tải lại trang để tiếp tục.');
      this.serverContentVersion = info.contentVersion;
      if (Number.isFinite(Number(info.nextSyncInMs)) && Number(info.nextSyncInMs) >= 3000)
        this.nextSyncInMs = Number(info.nextSyncInMs);
      if (info.pavilion) this.pavilion = info.pavilion;
      if (info.player?.id) {
        this.playerId = info.player.id;
        if (info.snapshot?.state) {
          this.apply(info.snapshot);
          this.lastSyncAttempt = this.clock();
        } else {
          await this.synchronize(true);
        }
      } else {
        await this.previewCreation();
      }
      return this.game.s.created ? this.game.s : null;
    }
    async previewCreation() {
      if (this.playerId) throw Error('Tài khoản đã có nhân vật.');
      const ticket = await this.request('/creation/preview', 'POST', {});
      if (!ticket.ticketId || !ticket.preview) throw Error('Máy chủ chưa cấp được phiếu khởi nguyên.');
      this.ticket = ticket;
      return ticket.preview;
    }
    apply(response) {
      if (response.protocolVersion !== C.VERSION || response.schemaVersion !== H.VERSION ||
        response.contentVersion !== this.serverContentVersion || !response.state || !response.state.created)
        throw Error('Dữ liệu từ máy chủ không khớp phiên bản game.');
      if (!Number.isSafeInteger(response.revision) || response.revision < 0) throw Error('Revision từ máy chủ không hợp lệ.');
      if (response.revision < this.revision) return; // Phản hồi cũ không ghi đè snapshot mới.
      this.revision = response.revision;
      if (response.pavilion) this.pavilion = response.pavilion;
      if (Number.isFinite(Number(response.nextSyncInMs)) && Number(response.nextSyncInMs) >= 3000)
        this.nextSyncInMs = Number(response.nextSyncInMs);
      const before = this.game.s;
      this.game = new H.Game(response.state);
      if (Array.isArray(response.achievements)) this.achievements.push(...response.achievements);
      for (const message of response.logs || []) if (typeof message === 'string') this.emit({ type: 'log', message });
      if (response.died && !this.deathNotified) {
        this.deathNotified = true;
        this.emit({ type: 'death', report: response.report });
      }
      if (!response.died) this.deathNotified = false;
      this.emit({ type: 'state', revision: this.revision, report: response.report });
    }
    async create(profile) {
      return this.run(async () => {
        if (!this.accountId || this.playerId || !this.ticket) throw Error('Chưa có phiếu khởi nguyên từ máy chủ.');
        const result = await this.request('/players', 'POST', {
          ticketId: this.ticket.ticketId, name: profile.name, gender: profile.gender, talent: profile.talent, destiny: profile.destiny
        });
        if (!result.playerId) throw Error('Phản hồi tạo đạo thân không hợp lệ.');
        this.playerId = result.playerId;
        this.ticket = null;
        this.apply(result);
        return this.game;
      });
    }
    async synchronize(force = false) {
      if (!this.playerId || !this.accountId || root.document?.hidden || (this.paused && !force)) return null;
      if (!force && this.lastSuccessfulCommandAt && this.clock() - this.lastSuccessfulCommandAt < this.nextSyncInMs) return null;
      if (!force && this.clock() - this.lastSyncAttempt < this.nextSyncInMs) return null;
      this.lastSyncAttempt = this.clock();
      return this.run(async () => {
        if (!force && this.lastSuccessfulCommandAt && this.clock() - this.lastSuccessfulCommandAt < this.nextSyncInMs) return null;
        let result;
        try { result = await this.request('/players/' + this.playerId + '/sync', 'POST', { lastRevision: this.revision }); }
        catch (error) {
          if (error.status === 429 && Number.isFinite(error.retryAfterMs) && error.retryAfterMs > 0) {
            this.lastSyncAttempt = this.clock();
            this.nextSyncInMs = Math.max(this.nextSyncInMs, error.retryAfterMs);
          }
          throw error;
        }
        this.apply(result);
        this.paused = false;
        return result.report || null;
      });
    }
    advance() { return this.synchronize(); }
    dispatch(type, payload = {}) {
      const command = C.validate({ type, payload });
      return this.run(async () => {
        if (!this.ready || this.paused || root.document?.hidden) throw Error('Bạn cần mở lại tab Hư Giới để tiếp tục tu luyện.');
        const requestId = secureRequestId();
        const body = { protocolVersion: C.VERSION, requestId, expectedRevision: this.revision, ...command };
        let result;
        try { result = await this.requestWithRetry('/players/' + this.playerId + '/commands', 'POST', body); }
        catch (error) {
          if (error.code === 'REVISION_CONFLICT' || Number.isSafeInteger(error.details?.currentRevision)) {
            // Một lệnh bị từ chối vẫn có thể lưu heartbeat online ở server.
            // Đọc revision mới, tuyệt đối không tự động gửi lại intent cũ.
            const fresh = await this.request('/players/' + this.playerId + '/state');
            this.apply(fresh);
          }
          throw error;
        }
        this.apply(result);
        this.lastSuccessfulCommandAt = this.clock();
        return result.result;
      });
    }
    pause() {
      if (!this.ready || this.paused) return Promise.resolve();
      const playerId = this.playerId, accountId = this.accountId;
      this.paused = true;
      // Bảo vệ khỏi race khi người chơi đổi tài khoản lúc request đang xếp hàng.
      return this.run(async () => {
        if (this.playerId !== playerId || this.accountId !== accountId) return;
        const response = await this.request('/players/' + playerId + '/pause', 'POST', {}, { keepalive: true });
        if (this.playerId === playerId && this.accountId === accountId) this.apply(response);
      });
    }
    /* Mọi giao dịch Thiên Tinh đi qua một hàng đợi chung với sync/commands.
       Khi mất phản hồi sau commit, gửi lại cùng requestId để nhận receipt. */
    pavilionPurchase(kind, key) {
      return this.run(async () => {
        if (!this.accountId || kind !== 'upgrade') throw Error('Chưa thể mở Thiên Mệnh Các.');
        const requestId = secureRequestId();
        const body = { requestId, expectedVersion: this.pavilion.version, kind, key };
        let response;
        for (let attempt = 0; attempt < 5; attempt++) {
          try { response = await this.request('/pavilion/purchase', 'POST', body); break; }
          catch (error) {
            if (error.code === 'PAVILION_CONFLICT') {
              const info = await this.request('/bootstrap');
              if (info.pavilion) this.pavilion = info.pavilion;
              this.emit({ type: 'conflict' });
              throw Error('Thiên Mệnh Các đã thay đổi ở phiên khác. Hãy xem lại số dư và thử thao tác mới.');
            }
            if (!['NETWORK_UNAVAILABLE', 'INVALID_RESPONSE', 'RATE_LIMITED'].includes(error.code) && !(error.status >= 500)) throw error;
            if (attempt === 4) throw error;
            await new Promise(resolve => root.setTimeout(resolve, Math.max(error.retryAfterMs || 0, Math.min(4000, 350 * 2 ** attempt) + Math.floor(Math.random() * 250))));
          }
        }
        if (!response) throw Error('Thiên Mệnh Các chưa xác nhận giao dịch.');
        if (response.state) this.apply(response);
        else if (response.pavilion) this.pavilion = response.pavilion;
        this.emit({ type: 'pavilion', pavilion: this.pavilion });
        return response.result;
      });
    }
    drainAchievements() { return this.achievements.splice(0); }
    /* Bắt đầu lại sau tử vong: số dư/cấp/kho và bảng xếp hạng reset tại server. */
    async resetAfterDeath() {
      return this.run(async () => {
        if (!this.playerId) throw Error('Không có đạo thân để bắt đầu lại.');
        const reset = await this.request('/players/' + this.playerId + '/reset-after-death', 'POST', {});
        this.playerId = null; this.revision = 0; this.ticket = null;
        this.pavilion = reset.pavilion || { version: 0, balance: 0, totalEarned: 0, rebirths: 0, upgrades: {}, relics: {} };
        this.game = new H.Game(H.create(this.clock()));
        this.achievements = []; this.deathNotified = false; this.paused = false;
        this.emit({ type: 'reset' });
        return this.previewCreation();
      });
    }


  }
  root.HU_REMOTE_SESSION = { RemoteSession, secureRequestId };
})(typeof window !== 'undefined' ? window : globalThis);
