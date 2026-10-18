/* Hình dạng JSON mà Edge Function `api` trả về (khớp game.get_state & các hàm game). */
import type { StatKey } from "./rules.ts";

export interface StageRef { idx: number; stage_id: string; name: string; world: "Hạ Giới" | "Linh Giới" | "Tiên Giới" }
export interface LifeItem { item_id: string; catalog_id: string; name: string; used: boolean }
export interface Life {
  life_id: string; life_no: number; status: "alive" | "cleared";
  stage: StageRef; tang: number; progress_s: number; need_s: number; ready_for_major: boolean;
  lifespan: { used_years: number; cap_years: number };
  wallet: { ls: number; lt: number; tn: number };
  tm_earned_life: number; born_at: string; speed_mult: number; risk_mult: number; items: LifeItem[];
}
export interface StatState { level: number; cap: number; next_cost: number | null }
export interface HistoryEntry { life_no: number; cause: string; stage_idx: number; tang: number; credited_days: number; tm_earned: number; ended_at: string }
export interface GameState {
  now: string;
  account: { tm_balance: number; tm_earned: number; tm_spent: number; life_count: number; stats: Record<StatKey, StatState> };
  life: Life | null;
  pending_intent: { intent_id: string; death_prob: number; expires_at: string } | null;
  history: HistoryEntry[];
}
export interface PrepareResult { intent_id: string; stage_idx: number; death_prob: number; success_prob: number; lethal: boolean; expires_at: string; warning: string }
export type ConfirmResult =
  | { outcome: "success"; stage_idx: number; stage_id: string; world: string; ascended: boolean }
  | { outcome: "cleared" }
  | { outcome: "death"; cause: string; new_life_id: string | null };
export interface ApiError { error: string; message?: string }
