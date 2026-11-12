/* Additional per-isolate abuse budget. The Postgres repository remains the
 * durable gameplay quota; this protects read/pre-creation/Pavilion routes and
 * rejected requests without making extra DB calls. Not a distributed WAF. */
type Bucket = { tokens: number; at: number; capacity: number; perMinute: number };
type Rule = { capacity: number; perMinute: number };
const ROUTE_GROUP: Record<string, string> = {
  bootstrap: 'read', state: 'read', preview: 'preview', create: 'create',
  pavilionPurchase: 'pavilion', commands: 'command', sync: 'sync',
  chatConnect: 'chatConnect', chatPoll: 'chatPoll', chatSend: 'chatSend', chatLeave: 'chatConnect', leaderboard: 'leaderboard',
  pause: 'pause', resetAfterDeath: 'create', deleteCharacter: 'dataRights',
  daily: 'read', dailyClaim: 'command', dailyCheckin: 'command', mail: 'read', mailClaim: 'command',
  exportData: 'dataRights', eraseData: 'dataRights', deleteAccount: 'dataRights'
};
export function createEdgeRateLimiter({
  clock = Date.now, syncIntervalMs = 20000, maxBuckets = 8192
}: { clock?: () => number; syncIntervalMs?: number; maxBuckets?: number } = {}) {
  if (!Number.isSafeInteger(syncIntervalMs) || syncIntervalMs < 1000 ||
      !Number.isSafeInteger(maxBuckets) || maxBuckets < 1) throw Error('Bad limiter configuration');
  const rules: Record<string, Rule> = {
    read: { capacity: 30, perMinute: 60 },
    preview: { capacity: 5, perMinute: 6 },
    create: { capacity: 3, perMinute: 3 },
    pavilion: { capacity: 10, perMinute: 30 },
    command: { capacity: 30, perMinute: 600 },
    sync: { capacity: 12, perMinute: Math.max(2, 2 * 60000 / syncIntervalMs) },
    pause: { capacity: 8, perMinute: 4 },
    dataRights: { capacity: 5, perMinute: 2 },
    chatConnect: { capacity: 4, perMinute: 8 },
    chatPoll: { capacity: 12, perMinute: 15 },
    chatSend: { capacity: 6, perMinute: 30 },
    leaderboard: { capacity: 6, perMinute: 6 }
  };
  const buckets = new Map<string, Bucket>();
  function refill(b: Bucket, now: number): number {
    return Math.min(b.capacity, b.tokens + Math.max(0, now - b.at) * b.perMinute / 60000);
  }
  function take(accountId: string, route: string): {ok: boolean; retryAfterMs: number} {
    const group = ROUTE_GROUP[route];
    if (!group || !accountId) return { ok: false, retryAfterMs: 60000 };
    const rule = rules[group], now = clock(), key = accountId + ':' + group;
    let bucket = buckets.get(key);
    if (!bucket && buckets.size >= maxBuckets) {
      // Evict only fully replenished buckets; never reset a user's active quota.
      for (const [oldKey, old] of buckets) {
        if (refill(old, now) >= old.capacity) {
          buckets.delete(oldKey);
          if (buckets.size < maxBuckets) break;
        }
      }
      if (buckets.size >= maxBuckets) return { ok: false, retryAfterMs: 1000 };
    }
    bucket ||= { tokens: rule.capacity, at: now, ...rule };
    bucket.tokens = refill(bucket, now);
    bucket.at = now;
    bucket.capacity = rule.capacity;
    bucket.perMinute = rule.perMinute;
    buckets.delete(key);
    buckets.set(key, bucket);
    if (bucket.tokens < 1) return {
      ok: false, retryAfterMs: Math.max(1, Math.ceil((1 - bucket.tokens) * 60000 / rule.perMinute))
    };
    bucket.tokens -= 1;
    return { ok: true, retryAfterMs: 0 };
  }
  return { take };
}
