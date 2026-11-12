/* Kênh truyền âm + bảng xếp hạng thật. DB private, chỉ gọi từ Edge API sau JWT/consent.
 * Chat là dữ liệu tạm: API chỉ trả tin trong 1 giờ, DB xóa vật lý bằng cron 5 phút.
 * Rate limit 15 giây dùng conditional UPDATE trên presence.last_chat_at, không advisory lock.
 * Đọc theo kênh có micro-cache + singleflight; online count cache 45 giây. */
import { GameError } from './game.bundle.mjs';

type Row = Record<string, unknown>;
type Db = { queryObject: (q: { text: string; args: unknown[] }) => Promise<{rows: Row[]}> };
type Database = {
  connection: <T>(work: (db: Db) => Promise<T>) => Promise<T>;
  transaction: <T>(work: (db: Db) => Promise<T>) => Promise<T>;
};
const LIMIT = 50;
const MAX_TEXT = 80; // ký tự (code point), khớp client và CHECK trong DB
const MESSAGE_TTL_MS = 60 * 60 * 1000;
const READ_CACHE_MS = 4000;
const ONLINE_CACHE_MS = 45000;
const ONLINE_GRACE_MS = 90000;
const HEARTBEAT_MS = 60000;
const SEND_INTERVAL_MS = 15000;
// Chỉ chữ ASCII, chữ tiếng Việt (NFC), chữ số; giữa các từ đúng 1 dấu cách. Khớp data/character.js và CHECK trong DB.
const TEXT_CHARS = '0-9A-Za-zÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯư\\u1EA0-\\u1EF9';
const TEXT_OK = new RegExp(`^[${TEXT_CHARS}]+(?: [${TEXT_CHARS}]+)*$`);
const textLength = (s: string) => Array.from(s).length;
const fail = (code: string, msg: string, details?: unknown) => { throw new GameError(code, msg, details); };
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
/* Cảnh giới lấy từ bảng xếp hạng (null nếu chưa có, ví dụ người chơi đã tọa hóa); admin do máy chủ xác định
 * qua game.admin_users, không bao giờ tin tên hoặc cờ do client gửi. */
const MESSAGE_SELECT = `SELECT m.id, m.owner_id, m.sender_name, m.body, m.created_at, m.channel_key,
    l.realm AS realm, (a.user_id IS NOT NULL) AS is_admin
  FROM game.world_chat_messages m
  LEFT JOIN game.player_leaderboard l ON l.owner_id = m.owner_id
  LEFT JOIN game.admin_users a ON a.user_id = m.owner_id AND a.enabled AND a.role IN ('owner','admin')`;
const asMessage = (r: Row) => ({
  id: String(r.id), senderId: String(r.owner_id), name: String(r.sender_name),
  text: String(r.body), at: asSafe(r.created_at), channel: String(r.channel_key || 'world').startsWith('sect:') ? 'sect' : String(r.channel_key || 'world'),
  realm: r.realm === null || r.realm === undefined ? null : Math.max(0, Math.min(13, asSafe(r.realm))),
  admin: r.is_admin === true
});
const player = (c: Db, ownerId: string) =>
  first(c, `SELECT p.id, p.name, l.sect_id, l.realm,
      EXISTS(SELECT 1 FROM game.admin_users a
        WHERE a.user_id = p.owner_id AND a.enabled AND a.role IN ('owner','admin')) AS is_admin
    FROM game.players p
    JOIN game.player_leaderboard l ON l.player_id = p.id
    WHERE p.owner_id = $1`, [ownerId]);
/* Nhóm kênh public độc lập; Tông môn chỉ cho thành viên cùng tông môn.
 * "Đạo hữu" và "Đạo lữ" là phòng cộng đồng, KHÔNG phải nhắn riêng. */
const channelOf = (input: unknown, me: Row): string => {
  if (typeof input !== 'string' || !['world','sect','dao_huu','dao_lu'].includes(input))
    return fail('INVALID_REQUEST','Kênh chat không hợp lệ.');
  if (input === 'sect') {
    if (!me.sect_id) return fail('CHANNEL_FORBIDDEN','Hãy gia nhập Tông môn để dùng kênh này.');
    return 'sect:' + String(me.sect_id);
  }
  return input;
};

