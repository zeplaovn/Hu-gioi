// Build bản phát hành: gộp toàn bộ js/ thành 1 file, nén + làm rối, chỉ chép phần cần chạy vào dist/.
// Chạy:  npm i --no-save terser javascript-obfuscator  &&  node tools/build.mjs
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto";
import { minify } from "terser"; import JavaScriptObfuscator from "javascript-obfuscator";

const root = path.resolve(import.meta.dirname, ".."), dist = path.join(root, "dist");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const scripts = [...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map(m => m[1]);   // giữ đúng thứ tự nạp
// các file được nạp chung 1 phạm vi toàn cục nên chỉ cần nối lại theo thứ tự
let src = scripts.map(f => fs.readFileSync(path.join(root, f), "utf8")).join("\n;\n");

// Khóa ký save KHÔNG nằm trong repo: lấy từ biến môi trường TVDL_SALT (đặt trong Vercel / Cloudflare > Environment Variables).
// Tạo khóa:  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
// Đổi khóa = mọi save cũ của người chơi bị coi là hỏng, nên đặt một lần rồi giữ nguyên.
const salt = process.env.TVDL_SALT, onCI = !!(process.env.VERCEL || process.env.CI || process.env.NETLIFY || process.env.CF_PAGES);
if (!salt && onCI) throw new Error("Thiếu biến môi trường TVDL_SALT: bản phát hành sẽ dùng khóa ký công khai trong mã nguồn. Hãy đặt TVDL_SALT rồi build lại.");
if (salt && salt.length < 32) throw new Error("TVDL_SALT quá ngắn (cần ít nhất 32 ký tự).");
if (salt) {
  if (src.split('"__TVDL_SALT__"').length !== 2) throw new Error("Không tìm thấy đúng một chỗ \"__TVDL_SALT__\" trong js/security.js.");
  src = src.replace('"__TVDL_SALT__"', () => JSON.stringify(salt));
} else console.warn("⚠ Chưa đặt TVDL_SALT: bản build này dùng khóa dev, CHỈ để thử, không phát hành.");

// Supabase (tuỳ chọn): SUPABASE_URL + SUPABASE_ANON_KEY. Cả hai là giá trị công khai, nhưng KHÔNG bao giờ được là khóa bí mật (service_role / sb_secret_).
// Không đặt cả hai = bản ngoại tuyến (chỉ lưu trên máy) và CSP vẫn chặn mọi kết nối mạng.
const sbUrl = (process.env.SUPABASE_URL || "").trim(), sbKey = (process.env.SUPABASE_ANON_KEY || "").trim();
let connectSrc = "'none'";
if (sbUrl || sbKey) {
  if (!sbUrl || !sbKey) throw new Error("Cần đặt cả SUPABASE_URL và SUPABASE_ANON_KEY (hoặc bỏ cả hai để build bản ngoại tuyến).");
  let u; try { u = new URL(sbUrl); } catch (e) { throw new Error("SUPABASE_URL không hợp lệ: " + sbUrl); }
  const local = u.protocol === "http:" && ["localhost", "127.0.0.1"].includes(u.hostname);          // chỉ cho phép http với máy chủ giả khi thử cục bộ
  if (u.protocol !== "https:" && !local) throw new Error("SUPABASE_URL phải bắt đầu bằng https:// (ví dụ https://abcdxyz.supabase.co).");
  if (u.pathname.replace(/\/+$/, "") || u.search || u.hash || u.username) throw new Error("SUPABASE_URL chỉ gồm địa chỉ gốc, không kèm đường dẫn: " + sbUrl);
  if (/^sb_secret_/.test(sbKey)) throw new Error("SUPABASE_ANON_KEY đang là khóa bí mật (sb_secret_...). Chỉ dùng khóa công khai (anon / sb_publishable_...).");
  let role = null;
  if (sbKey.split(".").length === 3) { try { role = JSON.parse(Buffer.from(sbKey.split(".")[1], "base64url").toString("utf8")).role; } catch (e) { /* không phải JWT chuẩn */ } }
  if (role && role !== "anon") throw new Error(`SUPABASE_ANON_KEY có role "${role}", không phải "anon". KHÔNG được đưa khóa này vào mã chạy trên trình duyệt.`);
  if (sbKey.length < 20 || /\s/.test(sbKey)) throw new Error("SUPABASE_ANON_KEY có vẻ không hợp lệ.");
  for (const [token, value] of [['"__SUPABASE_URL__"', u.origin], ['"__SUPABASE_ANON_KEY__"', sbKey]]) {
    if (src.split(token).length !== 2) throw new Error(`Không tìm thấy đúng một chỗ ${token} trong js/config.js.`);
    src = src.replace(token, () => JSON.stringify(value));
  }
  connectSrc = u.origin;
} else console.warn("⚠ Chưa đặt SUPABASE_URL / SUPABASE_ANON_KEY: bản build này chạy ngoại tuyến (không có đăng nhập / lưu trên máy chủ).");

const min = await minify(src, { compress: { passes: 2 }, mangle: { toplevel: false }, format: { comments: false } });
if (min.error) throw min.error;
const obf = JavaScriptObfuscator.obfuscate(min.code, {
  compact: true, renameGlobals: false, identifierNamesGenerator: "hexadecimal",
  stringArray: true, stringArrayThreshold: 0.75, stringArrayEncoding: ["base64"], stringArrayRotate: true, stringArrayShuffle: true,
  splitStrings: true, splitStringsChunkLength: 8, transformObjectKeys: false,
  controlFlowFlattening: false, deadCodeInjection: false, selfDefending: false, debugProtection: false,
}).getObfuscatedCode();

fs.rmSync(dist, { recursive: true, force: true }); fs.mkdirSync(dist, { recursive: true });
const hash = crypto.createHash("sha256").update(obf).digest("hex").slice(0, 10), bundle = `app.${hash}.js`;
fs.writeFileSync(path.join(dist, bundle), obf);

// Thay MỌI connect-src (index.html có 'none'; vercel.json / _headers gốc có https://*.supabase.co) bằng giá trị thật của bản build này.
const withCsp = text => { const re = /connect-src [^;"\n]*/g; if (!re.test(text)) throw new Error("Không tìm thấy connect-src để thay."); return text.replace(re, `connect-src ${connectSrc}`); };
let out = withCsp(html).replace(/\s*<script src="js\/[^"]+"><\/script>/g, "").replace("</body>", `  <script src="${bundle}"></script>\n</body>`);
fs.writeFileSync(path.join(dist, "index.html"), out);
fs.cpSync(path.join(root, "css"), path.join(dist, "css"), { recursive: true });
fs.cpSync(path.join(root, "assets"), path.join(dist, "assets"), { recursive: true });   // KHÔNG chép assets_src/, tools/, *.bat/*.sh, README
for (const f of ["_headers", "vercel.json"]) if (fs.existsSync(path.join(root, f))) fs.writeFileSync(path.join(dist, f), withCsp(fs.readFileSync(path.join(root, f), "utf8")));
// Vercel chỉ đọc vercel.json ở thư mục GỐC (bản trong dist/ bị bỏ qua), nên CSP đã mở connect-src cho Supabase phải đi qua Build Output API:
// .vercel/output/{static,config.json}. Khi có thư mục này Vercel dùng nó thay cho vercel.json gốc.
if (process.env.VERCEL || process.argv.includes("--vercel")) {
  const out3 = path.join(root, ".vercel", "output");
  fs.rmSync(out3, { recursive: true, force: true }); fs.mkdirSync(out3, { recursive: true });
  fs.cpSync(dist, path.join(out3, "static"), { recursive: true });
  for (const f of ["_headers", "vercel.json"]) fs.rmSync(path.join(out3, "static", f), { force: true });
  const cfg = JSON.parse(withCsp(fs.readFileSync(path.join(root, "vercel.json"), "utf8")));
  const routes = (cfg.headers || []).map(r => ({ src: r.source, headers: Object.fromEntries(r.headers.map(h => [h.key, h.value])), continue: true }));
  fs.writeFileSync(path.join(out3, "config.json"), JSON.stringify({ version: 3, routes: [...routes, { handle: "filesystem" }] }, null, 2));
  console.log(`OK .vercel/output : ${routes.length} nhóm header (connect-src ${connectSrc})`);
}
if (salt && obf.includes(salt)) console.warn("⚠ Khóa ký còn xuất hiện nguyên văn trong bundle (bình thường nếu chuỗi bị tách, nhưng hãy kiểm tra).");
console.log(`OK dist/ : ${bundle} (${(obf.length / 1024).toFixed(0)} KB, từ ${(src.length / 1024).toFixed(0)} KB)`);
