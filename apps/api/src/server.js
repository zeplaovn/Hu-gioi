import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

const app = Fastify({ logger: true, bodyLimit: 1024 * 1024 });
await app.register(helmet);
const origins = (process.env.WEB_ORIGINS || 'http://localhost:5173').split(',').map(x => x.trim());
await app.register(cors, { origin: origins });
const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const anonKey = process.env.SUPABASE_ANON_KEY || '';
if (anonKey.startsWith('sb_secret_')) throw new Error('SUPABASE_ANON_KEY must be a publishable key');
app.get('/api/health', async () => ({ ok: true, service: 'hugioi-api' }));
app.get('/api/config', async () => ({ supabaseUrl, supabaseAnonKey: anonKey, hcaptchaSitekey: process.env.HCAPTCHA_SITEKEY || '' }));
app.get('/api/me', async (request, reply) => {
  const authorization = request.headers.authorization || '';
  if (!/^Bearer [^ ]+$/.test(authorization)) return reply.code(401).send({ error: 'unauthorized' });
  if (!supabaseUrl || !anonKey) return reply.code(503).send({ error: 'supabase_unconfigured' });
  let response;
  try {
    response = await fetch(supabaseUrl + '/auth/v1/user', {
      headers: { apikey: anonKey, authorization },
      signal: AbortSignal.timeout(8000)
    });
  } catch { return reply.code(502).send({ error: 'auth_unavailable' }); }
  if (!response.ok) return reply.code(response.status === 401 ? 401 : 502).send({ error: 'auth_failed' });
  const user = await response.json();
  return { id: user.id, email: user.email || null };
});
const port = Number(process.env.PORT || 3001);
await app.listen({ port, host: process.env.HOST || '127.0.0.1' });
