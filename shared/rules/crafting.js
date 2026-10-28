/* Luyện đan, chế tạo, thu hoạch. */
(function(root){
'use strict';
function install(H){
 const {F,ITEMS,item,keyFor}=H;
 Object.assign(H.Game.prototype,{
  recipe(code){const x=item(code);if(x?.kind!=='PILL')throw Error('Đan phương không hợp lệ.');const pool=ITEMS.filter(y=>y.kind==='HERB'&&y.tier===x.tier);const fallback=ITEMS.filter(y=>y.kind==='HERB'&&y.tier<=x.tier).slice(-2);const herbs=pool.length?pool:fallback,a=herbs[(x.sourceNumber-1)%herbs.length],b=herbs[x.sourceNumber%herbs.length],need={};need[a.code]=2;need[b.code]=(need[b.code]||0)+2;return {code,herbs:need,stone:F.price_ha(x.tier)*.1,time:F.craft_time(x.tier)}},
  craft(code,now=this.s.lastUpdate){const s=this.s,x=item(code),r=this.recipe(code);if(x.tier>s.realm+1)throw Error('Đan phương chưa mở.');if(s.craftQueue.length>=3)throw Error('Hàng đợi đã đủ ba mẻ.');for(const [c,n] of Object.entries(r.herbs))if(this.count(c)<n)throw Error('Thiếu '+item(c).name);this.spend(r.stone);for(const [c,n] of Object.entries(r.herbs))this.take(c,n);const skill=s.alchemySkill+this.manualEffects().alchemy+s.craftBoost;s.craftBoost=0;const start=Math.max(now,s.craftQueue.at(-1)?.end||0);s.craftQueue.push({code,end:start+r.time*1000,success:F.craft_success(x.tier,skill),quality:F.craft_quality(x.tier,skill,this.rng)})},
  finishJobs(now){const s=this.s;let batches=0;while(s.craftQueue[0]?.end<=now){const j=s.craftQueue.shift();if(this.rng()<j.success){const key=keyFor(j.code,j.quality);this.add(key,F.P.BATCH_YIELD);s.progress.alchemy++;s.alchemySkill=Math.min(15,s.alchemySkill+.03);batches++;this.log('Luyện thành 3 '+item(j.code).name+' · '+F.SUBPHAM[j.quality]+' phẩm.')}else this.log('Luyện đan thất bại; nguyên liệu đã tiêu hao.')}for(const p of s.garden.filter(p=>p.end<=now)){this.add(p.herb,3);this.log('Linh điền thu hoạch 3 '+item(p.herb).name+'.')}s.garden=s.garden.filter(p=>p.end>now);return batches},
  forge(code){const x=item(code),s=this.s;if(!x||!['EQ','TAL'].includes(x.kind)||x.tier>s.realm)throw Error('Chỉ rèn vật phẩm cùng hoặc dưới cảnh giới.');const mat=ITEMS.find(y=>y.kind==='MAT'&&y.tier===x.tier),ink='INK-'+(x.tier<5?'HG':x.tier<9?'LG':'TG');if(!mat||this.count(mat.code)<4)throw Error('Cần 4 '+(mat?.name||'linh tài'));if(x.kind==='TAL'&&!this.count(ink))throw Error('Thiếu mực luyện phù.');this.spend(this.price(code)*.1);this.take(mat.code,4);if(x.kind==='TAL')this.take(ink);this.add(code);return 'Đã chế tạo '+x.name}
 });
}
root.HU_CRAFTING={install};if(typeof module!=='undefined'&&module.exports)module.exports={install};
})(typeof window!=='undefined'?window:globalThis);
