'use strict';
/* Tài nguyên social thật: kiểm chứng contract giữa schema private, Edge API và UI.
 * Không cần mạng, secrets hoặc Supabase production để chạy. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const read = name => readFileSync(join(__dirname, '..', name), 'utf8');

test('chat + ranking phải đi qua Edge JWT/consent; không dùng SSE vô danh', () => {
  const http = read('supabase/functions/api/http.ts');
  const edge = read('supabase/functions/api/index.ts');
  const client = read('client/session/chat-session.js');
  for (const [route, verb] of [
    ['/social/chat/connect', 'POST'],
    ['/social/chat/poll', 'POST'],
    ['/social/chat/send', 'POST'],
    ['/social/chat/leave', 'POST'],
    ['/social/ranking', 'GET']
  ]) {
    assert.ok(http.includes(`method === '${verb}' && pathname === '${route}'`), route);
  }
  assert.match(edge, /const ownerId = await authenticate\(req, route\.name\)/);
  assert.ok(edge.indexOf('const ownerId = await authenticate') < edge.indexOf('await handleSocial(repo, ownerId'));
  assert.match(client, /Authorization: 'Bearer ' \+ token/);
  assert.match(client, /credentials: 'omit'/);
  assert.doesNotMatch(client, /new EventSource|\/api\/chat\/events/);
});

test('chat phân trang theo PK, rate limit 2s, idempotency, không đọc hết trạng thái', () => {
  const db = read('supabase/migrations/20261111015058_online_social_and_indexed_leaderboard.sql');
  const api = read('supabase/functions/api/social.ts');
  assert.match(db, /UNIQUE\(owner_id, request_id\)/);
  assert.match(db, /CREATE INDEX IF NOT EXISTS game_world_chat_sender_time/);
  assert.match(db, /CREATE INDEX IF NOT EXISTS game_world_chat_online/);
  assert.match(api, /WHERE id > \$1 ORDER BY id ASC LIMIT/);
  assert.match(api, /pg_advisory_xact_lock/);
  assert.match(api, /now - asSafe\(last\.created_at\) < 2000/);
  assert.match(api, /LIMIT = 50/);
  assert.doesNotMatch(api, /SELECT \* FROM game\.players/);
});

test('bảng xếp hạng người thật dùng projection có index, không còn NPC giả', () => {
  const db = read('supabase/migrations/20261111015058_online_social_and_indexed_leaderboard.sql');
  const ui = read('client/ui/screens/more.js');
  const api = read('supabase/functions/api/social.ts');
  assert.match(db, /CREATE INDEX IF NOT EXISTS game_player_leaderboard_rating/);
  assert.match(db, /NEW\.state #>> '\{social,pvp,rating\}'/);
  assert.match(api, /ORDER BY rating DESC, player_id ASC LIMIT/);
  assert.match(ui, /Bảng xếp hạng người chơi thật/);
  assert.doesNotMatch(ui, /const RANKS\s*=/);
});

test('game và social private; dữ liệu chat được xuất/xóa theo quyền tài khoản', () => {
  const db = read('supabase/migrations/20261111015058_online_social_and_indexed_leaderboard.sql');
  const repo = read('server/repositories/postgres-players.js');
  const service = read('server/services/player-service.js');
  for (const tbl of ['world_chat_messages', 'world_chat_presence', 'player_leaderboard']) {
    assert.ok(db.includes('ALTER TABLE game.' + tbl + ' ENABLE ROW LEVEL SECURITY'));
  }
  assert.match(db, /REVOKE ALL ON game\.world_chat_messages/);
  assert.match(repo, /DELETE FROM game\.world_chat_messages WHERE owner_id/);
  assert.match(repo, /DELETE FROM game\.world_chat_presence WHERE owner_id/);
  assert.match(service, /sentChatMessages: data\?\.chatMessages \|\| \[\]/);
  assert.doesNotMatch(service, /async resetAfterDeath/);
});

test('giao diện menu riêng cho nhiệm vụ, map cover và không còn nút chuyển kiếp', () => {
  const world = read('client/ui/screens/world.js');
  const shell = read('client/ui/shell.js');
  const boot = read('client/ui/boot.js');
  const css = read('css/screens.css');
  assert.match(world, /id: 'quests', label: 'Nhiệm vụ'/);
  assert.doesNotMatch(world.split('const TABS = [')[1].split('];')[0], /id: 'quests'/);
  assert.match(shell, /'world', 'quests'/);
  assert.match(css, /\.interactive-map \.map-image\{.*object-fit:fill/);
  assert.doesNotMatch(boot, /data-act="resetAfterDeath"/);
  assert.doesNotMatch(shell, /UI\.resetAfterDeath/);
});
