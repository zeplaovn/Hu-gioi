import { META_UPGRADES, rootLabel } from '../catalog.js';
import { emptyState } from '../state.js';
import { log } from '../mutations.js';
import { levelOf } from '../rules.js';
export function awardEndLife(s){const p=s.profile,kind=s.runtime.end;if(!p||!kind||s.runtime.endAwarded)return 0;const level=levelOf(p);let pts=Math.floor(level/6)+p.realm;if(kind==='death')pts=Math.max(1,pts);else if(kind==='abandon')pts=Math.floor(pts/2);else if(kind==='win')pts+=20;s.meta.destiny=(s.meta.destiny||0)+pts;s.meta.earned=(s.meta.earned||0)+pts;s.meta.best=Math.max(s.meta.best||0,level);s.meta.history=[{n:(s.meta.reincarnations||0)+1,race:p.race,gender:p.gender,realm:`${p.realm}:${p.layer}`,age:Math.floor(p.ageMonths/12),root:rootLabel(p.root),end:kind,pts,ts:Date.now()},...(s.meta.history||[])].slice(0,20);s.runtime.endAwarded=true;if(pts>0&&kind!=='abandon')log(s,`Thiên Mệnh +${pts} (hiện có ${s.meta.destiny}).`,'cyan');return pts;}
export function metaReducer(s,a){switch(a.type){
  case'REINCARNATE':{if(!s.profile)return s;if(!s.runtime.end)s.runtime.end='abandon';awardEndLife(s);const meta=structuredClone(s.meta);meta.reincarnations=(meta.reincarnations||0)+1;const next=emptyState();next.meta=meta;next.logs=[`Bắt đầu lần chuyển thế ${meta.reincarnations+1}. Hãy chọn đạo thân mới.`];return next;}
  case'META_UPGRADE':{const key=a.key,cfg=META_UPGRADES[key];if(!cfg)return s;const lv=s.meta.upgrades[key]||0,cost=cfg.cost[lv];if(cost===undefined){log(s,'Nâng cấp này đã đạt tối đa.','dim');return s;}if(s.meta.destiny<cost){log(s,'Không đủ Thiên Mệnh.','red');return s;}s.meta.destiny-=cost;s.meta.upgrades[key]=lv+1;log(s,`Nâng ${cfg.label} lên cấp ${lv+1}.`,'gold');return s;}
}return null;}
