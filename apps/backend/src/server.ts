import Fastify from 'fastify';
import cors from '@fastify/cors';

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: true,
  credentials: true,
});

app.get('/health', async () => ({
  ok: true,
  service: 'hu-gioi-backend',
  version: '0.1.0',
}));

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';

await app.listen({ port, host });
