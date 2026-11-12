/* hCaptcha cho đăng nhập/đăng ký (Supabase Auth CAPTCHA protection).
   Sitekey công khai lấy từ client/config.js (HU_HCAPTCHA_SITEKEY); secret CHỈ nằm trong Supabase Auth.
   Sitekey rỗng/không hợp lệ => enabled=false và không tải script bên thứ ba nào. */
(function (root) {
  'use strict';
  const SITEKEY = String(root.HU_HCAPTCHA_SITEKEY || '');
  const enabled = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(SITEKEY);
  const SRC = 'https://js.hcaptcha.com/1/api.js?render=explicit&onload=__huGioiHcaptchaReady';
  let widget = null, token = '', loading = null;

  function apiReady() { return !!(root.hcaptcha && typeof root.hcaptcha.render === 'function'); }

  function load() {
    if (apiReady()) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      let settled = false;
      const finish = error => {
        if (settled) return;
        settled = true;
        if (error) { loading = null; reject(error); } else resolve();
      };
      // Tham số onload do hCaptcha gọi khi API sẵn sàng. Trên một số trình
      // duyệt script.onload chạy trước lúc hcaptcha.render tồn tại, nên không
      // thể chỉ dựa vào sự kiện của thẻ script.
      root.__huGioiHcaptchaReady = () => { if (apiReady()) finish(); };
      const script = root.document.createElement('script');
      script.src = SRC; script.async = true; script.defer = true;
      script.onload = () => {
        if (apiReady()) return finish();
        let attempts = 0;
        const poll = () => {
          if (apiReady()) return finish();
          if (++attempts >= 50) return finish(Error('hCaptcha không khả dụng.'));
          if (typeof root.setTimeout === 'function') root.setTimeout(poll, 100);
          else finish(Error('hCaptcha không khả dụng.'));
        };
        poll();
      };
      script.onerror = () => finish(Error('Không tải được hCaptcha.'));
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
