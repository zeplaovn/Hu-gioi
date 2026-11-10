/* Một nguồn cấu hình CÔNG KHAI. Build và Node dùng cùng mặc định; tuyệt đối không thêm service-role. */
(function (root) {
  'use strict';
  const defaults = /* HU_PUBLIC_VALUES_START */{"apiOrigin":"","supabaseUrl":"https://rvrwfeblishqadkpzspb.supabase.co","supabasePublishableKey":"sb_publishable_QM_k0s1fa71PVbhvhBOgSw_IRScC83P"}/* HU_PUBLIC_VALUES_END */;

  function normalizeOrigin(value, allowEmpty = false) {
    if (typeof value !== 'string') throw Error('Origin phải là chuỗi.');
    if (value === '' && allowEmpty) return '';
    if (value !== value.trim()) throw Error('Origin chứa khoảng trắng không hợp lệ.');
    let url;
    try { url = new URL(value); } catch { throw Error('Origin URL không hợp lệ.'); }
    if (url.username || url.password || url.search || url.hash ||
        (value !== url.origin && value !== url.origin + '/'))
      throw Error('Chỉ chấp nhận origin, không có đường dẫn, query hoặc fragment.');
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))
      throw Error('Origin máy chủ phải dùng HTTPS (trừ localhost).');
    return url.origin;
  }

  const apiOrigin = normalizeOrigin(defaults.apiOrigin, true);
  const supabaseUrl = normalizeOrigin(defaults.supabaseUrl);
  if (new URL(supabaseUrl).protocol !== 'https:') throw Error('Supabase cần HTTPS.');
  if (typeof defaults.supabasePublishableKey !== 'string' ||
      !/^sb_publishable_[A-Za-z0-9_-]+$/.test(defaults.supabasePublishableKey))
    throw Error('Khóa Supabase công khai không hợp lệ.');
  const api = Object.freeze({
    apiOrigin, supabaseUrl, supabasePublishableKey: defaults.supabasePublishableKey,
    apiUrl(path) {
      if (typeof path !== 'string' || !/^\/api\/(?:v1\/|auth\/supabase-login(?:$|\?))/.test(path) || path.includes('//'))
        throw Error('API path không hợp lệ.');
      return apiOrigin + path;
    }
  });
  if (root) {
    root.HU_API_ORIGIN = apiOrigin;
    root.HU_PUBLIC_CONFIG = api;
  }
  if (typeof module !== 'undefined' && module.exports)
    module.exports = { defaults, normalizeOrigin };
})(typeof window !== 'undefined' ? window : null);
