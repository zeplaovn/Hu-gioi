/* Hư Giới — cấu hình PUBLIC được nạp trước RemoteSession và Supabase Auth.
   Edge production (Cloudflare Worker): direct Supabase Auth và Edge Function.
   Node local/dev: cùng origin /api/v1 và cổng login; có thể đặt HU_DEPLOY_MODE='node'
   bằng cấu hình build được kiểm soát khi Node chạy sau reverse proxy HTTPS.
   Không đưa bất kỳ khóa bí mật nào vào file này. */
(function (root) {
  'use strict';
  const host = String(root.location?.hostname || '').toLowerCase();
  const localNode = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(host);
  const nodeMode = root.HU_DEPLOY_MODE === 'node' ||
    (root.HU_DEPLOY_MODE !== 'edge' && localNode);
  root.HU_API_BASE = nodeMode ? '/api/v1' :
    'https://rvrwfeblishqadkpzspb.supabase.co/functions/v1/api';
  root.HU_AUTH_MODE = nodeMode ? 'gateway' : 'direct';
})(typeof window !== 'undefined' ? window : globalThis);
