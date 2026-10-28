'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MemoryPlayers } = require('../server/repositories/memory-players.js');
const { PlayerService } = require('../server/services/player-service.js');
const H = require('../shared/game.js');
const C = require('../shared/protocol/commands.js');
const NOW=1793100000000,alice={playerId:'alice'},bob={playerId:'bob'};
function fixture() {
  let now=NOW;
  const repository=new MemoryPlayers(),service=new PlayerService({repository,clock:()=>now,rng:()=>.2});
  return {repository,service,time:n=>{now=n}};
}
const profile={name:'Bạch Thanh Vân',gender:'nu',talent:{ngoTinh:8}};
const request=(requestId,type,payload={},expectedRevision=0)=>({protocolVersion:C.VERSION,requestId,type,payload,expectedRevision});

test('hai người chơi tiến triển riêng; bản trả về không sửa được repository',async()=>{
  const {service,repository}=fixture();
  const a=await service.createPlayer(alice,profile);await service.createPlayer(bob,{...profile,name:'Hàn Vân'});
  a.state.stone=1e99;a.state.bag['HERB-001']=999;
  const r=await service.execute(alice,request('buy-1','buy',{code:'HERB-001'}));
  const bs=await repository.read('bob');
  assert.equal(r.state.bag['HERB-001'],9);assert.equal(bs.state.bag['HERB-001'],8);
  assert.equal(bs.state.stone,380);assert.ok(r.state.stone<380);
  r.state.social.pvp.rating=9999;bs.state.stone=0;
  assert.equal((await repository.read('alice')).state.social.pvp.rating,1000);
  assert.equal((await repository.read('bob')).state.stone,380);
});

test('lệnh trùng đồng thời chỉ trừ tiền một lần; requestId khác nội dung bị chặn',async()=>{
  const {service,repository}=fixture();await service.createPlayer(alice,profile);
  const command=request('same','buy',{code:'HERB-001'});
  const [a,b]=await Promise.all([service.execute(alice,command),service.execute(alice,command)]);
  assert.equal(a.replayed,false);assert.equal(b.replayed,true);assert.equal(b.revision,1);
  assert.deepEqual(a.state,b.state);assert.equal(a.state.bag['HERB-001'],9);
  await assert.rejects(service.execute(alice,request('same','buy',{code:'HERB-002'})),{code:'REQUEST_ID_REUSED'});
  assert.equal((await repository.read('alice')).revision,1);
});

test('hai lệnh cùng revision không ghi đè nhau; đồng bộ và gửi lại được',async()=>{
  const {service,repository}=fixture();await service.createPlayer(alice,profile);
  const results=await Promise.allSettled([
    service.execute(alice,request('one','buy',{code:'HERB-001'})),
    service.execute(alice,request('two','buy',{code:'HERB-001'}))
  ]);
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
  assert.equal(results.find(x=>x.status==='rejected').reason.code,'REVISION_CONFLICT');
  const s=await service.sync(alice);
  await service.execute(alice,request('three','buy',{code:'HERB-001'},s.revision));
  assert.equal((await repository.read('alice')).state.bag['HERB-001'],10);
});

test('giao dịch thất bại hoàn tác cả phần catch-up; lệnh sau vẫn chạy',async()=>{
  const {service,repository,time}=fixture();await service.createPlayer(alice,profile);
  const before=await repository.read('alice');time(NOW+5000);
  await assert.rejects(service.execute(alice,request('bad','claimQuest',{id:'kill'})),/Chưa thể/);
  assert.deepEqual(await repository.read('alice'),before);
  const r=await service.execute(alice,request('good','setAuto',{enabled:true}));
  assert.equal(r.revision,1);assert.ok(r.state.qi>0);assert.equal(r.state.auto,true);
});

test('server kiểm tra hồ sơ và danh tính; client không gửi state/đồng hồ/ID đích',async()=>{
  const {service,repository}=fixture();
  assert.throws(()=>service.createPlayer(null,profile),{code:'UNAUTHENTICATED'});
  assert.throws(()=>service.createPlayer(alice,{...profile,roots:[100,100,100,100,100]}),{code:'INVALID_PROFILE'});
  assert.throws(()=>service.createPlayer(alice,{...profile,stone:1e99}),{code:'INVALID_PROFILE'});
  await service.createPlayer(alice,profile);
  for(const key of ['playerId','state','now','rng']) assert.throws(()=>service.execute(alice,{...request('x','strike'),[key]:'bob'}),{code:'INVALID_REQUEST'});
  assert.throws(()=>service.execute(alice,{...request('x','strike'),protocolVersion:99}),{code:'INVALID_REQUEST'});
  assert.equal((await repository.read('alice')).revision,0);
  await assert.rejects(service.sync(bob),{code:'PLAYER_NOT_FOUND'});
});

test('khởi tạo đồng thời chỉ tạo một hồ sơ; dữ liệu đang chờ được chụp lại',async()=>{
  const {service,repository}=fixture();
  const input={...profile,talent:{ngoTinh:8}};
  const first=service.createPlayer(alice,input);input.name='Tên bị sửa';input.talent.ngoTinh=999;
  const result=await Promise.allSettled([first,service.createPlayer(alice,profile)]);
  assert.equal(result[0].status,'fulfilled');assert.equal(result[1].reason.code,'PLAYER_EXISTS');
  assert.equal((await repository.read('alice')).state.name,profile.name);
});

test('đồng hồ server tính tiến trình, không nhận thời gian lùi hoặc kết toán lần hai',async()=>{
  const {service,time}=fixture();await service.createPlayer(alice,profile);
  time(NOW+60000);const a=await service.sync(alice);assert.equal(a.report.seconds,60);
  const b=await service.sync(alice);assert.equal(b.report.exp,0);
  time(NOW-60000);const c=await service.sync(alice);assert.equal(c.serverTime,NOW+60000);assert.equal(c.report.exp,0);
  assert.equal(c.state.totalRunExp,a.state.totalRunExp);
});

test('bí cảnh dùng RNG server, không gửi seed ra snapshot, chỉ nhận thưởng một lần',async()=>{
  const {service,repository,time}=fixture();await service.createPlayer(alice,profile);
  const started=await service.execute(alice,request('dungeon','startDungeon',{id:H.DUNGEONS[0].id}));
  assert.equal(started.state.dungeon.active.seed,undefined);
  assert.ok(Number.isInteger((await repository.read('alice')).state.dungeon.active.seed));
  time(started.state.dungeon.active.end);const done=await service.sync(alice),again=await service.sync(alice);
  assert.ok(done.report.dungeon);assert.equal(again.state.dungeon.records[H.DUNGEONS[0].id].runs,1);
  assert.equal(again.report.dungeon,undefined);
});

test('tọa hóa và chuyển thế được kiểm tra ở server',async()=>{
  const {service,repository,time}=fixture();await service.createPlayer(alice,profile);
  await repository.transact('alice',record=>{const g=new H.Game(record.state);record.state.age=g.maxLife()-.001;return {record,value:null}});
  time(NOW+60000);const dead=await service.sync(alice);assert.equal(dead.died,true);
  await assert.rejects(service.execute(alice,request('revive-cheat','use',{code:H.pill(2)},dead.revision)),/chuyển thế/);
  const next=await service.execute(alice,request('next-life','reincarnate',{},dead.revision));
  assert.equal(next.state.age,18);assert.equal(next.state.rebirths,1);assert.equal(next.died,false);
  const retry=await service.execute(alice,request('next-life','reincarnate',{},dead.revision));
  assert.equal(retry.state.rebirths,1);assert.equal(retry.replayed,true);
});
