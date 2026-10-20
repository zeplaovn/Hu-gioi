import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCsv } from '../tools/csv.mjs';
import { STAGES, RULES, TM_CATALOG, tangSeconds, creditSeconds } from '../packages/game-core/src/index.ts';
const read = p => readFileSync(new URL('../'+p, import.meta.url), 'utf8');

test('all 135 runtime thresholds match the audited Excel-source CSV', () => {
  const xp = parseCsv(read('data/xp_thresholds_45_days.csv'));
  assert.equal(xp.length, 135);
  const seen = new Set();
  for (const r of xp) {
    const key = r.stage_id+':'+r.tier;
    assert(!seen.has(key)); seen.add(key);
    const stage = STAGES.findIndex(s => s.stage_id === r.stage_id);
    assert(Math.abs(tangSeconds(stage,+r.tier) - +r.xp_required/+r.xp_per_effective_hour*3600) < 1e-7);
  }
  assert.throws(() => tangSeconds(0,0)); assert.throws(() => tangSeconds(0,10));
  const days = RULES.tier_seconds.flat().reduce((a,b)=>a+b,0)/creditSeconds(86400);
  assert(Math.abs(days-33)<.01, `reference duration ${days}`);
  assert.equal(STAGES.at(-1).day_end,33);
  assert.equal(TM_CATALOG.filter(x=>x.kind==='stat').reduce((sum,x)=>sum+x.level_cap*x.base_cost+x.step_cost*x.level_cap*(x.level_cap-1)/2,0),2280);
});
test('CSV parser keeps quoted commas, escaped quotes, BOM and multiline fields', () => {
  assert.deepEqual(parseCsv('﻿id,name\r\n1,"a, b"\r\n2,"a""b\nc"\r\n'),[{id:'1',name:'a, b'},{id:'2',name:'a"b\nc'}]);
});
test('842 image destinations are unique and the manifest keeps its audited quality flags', () => {
  const a=JSON.parse(read('data/asset-manifest.json'));
  assert.equal(a.length,842);assert.equal(new Set(a.map(x=>x.path)).size,842);
  assert.equal(a.filter(x=>x.quality==='da_tao_lai').length,3);
});
