/* Supabase Auth/PostgREST adapter. Only the public publishable key is shipped to browsers.
   Access tokens are session-scoped; an explicitly chosen 30-day option persists ONLY
   the refresh token in browser storage (not an HttpOnly cookie). */
(function (root) {
  'use strict';
  const SUPABASE_URL = 'https://rvrwfeblishqadkpzspb.supabase.co';
  const KEY = 'sb_publishable_QM_k0s1fa71PVbhvhBOgSw_IRScC83P';
  const VERSION = '2026-11-11-v7';
  const STORAGE = 'huGioiSupabaseSessionV1';
  const REMEMBER_STORAGE = 'huGioiRememberSessionV1';
  const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;
  const OAUTH_PENDING = 'huGioiGoogleOAuthPkceV1';
  const OAUTH_MAX_AGE_MS = 10 * 60 * 1000;
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
  let current = null, remember = false, rememberUntil = 0;
  try { current = JSON.parse(root.sessionStorage?.getItem(STORAGE) || 'null'); } catch { /* private mode */ }
  // Không lưu mật khẩu và access token lâu dài. Mã làm mới chỉ được giữ khi người chơi tự chọn.
  try {
    const stored = JSON.parse(root.localStorage?.getItem(REMEMBER_STORAGE) || 'null');
    if (stored && typeof stored.refresh_token === 'string' && stored.refresh_token.length > 0 &&
        Number.isFinite(stored.until) && stored.until > Date.now() && stored.until <= Date.now() + REMEMBER_MS) {
      remember = true;
      rememberUntil = stored.until;
      if (!current?.refresh_token) current = { refresh_token: stored.refresh_token, expires_at: 0 };
    } else root.localStorage?.removeItem(REMEMBER_STORAGE);
  } catch { /* storage bị chặn: chỉ giữ phiên trong tab hiện tại */ }

  function rememberOnThisDevice(enabled) {
    let available = false;
    try {
      if (enabled && root.location?.protocol === 'https:' && root.localStorage) {
        // Trình duyệt riêng tư có thể chặn cả thao tác ghi; kiểm tra trước khi chọn.
        const probe = REMEMBER_STORAGE + ':probe';
        root.localStorage.setItem(probe, '1');
        root.localStorage.removeItem(probe);
        available = true;
      }
    } catch { /* không thể lưu lâu dài */ }
    remember = available;
    rememberUntil = remember ? Date.now() + REMEMBER_MS : 0;
    if (!remember) {
      try { root.localStorage?.removeItem(REMEMBER_STORAGE); } catch { /* private mode */ }
    }
    return remember;
  }
  function isRemembered() { return remember && rememberUntil > Date.now(); }

  function persist(data) {
    current = data && data.access_token && data.refresh_token
      ? { access_token: data.access_token, refresh_token: data.refresh_token,
          expires_at: data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600) } : null;
    try {
      if (current) root.sessionStorage?.setItem(STORAGE, JSON.stringify(current));
      else root.sessionStorage?.removeItem(STORAGE);
    } catch { /* phiên vẫn còn trong bộ nhớ */ }
    try {
      if (current && isRemembered()) {
        root.localStorage?.setItem(REMEMBER_STORAGE, JSON.stringify({
          refresh_token: current.refresh_token, until: rememberUntil
        }));
      } else {
        root.localStorage?.removeItem(REMEMBER_STORAGE);
        if (!current) { remember = false; rememberUntil = 0; }
      }
    } catch {
      // Nếu bộ nhớ dài hạn không dùng được, vẫn giữ phiên trong tab; không báo đã lưu.
      remember = false;
      rememberUntil = 0;
    }
  }

  async function request(path, { method = 'GET', body, token, prefer } = {}) {
    const response = await root.fetch(SUPABASE_URL + path, {
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
      // Chỉ hiển thị thông báo đã biên soạn, không đưa lỗi từ nhà cung cấp ra giao diện.
      const code = String(data?.code || '');
      const message = response.status === 429 ? 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.'
        : ['user_already_exists', 'email_exists', 'email_already_exists'].includes(code)
          ? 'Email này đã có tài khoản. Hãy đăng nhập hoặc dùng email khác.'
        : code === 'weak_password' ? 'Mật khẩu chưa đủ an toàn. Hãy chọn mật khẩu khó đoán hơn.'
        : code === 'email_address_invalid' ? 'Email chưa hợp lệ. Vui lòng kiểm tra lại.'
        : response.status === 400 ? 'Thông tin chưa hợp lệ. Vui lòng kiểm tra và thử lại.'
        : response.status === 401 || response.status === 403 ? 'Phiên đăng nhập không còn hợp lệ. Hãy đăng nhập lại.'
        : 'Dịch vụ tài khoản tạm thời chưa sẵn sàng. Vui lòng thử lại sau.';
      throw Object.assign(new Error(message), { status: response.status });
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
    if (!current?.refresh_token) return null;
    if (!current.access_token || current.expires_at * 1000 < Date.now() + 60000) {
      try { return await refresh(); }
      catch (error) {
        // Phiên đã bị thu hồi/hết hạn: quay lại đăng nhập, không vòng lặp vô hạn.
        if (error.status === 400 || error.status === 401) return null;
        throw error;
      }
    }
    return current.access_token;
  }
  function redirectUrl() {
    const loc = root.location;
    if (!loc || (loc.protocol !== 'https:' && !(loc.protocol === 'http:' && loc.hostname === 'localhost')))
      throw Error('Vui lòng mở Hư Giới từ địa chỉ website bảo mật để đăng nhập bằng Google.');
    return loc.origin + loc.pathname;
  }

  function randomVerifier() {
    if (!root.crypto?.getRandomValues || !root.crypto?.subtle || typeof root.TextEncoder !== 'function')
      throw Error('Trình duyệt không hỗ trợ xác thực Google an toàn.');
    const bytes = new Uint8Array(32);
    root.crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }

  function base64url(bytes) {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return root.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  async function loginGoogle() {
    if (root.HU_AUTH_MODE !== 'direct') throw Error('Đăng nhập bằng Google hiện chưa khả dụng.');
    const redirect = redirectUrl();
    const verifier = randomVerifier();
    const hash = new Uint8Array(await root.crypto.subtle.digest('SHA-256', new root.TextEncoder().encode(verifier)));
    // PKCE verifier exists only in this tab. Never put it in a URL or log.
    try {
      root.sessionStorage.setItem(OAUTH_PENDING, JSON.stringify({
        verifier, redirect, created: Date.now(), remember: isRemembered()
      }));
    } catch {
      throw Error('Trình duyệt phải cho phép lưu trữ phiên để đăng nhập Google.');
    }
    const url = new root.URL(SUPABASE_URL + '/auth/v1/authorize');
    url.searchParams.set('provider', 'google');
    url.searchParams.set('redirect_to', redirect);
    url.searchParams.set('code_challenge', base64url(hash));
    url.searchParams.set('code_challenge_method', 's256');
    root.location.assign(url.toString());
  }

  async function oauthCallback() {
    const loc = root.location;
    if (!loc) return;
    const params = new URLSearchParams(loc.search);
    const code = params.get('code');
    const failure = params.get('error') || params.get('error_description');
    if (!code && !failure) return;
    let stored = null;
    try { stored = JSON.parse(root.sessionStorage.getItem(OAUTH_PENDING) || 'null'); } catch { /* missing or invalid */ }
    try { root.sessionStorage?.removeItem(OAUTH_PENDING); } catch { /* private mode */ }
    // Remove OAuth credentials/errors from address bar before exchanging the code.
    for (const key of ['code', 'error', 'error_code', 'error_description']) params.delete(key);
    const rest = params.toString();
    root.history?.replaceState(null, '', loc.pathname + (rest ? '?' + rest : '') + loc.hash);
    if (!stored || typeof stored.verifier !== 'string' ||
        !/^[a-f0-9]{64}$/.test(stored.verifier) ||
        stored.redirect !== redirectUrl() ||
        !Number.isFinite(stored.created) || Date.now() - stored.created < 0 ||
        Date.now() - stored.created > OAUTH_MAX_AGE_MS)
      throw Error('Phiên đăng nhập Google không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.');
    if (failure) throw Error('Google không hoàn tất đăng nhập. Vui lòng thử lại.');
    if (!code) throw Error('Không thể xác nhận đăng nhập Google. Vui lòng thử lại.');
    const data = await request('/auth/v1/token?grant_type=pkce', {
      method: 'POST', body: { auth_code: code, code_verifier: stored.verifier }
    });
    if (!data?.access_token || !data?.refresh_token) throw Error('Không thể hoàn tất đăng nhập Google. Vui lòng thử lại.');
    rememberOnThisDevice(stored.remember === true);
    persist(data);
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
    await oauthCallback();
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
        const message = response.status === 429 ? 'Bạn đã thử đăng nhập quá nhiều lần. Hãy thử lại sau.'
          : 'Dịch vụ đăng nhập tạm thời chưa sẵn sàng. Vui lòng thử lại sau.';
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
  root.HU_SUPABASE = { user, signup, login, loginGoogle, accepted, accept, logout,
    accessToken: token, validEmail, rememberOnThisDevice, isRemembered, publishableKey: KEY, VERSION };
})(typeof window !== 'undefined' ? window : globalThis);
