/* Khởi tạo bundle Edge trong Deno mà không kết nối DB thật.
 * Đo thời gian nạp module trên CI (không phải cold start Supabase).
 */
const begin = performance.now();
const api = await import('./game.bundle.mjs');
const importMs = +(performance.now() - begin).toFixed(2);
if (typeof api.PlayerService !== 'function' || typeof api.PostgresPlayers !== 'function' ||
    typeof api.createJwtVerifier !== 'function' || !/^[0-9a-f]{16}$/.test(api.CONTENT_VERSION)) {
  throw Error('Edge bundle không export lõi gameplay hợp lệ.');
}
console.log(JSON.stringify({ platform: 'Deno CI module import (not hosted cold start)', importMs, contentVersion: api.CONTENT_VERSION }));
