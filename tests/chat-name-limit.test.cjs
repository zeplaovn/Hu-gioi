'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('giới hạn lời truyền âm 80 ký tự đồng bộ client, Edge API và DB', () => {
  const ui = read('client/ui/screens/chat.js'), edge = read('supabase/functions/api/social.ts');
  assert.match(ui, /const MAX_TEXT = 80;/);
  assert.match(ui, /maxlength="\$\{MAX_TEXT\}"/);
  assert.doesNotMatch(ui, /\b400\b/);
  assert.match(edge, /const MAX_TEXT = 80;/);
  assert.match(edge, /textLength\(text\) > MAX_TEXT/);
  assert.doesNotMatch(edge, /text\.length > 400|1–400/);
  assert.match(read('supabase/migrations/20261112000000_chat_limit_80.sql'),
    /ADD CONSTRAINT world_chat_messages_body_max80 CHECK \(length\(body\) <= 80\) NOT VALID/);
});

test('Edge API gắn cảnh giới và cờ admin do máy chủ xác định, không tin dữ liệu client', () => {
  const edge = read('supabase/functions/api/social.ts');
  assert.match(edge, /LEFT JOIN game\.player_leaderboard l ON l\.owner_id = m\.owner_id/);
  assert.match(edge, /LEFT JOIN game\.admin_users a ON a\.user_id = m\.owner_id AND a\.enabled AND a\.role IN \('owner','admin'\)/);
  assert.match(edge, /admin: r\.is_admin === true/);
  assert.match(edge, /Math\.max\(0, Math\.min\(13, asSafe\(r\.realm\)\)\)/);
  // Cả 4 đường trả tin nhắn đều đi qua MESSAGE_SELECT (connect, poll, replay, sau khi lưu).
  assert.equal((edge.match(/\$\{MESSAGE_SELECT\}/g) || []).length, 4);
  assert.doesNotMatch(edge, /body\.(?:admin|realm)\b/);
});

test('Tên chat dạng "Tên • Cảnh giới", admin "Admin • Hư Giới Chi Chủ", đủ 14 màu và hiệu ứng', () => {
  const ui = read('client/ui/screens/chat.js'), css = read('css/chat.css');
  assert.match(ui, /Admin • Hư Giới Chi Chủ/);
  assert.match(ui, /message\.admin === true/);
  assert.match(ui, /Math\.max\(0, Math\.min\(13, message\.realm\)\)/);
  assert.doesNotMatch(ui, /innerHTML\s*=[^;]*message\./);
  for (let i = 0; i < 14; i++) assert.match(css, new RegExp('\\.chat-realm\\.realm-' + i + '\\b'), 'realm-' + i);
  assert.match(css, /\.chat-name\.chat-admin/);
  assert.match(css, /@keyframes admin-sweep/);
  assert.match(css, /prefers-reduced-motion:reduce\)\{[^}]*\.chat-name\.chat-admin\{animation:none\}/);
});

test('tên và chat chỉ nhận chữ ASCII, chữ tiếng Việt, chữ số (client, Edge API, DB)', () => {
  const H = require('../data/character.js');
  for (const ok of ['Hàn Thiên Sơn', 'Âu Dương', 'Nguyễn Văn A1', 'đạo hữu Ưu Ơ ỹ ạ'])
    assert.ok(H.TEXT_OK.test(ok.normalize('NFC')), ok);
  for (const bad of ['a_b', 'hi!', '<b>x', 'a  b', ' a', 'a ', '😀', 'abc?', 'Ａbc', 'ЖЖ', 'a\tb', "o'k"])
    assert.equal(H.TEXT_OK.test(bad), false, JSON.stringify(bad));
  assert.equal(H.cleanName('a_b'), null);
  assert.equal(H.cleanName('Hàn  Lục'), 'Hàn Lục');
  assert.equal(H.sanitizeText(' xin chào!! bạn @# 😀'), 'xin chào bạn ');
  assert.equal(H.sanitizeText('Tiếng'), H.sanitizeText('Tiếng')); // NFD → NFC
  for (let i = 0; i < 300; i++) assert.ok(H.cleanName(H.randomName(i % 2 ? 'nu' : 'nam')));
  const ui = read('client/ui/screens/chat.js'), edge = read('supabase/functions/api/social.ts'), boot = read('client/ui/boot.js');
  const mig = read('supabase/migrations/20261112000000_chat_limit_80.sql');
  assert.match(ui, /sanitizeText\(event\.target\.value\)/);
  assert.match(ui, /TEXT_OK\.test\(text\)/);
  assert.match(boot, /H\.sanitizeText\(e\.target\.value\)/);
  assert.match(edge, /!TEXT_OK\.test\(text\)/);
  assert.match(edge, /normalize\('NFC'\)/);
  assert.match(mig, /world_chat_messages_body_charset/);
  // regex của Edge phải giống client
  const m = edge.match(/const TEXT_CHARS = '([^']+)'/);
  const chars = new Function("return '" + m[1] + "'")();
  const re = new RegExp(`^[${chars}]+(?: [${chars}]+)*$`);
  assert.equal(re.source, H.TEXT_OK.source);
  for (const t of ['Xin chào', 'a_b', 'Ưu Ơ ỹ', 'a  b']) assert.equal(re.test(t), H.TEXT_OK.test(t), t);
});
