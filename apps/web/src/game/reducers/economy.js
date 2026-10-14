import { ITEMS, SHOP } from '../catalog.js';
import { addItem, log } from '../mutations.js';
import { itemPrice, itemSellValue } from '../rules.js';
import { applyUsableItem } from '../items.js';
function restock(s,now=Date.now()){const shop=s.runtime.shop||{ts:now,n:{}};if(!shop.ts||now-shop.ts>=SHOP.restockSeconds*1000||shop.ts>now)s.runtime.shop={ts:now,n:{}};else s.runtime.shop=shop;return s.runtime.shop;}
export function economyReducer(s,a){const p=s.profile;switch(a.type){
  case'BUY':{const item=ITEMS[a.id],n=Math.max(1,Math.min(99,Math.trunc(Number(a.amount)||1)));if(!item||item.shop===false)return true;if(p.realm<(item.realm||0)){log(s,'Cảnh giới chưa đủ mua vật phẩm này.','red');return true;}const shop=restock(s,Number(a.now||Date.now())),bought=shop.n[a.id]||0;if(item.limit&&bought+n>item.limit){log(s,'Vật phẩm đã hết hàng trong kỳ nhập hiện tại.','red');return true;}const price=itemPrice(s,item),cost=price*n;if(p.spiritStones<cost){log(s,'Không đủ linh thạch.','red');return true;}p.spiritStones-=cost;if(item.limit)shop.n[a.id]=bought+n;if(item.effect){for(let i=0;i<n;i++)applyUsableItem(s,a.id,a,false);log(s,`Mua và dùng ${n} × ${item.name} với ${cost} linh thạch.`,'green');}else{addItem(s,a.id,n);log(s,`Mua ${n} × ${item.name} với ${cost} linh thạch.`,'green');}return true;}
  case'SELL':{const item=ITEMS[a.id],have=s.inventory[a.id]||0,n=Math.max(1,Math.min(have,Math.trunc(Number(a.amount)||1)));if(!item||have<n)return true;addItem(s,a.id,-n);const gain=itemSellValue(item)*n;p.spiritStones+=gain;log(s,`Bán ${n} × ${item.name}, nhận ${gain} linh thạch.`,'green');return true;}
}return false;}
