/* Chạy được bằng cả `deno test` và `node --test` (chỉ dùng node:test + node:assert). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createVerifiedUserCache } from './auth-cache.ts';

const ID = '11111111-2222-4333-8444-555555555555';
const OTHER = '99999999-2222-4333-8444-555555555555';

function counter(result: (token: string) => string | null | Error) {
  const calls: string[] = [];
  const verify = async (token: string) => {
    calls.push(token);
    const r = result(token);
    if (r instanceof Error) throw r;
    return r;
  };
  return { calls, verify };
}
function fakeJwt(expSeconds: number): string {
  const enc = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return enc({ alg: 'none' }) + '.' + enc({ exp: expSeconds }) + '.sig';
}

test('ttl = 0 (mặc định): không cache, mọi request đều xác minh', async () => {
  const cache = createVerifiedUserCache({ ttlMs: 0 });
  const { calls, verify } = counter(() => ID);
  assert.equal(await cache.lookup('tok', verify), ID);
  assert.equal(await cache.lookup('tok', verify), ID);
  assert.equal(calls.length, 2);
  assert.equal(cache.size(), 0);
});

test('ttl > 0: lần hai trong hạn không xác minh lại; hết hạn thì xác minh lại', async () => {
  let clock = 1_000_000;
  const cache = createVerifiedUserCache({ ttlMs: 10_000, now: () => clock });
  const { calls, verify } = counter(() => ID);
  assert.equal(await cache.lookup('tok', verify), ID);
  clock += 9_999;
  assert.equal(await cache.lookup('tok', verify), ID);
  assert.equal(calls.length, 1);
  clock += 2;
  assert.equal(await cache.lookup('tok', verify), ID);
  assert.equal(calls.length, 2);
});

test('token bị từ chối (null) không bao giờ được cache', async () => {
  const cache = createVerifiedUserCache({ ttlMs: 10_000 });
  let valid = false;
  const { calls, verify } = counter(() => valid ? ID : null);
  assert.equal(await cache.lookup('tok', verify), null);
  assert.equal(await cache.lookup('tok', verify), null);
  assert.equal(calls.length, 2);
  assert.equal(cache.size(), 0);
  valid = true;
  assert.equal(await cache.lookup('tok', verify), ID);
  assert.equal(cache.size(), 1);
});

test('lỗi dịch vụ xác thực không được cache và được ném lại nguyên vẹn', async () => {
  const cache = createVerifiedUserCache({ ttlMs: 10_000 });
  let healthy = false;
  const { calls, verify } = counter(() => healthy ? ID : Error('AUTH_UNAVAILABLE'));
  await assert.rejects(cache.lookup('tok', verify), /AUTH_UNAVAILABLE/);
  await assert.rejects(cache.lookup('tok', verify), /AUTH_UNAVAILABLE/);
  assert.equal(calls.length, 2);
  healthy = true;
  assert.equal(await cache.lookup('tok', verify), ID);
});

test('token khác nhau không dùng chung kết quả', async () => {
  const cache = createVerifiedUserCache({ ttlMs: 10_000 });
  const { calls, verify } = counter(t => t === 'a' ? ID : OTHER);
  assert.equal(await cache.lookup('a', verify), ID);
  assert.equal(await cache.lookup('b', verify), OTHER);
  assert.equal(await cache.lookup('a', verify), ID);
  assert.equal(calls.length, 2);
});

test('hạn cache bị rút ngắn theo exp của JWT, không bao giờ kéo dài hơn', async () => {
  let clock = 1_000_000_000;
  const cache = createVerifiedUserCache({ ttlMs: 30_000, now: () => clock });
  const token = fakeJwt(Math.floor(clock / 1000) + 2); // còn 2 giây
  const { calls, verify } = counter(() => ID);
  await cache.lookup(token, verify);
  clock += 1_500;
  await cache.lookup(token, verify);
  assert.equal(calls.length, 1, 'trong hạn exp vẫn dùng cache');
  clock += 1_000;
  await cache.lookup(token, verify);
  assert.equal(calls.length, 2, 'quá exp phải xác minh lại dù ttl còn dài');
});

test('token đã hết hạn theo exp thì không vào cache', async () => {
  const clock = 1_000_000_000;
  const cache = createVerifiedUserCache({ ttlMs: 30_000, now: () => clock });
  const { verify } = counter(() => ID);
  await cache.lookup(fakeJwt(Math.floor(clock / 1000) - 5), verify);
  assert.equal(cache.size(), 0);
});

test('bộ nhớ có giới hạn: vượt maxEntries thì loại mục cũ nhất', async () => {
  const cache = createVerifiedUserCache({ ttlMs: 10_000, maxEntries: 3 });
  const { calls, verify } = counter(() => ID);
  for (const t of ['t1', 't2', 't3', 't4']) await cache.lookup(t, verify);
  assert.equal(cache.size(), 3);
  await cache.lookup('t1', verify); // t1 đã bị loại -> xác minh lại
  assert.equal(calls.length, 5);
});

test('request song song cùng token dùng chung một lần xác minh', async () => {
  const cache = createVerifiedUserCache({ ttlMs: 10_000 });
  let calls = 0;
  const verify = async () => { calls++; await new Promise(r => setTimeout(r, 15)); return ID; };
  const results = await Promise.all([1, 2, 3, 4].map(() => cache.lookup('tok', verify)));
  assert.deepEqual(results, [ID, ID, ID, ID]);
  assert.equal(calls, 1);
});

test('xác minh song song thất bại: mọi bên nhận lỗi và lần sau thử lại được', async () => {
  const cache = createVerifiedUserCache({ ttlMs: 10_000 });
  let calls = 0, fail = true;
  const verify = async () => { calls++; await new Promise(r => setTimeout(r, 10)); if (fail) throw Error('AUTH_UNAVAILABLE'); return ID; };
  const settled = await Promise.allSettled([cache.lookup('tok', verify), cache.lookup('tok', verify)]);
  assert.ok(settled.every(s => s.status === 'rejected'));
  assert.equal(calls, 1);
  fail = false;
  assert.equal(await cache.lookup('tok', verify), ID);
});
