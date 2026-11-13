/* Deno Edge HTTP regression: kiểm không cần DB/live credentials. */
import { corsHeaders, parseBody, routeOf, bearerToken } from './http.ts';

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw Error(message);
}
async function errorCode(promise: Promise<unknown>, code: string): Promise<void> {
  try { await promise; } catch (e) {
    if ((e as {code?:string}).code !== code) throw Error('Sai mã lỗi: ' + String((e as {code?:string}).code));
    return;
  }
  throw Error('Đáng lẽ phải từ chối: ' + code);
}
Deno.test('route giữ nguyên prefix function, quyền dữ liệu và UUID', () => {
  const prefix = '/functions/v1/api';
  expect(routeOf('GET', prefix + '/bootstrap')?.name === 'bootstrap', 'bootstrap route');
  expect(routeOf('GET', '/api/bootstrap')?.name === 'bootstrap', 'Supabase stripped functions/v1 prefix');
  expect(routeOf('GET', '/bootstrap')?.name === 'bootstrap', 'local bare pathname');
  expect(routeOf('GET', '/api/v1/bootstrap')?.name === 'bootstrap', 'bootstrap route');
  expect(routeOf('GET', '/api/typo') === null, 'unknown route still rejected');
  expect(routeOf('POST', prefix + '/pavilion/purchase')?.name === 'pavilionPurchase', 'pavilion route');
  expect(routeOf('GET', prefix + '/me/export')?.name === 'exportData', 'export route');
  expect(routeOf('POST', prefix + '/me/delete-account')?.name === 'deleteAccount', 'delete-account route');
  const id = '11111111-1111-4111-8111-111111111111';
  expect(routeOf('POST', prefix + '/players/' + id + '/commands')?.id === id, 'command route');
  expect(routeOf('POST', prefix + '/players/' + id + '/delete-character')?.name === 'deleteCharacter', 'delete-character route');
  expect(routeOf('GET', prefix + '/players/' + id + '/delete-character') === null, 'delete must use POST');
  expect(routeOf('GET', prefix + '/players/' + id + '/commands') === null, 'sai method');
  expect(routeOf('GET', prefix + '/players/not-uuid/state') === null, 'sai UUID');
});
Deno.test('CORS: allowlist, Vary Origin, headers & no wildcard', () => {
  const origins = new Set(['https://hugioi.redeyestudio.workers.dev']);
  const allowed = corsHeaders(new Request('https://api.example.test', {
    headers: { origin: 'https://hugioi.redeyestudio.workers.dev' }
  }), origins);
  expect(allowed.get('access-control-allow-origin') === 'https://hugioi.redeyestudio.workers.dev', 'allow exact origin');
  expect(allowed.get('vary') === 'Origin', 'Vary Origin');
  expect(allowed.get('access-control-allow-headers')?.includes('apikey'), 'allow apikey');
  expect(allowed.get('access-control-allow-headers')?.includes('x-request-id'), 'allow request id');
  const denied = corsHeaders(new Request('https://api.example.test', {
    headers: { origin: 'https://attacker.example.test' }
  }), origins);
  expect(denied.get('access-control-allow-origin') === null, 'deny other origin');
  expect(denied.get('vary') === 'Origin', 'deny still vary');
});
Deno.test('HTTP: JSON lỗi, sai content-type, >64KB, không tin client payload', async () => {
  const uri='https://api.example.test/functions/v1/api/players';
  await errorCode(parseBody(new Request(uri, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{bad'
  })), 'INVALID_REQUEST');
  await errorCode(parseBody(new Request(uri, {
    method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}'
  })), 'UNSUPPORTED_MEDIA_TYPE');
  await errorCode(parseBody(new Request(uri, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: ' '.repeat(65537)
  })), 'PAYLOAD_TOO_LARGE');
  const body = await parseBody(new Request(uri, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ offline: true, now: 0 })
  }));
  expect((body as {offline?:boolean}).offline === true, 'parsing only; PlayerService enforces allowlist');
});

Deno.test('Bearer parser accepts HTTP auth scheme casing and OWS, never api keys or duplicate headers', () => {
  expect(bearerToken('Bearer aaa.bbb-ccc.ddd') === 'aaa.bbb-ccc.ddd', 'normal JWT');
  expect(bearerToken('bearer  aaa.bbb.ccc') === 'aaa.bbb.ccc', 'HTTP case-insensitive scheme');
  expect(bearerToken(' Bearer\taaa.bbb.ccc\t') === 'aaa.bbb.ccc', 'HTTP optional whitespace');
  expect(bearerToken('Bearer aaa.bbb=.ccc=') === 'aaa.bbb=.ccc=', 'valid base64url padding');
  for (const raw of [null, '', 'Bearer', 'Basic abc', 'Bearer sb_publishable_key', 'Bearer aaa.bbb.ccc, Bearer other', 'Bearer abc\ndef']) {
    const parsed = bearerToken(raw);
    expect(parsed === null, 'reject absent/malformed bearer');
  }
});
