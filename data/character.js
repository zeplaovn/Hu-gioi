/* Hồ sơ khởi nguyên và Thiên mệnh. Các lần gieo nhận RNG từ bên gọi. */
(function(root){
'use strict';
const node=typeof module!=='undefined'&&module.exports;
const F=node?require('./formulas.js'):root.HU_FORMULAS;
const R=node?require('./roots.js'):root.HU_ROOTS;
function rootType(roots){const n=roots.filter(x=>x>=50).length;return ['Thiên','Thiên','Song','Tam hành','Tứ hành','Ngụy'][n]}
/* Không gieo Âm Dương hoặc Hỗn Độn; giữ tỷ lệ tương đối của các loại còn lại. */
function rollRoots(rng=Math.random){const v=.015+rng()*.985;let type=v<.075?'Dị':v<.225?'Thiên':v<.545?'Song':v<.795?'Tam hành':v<.945?'Tứ hành':'Ngụy';const count={Thiên:1,Song:2,'Tam hành':3,'Tứ hành':4,Ngụy:5,Dị:1}[type],order=[0,1,2,3,4];for(let i=4;i>0;i--){const j=Math.floor(rng()*(i+1));[order[i],order[j]]=[order[j],order[i]]}const roots=order.map(()=>15+Math.floor(rng()*30));let rootSub='';if(type==='Dị'){rootSub=R.DI_KEYS[Math.floor(rng()*R.DI_KEYS.length)];const from=R.DI_LINH_CAN[rootSub].from;roots[from[Math.floor(rng()*from.length)]]=65+Math.floor(rng()*36)}else order.slice(0,count).forEach(i=>roots[i]=65+Math.floor(rng()*36));return {roots,rootType:type,rootSub}}
const RACES=[['nhan','Nhân',34],['ma','Ma',16],['yeu','Yêu',16],['linh','Linh',16],['tien_due','Tiên Duệ',6],['thu','Thú',12]];
const LEGACY_RACES={tien:'tien_due'};
const NAME_MAX=20;
const TALENT_INFO=[
 {key:'tuongMao',name:'Tướng Mạo',icon:'ICON-MENU-003-40.png',desc:'Dung mạo xuất chúng, khởi đầu có thêm linh thạch.',effect:v=>`+${v*20} linh thạch khởi đầu`},
 {key:'phucDuyen',name:'Phúc Duyên',icon:'ICON-MENU-006-40.png',desc:'Duyên lành với thiên địa, tăng lợi tức khi lịch luyện.',effect:v=>`+${v*2}% linh thạch, +${v*1.5}% linh thảo`},
 {key:'canCot',name:'Căn Cốt',icon:'ICON-MENU-005-40.png',desc:'Thân thể cường kiện, tăng sinh lực và công kích.',effect:v=>`+${v*2}% sinh lực và công kích`},
 {key:'ngoTinh',name:'Ngộ Tính',icon:'ICON-MENU-001-40.png',desc:'Huệ căn thông tuệ, tăng tốc độ tu luyện.',effect:v=>`+${v*1.5}% tốc tu`},
 {key:'vanKhi',name:'Vận Khí',icon:'ICON-MENU-007-40.png',desc:'Vận may hộ thân, tăng bạo kích và tỉ lệ đột phá.',effect:v=>`+${v*0.5}% bạo kích, +${v*0.3}% đột phá`}
];
const TALENT_MAX=8;
const META_UPGRADES={
 exp:{name:'Đạo Tâm',icon:'✧',desc:'+3% tốc độ tu luyện vĩnh viễn mỗi cấp.',cost:[2,3,5,7,10],max:5},
 stone:{name:'Túi Càn Khôn',icon:'◈',desc:'+20 linh thạch khởi đầu mỗi cấp.',cost:[1,2,3,4,6],max:5},
 life:{name:'Trường Sinh',icon:'❋',desc:'+5 năm thọ nguyên khởi đầu mỗi cấp.',cost:[2,3,4,6,8],max:5},
 luck:{name:'Thiên Vận',icon:'✦',desc:'+1 Vận Khí khởi đầu mỗi cấp.',cost:[3,5,8],max:3}
};
const META_ACHIEVEMENTS=[
 {id:'first_break',name:'Phá vỡ tầng đầu',desc:'Đột phá thành công lần đầu.',points:1,check:s=>s.stage>1||s.realm>0},
 {id:'kim_dan',name:'Kết Đan',desc:'Bước vào cảnh giới Kết Đan.',points:2,check:s=>s.realm>=2},
 {id:'nguyen_anh',name:'Nguyên Anh',desc:'Bước vào cảnh giới Nguyên Anh.',points:3,check:s=>s.realm>=3},
 {id:'hoa_than',name:'Hóa Thần',desc:'Bước vào cảnh giới Hóa Thần.',points:3,check:s=>s.realm>=4},
 {id:'luyen_hu',name:'Luyện Hư',desc:'Bước vào cảnh giới Luyện Hư.',points:4,check:s=>s.realm>=5},
 {id:'dao_to',name:'Đạo Tổ',desc:'Chứng đạo, hợp nhất cùng Thiên đạo.',points:6,check:s=>s.realm>=13},
 {id:'kills_100',name:'Trừ yêu trăm trận',desc:'Hạ 100 yêu thú.',points:2,check:s=>(s.progress?.kill||0)>=100},
 {id:'kills_1000',name:'Sát khí ngút trời',desc:'Hạ 1.000 yêu thú.',points:4,check:s=>(s.progress?.kill||0)>=1000},
 {id:'meditate_1h',name:'Nhất tâm bất loạn',desc:'Nhập định 1 giờ.',points:2,check:s=>(s.progress?.meditate||0)>=3600},
 {id:'meditate_10h',name:'Tọa vọng thiên thu',desc:'Nhập định 10 giờ.',points:4,check:s=>(s.progress?.meditate||0)>=36000},
 {id:'alchemy_10',name:'Lò lửa tinh thông',desc:'Luyện thành 10 mẻ đan.',points:2,check:s=>(s.progress?.alchemy||0)>=10},
 {id:'breaks_10',name:'Mười lần phá cảnh',desc:'Đột phá thành công 10 lần.',points:2,check:s=>(s.progress?.breaks||0)>=10},
 {id:'rebirth_1',name:'Nhất niệm luân hồi',desc:'Trọng sinh lần đầu.',points:3,check:s=>s.rebirths>=1},
 {id:'rebirth_5',name:'Ngũ kiếp tu hành',desc:'Trọng sinh 5 lần.',points:6,check:s=>s.rebirths>=5},
 {id:'pvp_10',name:'Luận kiếm thập thắng',desc:'Thắng 10 trận PvP.',points:3,check:s=>(s.social?.pvp?.wins||0)>=10},
 {id:'friends_3',name:'Tri kỷ tứ phương',desc:'Kết giao 3 vị đạo hữu.',points:3,check:s=>Object.values(s.social?.friends||{}).filter(f=>f?.metAt>0).length>=3}
];
const NAME_FAMILY=['Hàn','Lục','Tô','Mạc','Vũ','Diệp','Bạch','Tạ','Lăng','Âu Dương','Thượng Quan','Tiêu','Lý','Phong','Mộ Dung','Đoàn'];
const NAME_MALE=['Thiên Sơn','Vô Kỵ','Chấn Phong','Hạo Nhiên','Nghịch Thiên','Thanh Vân','Kiếm Tâm','Tử Hiên','Minh Triết','Trường Không','Dạ Lan','Khải Lăng'];
const NAME_FEMALE=['Nhược Vân','Tuyết Nhi','Linh Âm','Thanh Ngọc','Hồng Y','Yên Hà','Mộng Điệp','Tử Yên','Băng Tâm','Thu Thủy','Lam Nguyệt','Dao Quang'];
const raceName=id=>(RACES.find(r=>r[0]===(LEGACY_RACES[id]||id))||RACES[0])[1];
const RACE_LIFE={nhan:.8,ma:.9,yeu:1.2,linh:1,tien_due:1.5,thu:.7};
const RACE_BONUS={nhan:{hp:.05,atk:.05,rate:.05},ma:{atk:.2},yeu:{hp:.25},linh:{rate:.1},tien_due:{rate:.15},thu:{hp:.1,atk:.1,rate:-.1}};
const raceLife=(race,realm=0)=>Math.round(F.lifespan(realm)*(RACE_LIFE[race]||1));
const raceBonus=race=>RACE_BONUS[race]||{};
const startStone=(talent,meta)=>380+(talent?.tuongMao||0)*20+(meta?.upgrades?.stone||0)*20;
function rollRace(rng=Math.random){let r=rng()*100,acc=0;for(const [id,,w] of RACES){acc+=w;if(r<acc)return id}return 'nhan'}
const oneOf=(a,rng)=>a[Math.floor(rng()*a.length)];
function randomName(gender='nam',rng=Math.random){return (oneOf(NAME_FAMILY,rng)+' '+oneOf(gender==='nu'?NAME_FEMALE:NAME_MALE,rng)).slice(0,NAME_MAX)}
function cleanName(raw){const c=String(raw??'').normalize('NFC').replace(/\s+/g,' ').trim();return c.length>=2&&c.length<=NAME_MAX&&!/[\u0000-\u001f\u007f<>&"'`[\]]/.test(c)?c:null}
const API={rootType,rollRoots,DI_LINH_CAN:R.DI_LINH_CAN,ROOT_GROUPS:R.GROUPS,ROOT_TYPES:R.TYPES,rootLabel:R.label,DI_KEYS:R.DI_KEYS,CHAOS:R.CHAOS,diFromRoots:R.diFromRoots,RACES,LEGACY_RACES,NAME_MAX,TALENT_INFO,TALENT_MAX,META_UPGRADES,META_ACHIEVEMENTS,RACE_LIFE,RACE_BONUS,raceName,raceLife,raceBonus,startStone,rollRace,randomName,cleanName};
root.HU_CHARACTER=API;if(node)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
