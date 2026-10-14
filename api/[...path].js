import { buildApp } from '../apps/api/src/app.js';
let instance;
async function app() {
  if (!instance) instance = buildApp({ logger: false }).then(async x => { await x.ready(); return x; });
  return instance;
}
export default async function handler(req, res) {
  const fastify = await app();
  fastify.server.emit('request', req, res);
}
