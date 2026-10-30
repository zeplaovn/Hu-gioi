/* OutboxWorker: lấy sự kiện đã commit từ outbox và gọi handler theo type (docs/backend-knowledge.md §4).
   Giao ÍT NHẤT MỘT LẦN: chỉ ack sau khi handler thành công; handler lỗi → sự kiện ở lại để lần sau thử lại.
   Handler PHẢI idempotent theo event.id. Sự kiện chưa có handler vẫn được ack (không kẹt hàng đợi) và ghi log mức debug. */
'use strict';
const { silentLogger } = require('../lib/logger.js');

class OutboxWorker {
  constructor({ repository, handlers = {}, logger = silentLogger, batch = 50, intervalMs = 1000 }) {
    Object.assign(this, { repository, handlers, logger, batch, intervalMs });
    this.timer = null;
    this.running = false;
  }

  /* Xử lý một lô. Trả { handled, failed }. Một sự kiện lỗi không chặn các sự kiện khác trong lô. */
  async runOnce() {
    const events = await this.repository.drainOutbox(this.batch);
    const done = [];
    let failed = 0;
    for (const event of events) {
      const handler = this.handlers[event.type];
      if (!handler) { this.logger.debug('outbox: chưa có handler', { type: event.type, id: event.id }); done.push(event.id); continue; }
      try { await handler(event); done.push(event.id); }
      catch (e) { failed++; this.logger.error('outbox: handler lỗi', { type: event.type, id: event.id, error: e.message }); }
    }
    if (done.length) await this.repository.ackOutbox(done);
    return { handled: done.length, failed };
  }

  start() {
    if (this.timer) return;
    const tick = async () => {
      if (this.running) return;
      this.running = true;
      try { await this.runOnce(); } catch (e) { this.logger.error('outbox: lỗi vòng lặp', { error: e.message }); } finally { this.running = false; }
    };
    this.timer = setInterval(tick, this.intervalMs);
    this.timer.unref?.();
  }

  stop() { clearInterval(this.timer); this.timer = null; }
}

module.exports = { OutboxWorker };
