import { PROGRESSION, SKILLS, REALMS, SHOP, rootInfo, rootBonus, sectById, sectRank } from './catalog.js';
export const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export const levelOf=p=>Math.max(1,(Number(p?.realm)||0)*9+(Number(p?.layer)||1));
const needCache=[0];
function rawNeed(level){const lv=Math.max(1,Math.trunc(level)),realm=Math.min(REALMS.length-1,Math.floor((lv-1)/9)),layer=(lv-1)%9+1;const months=PROGRESSION.months[realm]*Math.pow(PROGRESSION.layerGrowth,layer-1)*(layer===9?PROGRESSION.big:1);const ref=(4+PROGRESSION.refStat*1.75+lv*1.5)*PROGRESSION.refMult[realm];return Math.max(40,months*ref);}
export function needExp(p){const level=levelOf(p);for(let l=needCache.length;l<=level;l++)needCache[l]=Math.max(Math.round(rawNeed(l)),Math.round((needCache[l-1]||0)*1.04));return needCache[level];}
export function cultivationMultiplier(state){const p=state.profile;if(!p)return 1;const info=rootInfo(p.root),sect=sectById(state.sect.name);const skill=(p.skills||[]).reduce((sum,id)=>sum+(SKILLS.find(x=>x.id===id)?.exp||0),0);const gear=state.equipment.ring==='ring'?.04:0,rank=sectRank(state);return 1+info.exp+rootBonus(p,'exp')+(sect?.exp||0)+(state.sect.name?rank.exp:0)+skill+gear+(state.meta.upgrades.exp||0)*.03;}
export function monthGain(state,random){const p=state.profile;if(!p)return 0;const base=(4+p.stats['Căn Cốt']*1.5+p.stats['Ngộ Tính']*2+levelOf(p)*1.5)*cultivationMultiplier(state)*PROGRESSION.speed;const variance=typeof random==='function'?.8+random()*.5:1.05;return Math.max(1,Math.floor(base*variance));}
export function maxHp(state){const p=state.profile;if(!p)return 1;const skills=(p.skills||[]).reduce((s,id)=>s+(SKILLS.find(x=>x.id===id)?.hp||0),0),gear=state.equipment.robe==='robe'?24:0;const base=80+p.stats['Căn Cốt']*8+p.realm*40+skills+gear;return Math.round(base*(1+rootBonus(p,'hp')));}
export function power(state){const p=state.profile;if(!p)return 0;const sect=sectById(state.sect.name),skills=(p.skills||[]).reduce((s,id)=>s+(SKILLS.find(x=>x.id===id)?.power||0),0),gear=state.equipment.weapon==='sword'?6:0;const base=levelOf(p)*3+p.stats['Căn Cốt']*2+5+skills+gear+(sect?.power||0);return Math.round(base*(1+rootBonus(p,'atk')));}
export function defense(state){const p=state.profile;if(!p)return 0;return Math.round((6+levelOf(p)*1.1+p.stats['Căn Cốt']*1.5+p.realm*4)*(1+rootBonus(p,'def')));}
export function critChance(state){const p=state.profile;if(!p)return 0;return Math.min(.6,.05+p.stats['Vận Khí']*.004+rootBonus(p,'crit'));}
export function dodgeChance(state){const p=state.profile;if(!p)return 0;return Math.min(.4,.03+p.stats['Phúc Duyên']*.003+rootBonus(p,'dodge'));}
export function regenRate(state){const p=state.profile;if(!p)return 0;return .04*(1+rootBonus(p,'regen'));}
export function breakChance(state){const p=state.profile;if(!p)return 0;const C=PROGRESSION.chance,big=p.layer===9,need=needExp(p);let c=C.base+p.stats['Ngộ Tính']*C.nt+p.stats['Vận Khí']*C.vk-p.realm*C.realm+(big?C.big:C.minor)+(p.breakBonus||0);c+=Math.min(.15,Math.max(0,p.exp/Math.max(1,need)-1)*.3);return clamp(c,C.min,C.max);}
export function failKeep(state){const p=state.profile,big=p?.layer===9;return Math.min(.95,(big?PROGRESSION.keep.big:PROGRESSION.keep.minor)+rootInfo(p?.root).keep);}
export function farmReady(plot,now=Date.now()){return !!plot?.crop&&plot.readyAt>0&&now>=plot.readyAt;}
export function sectTier(state){return state.sect.name?sectRank(state).tier:1;}
export function itemPrice(state,item){const sect=sectById(state.sect.name),disc=sect?.discount||1;return Math.max(1,Math.trunc(item.price*(1+(state.profile?.realm||0)*SHOP.realmPrice)*disc));}

export function itemSellValue(item){return Math.max(1,Math.trunc(Number(item?.sell??(item?.price||2)*.5)));}
