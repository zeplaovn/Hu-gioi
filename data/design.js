/* Ánh xạ định danh thiết kế sang mã game hiện tại để giữ tương thích bản lưu. */
(function(root){
'use strict';
const node=typeof module!=='undefined'&&module.exports;
const raw=node?require('./design-raw.js'):root.HU_DESIGN_RAW;
const categories=[['hạt giống','mã hạt'],['linh thảo','mã cây'],['đan dược','mã đan'],
 ['pháp bảo','mã PB'],['công pháp','mã CP'],['bí tịch','mã BT'],['phù lục','mã phù']];
const byDesign={},byLegacy={};
for(const [group,key] of categories)for(const row of raw[group]){
 const id=row[key],legacy=row['mã game cũ']||({CP900:'BT-CP-900',CP901:'BT-CP-901',BT900:'BT-900',BT901:'BT-901',PL001:'TAL-PL-001'})[id];
 if(!legacy||byDesign[id]||byLegacy[legacy])throw Error('Ánh xạ thiết kế không hợp lệ: '+id);
 byDesign[id]=legacy;byLegacy[legacy]={...row,designId:id,group};
}
const byCode=key=>{const code=typeof key==='string'?key.split('@')[0]:'';return byLegacy[code]||null};
const legacy=id=>byDesign[id]||null;
const effects=Object.fromEntries(raw['hiệu ứng pháp bảo'].map(x=>[legacy(x['mã PB']),x]));
const seedsByHerb=Object.fromEntries(raw['hạt giống'].map(x=>[legacy(x['linh thảo thu được']),x]));
const recipes={};for(const r of raw['đan phương']){const code=legacy(r['mã đan']);(recipes[code]??={})[legacy(r['mã linh thảo'])]=r['số lượng']}
const forge=Object.fromEntries(raw['rèn pháp bảo'].map(x=>[legacy(x['mã PB']),{manual:legacy(x['mã bí tịch']),herb:legacy(x['mã linh thảo']),count:x['số lượng']}]));
const talisman=Object.fromEntries(raw['vẽ phù'].map(x=>[legacy(x['mã phù']),{manual:legacy(x['mã bí tịch']),herb:legacy(x['mã linh thảo']),count:x['số lượng']}]));
const npc=Object.fromEntries(raw.npc.map(x=>[x['mã NPC'],{...x,likes:legacy(x['thích (mã vật phẩm)']),dislikes:legacy(x['không thích (mã vật phẩm)']),offer:legacy(x['mã hàng/dạy/đan'])}]));
const multiplier=text=>{const m=String(text||'').match(/(\d+(?:[.,]\d+)?)\s*%\s*ATK/i);return m?Number(m[1].replace(',','.'))/100:1};
const phase=(id,ratio)=>{const r=raw['giai đoạn boss'].find(x=>x['mã boss']===id&&ratio<=x['hp từ (%)']/100&&ratio>x['hp đến (%)']/100);return r?{...r,multiplier:multiplier(r['kỹ năng giai đoạn'])}:null};
const API={raw,byDesign,byLegacy,byCode,legacy,effects,seedsByHerb,recipes,forge,talisman,npc,multiplier,phase};
root.HU_DESIGN=API;if(node)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
