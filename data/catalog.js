/* Tra cứu vật phẩm và bản đồ; không giữ trạng thái người chơi. */
(function(root){
'use strict';
const node=typeof module!=='undefined'&&module.exports;
const F=node?require('./formulas.js'):root.HU_FORMULAS;
const BASE=node?require('./items.js'):root.TIEN_VAN_ITEMS;
const DESIGN=node?require('./design.js'):root.HU_DESIGN;
const EXTRA=[
 ['BT-900','BT900','BT','DAN','BT-004'],['BT-901','BT901','BT','DAN','BT-004'],
 ['BT-CP-900','CP900','BT','TOC','BT-001'],['BT-CP-901','CP901','BT','TOC','BT-001'],
 ['TAL-PL-001','PL001','TAL','STRIKE','TAL-002']
].map(([code,id,kind,effect,imageCode])=>{const d=DESIGN.byLegacy[code],tier=Math.max(0,['luyện khí','trúc cơ','kim đan','nguyên anh','hóa thần'].indexOf(d['yêu cầu']||d['yêu cầu học']));return {code,name:d['tên bí tịch']||d['tên công pháp']||d['tên phù'],
 category:kind==='BT'?'Công pháp':'Phù lục',kind,tier,sub:0,source:'Thiết kế mới',description:d['mô tả']||d['công dụng']||d['hiệu quả'],
 effect,map:'Hạ Giới',realm:F.REALMS[tier],quality:'Hạ phẩm',grade:d['độ hiếm']||'Linh',originalName:d['tên bí tịch']||d['tên công pháp']||d['tên phù'],
 design:d,designId:id,designOnly:true,imageCode};});
const ITEMS=[...BASE.map(x=>{const d=DESIGN.byCode(x.code);return d?{...x,design:d,designId:d.designId,grade:d['độ hiếm']||x.grade}:x}),...EXTRA];
const BY_ID=Object.fromEntries(ITEMS.map(x=>[x.code,x]));
const item=key=>{if(typeof key!=='string')return null;const [code,q,...rest]=key.split('@'),base=Object.hasOwn(BY_ID,code)?BY_ID[code]:null;if(!base||rest.length||q!==undefined&&!/^[0-3]$/.test(q))return null;return {...base,key,sub:q===undefined?base.sub:Number(q)}};
const keyFor=(code,sub)=>sub===BY_ID[code]?.sub?code:code+'@'+sub;
const pill=n=>ITEMS.find(x=>x.kind==='PILL'&&x.sourceNumber===n).code;
const ZONES=[
 ['Thanh Vân Sơn',0],['Trúc Ảnh Lâm',1],['Vạn Kiếm Phong',2],['Nguyên Anh Cốc',3],['Hóa Thần Đài',4],
 ['Hư Không Cảnh',5],['Hợp Thể Sơn',6],['Đại Thừa Thiên',7],['Cửu Cửu Kiếp Đài',8],
 ['Chân Tiên Điện',9],['Kim Tiên Hải',10],['Thái Ất Cung',11],['Đại La Thiên',12],['Hồng Mông Đạo Vực',13]
].map(([name,realm],i)=>({id:i,name,realm,tier:realm<5?0:realm<9?1:2,desc:F.REALMS[realm]+' · '+F.realm_map(realm)}));
const ENEMY_NAMES=['Hắc Phong Yêu Vương','Thượng Giao','Hỏa Nhãn Kim Sư','U Minh Quỷ Vương','Thiên Yêu Hoàng','Hỗn Độn Thú','Cửu U Huyết Ma','Huyết Hải Tu La','Thiên Kiếp Hóa Thân','Cửu U Minh Long','Kim Sí Đại Bàng','Không Gian Thử','Vô Thượng Kiếm Ma','Hỗn Độn Ma Thần'];
const QUESTS=[
 ['kill','Trừ yêu hộ đạo',5,160,pill(2),2],
 ['meditate','Tĩnh tâm nhập định',120,120,pill(1),1],
 ['travel','Tầm tiên vấn đạo',2,200,'HERB-001',3],
 ['breaks','Phá kén thành tiên',1,280,pill(7),1],
 ['alchemy','Luyện đan kỳ tài',2,220,'HERB-002',3]
];
const API={ITEMS,BY_ID,item,keyFor,pill,ZONES,ENEMY_NAMES,QUESTS,DESIGN};
root.HU_CATALOG=API;if(node)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
