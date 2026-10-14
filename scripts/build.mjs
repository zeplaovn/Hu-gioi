// Build bản phát hành: gộp toàn bộ runtime trong src/ thành 1 file, nén + làm rối, chỉ chép phần cần chạy vào dist/.
// Chạy: npm i --no-save terser javascript-obfuscator && node scripts/build.mjs
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto";
import { minify } from "terser"; import JavaScriptObfuscator from "javascript-obfuscator";

const root = path.resolve(import.meta.dirname, ".."), dist = path.join(root, "dist");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const scripts = [...html.matchAll(/<script src="(src\/[^"]+)"><\/script>/g)].map(m => m[1]);
if (!scripts.length) throw new Error("Không tìm thấy runtime script trong src/ từ index.html.");
let src = scripts.map(f => fs.readFileSync(path.join(root, f), "utf8")).join("\n;\n");

// Khóa ký dùng cho export/integrity helper. Vercel Preview được phép dùng dev salt; production/CI thật vẫn bắt buộc secret.
const salt = process.env.TVDL_SALT;
const isVercelPreview = !!process.env.VERCEL && process.env.VERCEL_ENV !== "production";
const onCI = !isVercelPreview && !!(process.env.CI || process.env.NETLIFY || process.env.CF_PAGES || process.env.VERCEL_ENV === "production");
if (!salt && onCI) throw new Error("Thiếu biến môi trường TVDL_SALT. Hãy đặt TVDL_SALT rồi build lại.");
if (salt && salt.length < 32) throw new Error("TVDL_SALT quá ngắn (cần ít nhất 32 ký tự).");
if (salt) {
  if (src.split('"__TVDL_SALT__"').length !== 2) throw new Error("Không tìm thấy đúng một chỗ \"__TVDL_SALT__\" trong src/platform/security.js.");
  src = src.replace('"__TVDL_SALT__"', () => JSON.stringify(salt));
} else console.warn("⚠ Chưa đặt TVDL_SALT: bản preview/local dùng khóa dev.");

// Supabase là bắt buộc: từ phiên bản DB-only, game không có local-save/offline gameplay fallback.
const sbUrl = (process.env.SUPABASE_URL || "").trim(), sbKey = (process.env.SUPABASE_ANON_KEY || "").trim();
if (!sbUrl || !sbKey) throw new Error("Thiếu SUPABASE_URL hoặc SUPABASE_ANON_KEY. Game DB-only bắt buộc kết nối Supabase.");
let u; try { u = new URL(sbUrl); } catch (e) { throw new Error("SUPABASE_URL không hợp lệ: " + sbUrl); }
const local = u.protocol === "http:" && ["localhost", "127.0.0.1"].includes(u.hostname);
if (u.protocol !== "https:" && !local) throw new Error("SUPABASE_URL phải bắt đầu bằng https:// (hoặc localhost khi phát triển).");
if (u.pathname.replace(/\/+$/, "") || u.search || u.hash || u.username) throw new Error("SUPABASE_URL chỉ gồm địa chỉ gốc, không kèm đường dẫn: " + sbUrl);
if (/^sb_secret_/.test(sbKey)) throw new Error("SUPABASE_ANON_KEY đang là khóa bí mật (sb_secret_...). Chỉ dùng khóa công khai (anon / sb_publishable_...).");
let role = null;
if (sbKey.split(".").length === 3) { try { role = JSON.parse(Buffer.from(sbKey.split(".")[1], "base64url").toString("utf8")).role; } catch (e) { /* không phải JWT chuẩn */ } }
if (role && role !== "anon") throw new Error(`SUPABASE_ANON_KEY có role "${role}", không phải "anon". KHÔNG được đưa khóa này vào mã chạy trên trình duyệt.`);
if (sbKey.length < 20 || /\s/.test(sbKey)) throw new Error("SUPABASE_ANON_KEY có vẻ không hợp lệ.");
for (const [token, value] of [['"__SUPABASE_URL__"', u.origin], ['"__SUPABASE_ANON_KEY__"', sbKey]]) {
  if (src.split(token).length !== 2) throw new Error(`Không tìm thấy đúng một chỗ ${token} trong src/services/config.js.`);
  src = src.replace(token, () => JSON.stringify(value));
}
const connectSrc = u.origin;

// hCaptcha (tuỳ chọn): HCAPTCHA_SITEKEY là site key CÔNG KHAI. Secret key chỉ đặt ở Supabase Dashboard.
const hcKey = (process.env.HCAPTCHA_SITEKEY || "").trim();
if (hcKey) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(hcKey)) throw new Error("HCAPTCHA_SITEKEY không đúng định dạng site key (UUID). Đừng dùng secret key (bắt đầu bằng ES_ hoặc 0x).");
  if (src.split('"__HCAPTCHA_SITEKEY__"').length !== 2) throw new Error('Không tìm thấy đúng một chỗ "__HCAPTCHA_SITEKEY__" trong src/services/config.js.');
  src = src.replace('"__HCAPTCHA_SITEKEY__"', () => JSON.stringify(hcKey));
}

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

const HC = "https://hcaptcha.com https://*.hcaptcha.com";
const csp = { "script-src": hcKey ? `'self' ${HC}` : "'self'", "style-src": hcKey ? `'self' ${HC}` : "'self'", "frame-src": hcKey ? HC : "'none'",
  "connect-src": [connectSrc, hcKey ? HC : ""].filter(Boolean).join(" ") };
const withCsp = text => {
  if (!/connect-src [^;"\n]*/.test(text)) throw new Error("Không tìm thấy connect-src để thay.");
  return text.replace(/\b(script-src|style-src|frame-src|connect-src) [^;"\n]*/g, (_, d) => `${d} ${csp[d]}`);
};
let out = withCsp(html).replace(/\s*<script src="src\/[^"]+"><\/script>/g, "").replace("</body>", `  <script src="${bundle}"></script>\n</body>`);
fs.writeFileSync(path.join(dist, "index.html"), out);
fs.cpSync(path.join(root, "styles"), path.join(dist, "styles"), { recursive: true });
fs.cpSync(path.join(root, "assets"), path.join(dist, "assets"), { recursive: true });
for (const f of ["_headers", "vercel.json"]) if (fs.existsSync(path.join(root, f))) fs.writeFileSync(path.join(dist, f), withCsp(fs.readFileSync(path.join(root, f), "utf8")));

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
