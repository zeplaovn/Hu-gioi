'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const H = require('../shared/game.js');
const C = require('../shared/protocol/commands.js');
const NOW = 1793100000000;
const profile = { name:'Bạch Thanh Vân', gender:'nu', race:'nhan', age:18, roots:[72,41,38,55,47], rootType:'Song', talent:{ ngoTinh:8 } };
const game = () => new H.Game(H.createCharacter(profile,NOW,()=>.2),()=>.2);
const cmd = (g,type,payload={},now=NOW) => C.execute(g,{type,payload},now);

test('khởi tạo độc lập, cấp đủ đồ và kiểm tra ngân sách thiên phú', () => {
  const a=game(),b=game();a.s.bag['MAT-001']=0;a.s.social.friends.x={};
  assert.equal(b.count('MAT-001'),8);assert.deepEqual(b.s.social.friends,{});
  assert.equal(b.s.hp,b.stats().HP);assert.equal(b.s.mp,b.maxMp());
  assert.equal(Object.values(b.s.talent).reduce((a,b)=>a+b,0),8);
  assert.throws(()=>H.createCharacter({...profile,talent:{ngoTinh:8,vanKhi:8}},NOW),/8 điểm/);
});

test('V4–V7 và hồ sơ V4 lồng nhau chuyển về V7, giữ dữ liệu', () => {
  for(const version of [4,5,6,7]) {
    const raw=game().s;raw.version=version;raw.realm=3;raw.stage=2;raw.stone=12345;
    raw.settings.musicVolume=13;raw.meta.points=7;raw.bag['HERB-001']=17;
    const s=H.normalize(raw,NOW);
    assert.equal(s.version,7);assert.equal(s.name,profile.name);assert.equal(s.stone,12345);
    assert.equal(s.bag['HERB-001'],17);assert.equal(s.settings.musicVolume,13);assert.equal(s.meta.points,7);
    assert.ok(s.dungeon&&s.rootCraft&&s.sect);assert.notEqual(s.bag,raw.bag);
  }
  const old=H.normalize({version:4,player:{realmName:'Kim Đan',realmLevel:5},creation:{daoHieu:'Hàn Vân',race:'tien'},resources:{jade:900}},NOW);
  assert.equal(old.realm,2);assert.equal(old.race,'tien_due');assert.equal(old.stone,900);
});

test('nhiệm vụ và đạo ấn nhận đúng một lần; không mất vật phẩm khi chưa đủ', () => {
  const g=game(),before=g.s.stone;g.s.progress.kill=5;
  cmd(g,'claimQuest',{id:'kill'});assert.equal(g.s.stone,before+160);
  assert.throws(()=>cmd(g,'claimQuest',{id:'kill'}));
  const parts=H.ITEMS.filter(x=>x.kind==='QITEM');g.add(parts[0].code);
  assert.throws(()=>cmd(g,'claimFragments'));assert.equal(g.count(parts[0].code),1);
  parts.slice(1).forEach(x=>g.add(x.code));cmd(g,'claimFragments');
  assert.equal(g.s.daoVan,10);assert.throws(()=>cmd(g,'claimFragments'));
});

test('giao du tính phí, thưởng và hồi chiêu theo ID trong luật game', () => {
  const g=game();g.s.stone=10000;
  cmd(g,'meetFriend',{id:'trieu-nguyet'});cmd(g,'giftFriend',{id:'trieu-nguyet'});
  assert.equal(g.s.stone,9700);assert.equal(g.s.social.friends['trieu-nguyet'].affinity,22);
  const r=cmd(g,'discuss',{id:'ly-van-du'});assert.equal(r.gain,Math.max(1,Math.floor(g.need()*.02)));
  const before=structuredClone(g.s);assert.throws(()=>cmd(g,'discuss',{id:'ly-van-du'}));assert.deepEqual(g.s,before);
  assert.throws(()=>cmd(g,'giftFriend',{id:'unknown'}));
  cmd(g,'duel',{id:'hanh-chu'});assert.throws(()=>cmd(g,'duel',{id:'hanh-chu'}));
});