/* Micro-cache + singleflight cho lịch sử kênh. N người cùng poll trong 4 giây
 * chỉ tốn một truy vấn; dữ liệu vẫn được lọc lại theo TTL 1 giờ ở mỗi response. */
const readCache = new Map<string, { at: number; rows: Row[] }>();
const readInFlight = new Map<string, Promise<Row[]>>();
async function latestMessages(c: Db, channelKey: string, now: number): Promise<Row[]> {
  const hit = readCache.get(channelKey);
  if (hit && Date.now() - hit.at < READ_CACHE_MS) return hit.rows;
  let pending = readInFlight.get(channelKey);
  if (!pending) {
    pending = rows(c, `${MESSAGE_SELECT}
      WHERE m.channel_key = $1 AND m.created_at > $2
      ORDER BY m.id DESC LIMIT ${LIMIT}`, [channelKey, now - MESSAGE_TTL_MS])
      .then(found => {
        if (readCache.size > 64) readCache.clear();
        readCache.set(channelKey, { at: Date.now(), rows: found });
        return found;
      })
      .finally(() => { readInFlight.delete(channelKey); });
    readInFlight.set(channelKey, pending);
  }
  return pending;
}
/* Lọc lại tại thời điểm trả response: cache tối đa 4 giây nhưng không được
 * để tin vượt quá TTL 1 giờ chỉ vì request bắt đầu trước đó. */
const visibleSince = (found: Row[]): Row[] => {
  const cutoff = Date.now() - MESSAGE_TTL_MS;
  return found.filter(row => asSafe(row.created_at) > cutoff);
};

/* Số người hiện diện là số ước lượng đủ dùng cho UI, không phải dữ liệu gameplay.
 * Cache 45 giây và singleflight để count(*) không chạy trên mỗi lượt poll. */
let onlineCache = { at: 0, value: 0 };
let onlineInFlight: Promise<number> | null = null;
async function onlineCount(c: Db, now: number): Promise<number> {
  if (now - onlineCache.at < ONLINE_CACHE_MS) return onlineCache.value;
  if (!onlineInFlight) {
    onlineInFlight = first(c, 'SELECT count(*)::bigint AS n FROM game.world_chat_presence WHERE seen_at >= $1',
      [now - ONLINE_GRACE_MS])
      .then(row => {
        const value = asSafe(row?.n);
        onlineCache = { at: Date.now(), value };
        return value;
      })
      .finally(() => { onlineInFlight = null; });
  }
  return onlineInFlight;
}
/* Connect ghi presence khi đã cũ hơn 60 giây; poll chỉ UPDATE (không upsert)
 * và cũng chỉ ghi khi cũ, nên không tạo row version mỗi 10 giây. */
async function heartbeat(c: Db, ownerId: string, now: number): Promise<void> {
  await rows(c, `INSERT INTO game.world_chat_presence (owner_id, seen_at, last_chat_at)
    VALUES ($1, $2, 0)
    ON CONFLICT(owner_id) DO UPDATE SET seen_at = EXCLUDED.seen_at
    WHERE game.world_chat_presence.seen_at < EXCLUDED.seen_at - $3::bigint`,
  [ownerId, now, HEARTBEAT_MS]);
}
async function touchPresence(c: Db, ownerId: string, now: number): Promise<void> {
  await rows(c, `UPDATE game.world_chat_presence SET seen_at = $2
    WHERE owner_id = $1 AND seen_at < $2 - $3::bigint`,
  [ownerId, now, HEARTBEAT_MS]);
}
/* Conditional UPDATE làm rate limiter: hàng presence bị khóa ngắn, không cần
 * advisory lock và không cần đọc tin gần nhất. Trả null nếu đã chiếm được slot. */
