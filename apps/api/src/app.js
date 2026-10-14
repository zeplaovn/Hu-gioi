import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

export async function buildApp({ logger = true } = {}) {
  const app = Fastify({ logger, bodyLimit: 1024 * 1024 });
  await app.register(helmet);
  const origins = (process.env.WEB_ORIGINS || 'http://localhost:5173').split(',').map(x => x.trim());
  await app.register(cors, { origin: origins });

  const base = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_ANON_KEY || '';
  if (key.startsWith('sb_secret_')) throw new Error('Use public Supabase anon/publishable key only');

  function bearer(req) {
    const h = req.headers.authorization || '';
    return /^Bearer [^ ]+$/.test(h) ? h : null;
  }
  async function sb(path, { method = 'GET', body, token } = {}) {
    if (!base || !key) { const e = new Error('supabase_unconfigured'); e.statusCode = 503; throw e; }
    let r;
    try {
      r = await fetch(base + path, {
        method,
        headers: { apikey: key, 'Content-Type': 'application/json', ...(token ? { Authorization: token } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(10000)
      });
    } catch { const e = new Error('supabase_unavailable'); e.statusCode = 502; throw e; }
    const text = await r.text(); let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { message: text }; }
    if (!r.ok) { const e = new Error(data?.message || data?.msg || 'supabase_error'); e.statusCode = r.status; e.data = data; throw e; }
    return data;
  }
  async function requireUser(req, reply) {
    const token = bearer(req);
    if (!token) { reply.code(401).send({ error: 'unauthorized' }); return null; }
    try { const user = await sb('/auth/v1/user', { token }); return { token, user }; }
    catch (e) { reply.code(e.statusCode === 401 ? 401 : 502).send({ error: 'auth_failed' }); return null; }
  }

  app.setErrorHandler((e, req, reply) => {
    req.log?.error?.(e);
    reply.code(e.statusCode || 500).send({ error: e.message || 'server_error', detail: e.data || null });
  });
  app.get('/api/health', async () => ({ ok: true, service: 'hugioi-api', version: 2 }));
  app.get('/api/config', async () => ({ supabaseUrl: base, supabaseAnonKey: key, hcaptchaSitekey: process.env.HCAPTCHA_SITEKEY || '' }));
  app.get('/api/me', async (req, reply) => { const a = await requireUser(req, reply); if (!a) return; return { id: a.user.id, email: a.user.email || null }; });
  app.get('/api/save', async (req, reply) => { const a = await requireUser(req, reply); if (!a) return; const rows = await sb('/rest/v1/player_saves?select=save,meta,rev,updated_at&limit=1', { token: a.token }); return Array.isArray(rows) && rows[0] ? rows[0] : null; });
  app.post('/api/save', async (req, reply) => { const a = await requireUser(req, reply); if (!a) return; const b = req.body || {}; return sb('/rest/v1/rpc/save_game', { method: 'POST', token: a.token, body: { p_save: b.save ?? null, p_meta: b.meta ?? {}, p_rev: Number(b.rev || 0), p_force: !!b.force } }); });
  app.get('/api/leaderboard', async (req, reply) => { const a = await requireUser(req, reply); if (!a) return; const top = await sb('/rest/v1/leaderboard?select=user_id,name,level,months&order=level.desc,months.asc,updated_at.asc&limit=50', { token: a.token }); const uid = a.user.id; const rank = Array.isArray(top) ? top.findIndex(x => x.user_id === uid) + 1 : 0; return { top: Array.isArray(top) ? top : [], rank: rank || null, uid }; });
  app.get('/api/chat', async (req, reply) => { const a = await requireUser(req, reply); if (!a) return; const after = Math.max(0, Number(req.query?.after || 0)); const q = after ? `/rest/v1/chat_messages?select=id,user_id,name,body,created_at,is_admin&id=gt.${after}&order=id.asc&limit=100` : '/rest/v1/chat_messages?select=id,user_id,name,body,created_at,is_admin&order=id.desc&limit=50'; let rows = await sb(q, { token: a.token }); if (!after && Array.isArray(rows)) rows.reverse(); return rows; });
  app.post('/api/chat', async (req, reply) => { const a = await requireUser(req, reply); if (!a) return; const body = String(req.body?.body || '').trim(); if (!body || body.length > 240) return reply.code(400).send({ error: 'invalid_message' }); return sb('/rest/v1/rpc/send_chat', { method: 'POST', token: a.token, body: { p_body: body } }); });
  app.delete('/api/account', async (req, reply) => { const a = await requireUser(req, reply); if (!a) return; await sb('/rest/v1/rpc/delete_account', { method: 'POST', token: a.token, body: {} }); return { ok: true }; });
  return app;
}
