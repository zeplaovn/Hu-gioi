/* Chat demo độc lập với LocalSession; không ghi state hoặc thưởng gameplay. */
(function (root) {
  'use strict';
  class ChatSession {
    constructor() {
      this.available = ['http:', 'https:'].includes(root.location.protocol);
      this.state = { status: this.available ? 'idle' : 'unavailable', online: 0, self: null, messages: [], error: '' };
      this.listeners = new Set();
      this.source = null; this.timer = 0; this.generation = 0; this.attempt = 0; this.name = ''; this.joinController = null; this.wanted = false;
      root.addEventListener('offline', () => {
        if (!this.wanted) return;
        this.stopTransport();
        this.state.status = 'offline'; this.state.online = 0;
        this.state.error = 'Thiết bị đang mất mạng. Chat sẽ kết nối lại khi có mạng.';
        this.emit();
      });
      root.addEventListener('online', () => { if (this.wanted) this.connect(); });
    }
    subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
    emit() { this.listeners.forEach(fn => fn(this.state)); }
    async request(path, value, signal = AbortSignal.timeout(8000)) {
      const response = await fetch('/api/chat/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(value), signal });
      if ([404, 405].includes(response.status)) throw Object.assign(Error('Dịch vụ chat chưa có trên máy chủ này (backend đang được viết lại).'), { permanent: true });
      let data;
      try { data = await response.json(); } catch { throw Object.assign(Error('Máy chủ này chưa hỗ trợ chat.'), { permanent: true }); }
      if (!response.ok) throw Error(data.error || 'Không thể kết nối chat.');
      return data;
    }
    stopTransport() {
      ++this.generation;
      clearTimeout(this.timer);
      this.joinController?.abort();
      this.source?.close(); this.source = null;
    }
    disconnect() {
      this.wanted = false;
      this.stopTransport();
      this.state.status = this.available ? 'idle' : 'unavailable';
      this.state.online = 0; this.state.error = '';
      this.emit();
    }
    async connect(name = this.name) {
      if (!this.available) return;
      this.wanted = true;
      this.stopTransport();
      const generation = this.generation;
      this.name = name;
      if (!root.navigator.onLine) {
        this.state.status = 'offline'; this.state.error = 'Thiết bị đang mất mạng. Chat sẽ kết nối lại khi có mạng.'; this.emit(); return;
      }
      this.state.status = 'connecting'; this.state.error = ''; this.emit();
      const controller = this.joinController = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const retry = error => {
        if (generation !== this.generation) return;
        this.source?.close(); this.source = null;
        this.state.status = 'offline';
        this.state.online = 0;
        this.state.error = error.message || 'Mất kết nối. Đang thử lại…';
        if (!error.permanent) this.timer = setTimeout(() => this.connect(), Math.min(30000, 2000 * 2 ** Math.min(this.attempt++, 4)));
        this.emit();
      };
      try {
        const data = await this.request('join', { name }, controller.signal);
        if (generation !== this.generation) return;
        this.state.self = data.self;
        const source = this.source = new EventSource('/api/chat/events');
        source.addEventListener('snapshot', event => {
          if (generation !== this.generation) return;
          const data = JSON.parse(event.data);
          this.state.messages = data.messages.slice(-100);
          this.state.online = data.online;
          this.state.status = 'online'; this.state.error = ''; this.attempt = 0;
          this.emit();
        });
        source.addEventListener('message', event => { if (generation === this.generation) this.receive(JSON.parse(event.data)); });
        source.addEventListener('presence', event => {
          if (generation !== this.generation) return;
          this.state.online = JSON.parse(event.data).online; this.emit();
        });
        source.onerror = () => retry(Error('Mất kết nối với máy chủ. Đang kết nối lại…'));
      } catch (error) { retry(error.name === 'AbortError' ? Error('Kết nối quá thời gian. Đang thử lại…') : error); }
      finally { clearTimeout(timeout); }
    }
    receive(message) {
      if (this.state.messages.some(m => m.id === message.id)) return;
      this.state.messages.push(message);
      this.state.messages = this.state.messages.slice(-100);
      this.emit();
    }
    async send(text, requestId) {
      if (this.state.status !== 'online') throw Error('Chưa kết nối máy chủ chat.');
      const { message } = await this.request('messages', { text, requestId });
      this.receive(message);
      return message;
    }
  }
  root.HU_CHAT_SESSION = { ChatSession };
})(typeof window !== 'undefined' ? window : globalThis);
