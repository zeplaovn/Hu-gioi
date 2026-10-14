import { PROGRESSION, ROOTS, SECTS, SKILLS, REALMS, rootById, sectById } from './catalog.js';
export const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export const levelOf=p=>Math.max(1,(p?.realm||0)*9+(p?.layer||1));
export function needExp(p){
  const realm=clamp(p?.realm||0,0,REALMS.length-1), layer=clamp(p?.layer||1,1,9), level=levelOf(p);
  const months=PROGRESSION.months[realm]*Math.pow(PROGRESSION.layerGrowth,layer-1)*(layer===9?PROGRESSION.big:1);
  const ref=4+15*1.75+level*1.5;
  return Math.max(30,Math.round(months*ref*PROGRESSION.speed));
}
export function cultivationMultiplier(state){
  const p=state.profile;if(!p)return 1;const root=rootById(p.root);const sect=sectById(state.sect.name);
  const skill=(p.skills||[]).reduce((sum,id)=>sum+(SKILLS.find(x=>x.id===id)?.exp||0),0);
  const gear=(state.equipment.ring==='ring'?.04:0);return 1+(root.exp||0)+(sect?.exp||0)+skill+gear+(state.meta.upgrades.exp||0)*.03;
}
export function monthGain(state){const p=state.profile;if(!p)return 0;return Math.max(1,Math.round((4+p.stats['Căn Cốt']*1.5+p.stats['Ngộ Tính']*2+levelOf(p)*1.5)*cultivationMultiplier(state)*PROGRESSION.speed));}
export function maxHp(state){const p=state.profile;if(!p)return 1;const root=rootById(p.root);const skills=(p.skills||[]).reduce((s,id)=>s+(SKILLS.find(x=>x.id===id)?.hp||0),0);const gear=(state.equipment.robe==='robe'?24:0);return Math.round((80+p.stats['Căn Cốt']*8+p.realm*40+skills+gear)*(1+(root.hp||0)+(state.meta.upgrades.life||0)*.02));}
export function power(state){const p=state.profile;if(!p)return 0;const root=rootById(p.root),sect=sectById(state.sect.name);const skills=(p.skills||[]).reduce((s,id)=>s+(SKILLS.find(x=>x.id===id)?.power||0),0);const gear=state.equipment.weapon==='sword'?6:0;return Math.round((levelOf(p)*3+p.stats['Căn Cốt']*2+5+skills+gear+(sect?.power||0))*(1+(root.power||0)+(state.meta.upgrades.power||0)*.03));}
export function breakChance(state){const p=state.profile;if(!p)return 0;const big=p.layer===9;const suppress=Math.min(.15,Math.max(0,p.exp/Math.max(1,needExp(p))-1)*.3);return clamp(.50+p.stats['Ngộ Tính']*.01+p.stats['Vận Khí']*.006-p.realm*.035+(big?-.08:.20)+(p.breakBonus||0)+suppress,.08,.90);}
export function farmReady(plot,now=Date.now()){return !!plot?.crop&&plot.readyAt>0&&now>=plot.readyAt;}
export function sectTier(state){return Math.min(5,1+Math.floor((state.sect.contribution||0)/100));}
