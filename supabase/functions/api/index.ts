/* Hư Giới — Supabase Edge Function 'api' (Deno).
 * Dùng đúng PlayerService + rules của Node đã bundle; Postgres là kho duy nhất.
 * JWT xác minh tại đây (verify_jwt=false để OPTIONS không bị gateway chặn).
 * Không tin bất kỳ thời gian, state, RNG, giá/thưởng hoặc cờ offline từ client. */
import { Pool } from 'https://deno.land/x/postgres@v0.17.0/mod.ts';
import { UUID, corsHeaders, routeOf, parseBody, bearerToken } from './http.ts';
import { createContentionCounter } from './contention-counter.ts';
import { createEdgeRateLimiter } from './api-rate-limit.ts';
import { getVerifiedUserId } from './auth-user.ts';
import { createVerifiedUserCache } from './auth-cache.ts';
import { handleSocial } from './social.ts';
import {
  PlayerService, PostgresPlayers, GameError, toEnvelope,
  createAccountAdmin, shouldLogApiError, CONTENT_VERSION
} from './game.bundle.mjs';

const BASE = (Deno.env.get('SUPABASE_URL') || '').replace(/\/+$/, '');
const DATABASE = Deno.env.get('HU_DB_POOLER_URL') || '';
const ORIGINS = new Set([
  'https://hugioi.redeyestudio.workers.dev',
  ...(Deno.env.get('HU_ALLOWED_ORIGINS') || 'https://hugioi.blackbearvn.workers.dev')
    .split(',').map(x => x.trim()).filter(Boolean)
]);
const POLICY_VERSION = '2026-11-11-v7';
const REQUIRED = new Set(['privacy', 'release_terms']);
const REQUEST_ID = /^[A-Za-z0-9_-]{8,64}$/;
const DATA_RIGHTS = new Set(['exportData', 'eraseData', 'deleteAccount']);
const startTime = performance.now();

function fromEnv(name: string, defaultValue: number, min: number, max: number): number {
  const raw = Deno.env.get(name);
  if (raw == null || !raw.length) return defaultValue;
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n < min || n > max)
    throw Error(name + ' phải là số nguyên trong giới hạn cho phép.');
  return n;
}
const syncInterval = fromEnv('HU_SYNC_INTERVAL_MS', 20000, 5000, 60000);
const grace = fromEnv('HU_ONLINE_GRACE_MS', 60000, 3 * syncInterval, 180000);
const apiLimiter = createEdgeRateLimiter({ syncIntervalMs: syncInterval });
// Cache xác minh JWT: MẶC ĐỊNH TẮT (0) để giữ thiết kế "hỏi Supabase Auth mỗi request".
// Bật bằng HU_AUTH_CACHE_MS (tối đa 30 giây): token bị thu hồi vẫn dùng được tới ngần ấy trên isolate đã cache.
const authCache = createVerifiedUserCache({ ttlMs: fromEnv('HU_AUTH_CACHE_MS', 0, 0, 30000) });
// Chấp thuận chỉ được thêm, không có luồng rút lại; 5 phút tránh hỏi DB gần mỗi 2 request.
const consentCacheMs = fromEnv('HU_CONSENT_CACHE_MS', 300000, 0, 900000);

if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(BASE))
  throw Error('SUPABASE_URL phải là origin Supabase HTTPS.');
if (ORIGINS.size === 0) throw Error('Cần HU_ALLOWED_ORIGINS cho CORS, không dùng wildcard.');
let pooler;
try {
  pooler = new URL(DATABASE);
  if (!['postgres:', 'postgresql:'].includes(pooler.protocol) || pooler.port && Number(pooler.port) !== 6543 ||
      !pooler.username || !pooler.password || !pooler.hostname.endsWith('.pooler.supabase.com'))
    throw Error('HU_DB_POOLER_URL phải dùng transaction pooler cổng 6543.');
} catch {
  throw Error('HU_DB_POOLER_URL chưa đúng định dạng transaction pooler Supabase.');
}

