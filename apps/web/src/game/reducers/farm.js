import { addItem, log, rng } from '../mutations.js';
import { farmReady } from '../rules.js';
export function farmReducer(s,a){switch(a.type){
  case'PLANT':{const plot=s.farm.find(x=>x.id===a.id);if(!plot||plot.crop)return true;if((s.inventory.seed||0)<1){log(s,'Cần Hạt Linh Thảo để gieo.','red');return true;}addItem(s,'seed',-1);plot.crop='herb';plot.plantedAt=Date.now();plot.readyAt=Date.now()+6*60*1000;log(s,`Gieo hạt tại linh điền ô ${plot.id+1}.`,'green');return true;}
  case'HARVEST':{const plot=s.farm.find(x=>x.id===a.id);if(!farmReady(plot,a.now||Date.now()))return true;const random=rng(a);const n=3+Math.floor(random()*3)+Math.floor((s.profile?.stats['Phúc Duyên']||0)/12);addItem(s,'herb',n);if(random()<.35)addItem(s,'seed',1);plot.crop=null;plot.plantedAt=0;plot.readyAt=0;s.tracking.harvests++;log(s,`Thu hoạch ${n} Linh Thảo.`,'green');return true;}
}return false;}
