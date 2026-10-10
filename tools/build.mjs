// Build bản phát hành: gộp toàn bộ js/ thành 1 file, nén + làm rối, chỉ chép phần cần chạy vào dist/.
// Chạy:  npm i --no-save terser javascript-obfuscator  &&  node tools/build.mjs
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto";
import { minify } from "terser"; import JavaScriptObfuscator from "javascript-obfuscator";

const root = path.resolve(import.meta.dirname, ".."), dist = path.join(root, "dist");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const scripts = [...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map(m => m[1]);   // giữ đúng thứ tự nạp
// các file được nạp chung 1 phạm vi toàn cục nên chỉ cần nối lại theo thứ tự
const src = scripts.map(f => fs.readFileSync(path.join(root, f), "utf8")).join("\n;\n");

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

let out = html.replace(/\s*<script src="js\/[^"]+"><\/script>/g, "").replace("</body>", `  <script src="${bundle}"></script>\n</body>`);
fs.writeFileSync(path.join(dist, "index.html"), out);
fs.cpSync(path.join(root, "css"), path.join(dist, "css"), { recursive: true });
fs.cpSync(path.join(root, "assets"), path.join(dist, "assets"), { recursive: true });   // KHÔNG chép assets_src/, tools/, *.bat/*.sh, README
for (const f of ["_headers", "vercel.json"]) if (fs.existsSync(path.join(root, f))) fs.copyFileSync(path.join(root, f), path.join(dist, f));
console.log(`OK dist/ : ${bundle} (${(obf.length / 1024).toFixed(0)} KB, từ ${(src.length / 1024).toFixed(0)} KB)`);
