/* Các đạo hữu và đối thủ mô phỏng của chế độ hiện tại. */
(function(root){
'use strict';
const PVP_CD=25000,DISCUSS_CD=120000;
const FRIENDS=[
 {id:'trieu-nguyet',name:'Triệu Nguyệt',gender:'nu',realm:2,title:'Thanh Vân kiếm tu',line:'Một kiếm thanh minh, nguyện cùng đạo hữu soi rọi tiên lộ.'},
 {id:'ho-thanh',name:'Hồ Thanh',gender:'nam',realm:4,title:'Tán tu dược sư',line:'Ta chăm vườn linh thảo, đạo hữu giữ vững đạo tâm. Gặp nhau ắt là hữu duyên.'},
 {id:'bach-tuyet',name:'Bạch Tuyết',gender:'nu',realm:6,title:'Băng cốc truyền nhân',line:'Tuyết rơi vô thanh, nhưng lời hẹn của người ta nhớ rất rõ.'},
 {id:'mac-kiem',name:'Mạc Kiếm',gender:'nam',realm:8,title:'Kiếm si tán nhân',line:'Thiên hạ kiếm pháp vô cùng; có tri kỷ cùng luận mới thú.'}
];
const DAO=[
 {id:'ly-van-du',name:'Lý Vân Du',gender:'nam',realm:1,school:'Kiếm đạo',line:'Đạo hữu, một chén trà đổi một tầng cảnh ngộ?'},
 {id:'to-mong',name:'Tô Mộng',gender:'nu',realm:3,school:'Đan đạo',line:'Linh khí quanh đạo hữu thật tinh thuần. Có muốn cùng ta luận đạo một phen chăng?'},
 {id:'han-tu',name:'Hàn Tử',gender:'nam',realm:5,school:'Trận pháp',line:'Trận pháp không chỉ để vây địch, còn để giữ tâm.'},
 {id:'diep-lan',name:'Diệp Lan',gender:'nu',realm:7,school:'Âm dương',line:'Âm dương chuyển hóa, đạo hữu thấy được bao nhiêu phần?'},
 {id:'van-thuong',name:'Vân Thương',gender:'nam',realm:9,school:'Lôi pháp',line:'Sấm sét không đáng sợ; đáng sợ là tâm mình động trước sấm sét.'},
 {id:'dao-quang',name:'Dao Quang',gender:'nu',realm:11,school:'Tinh tú',line:'Mỗi vì sao là một lời nhắc: đừng quên mình đến từ đâu.'}
];
const RIVALS=[
 {id:'hanh-chu',name:'Hành Chu',gender:'nam',realm:2,power:.78,rating:960,school:'Quyền pháp'},
 {id:'lieu-yen',name:'Liễu Yên',gender:'nu',realm:4,power:.96,rating:1010,school:'Phiêu vân kiếm'},
 {id:'thach-cuong',name:'Thạch Cương',gender:'nam',realm:6,power:1.12,rating:1060,school:'Kim cương thể'},
 {id:'tich-da',name:'Tịch Dạ',gender:'nam',realm:8,power:1.28,rating:1120,school:'Ám ảnh đạo'}
];
const giftCost=f=>120+f.realm*90;
/* Chuỗi nhiệm vụ riêng của NPC Hạ Giới: mỗi vai trò có 3 bước, mở dần theo thiện cảm.
   need.type: kill (hạ yêu thú kể từ lúc nhận việc) | gift (nộp món NPC thích) | stone (nộp linh thạch, đơn vị = thu nhập `seconds` giây).
   reward: affinity (thiện cảm), stone (thu nhập `seconds` giây), exp (% tu vi cần), item (xem engine/rules/social.js). */
const NPC_QUESTS={
 'giao nhiệm vụ':[
  {name:'Trừ họa trên đường núi',desc:'Quét sạch yêu thú quanh vùng để dân đi lại yên ổn.',need:{type:'kill',count:25},minAffinity:0,reward:{affinity:10,stone:600}},
  {name:'Quà tạ ơn',desc:'Mang món {likes} cho {npc} để kết tình.',need:{type:'gift',count:3},minAffinity:20,reward:{affinity:15,stone:1200,exp:.03}},
  {name:'Lời hẹn cuối',desc:'Giúp {npc} dẹp loạn yêu thú lần cuối, đổi lấy phần thưởng quý.',need:{type:'kill',count:120},minAffinity:55,reward:{affinity:20,stone:3600,exp:.06,item:{pill:2,count:3}}}
 ],
 'dạy công pháp':[
  {name:'Thử tay kiếm',desc:'Hạ yêu thú để {npc} xem căn cơ của đạo hữu.',need:{type:'kill',count:30},minAffinity:0,reward:{affinity:10,stone:600}},
  {name:'Lễ bái sư',desc:'Dâng {npc} ba phần {likes} làm lễ.',need:{type:'gift',count:3},minAffinity:20,reward:{affinity:15,exp:.04}},
  {name:'Tâm truyền',desc:'Nộp linh thạch làm học phí để {npc} truyền tâm đắc.',need:{type:'stone',seconds:900},minAffinity:55,reward:{affinity:20,exp:.06,item:{mastery:.3}}}
 ],
 'dạy bí tịnh':[
  {name:'Thử tay kiếm',desc:'Hạ yêu thú để {npc} xem căn cơ của đạo hữu.',need:{type:'kill',count:30},minAffinity:0,reward:{affinity:10,stone:600}},
  {name:'Lễ bái sư',desc:'Dâng {npc} ba phần {likes} làm lễ.',need:{type:'gift',count:3},minAffinity:20,reward:{affinity:15,exp:.04}},
  {name:'Tâm truyền',desc:'Nộp linh thạch làm học phí để {npc} truyền tâm đắc.',need:{type:'stone',seconds:900},minAffinity:55,reward:{affinity:20,exp:.06,item:{mastery:.3}}}
 ],
 'bán đồ':[
  {name:'Dẹp loạn thương đạo',desc:'Trừ yêu thú quấy nhiễu thương đạo, giúp {npc} thông đường vận chuyển linh vật.',need:{type:'kill',count:25},minAffinity:0,reward:{affinity:10,stone:600}},
  {name:'Giao tình bền chặt',desc:'Biếu {npc} ba phần {likes}.',need:{type:'gift',count:3},minAffinity:20,reward:{affinity:15,stone:1000}},
  {name:'Dị bảo thương hội',desc:'Góp linh thạch để {npc} đổi lấy dị bảo từ thương hội, rồi cùng chia phần lợi.',need:{type:'stone',seconds:900},minAffinity:55,reward:{affinity:20,exp:.03,item:{offer:5}}}
 ],
 'luyện đan thuê':[
  {name:'Gom linh thảo',desc:'Hạ yêu thú lấy dược liệu cho {npc}.',need:{type:'kill',count:25},minAffinity:0,reward:{affinity:10,stone:600}},
  {name:'Thử lò đan',desc:'Mang {npc} ba phần {likes} để thử lò mới.',need:{type:'gift',count:3},minAffinity:20,reward:{affinity:15,exp:.03}},
  {name:'Đan thành',desc:'Góp linh thạch mở lò, {npc} luyện riêng một mẻ đan.',need:{type:'stone',seconds:900},minAffinity:55,reward:{affinity:20,exp:.05,item:{offer:3}}}
 ]
};
const NPC_DISCOUNT_MAX=.3;
const API={PVP_CD,DISCUSS_CD,FRIENDS,DAO,RIVALS,giftCost,NPC_QUESTS,NPC_DISCOUNT_MAX};
root.HU_SOCIAL_DATA=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
