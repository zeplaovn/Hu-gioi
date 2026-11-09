/* Cổng vào Hư Giới: tài khoản HTTP same-origin hoặc tiếp tục chơi offline.
   Không lưu mật khẩu/token trong localStorage. Bản lưu gameplay hiện vẫn ở thiết bị. */
(function (root) {
  'use strict';
  const $ = id => document.getElementById(id);
  let account = null, enterGame = () => {}, exitGame = () => {}, bound = false, busy = false, mode = 'login';

  function notice(text) {
    const el = $('authMessage');
    el.textContent = text || '';
    el.hidden = !text;
  }
  function selectMode(next) {
    mode = next === 'signup' ? 'signup' : 'login';
    $('authConfirmWrap').hidden = mode !== 'signup';
    $('authSubmit').textContent = mode === 'signup' ? 'Lập tài khoản' : 'Bước vào Hư Giới';
    $('authTitle').textContent = mode === 'signup' ? 'Lập danh sách tiên tịch' : 'Trở lại tiên lộ';
    $('authSubtitle').textContent = mode === 'signup' ? 'Ghi danh một đạo hữu giữa vạn giới.' : 'Đăng nhập để tiếp tục hành trình.';
    document.querySelectorAll('[data-auth-view]').forEach(b => {
      const chosen = b.dataset.authView === mode;
      b.classList.toggle('active', chosen);
      b.setAttribute('aria-selected', String(chosen));
    });
    $('authPassword').setAttribute('autocomplete', mode === 'signup' ? 'new-password' : 'current-password');
    notice('');
  }
  function present() {
    $('authGate').hidden = false;
    $('welcome').hidden = true;
    $('game').hidden = true;
    document.body.classList.remove('in-game');
    selectMode('login');
  }
  function enter(next) {
    account = next;
    $('authGate').hidden = true;
    $('authForm').reset();
    notice('');
    enterGame(account);
    $('nameInput')?.focus({ preventScroll: true });
  }
  async function request(route, body) {
    const response = await root.fetch('/api/auth/' + route, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store'
    });
    let result;
    try { result = await response.json(); } catch { throw Error('Không kết nối được dịch vụ tài khoản. Có thể chơi không tài khoản.'); }
    if (!response.ok) throw Error(result.error || 'Không thể xác thực tài khoản.');
    return result;
  }
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const email = $('authEmail').value.trim();
    const password = $('authPassword').value;
    if (mode === 'signup' && password !== $('authConfirm').value) {
      notice('Mật khẩu nhập lại chưa trùng khớp.'); return;
    }
    busy = true;
    $('authSubmit').disabled = true;
    $('authForm').setAttribute('aria-busy', 'true');
    notice('');
    try {
      const result = await request(mode, { email, password });
      if (!result.account?.id) throw Error('Máy chủ chưa xác nhận tài khoản.');
      enter(result.account);
    } catch (error) {
      notice(error instanceof TypeError ? 'Máy chủ tài khoản chưa hoạt động. Hãy dùng npm start hoặc chọn chơi không tài khoản.' : error.message);
    } finally {
      busy = false;
      $('authSubmit').disabled = false;
      $('authForm').removeAttribute('aria-busy');
    }
  }
  async function logout() {
    if (busy) return;
    if (account) {
      try { await request('logout', {}); }
      catch (error) { notice('Chưa thể đăng xuất: ' + error.message); return; }
    }
    account = null;
    exitGame();
    present();
    $('authEmail').focus({ preventScroll: true });
  }
  function boot({ onEnter, onExit } = {}) {
    enterGame = onEnter || enterGame;
    exitGame = onExit || exitGame;
    if (bound) return;
    bound = true;
    $('authForm').addEventListener('submit', submit);
    document.querySelectorAll('[data-auth-view]').forEach(b => b.addEventListener('click', () => selectMode(b.dataset.authView)));
    $('authGuest').addEventListener('click', () => enter(null));
    $('switchAccount').addEventListener('click', logout);
    $('accountExit').addEventListener('click', logout);
    present();
    if (root.location.protocol === 'file:' || typeof root.fetch !== 'function') return;
    request('session').then(result => {
      if (!account && !$('authGate').hidden && result.account) enter(result.account);
    }).catch(() => { /* Trang tĩnh vẫn chơi được bằng Chơi không tài khoản. */ });
  }
  root.HU_AUTH = { boot, logout, get account() { return account; } };
})(typeof window !== 'undefined' ? window : globalThis);
