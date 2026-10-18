import type { ConfirmResult, GameState, PrepareResult, StatKey } from "@hu-gioi/game-core";
import { createApi, errorText, type Api } from "./api";
import { auth } from "./auth.svelte";
import { functionUrl } from "./supabase";
import { env } from "$env/dynamic/public";

const POLL_MS = 15000;

class GameStore {
  state = $state<GameState | null>(null);
  loading = $state(false);
  busy = $state(false);
  error = $state<string | null>(null);
  /** Kết quả đột phá vừa xảy ra, để hiện hộp thoại (kể cả khi chết). */
  result = $state<ConfirmResult | null>(null);
  prepared = $state<PrepareResult | null>(null);

  private api: Api | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

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
  reset(): void { this.stop(); this.state = null; this.result = null; this.prepared = null; this.error = null; }

  async startLife(): Promise<void> {
    const s = await this.run(a => a.startLife());
    if (s) this.state = s;
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
    if (r) { this.result = r; await this.reload(); }
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
    try { this.state = await this.client().state(); } catch (e) { this.error = errorText(e); }
  }
}

export const game = new GameStore();
