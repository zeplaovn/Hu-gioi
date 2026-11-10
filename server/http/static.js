/* Phục vụ file tĩnh theo danh sách cho phép (allowlist): chỉ những thư mục/tệp game cần để chạy trên trình duyệt.
   Mọi thứ khác (server/, tests/, docs/, tools/, demo/, .git, .github, README, package.json, file ẩn...) đều trả 404. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = fs.realpathSync(path.resolve(__dirname, '..', '..'));
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff2': 'font/woff2'
};

/* Chỉ các thư mục tài nguyên chạy game và index.html ở gốc. So khớp không phân biệt hoa/thường. */
const ALLOWED = /^\/(?:index\.html|(?:css|client|engine|data|media)\/.+)$/i;
/* Loại trừ thêm trong thư mục được phép: file ẩn ở mọi cấp, file README/markdown, bản đồ nguồn, bản sao lưu. */
const DENIED_PART = /(?:^|\/)\.|\.(?:md|map|ts|tsx|bak|orig|old|swp|log|env|pem|key|sql|sqlite3?|xlsx?|csv|tsv|docx?|pdf|zip|tar|gz)$|~$/i;
/* Bảng tra cứu thiết kế nằm lẫn trong media/ (không client nào nạp): không phục vụ công khai. */
const DENIED_PATH = /^\/media\/.+\.html$|^\/media\/assets\/bang_tra_cuu\.json$/i;

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://rvrwfeblishqadkpzspb.supabase.co; media-src 'self'; object-src 'none'; frame-src 'none'; worker-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
};

function notFound(res) {
  res.writeHead(404, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }).end('Not found');
}

/* Trả về đường dẫn tuyệt đối an toàn hoặc null. Đã giải mã, chuẩn hóa, kiểm allowlist và chặn symlink thoát gốc. */
function resolveAllowed(rawUrl) {
  let pathname;
  try { pathname = decodeURIComponent(new URL(rawUrl, 'http://x').pathname); } catch { return { status: 400 }; }
  if (pathname.includes('\0') || pathname.includes('\\')) return { status: 404 };
  if (pathname === '/' || pathname.endsWith('/')) pathname = '/index.html';
  if (pathname.split('/').includes('..')) return { status: 404 };
  if (!ALLOWED.test(pathname) || DENIED_PART.test(pathname) || DENIED_PATH.test(pathname)) return { status: 404 };
  let file;
  try { file = fs.realpathSync(path.join(ROOT, pathname)); } catch { return { status: 404 }; }
  if (!file.startsWith(ROOT + path.sep)) return { status: 404 };
  return { file, pathname };
}

function serveStatic(req, res) {
  const target = resolveAllowed(req.url || '/');
  if (!target.file) { target.status === 400 ? res.writeHead(400, SECURITY_HEADERS).end() : notFound(res); return; }
  const { file, pathname } = target;
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) { notFound(res); return; }
    res.writeHead(200, {
      ...SECURITY_HEADERS,
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': /^\/media\//i.test(pathname) ? 'public, max-age=31536000, immutable' : 'no-cache'
    });
    if (req.method === 'HEAD') res.end(); else fs.createReadStream(file).pipe(res);
  });
}
module.exports = { serveStatic, resolveAllowed, ALLOWED, DENIED_PART, DENIED_PATH };
