/* State and rules only. No DOM or storage access. All clocks are supplied by callers. */
(function(root){
'use strict';
const node=typeof module!=='undefined'&&module.exports;
const F=node?require('./formulas.js'):root.HU_FORMULAS;
const ITEMS=node?require('./items-data.js'):root.TIEN_VAN_ITEMS;
const ADVENTURES=node?require('./adventures.js'):root.HU_ADVENTURES;
const BY_ID=Object.fromEntries(ITEMS.map(x=>[x.code,x]));
const VERSION=7, MAX=1e100;
const finite=(v,fallback=0,max=MAX)=>Number.isFinite(Number(v))?Math.max(0,Math.min(max,Number(v))):fallback;
const integer=(v,fallback=0,max=1e9)=>Math.floor(finite(v,fallback,max));
const uniq=xs=>[...new Set(xs)];
const pick=(xs,rng)=>xs[Math.min(xs.length-1,Math.floor(rng()*xs.length))];
const item=key=>{if(typeof key!=='string')return null;const [code,q,...rest]=key.split('@'),base=BY_ID[code];if(!base||rest.length||q!==undefined&&!/^[0-3]$/.test(q))return null;return {...base,key,sub:q===undefined?base.sub:Number(q)}};
const keyFor=(code,sub)=>sub===BY_ID[code]?.sub?code:code+'@'+sub;
const pill=(n)=>ITEMS.find(x=>x.kind==='PILL'&&x.sourceNumber===n).code;
const ZONES=[
 ['Thanh Vân Sơn',0,'media/assets/world/bg/idle_ha_gioi.webp'],['Trúc Ảnh Lâm',1,'media/assets/world/bg/background.webp'],['Vạn Kiếm Phong',2,'media/assets/world/bg/idle_ha_gioi.webp'],['Nguyên Anh Cốc',3,'media/assets/world/bg/background.webp'],['Hóa Thần Đài',4,'media/assets/world/bg/idle_ha_gioi.webp'],
 ['Hư Không Cảnh',5,'media/assets/world/bg/idle_linh_gioi.webp'],['Hợp Thể Sơn',6,'media/assets/world/bg/idle_linh_gioi.webp'],['Đại Thừa Thiên',7,'media/assets/world/bg/idle_linh_gioi.webp'],['Cửu Cửu Kiếp Đài',8,'media/assets/world/bg/idle_linh_gioi.webp'],
 ['Chân Tiên Điện',9,'media/assets/world/bg/idle_tien_gioi.webp'],['Kim Tiên Hải',10,'media/assets/world/bg/idle_tien_gioi.webp'],['Thái Ất Cung',11,'media/assets/world/bg/idle_tien_gioi.webp'],['Đại La Thiên',12,'media/assets/world/bg/idle_tien_gioi.webp'],['Hồng Mông Đạo Vực',13,'media/assets/world/bg/idle_tien_gioi.webp']
].map(([name,realm,bg],i)=>({id:i,name,realm,tier:realm<5?0:realm<9?1:2,bg,desc:F.REALMS[realm]+' · '+F.realm_map(realm)}));
const ENEMY_NAMES=['Hắc Phong Yêu Vương','Thượng Giao','Hỏa Nhãn Kim Sư','U Minh Quỷ Vương','Thiên Yêu Hoàng','Hỗn Độn Thú','Cửu U Huyết Ma','Huyết Hải Tu La','Thiên Kiếp Hóa Thân','Cửu U Minh Long','Kim Sí Đại Bàng','Không Gian Thử','Vô Thượng Kiếm Ma','Hỗn Độn Ma Thần'];
const initialBag=()=>({[pill(2)]:4,[pill(1)]:3,[pill(7)]:1,'HERB-001':8,'HERB-002':8,'HERB-003':4,'TAL-001':2,'EQ-001':1,'EQ-005':1,'BT-001':1,'SEED-HERB-001':2,'MAT-002':4});
function rootType(roots){const n=roots.filter(x=>x>=50).length;return ['Thiên','Thiên','Song','Tam hành','Tứ hành','Ngụy'][n]}
function rollRoots(rng=Math.random){const v=rng();let type=v<.005?'Hỗn Độn':v<.02?'Âm Dương':v<.08?'Dị':v<.23?'Thiên':v<.55?'Song':v<.8?'Tam hành':v<.95?'Tứ hành':'Ngụy';const count={Thiên:1,Song:2,'Tam hành':3,'Tứ hành':4,Ngụy:5,Dị:1,'Âm Dương':2,'Hỗn Độn':5}[type],order=[0,1,2,3,4];for(let i=4;i>0;i--){const j=Math.floor(rng()*(i+1));[order[i],order[j]]=[order[j],order[i]]}const roots=order.map(()=>15+Math.floor(rng()*30));order.slice(0,count).forEach(i=>roots[i]=65+Math.floor(rng()*36));return {roots,rootType:type}}
/* Hồ sơ nhân vật theo repo zeplaovn/Hu-gioi: chủng tộc là danh tính của kiếp (chưa đổi công thức), tỉ lệ gieo 34/16/16/16/6/12. */
const RACES=[['nhan','Nhân',34],['ma','Ma',16],['yeu','Yêu',16],['linh','Linh',16],['tien_due','Tiên Duệ',6],['thu','Thú',12]];
const LEGACY_RACES={tien:'tien_due'};
const NAME_MAX=20;
/* Thiên phú khởi nguyên: 8 điểm chia cho năm chỉ số, ảnh hưởng trực tiếp đến khởi đầu. */
const TALENT_INFO=[
 {key:'tuongMao',name:'Tướng Mạo',icon:'ICON-MENU-003-40.png',desc:'Dung mạo xuất chúng, khởi đầu có thêm linh thạch.',effect:v=>`+${v*20} linh thạch khởi đầu`},
 {key:'phucDuyen',name:'Phúc Duyên',icon:'ICON-MENU-006-40.png',desc:'Duyên lành với thiên địa, tăng lợi tức khi lịch luyện.',effect:v=>`+${v*2}% linh thạch, +${v*1.5}% linh thảo`},
 {key:'canCot',name:'Căn Cốt',icon:'ICON-MENU-005-40.png',desc:'Thân thể cường kiện, tăng sinh lực và công kích.',effect:v=>`+${v*2}% sinh lực và công kích`},
 {key:'ngoTinh',name:'Ngộ Tính',icon:'ICON-MENU-001-40.png',desc:'Huệ căn thông tuệ, tăng tốc độ tu luyện.',effect:v=>`+${v*1.5}% tốc tu`},
 {key:'vanKhi',name:'Vận Khí',icon:'ICON-MENU-007-40.png',desc:'Vận may hộ thân, tăng bạo kích và tỉ lệ đột phá.',effect:v=>`+${v*0.5}% bạo kích, +${v*0.3}% đột phá`}
];
const TALENT_MAX=8;
/* Thiên mệnh: tiến trình vĩnh viễn xuyên kiếp, chỉ mất khi xóa toàn bộ bản lưu. */
const META_UPGRADES={
 exp:{name:'Đạo Tâm',icon:'✧',desc:'+3% tốc độ tu luyện vĩnh viễn mỗi cấp.',cost:[2,3,5,7,10],max:5},
 stone:{name:'Túi Càn Khôn',icon:'◈',desc:'+20 linh thạch khởi đầu mỗi cấp.',cost:[1,2,3,4,6],max:5},
 life:{name:'Trường Sinh',icon:'❋',desc:'+5 năm thọ nguyên khởi đầu mỗi cấp.',cost:[2,3,4,6,8],max:5},
 luck:{name:'Thiên Vận',icon:'✦',desc:'+1 Vận Khí khởi đầu mỗi cấp.',cost:[3,5,8],max:3}
};
const META_ACHIEVEMENTS=[
 {id:'first_break',name:'Phá vỡ tầng đầu',desc:'Đột phá thành công lần đầu.',points:1,check:s=>s.stage>1||s.realm>0},
 {id:'kim_dan',name:'Kết Đan',desc:'Bước vào cảnh giới Kết Đan.',points:2,check:s=>s.realm>=2},
 {id:'nguyen_anh',name:'Nguyên Anh',desc:'Bước vào cảnh giới Nguyên Anh.',points:3,check:s=>s.realm>=3},
 {id:'hoa_than',name:'Hóa Thần',desc:'Bước vào cảnh giới Hóa Thần.',points:3,check:s=>s.realm>=4},
 {id:'luyen_hu',name:'Luyện Hư',desc:'Bước vào cảnh giới Luyện Hư.',points:4,check:s=>s.realm>=5},
 {id:'dao_to',name:'Đạo Tổ',desc:'Chứng đạo, hợp nhất cùng Thiên đạo.',points:6,check:s=>s.realm>=13},
 {id:'kills_100',name:'Trừ yêu trăm trận',desc:'Hạ 100 yêu thú.',points:2,check:s=>(s.progress?.kill||0)>=100},
 {id:'kills_1000',name:'Sát khí ngút trời',desc:'Hạ 1.000 yêu thú.',points:4,check:s=>(s.progress?.kill||0)>=1000},
 {id:'meditate_1h',name:'Nhất tâm bất loạn',desc:'Nhập định 1 giờ.',points:2,check:s=>(s.progress?.meditate||0)>=3600},
 {id:'meditate_10h',name:'Tọa vọng thiên thu',desc:'Nhập định 10 giờ.',points:4,check:s=>(s.progress?.meditate||0)>=36000},
 {id:'alchemy_10',name:'Lò lửa tinh thông',desc:'Luyện thành 10 mẻ đan.',points:2,check:s=>(s.progress?.alchemy||0)>=10},
 {id:'breaks_10',name:'Mười lần phá cảnh',desc:'Đột phá thành công 10 lần.',points:2,check:s=>(s.progress?.breaks||0)>=10},
 {id:'rebirth_1',name:'Nhất niệm luân hồi',desc:'Trọng sinh lần đầu.',points:3,check:s=>s.rebirths>=1},
 {id:'rebirth_5',name:'Ngũ kiếp tu hành',desc:'Trọng sinh 5 lần.',points:6,check:s=>s.rebirths>=5},
 {id:'pvp_10',name:'Luận kiếm thập thắng',desc:'Thắng 10 trận PvP.',points:3,check:s=>(s.social?.pvp?.wins||0)>=10},
 {id:'friends_3',name:'Tri kỷ tứ phương',desc:'Kết giao 3 vị đạo hữu.',points:3,check:s=>Object.values(s.social?.friends||{}).filter(f=>f?.metAt>0).length>=3}
];
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
const NAME_FAMILY=['Hàn','Lục','Tô','Mạc','Vũ','Diệp','Bạch','Tạ','Lăng','Âu Dương','Thượng Quan','Tiêu','Lý','Phong','Mộ Dung','Đoàn'];
const NAME_MALE=['Thiên Sơn','Vô Kỵ','Chấn Phong','Hạo Nhiên','Nghịch Thiên','Thanh Vân','Kiếm Tâm','Tử Hiên','Minh Triết','Trường Không','Dạ Lan','Khải Lăng'];
const NAME_FEMALE=['Nhược Vân','Tuyết Nhi','Linh Âm','Thanh Ngọc','Hồng Y','Yên Hà','Mộng Điệp','Tử Yên','Băng Tâm','Thu Thủy','Lam Nguyệt','Dao Quang'];
const raceName=id=>(RACES.find(r=>r[0]===(LEGACY_RACES[id]||id))||RACES[0])[1];
/* Thiên phú chủng tộc: hệ số nhân trực tiếp, thọ nguyên nền theo đúng hồ sơ chủng tộc. */
const RACE_LIFE={nhan:.8,ma:.9,yeu:1.2,linh:1,tien_due:1.5,thu:.7};
const RACE_BONUS={
 nhan:{hp:.05,atk:.05,rate:.05},
 ma:{atk:.2},
 yeu:{hp:.25},
 linh:{rate:.1},
 tien_due:{rate:.15},
 thu:{hp:.1,atk:.1,rate:-.1}
};
const raceLife=(race,realm=0)=>Math.round(F.lifespan(realm)*(RACE_LIFE[race]||1));
const raceBonus=race=>RACE_BONUS[race]||{};
const startStone=(talent,meta)=>380+(talent?.tuongMao||0)*20+(meta?.upgrades?.stone||0)*20;
function rollRace(rng=Math.random){let r=rng()*100,acc=0;for(const [id,,w] of RACES){acc+=w;if(r<acc)return id}return 'nhan'}
const oneOf=(a,rng)=>a[Math.floor(rng()*a.length)];
function randomName(gender='nam',rng=Math.random){return (oneOf(NAME_FAMILY,rng)+' '+oneOf(gender==='nu'?NAME_FEMALE:NAME_MALE,rng)).slice(0,NAME_MAX)}
/* Cùng quy tắc đạo hiệu của repo: gộp khoảng trắng, 2–20 ký tự, không ký tự điều khiển/HTML. Trả null nếu không hợp lệ. */
function cleanName(raw){const c=String(raw??'').normalize('NFC').replace(/\s+/g,' ').trim();return c.length>=2&&c.length<=NAME_MAX&&!/[\u0000-\u001f\u007f<>&"'`[\]]/.test(c)?c:null}
function createBase(now){
 return {version:VERSION,created:false,name:'Hàn Thiên Sơn',gender:'nam',race:'nhan',roots:[72,41,38,55,47],rootType:'Song',talent:{tuongMao:0,phucDuyen:0,canCot:0,ngoTinh:0,vanKhi:0},realm:0,stage:1,qi:0,hp:100,mp:100,stone:380,jade:6,zone:0,auto:false,enemyHp:0,enemyNum:0,combatClock:0,manualAt:0,enemyKind:'thường',bag:initialBag(),equipment:[],tech:[1,1,1,1],cooldowns:[0,0,0,0],learned:{},activeManuals:[],pity:0,breakBonus:0,shield:0,reduction:0,pillUses:0,pillRealmExp:0,permanent:0,buffs:[],debuffs:[],totalRunExp:0,daoVan:0,rebirths:0,rebirthKeep:0,completed:false,offlineCap:0,offlineEff:0,age:18,extraLife:0,alchemySkill:0,craftBoost:0,craftQueue:[],garden:[],offlineKills:0,yaoValue:0,progress:{kill:0,meditate:0,travel:1,breaks:0,alchemy:0},claimed:[],locations:[0],sect:{joined:false,contribution:0,blessing:false,claimedDay:'',mission:null,missionsDone:0},auction:{offers:{},cycle:Math.floor(now/3600000)},encounter:{index:0,usedAt:0},social:{friends:{},pvp:{rating:1000,wins:0,losses:0,streak:0,best:1000,lastAt:0},lastDiscuss:0},meta:metaDefault(),settings:{reducedMotion:false,motionMode:'auto',season:'auto',seasonEffects:true,cultivationEffects:true,combatEffects:true,music:true,musicVolume:40,musicTrack:'auto'},logs:['Một đạo cơ duyên mở ra nơi Thanh Vân Sơn.'],createdAt:now,lastSaved:now,lastUpdate:now,tick:0};
}
function create(now=Date.now()){return {...createBase(now),...ADVENTURES.defaults()}}
function normalize(raw,now=Date.now()){
 if(raw&&typeof raw==='object'&&raw.player&&typeof raw.player==='object'&&(raw.version===undefined||raw.version===4)){
  const p=raw.player,c=raw.creation||{},oldNames=['Luyện Khí','Trúc Cơ','Kim Đan','Nguyên Anh','Hóa Thần','Luyện Hư','Hợp Thể','Đại Thừa','Chân Tiên','Tiên Vương','Tiên Đế'];
  const elements={Kim:'kim',Mộc:'moc',Thủy:'thuy',Hỏa:'hoa',Thổ:'tho'};
  raw={...create(now),version:5,created:true,name:c.daoHieu||'Vô Danh',gender:c.gender,race:c.race,realm:Math.max(0,oldNames.indexOf(p.realmName)),stage:p.realmLevel||1,qi:p.tuvi||0,stone:raw.resources?.jade??p.lingThach??380,jade:raw.resources?.gold??p.tienNgoc??6,roots:Array.isArray(c.elements)?Object.values(elements).map(e=>c.elements.includes(e)?72:30):[72,41,38,55,47],rootType:undefined,lastSaved:now,lastUpdate:now};
 }
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||![4,5,6,7].includes(raw.version)||!raw.created)return null;
 const x=create(now),old=raw.version<6;
 x.created=true;x.name=String(raw.name||x.name).slice(0,24);x.gender=raw.gender==='nu'?'nu':'nam';x.race=RACES.some(r=>r[0]===raw.race)?raw.race:LEGACY_RACES[raw.race]||'nhan';
 x.roots=Array.isArray(raw.roots)&&raw.roots.length===5?raw.roots.map(v=>integer(v,40,100)):x.roots;
 x.rootType=F.LINH_CAN_RATE[raw.rootType]?raw.rootType:rootType(x.roots);
 x.realm=integer(raw.realm,0,13);
 // Old game: 11 realms, nine stages each. Preserve position within each named realm.
 if(old)x.realm=[0,1,2,3,4,5,6,7,9,10,12][Math.min(x.realm,10)];
 x.stage=old?Math.min(F.STAGES[x.realm],1+Math.floor((integer(raw.stage,1,9)-1)*F.STAGES[x.realm]/9)):Math.max(1,integer(raw.stage,1,F.STAGES[x.realm]));
 const floats=['qi','hp','mp','stone','jade','totalRunExp','daoVan','age','extraLife','alchemySkill','combatClock','offlineKills','yaoValue','tick'];
 for(const k of floats)x[k]=finite(raw[k],x[k]);
 if(old){const oldNeed=310*1.43**integer(raw.realm)*1.25**(integer(raw.stage,1)-1);x.qi=Math.min(1,finite(raw.qi)/oldNeed)*F.exp_need(x.realm,x.stage-1);x.totalRunExp=0;for(let r=0;r<x.realm;r++)x.totalRunExp+=F.realm_exp_total(r);for(let s=0;s<x.stage-1;s++)x.totalRunExp+=F.exp_need(x.realm,s);x.totalRunExp+=x.qi;}
 for(const k of ['pity','rebirths','offlineCap','offlineEff','pillUses','enemyNum'])x[k]=integer(raw[k],0,k==='pity'?15:k.startsWith('offline')?8:1e9);
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
 x.learned={};if(raw.learned&&typeof raw.learned==='object')for(const [k,v] of Object.entries(raw.learned))if(item(k)?.kind==='BT')x.learned[k]=finite(v,0,1);
 x.activeManuals=Array.isArray(raw.activeManuals)?uniq(raw.activeManuals.filter(k=>k in x.learned&&item(k).tier<=x.realm+1)).slice(0,3):[];
 x.buffs=Array.isArray(raw.buffs)?raw.buffs.filter(b=>b&&['rate','attack'].includes(b.type)&&Number.isFinite(b.end)&&b.end>0).slice(0,64).map(b=>({type:b.type,points:finite(b.points,0,10),end:finite(b.end,0,now+86400000)})):[];
 x.debuffs=Array.isArray(raw.debuffs)?raw.debuffs.filter(v=>typeof v==='string').slice(0,8):[];
 for(const k of Object.keys(x.progress))x.progress[k]=finite(raw.progress?.[k]);
 x.claimed=Array.isArray(raw.claimed)?uniq(raw.claimed.filter(k=>['kill','meditate','travel','breaks','alchemy','fragments'].includes(k))):[];
 x.locations=Array.isArray(raw.locations)?uniq([0,...raw.locations.filter(n=>Number.isInteger(n)&&n>=0&&n<=x.realm)]):[0];
 // Giao du: chỉ nhận id ngắn, số liệu hữu hạn; không bao giờ chép nguyên object lạ từ bản lưu.
 x.social={friends:{},pvp:{rating:1000,wins:0,losses:0,streak:0,best:1000,lastAt:0},lastDiscuss:0};
 const rawFriends=raw.social?.friends;
 if(rawFriends&&typeof rawFriends==='object'&&!Array.isArray(rawFriends))for(const [id,v] of Object.entries(rawFriends).slice(0,64)){
  if(!/^[a-z0-9_-]{1,24}$/i.test(id)||!v||typeof v!=='object'||Array.isArray(v))continue;
  x.social.friends[id]={affinity:finite(v.affinity,0,100),metAt:finite(v.metAt,0,now),giftAt:finite(v.giftAt,0,now),discussAt:finite(v.discussAt,0,now+7*864e5)};
 }
 const rawPvp=raw.social?.pvp&&typeof raw.social.pvp==='object'?raw.social.pvp:{};
 x.social.pvp={rating:finite(rawPvp.rating,1000,5000),wins:integer(rawPvp.wins,0,1e9),losses:integer(rawPvp.losses,0,1e9),streak:integer(rawPvp.streak,0,1e9),best:finite(rawPvp.best,1000,5000),lastAt:finite(rawPvp.lastAt,0,now)};
 x.social.lastDiscuss=finite(raw.social?.lastDiscuss,0,now);
 x.meta=normalizeMeta(raw.meta,now);
 x.auction.cycle=integer(raw.auction?.cycle,x.auction.cycle,x.auction.cycle);x.auction.offers={};
 if(raw.auction?.offers&&typeof raw.auction.offers==='object')for(const [k,v] of Object.entries(raw.auction.offers)){if(old&&['0','1','2'].includes(k)&&finite(v)>0)x.auction.offers[['EQ-006','EQ-002','EQ-004'][Number(k)]]=finite(v);else if(item(k)&&finite(v)>0)x.auction.offers[k]=finite(v)}
 const motionMode=['auto','full','reduced'].includes(raw.settings?.motionMode)?raw.settings.motionMode:raw.settings?.reducedMotion?'reduced':'auto';x.settings={reducedMotion:motionMode==='reduced',motionMode,season:['auto','spring','summer','autumn','winter'].includes(raw.settings?.season)?raw.settings.season:'auto',seasonEffects:raw.settings?.seasonEffects!==false,cultivationEffects:raw.settings?.cultivationEffects!==false,combatEffects:raw.settings?.combatEffects!==false,music:raw.settings?.music!==false,musicVolume:Number.isFinite(Number(raw.settings?.musicVolume))?Math.max(0,Math.min(100,Math.round(Number(raw.settings.musicVolume)))):40,musicTrack:['hu_gioi','ngoc_hoa_tram','thien_thu'].includes(raw.settings?.musicTrack)?raw.settings.musicTrack:'auto'};x.logs=Array.isArray(raw.logs)?raw.logs.slice(0,38).map(v=>String(v).slice(0,240)):x.logs;
 x.createdAt=finite(raw.createdAt,now,now);x.lastSaved=finite(raw.lastSaved,now);x.lastUpdate=finite(raw.lastUpdate,raw.lastSaved||now);
 if(x.lastUpdate>now){x.lastUpdate=now;x.lastSaved=now;x.logs.unshift('Giờ máy lùi: không cộng tiến trình offline.');}
 x.enemyHp=finite(raw.enemyHp);x.manualAt=finite(raw.manualAt,0,now);
 x.craftQueue=Array.isArray(raw.craftQueue)?raw.craftQueue.filter(j=>j&&item(j.code)?.kind==='PILL'&&Number.isFinite(j.end)&&Number.isFinite(j.success)).slice(0,3).map(j=>({code:j.code,end:finite(j.end,now,now+F.craft_time(13)*1000),success:Math.max(.05,finite(j.success,.9,.95)),quality:integer(j.quality,0,3)})):[];
 x.garden=Array.isArray(raw.garden)?raw.garden.filter(g=>g&&item(g.herb)?.kind==='HERB'&&Number.isFinite(g.end)).slice(0,4).map(g=>({herb:g.herb,end:finite(g.end,now,now+F.craft_time(13)*3000)})):[];
 if(old)x.logs.unshift('Đã chuyển bản lưu V5 sang V6: giữ vật phẩm, đổi cảnh giới và tỷ lệ tu vi.');
 ADVENTURES.normalize(x,raw,now);
 const g=new Game(x);x.qi=Math.min(x.qi,g.need());x.hp=Math.min(x.hp,g.stats().HP);x.mp=Math.min(x.mp,g.maxMp());x.enemyHp=Math.min(x.enemyHp,g.enemy().HP);x.pillRealmExp=Math.min(x.pillRealmExp,F.realm_exp_total(x.realm)*F.P.DAN_REALM_CAP);
 return x;
}
class Game{
 constructor(state=create(),rng=Math.random){this.s=state;this.rng=rng}
 log(message){this.s.logs.unshift(message);this.s.logs.length=Math.min(38,this.s.logs.length)}
 count(key){return this.s.bag[key]||0}
 add(key,count=1){if(!item(key))throw Error('Mã vật phẩm không hợp lệ.');this.s.bag[key]=Math.min(1e9,this.count(key)+Math.max(0,Math.floor(count)))}
 take(key,count=1){if(this.count(key)<count)throw Error('Không đủ '+item(key)?.name);this.s.bag[key]-=count;if(!this.s.bag[key])delete this.s.bag[key]}
 spend(value){if(!Number.isFinite(value)||value<0||this.s.stone<value)throw Error('Không đủ linh thạch.');this.s.stone-=value}
 need(){return F.exp_need(this.s.realm,this.s.stage-1)}
 gainExp(value){const gain=Math.max(0,Math.min(value,this.need()-this.s.qi));this.s.qi+=gain;this.s.totalRunExp+=gain;return gain}
 manualEffects(){const s=this.s,out={rate:0,attack:0,guard:0,alchemy:0};for(const key of s.activeManuals){const x=item(key),e=F.cong_phap_effect(x.effect,x.sub,Math.max(0,s.realm-x.tier),s.learned[key]);out.rate+=e.cong_gop_toc_do||0;out.attack+=e.tang_ATK||0;out.guard+=e.tang_HP_DEF||0;out.alchemy+=e.ky_nang_luyen_dan||0}return out}
  rate(now=this.s.lastUpdate,withBuff=true){const s=this.s,e=this.manualEffects(),add=Math.min(.7,e.rate+(s.sect.blessing?.1:0)),up=Math.min(.4,(s.tech[1]-1)*.02+s.permanent),buff=withBuff?F.dan_buff(s.buffs.filter(b=>b.type==='rate'&&b.end>now).reduce((n,b)=>n+b.points,0)):0,race=raceBonus(s.race).rate||0,talent=(s.talent?.ngoTinh||0)*.015,meta=1+(s.meta?.upgrades?.exp||0)*.03;return F.cultivation_rate(s.realm,add,[up,Math.min(.25,buff),race,talent],s.rootType,F.prestige_mult(s.daoVan))*meta*(1+this.rootEffects().rate+(this.sectDefinition()?.rate||0))}
  stats(now=this.s.lastUpdate){const s=this.s,st=F.stats(s.realm,s.stage-1,s.rootType),e=this.manualEffects(),rb=raceBonus(s.race),tal=s.talent||{},luck=(s.meta?.upgrades?.luck||0)*.005,rt=this.rootEffects(),sect=this.sectDefinition();for(const key of s.equipment){const x=item(key),flat=F.item_flat_bonus(x.tier,x.sub);st.HP+=F.P.HP0*flat;st.ATK+=F.P.ATK0*flat;st.DEF+=F.P.DEF0*flat}st.HP*=(1+(rb.hp||0))*(1+(tal.canCot||0)*.02)*(1+e.guard)*(1+rt.hp);st.DEF*=(1+e.guard+.02*(s.tech[2]-1))*(1+rt.guard);st.ATK*=(1+(rb.atk||0))*(1+(tal.canCot||0)*.02)*(1+e.attack+.02*(s.tech[0]-1)+s.buffs.filter(b=>b.type==='attack'&&b.end>now).reduce((n,b)=>n+b.points,0))*(1+rt.attack+(sect?.attack||0));st.CRIT=Math.min(.75,F.crit_rate(.01*(s.tech[0]-1)+(tal.vanKhi||0)*.005+luck)+rt.crit+(sect?.crit||0));st.DODGE=Math.min(.6,F.dodge_rate(.005*(s.tech[3]-1))+rt.dodge);st.CP=F.combat_power(st.HP,st.ATK,st.DEF,st.CRIT);return st}
 maxMp(){return 100*F.stat_scale(this.s.realm,this.s.stage-1)}
 enemy(){const s=this.s,st=F.stats(s.zone,Math.min(s.stage-1,F.STAGES[s.zone]-1)),m=F.MONSTER_MULT[s.enemyKind];for(const k of ['HP','ATK','DEF'])st[k]*=m;st.CP=F.combat_power(st.HP,st.ATK,st.DEF);st.name=ENEMY_NAMES[s.zone];return st}
 chance(){const s=this.s;/* Vận khí cộng sau ngưỡng 95% để vẫn có tác dụng ở cảnh giới thấp. */return Math.min(.98,F.p_breakthrough(s.realm,s.stage-1,s.breakBonus+(s.sect.blessing?.1:0),s.pity)+(s.talent?.vanKhi||0)*.003+(s.meta?.upgrades?.luck||0)*.003)}
 tribulation(){const s=this.s,st=this.stats(),events=s.stage===F.STAGES[s.realm]?F.tribulation_events(s.realm):[];return events.map(([name,bolts],i)=>{const fn=i===1?F.survive_ascension:F.survive_tribulation;const [success,survived]=fn(s.realm,st.HP,st.HP*s.shield,s.reduction,0,s.rootType);return {name,bolts,success,survived}})}
 breakthrough(){const s=this.s;if(s.completed)throw Error('Đạo Tổ đã chứng đạo. Có thể trọng sinh.');if(s.qi+this.need()*1e-12<this.need())throw Error('Tu vi chưa đầy.');const chance=this.chance(),events=this.tribulation(),success=this.rng()<chance&&events.every(x=>x.success);s.breakBonus=0;s.shield=0;s.reduction=0;
  if(!success){s.qi=F.on_breakthrough_fail(s.qi);s.pity=Math.min(15,s.pity+1);this.log('Đột phá thất bại: mất 15% tu vi, tăng bảo hiểm lần sau.');return {success,chance,events}}
  s.qi=0;s.pity=0;s.pillUses=0;s.progress.breaks++;
  if(s.stage<F.STAGES[s.realm])s.stage++;else if(s.realm<13){s.realm++;s.stage=1;s.pillRealmExp=0;s.permanent=0;s.tech=[1,1,1,1];s.zone=s.realm;if(!s.locations.includes(s.zone)){s.locations.push(s.zone);s.progress.travel++}}else s.completed=true;
  s.hp=this.stats().HP;s.mp=this.maxMp();s.enemyHp=0;s.combatClock=0;this.log('Đột phá thành công: '+this.realmLabel()+'.');return {success,chance,events};
 }
 realmLabel(){const s=this.s,n=F.STAGES[s.realm],label=n===4?['Sơ kỳ','Trung kỳ','Hậu kỳ','Đỉnh phong'][s.stage-1]:s.realm===13?['Nhập Đạo','Hợp Đạo','Vô Thượng'][s.stage-1]:'Tầng '+s.stage;return F.REALMS[s.realm]+' · '+label+(s.completed?' · Chứng đạo':'')}
 price(key){const x=item(key);if(!x)throw Error('Không có vật phẩm này.');if(x.kind==='HERB')return F.herb_price(x.tier,x.sub,x.years);if(x.kind==='SEED')return F.herb_price(x.tier,x.sub)*.5;return F.price_ha(x.tier,x.sub)}
 buy(key){const x=item(key);if(!x||x.tier>this.s.realm+1||x.kind==='QITEM')throw Error('Vật phẩm chưa mở khóa.');this.spend(F.shop_buy_price(this.price(key)));this.add(key)}
 sell(key){if(this.s.equipment.includes(key))throw Error('Hãy tháo pháp bảo trước khi bán.');this.take(key);this.s.stone+=F.shop_sell_price(this.price(key))}
 equip(key){const s=this.s,x=item(key);if(!x||x.kind!=='EQ'||!this.count(key))throw Error('Không có pháp bảo này.');if(s.equipment.includes(key)){s.equipment=s.equipment.filter(k=>k!==key);s.hp=Math.min(s.hp,this.stats().HP);return}if(x.tier>s.realm+1)throw Error('Chỉ dùng pháp bảo cao hơn tối đa một cảnh giới.');if(s.equipment.length>=4)throw Error('Đã đầy bốn ô pháp bảo.');s.equipment.push(key)}
 learn(key){const s=this.s,x=item(key);if(!x||x.kind!=='BT'||!this.count(key))throw Error('Không có bí tịch này.');if(x.tier>s.realm+1)throw Error('Công pháp vượt quá một bậc cảnh giới.');this.take(key);s.learned[key]=Math.min(1,(s.learned[key]||0)+.05);if(!s.activeManuals.includes(key)&&s.activeManuals.length<3)s.activeManuals.push(key)}
 activate(key){const s=this.s;if(!(key in s.learned))throw Error('Chưa lĩnh ngộ công pháp.');if(item(key).tier>s.realm+1)throw Error('Công pháp vượt quá một bậc cảnh giới.');if(s.activeManuals.includes(key))s.activeManuals=s.activeManuals.filter(k=>k!==key);else{if(s.activeManuals.length>=3)throw Error('Chỉ vận hành ba công pháp.');s.activeManuals.push(key)}s.hp=Math.min(s.hp,this.stats().HP)}
 use(key,now=this.s.lastUpdate){const s=this.s,x=item(key);if(!x||!this.count(key))throw Error('Vật phẩm không có trong túi.');if(x.tier>s.realm+1)throw Error('Vật phẩm vượt quá một bậc cảnh giới.');let message='Đã dùng '+x.name;
  if(x.kind==='PILL'){
   const diff=Math.max(0,s.realm-x.tier),e=F.dan_effect(x.effect,s.realm,s.stage-1,x.sub,s.pillUses,diff);
   if(x.effect==='TU_VI'){const n=F.dan_exp_gain_capped(s.realm,s.stage-1,x.sub,s.pillUses,s.pillRealmExp,diff),got=this.gainExp(n);if(got<=0)throw Error('Đã đầy tu vi hoặc đạt trần đan trong cảnh giới.');s.pillRealmExp+=got;s.pillUses++;message='Tu vi +'+F.fmt(got)}
   else if(x.effect==='HOI_PHUC'){s.hp=Math.min(this.stats().HP,s.hp+this.stats().HP*e.hoi_phan_tram_HP);s.mp=Math.min(this.maxMp(),s.mp+this.maxMp()*e.hoi_phan_tram_HP)}
   else if(x.effect==='BUFF_TOC')s.buffs.push({type:'rate',points:e.diem,end:now+e.thoi_luong*1000});
   else if(x.effect==='DOT_PHA')s.breakBonus=Math.min(10,s.breakBonus+e.diem);
   else if(x.effect==='KIEP'){s.shield=Math.max(s.shield,e.khien_theo_HP);s.reduction=Math.max(s.reduction,e.giam_sat_thuong)}
   else if(x.effect==='THO_NGUYEN')s.extraLife+=e.nam;
   else if(x.effect==='CUNG_CO'){if(s.permanent>=e.tran_moi_canh_gioi)throw Error('Đã đạt trần củng cố cảnh giới.');s.permanent=Math.min(e.tran_moi_canh_gioi,s.permanent+e.cong_gop)}
   else if(x.effect==='GIAI_DOC')s.debuffs=[];
   else if(x.effect==='CHIEN_DAU')s.buffs.push({type:'attack',points:e.tang_ATK,end:now+e.thoi_luong*1000});
   else if(x.effect==='TRONG_SINH')s.rebirthKeep=Math.max(s.rebirthKeep,e.giu_tien_do);
  }else if(x.kind==='TAL'){
   if(x.effect==='KIEP'){const e=F.dan_effect('KIEP',s.realm,s.stage-1,x.sub,0,Math.max(0,s.realm-x.tier));s.shield=Math.max(s.shield,e.khien_theo_HP);s.reduction=Math.max(s.reduction,e.giam_sat_thuong)}else this.strike(2*2**x.sub,now,true);
  }else if(x.kind==='GFT'){s.stone+=this.price(key)*.5;}
  else if(x.kind==='CAT'){s.craftBoost=Math.min(2,s.craftBoost+.5)}
  else if(x.kind==='FERT'){const plot=s.garden.find(p=>p.end>now);if(!plot)throw Error('Linh điền chưa có cây đang lớn.');plot.end=now+(plot.end-now)*.7}
  else if(x.kind==='SEED'){if(s.garden.length>=4)throw Error('Bốn ô linh điền đã đầy.');s.garden.push({herb:x.herb,end:now+Math.max(60,F.craft_time(x.tier)*2)*1000});message='Đã gieo '+x.name}
  else throw Error(x.description||'Vật phẩm dùng trong chế tạo.');
  this.take(key);this.log(message);return message;
 }
 upgradeBase(i){return F.upgrade_base_cost(this.s.realm,i===1?.02:.02)}
 upgrade(i,wanted=1){if(!Number.isInteger(i)||i<0||i>3)throw Error('Nâng cấp không hợp lệ.');const owned=this.s.tech[i]-1,base=this.upgradeBase(i),n=Math.min(20-owned,wanted==='max'?F.max_buy(this.s.stone,base,F.P.UP_GROWTH,owned):wanted);if(n<=0)throw Error('Đã đủ cấp hoặc không đủ linh thạch.');this.spend(F.bulk_cost(base,F.P.UP_GROWTH,owned,n));this.s.tech[i]+=n;return n}
 recipe(code){const x=item(code);if(x?.kind!=='PILL')throw Error('Đan phương không hợp lệ.');const pool=ITEMS.filter(y=>y.kind==='HERB'&&y.tier===x.tier);const fallback=ITEMS.filter(y=>y.kind==='HERB'&&y.tier<=x.tier).slice(-2);const herbs=pool.length?pool:fallback,a=herbs[(x.sourceNumber-1)%herbs.length],b=herbs[x.sourceNumber%herbs.length],need={};need[a.code]=2;need[b.code]=(need[b.code]||0)+2;return {code,herbs:need,stone:F.price_ha(x.tier)*.1,time:F.craft_time(x.tier)}}
 craft(code,now=this.s.lastUpdate){const s=this.s,x=item(code),r=this.recipe(code);if(x.tier>s.realm+1)throw Error('Đan phương chưa mở.');if(s.craftQueue.length>=3)throw Error('Hàng đợi đã đủ ba mẻ.');for(const [c,n] of Object.entries(r.herbs))if(this.count(c)<n)throw Error('Thiếu '+item(c).name);this.spend(r.stone);for(const [c,n] of Object.entries(r.herbs))this.take(c,n);const skill=s.alchemySkill+this.manualEffects().alchemy+s.craftBoost;s.craftBoost=0;const start=Math.max(now,s.craftQueue.at(-1)?.end||0);s.craftQueue.push({code,end:start+r.time*1000,success:F.craft_success(x.tier,skill),quality:F.craft_quality(x.tier,skill,this.rng)})}
 finishJobs(now){const s=this.s;let batches=0;while(s.craftQueue[0]?.end<=now){const j=s.craftQueue.shift();if(this.rng()<j.success){const key=keyFor(j.code,j.quality);this.add(key,F.P.BATCH_YIELD);s.progress.alchemy++;s.alchemySkill=Math.min(15,s.alchemySkill+.03);batches++;this.log('Luyện thành 3 '+item(j.code).name+' · '+F.SUBPHAM[j.quality]+' phẩm.')}else this.log('Luyện đan thất bại; nguyên liệu đã tiêu hao.')}for(const p of s.garden.filter(p=>p.end<=now)){this.add(p.herb,3);this.log('Linh điền thu hoạch 3 '+item(p.herb).name+'.')}s.garden=s.garden.filter(p=>p.end>now);return batches}
 forge(code){const x=item(code),s=this.s;if(!x||!['EQ','TAL'].includes(x.kind)||x.tier>s.realm)throw Error('Chỉ rèn vật phẩm cùng hoặc dưới cảnh giới.');const mat=ITEMS.find(y=>y.kind==='MAT'&&y.tier===x.tier),ink='INK-'+(x.tier<5?'HG':x.tier<9?'LG':'TG');if(!mat||this.count(mat.code)<4)throw Error('Cần 4 '+(mat?.name||'linh tài'));if(x.kind==='TAL'&&!this.count(ink))throw Error('Thiếu mực luyện phù.');this.spend(this.price(code)*.1);this.take(mat.code,4);if(x.kind==='TAL')this.take(ink);this.add(code);return 'Đã chế tạo '+x.name}
 collectLoot(count=1,offline=false){const s=this.s,r=s.zone,kind=s.enemyKind,fortune=1+(s.talent?.phucDuyen||0)*.02,herbFortune=1+(s.talent?.phucDuyen||0)*.015;s.enemyNum+=count;s.progress.kill+=count;s.stone+=F.loot_linh_thach(r,kind)*count*fortune;
  const cores=offline?count*F.yeu_dan_drop_chance(r,kind):(this.rng()<F.yeu_dan_drop_chance(r,kind)?1:0);s.yaoValue+=cores*F.yeu_dan_value(r,kind);
  const herbs=ITEMS.filter(x=>x.kind==='HERB'&&x.tier===r);const drops=offline?Math.floor(count*.3*herbFortune):(this.rng()<Math.min(1,.3*herbFortune)?1:0);if(drops&&herbs.length)this.add(pick(herbs,this.rng).code,drops);
  if(!offline)this.log('Hạ '+this.enemy().name+', nhận '+F.format_linh_thach(F.loot_linh_thach(r,kind)*fortune)+'.');
 }
 strike(mult=1,now=this.s.lastUpdate,free=false){const s=this.s,interval=Math.max(.5,F.kill_time(s.zone)/10);if(!free&&now<s.manualAt+interval*1000)throw Error('Chưa đến lượt công kích.');if(!free)s.manualAt=now;const enemy=this.enemy(),st=this.stats(now);if(s.enemyHp<=0)s.enemyHp=enemy.HP;const damage=F.damage(st.ATK,enemy.DEF,mult,0,this.rng()<st.CRIT);s.enemyHp=Math.max(0,s.enemyHp-damage);if(s.enemyHp===0){this.collectLoot();s.enemyHp=this.enemy().HP;return {damage,won:true}}if(this.rng()>=st.DODGE)s.hp-=F.damage(enemy.ATK,st.DEF);if(s.hp<=0){s.hp=st.HP*.28;s.auto=false;s.enemyHp=enemy.HP;this.log('Trọng thương, rút lui điều tức.')}return {damage,won:false}}
 skill(index,now=this.s.lastUpdate){const s=this.s;if(!Number.isInteger(index)||index<0||index>3)throw Error('Kỹ năng không hợp lệ.');if(now<s.cooldowns[index])throw Error('Kỹ năng đang hồi.');const costs=[.12,.15,.18,.26],cd=[5,7,12,15],cost=this.maxMp()*costs[index];if(s.mp<cost)throw Error('Không đủ linh khí.');s.mp-=cost;s.cooldowns[index]=now+Math.max(cd[index],F.kill_time(s.zone)/10)*1000;if(index===2)s.hp=Math.min(this.stats().HP,s.hp+this.stats().HP*.26);else this.strike([2,1.5,1,3.6][index]*(1+.02*(s.tech[index]-1)),now,true)}
 integrateRate(start,end,eff=1){const boundaries=uniq([start,end,...this.s.buffs.filter(b=>b.type==='rate'&&b.end>start&&b.end<end).map(b=>b.end)]).sort((a,b)=>a-b);let gain=0;for(let i=1;i<boundaries.length;i++)gain+=this.rate(boundaries[i-1])*(boundaries[i]-boundaries[i-1])/1000*eff;return gain}
 advance(now,offline=false){const s=this.s,start=s.lastUpdate,elapsed=Math.max(0,(now-start)/1000);if(now<start){s.lastUpdate=now;return {seconds:0,exp:0,stone:0,batches:0}}if(!elapsed)return {seconds:0,exp:0,stone:0,batches:0};
   const seconds=offline?Math.min(elapsed,F.offline_cap(s.offlineCap)):elapsed,eff=offline?F.offline_efficiency(s.offlineEff):1,end=start+seconds*1000,before=s.stone,beforeExp=s.totalRunExp;
  const gained=this.gainExp(this.integrateRate(start,end,eff));s.progress.meditate+=seconds;s.tick+=seconds;s.age+=F.aging_speed(s.realm)*seconds;
  for(const key of s.activeManuals)s.learned[key]=Math.min(1,s.learned[key]+seconds/(F.realm_time(s.realm)*.5));
   if(s.sect.joined)s.stone+=this.sectIncome()*seconds*eff;
  if(s.auto&&offline){const wins=seconds*eff/F.kill_time(s.zone)*F.win_probability(this.stats(start).CP,this.enemy().CP)+s.offlineKills,n=Math.floor(wins);s.offlineKills=wins-n;if(n)this.collectLoot(n,true)}
  if(s.auto&&!offline){s.combatClock+=seconds;const interval=Math.max(.5,F.kill_time(s.zone)/10);let turns=0;while(s.auto&&s.combatClock>=interval&&turns<300){s.combatClock-=interval;this.strike(1,now,true);turns++}}
   const st=this.stats(now);s.hp=Math.min(st.HP,s.hp+st.HP*(.008+this.rootEffects().regen)*seconds);s.mp=Math.min(this.maxMp(),s.mp+this.maxMp()*.018*seconds);
   const dungeon=this.finishDungeon(now),encounters=this.advanceEncounters(seconds,now,eff),sect=this.finishSect(now,offline);
  // Absolute-time jobs finish once. No loop per idle second and no second claim.
  const batches=this.finishJobs(now);s.buffs=s.buffs.filter(b=>b.end>now);s.lastUpdate=now;s.lastSaved=now;this.settleAuction(now);
   return {seconds,exp:s.totalRunExp-beforeExp,stone:s.stone-before,batches,dungeon,encounters,sect,sectReady:!!s.sect.mission&&s.sect.mission.end<=now};
 }
 travel(zone){if(!Number.isInteger(zone)||!ZONES[zone]||zone>this.s.realm)throw Error('Cảnh giới chưa đủ.');const s=this.s;s.zone=zone;s.enemyHp=0;s.combatClock=0;s.auto=false;if(!s.locations.includes(zone)){s.locations.push(zone);s.progress.travel++}this.log('Đến '+ZONES[zone].name+'.')}
 setEnemyKind(kind){if(!F.MONSTER_MULT[kind])throw Error('Loại đối thủ không hợp lệ.');this.s.enemyKind=kind;this.s.enemyHp=0;this.s.combatClock=0}
 upgradeOffline(type){const s=this.s,key=type==='cap'?'offlineCap':'offlineEff';if(s[key]>=8)throw Error('Đã nâng cấp tối đa.');const cost=2+s[key];if(s.daoVan<cost)throw Error('Không đủ Đạo vận.');s.daoVan-=cost;s[key]++}
 metaCost(key){const u=META_UPGRADES[key];if(!u)throw Error('Nâng cấp Thiên mệnh không hợp lệ.');const lvl=this.s.meta.upgrades[key]||0;return lvl>=u.max?null:u.cost[lvl]}
 buyMeta(key){const s=this.s,u=META_UPGRADES[key];if(!u)throw Error('Nâng cấp Thiên mệnh không hợp lệ.');const lvl=s.meta.upgrades[key]||0;if(lvl>=u.max)throw Error('Đã đạt cấp tối đa.');const cost=u.cost[lvl];if(s.meta.points<cost)throw Error('Không đủ điểm Thiên mệnh.');s.meta.points-=cost;s.meta.upgrades[key]=lvl+1;this.log('Thiên mệnh · '+u.name+' cấp '+(lvl+1)+'.');return {key,level:lvl+1,cost}}
 checkMeta(now=this.s.lastUpdate){const s=this.s;if(!s.meta)s.meta=metaDefault();const out=[];for(const a of META_ACHIEVEMENTS){if(!s.meta.achievements[a.id]&&a.check(s)){s.meta.achievements[a.id]=now;s.meta.points+=a.points;s.meta.totalPoints+=a.points;out.push(a)}}return out}
 prestige(force=false){const s=this.s,reward=F.dao_van(s.totalRunExp);if(!force&&reward<10)throw Error('Trọng sinh mở khi nhận ít nhất 10 Đạo vận.');const kept=s.qi*s.rebirthKeep,next=create(s.lastUpdate);for(const k of ['name','gender','race','roots','rootType','settings','learned','offlineCap','offlineEff','createdAt','talent','social'])next[k]=structuredClone(s[k]);const meta=normalizeMeta(structuredClone(s.meta||metaDefault()),s.lastUpdate);const earned=Math.max(1,Math.floor(reward/5))+Math.floor(s.realm/2);meta.points+=earned;meta.totalPoints+=earned;meta.history.unshift({name:s.name,realm:s.realm,stage:s.stage,rebirths:s.rebirths,daoVan:s.daoVan+reward,at:s.lastUpdate,cause:s.completed?'Chứng đạo':'Trọng sinh'});meta.history=meta.history.slice(0,20);next.meta=meta;next.activeManuals=s.activeManuals.filter(k=>item(k).tier<=1);next.created=true;next.daoVan=s.daoVan+reward;next.rebirths=s.rebirths+1;next.qi=Math.min(F.exp_need(0,0),kept);next.totalRunExp=0;next.stone=startStone(next.talent,meta);next.extraLife=(meta.upgrades.life||0)*5;next.logs=['Trọng sinh, nhận '+F.fmt(reward)+' Đạo vận · +'+earned+' Thiên mệnh.'];this.s=next;return reward}
 absorb(coin,count=1){if(!Number.isInteger(coin)||!F.COINS[coin]||!Number.isInteger(count)||count<1)throw Error('Số lượng không hợp lệ.');if(this.s.qi>=this.need())throw Error('Tu vi đã đầy.');this.spend(F.COINS[coin][1]*count);return this.gainExp(F.absorb_exp(this.s.realm,coin,count))}
 sellYao(){if(this.s.yaoValue<=0)throw Error('Chưa có yêu đan.');const amount=F.shop_sell_price(this.s.yaoValue);this.s.stone+=amount;this.s.yaoValue=0;return amount}
 lots(){return ITEMS.filter(x=>x.kind==='EQ'&&x.tier===this.s.realm).slice(0,3)}
 bid(code,now=this.s.lastUpdate){this.settleAuction(now);if(!this.lots().some(x=>x.code===code))throw Error('Lô này không còn mở.');if(this.s.auction.offers[code])throw Error('Đã đặt lô này.');const cost=this.price(code);this.spend(cost);this.s.auction.offers[code]=cost}
 settleAuction(now){const cycle=Math.floor(now/3600000);if(cycle<=this.s.auction.cycle)return;for(const code of Object.keys(this.s.auction.offers)){if(item(code)){this.add(code);this.log('Đấu giá mô phỏng: nhận '+item(code).name+'.')}}this.s.auction={cycle,offers:{}}}
 /* Giao du nhẹ: kết giao, tặng lễ, luận đạo và luận kiếm. Không truy cập DOM. */
 friend(id,now=this.s.lastUpdate){
  if(!/^[a-z0-9_-]{1,24}$/i.test(String(id||'')))throw Error('Đạo hữu không hợp lệ.');
  let f=this.s.social.friends[id];
  if(!f)f=this.s.social.friends[id]={affinity:0,metAt:0,giftAt:0,discussAt:0};
  return f;
 }
 meetFriend(id,now=this.s.lastUpdate){
  const f=this.friend(id,now);
  if(f.metAt)throw Error('Đã kết giao với vị đạo hữu này.');
  f.metAt=now;f.affinity=Math.max(12,f.affinity);
  this.log('Kết giao một vị đạo hữu mới.');
  return f;
 }
 giftFriend(id,cost,amount,now=this.s.lastUpdate){
  const f=this.friend(id,now);
  if(!f.metAt)throw Error('Hãy kết giao trước khi tặng lễ.');
  if(f.affinity>=100)throw Error('Tình nghĩa đã viên mãn, không cần tặng thêm.');
  if(!Number.isFinite(cost)||cost<=0||this.s.stone<cost)throw Error('Không đủ linh thạch.');
  this.s.stone-=cost;f.affinity=Math.min(100,f.affinity+Math.max(1,Math.floor(amount)));f.giftAt=now;
  this.log('Tặng lễ một vị tri kỷ: tình nghĩa +'+Math.max(1,Math.floor(amount))+'.');
  return f.affinity;
 }
 discuss(id,now=this.s.lastUpdate,gain=0,cooldown=120000){
  const f=this.friend(id,now);
  if(now<f.discussAt)throw Error('Vị đạo hữu này đang bế quan, hãy chờ thêm.');
  if(!f.metAt)f.metAt=now;
  const got=this.gainExp(Math.max(0,gain));
  if(got<=0)throw Error('Tu vi đã đầy, không thể luận đạo thêm.');
  f.discussAt=now+Math.max(1000,cooldown);f.affinity=Math.min(100,f.affinity+1);
  this.s.social.lastDiscuss=now;
  this.log('Luận đạo cùng đạo hữu: tu vi +'+F.fmt(got)+'.');
  return {gain:got,affinity:f.affinity,discussAt:f.discussAt};
 }
 duel(power,now=this.s.lastUpdate,cooldown=25000){
  const pvp=this.s.social.pvp;
  if(now<pvp.lastAt+cooldown)throw Error('Đài luận kiếm đang tĩnh lặng, hãy chờ thêm.');
  if(!Number.isFinite(power)||power<=0)throw Error('Đối thủ không hợp lệ.');
  pvp.lastAt=now;
  const my=this.stats(now).CP,win=this.rng()<F.win_probability(my,power,3);
  const delta=win?18+Math.floor(this.rng()*8):-(12+Math.floor(this.rng()*8));
  pvp.rating=Math.max(0,pvp.rating+delta);pvp.best=Math.max(pvp.best,pvp.rating);
  if(win){pvp.wins++;pvp.streak++;}else{pvp.losses++;pvp.streak=0;}
  const reward=win?Math.max(1,Math.round(F.loot_linh_thach(this.s.realm,'tinh anh')*2)):0;
  if(reward)this.s.stone+=reward;
  const exp=win?this.gainExp(Math.max(1,this.need()*.01)):0;
  this.log(win?'Thắng luận kiếm: danh vọng +'+delta+'.':'Thua luận kiếm: danh vọng '+delta+'.');
  return {win,delta,rating:pvp.rating,best:pvp.best,reward,exp,my,power};
 }
}
const API={VERSION,F,ITEMS,BY_ID,ZONES,Game,create,normalize,item,keyFor,pill,rollRoots,rootType,RACES,rollRace,raceName,raceLife,raceBonus,startStone,RACE_LIFE,RACE_BONUS,TALENT_INFO,TALENT_MAX,META_UPGRADES,META_ACHIEVEMENTS,metaDefault,normalizeMeta,randomName,cleanName,NAME_MAX};ADVENTURES.install(API);root.HU_GAME=API;if(node)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
