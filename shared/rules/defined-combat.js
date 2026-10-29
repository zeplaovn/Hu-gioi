/* Kỹ năng và pháp bảo theo dữ liệu thiết kế; thời gian/RNG thuộc Game. */
(function(root){
'use strict';
function install(H){
 const {F,item,DESIGN}=H;
 const effects=s=>s.designCombat;
 Object.assign(H.Game.prototype,{
  activateArtifact(key,now=this.s.lastUpdate){
   const s=this.s,x=item(key),d=x&&DESIGN.effects[x.code];
   if(!x||!s.equipment.includes(key)||!d||d['điều kiện kích hoạt']!=='khi kích hoạt')throw Error('Pháp bảo này không có kỹ năng kích hoạt.');
   const c=effects(s);if(now<(c.itemCooldowns[key]||0))throw Error('Pháp bảo đang hồi chiêu.');
   const end=now+d['thời gian (giây)']*1000;
   if(d['hiệu ứng']==='giáp ảo'){c.shield=this.stats(now).HP*d['lá chắn (% hp tối đa)']/100;c.shieldEnd=end;}
   else if(d['hiệu ứng']==='hồi máu'){c.heal={amount:d['hồi máu (hp)']/d['chu kỳ hồi (giây)'],last:now,end};}
   else throw Error('Hiệu ứng kích hoạt chưa hỗ trợ.');
   c.itemCooldowns[key]=now+d['hồi chiêu (giây)']*1000;this.log('Kích hoạt '+x.name+' · '+d['hiệu ứng']+'.');return d['hiệu ứng'];
  },
  castDefinedManual(key,now=this.s.lastUpdate){
   const s=this.s,x=item(key),d=x?.design,c=effects(s);
   if(!x||d?.group!=='công pháp'||!(key in s.learned)||!s.activeManuals.includes(key))throw Error('Hãy lĩnh ngộ và vận hành công pháp.');
   if(now<(c.manualCooldowns[key]||0))throw Error('Công pháp đang hồi chiêu.');
   if(s.mp<d['tiêu hao mp'])throw Error('Không đủ linh khí.');
   s.mp-=d['tiêu hao mp'];c.manualCooldowns[key]=now+d['hồi chiêu (giây)']*1000;
   if(d['công dụng']==='công kích')return this.strike(d.atk_multiplier,now,true,d['hệ']);
   if(d.heal){const amount=d.heal*(1+this.rootEffects().heal);s.hp=Math.min(this.stats(now).HP,s.hp+amount);}
   if(d.def_bonus)c.buffs.push({type:'def',value:d.def_bonus,end:now+d['thời gian buff (giây)']*1000});
   if(d['buff stat']==='eva')c.buffs.push({type:'dodge',value:d['buff giá trị']/100,end:now+d['thời gian buff (giây)']*1000});
   this.log('Vận dụng '+x.name+'.');return {support:true};
  },
  applyArtifactHit(now){
   const s=this.s,c=effects(s);
   for(const key of s.equipment){const x=item(key),d=DESIGN.effects[x.code];if(!d||d['điều kiện kích hoạt']!=='khi đánh trúng'||this.rng()>=d['tỉ lệ kích hoạt (%)']/100)continue;
    const names={'đóng băng':'freeze','gây choáng':'stun','gây độc':'poison','chảy máu':'bleed'},type=names[d['hiệu ứng']];if(!type)continue;
    let old=c.enemyEffects.find(e=>e.type===type&&e.source===key);
    if(old){old.end=now+d['thời gian (giây)']*1000;old.stacks=type==='poison'?Math.min(d['số lớp tối đa'],old.stacks+1):1;old.last=now;}
    else c.enemyEffects.push({type,source:key,end:now+d['thời gian (giây)']*1000,last:now,stacks:1,
      damage:d['độc (sát thương/giây)']||0,pct:(d['chảy máu (% hp hiện tại/giây)']||0)/100});
   }
   if(s.rootType==='Dị'&&['bang','loi','doc'].includes(s.rootSub)){
    const chance=s.rootSub==='doc'?.15:.10;
    if(this.rng()<chance){const type={bang:'freeze',loi:'stun',doc:'poison'}[s.rootSub],duration=s.rootSub==='bang'?1.5:s.rootSub==='loi'?1:3;
     const old=c.enemyEffects.find(e=>e.source==='root'&&e.type===type),entry={type,source:'root',end:now+duration*1000,last:now,stacks:1,damage:s.rootSub==='doc'?this.stats(now).ATK*.05:0,pct:0};
     if(old)Object.assign(old,entry);else c.enemyEffects.push(entry);
    }
   }
  },
  tickDefinedCombat(now,offline=false){
   const s=this.s,c=effects(s);
   if(c.shieldEnd<=now){c.shield=0;c.shieldEnd=0;}
   if(c.heal){const h=c.heal,seconds=Math.max(0,(Math.min(now,h.end)-h.last)/1000);if(seconds)s.hp=Math.min(this.stats(now).HP,s.hp+seconds*h.amount*(1+this.rootEffects().heal));h.last=Math.max(h.last,Math.min(now,h.end));if(now>=h.end)c.heal=null;}
   c.buffs=c.buffs.filter(b=>b.end>now);
   if(offline){c.enemyEffects=[];c.bleed=null;return;}
   if(c.bleed){const b=c.bleed,seconds=Math.max(0,(Math.min(now,b.end)-b.last)/1000);if(seconds)s.hp*=Math.pow(1-b.pct,seconds);b.last=Math.max(b.last,Math.min(now,b.end));if(now>=b.end)c.bleed=null;}
   const hadEnemy=s.enemyHp>0;
   if(hadEnemy)for(const e of c.enemyEffects){const seconds=Math.max(0,(Math.min(now,e.end)-e.last)/1000);if(e.type==='poison')s.enemyHp=Math.max(0,s.enemyHp-seconds*e.damage*e.stacks);else if(e.type==='bleed')s.enemyHp=Math.max(0,s.enemyHp*Math.pow(1-e.pct,seconds));e.last=Math.max(e.last,Math.min(now,e.end));}
   c.enemyEffects=c.enemyEffects.filter(e=>e.end>now);
   if(hadEnemy&&s.enemyHp===0){this.collectLoot();c.enemyEffects=[];s.enemyHp=this.enemy().HP;}
  },
  absorbCombatDamage(amount,now){const c=effects(this.s);if(c.shieldEnd<=now){c.shield=0;c.shieldEnd=0;}const blocked=Math.min(c.shield,amount);c.shield-=blocked;return amount-blocked;}
 });
}
root.HU_DEFINED_COMBAT={install};if(typeof module!=='undefined'&&module.exports)module.exports={install};
})(typeof window!=='undefined'?window:globalThis);
