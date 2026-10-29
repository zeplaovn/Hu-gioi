import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdtempSync, unlinkSync, rmdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const require=createRequire(import.meta.url);
const H=require('../shared/game.js');
const {MemoryPlayers}=require('../server/repositories/memory-players.js');
const {PlayerService}=require('../server/services/player-service.js');
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const time=100000;
function game(rng=()=>.5){const state=H.create(time);state.created=true;return new H.Game(state,rng)}

test('không gieo hoặc tạo mới Âm Dương, nhưng giữ bản lưu cũ',()=>{
 let n=42;const rng=()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296};
 const seen=new Set();for(let i=0;i<10000;i++)seen.add(H.rollRoots(rng).rootType);
 assert.deepEqual([...seen].sort(),['Dị','Ngụy','Song','Tam hành','Thiên','Tứ hành'].sort());
 const profile={name:'Đạo Hữu',gender:'nam',race:'nhan',age:18,roots:[80,80,20,20,20],rootType:'Âm Dương',talent:{}};
 assert.throws(()=>H.createCharacter(profile,time,()=>.5),/không còn được tạo mới/);
 const old=H.create(time);old.created=true;old.rootType='Âm Dương';
 assert.equal(H.normalize(old,time).rootType,'Âm Dương');
});

test('ánh xạ mã mới giữ mã cũ và các cảnh giới khác',()=>{
 assert.equal(H.DESIGN.legacy('HG001'),'SEED-HERB-001');
 assert.equal(H.DESIGN.legacy('PB001'),'EQ-001');
 assert.equal(H.item('EQ-001').designId,'PB001');
 assert.equal(H.ZONES.length,14);assert.equal(H.item('HERB-080').kind,'HERB');
});

test('công cụ nhập kiểm tra liên kết mà không ghi đè snapshot',()=>{
 const dir=mkdtempSync(join(existsSync('/tmp/opencode')?'/tmp/opencode':tmpdir(),'hu-gioi-import-')),input=join(dir,'data.json');
 const target=join(root,'shared/data/design-raw.js'),before=readFileSync(target,'utf8');
 try{
  writeFileSync(input,JSON.stringify(H.DESIGN.raw));
  const good=spawnSync(process.execPath,['tools/import-game-design.mjs',input,'--check'],{cwd:root,encoding:'utf8'});assert.equal(good.status,0,good.stderr);
  const bad=structuredClone(H.DESIGN.raw);bad['hạt giống'][0]['linh thảo thu được']='LT999';writeFileSync(input,JSON.stringify(bad));
  const invalid=spawnSync(process.execPath,['tools/import-game-design.mjs',input,'--check'],{cwd:root,encoding:'utf8'});assert.notEqual(invalid.status,0);
  assert.equal(readFileSync(target,'utf8'),before);
 }finally{unlinkSync(input);rmdirSync(dir)}
});

test('nạp bản lưu V4–V7 và cây cũ mà không mất mã vật phẩm',()=>{
 for(const version of [5,6,7]){
  const s=H.create(time);s.created=true;s.version=version;s.bag['HERB-001']=17;s.bag['EQ-001']=2;s.equipment=['EQ-001'];
  delete s.designCombat;delete s.gardenSoils;delete s.npcAffinities;
  s.garden=[{herb:'HERB-001',end:time+60000,plantedAt:time,slot:0}];
  const loaded=H.normalize(s,time+1000);assert.ok(loaded);assert.equal(loaded.bag['HERB-001'],17);
  assert.equal(loaded.bag['EQ-001'],2);assert.deepEqual(loaded.equipment,['EQ-001']);
  assert.equal(loaded.garden[0].end,time+60000);assert.equal(loaded.gardenSoils[0],'đất thường');
 }
 const legacy=H.normalize({version:4,player:{realmName:'Luyện Khí',realmLevel:1},creation:{daoHieu:'Cố Nhân',gender:'nam'},resources:{jade:380}},time);
 assert.equal(legacy.name,'Cố Nhân');assert.equal(legacy.created,true);assert.ok(legacy.bag['HERB-001']);
});

