import type { ConfirmResult, GameState, PrepareResult, StatKey } from "@hu-gioi/game-core";
import { createApi, errorText, type Api } from "./api";
import { auth } from "./auth.svelte";
import { functionUrl } from "./supabase";
import { env } from "$env/dynamic/public";
import { causeLabel } from "./format";

const POLL_MS = 15000;

export interface LogLine { id: number; text: string; tag: "" | "green" | "gold" | "cyan" | "red" | "dim" }

class GameStore {
  state = $state<GameState | null>(null);
  loading = $state(false);
  busy = $state(false);
  error = $state<string | null>(null);
  /** Kết quả đột phá vừa xảy ra, để hiện hộp thoại (kể cả khi chết). */
  result = $state<ConfirmResult | null>(null);
  prepared = $state<PrepareResult | null>(null);

  /** Nhật ký hiển thị (chỉ để đọc): sinh từ chênh lệch giữa hai trạng thái do server trả về. */
  log = $state<LogLine[]>([]);
  /** Tăng mỗi khi có tiến triển để cảnh phát hiệu ứng. */
  pulse = $state(0);

  private api: Api | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private seq = 0;

  private say(text: string, tag: LogLine["tag"] = ""): void {
    this.log = [...this.log.slice(-199), { id: ++this.seq, text, tag }];
  }

  /** So sánh hai trạng thái liên tiếp để ghi nhật ký. Không đưa ra quyết định nào. */
  private diff(prev: GameState | null, next: GameState): void {
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

  private client(): Api {
    return (this.api ??= createApi({ baseUrl: functionUrl(), getToken: auth.token, anonKey: env.PUBLIC_SUPABASE_ANON_KEY }));
  }

  /** Mọi lời gọi qua đây: gom lỗi, chặn bấm đôi. */
  private async run<T>(fn: (api: Api) => Promise<T>): Promise<T | undefined> {
    if (this.busy) return undefined;
    this.busy = true; this.error = null;
    try { return await fn(this.client()); }
    catch (e) { this.error = errorText(e); return undefined; }
    finally { this.busy = false; }
  }

  async refresh(): Promise<void> {
    if (this.busy) return;
    this.loading = this.state === null;
    try {
      const next = await this.client().state();
      this.noteLifeChange(this.state, next);
      this.diff(this.state, next);
      this.state = next; this.error = null;
    }
    catch (e) { this.error = errorText(e); }
    finally { this.loading = false; }
  }

  /** Kiếp có thể kết thúc ngoài thao tác của người chơi (tọa hóa khi họ vắng mặt): báo cho họ biết thay vì lặng lẽ đổi kiếp. */
  private noteLifeChange(prev: GameState | null, next: GameState): void {
    const a = prev?.life?.life_no, b = next.life?.life_no;
    if (a === undefined || b === undefined || b <= a || this.result) return;
    const h = next.history.find(x => x.life_no === a);
    if (h) this.result = { outcome: "death", cause: h.cause, new_life_id: next.life?.life_id ?? null };
  }

  start(): void {
    this.stop();
    void this.refresh();
    this.timer = setInterval(() => { if (!document.hidden) void this.refresh(); }, POLL_MS);
  }
  stop(): void { if (this.timer) clearInterval(this.timer); this.timer = null; }
  reset(): void { this.stop(); this.state = null; this.result = null; this.prepared = null; this.error = null; this.log = []; this.pulse = 0; }

  async startLife(): Promise<void> {
    const s = await this.run(a => a.startLife());
    if (s) { this.diff(this.state, s); this.state = s; }
  }
  async prepare(): Promise<void> {
    const p = await this.run(a => a.prepareBreakthrough());
    if (p) this.prepared = p;
  }
  async confirm(): Promise<void> {
    const id = this.prepared?.intent_id ?? this.state?.pending_intent?.intent_id;
    if (!id) return;
    const r = await this.run(a => a.confirmBreakthrough(id));
    this.prepared = null;
    if (r) {
      this.result = r;
      if (r.outcome === "death") this.say(`Vẫn lạc: ${causeLabel(r.cause)}. Tài sản của kiếp đã tan biến.`, "red");
      await this.reload();
    }
  }
  cancelPrepare(): void { this.prepared = null; }
  dismissResult(): void { this.result = null; }

  async upgradeStat(stat: StatKey): Promise<boolean> {
    const r = await this.run(a => a.upgradeStat(stat));
    if (r) await this.reload();
    return !!r;
  }
  async buyItem(id: string): Promise<boolean> {
    const r = await this.run(a => a.buyItem(id));
    if (r) await this.reload();
    return !!r;
  }
  /** Tải lại ngay sau thao tác (bỏ qua cờ busy vì thao tác vừa xong). */
  private async reload(): Promise<void> {
    try { const next = await this.client().state(); this.diff(this.state, next); this.state = next; } catch (e) { this.error = errorText(e); }
  }
}

export const game = new GameStore();
