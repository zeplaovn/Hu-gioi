#!/usr/bin/env node
/* Release-only audit: inventory tracked text files and recent Git diffs.
 * Never print matched values, tokens, DB passwords, or source lines.
 * Use with actions/checkout fetch-depth >= 40.
 * Heuristic detection, NOT a complete replacement for credential rotation
 * or a dedicated secret scanner.
 */
'use strict';
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { URL } = require('node:url');
const assert = require('node:assert/strict');

const run = (args, encoding = 'utf8') => execFileSync('git', args, {
  encoding, maxBuffer: 32 * 1024 * 1024
});
const tracked = run(['ls-files', '-z']).split('\0').filter(Boolean);
const rules = [
  ['private-key-pem', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['supabase-secret-key', /\bsb_secret_[A-Za-z0-9]{15,}\b/],
  ['github-access-token', /\bgh[pousr]_[A-Za-z0-9]{30,}\b/],
  ['aws-access-key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['jwt-triple-token', /\beyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/],
  ['postgres-uri-credential', /\bpostgres(?:ql)?:\/\/[^\s:@<>'"]+:[^\s@<>'"]+@[^\s/<>''"]+/i]
];
const findings = [];
const refs = { textFiles: 0, binarySkipped: 0, oversizedSkipped: 0, historyCommits: 0 };
function scan(text, file, scope) {
  for (const [name, rx] of rules) {
    if (!rx.test(text)) continue;
    // A known CI smoke fixture deliberately passes a fake username/password
    // to an unreachable test database endpoint. Exempt ONLY the single
    // explicitly fake fixture: never whitelist a real value or whole path.
    if (scope === 'tracked' && name === 'postgres-uri-credential' &&
        file === 'tools/edge-http-smoke.cjs' &&
        /Fake credentials chỉ được dùng ở CI/.test(text)) {
      const dummy = text.match(/HU_DB_POOLER_URL:\s*['"]postgres(?:ql)?:\/\/([^:@]+):([^@]+)@/);
      const urls = text.match(new RegExp(rx.source, 'gi')) || [];
      if (dummy && urls.length === 1 &&
          /^(?:fake|test|ci)[-_a-z0-9]*$/i.test(dummy[1]) &&
          /^(?:fake|test|ci)[-_a-z0-9]*$/i.test(dummy[2])) continue;
    }
    findings.push({ scope, file, pattern: name });
  }
}
for (const file of tracked) {
  let stat;
  try { stat = fs.statSync(file); } catch { continue; }
  if (!stat.isFile()) continue;
  if (stat.size > 12 * 1024 * 1024) {
    refs.oversizedSkipped++;
    continue;
  }
  const buffer = fs.readFileSync(file);
  if (buffer.includes(0) || /\.(?:png|jpe?g|webp|gif|mp3|woff2?|ttf|otf|ico|pdf|xlsx)$/i.test(file)) {
    refs.binarySkipped++;
    continue;
  }
  refs.textFiles++;
  scan(buffer.toString('utf8'), file, 'tracked');
}

// Inspect the recent commit patch, including removed lines, without printing
// any potential leaked secret. A shallow Git checkout must have enough depth.
const commits = run(['log', '-25', '--format=%H']).split(/\r?\n/).filter(Boolean);
refs.historyCommits = commits.length;
for (const commit of commits) {
  const patch = run(['show', '--format=', '--no-ext-diff', '--no-renames', commit]);
  let file = '(unknown)';
  for (const line of patch.split(/\r?\n/)) {
    if (line.startsWith('+++ b/') || line.startsWith('--- a/')) {
      file = line.slice(6);
      continue;
    }
    if (!(line.startsWith('+') || line.startsWith('-')) ||
        line.startsWith('+++') || line.startsWith('---')) continue;
    const addition = line.slice(1);
    for (const [pattern, rx] of rules) {
      if (rx.test(addition)) findings.push({ scope: 'history', file, pattern });
    }
  }
}

const headers = fs.readFileSync('_headers', 'utf8');
const csp = headers.match(/^\s*Content-Security-Policy:\s*(.+)$/m)?.[1] || '';
assert.ok(csp, 'CSP is missing');
const script = csp.match(/(?:^|;)\s*script-src\s+([^;]+)/)?.[1]?.trim() || '';
assert.equal(script, "'self'", 'script-src must only permit self');
const config = fs.readFileSync('client/config.js', 'utf8');
const host = config.match(/https:\/\/([a-z0-9-]+\.supabase\.co)\//)?.[1];
assert.ok(host, 'Missing known Supabase host in client/config.js');
const connect = csp.match(/(?:^|;)\s*connect-src\s+([^;]+)/)?.[1]?.trim() || '';
assert.equal(connect, "'self' https://" + host, 'connect-src must contain exactly self and the configured Supabase host');
assert.match(headers, /\/media\/\*\s*\n\s*Cache-Control:\s*public,\s*max-age=/,
  'Media cache headers missing');

const unique = [...new Map(findings.map(f => [f.scope+':'+f.file+':'+f.pattern, f])).values()];
console.log(JSON.stringify({
  tracked: tracked.length,
  ...refs,
  csp: 'script-src self, connect-src exact Supabase host, media cache: verified in source',
  secretPatternCandidates: unique // categories and filenames ONLY, never actual values
}, null, 2));
if (unique.length) process.exitCode = 1;
