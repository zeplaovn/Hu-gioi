export const GAME_VERSION = 3;
export const STATS = ['Tướng Mạo','Phúc Duyên','Căn Cốt','Ngộ Tính','Vận Khí'];
export const STAT_DESC = {
  'Tướng Mạo':'Tăng hiệu quả xã giao và cơ hội quý nhân.',
  'Phúc Duyên':'Tăng cơ duyên, chiến lợi phẩm và thu hoạch.',
  'Căn Cốt':'Tăng tốc độ tu luyện, khí huyết và chiến lực.',
  'Ngộ Tính':'Tăng tốc độ tu luyện và tỉ lệ đột phá.',
  'Vận Khí':'Tăng tỉ lệ đột phá, chí mạng và sự kiện tốt.'
};
export const RACES = {
  'Nhân':{life:80,bonus:{}}, 'Ma':{life:90,bonus:{'Căn Cốt':2,'Tướng Mạo':-1}},
  'Yêu':{life:120,bonus:{'Căn Cốt':1,'Ngộ Tính':-1}}, 'Linh':{life:100,bonus:{'Ngộ Tính':2,'Căn Cốt':-1}},
  'Tiên Duệ':{life:150,bonus:{'Phúc Duyên':2,'Vận Khí':1,'Căn Cốt':-2}}, 'Thú':{life:70,bonus:{'Căn Cốt':3,'Ngộ Tính':-2}}
};
export const ROOTS = [
  {id:'kim',name:'Kim Linh Căn',exp:.08,power:.08},{id:'moc',name:'Mộc Linh Căn',exp:.10,regen:.08},{id:'thuy',name:'Thủy Linh Căn',exp:.12,dodge:.04},
  {id:'hoa',name:'Hỏa Linh Căn',exp:.06,power:.14},{id:'tho',name:'Thổ Linh Căn',exp:.05,hp:.14},{id:'loi',name:'Lôi Linh Căn',exp:.18,power:.12,rare:true},
  {id:'bang',name:'Băng Linh Căn',exp:.16,dodge:.06,rare:true},{id:'phong',name:'Phong Linh Căn',exp:.15,dodge:.08,rare:true}
];
export const REALMS = ['Phàm Nhân','Luyện Khí','Trúc Cơ','Kim Đan','Nguyên Anh','Hóa Thần','Luyện Hư','Đại Thừa','Độ Kiếp'];
export const REALM_COLORS = ['#cfd8dc','#7fdcff','#7fffa0','#ffd24a','#ff9f43','#d980ff','#ff6b9d','#ffffff','#ffe27a'];
export const PROGRESSION = { months:[6,28,78,160,250,360,500,640,760], layerGrowth:1.12, big:1.4, speed:1.25, life:[0,70,120,270,600,950,1250,1550,1800] };
export const SKILLS = [
  {id:'duong-khi',name:'Dưỡng Khí Quyết',cost:30,realm:0,exp:.20,power:0,hp:0},
  {id:'thanh-phong',name:'Thanh Phong Kiếm Pháp',cost:60,realm:1,exp:0,power:12,hp:0},
  {id:'kim-cang',name:'Kim Cang Thể',cost:100,realm:1,exp:0,power:0,hp:80},
  {id:'huyen-thien',name:'Huyền Thiên Chân Kinh',cost:250,realm:2,exp:.35,power:8,hp:0},
  {id:'cuu-thien-loi',name:'Cửu Thiên Lôi Pháp',cost:500,realm:3,exp:.20,power:30,hp:40}
];
export const ITEMS = {
  seed:{name:'Hạt Linh Thảo',price:5,kind:'material'}, herb:{name:'Linh Thảo',price:8,kind:'material'}, ore:{name:'Quặng Linh Thiết',price:12,kind:'material'}, paper:{name:'Giấy Phù',price:4,kind:'material'},
  qiPill:{name:'Tụ Khí Đan',price:20,kind:'consumable'}, healPill:{name:'Hồi Huyết Đan',price:15,kind:'consumable'}, breakPill:{name:'Phá Cảnh Đan',price:90,kind:'consumable'},
  powerTalisman:{name:'Cường Lực Phù',price:30,kind:'consumable'}, guardTalisman:{name:'Hộ Thân Phù',price:30,kind:'consumable'},
  sword:{name:'Phi Kiếm',price:72,kind:'gear'}, robe:{name:'Pháp Bào',price:72,kind:'gear'}, ring:{name:'Linh Giới',price:108,kind:'gear'}
};
export const RECIPES = [
  {id:'qi-pill',name:'Tụ Khí Đan',station:'alchemy',realm:0,cost:{herb:3},reward:{qiPill:1}},
  {id:'heal-pill',name:'Hồi Huyết Đan',station:'alchemy',realm:0,cost:{herb:2},reward:{healPill:1}},
  {id:'break-pill',name:'Phá Cảnh Đan',station:'alchemy',realm:1,cost:{herb:5},reward:{breakPill:1}},
  {id:'power-talisman',name:'Cường Lực Phù',station:'talisman',realm:0,cost:{paper:1,herb:1},reward:{powerTalisman:1}},
  {id:'guard-talisman',name:'Hộ Thân Phù',station:'talisman',realm:0,cost:{paper:1,ore:1},reward:{guardTalisman:1}},
  {id:'sword',name:'Phi Kiếm',station:'forge',realm:0,cost:{ore:3},reward:{sword:1}},
  {id:'robe',name:'Pháp Bào',station:'forge',realm:0,cost:{ore:3,herb:1},reward:{robe:1}},
  {id:'ring',name:'Linh Giới',station:'forge',realm:1,cost:{ore:2,herb:2},reward:{ring:1}}
];
export const SECTS = [
  {id:'thanh-van',name:'Thanh Vân Tông',realm:1,exp:.10,power:5,stipend:8,desc:'Chính đạo, thiên về tu luyện ổn định.'},
  {id:'huyet-sat',name:'Huyết Sát Môn',realm:1,exp:0,power:20,stipend:4,desc:'Ma đạo, thiên về chiến lực.'},
  {id:'van-duoc',name:'Vạn Dược Cốc',realm:1,exp:.05,power:0,stipend:15,desc:'Đan đạo, thiên về tài nguyên và luyện chế.'}
];
export const SECT_MISSIONS = [
  {id:'patrol',name:'Tuần tra sơn môn',tier:1,duration:60,stat:'Căn Cốt',stone:12,contrib:8},
  {id:'herbs',name:'Thu thập dược liệu',tier:1,duration:90,stat:'Phúc Duyên',stone:10,contrib:10,reward:{herb:2}},
  {id:'escort',name:'Hộ tống đồng môn',tier:2,duration:120,stat:'Tướng Mạo',stone:24,contrib:16},
  {id:'hunt',name:'Săn yêu thú',tier:2,duration:150,stat:'Căn Cốt',stone:28,contrib:18,reward:{ore:1}},
  {id:'ruins',name:'Dò xét di tích cổ',tier:3,duration:240,stat:'Vận Khí',stone:52,contrib:28,reward:{breakPill:1}}
];
export const WORLDS = [
  {id:'ha-gioi',name:'Hạ Giới',realm:0,regions:[
    {id:'thanh-van-thanh',name:'Thanh Vân Thành',realm:0,danger:1},{id:'u-minh-lam',name:'U Minh Lâm',realm:0,danger:2},{id:'bach-cot-son',name:'Bạch Cốt Sơn',realm:1,danger:3},
    {id:'van-ha-coc',name:'Vân Hà Cốc',realm:2,danger:4},{id:'thien-mon-quan',name:'Thiên Môn Quan',realm:3,danger:5},{id:'vo-vong-hai',name:'Vô Vọng Hải',realm:4,danger:6},
    {id:'cuc-bac',name:'Cực Bắc Băng Nguyên',realm:5,danger:7},{id:'loi-vuc',name:'Cửu Thiên Lôi Vực',realm:6,danger:8},{id:'phi-thang-dai',name:'Phi Thăng Đài',realm:7,danger:9}
  ]},
  {id:'tien-gioi',name:'Tiên Giới',realm:7,regions:[{id:'tien-mon',name:'Nam Thiên Môn',realm:7,danger:10},{id:'dao-hai',name:'Vạn Đảo Tiên Hải',realm:8,danger:11}]},
  {id:'than-gioi',name:'Thần Giới',realm:8,regions:[{id:'than-vuc',name:'Thái Sơ Thần Vực',realm:8,danger:12}]}
];
export const SECRET_REALMS = [
  {id:'co-dong',name:'Cổ Động Luyện Khí',realm:0,duration:45,danger:2,reward:{herb:3,ore:1}},
  {id:'kiem-mo',name:'Thượng Cổ Kiếm Mộ',realm:2,duration:90,danger:5,reward:{ore:4,sword:1}},
  {id:'long-cung',name:'Hải Để Long Cung',realm:4,duration:150,danger:8,reward:{herb:5,breakPill:1}},
  {id:'loi-tri',name:'Cửu Tiêu Lôi Trì',realm:6,duration:240,danger:11,reward:{ore:8,qiPill:3}}
];
export const ACHIEVEMENTS = [
  {id:'first-break',name:'Sơ nhập tiên đồ',check:s=>s.profile?.realm>0||s.profile?.layer>1},
  {id:'rich',name:'Tài lữ pháp địa',check:s=>(s.profile?.spiritStones||0)>=1000},
  {id:'sect',name:'Bái nhập sơn môn',check:s=>!!s.sect.name},
  {id:'farmer',name:'Linh nông',check:s=>(s.tracking.harvests||0)>=20},
  {id:'crafter',name:'Bách luyện thành tài',check:s=>(s.tracking.crafted||0)>=20},
  {id:'wanderer',name:'Vạn lý độc hành',check:s=>(s.world.discovered||[]).length>=8}
];
export const NAV = [
  ['overview','Tu luyện'],['inventory','Túi đồ'],['farm','Linh điền'],['craft','Luyện chế'],['sect','Tông môn'],['world','Địa đồ'],['secret','Bí cảnh'],['meta','Thiên mệnh'],['chat','Chat'],['rank','Thiên bảng']
];
export function allRegions(){ return WORLDS.flatMap(w=>w.regions.map(r=>({...r,worldId:w.id,worldName:w.name}))); }
export function regionById(id){ return allRegions().find(r=>r.id===id)||allRegions()[0]; }
export function itemName(id){ return ITEMS[id]?.name||id; }
export function rootById(id){ return ROOTS.find(x=>x.id===id)||ROOTS[0]; }
export function sectById(id){ return SECTS.find(x=>x.id===id)||null; }
export function skillById(id){ return SKILLS.find(x=>x.id===id)||null; }
export function secretById(id){ return SECRET_REALMS.find(x=>x.id===id)||null; }
