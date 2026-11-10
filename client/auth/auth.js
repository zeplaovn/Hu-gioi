/* Supabase Auth online-only: không cho vào game khi backend hoặc policy consent chưa xác minh. */
(function (root) {
  'use strict';
  const $ = id => document.getElementById(id);
  const SB = root.HU_SUPABASE;
  let account = null, pending = null, enterGame = () => {}, exitGame = () => {};
  let bound = false, busy = false, mode = 'login';

  function notice(text, good = false) {
    const consentVisible = !$('authConsentGate').hidden;
    for (const id of ['authMessage', 'authConsentMessage']) {
      const el = $(id), active = (id === 'authConsentMessage') === consentVisible;
      el.textContent = active ? text || '' : '';
      el.hidden = !active || !text;
      el.dataset.kind = good ? 'success' : 'error';
    }
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
    $('authGoogle').hidden = false;
    $('authConsentGate').hidden = true;
    $('authTabs').hidden = false;
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
  async function enter(next) {
    if (!next?.id) throw Error('Vui lòng đăng nhập để tiếp tục hành trình.');
    pending = null;
    account = next;
    notice('Đang tải tiến trình từ máy chủ…', true);
    try {
      await enterGame(account);
      $('authGate').hidden = true;
      $('authForm').reset();
      notice('');
      $('nameInput')?.focus({ preventScroll: true });
    } catch (error) {
      account = null;
      exitGame();
      present();
      throw error;
    }
  }
  function requireConsent(next) {
    pending = next;
    $('authForm').hidden = true;
    $('authGoogle').hidden = true;
    $('authTabs').hidden = true;
    $('authConsentGate').hidden = false;
    $('authConsentPrivacy').checked = false;
    $('authConsentRelease').checked = false;
    $('authTitle').textContent = 'Xác nhận chính sách';
    $('authSubtitle').textContent = 'Vui lòng đọc và đồng ý với từng văn bản dưới đây trước khi tiếp tục.';
    notice('');
    $('authConsentPrivacy').focus();
  }
  async function finish(next) {
    if (!next?.id) throw Error('Chưa thể xác minh tài khoản. Vui lòng đăng nhập lại.');
    const consent = await SB.accepted();
    if (consent.has('privacy') && consent.has('release_terms')) await enter(next);
    else requireConsent(next);
  }
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const email = $('authEmail').value.trim();
    const password = $('authPassword').value;
    if (!SB.validEmail(email)) { notice('Email không hợp lệ. Ví dụ: ten@example.com.'); $('authEmail').focus(); return; }
    if (mode === 'signup') {
      if (password !== $('authConfirm').value) { notice('Mật khẩu nhập lại chưa trùng khớp.'); return; }
      if (!$('authPrivacy').checked || !$('authRelease').checked) {
        notice('Vui lòng xác nhận cả Chính sách quyền riêng tư và Điều khoản sử dụng để đăng ký.'); return;
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
      notice(error instanceof TypeError ? 'Không thể kết nối dịch vụ đăng nhập. Hãy thử lại sau.' : error.message);
    } finally {
      busy = false;
      $('authSubmit').disabled = false;
      $('authForm').removeAttribute('aria-busy');
    }
  }
  async function loginGoogle() {
    if (busy) return;
    busy = true;
    $('authGoogle').disabled = true;
    try { await SB.loginGoogle(); }
    catch (error) {
      busy = false;
      $('authGoogle').disabled = false;
      notice(error.message || 'Không thể bắt đầu đăng nhập Google.');
    }
  }
  async function acceptPending() {
    if (busy || !pending) return;
    if (!$('authConsentPrivacy').checked || !$('authConsentRelease').checked) {
      notice('Vui lòng đọc và xác nhận cả hai văn bản để tiếp tục.'); return;
    }
    busy = true;
    $('authConsentContinue').disabled = true;
    try {
      await SB.accept(pending);
      await enter(pending);
    } catch (error) { notice(error.message); }
    finally { busy = false; $('authConsentContinue').disabled = false; }
  }
  async function logout() {
    if (busy) return;
    busy = true;
    // Thông báo tạm dừng khi JWT Supabase vẫn còn hiệu lực.
    try { await exitGame(); } catch { /* lease server tự đóng khi mất kết nối */ }
    try {
      if (account || pending) await SB.logout();
    } catch { /* adapter luôn xóa token cục bộ trong finally */ }
    finally { busy = false; }
    pending = null;
    account = null;
    present();
    $('authEmail').focus({ preventScroll: true });
  }
  function boot({ onEnter, onExit } = {}) {
    enterGame = onEnter || enterGame;
    exitGame = onExit || exitGame;
    if (bound) return;
    bound = true;
    $('authForm').addEventListener('submit', submit);
    $('authGoogle').addEventListener('click', loginGoogle);
    document.querySelectorAll('[data-auth-view]').forEach(b => b.addEventListener('click', () => selectMode(b.dataset.authView)));
    $('switchAccount').addEventListener('click', logout);
    $('accountExit').addEventListener('click', logout);
    $('authConsentContinue').addEventListener('click', acceptPending);
    $('authConsentLogout').addEventListener('click', logout);
    present();
    if (root.location.protocol === 'file:' || typeof root.fetch !== 'function' || !SB) { notice('Vui lòng mở Hư Giới bằng địa chỉ website chính thức có kết nối bảo mật.'); return; }
    SB.user().then(next => {
      if (account || pending || $('authGate').hidden) return;
      if (next) return finish(next);
      if (root.HU_SUPABASE_EMAIL_CONFIRMED) notice('Email đã được xác nhận. Hãy đăng nhập để tiếp tục.', true);
    }).catch(error => { notice(error.message || 'Không thể xác minh tài khoản.'); });
  }
  root.HU_AUTH = { boot, logout, get account() { return account; } };
})(typeof window !== 'undefined' ? window : globalThis);
