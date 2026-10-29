/* Luyện đan, chế tạo, thu hoạch. */
(function(root){
'use strict';
function install(H){
 const {F,ITEMS,item,keyFor,DESIGN}=H;
 const TERRAINS=['đất thường','linh điền','hỏa địa','hàn đàm','linh điền có trận pháp'];
 Object.assign(H.Game.prototype,{
  ingredientCount(code){const base=item(code)?.code;if(!base)return 0;return Object.entries(this.s.bag).reduce((sum,[key,n])=>sum+(item(key)?.code===base?n:0),0)},
  takeIngredient(code,count){const base=item(code)?.code;if(!base||this.ingredientCount(base)<count)throw Error('Thiếu nguyên liệu.');const keys=Object.keys(this.s.bag).filter(k=>item(k)?.code===base).sort((a,b)=>item(a).sub-item(b).sub||a.localeCompare(b));for(const key of keys){const n=Math.min(count,this.count(key));this.take(key,n);count-=n;if(!count)break}},
  recipe(code){const x=item(code);if(x?.kind!=='PILL')throw Error('Đan phương không hợp lệ.');const defined=DESIGN.recipes[x.code];if(defined)return {code,herbs:{...defined},stone:F.price_ha(x.tier)*.1,time:F.craft_time(x.tier)};const pool=ITEMS.filter(y=>y.kind==='HERB'&&y.tier===x.tier);const fallback=ITEMS.filter(y=>y.kind==='HERB'&&y.tier<=x.tier).slice(-2);const herbs=pool.length?pool:fallback,a=herbs[(x.sourceNumber-1)%herbs.length],b=herbs[x.sourceNumber%herbs.length],need={};need[a.code]=2;need[b.code]=(need[b.code]||0)+2;return {code,herbs:need,stone:F.price_ha(x.tier)*.1,time:F.craft_time(x.tier)}},
  craftChance(tier){const s=this.s,e=this.manualEffects(),skill=s.alchemySkill+e.alchemy+s.craftBoost;return Math.max(.05,Math.min(.95,F.craft_success(tier,skill)+e.alchemyChance))},
  craft(code,now=this.s.lastUpdate){const s=this.s,x=item(code),r=this.recipe(code);if(x.tier>s.realm+1)throw Error('Đan phương chưa mở.');if(s.craftQueue.length>=3)throw Error('Hàng đợi đã đủ ba mẻ.');for(const [c,n] of Object.entries(r.herbs))if(this.ingredientCount(c)<n)throw Error('Thiếu '+item(c).name);const success=this.craftChance(x.tier),skill=s.alchemySkill+this.manualEffects().alchemy+s.craftBoost;this.spend(r.stone);for(const [c,n] of Object.entries(r.herbs))this.takeIngredient(c,n);s.craftBoost=0;const start=Math.max(now,s.craftQueue.at(-1)?.end||0);s.craftQueue.push({code,end:start+r.time*1000,success,quality:F.craft_quality(x.tier,skill,this.rng)})},
   finishJobs(now,offline=false){const s=this.s;let batches=0;while(s.craftQueue[0]?.end<=now){const j=s.craftQueue.shift();if(this.rng()<j.success){const key=keyFor(j.code,j.quality);this.add(key,F.P.BATCH_YIELD);s.progress.alchemy++;s.alchemySkill=Math.min(15,s.alchemySkill+.03);batches++;this.log('Luyện thành 3 '+item(j.code).name+' · '+F.SUBPHAM[j.quality]+' phẩm.')}else this.log('Luyện đan thất bại; nguyên liệu đã tiêu hao.')}this.syncGarden(now,offline);return batches},
   plant(herb,now){
    const s=this.s;
    if(s.garden.length>=4)throw Error('Bốn ô linh điền đã đầy.');
    const def=DESIGN.seedsByHerb[item(herb).code],required=def?.['điều kiện đất'];
    const slot=[0,1,2,3].find(i=>!s.garden.some(p=>p.slot===i)&&(!required||s.gardenSoils[i]===required));
    if(slot===undefined)throw Error('Cần ô trống có '+required+'. Hãy đổi loại đất ở ô trống.');
    const seconds=def?def['thời gian trồng (phút)']*60:Math.max(60,F.craft_time(item(herb).tier)*2);
    s.garden.push({slot,herb,plantedAt:now,end:now+seconds*1000,water:1,soil:.6,pest:false,steps:0,good:0,dry:0,wilt:false});
   },
   gardenInfo(p,now=this.s.lastUpdate){
    const progress=Math.max(0,Math.min(1,(now-p.plantedAt)/Math.max(1,p.end-p.plantedAt)));
    const ratio=p.good/Math.max(1,p.steps);
    const quality=Math.max(0,(ratio>=1.1?3:ratio>=.9?2:ratio>=.6?1:0)-(p.pest?1:0));
    const def=DESIGN.seedsByHerb[item(p.herb).code],count=2+(quality>=2?1:0)+(quality===3?1:0);
    return {progress,ripe:now>=p.end&&!p.wilt,quality,count,min:def?.['sản lượng tối thiểu']??count,max:def?.['sản lượng tối đa']??count};
   },
   syncGarden(now,offline=false){
    for(const p of this.s.garden){
     if(p.wilt)continue;
     const target=Math.min(6,Math.floor(this.gardenInfo(p,now).progress*6+1e-8));
     while(p.steps<target&&!p.wilt){
      p.steps++;
      if(offline){p.good++;p.water=1;p.dry=0;p.pest=false;continue;}
      const difficulty=DESIGN.seedsByHerb[item(p.herb).code]?.['độ khó']||1;
      p.water=Math.max(0,p.water-(.26+.08*difficulty));p.soil=Math.max(0,p.soil-.08);
      if(!p.pest&&this.rng()<.08+.04*difficulty){p.pest=true;this.log('Linh điền ô '+(p.slot+1)+' xuất hiện sâu bệnh.');}
      p.dry=p.water<=0?p.dry+1:0;
      if(p.water>0&&!p.pest)p.good+=1+(p.soil>=.4?.25:0);
      if(p.dry>=3){p.wilt=true;this.log('Linh thảo ô '+(p.slot+1)+' đã héo vì thiếu nước.');}
     }
    }
   },
   gardenAct(slot,action,now=this.s.lastUpdate,terrain){
    if(!Number.isInteger(slot)||slot<0||slot>3||!['water','soil','pest','harvest','terrain'].includes(action))throw Error('Thao tác linh điền không hợp lệ.');
    if(action==='terrain'){if(!TERRAINS.includes(terrain))throw Error('Loại đất không hợp lệ.');if(this.s.garden.some(p=>p.slot===slot))throw Error('Chỉ đổi đất ở ô trống.');this.s.gardenSoils[slot]=terrain;return {message:'Ô '+(slot+1)+' dùng '+terrain+'.'};}
    this.syncGarden(now);
    const p=this.s.garden.find(p=>p.slot===slot);
    if(!p)throw Error('Ô linh điền đang trống.');
    const info=this.gardenInfo(p,now);
    if(action==='harvest'){
     if(!p.wilt&&!info.ripe)throw Error('Linh thảo chưa chín.');
     const key=keyFor(item(p.herb).code,info.quality);
     const count=info.min+Math.floor(this.rng()*(info.max-info.min+1));
     if(!p.wilt)this.add(key,count);
     this.s.garden=this.s.garden.filter(plot=>plot!==p);
     const message=p.wilt?'Đã nhổ bỏ cây héo ở ô '+(slot+1)+'.':'Thu hoạch '+count+' '+item(p.herb).name+' · '+F.SUBPHAM[info.quality]+' phẩm.';
     this.log(message);return {message,key:p.wilt?null:key,count:p.wilt?0:count};
    }
    if(p.wilt)throw Error('Cây đã héo; hãy nhổ bỏ để gieo lại.');
    if(action!=='pest'&&info.ripe)throw Error('Linh thảo đã chín; hãy thu hoạch.');
    if(action==='water'){if(p.water>=1)throw Error('Đất đã đủ nước.');p.water=1;p.dry=0;}
    if(action==='soil'){if(p.soil>=1)throw Error('Đất đã đủ dưỡng chất.');this.spend(1);p.soil=1;}
    if(action==='pest'){if(!p.pest)throw Error('Ô này không có sâu bệnh.');p.pest=false;}
    return {message:({water:'Đã tưới nước',soil:'Đã bón thổ',pest:'Đã bắt sâu'})[action]+' cho ô '+(slot+1)+'.'};
   },
  forgeRecipe(code){const x=item(code);if(!x||!['EQ','TAL'].includes(x.kind))throw Error('Công thức chế tạo không hợp lệ.');const defined=DESIGN.forge[x.code]||DESIGN.talisman[x.code];if(defined)return {...defined,stone:this.price(code)*.1};const mat=ITEMS.find(y=>y.kind==='MAT'&&y.tier===x.tier);return {herb:mat?.code,count:4,ink:x.kind==='TAL'?'INK-'+(x.tier<5?'HG':x.tier<9?'LG':'TG'):null,stone:this.price(code)*.1}},
  forge(code){const x=item(code),s=this.s;if(!x||!['EQ','TAL'].includes(x.kind)||x.tier>s.realm)throw Error('Chỉ rèn vật phẩm cùng hoặc dưới cảnh giới.');const r=this.forgeRecipe(code);if(r.manual&&!Object.keys(s.learned).some(k=>item(k)?.code===r.manual))throw Error('Cần lĩnh ngộ '+item(r.manual).name+'.');if(!r.herb||this.ingredientCount(r.herb)<r.count)throw Error('Cần '+r.count+' '+(item(r.herb)?.name||'linh tài'));if(r.ink&&!this.ingredientCount(r.ink))throw Error('Thiếu mực luyện phù.');this.spend(r.stone);this.takeIngredient(r.herb,r.count);if(r.ink)this.takeIngredient(r.ink,1);this.add(code);return 'Đã chế tạo '+x.name}
 });
}
root.HU_CRAFTING={install};if(typeof module!=='undefined'&&module.exports)module.exports={install};
})(typeof window!=='undefined'?window:globalThis);
