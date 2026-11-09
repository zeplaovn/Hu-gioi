/* Kiểm tra chính sách đã chấp thuận trên Supabase ngay tại API.
   Không tin vào trạng thái checkbox hoặc user_metadata do client kiểm soát. */
'use strict';
const crypto = require('node:crypto');
const { GameError } = require('../errors.js');

const VERSION = '2026-11-09-v3';
const REQUIRED = ['privacy', 'release_terms'];

function createConsentVerifier({
  url, publishableKey, fetchImpl = globalThis.fetch, clock = Date.now,
  ttlMs = 30000, timeoutMs = 5000, maxCache = 2048
} = {}) {
  let project;
  try { project = new URL(url); } catch { throw Error('SUPABASE_URL chưa được cấu hình hợp lệ.'); }
  if (project.protocol !== 'https:' || !project.hostname.endsWith('.supabase.co') ||
      project.username || project.password || project.search || project.hash || project.pathname !== '/') {
    throw Error('SUPABASE_URL phải là HTTPS origin của dự án Supabase.');
  }
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(String(publishableKey || '')))
    throw Error('Cần SUPABASE_PUBLISHABLE_KEY để xác minh chấp thuận chính sách.');

  const endpoint = new URL('/rest/v1/policy_acceptances', project);
  const cache = new Map();
  const pending = new Map();

  async function check(token, userId) {
    const key = crypto.createHash('sha256').update(token + '\0' + userId + '\0' + VERSION).digest('hex');
    if (cache.get(key) > clock()) return;
    if (pending.has(key)) return pending.get(key);

    const task = (async () => {
      const query = new URL(endpoint);
      query.searchParams.set('select', 'policy_kind');
      query.searchParams.set('user_id', 'eq.' + userId);
      query.searchParams.set('policy_version', 'eq.' + VERSION);
      let result;
      try {
        const response = await fetchImpl(query.toString(), {
          method: 'GET', headers: { apikey: publishableKey, Authorization: 'Bearer ' + token, Accept: 'application/json' },
          cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(timeoutMs)
        });
        if (response.status === 401) throw new GameError('UNAUTHENTICATED', 'Phiên đăng nhập không còn hợp lệ.');
        if (response.status === 403) throw new GameError('FORBIDDEN', 'Không được truy cập bản chấp thuận.');
        if (!response.ok) throw new GameError('MAINTENANCE', 'Không kiểm tra được chính sách.');
        result = await response.json();
      } catch (error) {
        if (error instanceof GameError) throw error;
        throw new GameError('MAINTENANCE', 'Không kiểm tra được trạng thái chấp thuận.');
      }
      if (!Array.isArray(result) || result.length > 2 ||
          result.some(row => !row || typeof row.policy_kind !== 'string'))
        throw new GameError('MAINTENANCE', 'Phản hồi chính sách không hợp lệ.');
      const accepted = new Set(result.map(row => row.policy_kind));
      if (!REQUIRED.every(kind => accepted.has(kind)))
        throw new GameError('CONSENT_REQUIRED', 'Bạn cần chấp thuận chính sách quyền riêng tư và điều khoản phát hành trước khi chơi online.');
      if (cache.size >= maxCache) cache.clear();
      cache.set(key, clock() + ttlMs);
    })();
    pending.set(key, task);
    try { await task; } finally { pending.delete(key); }
  }

  return { check, VERSION };
}

module.exports = { createConsentVerifier };
