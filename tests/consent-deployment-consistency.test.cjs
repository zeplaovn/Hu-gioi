/* Guard against source-level consent version drift between UI, Node and Deno Edge.
 * Does not prove the version currently deployed to Supabase: confirm via get_edge_function. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = path => fs.readFileSync(require('node:path').join(root, path), 'utf8');
function version(source, variable) {
  const match = source.match(new RegExp('\\bconst\\s+' + variable + "\\s*=\\s*'([^']+)';"));
  assert.ok(match, 'Missing ' + variable + ' declaration');
  return match[1];
}
test('một phiên bản consent cho frontend, Node verifier và Supabase Edge function', () => {
  const client = read('client/auth/supabase.js');
  const server = read('server/auth/consent.js');
  const edge = read('supabase/functions/api/index.ts');
  const ui = version(client, 'VERSION');
  assert.equal(ui, '2026-11-11-v7');
  assert.equal(version(server, 'VERSION'), ui);
  assert.equal(version(edge, 'POLICY_VERSION'), ui);
  assert.match(edge, /SELECT policy_kind FROM public\.policy_acceptances WHERE user_id = \$1 AND policy_version = \$2/);
  assert.match(server, /query\.searchParams\.set\('policy_version', 'eq\.' \+ VERSION\)/);
  for (const source of [client, server, edge]) {
    assert.match(source, /'privacy'/);
    assert.match(source, /'release_terms'/);
  }
});
