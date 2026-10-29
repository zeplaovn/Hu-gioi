/* Schema V7, khởi tạo và chuyển bản lưu V4–V7. Game được truyền vào để tránh import vòng. */
(function(root){
'use strict';
const node=typeof module!=='undefined'&&module.exports;
const F=node?require('../rules/formulas.js'):root.HU_FORMULAS;
const C=node?require('../data/character.js'):root.HU_CHARACTER;
const D=node?require('../data/catalog.js'):root.HU_CATALOG;
const ADVENTURES=node?require('../rules/adventures.js'):root.HU_ADVENTURES;
const DESIGN=node?require('../data/design.js'):root.HU_DESIGN;
const {RACES,LEGACY_RACES,TALENT_INFO,TALENT_MAX,META_UPGRADES,META_ACHIEVEMENTS,rootType}=C;
const {item,pill}=D;
const VERSION=7,MAX=1e100;
const finite=(v,fallback=0,max=MAX)=>Number.isFinite(Number(v))?Math.max(0,Math.min(max,Number(v))):fallback;
const integer=(v,fallback=0,max=1e9)=>Math.floor(finite(v,fallback,max));
const uniq=xs=>[...new Set(xs)];
const initialBag=()=>({[pill(2)]:4,[pill(1)]:3,[pill(7)]:1,'HERB-001':8,'HERB-002':8,'HERB-003':4,'TAL-001':2,'EQ-001':1,'EQ-005':1,'BT-001':1,'SEED-HERB-001':2,'MAT-002':4});
const designCombatDefault=()=>({shield:0,shieldEnd:0,heal:null,bleed:null,buffs:[],enemyEffects:[],itemCooldowns:{},manualCooldowns:{}});
const metaDefault=()=>({points:0,totalPoints:0,upgrades:{exp:0,stone:0,life:0,luck:0},achievements:{},history:[]});
const normalizeMeta=(raw,now=Date.now())=>{
 const m=metaDefault();
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return m;
 m.points=integer(raw.points,0,1e9);m.totalPoints=Math.max(m.points,integer(raw.totalPoints,0,1e9));
 for(const key of Object.keys(META_UPGRADES))m.upgrades[key]=Math.min(META_UPGRADES[key].max,integer(raw.upgrades?.[key],0,META_UPGRADES[key].max));
 const ids=new Set(META_ACHIEVEMENTS.map(a=>a.id));
 if(raw.achievements&&typeof raw.achievements==='object'&&!Array.isArray(raw.achievements))for(const [id,at] of Object.entries(raw.achievements).slice(0,64)){if(ids.has(id))m.achievements[id]=finite(at,now,now)||now}
 if(Array.isArray(raw.history))m.history=raw.history.filter(h=>h&&typeof h==='object'&&!Array.isArray(h)&&typeof h.name==='string').slice(0,20).map(h=>({name:h.name.slice(0,24),realm:integer(h.realm,0,13),stage:integer(h.stage,1,9),rebirths:integer(h.rebirths,0,1e6),daoVan:finite(h.daoVan),at:finite(h.at,0,now),cause:String(h.cause||'Trọng sinh').slice(0,40)}));
 return m;
};
function createBase(now){
 return {version:VERSION,created:false,name:'Hàn Thiên Sơn',gender:'nam',race:'nhan',roots:[72,41,38,55,47],rootType:'Song',rootSub:'',chaosTries:0,talent:{tuongMao:0,phucDuyen:0,canCot:0,ngoTinh:0,vanKhi:0},realm:0,stage:1,qi:0,hp:100,mp:100,stone:380,jade:6,zone:0,auto:false,enemyHp:0,enemyNum:0,combatClock:0,manualAt:0,enemyKind:'thường',bag:initialBag(),equipment:[],tech:[1,1,1,1],cooldowns:[0,0,0,0],learned:{},activeManuals:[],pity:0,breakBonus:0,shield:0,reduction:0,pillUses:0,pillRealmExp:0,permanent:0,buffs:[],debuffs:[],totalRunExp:0,daoVan:0,rebirths:0,rebirthKeep:0,completed:false,offlineCap:0,offlineEff:0,age:18,extraLife:0,alchemySkill:0,craftBoost:0,craftQueue:[],garden:[],offlineKills:0,yaoValue:0,progress:{kill:0,meditate:0,travel:1,breaks:0,alchemy:0},claimed:[],locations:[0],sect:{joined:false,contribution:0,blessing:false,claimedDay:'',mission:null,missionsDone:0},auction:{offers:{},cycle:Math.floor(now/3600000)},encounter:{index:0,usedAt:0},social:{friends:{},pvp:{rating:1000,wins:0,losses:0,streak:0,best:1000,lastAt:0},lastDiscuss:0},meta:metaDefault(),settings:{reducedMotion:false,motionMode:'auto',season:'auto',seasonEffects:true,cultivationEffects:true,combatEffects:true,music:true,musicVolume:40,musicTrack:'auto'},logs:['Một đạo cơ duyên mở ra nơi Thanh Vân Sơn.'],createdAt:now,lastSaved:now,lastUpdate:now,tick:0};
}
function create(now=Date.now()){return {...createBase(now),gardenSoils:['đất thường','linh điền','hỏa địa','hàn đàm'],npcAffinities:{},designCombat:designCombatDefault(),...ADVENTURES.defaults()}}
function normalize(raw,now,Game){
 if(raw&&typeof raw==='object'&&raw.player&&typeof raw.player==='object'&&(raw.version===undefined||raw.version===4)){
  const p=raw.player,c=raw.creation||{},oldNames=['Luyện Khí','Trúc Cơ','Kim Đan','Nguyên Anh','Hóa Thần','Luyện Hư','Hợp Thể','Đại Thừa','Chân Tiên','Tiên Vương','Tiên Đế'];
  const elements={Kim:'kim',Mộc:'moc',Thủy:'thuy',Hỏa:'hoa',Thổ:'tho'};
  raw={...create(now),version:5,created:true,name:c.daoHieu||'Vô Danh',gender:c.gender,race:c.race,realm:Math.max(0,oldNames.indexOf(p.realmName)),stage:p.realmLevel||1,qi:p.tuvi||0,stone:raw.resources?.jade??p.lingThach??380,jade:raw.resources?.gold??p.tienNgoc??6,roots:Array.isArray(c.elements)?Object.values(elements).map(e=>c.elements.includes(e)?72:30):[72,41,38,55,47],rootType:undefined,lastSaved:now,lastUpdate:now};
 }
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||![4,5,6,7].includes(raw.version)||!raw.created)return null;
 const x=create(now),old=raw.version<6;
 x.created=true;x.name=String(raw.name||x.name).slice(0,24);x.gender=raw.gender==='nu'?'nu':'nam';x.race=RACES.some(r=>r[0]===raw.race)?raw.race:LEGACY_RACES[raw.race]||'nhan';
 x.roots=Array.isArray(raw.roots)&&raw.roots.length===5?raw.roots.map(v=>integer(v,40,100)):x.roots;
 x.rootType=F.LINH_CAN_RATE[raw.rootType]?raw.rootType:rootType(x.roots);x.rootSub=x.rootType==='Dị'?(C.DI_LINH_CAN[raw.rootSub]?raw.rootSub:C.diFromRoots(x.roots)):'';
 x.realm=integer(raw.realm,0,13);
 if(old)x.realm=[0,1,2,3,4,5,6,7,9,10,12][Math.min(x.realm,10)];
 x.stage=old?Math.min(F.STAGES[x.realm],1+Math.floor((integer(raw.stage,1,9)-1)*F.STAGES[x.realm]/9)):Math.max(1,integer(raw.stage,1,F.STAGES[x.realm]));
 const floats=['qi','hp','mp','stone','jade','totalRunExp','daoVan','age','extraLife','alchemySkill','combatClock','offlineKills','yaoValue','tick'];
 for(const k of floats)x[k]=finite(raw[k],x[k]);
 if(old){const oldNeed=310*1.43**integer(raw.realm)*1.25**(integer(raw.stage,1)-1);x.qi=Math.min(1,finite(raw.qi)/oldNeed)*F.exp_need(x.realm,x.stage-1);x.totalRunExp=0;for(let r=0;r<x.realm;r++)x.totalRunExp+=F.realm_exp_total(r);for(let s=0;s<x.stage-1;s++)x.totalRunExp+=F.exp_need(x.realm,s);x.totalRunExp+=x.qi;}
 for(const k of ['pity','rebirths','offlineCap','offlineEff','pillUses','enemyNum','chaosTries'])x[k]=integer(raw[k],0,k==='pity'?15:k.startsWith('offline')?8:1e9);
 x.talent={};let talentTotal=0;
 for(const t of TALENT_INFO){const v=Math.max(0,Math.min(TALENT_MAX-talentTotal,integer(raw.talent?.[t.key],0,TALENT_MAX)));x.talent[t.key]=v;talentTotal+=v}
 for(const [k,max] of Object.entries({breakBonus:10,shield:8,reduction:.4,pillRealmExp:MAX,permanent:.15,rebirthKeep:.8,craftBoost:2}))x[k]=finite(raw[k],0,max);
 if(old&&raw.breakBuff)x.breakBonus=.3;
 x.completed=!!raw.completed;x.auto=!!raw.auto;x.zone=old?Math.min(x.realm,[0,0,1,2,3,5,9][integer(raw.zone,0,6)]):integer(raw.zone,0,x.realm);
 x.enemyKind=['thường','tinh anh','boss','boss kiếp'].includes(raw.enemyKind)?raw.enemyKind:'thường';
 x.bag={};if(raw.bag&&typeof raw.bag==='object'&&!Array.isArray(raw.bag))for(const [key,value] of Object.entries(raw.bag)){if(item(key)){const q=integer(value,0,1e9);if(q)x.bag[key]=q}}
 const validKeys=(a,kind)=>Array.isArray(a)?uniq(a.filter(k=>item(k)?.kind===kind&&x.bag[k]>0&&item(k).tier<=x.realm+1)):[];
 x.equipment=validKeys(raw.equipment,'EQ').slice(0,4);
 x.tech=Array.from({length:4},(_,i)=>Math.max(1,integer(raw.tech?.[i],1,21)));
  x.cooldowns=Array.from({length:4},(_,i)=>finite(raw.cooldowns?.[i],0,now+86400000));
  const dc=raw.designCombat&&typeof raw.designCombat==='object'?raw.designCombat:{};
  x.designCombat.shield=finite(dc.shield);x.designCombat.shieldEnd=finite(dc.shieldEnd,0,now+86400000);
  if(x.designCombat.shieldEnd<=now){x.designCombat.shield=0;x.designCombat.shieldEnd=0}
  if(dc.heal&&Number.isFinite(Number(dc.heal.end))&&dc.heal.end>now)x.designCombat.heal={amount:finite(dc.heal.amount),last:finite(dc.heal.last,now,now),end:finite(dc.heal.end,now,now+86400000)};
  if(dc.bleed&&Number.isFinite(Number(dc.bleed.end))&&dc.bleed.end>now)x.designCombat.bleed={pct:finite(dc.bleed.pct,0,1),last:finite(dc.bleed.last,now,now),end:finite(dc.bleed.end,now,now+86400000)};
  if(Array.isArray(dc.buffs))x.designCombat.buffs=dc.buffs.filter(b=>b&&['def','dodge'].includes(b.type)&&Number.isFinite(Number(b.end))&&b.end>now).slice(0,32).map(b=>({type:b.type,value:finite(b.value,0,b.type==='dodge'?1:MAX),end:finite(b.end,now,now+86400000)}));
  if(Array.isArray(dc.enemyEffects))x.designCombat.enemyEffects=dc.enemyEffects.filter(e=>e&&['freeze','stun','poison','bleed'].includes(e.type)&&(e.source==='root'||item(e.source)?.kind==='EQ')&&Number.isFinite(Number(e.end))&&e.end>now).slice(0,32).map(e=>({type:e.type,source:e.source,end:finite(e.end,now,now+86400000),last:finite(e.last,now,now),stacks:Math.max(1,integer(e.stacks,1,3)),damage:finite(e.damage),pct:finite(e.pct,0,1)}));
  for(const name of ['itemCooldowns','manualCooldowns'])if(dc[name]&&typeof dc[name]==='object'&&!Array.isArray(dc[name]))for(const [key,value] of Object.entries(dc[name]).slice(0,128)){if(item(key))x.designCombat[name][key]=finite(value,0,now+86400000)}
 x.learned={};if(raw.learned&&typeof raw.learned==='object')for(const [k,v] of Object.entries(raw.learned))if(item(k)?.kind==='BT')x.learned[k]=finite(v,0,1);
 x.activeManuals=Array.isArray(raw.activeManuals)?uniq(raw.activeManuals.filter(k=>k in x.learned&&item(k).tier<=x.realm+1)).slice(0,3):[];
 x.buffs=Array.isArray(raw.buffs)?raw.buffs.filter(b=>b&&['rate','attack'].includes(b.type)&&Number.isFinite(b.end)&&b.end>0).slice(0,64).map(b=>({type:b.type,points:finite(b.points,0,10),end:finite(b.end,0,now+86400000)})):[];
 x.debuffs=Array.isArray(raw.debuffs)?raw.debuffs.filter(v=>typeof v==='string').slice(0,8):[];
 for(const k of Object.keys(x.progress))x.progress[k]=finite(raw.progress?.[k]);
 x.claimed=Array.isArray(raw.claimed)?uniq(raw.claimed.filter(k=>['kill','meditate','travel','breaks','alchemy','fragments'].includes(k))):[];
 x.locations=Array.isArray(raw.locations)?uniq([0,...raw.locations.filter(n=>Number.isInteger(n)&&n>=0&&n<=x.realm)]):[0];
 x.social={friends:{},pvp:{rating:1000,wins:0,losses:0,streak:0,best:1000,lastAt:0},lastDiscuss:0};
 const rawFriends=raw.social?.friends;
 if(rawFriends&&typeof rawFriends==='object'&&!Array.isArray(rawFriends))for(const [id,v] of Object.entries(rawFriends).slice(0,64)){
  if(!/^[a-z0-9_-]{1,24}$/i.test(id)||!v||typeof v!=='object'||Array.isArray(v))continue;
  x.social.friends[id]={affinity:finite(v.affinity,0,100),metAt:finite(v.metAt,0,now),giftAt:finite(v.giftAt,0,now),discussAt:finite(v.discussAt,0,now+7*864e5)};
 }
 const rawPvp=raw.social?.pvp&&typeof raw.social.pvp==='object'?raw.social.pvp:{};
 x.social.pvp={rating:finite(rawPvp.rating,1000,5000),wins:integer(rawPvp.wins,0,1e9),losses:integer(rawPvp.losses,0,1e9),streak:integer(rawPvp.streak,0,1e9),best:finite(rawPvp.best,1000,5000),lastAt:finite(rawPvp.lastAt,0,now)};
  x.social.lastDiscuss=finite(raw.social?.lastDiscuss,0,now);
  if(raw.npcAffinities&&typeof raw.npcAffinities==='object'&&!Array.isArray(raw.npcAffinities))for(const [id,value] of Object.entries(raw.npcAffinities)){if(Object.hasOwn(DESIGN.npc,id))x.npcAffinities[id]=finite(value,0,100)}
 x.meta=normalizeMeta(raw.meta,now);
 x.auction.cycle=integer(raw.auction?.cycle,x.auction.cycle,x.auction.cycle);x.auction.offers={};
 if(raw.auction?.offers&&typeof raw.auction.offers==='object')for(const [k,v] of Object.entries(raw.auction.offers)){if(old&&['0','1','2'].includes(k)&&finite(v)>0)x.auction.offers[['EQ-006','EQ-002','EQ-004'][Number(k)]]=finite(v);else if(item(k)&&finite(v)>0)x.auction.offers[k]=finite(v)}
 const motionMode=['auto','full','reduced'].includes(raw.settings?.motionMode)?raw.settings.motionMode:raw.settings?.reducedMotion?'reduced':'auto';x.settings={reducedMotion:motionMode==='reduced',motionMode,season:['auto','spring','summer','autumn','winter'].includes(raw.settings?.season)?raw.settings.season:'auto',seasonEffects:raw.settings?.seasonEffects!==false,cultivationEffects:raw.settings?.cultivationEffects!==false,combatEffects:raw.settings?.combatEffects!==false,music:raw.settings?.music!==false,musicVolume:Number.isFinite(Number(raw.settings?.musicVolume))?Math.max(0,Math.min(100,Math.round(Number(raw.settings.musicVolume)))):40,musicTrack:['hu_gioi','ngoc_hoa_tram','thien_thu'].includes(raw.settings?.musicTrack)?raw.settings.musicTrack:'auto'};x.logs=Array.isArray(raw.logs)?raw.logs.slice(0,38).map(v=>String(v).slice(0,240)):x.logs;
 x.createdAt=finite(raw.createdAt,now,now);x.lastSaved=finite(raw.lastSaved,now);x.lastUpdate=finite(raw.lastUpdate,raw.lastSaved||now);
 if(x.lastUpdate>now){x.lastUpdate=now;x.lastSaved=now;x.logs.unshift('Giờ máy lùi: không cộng tiến trình offline.');}
 x.enemyHp=finite(raw.enemyHp);x.manualAt=finite(raw.manualAt,0,now);
 x.craftQueue=Array.isArray(raw.craftQueue)?raw.craftQueue.filter(j=>j&&item(j.code)?.kind==='PILL'&&Number.isFinite(j.end)&&Number.isFinite(j.success)).slice(0,3).map(j=>({code:j.code,end:finite(j.end,now,now+F.craft_time(13)*1000),success:Math.max(.05,finite(j.success,.9,.95)),quality:integer(j.quality,0,3)})):[];
  const terrains=['đất thường','linh điền','hỏa địa','hàn đàm','linh điền có trận pháp'];
  if(Array.isArray(raw.gardenSoils))x.gardenSoils=x.gardenSoils.map((v,i)=>terrains.includes(raw.gardenSoils[i])?raw.gardenSoils[i]:v);
  const slots=new Set();
  x.garden=Array.isArray(raw.garden)?raw.garden.filter(g=>g&&item(g.herb)?.kind==='HERB'&&Number.isFinite(g.end)).slice(0,4).map(g=>{
   const defined=DESIGN.seedsByHerb[item(g.herb).code],total=Math.max(60,F.craft_time(item(g.herb).tier)*2,(defined?.['thời gian trồng (phút)']||0)*60)*1000,end=finite(g.end,now,now+total);
   const plantedAt=Math.min(end-1,finite(g.plantedAt,Math.max(0,end-total),now));
   const slot=Number.isInteger(g.slot)&&g.slot>=0&&g.slot<4&&!slots.has(g.slot)?g.slot:[0,1,2,3].find(i=>!slots.has(i));slots.add(slot);
   const steps=integer(g.steps,0,6);
   return {slot,herb:g.herb,end,plantedAt,water:finite(g.water,1,1),soil:finite(g.soil,.6,1),pest:!!g.pest,steps,good:finite(g.good,0,steps*1.25),dry:integer(g.dry,0,3),wilt:!!g.wilt};
  }):[];
 if(old)x.logs.unshift('Đã chuyển bản lưu V5 sang V6: giữ vật phẩm, đổi cảnh giới và tỷ lệ tu vi.');
 ADVENTURES.normalize(x,raw,now);
 const g=new Game(x);x.qi=Math.min(x.qi,g.need());x.hp=Math.min(x.hp,g.stats().HP);x.mp=Math.min(x.mp,g.maxMp());x.enemyHp=Math.min(x.enemyHp,g.enemy().HP);x.pillRealmExp=Math.min(x.pillRealmExp,F.realm_exp_total(x.realm)*F.P.DAN_REALM_CAP);
 return x;
}
const API={VERSION,create,normalize,metaDefault,normalizeMeta};
root.HU_PLAYER_STATE=API;if(node)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