async function claimSendSlot(c: Db, ownerId: string, now: number): Promise<number | null> {
  const claimed = await first(c, `INSERT INTO game.world_chat_presence (owner_id, seen_at, last_chat_at)
    VALUES ($1, $2, $2)
    ON CONFLICT(owner_id) DO UPDATE
      SET last_chat_at = EXCLUDED.last_chat_at,
          seen_at = greatest(game.world_chat_presence.seen_at, EXCLUDED.seen_at)
      WHERE game.world_chat_presence.last_chat_at <= EXCLUDED.last_chat_at - $3::bigint
    RETURNING last_chat_at`, [ownerId, now, SEND_INTERVAL_MS]);
  if (claimed) return null;
  const last = await first(c, 'SELECT last_chat_at FROM game.world_chat_presence WHERE owner_id = $1', [ownerId]);
  return Math.max(1000, asSafe(last?.last_chat_at) + SEND_INTERVAL_MS - now);
}
function cursorOf(data: Record<string, unknown>): number {
  const cursor = data.since ?? 0;
  if (!Number.isSafeInteger(cursor) || Number(cursor) < 0) fail('INVALID_REQUEST', 'Con trỏ tin nhắn không hợp lệ.');
  return Number(cursor);
}

export async function handleSocial(repo: Database, ownerId: string, route: string, rawBody: unknown): Promise<unknown> {
  const now = Date.now();
  if (route === 'chatConnect') {
    const body = strict(rawBody, ['channel']);
    return repo.connection(async c => {
      const me = await player(c, ownerId);
      if (!me) return fail('PLAYER_NOT_FOUND', 'Bạn cần có đạo thân trước khi truyền âm.');
      const channelKey = channelOf(body.channel || 'world', me);
      await heartbeat(c, ownerId, now);
      const history = visibleSince(await latestMessages(c, channelKey, now));
      const messages = history.slice().reverse().map(asMessage);
      return {
        self: {
          id: ownerId, name: String(me.name),
          realm: me.realm === null || me.realm === undefined ? null : Math.max(0, Math.min(13, asSafe(me.realm))),
          admin: me.is_admin === true
        },
        messages, online: await onlineCount(c, now),
        cursor: messages.at(-1)?.id || '0', channel: body.channel || 'world'
      };
    });
  }
  if (route === 'chatPoll') {
    const body = strict(rawBody, ['since','channel']);
    const since = cursorOf(body);
    return repo.connection(async c => {
      const me = await player(c, ownerId);
      if (!me) return fail('PLAYER_NOT_FOUND', 'Đạo thân không tồn tại.');
      const channelKey = channelOf(body.channel || 'world', me);
      await touchPresence(c, ownerId, now);
      const cached = visibleSince(await latestMessages(c, channelKey, now));
      const oldest = cached.length ? asSafe(cached[cached.length - 1].id) : 0;
      let found: Row[];
      if (since > 0 && oldest > 0 && since < oldest - 1) {
        // Cursor cũ hơn cửa sổ cache: đọc bù đúng khoảng còn thiếu, vẫn giới hạn TTL.
        found = await rows(c, `${MESSAGE_SELECT}
          WHERE m.channel_key = $1 AND m.id > $2 AND m.created_at > $3
          ORDER BY m.id ASC LIMIT ${LIMIT}`, [channelKey, String(since), now - MESSAGE_TTL_MS]);
      } else {
        found = cached.filter(row => asSafe(row.id) > since).reverse();
      }
      return { messages: found.map(asMessage), online: await onlineCount(c, now), channel: body.channel || 'world',
        cursor: found.length ? String(found.at(-1)?.id) : String(since), hasMore: found.length === LIMIT };
    });
  }
  if (route === 'chatLeave') {
    strict(rawBody, []);
    return repo.connection(async c => {
      // Chỉ đánh dấu offline, giữ last_chat_at để đóng/mở chat không reset cooldown 15 giây.
      // Cron dọn presence không hoạt động quá 10 phút sẽ xóa hẳn hàng.
      await rows(c, 'UPDATE game.world_chat_presence SET seen_at = 0 WHERE owner_id = $1', [ownerId]);
      return { left: true };
    });
  }
  if (route === 'chatSend') {
    const body = strict(rawBody, ['text', 'requestId', 'channel']);
    const text = typeof body.text === 'string' ? body.text.normalize('NFC').trim() : '';
    if (!text || textLength(text) > MAX_TEXT || !TEXT_OK.test(text))
      return fail('INVALID_REQUEST', `Lời truyền âm dài 1–${MAX_TEXT} ký tự, chỉ gồm chữ cái, chữ số và dấu cách.`);
    const requestId = body.requestId;
    if (typeof requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId))
      return fail('INVALID_REQUEST', 'Mã tin nhắn không hợp lệ.');
    return repo.transaction(async c => {
      const me = await player(c, ownerId);
      if (!me) return fail('PLAYER_NOT_FOUND', 'Bạn cần có đạo thân trước khi truyền âm.');
      const channelKey = channelOf(body.channel || 'world', me);
      // Idempotency trước rate limit: retry cùng requestId không bị cooldown chặn oan.
      const previous = await first(c, `${MESSAGE_SELECT}
        WHERE m.owner_id = $1 AND m.request_id = $2 AND m.created_at > $3`,
      [ownerId, requestId, now - MESSAGE_TTL_MS]);
      if (previous) {
        if (previous.body !== text || previous.channel_key !== channelKey)
          return fail('REQUEST_ID_REUSED','Mã tin nhắn đã được dùng cho kênh hoặc nội dung khác.');
        return { message: asMessage(previous), replayed: true };
      }
      const retryAfterMs = await claimSendSlot(c, ownerId, now);
      if (retryAfterMs !== null)
        return fail('RATE_LIMITED', 'Mỗi tin nhắn cách nhau ít nhất 15 giây.', { retryAfterMs });
      // Tin cùng requestId đã hết TTL nhưng cron chưa kịp xóa: dọn trước khi insert.
      await rows(c, `DELETE FROM game.world_chat_messages
        WHERE owner_id = $1 AND request_id = $2 AND created_at <= $3`,
      [ownerId, requestId, now - MESSAGE_TTL_MS]);
      const saved = await first(c, `INSERT INTO game.world_chat_messages
        (owner_id, sender_name, body, request_id, created_at, channel_key)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id`,
      [ownerId, String(me.name).slice(0, 60), text, requestId, now, channelKey]);
      if (!saved) return fail('MAINTENANCE', 'Chưa thể lưu lời truyền âm.');
      readCache.delete(channelKey);
      const full = await first(c, `${MESSAGE_SELECT} WHERE m.id = $1 AND m.created_at > $2`,
        [saved.id, now - MESSAGE_TTL_MS]);
      if (!full) return fail('MAINTENANCE', 'Chưa thể lưu lời truyền âm.');
      return { message: asMessage(full), replayed: false };
    });
  }
  if (route === 'leaderboard') {
    const body = strict(rawBody, ['mode']);
    const mode = body.mode || 'power';
    if (mode !== 'power' && mode !== 'realm') return fail('INVALID_REQUEST','Tiêu chí xếp hạng không hợp lệ.');
    return repo.connection(async c => {
      const order = mode === 'realm'
        ? 'realm DESC, stage DESC, combat_power DESC, player_id ASC'
        : 'combat_power DESC, player_id ASC';
      const leaders = await rows(c, `SELECT player_id, owner_id, name, realm, stage, combat_power
        FROM game.player_leaderboard ORDER BY ${order} LIMIT ${LIMIT}`);
      const me = await first(c, `SELECT player_id, owner_id, name, realm, stage, combat_power
        FROM game.player_leaderboard WHERE owner_id = $1`, [ownerId]);
      let rank: number | null = null;
      if (me) {
        const ahead = mode === 'realm'
          ? await first(c, `SELECT count(*)::bigint AS n FROM game.player_leaderboard
              WHERE realm > $1 OR (realm = $1 AND stage > $2)
                OR (realm = $1 AND stage = $2 AND combat_power > $3)
                OR (realm = $1 AND stage = $2 AND combat_power = $3 AND player_id < $4)`,
              [me.realm, me.stage, me.combat_power, me.player_id])
          : await first(c, `SELECT count(*)::bigint AS n FROM game.player_leaderboard
              WHERE combat_power > $1 OR (combat_power = $1 AND player_id < $2)`,
              [me.combat_power, me.player_id]);
        rank = asSafe(ahead?.n) + 1;
      }
      const format = (r: Row) => ({ id: String(r.player_id), you: r.owner_id === ownerId,
        name: String(r.name), realm: asSafe(r.realm), stage: asSafe(r.stage),
        power: asSafe(r.combat_power) });
      return { entries: leaders.map(format), me: me ? { ...format(me), rank } : null, mode, limit: LIMIT };
    });
  }

  return fail('NOT_FOUND', 'Chưa có API này.');
}
