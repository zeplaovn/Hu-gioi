'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const H=require('../engine/game.js'), C=require('../engine/protocol/commands.js');
const NOW=1800000000000;
const profile={name:'Lý Vô Thường',gender:'nam',age:18,race:'nhan',roots:[72,61,45,44,33],rootType:'Song',talent:{tuongMao:2,phucDuyen:2,canCot:2,ngoTinh:1,vanKhi:1},destiny:'exp'};
const make=()=>new H.Game(H.createCharacter(profile,NOW,()=>0),()=>0);
const command=(g,type,payload={},at=NOW)=>C.execute(g,{type,payload},at);
const setJob=(g,end=NOW+10000)=>{g.s.craftQueue=[{code:'PILL-002',end,success:1,quality:0}];};

test('đang luyện đan chặn khởi hành, bí cảnh, đột phá và các việc khác',()=>{
 const g=make();setJob(g);g.s.qi=g.need();
 for(const [type,payload] of [['startExploration',{}],['startDungeon',{id:H.DUNGEONS[0].id}],['enterDungeon',{id:H.DUNGEONS[0].id}],['breakthrough',{}],['absorb',{index:0}],['garden',{slot:0,action:'water'}],['buy',{code:'HERB-001'}]])
   assert.throws(()=>command(g,type,payload),/Đang luyện đan/,type);
 assert.equal(C.activityConflict(g.s,'craft'),'');
 assert.equal(C.activityConflict(g.s,'setPreference'),'');
});

test('luyện đan không cộng đả tọa, tiếp tục đúng phần thời gian sau khi mẻ kết thúc',()=>{
 const g=make(),before=g.s.qi,med=g.s.progress.meditate;setJob(g);
 g.advance(NOW+5000);assert.equal(g.s.qi,before);assert.equal(g.s.progress.meditate,med);
 g.advance(NOW+15000);assert.ok(g.s.qi>before);assert.equal(g.s.progress.meditate-med,5);assert.equal(g.s.craftQueue.length,0);
 assert.equal(C.activityConflict(g.s,'startExploration'),'');
});

test('không tự lên tiểu cảnh khi tu vi đầy trong lúc đang luyện',()=>{
 const g=make();setJob(g);g.s.qi=g.need();const stage=g.s.stage;
 g.advance(NOW+5000);assert.equal(g.s.stage,stage);
 g.advance(NOW+11000);assert.equal(g.s.stage,stage+1);
});

test('lịch luyện chặn luyện đan, đột phá, hấp thu và dừng đả tọa',()=>{
 const g=make();command(g,'startExploration'); const q=g.s.qi,med=g.s.progress.meditate;
 assert.throws(()=>command(g,'craft',{code:'PILL-002'}),/lịch luyện/);
 assert.throws(()=>command(g,'breakthrough'),/lịch luyện/);
 assert.throws(()=>command(g,'absorb',{index:0}),/lịch luyện/);
 g.advance(NOW+10000);assert.equal(g.s.qi,q);assert.equal(g.s.progress.meditate,med);
});

test('bí cảnh tự động và tự chiến chặn tu hành, không khóa rút lui',()=>{
 for(const type of ['startDungeon','enterDungeon']){
   const g=make();command(g,type,{id:H.DUNGEONS[0].id});const q=g.s.qi,med=g.s.progress.meditate;
   for(const [action,payload] of [['breakthrough',{}],['absorb',{index:0}],['craft',{code:'PILL-002'}],['startExploration',{}]])
     assert.throws(()=>command(g,action,payload),/bí cảnh/,type+' '+action);
   g.advance(NOW+10000);assert.equal(g.s.qi,q);assert.equal(g.s.progress.meditate,med);
   if(type==='startDungeon') command(g,'abortDungeon',{},NOW+10000);
   else command(g,'dungeonAct',{action:'retreat'},NOW+10000);
   g.advance(NOW+15000);assert.ok(g.s.progress.meditate>=med+5);
 }
});

test('bí cảnh tử vong không cộng tu luyện sau thời điểm kết thúc',()=>{
 const g=make();command(g,'startDungeon',{id:H.DUNGEONS[0].id});const end=g.s.dungeon.active.end,med=g.s.progress.meditate;
 g.simulateDungeon=()=>({hp:0,floors:0});const result=g.advance(end+5000);
 assert.equal(g.s.progress.meditate,med);assert.equal(g.s.death.cause,'combat');assert.equal(result.died,true);assert.equal(g.s.lastUpdate,end+5000);
});

test('không bắt đầu luyện đan giữa lúc đang nhận ủy thác',()=>{
 const g=make();g.s.sect.mission={id:'patrol',start:NOW,end:NOW+90000};
 assert.throws(()=>command(g,'craft',{code:'PILL-002'}),/ủy thác tông môn/);
});
