/* HƯ GIỚI · RemoteSession v1.
   Chỉ lưu và thực thi gameplay trên Node API /api/v1; trình duyệt giữ snapshot
   CHỈ ĐỌC để hiển thị. Mọi thay đổi kinh tế/thời gian/RNG do máy chủ quyết định. */
(function (root) {
  'use strict';
  const H = root.HU_GAME, C = root.HU_COMMANDS;
  const API = '/api/v1';
  const DEFAULT_SYNC_MS = 30000;

  function endpoint() {
    const configured = String(root.HU_API_ORIGIN || '').replace(/\/+$/, '');
    if (!configured) {
      if (!/^https?:$/.test(root.location?.protocol || '')) throw Error('Chơi online cần HTTP/HTTPS.');
      return '';
    }
    const parsed = new URL(configured);
    if (parsed.protocol !== 'https:' &&
      !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname)))
      throw Error('Máy chủ API cần HTTPS.');
    if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/')
      throw Error('HU_API_ORIGIN chỉ được là origin của máy chủ.');
    return parsed.origin;
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
      this.serverContentVersion = '';
      this.listeners = new Set();
      this.achievements = [];
      this.pending = Promise.resolve();
      this.lastSyncAttempt = 0;
      this.nextSyncInMs = DEFAULT_SYNC_MS;
      this.syncInFlight = null;
    }
    get ready() { return !!this.accountId && !!this.playerId && !!this.game.s.created; }
    subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
    emit(event) { this.listeners.forEach(fn => fn(event)); }

    async request(path, method = 'GET', body) {
      if (!this.auth?.accessToken) throw Error('Cần xác thực Supabase trước khi chơi online.');
      const accessToken = await this.auth.accessToken();
      if (!accessToken) throw Error('Phiên Supabase đã hết hạn. Hãy đăng nhập lại.');
      let response;
      try {
        response = await this.fetch(endpoint() + API + path, {
          method, headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json', Accept: 'application/json' },
          body: body === undefined ? undefined : JSON.stringify(body),
          cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer',
          signal: AbortSignal.timeout(20000)
        });
      } catch {
        throw Object.assign(Error('Không kết nối được máy chủ game. Tiến trình không bị ghi cục bộ.'), { code: 'NETWORK_UNAVAILABLE' });
      }
      let data;
      try { data = await response.json(); } catch { throw Error('Máy chủ phản hồi không hợp lệ.'); }
      if (!response.ok) {
        const info = data?.error || {};
        const error = Error(typeof info.message === 'string' ? info.message : 'Máy chủ game tạm thời không xử lý được yêu cầu.');
        error.code = info.code || 'HTTP_' + response.status;
        error.status = response.status;
        error.details = info.details;
        throw error;
      }
      return data;
    }

    run(work) {
      const next = this.pending.catch(() => {}).then(work);
      this.pending = next.catch(() => {});
      return next;
    }
    disconnect() {
      this.accountId = null; this.playerId = null; this.ticket = null;
      this.revision = 0; this.serverContentVersion = ''; this.achievements = [];
      this.lastSyncAttempt = 0;
      this.game = new H.Game(H.create(this.clock()));
    }
    async connect(account) {
      if (!account?.id) throw Error('Phải đăng nhập và chấp thuận chính sách để chơi online.');
      this.disconnect();
      this.accountId = account.id;
      const info = await this.request('/bootstrap');
      if (info.protocolVersion !== C.VERSION || info.schemaVersion !== H.VERSION)
        throw Error('Phiên bản game và backend không tương thích. Hãy tải lại trang.');
      this.serverContentVersion = info.contentVersion;
      if (info.player?.id) {
        this.playerId = info.player.id;
        await this.synchronize(true);
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
      this.nextSyncInMs = Math.max(15000, Number(response.nextSyncInMs) || DEFAULT_SYNC_MS);
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
          ticketId: this.ticket.ticketId, name: profile.name, gender: profile.gender, talent: profile.talent
        });
        if (!result.playerId) throw Error('Phản hồi tạo đạo thân không hợp lệ.');
        this.playerId = result.playerId;
        this.ticket = null;
        this.apply(result);
        return this.game;
      });
    }
    async synchronize(force = false) {
      if (!this.playerId || !this.accountId) return null;
      if (!force && this.clock() - this.lastSyncAttempt < this.nextSyncInMs) return null;
      this.lastSyncAttempt = this.clock();
      return this.run(async () => {
        const result = await this.request('/players/' + this.playerId + '/sync', 'POST', { lastRevision: this.revision });
        this.apply(result);
        return result.report || null;
      });
    }
    advance() { return this.synchronize(); }
    dispatch(type, payload = {}) {
      const command = C.validate({ type, payload });
      return this.run(async () => {
        if (!this.ready) throw Error('Đạo thân online chưa sẵn sàng.');
        const requestId = root.crypto?.randomUUID?.();
        if (!requestId) throw Error('Trình duyệt thiếu mã yêu cầu an toàn.');
        const body = { protocolVersion: C.VERSION, requestId, expectedRevision: this.revision, ...command };
        let result;
        try { result = await this.request('/players/' + this.playerId + '/commands', 'POST', body); }
        catch (error) {
          if (error.code === 'REVISION_CONFLICT') {
            // Không tự gửi lại lệnh trên revision mới; yêu cầu người chơi thử lại.
            const fresh = await this.request('/players/' + this.playerId + '/state');
            this.apply(fresh);
          }
          throw error;
        }
        this.apply(result);
        return result.result;
      });
    }
    drainAchievements() { return this.achievements.splice(0); }
    async resetAfterDeath() {
      return this.run(async () => {
        if (!this.playerId) throw Error('Không có đạo thân để xóa.');
        await this.request('/players/' + this.playerId + '/reset-after-death', 'POST', {});
        this.playerId = null;
        this.game = new H.Game(H.create(this.clock()));
        this.ticket = null;
        return this.previewCreation();
      });
    }
  }
  root.HU_REMOTE_SESSION = { RemoteSession };
})(typeof window !== 'undefined' ? window : globalThis);
