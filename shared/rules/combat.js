/* Lịch luyện và chiến đấu. RNG và thời gian thuộc phiên game. */
(function(root){
'use strict';
function install(H){
 const {F,ITEMS,ENEMY_NAMES}=H;
 const pick=(xs,rng)=>xs[Math.min(xs.length-1,Math.floor(rng()*xs.length))];
 Object.assign(H.Game.prototype,{
  enemy(){const s=this.s,st=F.stats(s.zone,Math.min(s.stage-1,F.STAGES[s.zone]-1)),m=F.MONSTER_MULT[s.enemyKind];for(const k of ['HP','ATK','DEF'])st[k]*=m;st.CP=F.combat_power(st.HP,st.ATK,st.DEF);st.name=ENEMY_NAMES[s.zone];return st},
  collectLoot(count=1,offline=false){const s=this.s,r=s.zone,kind=s.enemyKind,fortune=1+(s.talent?.phucDuyen||0)*.02,herbFortune=1+(s.talent?.phucDuyen||0)*.015;s.enemyNum+=count;s.progress.kill+=count;s.stone+=F.loot_linh_thach(r,kind)*count*fortune;
   const cores=offline?count*F.yeu_dan_drop_chance(r,kind):(this.rng()<F.yeu_dan_drop_chance(r,kind)?1:0);s.yaoValue+=cores*F.yeu_dan_value(r,kind);
   const herbs=ITEMS.filter(x=>x.kind==='HERB'&&x.tier===r);const drops=offline?Math.floor(count*.3*herbFortune):(this.rng()<Math.min(1,.3*herbFortune)?1:0);if(drops&&herbs.length)this.add(pick(herbs,this.rng).code,drops);
   if(!offline)this.log('Hạ '+this.enemy().name+', nhận '+F.format_linh_thach(F.loot_linh_thach(r,kind)*fortune)+'.');
  },
  strike(mult=1,now=this.s.lastUpdate,free=false){const s=this.s,interval=Math.max(.5,F.kill_time(s.zone)/10);if(!free&&now<s.manualAt+interval*1000)throw Error('Chưa đến lượt công kích.');if(!free)s.manualAt=now;const enemy=this.enemy(),st=this.stats(now);if(s.enemyHp<=0)s.enemyHp=enemy.HP;const damage=F.damage(st.ATK,enemy.DEF,mult,0,this.rng()<st.CRIT);s.enemyHp=Math.max(0,s.enemyHp-damage);if(s.enemyHp===0){this.collectLoot();s.enemyHp=this.enemy().HP;return {damage,won:true}}if(this.rng()>=st.DODGE)s.hp-=F.damage(enemy.ATK,st.DEF);if(s.hp<=0){s.hp=st.HP*.28;s.auto=false;s.enemyHp=enemy.HP;this.log('Trọng thương, rút lui điều tức.')}return {damage,won:false}},
  skill(index,now=this.s.lastUpdate){const s=this.s;if(!Number.isInteger(index)||index<0||index>3)throw Error('Kỹ năng không hợp lệ.');if(now<s.cooldowns[index])throw Error('Kỹ năng đang hồi.');const costs=[.12,.15,.18,.26],cd=[5,7,12,15],cost=this.maxMp()*costs[index];if(s.mp<cost)throw Error('Không đủ linh khí.');s.mp-=cost;s.cooldowns[index]=now+Math.max(cd[index],F.kill_time(s.zone)/10)*1000;if(index===2)s.hp=Math.min(this.stats().HP,s.hp+this.stats().HP*.26);else this.strike([2,1.5,1,3.6][index]*(1+.02*(s.tech[index]-1)),now,true)},
  setEnemyKind(kind){if(!Object.hasOwn(F.MONSTER_MULT,kind))throw Error('Loại đối thủ không hợp lệ.');this.s.enemyKind=kind;this.s.enemyHp=0;this.s.combatClock=0},
  setAuto(enabled){this.s.auto=enabled;return enabled}
 });
}
root.HU_COMBAT={install};if(typeof module!=='undefined'&&module.exports)module.exports={install};
})(typeof window!=='undefined'?window:globalThis);
