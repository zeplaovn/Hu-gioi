'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('Workers build includes esbuild devDependency even with NODE_ENV=production', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  const wrangler = fs.readFileSync(path.join(root, 'wrangler.jsonc'), 'utf8');

  assert.equal(pkg.devDependencies?.esbuild, lock.packages?.['']?.devDependencies?.esbuild);
  assert.ok(lock.packages?.['node_modules/esbuild'], 'esbuild must remain pinned in lockfile');
  assert.match(wrangler, /"command"\s*:\s*"npm ci --include=dev && npm run build:min"/);
});
