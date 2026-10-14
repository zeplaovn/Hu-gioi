import { addItem, log, rng } from '../mutations.js';
import { farmReady } from '../rules.js';
export function farmReducer(s,a){switch(a.type){
  case'PLANT':{const plot=s.farm.find(x=>x.id===a.id);if(!plot||plot.crop)return true;if((s.inventory.seed||0)<1){log(s,'Cần Hạt Linh Thảo để gieo.','red');return true;}addItem(s,'seed',-1);const now=Number(a.now||Date.now());plot.crop='herb';plot.plantedAt=now;plot.readyAt=now+6*60*1000;log(s,`Gieo hạt tại linh điền ô ${plot.id+1}.`,'green');return true;}
  case'HARVEST':{const plot=s.farm.find(x=>x.id===a.id),now=Number(a.now||Date.now());if(!farmReady(plot,now))return true;const random=rng(a),fortune=s.profile?.stats['Phúc Duyên']||0,score=Math.min(.99,random()+fortune*.004);const quality=score>=.84?4:score>=.68?3:score>=.50?2:score>=.30?1:0,n=2+(quality>=3?1:0)+(quality===4?1:0);addItem(s,'herb',n);plot.crop=null;plot.plantedAt=0;plot.readyAt=0;s.tracking.harvests++;log(s,`Thu hoạch ${n} Linh Thảo${quality>=3?' phẩm chất cao':''}.`,'green');return true;}
}return false;}
