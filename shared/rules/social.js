/* Chỉ nhận ID; phí, phần thưởng, chiến lực và hồi chiêu do luật game tính. */
(function(root){
'use strict';
function install(H){
 const {F,FRIENDS,DAO,RIVALS,PVP_CD,DISCUSS_CD,giftCost,DESIGN,item}=H;
 const find=(list,id)=>{const f=list.find(x=>x.id===id);if(!f)throw Error('Đạo hữu không hợp lệ.');return f};
  Object.assign(H.Game.prototype,{
   npcGift(id,key){
    const npc=DESIGN.npc[id],x=item(key),s=this.s;
    if(!npc||!x||!this.count(key))throw Error('NPC hoặc vật phẩm không hợp lệ.');
    if(s.equipment.includes(key))throw Error('Hãy tháo pháp bảo trước khi tặng.');
    const delta=x.code===npc.likes?5:x.code===npc.dislikes?-5:0;
    this.take(key);const before=s.npcAffinities[id]||0;s.npcAffinities[id]=Math.max(0,Math.min(100,before+delta));
    const change=s.npcAffinities[id]-before;this.log('Tặng '+x.name+' cho '+npc['tên NPC']+' · thiện cảm '+(change>=0?'+':'')+change+'.');
    return {affinity:s.npcAffinities[id],change};
   },
   npcOffer(id){
    const npc=DESIGN.npc[id],role=npc?.['vai trò'],code=npc?.offer,x=item(code);
    if(!npc||!x||!['bán đồ','dạy công pháp','dạy bí tịnh'].includes(role))throw Error('NPC không có vật phẩm để trao đổi.');
    if(x.tier>this.s.realm+1)throw Error('Vật phẩm vượt quá một bậc cảnh giới.');
    if(role!=='bán đồ'&&x.kind!=='BT')throw Error('Bí tịch không hợp lệ.');
    if(this.count(code)>=1e9)throw Error('Túi đã đầy vật phẩm này.');
    this.buy(code);if(role!=='bán đồ')this.learn(code);
    this.log(npc['tên NPC']+(role==='bán đồ'?' bán ':' truyền dạy ')+x.name+'.');return {code,role};
   },
  friend(id){
   find([...FRIENDS,...DAO],id);
   return this.s.social.friends[id]||(this.s.social.friends[id]={affinity:0,metAt:0,giftAt:0,discussAt:0});
  },
  meetFriend(id,now=this.s.lastUpdate){
   find(FRIENDS,id);const f=this.friend(id);
   if(f.metAt)throw Error('Đã kết giao với vị đạo hữu này.');
   f.metAt=now;f.affinity=Math.max(12,f.affinity);
   this.log('Kết giao một vị đạo hữu mới.');return f;
  },
  giftFriend(id,now=this.s.lastUpdate){
   const def=find(FRIENDS,id),f=this.s.social.friends[id],cost=giftCost(def),amount=8+def.realm;
   if(!f?.metAt)throw Error('Hãy kết giao trước khi tặng lễ.');
   if(f.affinity>=100)throw Error('Tình nghĩa đã viên mãn, không cần tặng thêm.');
   this.spend(cost);f.affinity=Math.min(100,f.affinity+amount);f.giftAt=now;
   this.log('Tặng lễ một vị tri kỷ: tình nghĩa +'+amount+'.');return f.affinity;
  },
  discussGain(){return Math.max(1,Math.floor(this.need()*.02))},
  discuss(id,now=this.s.lastUpdate){
   find(DAO,id);
   if(now<(this.s.social.friends[id]?.discussAt||0))throw Error('Vị đạo hữu này đang bế quan, hãy chờ thêm.');
   if(this.s.qi>=this.need())throw Error('Tu vi đã đầy, không thể luận đạo thêm.');
   const f=this.friend(id),got=this.gainExp(this.discussGain());
   if(!f.metAt)f.metAt=now;
   f.discussAt=now+DISCUSS_CD;f.affinity=Math.min(100,f.affinity+1);this.s.social.lastDiscuss=now;
   this.log('Luận đạo cùng đạo hữu: tu vi +'+F.fmt(got)+'.');return {gain:got,affinity:f.affinity,discussAt:f.discussAt};
  },
  rivalPower(id,now=this.s.lastUpdate){return Math.max(1,Math.round(this.stats(now).CP*find(RIVALS,id).power))},
  duel(id,now=this.s.lastUpdate){
   const power=this.rivalPower(id,now),pvp=this.s.social.pvp;
   if(now<pvp.lastAt+PVP_CD)throw Error('Đài luận kiếm đang tĩnh lặng, hãy chờ thêm.');
   pvp.lastAt=now;
   const my=this.stats(now).CP,win=this.rng()<F.win_probability(my,power,3);
   const delta=win?18+Math.floor(this.rng()*8):-(12+Math.floor(this.rng()*8));
   pvp.rating=Math.max(0,pvp.rating+delta);pvp.best=Math.max(pvp.best,pvp.rating);
   if(win){pvp.wins++;pvp.streak++;}else{pvp.losses++;pvp.streak=0;}
   const reward=win?Math.max(1,Math.round(F.loot_linh_thach(this.s.realm,'tinh anh')*2)):0;
   if(reward)this.s.stone+=reward;
   const exp=win?this.gainExp(Math.max(1,this.need()*.01)):0;
   this.log(win?'Thắng luận kiếm: danh vọng +'+delta+'.':'Thua luận kiếm: danh vọng '+delta+'.');
   return {win,delta,rating:pvp.rating,best:pvp.best,reward,exp,my,power};
  }
 });
}
root.HU_SOCIAL={install};if(typeof module!=='undefined'&&module.exports)module.exports={install};
})(typeof window!=='undefined'?window:globalThis);
