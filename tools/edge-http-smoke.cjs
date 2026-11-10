/* Smoke Deno.serve không kết nối DB production: preflight, bearer 401, CORS.
 * Fake credentials chỉ được dùng ở CI; không có kết nối đến pooler vì không JWT.
 */
'use strict';
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const path = require('node:path');
async function main() {
  const cwd = path.resolve(__dirname, '../supabase/functions/api');
  const env = { ...process.env,
    SUPABASE_URL: 'https://rvrwfeblishqadkpzspb.supabase.co',
    HU_ALLOWED_ORIGINS: 'https://hugioi.blackbearvn.workers.dev',
    HU_DB_POOLER_URL: 'postgresql://ci_fake:ci_fake@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
  };
  const server = spawn('deno', ['run', '--node-modules-dir=auto', '--allow-env', '--allow-net', '--allow-read', 'index.ts'], { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '';
  server.stdout.on('data', b => { logs += b.toString(); });
  server.stderr.on('data', b => { logs += b.toString(); });
  const base = 'http://127.0.0.1:8000/functions/v1/api';
  const origin = 'https://hugioi.blackbearvn.workers.dev';
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (server.exitCode !== null) break;
      try {
        const res = await fetch(base + '/bootstrap', { signal: AbortSignal.timeout(1000) });
        if (res.status === 401) { ready = true; break; }
      } catch { /* runtime chưa nhận request */ }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(ready, true, 'Edge Deno.serve không lên cổng 8000: ' + logs.slice(-1200));
    const unauthorized = await fetch(base + '/bootstrap');
    assert.equal(unauthorized.status, 401);
    assert.equal((await unauthorized.json()).error.code, 'UNAUTHENTICATED');
    assert.equal(unauthorized.headers.get('cache-control'), 'no-store');
    assert.ok(unauthorized.headers.get('x-request-id'));
    const options = await fetch(base + '/bootstrap', {
      method: 'OPTIONS', headers: { origin, 'access-control-request-method': 'GET' }
    });
    assert.equal(options.status, 204);
    assert.equal(options.headers.get('access-control-allow-origin'), origin);
    assert.equal(options.headers.get('vary'), 'Origin');
    const foreign = await fetch(base + '/bootstrap', {
      method: 'OPTIONS', headers: { origin: 'https://attacker.example.test' }
    });
    assert.equal(foreign.status, 204);
    assert.equal(foreign.headers.get('access-control-allow-origin'), null);
    const notFound = await fetch(base + '/totally-invalid');
    assert.equal(notFound.status, 404);
    console.log(JSON.stringify({ edgeHttpSmoke: 'PASS', unauthorized: unauthorized.status, preflight: options.status, unknownRoute: notFound.status }));
  } finally {
    server.kill('SIGTERM');
    await new Promise(resolve => { if (server.exitCode !== null) return resolve(); server.once('exit', resolve); });
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
