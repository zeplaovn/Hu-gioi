/* Luyện đan, chế tạo, thu hoạch. */
(function(root){
'use strict';
function install(H){
 const {F,ITEMS,item,keyFor}=H;
 Object.assign(H.Game.prototype,{
  recipe(code){const x=item(code);if(x?.kind!=='PILL')throw Error('Đan phương không hợp lệ.');const pool=ITEMS.filter(y=>y.kind==='HERB'&&y.tier===x.tier);const fallback=ITEMS.filter(y=>y.kind==='HERB'&&y.tier<=x.tier).slice(-2);const herbs=pool.length?pool:fallback,a=herbs[(x.sourceNumber-1)%herbs.length],b=herbs[x.sourceNumber%herbs.length],need={};need[a.code]=2;need[b.code]=(need[b.code]||0)+2;return {code,herbs:need,stone:F.price_ha(x.tier)*.1,time:F.craft_time(x.tier)}},
  craft(code,now=this.s.lastUpdate){const s=this.s,x=item(code),r=this.recipe(code);if(x.tier>s.realm+1)throw Error('Đan phương chưa mở.');if(s.craftQueue.length>=3)throw Error('Hàng đợi đã đủ ba mẻ.');for(const [c,n] of Object.entries(r.herbs))if(this.count(c)<n)throw Error('Thiếu '+item(c).name);this.spend(r.stone);for(const [c,n] of Object.entries(r.herbs))this.take(c,n);const skill=s.alchemySkill+this.manualEffects().alchemy+s.craftBoost;s.craftBoost=0;const start=Math.max(now,s.craftQueue.at(-1)?.end||0);s.craftQueue.push({code,end:start+r.time*1000,success:F.craft_success(x.tier,skill),quality:F.craft_quality(x.tier,skill,this.rng)})},
   finishJobs(now,offline=false){const s=this.s;let batches=0;while(s.craftQueue[0]?.end<=now){const j=s.craftQueue.shift();if(this.rng()<j.success){const key=keyFor(j.code,j.quality);this.add(key,F.P.BATCH_YIELD);s.progress.alchemy++;s.alchemySkill=Math.min(15,s.alchemySkill+.03);batches++;this.log('Luyện thành 3 '+item(j.code).name+' · '+F.SUBPHAM[j.quality]+' phẩm.')}else this.log('Luyện đan thất bại; nguyên liệu đã tiêu hao.')}this.syncGarden(now,offline);return batches},
   plant(herb,now){
    const s=this.s;
    if(s.garden.length>=4)throw Error('Bốn ô linh điền đã đầy.');
    const slot=[0,1,2,3].find(i=>!s.garden.some(p=>p.slot===i));
    s.garden.push({slot,herb,plantedAt:now,end:now+Math.max(60,F.craft_time(item(herb).tier)*2)*1000,water:1,soil:.6,pest:false,steps:0,good:0,dry:0,wilt:false});
   },
   gardenInfo(p,now=this.s.lastUpdate){
    const progress=Math.max(0,Math.min(1,(now-p.plantedAt)/Math.max(1,p.end-p.plantedAt)));
    const ratio=p.good/Math.max(1,p.steps);
    const quality=Math.max(0,(ratio>=1.1?3:ratio>=.9?2:ratio>=.6?1:0)-(p.pest?1:0));
    return {progress,ripe:now>=p.end&&!p.wilt,quality,count:2+(quality>=2?1:0)+(quality===3?1:0)};
   },
   syncGarden(now,offline=false){
    for(const p of this.s.garden){
     if(p.wilt)continue;
     const target=Math.min(6,Math.floor(this.gardenInfo(p,now).progress*6+1e-8));
     while(p.steps<target&&!p.wilt){
      p.steps++;
      if(offline){p.good++;p.water=1;p.dry=0;p.pest=false;continue;}
      p.water=Math.max(0,p.water-.34);p.soil=Math.max(0,p.soil-.08);
      if(!p.pest&&this.rng()<.12){p.pest=true;this.log('Linh điền ô '+(p.slot+1)+' xuất hiện sâu bệnh.');}
      p.dry=p.water<=0?p.dry+1:0;
      if(p.water>0&&!p.pest)p.good+=1+(p.soil>=.4?.25:0);
      if(p.dry>=3){p.wilt=true;this.log('Linh thảo ô '+(p.slot+1)+' đã héo vì thiếu nước.');}
     }
    }
   },
   gardenAct(slot,action,now=this.s.lastUpdate){
    if(!Number.isInteger(slot)||slot<0||slot>3||!['water','soil','pest','harvest'].includes(action))throw Error('Thao tác linh điền không hợp lệ.');
    this.syncGarden(now);
    const p=this.s.garden.find(p=>p.slot===slot);
    if(!p)throw Error('Ô linh điền đang trống.');
    const info=this.gardenInfo(p,now);
    if(action==='harvest'){
     if(!p.wilt&&!info.ripe)throw Error('Linh thảo chưa chín.');
     const key=keyFor(item(p.herb).code,info.quality);
     if(!p.wilt)this.add(key,info.count);
     this.s.garden=this.s.garden.filter(plot=>plot!==p);
     const message=p.wilt?'Đã nhổ bỏ cây héo ở ô '+(slot+1)+'.':'Thu hoạch '+info.count+' '+item(p.herb).name+' · '+F.SUBPHAM[info.quality]+' phẩm.';
     this.log(message);return {message,key:p.wilt?null:key,count:p.wilt?0:info.count};
    }
    if(p.wilt)throw Error('Cây đã héo; hãy nhổ bỏ để gieo lại.');
    if(action!=='pest'&&info.ripe)throw Error('Linh thảo đã chín; hãy thu hoạch.');
    if(action==='water'){if(p.water>=1)throw Error('Đất đã đủ nước.');p.water=1;p.dry=0;}
    if(action==='soil'){if(p.soil>=1)throw Error('Đất đã đủ dưỡng chất.');this.spend(1);p.soil=1;}
    if(action==='pest'){if(!p.pest)throw Error('Ô này không có sâu bệnh.');p.pest=false;}
    return {message:({water:'Đã tưới nước',soil:'Đã bón thổ',pest:'Đã bắt sâu'})[action]+' cho ô '+(slot+1)+'.'};
   },
  forge(code){const x=item(code),s=this.s;if(!x||!['EQ','TAL'].includes(x.kind)||x.tier>s.realm)throw Error('Chỉ rèn vật phẩm cùng hoặc dưới cảnh giới.');const mat=ITEMS.find(y=>y.kind==='MAT'&&y.tier===x.tier),ink='INK-'+(x.tier<5?'HG':x.tier<9?'LG':'TG');if(!mat||this.count(mat.code)<4)throw Error('Cần 4 '+(mat?.name||'linh tài'));if(x.kind==='TAL'&&!this.count(ink))throw Error('Thiếu mực luyện phù.');this.spend(this.price(code)*.1);this.take(mat.code,4);if(x.kind==='TAL')this.take(ink);this.add(code);return 'Đã chế tạo '+x.name}
 });
}
root.HU_CRAFTING={install};if(typeof module!=='undefined'&&module.exports)module.exports={install};
})(typeof window!=='undefined'?window:globalThis);
