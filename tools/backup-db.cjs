#!/usr/bin/env node
/* Sao lưu nhất quán SQLite (VACUUM INTO, an toàn khi WAL đang ghi) và luân phiên bản cũ.
   Dùng: node tools/backup-db.cjs [--db <file>] [--out <thư mục>] [--keep <số bản>]
   Mặc định: HU_DB_FILE, thư mục <db>/../backups, giữ 7 bản. Bản sao quyền 0600, thư mục 0700.
   Chính sách quyền riêng tư cam kết bản sao lưu bị ghi đè theo chu kỳ luân phiên: --keep chính là chu kỳ đó. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

function backup({ db, out, keep = 7, now = new Date() }) {
  const src = path.resolve(db);
  if (!fs.existsSync(src)) throw Error('Không tìm thấy CSDL: ' + src);
  if (!Number.isInteger(keep) || keep < 1) throw Error('--keep phải là số nguyên ≥ 1.');
  const dir = path.resolve(out || path.join(path.dirname(src), 'backups'));
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.chmodSync(dir, 0o700);
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const dest = path.join(dir, `game-${stamp}.sqlite`);
  if (fs.existsSync(dest)) throw Error('Bản sao lưu đã tồn tại: ' + dest);
  const conn = new DatabaseSync(src, { readOnly: true });
  try { conn.prepare('VACUUM INTO ?').run(dest); } finally { conn.close(); }
  fs.chmodSync(dest, 0o600);
  const verify = new DatabaseSync(dest, { readOnly: true });
  try {
    const ok = verify.prepare('PRAGMA integrity_check').get();
    if (Object.values(ok)[0] !== 'ok') { fs.rmSync(dest); throw Error('Bản sao lưu không qua kiểm tra toàn vẹn.'); }
  } finally { verify.close(); }
  const old = fs.readdirSync(dir).filter(f => /^game-\d{8}T\d{6}Z\.sqlite$/.test(f)).sort().reverse().slice(keep);
  for (const f of old) fs.rmSync(path.join(dir, f));
  return { dest, removed: old };
}

if (require.main === module) {
  const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
  try {
    const db = arg('--db') || process.env.HU_DB_FILE || path.resolve('.hu-gioi', 'game.sqlite');
    const res = backup({ db, out: arg('--out'), keep: arg('--keep') ? Number(arg('--keep')) : 7 });
    console.log('Đã sao lưu:', res.dest, res.removed.length ? `(xóa ${res.removed.length} bản cũ)` : '');
  } catch (e) { console.error(e.message); process.exit(1); }
}
module.exports = { backup };
