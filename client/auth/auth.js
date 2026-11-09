/* Hư Giới: Supabase Auth, xác nhận email và chấp thuận chính sách có kiểm chứng.
   Chơi offline vẫn hoạt động khi Supabase không khả dụng. Không lưu mật khẩu. */
(function (root) {
  'use strict';
  const $ = id => document.getElementById(id);
  const SB = root.HU_SUPABASE;
  let account = null, pending = null, enterGame = () => {}, exitGame = () => {};
  let bound = false, busy = false, mode = 'login';

  function notice(text, good = false) {
    const el = $('authMessage');
    el.textContent = text || '';
    el.hidden = !text;
    el.dataset.kind = good ? 'success' : 'error';
  }
  function selectMode(next) {
    mode = next === 'signup' ? 'signup' : 'login';
    $('authConfirmWrap').hidden = mode !== 'signup';
    $('authLegalWrap').hidden = mode !== 'signup';
    $('authConfirm').required = mode === 'signup';
    $('authPrivacy').required = mode === 'signup';
    $('authRelease').required = mode === 'signup';
    $('authSubmit').textContent = mode === 'signup' ? 'Lập tài khoản' : 'Bước vào Hư Giới';
    $('authTitle').textContent = mode === 'signup' ? 'Lập danh sách tiên tịch' : 'Trở lại tiên lộ';
    $('authSubtitle').textContent = mode === 'signup' ? 'Đọc chính sách và xác nhận trước khi ghi danh.' : 'Đăng nhập để tiếp tục hành trình.';
    document.querySelectorAll('[data-auth-view]').forEach(b => {
      const chosen = b.dataset.authView === mode;
      b.classList.toggle('active', chosen);
      b.setAttribute('aria-selected', String(chosen));
    });
    $('authPassword').setAttribute('autocomplete', mode === 'signup' ? 'new-password' : 'current-password');
    notice('');
  }
  function showForm() {
    pending = null;
    $('authForm').hidden = false;
    $('authConsentGate').hidden = true;
    $('authTabs').hidden = false;
    $('authGuest').hidden = false;
    selectMode('login');
  }
  function present() {
    account = null;
    $('authGate').hidden = false;
    $('welcome').hidden = true;
    $('game').hidden = true;
    document.body.classList.remove('in-game');
    $('authForm').reset();
    showForm();
  }
  function enter(next) {
    pending = null;
    account = next;
    $('authGate').hidden = true;
    $('authForm').reset();
    notice('');
    enterGame(account);
    $('nameInput')?.focus({ preventScroll: true });
  }
  function requireConsent(next) {
    pending = next;
    $('authForm').hidden = true;
    $('authTabs').hidden = true;
    $('authGuest').hidden = true;
    $('authConsentGate').hidden = false;
    $('authConsentPrivacy').checked = false;
    $('authConsentRelease').checked = false;
    $('authTitle').textContent = 'Xác nhận chính sách';
    $('authSubtitle').textContent = 'Tài khoản cần chấp thuận chính sách trước khi tiếp tục.';
    notice('');
    $('authConsentPrivacy').focus();
  }
  async function finish(next) {
    if (!next?.id) throw Error('Supabase chưa xác minh tài khoản.');
    const consent = await SB.accepted();
    if (consent.has('privacy') && consent.has('release_terms')) enter(next);
    else requireConsent(next);
  }
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const email = $('authEmail').value.trim();
    const password = $('authPassword').value;
    if (mode === 'signup') {
      if (password !== $('authConfirm').value) { notice('Mật khẩu nhập lại chưa trùng khớp.'); return; }
      if (!$('authPrivacy').checked || !$('authRelease').checked) {
        notice('Cần tích chọn riêng cả hai chính sách trước khi tạo tài khoản.'); return;
      }
    }
    busy = true;
    $('authSubmit').disabled = true;
    $('authForm').setAttribute('aria-busy', 'true');
    notice('');
    try {
      if (mode === 'signup') {
        const data = await SB.signup(email, password);
        if (data?.access_token) {
          await SB.accept({ id: data.user.id });
          await finish({ id: data.user.id, email: data.user.email });
        } else {
          notice('Vui lòng kiểm tra email và xác nhận địa chỉ trước khi đăng nhập.', true);
        }
      } else {
        await finish(await SB.login(email, password));
      }
    } catch (error) {
      notice(error instanceof TypeError ? 'Không kết nối được Supabase. Có thể chơi không tài khoản.' : error.message);
    } finally {
      busy = false;
      $('authSubmit').disabled = false;
      $('authForm').removeAttribute('aria-busy');
    }
  }
  async function acceptPending() {
    if (busy || !pending) return;
    if (!$('authConsentPrivacy').checked || !$('authConsentRelease').checked) {
      notice('Cần xác nhận từng chính sách để sử dụng tài khoản.'); return;
    }
    busy = true;
    $('authConsentContinue').disabled = true;
    try {
      await SB.accept(pending);
      enter(pending);
    } catch (error) { notice(error.message); }
    finally { busy = false; $('authConsentContinue').disabled = false; }
  }
  async function logout() {
    if (busy) return;
    busy = true;
    try {
      if (account || pending) await SB.logout();
    } catch { /* local session is cleared by adapter even when offline */ }
    finally { busy = false; }
    pending = null;
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
    $('authConsentContinue').addEventListener('click', acceptPending);
    $('authConsentLogout').addEventListener('click', logout);
    present();
    if (root.location.protocol === 'file:' || typeof root.fetch !== 'function' || !SB) return;
    SB.user().then(next => {
      if (!account && !pending && !$('authGate').hidden && next) return finish(next);
    }).catch(() => { /* Trang tĩnh vẫn hỗ trợ chơi không tài khoản */ });
  }
  root.HU_AUTH = { boot, logout, get account() { return account; } };
})(typeof window !== 'undefined' ? window : globalThis);
