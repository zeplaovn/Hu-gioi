/* Cấu hình công khai của frontend Edge. Không chứa JWT secret/service role.
   Dev/CI: tools/online-ci-server.cjs phục vụ '/api/v1' cùng origin (đặt HU_API_BASE='/api/v1'). */
(function (root) {
  'use strict';
  root.HU_API_BASE = 'https://rvrwfeblishqadkpzspb.supabase.co/functions/v1/api';
  root.HU_AUTH_MODE = 'direct';
  /* hCaptcha sitekey (công khai, cùng giá trị với HCAPTCHA_SITEKEY của Hugioi-dashboard).
     Để trống = tắt CAPTCHA. Chỉ điền SAU KHI có sitekey; chỉ bật CAPTCHA trong Supabase Auth khi cả game và
     dashboard đã gửi captcha_token (Supabase áp dụng CAPTCHA cho toàn project). Secret chỉ nhập ở Supabase. */
  root.HU_HCAPTCHA_SITEKEY = '';
})(typeof window !== 'undefined' ? window : globalThis);
