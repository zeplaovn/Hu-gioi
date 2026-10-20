/* Trạng thái phía client. KHÔNG quyết định gì: chỉ gửi ý định lên server, nhận kết quả và vẽ lại.
   Nhật ký sinh từ chênh lệch giữa hai trạng thái liên tiếp do server trả về. */
import { errorText } from "./api.js";
import { causeLabel } from "./format.js";

const POLL_MS = 15000;
const WARNING = "Chết thật = mất toàn bộ tài sản của kiếp (giữ Thiên Mệnh).";

export class Game {
  /** @param {{ api: ReturnType<import("./api.js").createApi>, pollMs?: number }} o */
  constructor({ api, pollMs = POLL_MS }) {
    this.api = api;
    this.pollMs = pollMs;
    this.state = null;
    this.loading = false;
    this.busy = false;
    this.error = null;
    /** Kết quả đột phá vừa xảy ra, để hiện hộp thoại (kể cả khi chết). */
    this.result = null;
    this.prepared = null;
    this.lifespanPrepared = null;
    /** Nhật ký hiển thị (chỉ đọc): { id, text, tag }. */
    this.log = [];
    /** Tăng mỗi khi có tiến triển để cảnh phát hiệu ứng. */
    this.pulse = 0;
    this.listeners = new Set();
    this.timer = null;
    this.seq = 0;
  }

  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit() { for (const fn of [...this.listeners]) fn(this); }

  say(text, tag = "") { this.log = [...this.log.slice(-199), { id: ++this.seq, text, tag }]; }

  /** So sánh hai trạng thái liên tiếp để ghi nhật ký. Không đưa ra quyết định nào. */
  diff(prev, next) {
    const a = prev?.life, b = next.life;
    if (!b) return;
    if (!prev) {                                  // lần tải đầu: đang quay lại kiếp đang sống, không phải kiếp mới
      this.say(`Ngươi trở lại thế gian: kiếp thứ ${b.life_no}, ${b.stage.name} tầng ${b.tang} (${b.stage.world}).`, "dim");
      return;
    }
    if (!a) {
      this.say(`Kiếp thứ ${b.life_no} bắt đầu tại ${b.stage.world}. ${b.stage.name}, tầng ${b.tang}.`, "gold");
      return;
    }
    if (a.life_id !== b.life_id) {
      this.say(`Một kiếp mới bắt đầu (kiếp thứ ${b.life_no}). Thiên Mệnh và chỉ số vĩnh viễn vẫn còn.`, "gold");
      return;
    }
    if (b.stage.idx > a.stage.idx) {
      this.pulse++;
      this.say(`Đột phá! Ngươi bước vào ${b.stage.name}.`, "gold");
      if (b.stage.world !== a.stage.world) this.say(`Phi Thăng: ngươi tới ${b.stage.world}, vẫn là một kiếp, không mất gì.`, "cyan");
    } else if (b.tang > a.tang) {
      this.pulse++;
      const n = b.tang - a.tang;
      this.say(`${b.stage.name} lên tầng ${b.tang}${n > 1 ? ` (+${n} tầng)` : ""}. Thiên Mệnh +${n}.`, "green");
    }
    if (b.status === "cleared" && a.status !== "cleared") this.say("Ngươi đã hoàn tất tuyến chính tại Đài Quy Hương.", "gold");
    if (b.tang === 9 && a.tang !== 9 && b.status === "alive") this.say("Tới tầng 9: dừng lại chờ ngươi xác nhận đại đột phá.", "dim");
  }

  /** Kiếp có thể kết thúc ngoài thao tác của người chơi (tọa hóa khi họ vắng mặt): báo cho họ biết thay vì lặng lẽ đổi kiếp. */
  noteLifeChange(prev, next) {
    const a = prev?.life?.life_no, b = next.life?.life_no;
    if (a === undefined || b === undefined || b <= a || this.result) return;
    const h = next.history.find((x) => x.life_no === a);
    if (h) this.result = { outcome: "death", cause: h.cause, new_life_id: next.life?.life_id ?? null };
  }

  /** Mọi lời gọi thao tác qua đây: gom lỗi, chặn bấm đôi. */
  async run(fn) {
    if (this.busy) return undefined;
    this.busy = true; this.error = null; this.emit();
    try { return await fn(this.api); }
    catch (e) { this.error = errorText(e); return undefined; }
    finally { this.busy = false; this.emit(); }
  }

