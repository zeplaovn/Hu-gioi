/* Lịch luyện và chiến đấu. RNG và thời gian thuộc phiên game. */
(function(root){
'use strict';
function install(H){
 const {F,ITEMS,ENEMY_NAMES,DESIGN}=H;
 const pick=(xs,rng)=>xs[Math.min(xs.length-1,Math.floor(rng()*xs.length))];
 Object.assign(H.Game.prototype,{
  enemy(){
   const s=this.s;let d=null;
   if(s.zone<5&&s.enemyKind==='thường')d=DESIGN.raw['quái vật'].find(x=>x['khu vực']===H.ZONES[s.zone].name);
   else if(s.zone===4&&['boss','boss kiếp'].includes(s.enemyKind))d=DESIGN.raw.boss.find(x=>x['mã boss']==='BS001');
   if(d){const st={HP:d.hp,ATK:d.atk,DEF:d.def,SPD:10,CRIT:d['crit (%)']/100,DODGE:d['eva (%)']/100,CRIT_DMG:d['crit_dame (%)']/100,name:d['tên quái']||d['tên boss'],designId:d['mã quái']||d['mã boss'],level:d['cấp'],elementName:d['hệ'],skill:d['kỹ năng'],element:['kim','mộc','thủy','hỏa','thổ'].indexOf(d['hệ'])};st.CP=F.combat_power(st.HP,st.ATK,st.DEF,st.CRIT,st.CRIT_DMG);return st;}
   const st=F.stats(s.zone,Math.min(s.stage-1,F.STAGES[s.zone]-1)),m=F.MONSTER_MULT[s.enemyKind];for(const k of ['HP','ATK','DEF'])st[k]*=m;st.CP=F.combat_power(st.HP,st.ATK,st.DEF);st.name=ENEMY_NAMES[s.zone];return st
  },
  rewardDefinedEnemy(id,count=1,rng=this.rng){
   const def=DESIGN.raw['quái vật'].find(x=>x['mã quái']===id)||DESIGN.raw.boss.find(x=>x['mã boss']===id);
   if(!def)return {exp:0,items:{}};
   const exp=this.gainExp(def.exp*count),items={};
   for(const drop of DESIGN.raw['vật phẩm rơi'].filter(x=>x['mã đối thủ']===id)){const code=DESIGN.legacy(drop['mã vật phẩm']);if(!code)continue;let n=0;for(let i=0;i<count;i++)if(rng()<drop['tỉ lệ (%)']/100)n+=drop['số lượng tối thiểu']+Math.floor(rng()*(drop['số lượng tối đa']-drop['số lượng tối thiểu']+1));if(n){this.add(code,n);items[code]=(items[code]||0)+n}}
   return {exp,items};
  },
  attackInterval(){return Math.max(.5,F.kill_time(this.s.zone)/10)/(this.s.rootType==='Dị'&&this.s.rootSub==='phong'?1.1:1)},
  collectLoot(count=1,offline=false){const s=this.s,r=s.zone,kind=s.enemyKind,fortune=1+(s.talent?.phucDuyen||0)*.02,herbFortune=1+(s.talent?.phucDuyen||0)*.015;s.enemyNum+=count;s.progress.kill+=count;s.stone+=F.loot_linh_thach(r,kind)*count*fortune;
   const cores=offline?count*F.yeu_dan_drop_chance(r,kind):(this.rng()<F.yeu_dan_drop_chance(r,kind)?1:0);s.yaoValue+=cores*F.yeu_dan_value(r,kind);
    const enemy=this.enemy();
    if(enemy.designId)this.rewardDefinedEnemy(enemy.designId,count);
    else{const herbs=ITEMS.filter(x=>x.kind==='HERB'&&x.tier===r);const drops=offline?Math.floor(count*.3*herbFortune):(this.rng()<Math.min(1,.3*herbFortune)?1:0);if(drops&&herbs.length)this.add(pick(herbs,this.rng).code,drops)}
   if(!offline)this.log('Hạ '+this.enemy().name+', nhận '+F.format_linh_thach(F.loot_linh_thach(r,kind)*fortune)+'.');
  },
  strike(mult=1,now=this.s.lastUpdate,free=false,element=null){
   const s=this.s,interval=this.attackInterval();if(!free&&now<s.manualAt+interval*1000)throw Error('Chưa đến lượt công kích.');if(!free)s.manualAt=now;
   this.tickDefinedCombat(now);const enemy=this.enemy(),st=this.stats(now);if(s.enemyHp<=0)s.enemyHp=enemy.HP;
   const advantage=enemy.element>=0?this.affinity(enemy.element):0;
   let damage=0;if(this.rng()>=(enemy.DODGE||0)){
    let elemental=1+advantage;
    if(element){
     const source=H.ELEMENT_NAMES.findIndex(x=>x.toLowerCase()===element),target=enemy.element;
     if(element==='không hệ')elemental=1;
     else if(s.rootType==='Hỗn Độn'){elemental=target>=0?1.1:1;if(this.activeElements().includes(source))elemental*=1.2;}
     else if(s.rootType==='Dị'&&H.DI_LINH_CAN[s.rootSub]?.name.toLowerCase()===element)elemental=target>=0&&this.activeElements().includes(target)?1.2:1;
     else if(source>=0&&target>=0)elemental=H.BEATS[source]===target?1.2:H.BEATS[target]===source?.8:1;
     else elemental=1;
     if(s.rootType!=='Dị'&&s.rootType!=='Hỗn Độn'&&[0,3].includes(source)&&this.activeElements().includes(source))elemental*=1.1;
    }
    const pen=s.rootType==='Dị'&&s.rootSub==='loi'&&element==='lôi'?.10:0;
    damage=F.damage(st.ATK,enemy.DEF,mult*elemental,pen,this.rng()<st.CRIT,st.CRIT_DMG);s.enemyHp=Math.max(0,s.enemyHp-damage);
   }
   if(s.enemyHp===0){this.collectLoot();s.designCombat.enemyEffects=[];s.enemyHp=this.enemy().HP;return {damage,won:true}}
   if(damage>0)this.applyArtifactHit(now);
   const controlled=s.designCombat.enemyEffects.some(e=>['freeze','stun'].includes(e.type)&&e.end>now);
   if(!controlled&&this.rng()>=st.DODGE){
    const phase=enemy.designId?.startsWith('BS')?DESIGN.phase(enemy.designId,s.enemyHp/enemy.HP)?.multiplier||1:DESIGN.multiplier(enemy.skill);
    const hit=F.damage(enemy.ATK,st.DEF,phase*(advantage<0?1.2:1)*(1-this.rootEffects().reduction),0,this.rng()<(enemy.CRIT||0),enemy.CRIT_DMG||1.5);s.hp-=this.absorbCombatDamage(hit,now);
    const bleed=String(enemy.skill||'').match(/chảy máu\s+(\d+(?:[.,]\d+)?)%\s*hp hiện tại\/giây trong\s+(\d+(?:[.,]\d+)?)\s*giây/i);
    if(bleed)s.designCombat.bleed={pct:Number(bleed[1].replace(',','.'))/100,last:now,end:now+Number(bleed[2].replace(',','.'))*1000};
   }
   if(s.hp<=0){s.hp=st.HP*.28;s.auto=false;s.enemyHp=enemy.HP;s.designCombat.enemyEffects=[];this.log('Trọng thương, rút lui điều tức.')}return {damage,won:false}
  },
  skill(index,now=this.s.lastUpdate){const s=this.s;if(!Number.isInteger(index)||index<0||index>3)throw Error('Kỹ năng không hợp lệ.');if(now<s.cooldowns[index])throw Error('Kỹ năng đang hồi.');const costs=[.12,.15,.18,.26],cd=[5,7,12,15],cost=this.maxMp()*costs[index];if(s.mp<cost)throw Error('Không đủ linh khí.');s.mp-=cost;s.cooldowns[index]=now+Math.max(cd[index],this.attackInterval())*1000;if(index===2)s.hp=Math.min(this.stats().HP,s.hp+this.stats().HP*.26*(1+this.rootEffects().heal));else this.strike([2,1.5,1,3.6][index]*(1+.02*(s.tech[index]-1)),now,true)},
  setEnemyKind(kind){if(!Object.hasOwn(F.MONSTER_MULT,kind))throw Error('Loại đối thủ không hợp lệ.');this.s.enemyKind=kind;this.s.enemyHp=0;this.s.combatClock=0;this.s.designCombat.enemyEffects=[]},
  setAuto(enabled){this.s.auto=enabled;return enabled}
 });
}
root.HU_COMBAT={install};if(typeof module!=='undefined'&&module.exports)module.exports={install};
})(typeof window!=='undefined'?window:globalThis);
