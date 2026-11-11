/* Dựng dist/ cho Cloudflare Workers Static Assets; Node/SQLite chỉ dành cho dev/test.
   Không xuất bản server/, tests/, docs/, tools/, demo/ hay tệp cấu hình riêng.
   --minify giữ các classic script theo thứ tự cũ và gộp CSS trang chính thành
   một stylesheet có content hash, không đổi CSS nguồn hoặc style trang pháp lý.
   Minify không phải biện pháp bảo mật; client code luôn có thể đọc được. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { ALLOWED, DENIED_PART, DENIED_PATH } = require('../server/http/static.js');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dist');
const minify = process.argv.includes('--minify');
/* Không đưa adapter offline/backup cũ vào frontend online. Giữ mã nguồn legacy
   trong repository chỉ để kiểm thử, kiểm toán và di trú thủ công về sau. */
const OMIT_ONLINE = new Set(['client/session/local-session.js', 'client/persistence/local-store.js']);
const htmlSource = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const STYLE_TAG = /^<link rel="stylesheet" href="(css\/[a-z0-9-]+\.css)">\r?\n/gm;
const cssInputs = [...htmlSource.matchAll(STYLE_TAG)].map(match => match[1]);
const cssInputSet = new Set(cssInputs);
if (minify && (!cssInputs.length || cssInputSet.size !== cssInputs.length))
  throw Error('Danh sách stylesheet trang chính không hợp lệ.');


/* Cấu hình công khai đọc từ biến môi trường lúc build (cùng tên với Hugioi-dashboard):
   SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, HCAPTCHA_SITEKEY. Không đặt biến nào => giữ mặc định trong mã nguồn.
   Chỉ nhận khóa công khai: từ chối service_role / sb_secret_. */
