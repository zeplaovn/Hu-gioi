/* Public configuration for Node static hosting and build-dist.
   Defaults are exported from client/config.js so the Supabase URL/key exist in one source file. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { defaults, normalizeOrigin } = require('../../client/config.js');
const TEMPLATE = path.resolve(__dirname, '../../client/config.js');
const INDEX_PLACEHOLDER = '__HU_CONNECT_SRC__';

function settings(env = process.env) {
  const apiOrigin = normalizeOrigin(env.HU_API_ORIGIN ?? defaults.apiOrigin, true);
  const supabaseUrl = normalizeOrigin(env.SUPABASE_URL ?? defaults.supabaseUrl);
  if (new URL(supabaseUrl).protocol !== 'https:') throw Error('SUPABASE_URL cần HTTPS.');
  const supabasePublishableKey = env.SUPABASE_PUBLISHABLE_KEY ?? defaults.supabasePublishableKey;
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(supabasePublishableKey)) throw Error('SUPABASE_PUBLISHABLE_KEY không hợp lệ.');
  return { apiOrigin, supabaseUrl, supabasePublishableKey };
}
function connectSrc(config = settings()) {
  return ["'self'", config.supabaseUrl, config.apiOrigin].filter((x,i,a) => x && a.indexOf(x) === i).join(' ');
}
function csp(config = settings()) {
  return "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src " +
    connectSrc(config) + "; media-src 'self'; object-src 'none'; frame-src 'none'; worker-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
}
function injectConnectSrc(text, config = settings()) {
  if (!text.includes(INDEX_PLACEHOLDER)) throw Error('Thiếu vị trí CSP connect-src trong template.');
  return text.replaceAll(INDEX_PLACEHOLDER, connectSrc(config));
}
function renderBrowserConfig(config = settings()) {
  const source = fs.readFileSync(TEMPLATE, 'utf8');
  const pattern = /\/\* HU_PUBLIC_VALUES_START \*\/[\s\S]*?\/\* HU_PUBLIC_VALUES_END \*\//;
  if (!pattern.test(source)) throw Error('Thiếu khối cấu hình công khai.');
  return source.replace(pattern, '/* HU_PUBLIC_VALUES_START */' + JSON.stringify(config).replace(/</g, '\\u003c') + '/* HU_PUBLIC_VALUES_END */');
}
module.exports = { settings, connectSrc, csp, injectConnectSrc, renderBrowserConfig };
