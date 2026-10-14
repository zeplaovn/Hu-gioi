import { createCharacter } from '../state.js';
import { log } from '../mutations.js';
export function metaReducer(s,a){const p=s.profile;switch(a.type){
  case'REINCARNATE':{if(p.realm<4){log(s,'Cần đạt Nguyên Anh trước khi chuyển thế.','red');return s;}const destiny=s.meta.destiny+p.realm*10+p.layer*2+Math.floor(p.exp/1000);const reinc=s.meta.reincarnations+1;const upgrades={...s.meta.upgrades};const achievements=[...s.meta.achievements];const next=createCharacter({name:p.name,race:p.race,gender:p.gender,root:p.root,stats:p.stats});next.meta={reincarnations:reinc,destiny,upgrades,achievements};next.logs=[`Chuyển thế lần ${reinc}. Thiên Mệnh hiện có: ${destiny}.`];return next;}
  case'META_UPGRADE':{const key=a.key;if(!['exp','power','life','luck'].includes(key))return s;const lvl=s.meta.upgrades[key]||0,cost=5+lvl*5;if(s.meta.destiny<cost){log(s,'Không đủ Thiên Mệnh.','red');return s;}s.meta.destiny-=cost;s.meta.upgrades[key]=lvl+1;log(s,`Nâng Thiên Mệnh ${key} lên cấp ${lvl+1}.`,'gold');return s;}
}return null;}
