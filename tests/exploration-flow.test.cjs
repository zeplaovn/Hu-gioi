'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const H = require('../engine/game.js');
const C = require('../engine/protocol/commands.js');
const NOW = 1_700_000_000_000;
const PROFILE = { name:'Lâm Vân',gender:'nu',age:18,race:'nhan',
  roots:[72, 61, 45, 44, 33],rootType:'Song',
  talent:{tuongMao:2,phucDuyen:2,canCot:2,ngoTinh:1,vanKhi:1} };
const make = (roll=.5) => new H.Game(H.createCharacter(PROFILE, NOW, () => .5), () => roll);
const run = (g,type,payload={},now=NOW) => C.execute(g,{type,payload},now);

test('một lần khởi hành 10 phút, bốc đều được ba nhóm sự kiện', () => {
  for (const [roll,kind] of [[.01,'monster'],[.5,'npc'],[.99,'encounter']]) {
    const g=make(roll), e=run(g,'startExploration');
    assert.equal(e.kind,kind);
    assert.equal(e.end-e.start,600000);
    assert.equal(g.s.auto,false);
    assert.throws(() => run(g,'startExploration'), /đang diễn ra/);
    if(kind==='npc') assert.ok(Object.hasOwn(H.DESIGN.npc,e.npcId));
    if(kind==='encounter') assert.ok(H.ENCOUNTERS.some(v=>v.id===e.eventId));
  }
});

test('tu vi và mẻ đan, linh điền cùng dừng đúng thời gian lịch luyện', () => {
  const g=make(.5);
  const end=NOW+700000;
  g.s.craftQueue=[{code:'PILL-001',end,success:.99,quality:0}];
  g.s.garden=[{slot:0,herb:'HERB-001',plantedAt:NOW,end:NOW+1200000,water:1,soil:.6,
    pest:false,steps:0,good:0,dry:0,wilt:false}];
  const start=run(g,'startExploration');
  const original={qi:g.s.qi,exp:g.s.totalRunExp,meditate:g.s.progress.meditate,
    alchemy:g.s.progress.alchemy,tick:g.s.tick};
  const partial=g.advance(NOW+180000);
  assert.equal(partial.seconds,0);
  assert.equal(partial.exploring,true);
  assert.equal(g.s.qi,original.qi);
  assert.equal(g.s.totalRunExp,original.exp);
  assert.equal(g.s.progress.meditate,original.meditate);
  assert.equal(g.s.progress.alchemy,original.alchemy);
  assert.equal(g.s.craftQueue[0].end,end+180000);
  assert.equal(g.s.garden[0].plantedAt,NOW+180000);
  const finished=g.advance(start.end);
  assert.ok(finished.explorationFinished);
  assert.equal(g.s.exploration.active,null);
  assert.equal(g.s.exploration.last.kind,'npc');
  assert.equal(g.s.qi,original.qi);
  assert.equal(g.s.craftQueue[0].end,end+600000);
  assert.equal(g.s.garden[0].plantedAt,NOW+600000);
  assert.equal(g.s.progress.meditate,original.meditate);
  g.advance(start.end+1000);
  assert.ok(g.s.totalRunExp>original.exp);
});

test('không cho tăng tu vi, xếp mẻ, trồng dược thảo hoặc khởi hành lần nữa khi đang lịch luyện', () => {
  const g=make(.5);
  run(g,'startExploration');
  for(const [type,payload] of [['absorb',{index:0}],['upgrade',{index:1,count:1}],
    ['craft',{code:'PILL-001'}],['garden',{slot:0,action:'water'}],
    ['startDungeon',{id:'moc'}],['breakthrough',{}],['manualEncounter',{index:0}]]) {
    assert.throws(() => run(g,type,payload),/Đang lịch luyện/,type);
  }
});

test('tải lại bản lưu vẫn giữ kết quả ngẫu nhiên, thời gian và đồng hồ đã tạm dừng', () => {
  const g=make(.99), e=run(g,'startExploration');
  g.advance(NOW+250000);
  const saved=JSON.parse(JSON.stringify(g.s));
  const normalized=H.normalize(saved,NOW+250000);
  assert.equal(normalized.exploration.active.kind,'encounter');
  assert.equal(normalized.exploration.active.eventId,e.eventId);
  assert.equal(normalized.exploration.active.end,e.end);
  const restored=new H.Game(normalized,()=>.5);
  const done=restored.advance(e.end);
  assert.ok(done.explorationFinished);
  assert.equal(restored.s.exploration.active,null);
  assert.equal(restored.s.encounter.total,g.s.encounter.total+1);
  const again=restored.advance(e.end+1000);
  assert.equal(restored.s.encounter.total,g.s.encounter.total+1);
  assert.equal(again.exploring,undefined);
});

test('bản lưu có tự chiến cũ được chuyển sang chế độ không tự chiến', () => {
  const g=make(.5), saved=JSON.parse(JSON.stringify(g.s));
  saved.auto=true;
  const normalized=H.normalize(saved,NOW);
  assert.equal(normalized.auto,false);
});

test('gặp yêu thú không cho tự giao chiến; kết quả chỉ được quyết định một lần khi hết 10 phút', () => {
  const g=make(.01), journey=run(g,'startExploration');
  assert.equal(journey.kind,'monster');
  const first=g.s.enemyNum;
  assert.throws(() => run(g,'strike'), /Đang lịch luyện/);
  assert.throws(() => run(g,'skill',{index:0}), /Đang lịch luyện/);
  assert.throws(() => run(g,'travel',{zone:0}), /Đang lịch luyện/);
  g.advance(journey.end);
  const result=g.s.exploration.last;
  assert.equal(g.s.exploration.active,null);
  assert.equal(result.kind,'monster');
  assert.ok(result.text.length>0);
  assert.ok(g.s.logs.some(v=>v.startsWith('Lịch luyện kết thúc')));
  const lootCount=g.s.enemyNum-first;
  assert.ok(lootCount===0||lootCount===1);
  g.advance(journey.end+1000);
  assert.equal(g.s.enemyNum-first,lootCount,'không kết toán chiến lợi phẩm lần hai');
});