// Pool một connection/isolate. KHÔNG dùng postgres.js pipelining hay prepared
// statements có trạng thái phiên trên PgBouncer transaction mode.
const pool = new Pool({
  hostname: pooler.hostname,
  port: Number(pooler.port || 6543),
  database: decodeURIComponent(pooler.pathname.replace(/^\//, '')),
  user: decodeURIComponent(pooler.username),
  password: decodeURIComponent(pooler.password),
  tls: { enabled: true }
}, 1);

const repo = new PostgresPlayers({ pool, statementTimeoutMs: 1500, lockTimeoutMs: 900 });
const service = new PlayerService({
  repository: repo, contentVersion: CONTENT_VERSION,
  config: { onlineGraceMs: grace, nextSyncInMs: syncInterval, repositoryRates: true },
  onError: () => { /* log bên ngoài, không log state/token */ }
});
/* Supabase đã đánh dấu SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY là deprecated; runtime mới cấp
   SUPABASE_PUBLISHABLE_KEYS / SUPABASE_SECRET_KEYS (chuỗi JSON dạng dictionary). Giữ khóa cũ làm ưu tiên để
   không đổi hành vi hiện tại, và tự chuyển sang khóa mới khi khóa cũ bị gỡ. */
function runtimeKey(legacy: string, dict: string): string {
  const old = Deno.env.get(legacy);
  if (old) return old;
  try {
    const keys = JSON.parse(Deno.env.get(dict) || '{}') as Record<string, unknown>;
    const value = keys.default ?? Object.values(keys)[0];
    return typeof value === 'string' ? value : '';
  } catch { return ''; }
}
const adminKey = runtimeKey('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEYS');
const publicApiKey = runtimeKey('SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEYS');
const accountAdmin = adminKey ? createAccountAdmin({ url: BASE, secretKey: adminKey }) : null;

const consents = new Map();
// Supabase Edge giới hạn khoảng 100 log / 10 giây. Khi upstream lỗi hàng loạt,
// chỉ phát tối đa 80 dòng JSON / 10 giây / isolate, không log token/state/SQL.
let logWindowAt = Date.now(), logWindowCount = 0;
function logOperational(entry: Record<string, string | number>): void {
  const now = Date.now();
  if (now - logWindowAt >= 10000) { logWindowAt = now; logWindowCount = 0; }
  if (logWindowCount++ < 80) console.error(JSON.stringify(entry));
}
const countContention = createContentionCounter(count =>
  logOperational({ event: 'pg_contention_minute', count }));
async function requireConsent(userId: string): Promise<void> {
  const now = Date.now(), until = consents.get(userId) || 0;
  if (until > now) return;
  let rows;
  try {
    rows = await repo.connection(async (db: { queryObject: (q: { text: string; args: unknown[] }) => Promise<{ rows: { policy_kind: string }[] }> }) =>
      (await db.queryObject({
        text: 'SELECT policy_kind FROM public.policy_acceptances WHERE user_id = $1 AND policy_version = $2',
        args: [userId, POLICY_VERSION]
      })).rows
    );
  } catch {
    throw new GameError('MAINTENANCE', 'Không kiểm tra được trạng thái chấp thuận.');
  }
  if (!Array.isArray(rows) || !REQUIRED.size || rows.length > 2)
    throw new GameError('CONSENT_REQUIRED', 'Bạn cần chấp thuận chính sách trước khi chơi online.');
  const kinds = new Set(rows.map(r => r.policy_kind));
  if (![...REQUIRED].every(k => kinds.has(k)))
    throw new GameError('CONSENT_REQUIRED', 'Bạn cần chấp thuận chính sách quyền riêng tư và điều khoản phát hành trước khi chơi online.');
  if (consents.size >= 2048) consents.delete(consents.keys().next().value);
  if (consentCacheMs > 0) consents.set(userId, now + consentCacheMs);
}
async function authenticate(req: Request, route: string): Promise<string> {
  const header = req.headers.get('authorization') || '';
  const token = bearerToken(header);
  if (!token) {
    // Chỉ log thuộc tính dạng boolean/nhóm kích thước, không ghi JWT hay bất kỳ header value nào.
    logOperational({
      event: 'auth_header_rejected',
      headerPresent: header ? 1 : 0,
      bearerScheme: /^\s*Bearer\b/i.test(header) ? 1 : 0,
      lengthClass: !header ? 'empty' : header.length < 32 ? 'short' : header.length <= 4096 ? 'normal' : 'long',
      apikeyPresent: req.headers.has('apikey') ? 1 : 0
    });
    throw new GameError('UNAUTHENTICATED', 'Bạn cần đăng nhập.');
  }
  // Supabase Auth is the single source of truth for both HS256 and ES256
  // sessions; never trust a merely decoded JWT or user ID from the browser.
  let userId: string | null;
  try {
    userId = await authCache.lookup(token, t =>
      getVerifiedUserId(t, BASE, publicApiKey));
  } catch {
    throw new GameError('MAINTENANCE', 'Dịch vụ xác thực tạm thời không khả dụng.');
  }
  if (!userId) throw new GameError('UNAUTHENTICATED', 'Phiên đăng nhập không hợp lệ.');
  if (!DATA_RIGHTS.has(route)) await requireConsent(userId);
  return userId;
}
function jsonReply(req: Request, status: number, data: unknown, requestId: string, extra: Record<string, string | number> = {}): Response {
  const headers = corsHeaders(req, ORIGINS);
  headers.set('X-Request-Id', requestId);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  for (const [k, v] of Object.entries(extra)) headers.set(k, String(v));
  return new Response(JSON.stringify(data), { status, headers });
}

export async function handleApi(req: Request): Promise<Response> {
  const candidateId = req.headers.get('x-request-id') || '';
  const requestId: string = REQUEST_ID.test(candidateId) ? candidateId : crypto.randomUUID();
  const since = performance.now();
  let routeName = '';
  if (req.method === 'OPTIONS') {
    const headers = corsHeaders(req, ORIGINS);
    headers.set('X-Request-Id', requestId);
    return new Response(null, { status: 204, headers });
  }
  try {
    const route = routeOf(req.method, new URL(req.url).pathname);
    if (!route) throw new GameError('NOT_FOUND', 'Chưa có API này.');
    routeName = route.name;
    const ownerId = await authenticate(req, route.name);
    // Defense in depth against repeated reads/failed intents. Not global across
    // Edge isolates: Supabase Auth limits and an upstream WAF are still required.
    const quota = apiLimiter.take(ownerId, route.name);
    if (!quota.ok) throw new GameError('RATE_LIMITED', 'Thao tác quá nhanh. Hãy thử lại sau.', {
      retryAfterMs: quota.retryAfterMs
    });
    const body = await parseBody(req);
    let result, status = 200;
    switch (route.name) {
      case 'bootstrap': result = await service.bootstrap(ownerId); break;
      case 'chatConnect':
      case 'chatPoll':
      case 'chatSend':
      case 'chatLeave':
      case 'leaderboard':
        result = await handleSocial(repo, ownerId, route.name, body);
        break;
      case 'preview': result = await service.previewCreation(ownerId); status = 201; break;
      case 'create': result = await service.createPlayer(ownerId, body); status = 201; break;
      case 'pavilionPurchase': result = await service.pavilionPurchase(ownerId, body); break;
      case 'state': result = await service.state(ownerId, route.id); break;
      case 'sync': result = await service.sync(ownerId, route.id, body); break;
      case 'commands': result = await service.command(ownerId, route.id, body); break;
      case 'pause': result = await service.pause(ownerId, route.id); break;
      case 'resetAfterDeath': result = await service.resetAfterDeath(ownerId, route.id); break;
      case 'deleteCharacter': result = await service.deleteCharacter(ownerId, route.id, body); break;
      case 'exportData': result = await service.exportData(ownerId); break;
      case 'eraseData': result = await service.eraseData(ownerId, body); break;
      case 'deleteAccount': result = await service.deleteAccount(ownerId, body, accountAdmin); break;
    }
    return jsonReply(req, status, result, requestId,
      route.name === 'exportData' ? { 'Content-Disposition': 'attachment; filename="hu-gioi-du-lieu.json"' } : {});
  } catch (err) {
    countContention(err);
    const { status, body } = toEnvelope(err, requestId);
    const diagnostic = err instanceof Error ? err : null;
    const safeNames = new Set(['Error', 'TypeError', 'RangeError', 'ReferenceError', 'PostgresError', 'GameError']);
    const frame = diagnostic?.stack?.match(/game\.bundle\.mjs:(\d+):(\d+)/);
    const pgCode = (err as { code?: unknown } | null)?.code;
    if (shouldLogApiError(err, status)) logOperational({
      event: 'api_error', requestId, code: body.error.code, status,
      route: routeName, errorType: safeNames.has(diagnostic?.name || '') ? diagnostic?.name : 'Other',
      sqlstate: typeof pgCode === 'string' && /^[A-Z0-9]{5}$/.test(pgCode) ? pgCode : undefined,
      bundleFrame: frame ? `${frame[1]}:${frame[2]}` : undefined,
      durationMs: Math.round(performance.now() - since)
    }); // không token, state, SQL hoặc password; đã giới hạn log/isolate
    const failure = err as { details?: { retryAfterMs?: number } } | null;
    const retryAfterMs = Number(failure?.details?.retryAfterMs || 0);
    return jsonReply(req, status, body, requestId, retryAfterMs > 0 ? {
      'Retry-After': Math.max(1, Math.ceil(retryAfterMs / 1000))
    } : {});
  }
}
console.info(JSON.stringify({ event: 'edge_initialized', initMs: Math.round(performance.now() - startTime) }));
Deno.serve(handleApi);
