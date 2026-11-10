/* HTTP thuần của Edge API: CORS, route, giới hạn payload — test được không DB. */
import { GameError } from './game.bundle.mjs';
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const JSON_LIMIT = 64 * 1024;

export function corsHeaders(req: Request, allowedOrigins: ReadonlySet<string>): Headers {
  const headers = new Headers({
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer'
  });
  const origin = req.headers.get('origin');
  if (origin && allowedOrigins.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'authorization, apikey, content-type, x-client-info, x-request-id');
    headers.set('Access-Control-Max-Age', '600');
    headers.set('Access-Control-Expose-Headers', 'x-request-id, retry-after');
  }
  return headers;
}

/* Chỉ nhận JWT trong Authorization; không bao giờ chấp nhận apikey thay JWT.
 * Scheme Bearer không phân biệt chữ hoa/thường theo chuẩn HTTP, cho phép OWS. */
export function bearerToken(value: string | null): string | null {
  if (!value) return null;
  const m = /^[ \\t]*Bearer[ \\t]+([A-Za-z0-9._=-]+)[ \\t]*$/i.exec(value);
  return m ? m[1] : null;
}

export function routeOf(method: string, path: string): { name: string; id?: string } | null {
  const pathname = path.replace(/^\/functions\/v1\/api(?=\/|$)/, '')
    .replace(/^\/api\/v1(?=\/|$)/, '')
    // Supabase Gateway có thể chuyển pathname vào function dưới dạng /api/...
    .replace(/^\/api(?=\/|$)/, '');
  if (method === 'GET' && pathname === '/bootstrap') return { name: 'bootstrap' };
  if (method === 'POST' && pathname === '/creation/preview') return { name: 'preview' };
  if (method === 'POST' && pathname === '/players') return { name: 'create' };
  if (method === 'POST' && pathname === '/pavilion/purchase') return { name: 'pavilionPurchase' };
  if (method === 'GET' && pathname === '/me/export') return { name: 'exportData' };
  if (method === 'POST' && pathname === '/me/erase') return { name: 'eraseData' };
  if (method === 'POST' && pathname === '/me/delete-account') return { name: 'deleteAccount' };
  const match = /^\/players\/([0-9a-f-]{36})\/(state|sync|commands|pause|reset-after-death)$/i.exec(pathname);
  if (!match || !UUID.test(match[1])) return null;
  const op = match[2];
  if (method !== (op === 'state' ? 'GET' : 'POST')) return null;
  return { name: op === 'reset-after-death' ? 'resetAfterDeath' : op, id: match[1].toLowerCase() };
}
export async function parseBody(req: Request): Promise<unknown> {
  if (req.method !== 'POST') return {};
  const raw = req.headers.get('content-type') || '';
  if (!/^application\/json(?:\s*;|$)/i.test(raw))
    throw new GameError('UNSUPPORTED_MEDIA_TYPE', 'Dữ liệu phải là JSON.');
  if (Number(req.headers.get('content-length') || 0) > JSON_LIMIT)
    throw new GameError('PAYLOAD_TOO_LARGE', 'Dữ liệu quá lớn.');
  const reader = req.body?.getReader();
  if (!reader) return {};
  let length = 0;
  const parts = [];
  for (;;) {
    const part = await reader.read();
    if (part.done) break;
    length += part.value.byteLength;
    if (length > JSON_LIMIT) {
      await reader.cancel().catch(() => {});
      throw new GameError('PAYLOAD_TOO_LARGE', 'Dữ liệu quá lớn.');
    }
    parts.push(part.value);
  }
  if (!length) return {};
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new GameError('INVALID_REQUEST', 'JSON không hợp lệ.'); }
}