test('linh điền dùng thời gian, loại đất và sản lượng thiết kế; nạp lại không cắt thời gian',()=>{
 const g=game();g.use('SEED-HERB-001',time);const p=g.s.garden[0];
 assert.equal(p.slot,0);assert.equal(p.end-time,600000);
 assert.throws(()=>g.gardenAct(0,'terrain',time,'hỏa địa'),/ô trống/);
 const restored=H.normalize(g.s,time+1000);assert.equal(restored.garden[0].end,p.end);
 g.syncGarden(p.end,true);const r=g.gardenAct(0,'harvest',p.end);
 assert.equal(r.count,4);assert.equal(r.key,'HERB-001@2');
 g.add('SEED-HERB-014');g.use('SEED-HERB-014',time);assert.equal(g.s.garden[0].slot,2);
 g.gardenAct(1,'terrain',time,'linh điền có trận pháp');assert.equal(g.s.gardenSoils[1],'linh điền có trận pháp');
});

test('công thức rèn yêu cầu bí tịch và đúng nguyên liệu',()=>{
 const g=game();assert.throws(()=>g.forge('EQ-001'),/lĩnh ngộ/);
 g.add('BT-900');g.learn('BT-900');const before=g.count('HERB-001');
 assert.match(g.forge('EQ-001'),/chế tạo/);assert.equal(g.count('HERB-001'),before-2);
 assert.equal(g.s.activeManuals.includes('BT-900'),false);
});

test('linh thảo có phẩm chất thu hoạch vẫn dùng được để rèn và luyện đan',()=>{
 const g=game();g.take('HERB-001',g.count('HERB-001'));g.add('HERB-001@2',4);
 g.add('BT-900');g.learn('BT-900');g.forge('EQ-001');
 assert.equal(g.count('HERB-001@2'),2);assert.equal(g.ingredientCount('HERB-001'),2);
 g.craft('PILL-002',time);assert.equal(g.count('HERB-001@2'),0);
});

test('linh thảo ăn trực tiếp hồi máu theo dữ liệu',()=>{
 const g=game();g.s.hp=1;const before=g.count('HERB-003');g.use('HERB-003',time);
 assert.equal(g.s.hp,51);assert.equal(g.count('HERB-003'),before-1);
});

test('học từ NPC và vẽ phù theo bí tịch',()=>{
 const g=game(),offer=H.DESIGN.npc.NPC002.offer;
 assert.equal(g.npcOffer('NPC002').code,offer);assert.ok(g.s.learned[offer]);
 g.add('BT-901');g.learn('BT-901');const before=g.count('HERB-001');
 g.forge('TAL-PL-001');assert.equal(g.count('HERB-001'),before-1);assert.equal(g.count('TAL-PL-001'),1);
});

test('bí tịch luyện khí và luyện đan dùng hiệu quả từ dữ liệu',()=>{
 const g=game();g.learn('BT-001');g.s.learned['BT-001']=1;assert.equal(g.manualEffects().rate,.1);
 g.add('BT-004');g.learn('BT-004');g.s.learned['BT-004']=1;
 assert.equal(g.manualEffects().alchemyChance,.05);assert.equal(g.craftChance(0),.95);
});

test('NPC thích/ghét, chặn tặng vật phẩm đang mặc và giữ thiện cảm',()=>{
 const g=game();assert.equal(g.npcGift('NPC001','HERB-001').affinity,5);
 g.equip('EQ-001');assert.throws(()=>g.npcGift('NPC001','EQ-001'),/tháo/);
 g.equip('EQ-001');assert.equal(g.npcGift('NPC001','EQ-001').affinity,0);
 g.npcGift('NPC001','HERB-001');assert.equal(H.normalize(g.s,time).npcAffinities.NPC001,5);
 g.prestige(true);assert.equal(g.s.npcAffinities.NPC001,5);
});

test('công pháp và pháp bảo dùng MP, hồi chiêu và lá chắn',()=>{
 const g=game();g.add('BT-002');g.learn('BT-002');
 const mp=g.s.mp,result=g.castDefinedManual('BT-002',time);
 assert.ok(result.damage>0);assert.equal(g.s.mp,mp-10);
 assert.throws(()=>g.castDefinedManual('BT-002',time),/hồi chiêu/);
 g.equip('EQ-001');g.activateArtifact('EQ-001',time);assert.ok(g.s.designCombat.shield>0);
 assert.throws(()=>g.activateArtifact('EQ-001',time),/hồi chiêu/);
 const loaded=H.normalize(g.s,time+1000);assert.equal(loaded.designCombat.manualCooldowns['BT-002'],time+5000);
 assert.ok(loaded.designCombat.shield>0);
 g.s.mp=g.maxMp();g.equip('EQ-001');assert.equal(g.s.mp,g.maxMp());
});

