'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const read = p => readFileSync(join(__dirname,'..',p),'utf8');

test('Edge route table must register all four chat endpoints and both leaderboard criteria', () => {
  const http=read('supabase/functions/api/http.ts'), index=read('supabase/functions/api/index.ts');
  const social=read('supabase/functions/api/social.ts');
  for(const [url,route] of Object.entries({
    'chat/connect':'chatConnect','chat/poll':'chatPoll',
    'chat/send':'chatSend','chat/leave':'chatLeave',ranking:'leaderboard'
  })){
    const pattern=url==='ranking'?'/social/ranking':'/social/'+url;
    assert.ok(http.includes("'"+pattern+"'"),pattern);
    assert.ok(index.includes("case '"+route+"':"),route+' not in deployed handler contract');
  }
  assert.match(index,/const ownerId = await authenticate\(req, route\.name\)/);
  assert.ok(index.indexOf('await authenticate(req, route.name)') < index.indexOf('await handleSocial(repo, ownerId'));
  assert.match(index,/await handleSocial\(repo, ownerId, route\.name, body\)/);
  assert.match(social,/WHERE m\.channel_key = \$1 AND m\.id > \$2/);
  assert.match(social,/if \(!me\.sect_id\)/);
  assert.match(social,/pg_advisory_xact_lock/);
  assert.match(social,/now - asSafe\(last\.created_at\) < 15000/);
  assert.match(social,/SELECT player_id, owner_id, name, realm, stage, combat_power/);
});

test('Chat uses one desktop window, a scrollable feed, a persistent composer and cooldown', () => {
  const css=read('css/chat.css'), ui=read('client/ui/screens/chat.js');
  const client=read('client/session/chat-session.js');
  for(const id of ['chatChannels','chatStatus','chatFeed','chatEmpty','chatForm','chatInput','chatSend','chatError'])
    assert.ok(ui.includes('id="'+id+'"'),id);
  assert.match(ui,/class="chat-transcript"/);
  assert.match(ui,/class="chat-compose-row"/);
  assert.match(css,/\.win\.desktop-window\[data-window="chat"\] \.win-body\{display:flex/);
  assert.match(css,/\.chat-transcript\{position:relative;display:flex;flex:1;min-height:100px/);
  assert.match(css,/\.chat-form\{flex:none/);
  assert.match(ui,/chatInput/);
  assert.match(ui,/session\.lastSentAt/);
  assert.match(ui,/if \(!visible && opened\)/);
  assert.match(ui,/if \(visible && !opened && session\.available\)/);
  assert.match(client,/this\.schedule\(gen, 10000\)/);
  assert.match(client,/this\.schedule\(gen, data\.hasMore \? 1800 : 10000\)/);
  assert.match(client,/this\.lastSentAt = Date\.now\(\)/);
  assert.doesNotMatch(ui,/innerHTML\s*=\s*message\.text/,'chat must render text as textContent');
  assert.match(ui,/content\.textContent = message\.text/);
});

test('Ranking client and chat client still use authenticated Edge API rather than direct DB', () => {
  const more=read('client/ui/screens/more.js'), chat=read('client/session/chat-session.js');
  assert.match(more,/UI\.session\.request\('\/social\/ranking', 'POST', \{ mode \}\)/);
  assert.match(chat,/root\.fetch\(BASE \+ '\/social\/' \+ path/);
  assert.match(chat,/Authorization: 'Bearer ' \+ token/);
  assert.doesNotMatch(chat,/\bsupabase\.from\(/);
});
