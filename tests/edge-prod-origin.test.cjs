'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
test('Edge CORS: production default cụ thể, secret allowlist vẫn được ưu tiên', () => {
  const src = fs.readFileSync(path.join(__dirname, '../supabase/functions/api/index.ts'), 'utf8');
  assert.match(src, /Deno\.env\.get\('HU_ALLOWED_ORIGINS'\) \|\| 'https:\/\/hugioi\.blackbearvn\.workers\.dev'/);
  assert.doesNotMatch(src, /Deno\.env\.get\('HU_ALLOWED_ORIGINS'\) \|\| '\*'/);
});