test('màn lịch luyện dựng được nút công pháp và pháp bảo',()=>{
 const g=game();g.add('BT-002');g.learn('BT-002');g.equip('EQ-001');
 const kit={ $:()=>null,esc:String,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),num:String,money:String,
  moneyHTML:String,pct:String,duration:String,row:(a,b)=>`${a} ${b}`,btn:(label)=>`<button>${label}</button>`,
  card:(title,body)=>`${title} ${body}`,codeAttr:key=>`data-code="${key}"`};
 let screen;const ui={kit,data:{SKILLS:[]},g:()=>g,s:()=>g.s,register:def=>{screen=def},action:()=>{}};
 const window={HU_GAME:H,HU_ASSETS:{},HU_UI:ui};
 runInNewContext(readFileSync(new URL('../client/ui/screens/combat.js',import.meta.url),'utf8'),{window,document:{}});
 const html=screen.panel();assert.match(html,/Phá Thạch Quyền/);assert.match(html,/Kích hoạt Thanh Vân Sơ Huy Kiếm/);
});

test('sát thương độc kết liễu chỉ cấp thưởng một lần',()=>{
 const g=game(()=>0);g.add('EQ-004');g.equip('EQ-004');g.s.enemyHp=1;
 g.applyArtifactHit(time);assert.equal(g.s.designCombat.enemyEffects[0].type,'poison');
 g.tickDefinedCombat(time+1000);assert.equal(g.s.enemyNum,1);assert.equal(g.s.designCombat.enemyEffects.length,0);
 g.tickDefinedCombat(time+2000);assert.equal(g.s.enemyNum,1);
});

test('tỉ lệ rơi thiết kế thay thế rơi thảo ngẫu nhiên cũ',()=>{
 const none=game(()=>.5),before=none.count('HERB-001');none.collectLoot();
 assert.equal(none.count('HERB-001'),before);assert.equal(none.count('SEED-HERB-001'),2);
 const all=game(()=>0);all.collectLoot();assert.equal(all.count('HERB-001'),9);
 assert.equal(all.count('SEED-HERB-001'),3);assert.equal(all.count('EQ-001'),2);assert.equal(all.s.qi,15);
});

test('giai đoạn boss theo ngưỡng và Trúc Cơ có lôi kiếp',()=>{
 assert.equal(H.DESIGN.phase('BS001',1).multiplier,1.3);
 assert.equal(H.DESIGN.phase('BS001',.5).multiplier,1.6);
 assert.equal(H.DESIGN.phase('BS001',.2).multiplier,2);
 assert.equal(H.F.BOLTS[1],3);assert.equal(H.F.tribulation_events(1)[0][1],3);
});

test('dị khắc hệ gốc; ngũ hành có thể hóa Hỗn Độn khi qua lôi kiếp',()=>{
 const g=game(()=>0);g.s.rootType='Dị';g.s.rootSub='phong';g.s.roots=[20,80,20,20,20];
 assert.equal(g.affinity(1),.2);assert.equal(g.affinity(4),0);
 g.s.rootType='Song';g.s.rootSub='';g.s.roots=[80,80,20,20,20];g.s.realm=2;g.s.stage=H.F.STAGES[2];
 g.s.shield=8;g.s.reduction=.4;g.s.qi=g.need();
 const result=g.breakthrough();assert.equal(result.success,true);assert.equal(result.awaken.from,'Song');
 assert.equal(g.s.rootType,'Hỗn Độn');assert.deepEqual(g.s.roots,[80,80,20,20,20]);
 const early=game(()=>0);early.s.rootType='Thiên';early.s.roots=[80,20,20,20,20];early.s.realm=1;early.s.stage=H.F.STAGES[1];
 early.s.shield=8;early.s.reduction=.4;early.s.qi=early.need();assert.equal(early.breakthrough().awaken.from,'Thiên');
});

test('PlayerService không tặng quà hai lần khi retry',async()=>{
 const service=new PlayerService({repository:new MemoryPlayers(),clock:()=>time,rng:()=>.5});
 const principal={playerId:'test-user'};
 const start=await service.createPlayer(principal,{name:'Đạo Hữu',gender:'nam'});
 const req={protocolVersion:1,requestId:'gift-1',expectedRevision:start.revision,type:'npcGift',payload:{id:'NPC001',code:'HERB-001'}};
 const first=await service.execute(principal,req),again=await service.execute(principal,req);
 assert.equal(first.state.npcAffinities.NPC001,5);assert.equal(again.state.npcAffinities.NPC001,5);
 assert.equal(again.state.bag['HERB-001'],first.state.bag['HERB-001']);assert.equal(again.replayed,true);
});
