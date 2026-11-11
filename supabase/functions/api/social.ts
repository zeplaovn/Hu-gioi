/* Kênh truyền âm + bảng xếp hạng thật. DB private, chỉ gọi từ Edge API sau JWT/consent.
 * Không đọc state JSON trong truy vấn ranking. Chat dùng keyset id (PK) và giới hạn 50 tin/lần.
 * Quota isolate + khóa giao dịch theo user chống spam từ nhiều isolate, không tin client clock/name. */
import { GameError } from './game.bundle.mjs';

type Row = Record<string, unknown>;
type Db = { queryObject: (q: { text: string; args: unknown[] }) => Promise<{rows: Row[]}> };
type Database = {
  connection: <T>(work: (db: Db) => Promise<T>) => Promise<T>;
  transaction: <T>(work: (db: Db) => Promise<T>) => Promise<T>;
};
const LIMIT = 50;
const fail = (code: string, msg: string) => { throw new GameError(code, msg); };
const asSafe = (v: unknown): number => {
  const n = Number(v);
  return Number.isSafeInteger(n) ? n : 0;
};
const isObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v) &&
  (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
const strict = (v: unknown, keys: string[]) => {
  if (!isObject(v) || Object.keys(v).some(k => !keys.includes(k))) fail('INVALID_REQUEST', 'Dữ liệu không hợp lệ.');
  return v as Record<string, unknown>;
};
const rows = async (c: Db, text: string, args: unknown[] = []): Promise<Row[]> =>
  (await c.queryObject({ text, args })).rows;
const first = async (c: Db, text: string, args: unknown[] = []): Promise<Row | null> =>
  (await rows(c, text, args))[0] || null;
const asMessage = (r: Row) => ({
  id: String(r.id), senderId: String(r.owner_id), name: String(r.sender_name),
  text: String(r.body), at: asSafe(r.created_at)
});
const player = (c: Db, ownerId: string) =>
  first(c, 'SELECT id, name FROM game.players WHERE owner_id = $1', [ownerId]);
async function onlineCount(c: Db, now: number): Promise<number> {
  const count = await first(c, 'SELECT count(*)::bigint AS n FROM game.world_chat_presence WHERE seen_at >= $1', [now - 90000]);
  return asSafe(count?.n);
}
async function heartbeat(c: Db, ownerId: string, now: number): Promise<void> {
  // ON CONFLICT ... WHERE tránh tạo phiên bản row mới trên mỗi lần poll 6s.
  await rows(c, `INSERT INTO game.world_chat_presence (owner_id, seen_at)
    VALUES ($1, $2)
    ON CONFLICT(owner_id) DO UPDATE SET seen_at = EXCLUDED.seen_at
    WHERE game.world_chat_presence.seen_at < EXCLUDED.seen_at - 20000`, [ownerId, now]);
}
function cursorOf(data: Record<string, unknown>): number {
  const cursor = data.since ?? 0;
  if (!Number.isSafeInteger(cursor) || Number(cursor) < 0) fail('INVALID_REQUEST', 'Con trỏ tin nhắn không hợp lệ.');
  return Number(cursor);
}

export async function handleSocial(repo: Database, ownerId: string, route: string, rawBody: unknown): Promise<unknown> {
  const now = Date.now();
  if (route === 'chatConnect') {
    strict(rawBody, []);
    return repo.connection(async c => {
      const me = await player(c, ownerId);
      if (!me) return fail('PLAYER_NOT_FOUND', 'Bạn cần có đạo thân trước khi truyền âm.');
      await heartbeat(c, ownerId, now);
      const history = await rows(c, `SELECT id, owner_id, sender_name, body, created_at
        FROM game.world_chat_messages ORDER BY id DESC LIMIT ${LIMIT}`);
      const messages = history.reverse().map(asMessage);
      return { self: { id: ownerId, name: String(me.name) }, messages, online: await onlineCount(c, now),
        cursor: messages.at(-1)?.id || '0' };
    });
  }
  if (route === 'chatPoll') {
    const since = cursorOf(strict(rawBody, ['since']));
    return repo.connection(async c => {
      const me = await player(c, ownerId);
      if (!me) return fail('PLAYER_NOT_FOUND', 'Đạo thân không tồn tại.');
      await heartbeat(c, ownerId, now);
      const found = await rows(c, `SELECT id, owner_id, sender_name, body, created_at
        FROM game.world_chat_messages WHERE id > $1 ORDER BY id ASC LIMIT ${LIMIT}`, [String(since)]);
      return { messages: found.map(asMessage), online: await onlineCount(c, now),
        cursor: found.length ? String(found.at(-1)?.id) : String(since), hasMore: found.length === LIMIT };
    });
  }
  if (route === 'chatLeave') {
    strict(rawBody, []);
    return repo.connection(async c => {
      await rows(c, 'DELETE FROM game.world_chat_presence WHERE owner_id = $1', [ownerId]);
      return { left: true };
    });
  }
  if (route === 'chatSend') {
    const body = strict(rawBody, ['text', 'requestId']);
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text || text.length > 400 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text))
      return fail('INVALID_REQUEST', 'Lời truyền âm phải dài 1–400 ký tự và không chứa ký tự điều khiển.');
    const requestId = body.requestId;
    if (typeof requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId))
      return fail('INVALID_REQUEST', 'Mã tin nhắn không hợp lệ.');
    return repo.transaction(async c => {
      // Khóa ngắn theo user, chống gửi đồng thời vượt 2 giây từ các isolate khác nhau.
      await rows(c, 'SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))', [ownerId]);
      const previous = await first(c, `SELECT id, owner_id, sender_name, body, created_at
        FROM game.world_chat_messages WHERE owner_id = $1 AND request_id = $2`, [ownerId, requestId]);
      if (previous) {
        if (previous.body !== text) return fail('REQUEST_ID_REUSED', 'Mã tin nhắn đã dùng cho nội dung khác.');
        return { message: asMessage(previous), replayed: true };
      }
      const me = await player(c, ownerId);
      if (!me) return fail('PLAYER_NOT_FOUND', 'Bạn cần có đạo thân trước khi truyền âm.');
      const last = await first(c, `SELECT created_at FROM game.world_chat_messages
        WHERE owner_id = $1 ORDER BY created_at DESC LIMIT 1`, [ownerId]);
      if (last && now - asSafe(last.created_at) < 2000)
        return fail('RATE_LIMITED', 'Mỗi tin nhắn cách nhau ít nhất 2 giây.');
      const saved = await first(c, `INSERT INTO game.world_chat_messages
        (owner_id, sender_name, body, request_id, created_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, owner_id, sender_name, body, created_at`,
        [ownerId, String(me.name).slice(0, 60), text, requestId, now]);
      if (!saved) return fail('MAINTENANCE', 'Chưa thể lưu lời truyền âm.');
      return { message: asMessage(saved), replayed: false };
    });
  }
  if (route === 'leaderboard') {
    // Không đọc game.players.state; index nhỏ chỉ cập nhật khi rating thay đổi.
    return repo.connection(async c => {
      const leaders = await rows(c, `SELECT player_id, owner_id, name, realm, rating, wins, losses
        FROM game.player_leaderboard ORDER BY rating DESC, player_id ASC LIMIT ${LIMIT}`);
      const me = await first(c, `SELECT player_id, owner_id, name, realm, rating, wins, losses
        FROM game.player_leaderboard WHERE owner_id = $1`, [ownerId]);
      let myRank = null;
      if (me) {
        const earlier = await first(c, `SELECT count(*)::bigint AS n FROM game.player_leaderboard
          WHERE rating > $1 OR (rating = $1 AND player_id < $2)`, [me.rating, me.player_id]);
        myRank = asSafe(earlier?.n) + 1;
      }
      const format = (r: Row) => ({ id: String(r.player_id), you: r.owner_id === ownerId,
        name: String(r.name), realm: asSafe(r.realm), rating: asSafe(r.rating),
        wins: asSafe(r.wins), losses: asSafe(r.losses) });
      return { entries: leaders.map(format), me: me ? { ...format(me), rank: myRank } : null, limit: LIMIT };
    });
  }
  return fail('NOT_FOUND', 'Chưa có API này.');
}
