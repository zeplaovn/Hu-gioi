'use strict';
/* Chỉ kiểm tra contract an toàn, không phụ thuộc Supabase production. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const read = name => readFileSync(join(__dirname, '..', name), 'utf8');

test('mọi kênh chat có JWT, consent và không có EventSource vô danh', () => {
  const http = read('supabase/functions/api/http.ts');
  const edge = read('supabase/functions/api/index.ts');
  const client = read('client/session/chat-session.js');
  for (const path of ['connect','poll','send','leave'])
    assert.match(http, new RegExp("/social/chat/" + path));
  assert.match(http, /pathname === '\/social\/ranking'/);
  assert.match(edge, /const ownerId = await authenticate\(req, route\.name\)/);
  assert.ok(edge.indexOf('const ownerId = await authenticate') < edge.indexOf('await handleSocial(repo, ownerId'));
  assert.match(client, /Authorization: 'Bearer ' \+ token/);
  assert.match(client, /credentials: 'omit'/);
  assert.doesNotMatch(client, /new EventSource|\/api\/chat\/events/);
});

test('bốn phòng chat cách ly bằng channel_key và quyền tông môn do backend xác thực', () => {
  const sql = read('supabase/migrations/20261111022001_desktop_chat_channels_and_power_ranks.sql');
  const api = read('supabase/functions/api/social.ts');
  const client = read('client/session/chat-session.js');
  assert.match(sql, /game_world_chat_channel_id/);
  assert.match(api, /WHERE channel_key = \$1 AND id > \$2 ORDER BY id ASC/);
  assert.match(api, /channelOf\(body\.channel \|\| 'world', me\)/);
  assert.match(api, /if \(!me\.sect_id\)/);
  assert.match(api, /pg_advisory_xact_lock/);
  assert.match(api, /now - asSafe\(last\.created_at\) < 15000/);
  assert.match(api, /LIMIT = 50/);
  for (const channel of ['world','sect','dao_huu','dao_lu']) assert.ok(client.includes(channel));
});

test('Lực chiến engine server và Cảnh giới có covering indexes, tối đa top 50', () => {
  const db = read('supabase/migrations/20261111022001_desktop_chat_channels_and_power_ranks.sql');
  const api = read('supabase/functions/api/social.ts');
  const repo = read('server/repositories/postgres-players.js');
  const ui = read('client/ui/screens/more.js');
  assert.match(db, /game_player_rank_combat/);
  assert.match(db, /game_player_rank_realm/);
  assert.match(db, /combat_power=EXCLUDED\.combat_power/);
  assert.match(repo, /new GAME\.Game\(state\)\.stats\(\)\.CP/);
  assert.match(api, /combat_power DESC, player_id ASC/);
  assert.match(api, /realm DESC, stage DESC, combat_power DESC/);
  assert.match(ui, /Bảng xếp hạng người chơi thật/);
  assert.match(ui, /data-act="rankingMode"/);
  assert.doesNotMatch(ui, /const RANKS\s*=/);
});

test('quyền dữ liệu và reset sạch sau khi chết: chat, ranking, Thiên Tinh', () => {
  const migration = read('supabase/migrations/20261111015058_online_social_and_indexed_leaderboard.sql');
  const repo = read('server/repositories/postgres-players.js');
  const service = read('server/services/player-service.js');
  for (const table of ['world_chat_messages','world_chat_presence','player_leaderboard'])
    assert.ok(migration.includes('ALTER TABLE game.' + table + ' ENABLE ROW LEVEL SECURITY'));
  assert.match(migration, /REVOKE ALL ON game\.world_chat_messages/);
  assert.match(repo, /DELETE FROM game\.world_chat_messages WHERE owner_id/);
  assert.match(repo, /DELETE FROM game\.world_chat_presence WHERE owner_id/);
  assert.match(repo, /DELETE FROM game\.pavilion_accounts WHERE owner_id/);
  assert.match(repo, /DELETE FROM game\.player_leaderboard WHERE player_id/);
  assert.match(service, /sentChatMessages: data\?\.chatMessages \|\| \[\]/);
  assert.match(service, /async resetAfterDeath/);
});

test('mọi màn là cửa sổ desktop và nhiệm vụ là ứng dụng độc lập', () => {
  const world = read('client/ui/screens/world.js');
  const shell = read('client/ui/shell.js');
  const boot = read('client/ui/boot.js');
  const css = read('css/shell.css');
  assert.match(world, /id: 'quests', label: 'Nhiệm vụ'/);
  assert.doesNotMatch(world.split('const TABS = [')[1].split('];')[0], /id: 'quests'/);
  assert.match(shell, /'chat', 'ranking'/);
  assert.match(shell, /minimize\(id\)/);
  assert.match(shell, /maximize\(id\)/);
  assert.match(shell, /updateTaskbar\(\)/);
  assert.match(css, /\.window-taskbar\{/);
  assert.match(boot, /data-act="resetAfterDeath"/);
  assert.match(boot, /Bắt đầu lại từ đầu/);
});
