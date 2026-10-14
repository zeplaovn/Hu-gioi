import type { Character } from "../../../packages/domain/src/index.js";
import type { AuthContext } from "./auth.js";

export interface GameState {
  schemaVersion: 2;
  character: Character | null;
  meta: Record<string, unknown>;
}

export interface StoredGameState {
  revision: number;
  state: GameState;
}

export interface GameStateRepository {
  get(auth: AuthContext): Promise<StoredGameState>;
  compareAndSet(auth: AuthContext, expectedRevision: number, next: GameState): Promise<StoredGameState>;
}

const emptyState = (): GameState => ({ schemaVersion: 2, character: null, meta: {} });
const clone = <T>(v: T): T => structuredClone(v);

export class MemoryGameStateRepository implements GameStateRepository {
  private readonly rows = new Map<string, StoredGameState>();

  async get(auth: AuthContext): Promise<StoredGameState> {
    const row = this.rows.get(auth.user.id) ?? { revision: 0, state: emptyState() };
    return clone(row);
  }

  async compareAndSet(auth: AuthContext, expectedRevision: number, next: GameState): Promise<StoredGameState> {
    const current = this.rows.get(auth.user.id) ?? { revision: 0, state: emptyState() };
    if (current.revision !== expectedRevision) throw new Error("state_conflict");
    const row = { revision: current.revision + 1, state: clone(next) };
    this.rows.set(auth.user.id, row);
    return clone(row);
  }
}

export class SupabaseGameStateRepository implements GameStateRepository {
  private readonly base: string;
  constructor(url: string, private readonly anonKey: string, private readonly fetchImpl: typeof fetch = fetch) {
    this.base = String(url).replace(/\/+$/, "");
  }

  private headers(auth: AuthContext) {
    return { apikey: this.anonKey, Authorization: `Bearer ${auth.accessToken}`, "Content-Type": "application/json" };
  }

  async get(auth: AuthContext): Promise<StoredGameState> {
    const response = await this.fetchImpl(this.base + "/rest/v1/player_saves?select=save,meta,rev&limit=1", {
      method: "GET",
      headers: this.headers(auth),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("state_read_failed");
    const rows = await response.json() as Array<{ save?: unknown; meta?: unknown; rev?: unknown }>;
    if (!Array.isArray(rows) || !rows[0]) return { revision: 0, state: emptyState() };
    const row = rows[0];
    const raw = row.save as { schemaVersion?: unknown; character?: Character | null } | null;
    const state: GameState = raw && raw.schemaVersion === 2
      ? { schemaVersion: 2, character: raw.character ?? null, meta: row.meta && typeof row.meta === "object" ? row.meta as Record<string, unknown> : {} }
      : emptyState();
    return { revision: Math.max(0, Math.trunc(Number(row.rev) || 0)), state };
  }

  async compareAndSet(auth: AuthContext, expectedRevision: number, next: GameState): Promise<StoredGameState> {
    const response = await this.fetchImpl(this.base + "/rest/v1/rpc/save_game", {
      method: "POST",
      headers: this.headers(auth),
      body: JSON.stringify({ p_save: { schemaVersion: 2, character: next.character }, p_meta: next.meta, p_rev: expectedRevision, p_force: false }),
      signal: AbortSignal.timeout(5000),
    });
    const text = await response.text();
    let data: any = null;
    if (text) { try { data = JSON.parse(text); } catch { data = null; } }
    if (!response.ok) {
      const msg = String(data?.message || data?.error || "");
      if (/conflict/i.test(msg)) throw new Error("state_conflict");
      throw new Error("state_write_failed");
    }
    return { revision: Math.max(expectedRevision + 1, Math.trunc(Number(data?.rev) || 0)), state: clone(next) };
  }
}
