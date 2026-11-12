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
// Các mục tiêu dùng tiến độ do máy chủ ghi nhận, có thể hoàn thành trước khi nhận bước.
const NOVICE_QUESTS=[
 {id:'novice_meditate',name:'Bước đầu nhập định',desc:'Ở lại trong game và tu luyện 60 giây để cảm nhận linh khí.',goal:'Tu luyện 60 giây',go:'idle',stone:60,item:pill(2),qty:2},
 {id:'novice_sect',name:'Bái nhập tông môn',desc:'Tìm một tông môn và gia nhập để bắt đầu con đường tu hành.',goal:'Gia nhập một tông môn',go:'world:sect',stone:80,item:'HERB-001',qty:3},
 {id:'novice_mission',name:'Ủy thác đầu tiên',desc:'Nhận và hoàn thành một nhiệm vụ tại bảng tông môn.',goal:'Hoàn thành 1 nhiệm vụ tông môn',go:'world:sect',stone:100,item:'HERB-002',qty:3},
 {id:'novice_explore',name:'Bước ra tiên sơn',desc:'Khởi hành lịch luyện, chọn cách ứng phó nếu gặp người hoặc yêu thú, rồi trở về.',goal:'Hoàn thành 1 chuyến lịch luyện',go:'combat',stone:120,item:pill(1),qty:2},
 {id:'novice_alchemy',name:'Lửa lò sơ khai',desc:'Đến Đan phòng, dùng dược liệu luyện thành một mẻ đan. Mẻ thất bại có thể thử lại.',goal:'Luyện thành 1 mẻ đan',go:'craft:dan',stone:120,item:pill(2),qty:2},
 {id:'novice_stage',name:'Tích lũy đạo cơ',desc:'Tiếp tục tu luyện đến Luyện Khí tầng 3; các tiểu cảnh giới tự đột phá.',goal:'Đạt Luyện Khí tầng 3',go:'idle',stone:150,item:pill(1),qty:2},
 {id:'novice_peak',name:'Chuẩn bị độ kiếp',desc:'Tu luyện đến đỉnh Luyện Khí. Kiểm tra sinh lực và vật phẩm hộ kiếp trước khi dẫn lôi.',goal:'Đạt đỉnh Luyện Khí',go:'tribulation',stone:200,item:pill(7),qty:1},
 {id:'novice_foundation',name:'Trúc Cơ khai lộ',desc:'Vượt qua thiên kiếp đại cảnh giới để tiến vào Trúc Cơ. Thất bại sẽ khiến đạo thân tử vong.',goal:'Đạt Trúc Cơ',go:'tribulation',stone:300,item:pill(2),qty:3}
];
/* Mở khóa tính năng theo cảnh giới (chỉ số r của F.REALMS). Nguồn duy nhất cho engine và giao diện. */
const FEATURES={
 forge:{realm:2,label:'Rèn pháp bảo và vẽ phù'},
 social:{realm:3,label:'Giao du: kết bạn, luận kiếm, bảng xếp hạng'}
};
const API={ITEMS,BY_ID,item,keyFor,pill,ZONES,ENEMY_NAMES,QUESTS,NOVICE_QUESTS,DESIGN,FEATURES};
root.HU_CATALOG=API;if(node)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