test('kỳ ngộ thủ công theo đồng hồ phiên và đột phá nhỏ trực tiếp', () => {
  const g=game();cmd(g,'manualEncounter',{index:0});
  assert.throws(()=>cmd(g,'manualEncounter',{index:0}));
  cmd(g,'manualEncounter',{index:1},NOW+90000);assert.equal(g.s.encounter.index,2);
  g.gainExp(1e50);const result=cmd(g,'breakthrough');
  assert.equal(result.success,true);assert.equal(g.s.stage,2);assert.equal(g.s.qi,0);
});

test('bí cảnh offline kết toán một lần, giữ bản chụp lúc khởi hành qua save', () => {
  const g=game();cmd(g,'startDungeon',{id:H.DUNGEONS[0].id});
  const end=g.s.dungeon.active.end;
  const restored=new H.Game(H.normalize(g.s,NOW),()=>.2);
  const first=restored.advance(end,true),after=structuredClone(restored.s);
  assert.deepEqual(first.dungeon,g.advance(end,true).dungeon);
  assert.ok(first.dungeon);assert.equal(restored.advance(end,true).dungeon,undefined);
  assert.deepEqual(restored.s,after);assert.equal(restored.s.dungeon.active,null);
});

test('tông môn tự lặp chỉ nhận thưởng một chuyến lúc offline', () => {
  const g=game();cmd(g,'joinSect',{id:'thanhvan'});
  const def=g.sectMissions()[0];cmd(g,'startSectMission',{id:def.id});cmd(g,'setSectRepeat',{enabled:true});
  const r=g.advance(g.s.sect.mission.end+1000,true);
  assert.ok(r.sect);assert.equal(g.s.sect.mission,null);assert.equal(g.s.sect.missionsDone,1);
});

test('tọa hóa chặn gameplay, chuyển thế giữ Thiên mệnh và không cộng thời gian dư', () => {
  const g=game();g.s.age=g.maxLife()-.01;
  const r=g.advance(NOW+3600000,true);assert.equal(r.died,true);assert.ok(r.seconds<3600);
  assert.equal(g.s.age,g.maxLife());assert.throws(()=>cmd(g,'buy',{code:'HERB-001'},NOW+3600000),/chuyển thế/);
  cmd(g,'reincarnate',{},NOW+3600000);
  assert.equal(g.s.rebirths,1);assert.equal(g.s.meta.history[0].cause,'Tọa hóa');assert.equal(g.s.age,18);
  assert.equal(g.s.lastUpdate,NOW+3600000);assert.equal(g.advance(NOW+3600000,true).exp,0);
  assert.throws(()=>cmd(g,'reincarnate'),/chưa cạn/);
});

test('lệnh không cho caller gửi tiền, sức mạnh, thời gian hoặc force', () => {
  const g=game(),before=structuredClone(g.s);
  for(const command of [
    {type:'add',payload:{code:'HERB-001'}}, {type:'constructor'}, {type:'__proto__'},
    {type:'prestige',payload:{force:true}}, {type:'giftFriend',payload:{id:'trieu-nguyet',cost:0}},
    {type:'duel',payload:{id:'hanh-chu',power:1}}, {type:'strike',payload:{now:NOW+1e9}},
    {type:'upgrade',payload:{index:1,count:-1}}, {type:'upgrade',payload:{index:1,count:1.5}},
    {type:'upgrade',payload:{index:1,count:NaN}}, {type:'setAuto',payload:{enabled:1}},
    {type:'buy',payload:{code:'constructor'}}, {type:'setEnemyKind',payload:{kind:'toString'}},
    JSON.parse('{"type":"strike","payload":{"__proto__":{}}}')
  ]) assert.throws(()=>C.execute(g,command,NOW),{code:'INVALID_COMMAND'});
  assert.deepEqual(g.s,before);
});
