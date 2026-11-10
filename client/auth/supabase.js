/* Supabase Auth/PostgREST adapter. Only the public publishable key is shipped to browsers.
   Sessions live in sessionStorage, never localStorage. */
(function (root) {
  'use strict';
  const URL = 'https://rvrwfeblishqadkpzspb.supabase.co';
  const KEY = 'sb_publishable_QM_k0s1fa71PVbhvhBOgSw_IRScC83P';
  const VERSION = '2026-11-10-v5';
  const STORAGE = 'huGioiSupabaseSessionV1';
  function validEmail(raw) {
    if (typeof raw !== 'string' || raw.length < 6 || raw.length > 254 || /\s/.test(raw)) return false;
    const parts = raw.split('@');
    if (parts.length !== 2) return false;
    const [local, domain] = parts;
    if (!local || local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..') ||
        !/^[a-zA-Z0-9!#$%&'*+/=?^_\x60{|}~.-]+$/.test(local)) return false;
    const labels = domain.split('.');
    return domain.length <= 253 && labels.length > 1 && /^[a-zA-Z]{2,63}$/.test(labels[labels.length - 1]) &&
      labels.every(label => label.length <= 63 && /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(label));
  }
  let current = null;
  try { current = JSON.parse(root.sessionStorage?.getItem(STORAGE) || 'null'); } catch { /* private mode */ }

  function persist(data) {
    current = data && data.access_token && data.refresh_token
      ? { access_token: data.access_token, refresh_token: data.refresh_token,
          expires_at: data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600) } : null;
    try {
      if (current) root.sessionStorage.setItem(STORAGE, JSON.stringify(current));
      else root.sessionStorage.removeItem(STORAGE);
    } catch { /* session remains in memory */ }
  }

  async function request(path, { method = 'GET', body, token, prefer } = {}) {
    const response = await root.fetch(URL + path, {
      method,
      headers: {
        apikey: KEY,
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(prefer ? { Prefer: prefer } : {})
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      referrerPolicy: 'no-referrer'
    });
    const raw = await response.text();
    let data = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { /* invalid JSON */ }
    if (!response.ok) {
      const fallback = response.status === 429 ? 'Thử quá nhiều lần. Vui lòng thử lại sau.'
        : response.status === 401 || response.status === 400 ? 'Thông tin xác thực không hợp lệ.' : 'Dịch vụ tài khoản chưa sẵn sàng.';
      const message = data?.msg || data?.message || data?.error_description || fallback;
      throw Object.assign(new Error(String(message).slice(0, 200)), { status: response.status });
    }
    return data;
  }

  async function refresh() {
    if (!current?.refresh_token) return null;
    try {
      const data = await request('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST', body: { refresh_token: current.refresh_token }
      });
      persist(data);
      return current?.access_token || null;
    } catch (error) {
      if (error.status === 400 || error.status === 401) persist(null);
      throw error;
    }
  }
  async function token() {
    if (!current?.access_token) return null;
    if (current.expires_at * 1000 < Date.now() + 60000) return refresh();
    return current.access_token;
  }
  async function callback() {
    if (!root.location || !/(?:^#|&)access_token=/.test(root.location.hash)) return;
    // Sign-up confirmation links may carry a session in the URL fragment.
    // Never adopt unsolicited credentials (login-CSRF/account-confusion risk).
    // Supabase has already verified the email; require explicit password login.
    root.history?.replaceState(null, '', root.location.pathname + root.location.search);
    root.HU_SUPABASE_EMAIL_CONFIRMED = true;
  }

  async function user() {
    await callback();
    let access = await token();
    if (!access) return null;
    try {
      const data = await request('/auth/v1/user', { token: access });
      return data?.id ? { id: data.id, email: data.email } : null;
    } catch (error) {
      if (error.status === 401) {
        access = await refresh();
        if (access) {
          const data = await request('/auth/v1/user', { token: access });
          return data?.id ? { id: data.id, email: data.email } : null;
        }
      }
      throw error;
    }
  }

  async function signup(email, password) {
    if (!validEmail(email)) throw Error('Email không hợp lệ. Vui lòng nhập địa chỉ email đúng định dạng.');
    const redirect = root.location?.protocol === 'https:' || root.location?.hostname === 'localhost'
      ? '?redirect_to=' + encodeURIComponent(root.location.origin + root.location.pathname)
      : '';
    const data = await request('/auth/v1/signup' + redirect, {
      method: 'POST', body: { email, password, data: { policy_notice_version: VERSION } }
    });
    if (data?.access_token) persist(data);
    return data;
  }
  async function login(email, password) {
    if (!validEmail(email)) throw Error('Email không hợp lệ. Vui lòng nhập địa chỉ email đúng định dạng.');
    const direct = root.HU_AUTH_MODE === 'direct';
    let data;
    if (direct) {
      // Chế độ Cloudflare static + Supabase Edge: không có Node gateway.
      // Chỉ gửi mật khẩu tới Supabase Auth cùng publishable key công khai.
      try {
        data = await request('/auth/v1/token?grant_type=password', {
          method: 'POST', body: { email: email.toLowerCase(), password }
        });
      } catch (error) {
        const message = error.status === 429 ? 'Dịch vụ xác thực đang giới hạn tốc độ. Hãy thử lại sau.'
          : [400, 401, 403].includes(error.status) ? 'Thông tin đăng nhập không đúng hoặc email chưa xác minh.'
            : 'Không kết nối được dịch vụ đăng nhập. Hãy thử lại sau.';
        throw Object.assign(Error(message), { status: error.status || 0 });
      }
    } else {
      // Chế độ Node: giữ cổng same-origin có IP limiter cho dev/host Node.
      let response;
      try {
        response = await root.fetch('/api/auth/supabase-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer'
        });
      } catch {
        throw Object.assign(Error('Không kết nối được dịch vụ đăng nhập.'), { status: 0 });
      }
      try { data = await response.json(); } catch { data = null; }
      if (!response.ok) {
        const message = response.status === 429 ? 'IP đã đăng nhập quá nhiều lần. Hãy thử lại sau.'
          : data?.error || 'Dịch vụ đăng nhập chưa sẵn sàng.';
        throw Object.assign(Error(message), { status: response.status });
      }
    }
    if (!data?.access_token || !data?.refresh_token) throw Error('Máy chủ chưa trả phiên đăng nhập hợp lệ.');
    persist(data);
    return user();
  }
  async function accepted() {
    const account = await user();
    if (!account) throw Error('Phiên đăng nhập đã hết hạn.');
    const access = await token();
    const q = '?select=policy_kind,policy_version&user_id=eq.' + encodeURIComponent(account.id) +
      '&policy_version=eq.' + VERSION;
    const rows = await request('/rest/v1/policy_acceptances' + q, { token: access });
    return new Set((rows || []).map(x => x.policy_kind));
  }
  async function accept(account) {
    const verified = await user();
    if (!verified || verified.id !== account.id) throw Error('Không thể xác thực chủ tài khoản.');
    let existing = await accepted();
    for (const kind of ['privacy', 'release_terms']) {
      if (existing.has(kind)) continue;
      await request('/rest/v1/policy_acceptances', {
        method: 'POST', token: await token(),
        body: { user_id: verified.id, policy_kind: kind, policy_version: VERSION },
        prefer: 'return=minimal'
      });
    }
    existing = await accepted();
    if (!existing.has('privacy') || !existing.has('release_terms')) throw Error('Chưa lưu được thỏa thuận.');
  }
  async function logout() {
    try {
      const access = await token();
      if (access) await request('/auth/v1/logout', { method: 'POST', token: access });
    } finally {
      persist(null);
    }
  }
  root.HU_SUPABASE = { user, signup, login, accepted, accept, logout, accessToken: token, validEmail, publishableKey: KEY, VERSION };
})(typeof window !== 'undefined' ? window : globalThis);
