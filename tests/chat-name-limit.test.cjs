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
