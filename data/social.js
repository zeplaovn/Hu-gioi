/* Các đạo hữu và đối thủ mô phỏng của chế độ hiện tại. */
(function(root){
'use strict';
const PVP_CD=25000,DISCUSS_CD=120000;
const FRIENDS=[
 {id:'trieu-nguyet',name:'Triệu Nguyệt',gender:'nu',realm:2,title:'Thanh Vân kiếm tu',line:'Một kiếm thanh minh, nguyện cùng đạo hữu soi rọi tiên lộ.'},
 {id:'ho-thanh',name:'Hồ Thanh',gender:'nam',realm:4,title:'Tán tu dược sư',line:'Ta giữ vườn thuốc, ngươi giữ đạo tâm. Gặp nhau là duyên.'},
 {id:'bach-tuyet',name:'Bạch Tuyết',gender:'nu',realm:6,title:'Băng cốc truyền nhân',line:'Tuyết rơi vô thanh, nhưng lời hẹn của người ta nhớ rất rõ.'},
 {id:'mac-kiem',name:'Mạc Kiếm',gender:'nam',realm:8,title:'Kiếm si tán nhân',line:'Thiên hạ kiếm pháp vô cùng; có tri kỷ cùng luận mới thú.'}
];
const DAO=[
 {id:'ly-van-du',name:'Lý Vân Du',gender:'nam',realm:1,school:'Kiếm đạo',line:'Đạo hữu, một chén trà đổi một tầng cảnh ngộ?'},
 {id:'to-mong',name:'Tô Mộng',gender:'nu',realm:3,school:'Đan đạo',line:'Linh khí quanh người huynh thật dễ chịu, cùng luận một chút chứ?'},
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
const API={PVP_CD,DISCUSS_CD,FRIENDS,DAO,RIVALS,giftCost};
root.HU_SOCIAL_DATA=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
