/* Cache ngắn hạn cho kết quả xác minh JWT THÀNH CÔNG, bọc ngoài getVerifiedUserId.
 *
 * Mặc định TẮT (ttlMs = 0): mọi request vẫn hỏi Supabase Auth như thiết kế gốc
 * (auth-user.test.ts khẳng định không có cache phiên trong chính getVerifiedUserId).
 * Chỉ bật khi chủ dự án đặt HU_AUTH_CACHE_MS > 0 và chấp nhận đánh đổi: token bị
 * thu hồi/đăng xuất vẫn dùng được tối đa ttlMs trên isolate đã cache nó.
 *
 * Bất biến an toàn:
 *  - Chỉ cache userId hợp lệ; token bị từ chối (null) và lỗi dịch vụ KHÔNG bao giờ được cache.
 *  - Khóa cache là SHA-256 của token, không giữ token thô trong bộ nhớ.
 *  - Hạn dùng không vượt quá `exp` của JWT (chỉ để RÚT NGẮN; không tin exp để cấp quyền).
 *  - Bộ nhớ bị chặn trên (maxEntries); request song song cùng token dùng chung một lần xác minh. */

export type VerifyToken = (token: string) => Promise<string | null>;

export interface VerifiedUserCache {
  lookup(token: string, verify: VerifyToken): Promise<string | null>;
  size(): number;
}

export interface VerifiedUserCacheOptions {
  ttlMs: number;
  maxEntries?: number;
  now?: () => number;
}

async function keyOf(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

/* Chỉ dùng để rút ngắn thời hạn cache; trả null nếu không đọc được. */
function tokenExpiryMs(token: string): number | null {
  const part = token.split('.')[1];
  if (!part) return null;
  try {
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '='));
    const exp = Number(JSON.parse(json)?.exp);
    return Number.isFinite(exp) && exp > 0 ? exp * 1000 : null;
  } catch {
    return null;
  }
}

export function createVerifiedUserCache(
  { ttlMs, maxEntries = 2048, now = Date.now }: VerifiedUserCacheOptions
): VerifiedUserCache {
  const entries = new Map<string, { userId: string; expiresAt: number }>();
  const inflight = new Map<string, Promise<string | null>>();

  async function lookup(token: string, verify: VerifyToken): Promise<string | null> {
    if (!(ttlMs > 0) || !token) return verify(token);
    const key = await keyOf(token);
    const t = now();
    const hit = entries.get(key);
    if (hit) {
      if (hit.expiresAt > t) return hit.userId;
      entries.delete(key);
    }
    const pending = inflight.get(key);
    if (pending) return pending;

    const run = (async () => {
      const userId = await verify(token);
      if (userId) {
        const exp = tokenExpiryMs(token);
        const expiresAt = Math.min(now() + ttlMs, exp ?? Infinity);
        if (expiresAt > now()) {
          if (entries.size >= maxEntries) {
            const oldest = entries.keys().next().value;
            if (oldest !== undefined) entries.delete(oldest);
          }
          entries.set(key, { userId, expiresAt });
        }
      }
      return userId;
    })();
    inflight.set(key, run);
    try {
      return await run;
    } finally {
      inflight.delete(key);
    }
  }

  return { lookup, size: () => entries.size };
}
