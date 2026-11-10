import { createEdgeRateLimiter } from './api-rate-limit.ts';
const expect = (condition: unknown, message: string) => { if (!condition) throw Error(message); };
Deno.test('read and command limits reject bursts, account quotas remain separate', () => {
  let now = 1_800_000_000_000;
  const limiter = createEdgeRateLimiter({ clock: () => now });
  for (let i = 0; i < 30; i++) expect(limiter.take('owner-a', i % 2 ? 'state' : 'bootstrap').ok, 'read token ' + i);
  const limited = limiter.take('owner-a', 'state');
  expect(!limited.ok && limited.retryAfterMs > 0, 'thirty-first read must be throttled');
  expect(limiter.take('owner-b', 'state').ok, 'a second owner must be independent');
  for (let i = 0; i < 30; i++) expect(limiter.take('owner-a', 'commands').ok, 'command token ' + i);
  expect(!limiter.take('owner-a', 'commands').ok, 'rejected intents still count at HTTP ingress');
  now += 1000;
  expect(limiter.take('owner-a', 'state').ok, 'read limit refills with time');
});
Deno.test('preview, Pavilion, data rights and pause are bounded', () => {
  const limiter = createEdgeRateLimiter({ clock: () => 1_800_000_000_000 });
  for (const [route, budget] of [
    ['preview', 5], ['pavilionPurchase', 10], ['exportData', 5], ['pause', 8], ['create', 3]
  ] as const) {
    for (let i = 0; i < budget; i++) expect(limiter.take('owner', route).ok, route + ' budget ' + i);
    expect(!limiter.take('owner', route).ok, route + ' must be bounded');
  }
  expect(!limiter.take('owner', 'unknown').ok, 'unknown routes must fail closed');
});
Deno.test('heartbeat at 5s and 20s intervals stays within its rate budget', () => {
  for (const interval of [5000, 20000, 60000]) {
    let now = 1_800_000_000_000;
    const limiter = createEdgeRateLimiter({ clock: () => now, syncIntervalMs: interval });
    for (let i = 0; i < 120; i++) {
      expect(limiter.take('online-owner', 'sync').ok, 'no idle 429 at interval ' + interval);
      now += interval;
    }
  }
});
Deno.test('bounded storage does not drop active rate buckets', () => {
  let now = 1_800_000_000_000;
  const limiter = createEdgeRateLimiter({ clock: () => now, maxBuckets: 1 });
  for (let i = 0; i < 30; i++) limiter.take('a', 'bootstrap');
  expect(!limiter.take('b', 'bootstrap').ok, 'new key must not reset active quota');
  expect(!limiter.take('a', 'bootstrap').ok, 'active key remains limited');
  now += 60000;
  expect(limiter.take('b', 'bootstrap').ok, 'full refill permits safe eviction');
});
