/* hCaptcha cho đăng nhập/đăng ký (Supabase Auth CAPTCHA protection).
   Sitekey công khai lấy từ client/config.js (HU_HCAPTCHA_SITEKEY); secret CHỈ nằm trong Supabase Auth.
   Sitekey rỗng/không hợp lệ => enabled=false và không tải script bên thứ ba nào. */
(function (root) {
  'use strict';
  const SITEKEY = String(root.HU_HCAPTCHA_SITEKEY || '');
  const enabled = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(SITEKEY);
  const SRC = 'https://js.hcaptcha.com/1/api.js?render=explicit';
  let widget = null, token = '', loading = null;

  function load() {
    if (root.hcaptcha && typeof root.hcaptcha.render === 'function') return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const script = root.document.createElement('script');
      script.src = SRC; script.async = true; script.defer = true;
      script.onload = () => root.hcaptcha ? resolve() : reject(Error('hCaptcha không khả dụng.'));
      script.onerror = () => { loading = null; reject(Error('Không tải được hCaptcha.')); };
      root.document.head.appendChild(script);
    });
    return loading;
  }
  async function mount(container) {
    if (!enabled || !container || widget !== null) return;
    await load();
    container.hidden = false;
    widget = root.hcaptcha.render(container, {
      sitekey: SITEKEY, theme: 'dark',
      callback: value => { token = String(value || ''); },
      'expired-callback': () => { token = ''; },
      'error-callback': () => { token = ''; }
    });
  }
  /* Token hCaptcha chỉ dùng được một lần: luôn reset sau mỗi lần gửi. */
  function reset() {
    token = '';
    if (widget !== null && root.hcaptcha) { try { root.hcaptcha.reset(widget); } catch { /* ignore */ } }
  }
  root.HU_CAPTCHA = { enabled, token: () => token, mount, reset };
})(typeof window !== 'undefined' ? window : globalThis);
