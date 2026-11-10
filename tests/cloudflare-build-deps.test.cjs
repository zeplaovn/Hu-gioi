'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('Workers production install keeps esbuild with devDependencies omitted', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  const wrangler = fs.readFileSync(path.join(root, 'wrangler.jsonc'), 'utf8');

  assert.equal(pkg.dependencies?.esbuild, '0.28.2');
  assert.equal(pkg.dependencies?.esbuild, lock.packages?.['']?.dependencies?.esbuild);
  assert.equal(pkg.devDependencies?.esbuild, undefined, 'build minifier cannot be dev-only');
  assert.ok(lock.packages?.['node_modules/esbuild'], 'esbuild must remain pinned in lockfile');
  assert.equal(lock.packages['node_modules/esbuild'].dev, undefined, 'lockfile esbuild must be a production dependency');
  for (const arch of ['linux-x64', 'linux-arm64', 'darwin-arm64', 'win32-x64']) {
    assert.equal(lock.packages['node_modules/@esbuild/' + arch].dev, undefined, 'platform binary must not be dev-only: ' + arch);
  }
  assert.match(wrangler, /"command"\s*:\s*"npm ci --include=dev && npm run build:min"/);
});
