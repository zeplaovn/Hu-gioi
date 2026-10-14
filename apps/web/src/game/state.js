import { GAME_VERSION, RACES, ROOTS, STATS } from './catalog.js';
import { maxHp, power } from './rules.js';
const now=()=>Date.now();
export function emptyInventory(){return {seed:2,herb:0,ore:0,paper:0,qiPill:0,healPill:0,breakPill:0,powerTalisman:0,guardTalisman:0,sword:0,robe:0,ring:0};}
export function emptyState(){return {
  version:GAME_VERSION,created:false,profile:null,inventory:emptyInventory(),equipment:{weapon:null,robe:null,ring:null},
  farm:Array.from({length:6},(_,id)=>({id,crop:null,plantedAt:0,readyAt:0})),craft:{mastery:{alchemy:0,talisman:0,forge:0}},
  sect:{name:null,reputation:0,contribution:0,activeMission:null,missionsDone:0},world:{location:'thanh-van-thanh',discovered:['thanh-van-thanh','u-minh-lam']},
  secret:{active:null,cleared:{},runs:0},meta:{reincarnations:0,destiny:0,upgrades:{exp:0,power:0,life:0,luck:0},achievements:[]},
  tracking:{trains:0,explores:0,breaks:0,breakFails:0,kills:0,harvests:0,crafted:0,itemsUsed:0},
  runtime:{lastSeenAt:now(),lastTickAt:now(),createdAt:now()},logs:['Một đạo thần thức vừa thức tỉnh giữa Thiên Vân Đại Lục.']
};}
export function createCharacter({name,race='Nhân',gender='Nam',root='kim',stats={}}={}){
  const s=emptyState(),cfg=RACES[race]||RACES['Nhân'];const normalized=Object.fromEntries(STATS.map(k=>[k,Math.max(1,Math.min(40,Number(stats[k]??5)+Number(cfg.bonus[k]||0)))]));
  s.created=true;s.profile={name:String(name||'Vô Danh').trim().slice(0,24)||'Vô Danh',race:cfg===RACES[race]?race:'Nhân',gender,root:ROOTS.some(x=>x.id===root)?root:'kim',stats:normalized,
    realm:0,layer:1,exp:0,qi:0,hp:100,maxHp:100,spiritStones:15,ageMonths:16*12,lifespanMonths:cfg.life*12,skills:[],breakBonus:0};
  s.profile.maxHp=maxHp(s);s.profile.hp=s.profile.maxHp;s.profile.power=power(s);s.logs=[`${s.profile.name} bước lên tiên lộ.`];return s;
}
function mergeInventory(v){return {...emptyInventory(),...(v||{})};}
export function normalizeSave(raw){
  if(!raw)return emptyState();const c=raw.state||raw;
  if(c.version===GAME_VERSION&&c.profile){const base=emptyState();return {...base,...c,inventory:mergeInventory(c.inventory),equipment:{...base.equipment,...(c.equipment||{})},meta:{...base.meta,...(c.meta||{}),upgrades:{...base.meta.upgrades,...(c.meta?.upgrades||{})}},runtime:{...base.runtime,...(c.runtime||{})}};}
  if(c.version===2&&c.profile){const s=createCharacter({name:c.profile.name,race:c.profile.race,stats:c.profile.stats,root:c.profile.root});Object.assign(s.profile,c.profile,{layer:c.profile.layer||1});s.inventory=mergeInventory(c.inventory);s.farm=Array.isArray(c.farm)?c.farm:s.farm;s.sect={...s.sect,...c.sect};s.world={...s.world,...c.world};s.meta={...s.meta,...c.meta,upgrades:{...s.meta.upgrades,...c.meta?.upgrades}};s.logs=['Đã nâng save v2 lên schema v3.',...(c.logs||[])].slice(0,150);s.profile.maxHp=Math.max(s.profile.hp||1,maxHp(s));s.profile.power=power(s);return s;}
  const p=c.player||c.p||c;if(!p||typeof p!=='object')return emptyState();const s=createCharacter({name:p.name||p.n||'Đạo Hữu',race:p.race||'Nhân',gender:p.gender||'Nam',root:p.root||'kim',stats:p.stats||{}});
  s.profile.realm=Math.max(0,Number(p.realm??p.r??0));s.profile.layer=Math.max(1,Number(p.tang??p.layer??p.lv??1));s.profile.exp=Math.max(0,Number(p.exp??p.xp??0));s.profile.qi=Math.max(0,Number(p.qi??0));s.profile.spiritStones=Math.max(0,Number(p.stone??p.spiritStones??p.money??15));s.profile.ageMonths=Math.max(0,Number(p.months??s.profile.ageMonths));s.profile.lifespanMonths=Math.max(s.profile.ageMonths+12,Number(p.lifespan?Number(p.lifespan)*12:p.lifespanMonths??s.profile.lifespanMonths));s.profile.skills=Array.isArray(p.skills)?p.skills.map(x=>typeof x==='string'?x:null).filter(Boolean):[];
  if(p.inv&&typeof p.inv==='object')for(const [k,v]of Object.entries(p.inv)){if(k in s.inventory)s.inventory[k]=Number(v)||0;}s.profile.maxHp=maxHp(s);s.profile.hp=Math.min(s.profile.maxHp,Math.max(1,Number(p.hp??s.profile.maxHp)));s.profile.power=power(s);s.logs=['Đã nhập save legacy vào runtime React v3; dữ liệu không ánh xạ được đã được bỏ qua.'];return s;
}
