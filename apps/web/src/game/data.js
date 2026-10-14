export const STATS = ['Tướng Mạo','Phúc Duyên','Căn Cốt','Ngộ Tính','Vận Khí'];
export const RACES = {
  'Nhân': { lifespan: 80, bonus: {} },
  'Ma': { lifespan: 90, bonus: { 'Căn Cốt': 2, 'Tướng Mạo': -1 } },
  'Yêu': { lifespan: 120, bonus: { 'Căn Cốt': 1, 'Ngộ Tính': -1 } },
  'Linh': { lifespan: 100, bonus: { 'Ngộ Tính': 2, 'Căn Cốt': -1 } },
  'Tiên Duệ': { lifespan: 150, bonus: { 'Phúc Duyên': 2, 'Vận Khí': 1, 'Căn Cốt': -2 } },
  'Thú': { lifespan: 70, bonus: { 'Căn Cốt': 3, 'Ngộ Tính': -2 } }
};
export const REALMS = [
  { name:'Phàm Nhân', need:100 }, { name:'Luyện Khí', need:260 }, { name:'Trúc Cơ', need:700 },
  { name:'Kim Đan', need:1800 }, { name:'Nguyên Anh', need:4800 }, { name:'Hóa Thần', need:12000 },
  { name:'Luyện Hư', need:32000 }, { name:'Đại Thừa', need:90000 }, { name:'Độ Kiếp', need:250000 }
];
export const LOCATIONS = [
  { id:'thanh-van', name:'Thanh Vân Thành', realm:0, danger:1 },
  { id:'u-minh', name:'U Minh Lâm', realm:0, danger:2 },
  { id:'bach-cot', name:'Bạch Cốt Sơn', realm:1, danger:3 },
  { id:'van-ha', name:'Vân Hà Cốc', realm:2, danger:4 },
  { id:'thien-mon', name:'Thiên Môn Quan', realm:3, danger:6 },
  { id:'tien-gioi', name:'Tiên Giới', realm:7, danger:9 },
  { id:'than-gioi', name:'Thần Giới', realm:8, danger:12 }
];
export const RECIPES = [
  { id:'dan-khi', name:'Dưỡng Khí Đan', cost:{ herb:2 }, reward:{ pill:1 }, qi:80 },
  { id:'phu-ho', name:'Hộ Thân Phù', cost:{ herb:1, ore:1 }, reward:{ talisman:1 }, hp:30 },
  { id:'linh-kiem', name:'Linh Kiếm', cost:{ ore:3 }, reward:{ sword:1 }, power:8 }
];
export const SECTS = ['Thanh Vân Môn','Thiên Kiếm Tông','Vạn Hoa Cốc','Huyền Minh Giáo'];
