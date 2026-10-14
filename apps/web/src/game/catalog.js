export const GAME_VERSION = 3;
export const STATS = ['Tướng Mạo','Phúc Duyên','Căn Cốt','Ngộ Tính','Vận Khí'];
export const STAT_DESC = {
  'Tướng Mạo':'Ngoại hình, dễ được quý nhân giúp đỡ, vào tông môn thuận lợi.',
  'Phúc Duyên':'Gặp cơ duyên, nhặt bảo vật khi lịch luyện.',
  'Căn Cốt':'Tốc độ tu luyện, khí huyết và sức chiến đấu.',
  'Ngộ Tính':'Đốn ngộ khi tu luyện, tăng tỉ lệ đột phá.',
  'Vận Khí':'May mắn khi lịch luyện, tránh họa, tăng tỉ lệ đột phá.'
};
export const RACES = {
  'Nhân':{life:80,bonus:{}}, 'Ma':{life:90,bonus:{'Căn Cốt':2,'Tướng Mạo':-1}},
  'Yêu':{life:120,bonus:{'Căn Cốt':1,'Ngộ Tính':-1}}, 'Linh':{life:100,bonus:{'Ngộ Tính':2,'Căn Cốt':-1}},
  'Tiên Duệ':{life:150,bonus:{'Phúc Duyên':2,'Vận Khí':1,'Căn Cốt':-2}}, 'Thú':{life:70,bonus:{'Căn Cốt':3,'Ngộ Tính':-2}}
};
export const FIVE = ['Kim','Mộc','Thủy','Hỏa','Thổ'];
export const RARE_ELEMENTS = ['Lôi','Băng','Phong'];
export const ELEMENTS = {
  Kim:{atk:.12,crit:.02}, Mộc:{hp:.10,regen:.5}, Thủy:{exp:.10,dodge:.03}, Hỏa:{atk:.06,crit:.06}, Thổ:{def:.15,hp:.05},
  Lôi:{atk:.18,crit:.08}, Băng:{def:.15,exp:.10}, Phong:{dodge:.10,exp:.10,crit:.02}
};
export const ROOT_TYPES = [
  {n:1,name:'Thiên Linh Căn',exp:.40,scale:1,w:6,life:0,keep:0},
  {n:2,name:'Song Linh Căn',exp:.22,scale:.80,w:18,life:0,keep:0},
  {n:3,name:'Tam Linh Căn',exp:.08,scale:.62,w:34,life:25,keep:.03},
  {n:4,name:'Tứ Linh Căn',exp:-.02,scale:.50,w:27,life:55,keep:.06},
  {n:5,name:'Ngũ Linh Căn',exp:-.10,scale:.40,w:12,life:100,keep:.10}
];
export const RARE_ROOT = {n:1,name:'Dị Linh Căn',exp:.45,scale:1,life:0,keep:0};
export const TEMPER_STEP=.08;
const ROOT_ID_MAP={kim:'Kim',moc:'Mộc',thuy:'Thủy',hoa:'Hỏa',tho:'Thổ',loi:'Lôi',bang:'Băng',phong:'Phong'};
export function cleanRoot(raw){
  if(typeof raw==='string')raw={els:[ROOT_ID_MAP[raw]||raw]};
  if(!raw||!Array.isArray(raw.els))return null;
  const els=[...new Set(raw.els.filter(x=>typeof x==='string'&&(FIVE.includes(x)||RARE_ELEMENTS.includes(x))))];
  const rare=els.find(x=>RARE_ELEMENTS.includes(x));if(rare)return{els:[rare]};
  const five=FIVE.filter(x=>els.includes(x));return five.length?{els:five}:null;
}
export function rollRoot(random=Math.random){
  const randInt=(a,b)=>Math.floor(random()*(b-a+1))+a;
  if(randInt(1,100)<=3)return{els:[RARE_ELEMENTS[randInt(0,RARE_ELEMENTS.length-1)]]};
  let r=randInt(1,97),n=3;for(const t of ROOT_TYPES){if(r<=t.w){n=t.n;break}r-=t.w}
  const pool=[...FIVE],got=[];while(got.length<n)got.push(pool.splice(randInt(0,pool.length-1),1)[0]);
  return{els:FIVE.filter(x=>got.includes(x))};
}
export function rootInfo(root){const r=cleanRoot(root)||{els:['Kim']};if(r.els.some(x=>RARE_ELEMENTS.includes(x)))return{...RARE_ROOT};return{...ROOT_TYPES[Math.min(5,Math.max(1,r.els.length))-1]};}
export function rootBonus(profile,key){const root=cleanRoot(profile?.root)||{els:['Kim']},info=rootInfo(root);let sum=0;for(const el of root.els){const v=ELEMENTS[el]?.[key]||0;if(v)sum+=v*info.scale*(1+TEMPER_STEP*Number(profile?.temper?.[el]||0));}return sum;}
export function rootLabel(root){const r=cleanRoot(root)||{els:['Kim']};return`${rootInfo(r).name} (${r.els.join(', ')})`;}
export const REALMS = ['Phàm Nhân','Luyện Khí','Trúc Cơ','Kim Đan','Nguyên Anh','Hóa Thần','Luyện Hư','Đại Thừa','Độ Kiếp'];
export const REALM_COLORS = ['#cfd8dc','#7fdcff','#7fffa0','#ffd24a','#ff9f43','#d980ff','#ff6b9d','#ffffff','#ffe27a'];
export const PROGRESSION = {
  months:[6,28,78,160,250,360,500,640,760],layerGrowth:1.12,big:1.4,refStat:15,
  refMult:[1.1,1.25,1.55,1.75,1.9,2,2.1,2.2,2.3],speed:1.25,life:[0,70,120,270,600,950,1250,1550,1800],
  chance:{base:.50,nt:.010,vk:.006,realm:.035,minor:.20,big:-.08,min:.08,max:.90},keep:{minor:.70,big:.60},pill:.06,
  idle:{monthSeconds:10,fullRateSeconds:120,offlineRate:.5,offlineCapSeconds:7200,actionCooldownSeconds:10}
};
export const SKILLS = [
  {id:'duong-khi',name:'Dưỡng Khí Quyết',cost:30,realm:0,exp:.20,power:0,hp:0},
  {id:'thanh-phong',name:'Thanh Phong Kiếm Pháp',cost:60,realm:1,exp:0,power:12,hp:0},
  {id:'kim-cang',name:'Kim Cang Thể',cost:100,realm:1,exp:0,power:0,hp:80},
  {id:'huyen-thien',name:'Huyền Thiên Chân Kinh',cost:250,realm:2,exp:.35,power:8,hp:0},
  {id:'cuu-thien-loi',name:'Cửu Thiên Lôi Pháp',cost:500,realm:3,exp:.20,power:30,hp:40}
];
export const ITEMS = {
  seed:{name:'Hạt Linh Thảo',price:5,sell:2,kind:'material',realm:0,shop:true}, herb:{name:'Linh Thảo',price:8,sell:4,kind:'material',realm:0,shop:false}, ore:{name:'Quặng Linh Thiết',price:12,sell:6,kind:'material',realm:0,shop:true}, paper:{name:'Giấy Phù',price:4,sell:2,kind:'material',realm:0,shop:true},
  qiPill:{name:'Tụ Khí Đan',price:20,sell:12,kind:'consumable',effect:'exp',value:.06,realm:0,limit:5,shop:true}, healPill:{name:'Hồi Huyết Đan',price:15,sell:9,kind:'consumable',effect:'heal',value:.6,realm:0,shop:true}, breakPill:{name:'Phá Cảnh Đan',price:90,sell:48,kind:'consumable',effect:'break',value:.12,realm:1,limit:2,shop:true},
  longevityFruit:{name:'Trường Thọ Quả',price:160,sell:80,kind:'consumable',effect:'life',value:6,realm:1,limit:1,shop:true}, condensedPill:{name:'Ngưng Nguyên Đan',price:140,sell:70,kind:'consumable',effect:'exp',value:.05,realm:2,limit:4,shop:true}, greatHealPill:{name:'Đại Hồi Đan',price:70,sell:35,kind:'consumable',effect:'heal',value:1,realm:2,shop:true},
  tendonPill:{name:'Dịch Cân Đan',price:420,sell:210,kind:'consumable',effect:'stat',value:1,realm:3,limit:1,shop:true}, nascentPill:{name:'Hóa Anh Đan',price:650,sell:325,kind:'consumable',effect:'exp',value:.045,realm:4,limit:3,shop:true}, lifePill:{name:'Tục Mệnh Đan',price:800,sell:400,kind:'consumable',effect:'life',value:12,realm:4,limit:1,shop:true},
  heavenlyPill:{name:'Thiên Cơ Đan',price:1600,sell:800,kind:'consumable',effect:'break',value:.20,realm:5,limit:1,shop:true}, voidPill:{name:'Thái Hư Đan',price:3200,sell:1600,kind:'consumable',effect:'exp',value:.04,realm:6,limit:2,shop:true}, creationElixir:{name:'Tạo Hóa Dịch',price:5200,sell:2600,kind:'consumable',effect:'stat',value:1,realm:7,limit:1,shop:true}, tribulationPill:{name:'Độ Kiếp Đan',price:9000,sell:4500,kind:'consumable',effect:'break',value:.25,realm:8,limit:1,shop:true},
  powerTalisman:{name:'Cường Lực Phù',price:30,sell:14,kind:'talisman',realm:0,shop:false}, guardTalisman:{name:'Hộ Thân Phù',price:30,sell:14,kind:'talisman',realm:0,shop:false}, breakTalisman:{name:'Phá Cảnh Phù',price:80,sell:40,kind:'talisman',realm:1,shop:false},
  sword:{name:'Phi Kiếm',price:72,sell:36,kind:'gear',realm:0,shop:false}, robe:{name:'Pháp Bào',price:72,sell:36,kind:'gear',realm:0,shop:false}, ring:{name:'Linh Giới',price:108,sell:54,kind:'gear',realm:1,shop:false}
};
export const SHOP={restockSeconds:1800,realmPrice:.5};
export const RECIPES = [
  {id:'qi-pill',name:'Tụ Khí Đan',station:'alchemy',realm:0,cost:{herb:3},reward:{qiPill:1}},
  {id:'heal-pill',name:'Hồi Huyết Đan',station:'alchemy',realm:0,cost:{herb:2},reward:{healPill:1}},
  {id:'break-pill',name:'Phá Cảnh Đan',station:'alchemy',realm:1,cost:{herb:5},reward:{breakPill:1}},
  {id:'power-talisman',name:'Cường Lực Phù',station:'talisman',realm:0,cost:{paper:1},reward:{powerTalisman:1}},
  {id:'guard-talisman',name:'Hộ Thân Phù',station:'talisman',realm:0,cost:{paper:1},reward:{guardTalisman:1}},
  {id:'break-talisman',name:'Phá Cảnh Phù',station:'talisman',realm:1,cost:{paper:1},reward:{breakTalisman:1}},
  {id:'sword',name:'Phi Kiếm',station:'forge',realm:0,cost:{ore:3},reward:{sword:1}},
  {id:'robe',name:'Pháp Bào',station:'forge',realm:0,cost:{ore:3},reward:{robe:1}},
  {id:'ring',name:'Linh Giới',station:'forge',realm:1,cost:{ore:2},reward:{ring:1}}
];
export const SECTS = [
  {id:'thanh-van',name:'Thanh Vân Tông',realm:1,exp:.10,power:5,stipend:8,discount:1,desc:'Chính đạo, thiên về tu luyện ổn định.'},
  {id:'huyet-sat',name:'Huyết Sát Môn',realm:1,exp:0,power:20,stipend:4,discount:1,desc:'Ma đạo, thiên về chiến lực.'},
  {id:'van-duoc',name:'Vạn Dược Cốc',realm:1,exp:.05,power:0,stipend:15,discount:.7,desc:'Đan đạo, thiên về tài nguyên và luyện chế.'}
];
export const SECT_RANKS = [
  {name:'Ngoại Môn Đệ Tử',at:0,exp:0,stipend:1,tier:1},{name:'Nội Môn Đệ Tử',at:60,exp:.01,stipend:1.3,tier:2},
  {name:'Chân Truyền Đệ Tử',at:220,exp:.02,stipend:1.7,tier:3},{name:'Chấp Sự',at:600,exp:.03,stipend:2.2,tier:4},
  {name:'Trưởng Lão',at:1500,exp:.04,stipend:3,tier:5},{name:'Thái Thượng Trưởng Lão',at:3500,exp:.06,stipend:4,tier:5}
];
export const SECT_MISSIONS = [
  {id:'patrol',name:'Tuần tra sơn môn',tier:1,duration:30,stat:'Căn Cốt',x:1.5,stone:14,contrib:6},
  {id:'herbs',name:'Thu thập dược liệu',tier:1,duration:35,stat:'Phúc Duyên',x:1.5,stone:12,contrib:6,reward:{herb:2}},
  {id:'escort',name:'Hộ tống đồng môn',tier:2,duration:60,stat:'Tướng Mạo',x:3,stone:30,contrib:11},
  {id:'hunt',name:'Săn yêu thú',tier:2,duration:65,stat:'Căn Cốt',x:3,stone:28,contrib:11,reward:{ore:1}},
  {id:'ruins',name:'Dò xét di tích cổ',tier:3,duration:100,stat:'Vận Khí',x:5,stone:46,contrib:20,reward:{breakPill:1}}
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
export const META_UPGRADES={
  pts:{label:'Thiên Tư · điểm phân bổ',cost:[3,5,8,12,18]},stone:{label:'Túi Càn Khôn · linh thạch đầu kiếp',cost:[2,3,4,6,8]},
  life:{label:'Trường Sinh · thọ nguyên đầu kiếp',cost:[3,4,6,8,12]},exp:{label:'Đạo Tâm · tốc độ tu luyện',cost:[4,6,9,13,18]},luck:{label:'Thiên Vận · Vận Khí đầu kiếp',cost:[5,9,14]}
};
export const NAV = [['overview','Tu luyện'],['inventory','Túi đồ'],['farm','Linh điền'],['craft','Luyện chế'],['sect','Tông môn'],['world','Địa đồ'],['secret','Bí cảnh'],['meta','Thiên mệnh'],['chat','Chat'],['rank','Thiên bảng']];
export function allRegions(){return WORLDS.flatMap(w=>w.regions.map(r=>({...r,worldId:w.id,worldName:w.name})));}
export function regionById(id){return allRegions().find(r=>r.id===id)||allRegions()[0];}
export function itemName(id){return ITEMS[id]?.name||id;}
export function sectById(id){return SECTS.find(x=>x.id===id)||null;}
export function sectByName(name){return SECTS.find(x=>x.name===name)||null;}
export function skillById(id){return SKILLS.find(x=>x.id===id)||null;}
export function skillByName(name){return SKILLS.find(x=>x.name===name)||null;}
export function secretById(id){return SECRET_REALMS.find(x=>x.id===id)||null;}

export function sectRank(state){const earned=Math.max(0,Number(state?.sect?.earned)||0);let rank=SECT_RANKS[0];for(const r of SECT_RANKS)if(earned>=r.at)rank=r;return rank;}
