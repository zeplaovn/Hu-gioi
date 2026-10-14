import { ITEMS } from '../catalog.js';
import { addItem, log } from '../mutations.js';
export function economyReducer(s,a){const p=s.profile;switch(a.type){
  case'BUY':{const item=ITEMS[a.id];const n=Math.max(1,Math.min(99,Number(a.amount)||1));if(!item)return true;const cost=item.price*n;if(p.spiritStones<cost){log(s,'Không đủ linh thạch.','red');return true;}p.spiritStones-=cost;addItem(s,a.id,n);log(s,`Mua ${n} × ${item.name}.`,'green');return true;}
  case'SELL':{const item=ITEMS[a.id];const have=s.inventory[a.id]||0;const n=Math.max(1,Math.min(have,Number(a.amount)||1));if(!item||have<n)return true;addItem(s,a.id,-n);const gain=Math.max(1,Math.floor(item.price*.5))*n;p.spiritStones+=gain;log(s,`Bán ${n} × ${item.name}, nhận ${gain} linh thạch.`,'green');return true;}
}return false;}
