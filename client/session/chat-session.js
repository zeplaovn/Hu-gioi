/* Truyền âm online: HTTPS + Bearer JWT; keyset polling qua Edge API.
 * Không dùng SSE thiếu Authorization, không tin tên người gửi hoặc thời gian từ browser.
 * Poll 6 giây khi tab hiển thị; presence cập nhật tối đa một lần/20 giây tại DB. */
(function (root) {
  'use strict';
  const BASE = String(root.HU_API_BASE || '/api/v1').replace(/\/+$/, '');
  class ChatSession {
    constructor() {
      this.available = ['http:', 'https:'].includes(root.location?.protocol) && !!root.HU_SUPABASE?.accessToken;
      this.state = { status: this.available ? 'idle' : 'unavailable', online: 0, self: null, messages: [], error: '' };
      this.listeners = new Set();
      this.timer = null; this.generation = 0; this.attempt = 0; this.cursor = '0'; this.wanted = false;
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
          const err = Object.assign(Error(payload?.error?.message || 'Dịch vụ truyền âm tạm thời không khả dụng.'), {
            permanent: [401, 403, 404, 405].includes(response.status), status: response.status
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
      this.state = { status: this.available ? 'idle' : 'unavailable', online: 0, self: null, messages: [], error: '' };
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
    async connect() {
      if (!this.available) return;
      this.wanted = true; this.stopTransport();
      const gen = this.generation;
      if (root.navigator?.onLine === false) {
        this.state.status = 'offline'; this.state.error = 'Đang ngoại tuyến.'; this.emit(); return;
      }
      this.state.status = 'connecting'; this.state.error = ''; this.emit();
      try {
        const data = await this.request('chat/connect');
        if (gen !== this.generation) return;
        this.state.self = data.self;
        this.state.messages = Array.isArray(data.messages) ? data.messages.slice(-100) : [];
        this.cursor = String(data.cursor || this.state.messages.at(-1)?.id || '0');
        this.state.online = Number(data.online) || 0;
        this.state.status = 'online'; this.state.error = ''; this.attempt = 0; this.emit();
        this.schedule(gen, 6000);
      } catch (error) { this.fail(error, gen); }
    }
    receive(message) {
      if (!message || this.state.messages.some(m => m.id === message.id)) return;
      this.state.messages.push(message);
      if (this.state.messages.length > 100) this.state.messages = this.state.messages.slice(-100);
      this.cursor = String(message.id);
      this.emit();
    }
    async poll(gen) {
      if (gen !== this.generation || !this.wanted) return;
      if (root.document?.hidden || root.navigator?.onLine === false) { this.schedule(gen, 12000); return; }
      try {
        const data = await this.request('chat/poll', 'POST', { since: Number(this.cursor) });
        if (gen !== this.generation) return;
        if (Array.isArray(data.messages)) for (const m of data.messages) this.receive(m);
        this.cursor = String(data.cursor || this.cursor);
        this.state.online = Number(data.online) || 0;
        this.state.status = 'online'; this.state.error = ''; this.attempt = 0; this.emit();
        this.schedule(gen, data.hasMore ? 1800 : 6000);
      } catch (error) { this.fail(error, gen); }
    }
    async send(text, requestId) {
      if (this.state.status !== 'online') throw Error('Chưa kết nối máy chủ chat.');
      const { message } = await this.request('chat/send', 'POST', { text, requestId });
      this.receive(message);
      return message;
    }
  }
  root.HU_CHAT_SESSION = { ChatSession };
})(typeof window !== 'undefined' ? window : globalThis);
