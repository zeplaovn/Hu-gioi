/* esbuild: bundle CommonJS core + engine + data thành ESM duy nhất cho Deno.
   Tính content version ở BUILD TIME, không fs/runtime, không thay đổi engine/rules. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');
const { computeContentVersion } = require('../server/content-version.js');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'supabase/functions/api/game.bundle.mjs');
const LIMIT = 20 * 1024 * 1024;
const version = computeContentVersion(ROOT);
// engine/game.js có require() theo biến RULE_FILES; thay bằng require tĩnh ở BUNDLE TIME.
// Mã game nguồn không đổi, toàn bộ 9 miền vẫn dùng cùng logic.
const explicitRules = ['progression','inventory','crafting','combat','world','adventures','social','time','creation'];
const plugin = { name: 'bundle-engine-rules', setup(build) {
  build.onLoad({ filter: /[/\\]engine[/\\]game\.js$/ }, args => {
    let src = fs.readFileSync(args.path, 'utf8');
    const needle = "RULE_FILES.map(name => require('./rules/' + name + '.js'))";
    if (!src.includes(needle)) throw Error('Engine import pattern đã thay đổi, cần rà soát trước khi bundle.');
    src = src.replace(needle, '[' + explicitRules.map(n => "require('./rules/" + n + ".js')").join(', ') + ']');
    return { contents: src, loader: 'js', resolveDir: path.dirname(args.path) };
  });
}};
async function main() {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const result = await esbuild.build({
    entryPoints: [path.join(ROOT, 'supabase/functions/api/_bundle_entry.mjs')],
    outfile: OUT, bundle: true, format: 'esm', platform: 'node', target: 'node24',
    minify: true, treeShaking: true, metafile: true,
    define: { __HU_CONTENT_VERSION__: JSON.stringify(version) },
    plugins: [plugin],
    banner: { js: `import { createRequire as huCreateRequire } from "node:module"; import { Buffer as huBuffer } from "node:buffer"; const require = huCreateRequire(import.meta.url); globalThis.Buffer ??= huBuffer;` },
    legalComments: 'none', charset: 'utf8', sourcemap: false,
    logLevel: 'warning'
  });
  const size = fs.statSync(OUT).size;
  const engineCount = Object.keys(result.metafile.inputs).filter(p => p.includes('/engine/')).length;
  const dataCount = Object.keys(result.metafile.inputs).filter(p => p.includes('/data/')).length;
  if (!engineCount || !dataCount) throw Error('Bundle thiếu engine hoặc data.');
  if (size > LIMIT) throw Error('Bundle Edge vượt 20 MiB.');
  console.log(JSON.stringify({
    artifact: path.relative(ROOT, OUT), bytes: size,
    mib: +(size / 1048576).toFixed(3), contentVersion: version,
    engineModules: engineCount, dataModules: dataCount
  }));
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
