/* Tạo dist/ chỉ gồm file game cần chạy trên trình duyệt, để đưa lên host (Cloudflare Pages, Netlify, Vercel, nginx...).
   Không đưa lên host: server/, tests/, docs/, tools/, demo/, .git, .github, README, package.json, bảng thiết kế .xlsx/.csv.
   Chạy:  node tools/build-dist.cjs            (sao chép nguyên văn)
          node tools/build-dist.cjs --minify   (xóa chú thích và nén; cần esbuild: npm i -g esbuild hoặc NODE_PATH trỏ tới nó)
   Đây là biện pháp làm khó người đọc, không phải mã hóa: mã chạy ở trình duyệt thì người chơi luôn tải được. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { ALLOWED, DENIED_PART, DENIED_PATH } = require('../server/http/static.js');
const { settings, injectConnectSrc, renderBrowserConfig } = require('../server/http/public-config.js');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dist');
const minify = process.argv.includes('--minify');
/* Không đưa adapter offline/backup cũ vào frontend online. Giữ mã nguồn legacy
   trong repository chỉ để kiểm thử, kiểm toán và di trú thủ công về sau. */
const OMIT_ONLINE = new Set(['client/session/local-session.js', 'client/persistence/local-store.js']);

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
    const target = path.join(OUT, path.relative(ROOT, file));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (esbuild && /\.(?:js|css)$/.test(file)) {
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
/* _headers cần nằm ở thư mục xuất bản để Cloudflare Pages/Netlify áp CSP và các header bảo mật. */
const config = settings(process.env);
fs.writeFileSync(path.join(OUT, 'client/config.js'), renderBrowserConfig(config));
fs.writeFileSync(path.join(OUT, 'index.html'), injectConnectSrc(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), config));
fs.writeFileSync(path.join(OUT, '_headers'), injectConnectSrc(fs.readFileSync(path.join(ROOT, '_headers'), 'utf8'), config));
console.log(`dist/: ${copied} tệp (${minified} đã nén), bỏ qua ${skipped} tệp không dành cho trình duyệt.`);
