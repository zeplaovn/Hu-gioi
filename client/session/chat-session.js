/* Truyền âm online: HTTPS + Bearer JWT; keyset polling qua Edge API.
 * Không dùng SSE thiếu Authorization, không tin tên người gửi hoặc thời gian từ browser.
 * Poll 10 giây khi cửa sổ chat mở và tab hiển thị; dừng khi đóng chat hoặc tab ẩn.
 * Tin của mình hiện ngay (optimistic) rồi thay bằng bản server xác nhận. */
(function (root) {
  'use strict';
  const BASE = String(root.HU_API_BASE || '/api/v1').replace(/\/+$/, '');
  const SEND_INTERVAL_MS = 15000;
  class ChatSession {
    constructor() {
      this.available = ['http:', 'https:'].includes(root.location?.protocol) && !!root.HU_SUPABASE?.accessToken;
      this.channel = 'world';
      this.state = { status: this.available ? 'idle' : 'unavailable', online: 0, self: null, messages: [], error: '', channel: 'world' };
      this.listeners = new Set();
      this.timer = null; this.generation = 0; this.attempt = 0; this.cursor = '0'; this.wanted = false;
      this.lastSentAt = 0; this.retryAt = 0;
      root.addEventListener?.('offline', () => {
        if (!this.wanted) return;
        this.stopTransport(); this.state.status = 'offline'; this.state.online = 0;
        this.state.error = 'Thiết bị mất mạng. Đang đợi kết nối trở lại.'; this.emit();
      });
      root.addEventListener?.('online', () => { if (this.wanted) this.connect(); });
    }
    subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
    emit() { this.listeners.forEach(fn => fn(this.state)); }
    async request(path, method = 'POST', body = {}) {
      const auth = root.HU_SUPABASE;
      const token = await auth?.accessToken?.();
      if (!token) throw Object.assign(Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.'), { permanent: true });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await root.fetch(BASE + '/social/' + path, {
          method, headers: {
            Authorization: 'Bearer ' + token,
            ...(auth.publishableKey ? { apikey: auth.publishableKey } : {}),
            'Content-Type': 'application/json', Accept: 'application/json'
          },
          ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
          cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal
        });
        let payload;
        try { payload = await response.json(); }
        catch { throw Error('Phản hồi truyền âm không hợp lệ.'); }
        if (!response.ok) {
          const retryAfter = Number(response.headers.get('retry-after') || 0);
          const err = Object.assign(Error(payload?.error?.message || 'Dịch vụ truyền âm tạm thời không khả dụng.'), {
            permanent: [401, 403, 404, 405].includes(response.status), status: response.status,
            retryAfterMs: retryAfter > 0 ? retryAfter * 1000 : 0
          });
          throw err;
        }
        return payload;
      } finally { clearTimeout(timer); }
    }
    stopTransport() {
      ++this.generation;
      clearTimeout(this.timer);
      this.timer = null;
    }
    disconnect() {
      const hadConnection = this.state.status === 'online';
      this.wanted = false; this.stopTransport();
      if (hadConnection) this.request('chat/leave').catch(() => {});
      this.state = { status: this.available ? 'idle' : 'unavailable', online: 0, self: null, messages: [], error: '', channel: this.channel };
      this.cursor = '0'; this.emit();
    }
    schedule(generation, ms) {
      if (generation === this.generation && this.wanted)
        this.timer = setTimeout(() => this.poll(generation), ms);
    }
    fail(error, generation) {
      if (generation !== this.generation) return;
      this.state.status = 'offline'; this.state.online = 0;
      this.state.error = error.message || 'Không thể kết nối chat.';
      this.emit();
      if (!error.permanent) this.schedule(generation, Math.min(30000, 2000 * 2 ** Math.min(this.attempt++, 4)));
    }
    async connect(channel = this.channel) {
      if (!this.available) return;
      if (!['world','sect','dao_huu','dao_lu'].includes(channel)) throw Error('Kênh chat không hợp lệ.');
      const switched = channel !== this.channel;
      this.channel = channel;
      this.wanted = true; this.stopTransport();
      if (switched) { this.cursor = '0'; this.state.messages = []; }
      this.state.channel = channel;
      const gen = this.generation;
      if (root.navigator?.onLine === false) {
        this.state.status = 'offline'; this.state.error = 'Đang ngoại tuyến.'; this.emit(); return;
      }
      this.state.status = 'connecting'; this.state.error = ''; this.emit();
      try {
        const data = await this.request('chat/connect', 'POST', { channel });
        if (gen !== this.generation) return;
        this.state.self = data.self;
        this.state.messages = Array.isArray(data.messages) ? data.messages.slice(-100) : [];
        this.cursor = String(data.cursor || this.state.messages.at(-1)?.id || '0');
        this.state.online = Number(data.online) || 0;
        this.state.status = 'online'; this.state.error = ''; this.attempt = 0; this.emit();
        this.schedule(gen, 10000);
      } catch (error) { this.fail(error, gen); }
    }
    cooldownUntil() {
      return Math.max((this.lastSentAt || 0) + SEND_INTERVAL_MS, this.retryAt || 0);
    }
    receive(message) {
      if (!message || message.channel !== this.channel) return;
      if (message.senderId === this.state.self?.id) {
        const pending = this.state.messages.findIndex(m => m.pending && m.senderId === message.senderId && m.text === message.text);
        if (pending >= 0) this.state.messages.splice(pending, 1);
      }
      if (this.state.messages.some(m => m.id === message.id)) return;
      this.state.messages.push(message);
      if (this.state.messages.length > 100) this.state.messages = this.state.messages.slice(-100);
      this.cursor = String(message.id);
      this.emit();
    }
    async poll(gen) {
      if (gen !== this.generation || !this.wanted) return;
      // Tab ẩn: dừng hẳn vòng poll; bubbleSync sẽ kết nối lại khi tab hiện lại.
      if (root.document?.hidden || root.navigator?.onLine === false) return;
      try {
        const data = await this.request('chat/poll', 'POST', { since: Number(this.cursor), channel: this.channel });
        if (gen !== this.generation) return;
        if (Array.isArray(data.messages)) for (const m of data.messages) this.receive(m);
        this.cursor = String(data.cursor || this.cursor);
        this.state.online = Number(data.online) || 0;
        this.state.status = 'online'; this.state.error = ''; this.attempt = 0; this.emit();
        this.schedule(gen, data.hasMore ? 1800 : 10000);
      } catch (error) { this.fail(error, gen); }
    }
    async send(text, requestId) {
      if (this.state.status !== 'online') throw Error('Chưa kết nối truyền âm. Vui lòng thử lại.');
      const channel = this.channel;
      const mine = this.state.self || {};
      const optimistic = {
        id: 'pending:' + requestId, senderId: mine.id || '', name: mine.name || '',
        text, at: Date.now(), channel,
        realm: Number.isInteger(mine.realm) ? mine.realm : null,
        admin: mine.admin === true, pending: true
      };
      // Khóa gửi cục bộ ngay khi bấm, không đợi server trả về.
      this.lastSentAt = Date.now(); this.retryAt = 0;
      this.state.messages.push(optimistic);
      if (this.state.messages.length > 100) this.state.messages = this.state.messages.slice(-100);
      this.emit();
      try {
        const { message } = await this.request('chat/send', 'POST', { text, requestId, channel });
        this.state.messages = this.state.messages.filter(m => m.id !== optimistic.id);
        this.receive(message);
        return message;
      } catch (error) {
        this.state.messages = this.state.messages.filter(m => m.id !== optimistic.id);
        if (error.status === 429 && error.retryAfterMs > 0) this.retryAt = Date.now() + error.retryAfterMs;
        this.emit();
        throw error;
      }
    }
  }
  root.HU_CHAT_SESSION = { ChatSession, CHANNELS: ['world','sect','dao_huu','dao_lu'] };
})(typeof window !== 'undefined' ? window : globalThis);