  async refresh() {
    if (this.busy) return;
    this.loading = this.state === null; this.emit();
    try {
      const next = await this.api.state();
      this.noteLifeChange(this.state, next);
      this.diff(this.state, next);
      this.state = next; this.error = null;
    } catch (e) { this.error = errorText(e); }
    finally { this.loading = false; this.emit(); }
  }

  /** Tải lại ngay sau thao tác (bỏ qua cờ busy vì thao tác vừa xong). */
  async reload() {
    try { const next = await this.api.state(); this.diff(this.state, next); this.state = next; }
    catch (e) { this.error = errorText(e); }
    this.emit();
  }

  start() {
    this.stop();
    void this.refresh();
    this.timer = setInterval(() => { if (typeof document === "undefined" || !document.hidden) void this.refresh(); }, this.pollMs);
  }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }
  reset() {
    this.stop();
    this.state = null; this.result = null; this.prepared = null; this.lifespanPrepared = null; this.error = null; this.log = []; this.pulse = 0;
    this.emit();
  }

  async startLife(profile) {
    const s = await this.run((a) => a.startLife(profile));
    if (s) { this.diff(this.state, s); this.state = s; this.emit(); }
    return !!s;
  }

  /** Xin server gieo (lại) chủng tộc / linh căn cho kiếp sắp bắt đầu. fields ⊆ ["race", "linh_can"]; bỏ trống = cả hai. */
  async rollCharacter(fields) {
    const r = await this.run((a) => a.rollCharacter(fields));
    if (r && this.state && !this.state.life) { this.state = { ...this.state, pending_roll: r }; this.emit(); }
    return r;
  }

  async prepare() {
    const p = await this.run((a) => a.prepareBreakthrough());
    if (p) { this.prepared = p; this.emit(); }
  }

  /** Có lời xác nhận đang chờ từ trước (đóng tab giữa chừng): dựng lại hộp thoại từ dữ liệu server. */
  resumePending() {
    const life = this.state?.life, p = this.state?.pending_intent;
    if (!life || !p) return;
    this.prepared = {
      intent_id: p.intent_id, stage_idx: life.stage.idx, death_prob: p.death_prob, success_prob: 1 - p.death_prob,
      lethal: p.death_prob > 0, expires_at: p.expires_at, warning: WARNING,
    };
    this.emit();
  }

  async confirm() {
    const id = this.prepared?.intent_id ?? this.state?.pending_intent?.intent_id;
    if (!id) return;
    const r = await this.run((a) => a.confirmBreakthrough(id));
    this.prepared = null;
    if (r) {
      this.result = r;
      if (r.outcome === "death") this.say(`Vẫn lạc: ${causeLabel(r.cause)}. Tài sản của kiếp đã tan biến.`, "red");
      await this.reload();
    } else this.emit();
  }

  async prepareLifespan() {
    const p = await this.run((a) => a.prepareLifespan());
    if (p) { this.lifespanPrepared = p; this.emit(); }
  }

  resumeLifespan() {
    const p = this.state?.pending_lifespan_intent;
    if (!p) return;
    this.lifespanPrepared = {
      ...p, warning: "Tọa hóa kết thúc kiếp; mọi tài sản vật lý của kiếp bị mất. Thiên Mệnh và chỉ số vĩnh viễn được giữ.",
    };
    this.emit();
  }

  async confirmLifespan() {
    const id = this.lifespanPrepared?.intent_id;
    if (!id) return;
    const r = await this.run((a) => a.confirmLifespan(id));
    this.lifespanPrepared = null;
    if (r) {
      this.result = r;
      this.say("Tọa hóa: một kiếp kết thúc. Thiên Mệnh vĩnh viễn vẫn còn.", "red");
      await this.reload();
    } else this.emit();
  }

  cancelLifespan() { this.lifespanPrepared = null; this.emit(); }
  cancelPrepare() { this.prepared = null; this.emit(); }
  dismissResult() { this.result = null; this.emit(); }

  async upgradeStat(stat) {
    const r = await this.run((a) => a.upgradeStat(stat));
    if (r) await this.reload();
    return !!r;
  }
  async buyItem(id) {
    const r = await this.run((a) => a.buyItem(id));
    if (r) await this.reload();
    return !!r;
  }
}

export const createGame = (opts) => new Game(opts);
