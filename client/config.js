/* Cấu hình công khai của frontend Edge. Không chứa JWT secret/service role.
   Node/dev: thay HU_API_BASE bằng '/api/v1' và HU_AUTH_MODE bằng 'gateway'.
   RemoteSession mặc định '/api/v1' nếu không có file config này. */
(function (root) {
  'use strict';
  root.HU_API_BASE = 'https://rvrwfeblishqadkpzspb.supabase.co/functions/v1/api';
  root.HU_AUTH_MODE = 'direct';
})(typeof window !== 'undefined' ? window : globalThis);
