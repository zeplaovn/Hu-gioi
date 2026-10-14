import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

const app = Fastify({ logger: true, bodyLimit: 1024 * 1024 });
await app.register(helmet);
const origins = (process.env.WEB_ORIGINS || 'http://localhost:5173').split(',').map(x => x.trim());
await app.register(cors, { origin: origins });
app.get('/api/health', async () => ({ ok: true, service: 'hugioi-api' }));
app.get('/api/config', async () => ({ supabaseUrl: process.env.SUPABASE_URL || '', supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '', hcaptchaSitekey: process.env.HCAPTCHA_SITEKEY || '' }));
const port = Number(process.env.PORT || 3001);
await app.listen({ port, host: process.env.HOST || '127.0.0.1' });