const DEFAULT_URL = 'https://rvrwfeblishqadkpzspb.supabase.co';
const envUrl = String(process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const envKey = String(process.env.SUPABASE_PUBLISHABLE_KEY || '').trim();
const envCaptcha = String(process.env.HCAPTCHA_SITEKEY || '').trim();
function jwtRole(token) {
  try { return JSON.parse(Buffer.from((token.split('.')[1] || '').replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')).role || ''; }
  catch { return ''; }
}
if (envUrl && !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(envUrl)) throw Error('SUPABASE_URL phải là https://<project>.supabase.co (CSP chỉ cho phép *.supabase.co).');
if (envKey && (envKey.startsWith('sb_secret_') || jwtRole(envKey) === 'service_role')) throw Error('SUPABASE_PUBLISHABLE_KEY không được là secret/service_role key.');
if (envKey && !/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(envKey) && jwtRole(envKey) !== 'anon') throw Error('SUPABASE_PUBLISHABLE_KEY phải là khóa sb_publishable_... (hoặc anon JWT cũ).');
if (envCaptcha && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(envCaptcha)) throw Error('HCAPTCHA_SITEKEY không hợp lệ.');
function swap(text, from, to, label) {
  if (!text.includes(from)) throw Error('Không tìm thấy ' + label + ' để thay bằng biến môi trường.');
  return text.split(from).join(to);
}
/* rel: đường dẫn tương đối trong repo. Trả về nội dung đã thay giá trị theo env (hoặc nguyên bản). */
function inject(rel, text) {
  if (rel === 'client/auth/supabase.js') {
    if (envUrl) text = swap(text, "const SUPABASE_URL = '" + DEFAULT_URL + "';", "const SUPABASE_URL = '" + envUrl + "';", 'SUPABASE_URL');
    if (envKey) text = text.replace(/const KEY = '[^']*';/, () => "const KEY = '" + envKey + "';");
  } else if (rel === 'client/config.js') {
    if (envCaptcha) text = swap(text, "root.HU_HCAPTCHA_SITEKEY = '';", "root.HU_HCAPTCHA_SITEKEY = '" + envCaptcha + "';", 'HU_HCAPTCHA_SITEKEY');
  } else if ((rel === 'index.html' || rel === '_headers') && envUrl && envUrl !== DEFAULT_URL) {
    text = swap(text, DEFAULT_URL, envUrl, 'CSP connect-src');
  }
  return text;
}
let injected = 0;

let esbuild = null;
if (minify) {
  try { esbuild = require('esbuild'); }
  catch { console.error('Thiếu esbuild nên không thể --minify. Cài esbuild hoặc bỏ cờ --minify.'); process.exit(1); }
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

fs.rmSync(OUT, { recursive: true, force: true });
let copied = 0, minified = 0, skipped = 0;
const roots = ['index.html', 'css', 'client', 'engine', 'data', 'media'].map(name => path.join(ROOT, name));
for (const start of roots) {
  if (!fs.existsSync(start)) continue;
  const files = fs.statSync(start).isDirectory() ? [...walk(start)] : [start];
  for (const file of files) {
    const url = '/' + path.relative(ROOT, file).split(path.sep).join('/');
    if (!ALLOWED.test(url) || DENIED_PART.test(url) || DENIED_PATH.test(url) || OMIT_ONLINE.has(path.relative(ROOT, file).split(path.sep).join('/'))) { skipped++; continue; }
    // Các CSS này được gộp theo đúng thứ tự HTML; bản nguồn vẫn giữ trong Git.
    if (minify && cssInputSet.has(path.relative(ROOT, file).split(path.sep).join('/'))) {
      skipped++;
      continue;
    }
    const target = path.join(OUT, path.relative(ROOT, file));
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (/\.(?:js|html)$/.test(file)) {
      const before = fs.readFileSync(file, 'utf8');
      const after = inject(rel, before);
      if (after !== before) injected++;
      if (esbuild && file.endsWith('.js')) {
        fs.writeFileSync(target, esbuild.transformSync(after, { loader: 'js', minify: true, legalComments: 'none', charset: 'utf8', target: 'es2020' }).code);
        minified++;
      } else fs.writeFileSync(target, after);
    } else if (esbuild && /\.(?:js|css)$/.test(file)) {
      const loader = file.endsWith('.css') ? 'css' : 'js';
      const source = fs.readFileSync(file, 'utf8');
      /* Không bó (bundle) và không đổi định dạng: giữ nguyên classic script, biến toàn cục và thứ tự thẻ <script>. */
      const out = esbuild.transformSync(source, { loader, minify: true, legalComments: 'none', charset: 'utf8', target: 'es2020' });
      fs.writeFileSync(target, out.code);
      minified++;
    } else {
      fs.copyFileSync(file, target);
    }
    copied++;
  }
}
if (minify) {
  // Tất cả CSS trang game nằm trong css/: đường dẫn '../media/' vẫn đúng
  // từ assets/; trang pháp lý tiếp tục dùng riêng css/legal.css.
  const source = cssInputs.map(file => fs.readFileSync(path.join(ROOT, file), 'utf8')).join('\n');
  const code = esbuild.transformSync(source, {
    loader: 'css', minify: true, legalComments: 'none', charset: 'utf8', target: 'es2020'
  }).code;
  const fingerprint = createHash('sha256').update(code).digest('hex').slice(0, 16);
  const href = 'assets/styles.' + fingerprint + '.css';
  fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(OUT, href), code);
  let first = true;
  const html = htmlSource.replace(STYLE_TAG, () => {
    if (!first) return '';
    first = false;
    return '<link rel="stylesheet" href="' + href + '">\n';
  });
  if (first) throw Error('Không tìm thấy CSS cần gộp trong index.html.');
  fs.writeFileSync(path.join(OUT, 'index.html'), inject('index.html', html));
  console.log('CSS: ' + cssInputs.length + ' stylesheet → 1 tệp ' + href +
    ' (' + Buffer.byteLength(code) + ' bytes, chưa gzip/brotli).');
}
/* _headers áp dụng cho Cloudflare Workers Static Assets, không áp dụng Node dev. */
fs.writeFileSync(path.join(OUT, '_headers'), inject('_headers', fs.readFileSync(path.join(ROOT, '_headers'), 'utf8')));
if (envUrl || envKey || envCaptcha) console.log('Public config từ biến môi trường: ' + [envUrl && 'SUPABASE_URL', envKey && 'SUPABASE_PUBLISHABLE_KEY', envCaptcha && 'HCAPTCHA_SITEKEY'].filter(Boolean).join(', ') + '.');
console.log(`dist/: ${copied} tệp (${minified} đã nén), bỏ qua ${skipped} tệp không dành cho trình duyệt.`);
