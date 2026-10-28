import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(dir,e.name)) : [join(dir,e.name)]);
const files = ['client','shared','server','tests','tools'].flatMap(dir => walk(join(root,dir))).filter(f => /\.(?:m?js)$/.test(f));
for (const file of files) {
  const check = spawnSync(process.execPath,['--check',file],{ stdio:'inherit' });
  if (check.status !== 0) process.exit(check.status || 1);
}
const html = readFileSync(join(root,'index.html'),'utf8');
for (const [,src] of html.matchAll(/<script\s+src="([^"]+)"/g)) {
  if (!existsSync(resolve(root,src))) throw Error('Thiếu script: '+src);
  if (src.startsWith('server/')) throw Error('Không đưa mã server vào trình duyệt.');
}
console.log(`Syntax OK: ${files.length} files; index.html paths OK.`);
