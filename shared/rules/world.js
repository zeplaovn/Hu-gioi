/* Di chuyển, nhiệm vụ, kỳ ngộ thủ công và đấu giá mô phỏng. */
(function(root){
'use strict';
function install(H){
 const {ITEMS,ZONES,QUESTS,item}=H;
 Object.assign(H.Game.prototype,{
  travel(zone){if(!Number.isInteger(zone)||!ZONES[zone]||zone>this.s.realm)throw Error('Cảnh giới chưa đủ.');const s=this.s;s.zone=zone;s.enemyHp=0;s.combatClock=0;s.auto=false;s.designCombat.enemyEffects=[];if(!s.locations.includes(zone)){s.locations.push(zone);s.progress.travel++}this.log('Đến '+ZONES[zone].name+'.')},
  lots(){return ITEMS.filter(x=>x.kind==='EQ'&&x.tier===this.s.realm).slice(0,3)},
  bid(code,now=this.s.lastUpdate){this.settleAuction(now);if(!this.lots().some(x=>x.code===code))throw Error('Lô này không còn mở.');if(this.s.auction.offers[code])throw Error('Đã đặt lô này.');const cost=this.price(code);this.spend(cost);this.s.auction.offers[code]=cost},
  settleAuction(now){const cycle=Math.floor(now/3600000);if(cycle<=this.s.auction.cycle)return;for(const code of Object.keys(this.s.auction.offers)){if(item(code)){this.add(code);this.log('Đấu giá mô phỏng: nhận '+item(code).name+'.')}}this.s.auction={cycle,offers:{}}},
  claimQuest(id){
   const s=this.s,q=QUESTS.find(q=>q[0]===id);
   if(!q||s.claimed.includes(q[0])||s.progress[q[0]]<q[2])throw Error('Chưa thể nhận thưởng.');
   s.stone+=q[3];this.add(q[4],q[5]);s.claimed.push(q[0]);return q;
  },
  claimFragments(){
   const s=this.s,parts=ITEMS.filter(x=>x.kind==='QITEM');
   if(s.claimed.includes('fragments'))throw Error('Đã nhận thưởng.');
   if(!parts.every(x=>this.count(x.code)>0))throw Error('Chưa đủ sáu mảnh.');
   parts.forEach(x=>this.take(x.code));s.daoVan+=10;s.claimed.push('fragments');return 10;
  },
  manualEncounter(index,now=this.s.lastUpdate){
   const s=this.s;if(now<s.encounter.usedAt+90000)throw Error('Cơ duyên đang hồi phục.');
   const pool=ITEMS.filter(x=>x.kind===(index===0?'HERB':index===1?'MAT':'PILL')&&x.tier===s.realm),x=pool[s.encounter.index%pool.length];
   let part=null;if(x)this.add(x.code);
   if(s.realm===13){const parts=ITEMS.filter(x=>x.kind==='QITEM');part=parts[s.encounter.index%parts.length];this.add(part.code)}
   s.encounter.index++;s.encounter.usedAt=now;return {item:x||null,part};
  },
  setBlessing(enabled){if(!this.s.sect.joined)throw Error('Chưa nhập tông.');this.s.sect.blessing=enabled;return enabled},
  setSectRepeat(enabled){if(!this.s.sect.joined)throw Error('Chưa nhập tông.');this.s.sect.repeat=enabled;return enabled}
 });
}
root.HU_WORLD={install};if(typeof module!=='undefined'&&module.exports)module.exports={install};
})(typeof window!=='undefined'?window:globalThis);
