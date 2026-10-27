/* Nội dung chuyển từ Hu-gioi; nhịp chơi và phần thưởng dùng mô hình workspace. */
(function (root) {
  'use strict';
  const ELEMENT_NAMES = ['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'];
  const BEATS = [1, 4, 3, 0, 2];
  const TEMPER_EFFECTS = [
    { attack: .012, crit: .002 }, { hp: .015, regen: .0002 },
    { rate: .01, dodge: .002 }, { attack: .008, crit: .004 }, { guard: .015, hp: .008 }
  ];
  const DUNGEONS = [
    ['moc', 'Thanh Mộc Lâm', 1, 0, 5, 60, 'Cổ Mộc Yêu Vương', 'Rừng cổ linh khí dày đặc, yêu thú ẩn sau tán lá.'],
    ['thuy', 'Huyền Thủy Đàm', 2, 0, 5, 60, 'Huyền Thủy Giao', 'Thủy tộc canh giữ linh tuyền dưới đáy đầm.'],
    ['hoa', 'Xích Viêm Động', 3, 1, 6, 90, 'Xích Viêm Ma Sư', 'Dung nham nóng rực, hỏa linh hoành hành.'],
    ['kim', 'Kim Phong Cốc', 0, 2, 6, 90, 'Kim Giáp Kiếm Linh', 'Gió sắc như đao, kiếm khí phủ kín thung lũng.'],
    ['tho', 'Hậu Thổ Thiên Cung', 4, 2, 7, 120, 'Hậu Thổ Khôi Vương', 'Khôi lỗi đá canh giữ cung điện chôn sâu.'],
    ['ma', 'Cửu U Ma Uyên', -1, 3, 8, 150, 'Cửu U Ma Chủ', 'Vực sâu ma khí cuồn cuộn, không thuộc ngũ hành.'],
    ['loi', 'Lôi Đình Cổ Điện', -1, 5, 9, 180, 'Lôi Đình Cổ Thú', 'Thiên lôi tôi luyện cổ điện qua ngàn năm.'],
    ['tien', 'Thái Cổ Tiên Phủ', -1, 7, 10, 240, 'Thủ Hộ Tiên Linh', 'Di tích tiên nhân thượng cổ, hung hiểm khôn lường.'],
    ['kiephai', 'Thiên Môn Kiếp Hải', -1, 8, 10, 300, 'Thiên Môn Kiếp Chủ', 'Vượt biển kiếp lôi để chạm tới cánh cửa tiên giới.']
  ].map(([id, name, element, realm, floors, seconds, boss, desc]) => ({ id, name, element, realm, floors, seconds, boss, desc }));
  const ENCOUNTER_RARITIES = [
    { name: 'Thường', weight: 62, color: '#7fdcff', mult: 1 },
    { name: 'Hiếm', weight: 26, color: '#69dba0', mult: 2 },
    { name: 'Cực hiếm', weight: 10, color: '#ffad72', mult: 4 },
    { name: 'Thiên cơ', weight: 2, color: '#edca62', mult: 6 }
  ];
  const ENCOUNTERS = [
    ['suoi', 'Linh Tuyền Bên Suối', 0, 'stone', 'Một túi linh thạch nằm bên dòng suối cổ.'],
    ['nong', 'Lão Nông Chỉ Điểm', 0, 'exp', 'Lão nông truyền lại một cách điều tức giản dị.'],
    ['qua', 'Quả Dại Linh Khí', 0, 'heal', 'Hương quả rừng làm dịu thương tích.'],
    ['quynhan', 'Quý Nhân Giúp Đỡ', 0, 'stone', 'Một vị tiền bối tặng lộ phí trên tiên lộ.'],
    ['duoc', 'Hái Dược Thảo', 0, 'herb', 'Linh thảo mọc giữa vách đá phủ sương.'],
    ['thien', 'Nghe Thiền Ngộ Đạo', 0, 'exp', 'Tiếng giảng thiền khiến tâm cảnh thông suốt.'],
    ['hat', 'Hạt Giống Từ Trời Rơi', 0, 'seed', 'Linh điểu đánh rơi hạt giống trước mặt.'],
    ['lua', 'Kẻ Lừa Đảo', 0, 'loss', 'Một cuộc đổi chác khiến bạn hao hụt lộ phí.'],
    ['chuong', 'Chướng Khí Núi Hoang', 0, 'hurt', 'Bạn thoát khỏi chướng khí, mang theo chút thương tích.'],
    ['ditich', 'Di Tích Tu Sĩ Cổ', 1, 'exp', 'Đạo niệm lưu trong di tích soi sáng đường tu.'],
    ['mach', 'Mạch Linh Thạch Nhỏ', 1, 'stone', 'Dưới lớp đá cũ là một mạch linh thạch.'],
    ['dong', 'Động Thiên Phúc Địa', 1, 'pill', 'Linh đan còn nguyên trong động phủ bỏ hoang.'],
    ['caonhan', 'Cao Nhân Điểm Hóa', 1, 'essence', 'Cao nhân giúp ngưng tụ tinh hoa linh căn.'],
    ['tuyen', 'Linh Tuyền Tẩy Thể', 1, 'heal', 'Linh tuyền gột sạch mỏi mệt thân thể.'],
    ['conghuong', 'Nguyên Tố Cộng Hưởng', 1, 'essence', 'Linh căn cộng hưởng với thiên địa.'],
    ['thuongnhan', 'Thương Nhân Bí Ẩn', 1, 'material', 'Khách qua đường để lại linh tài quý.'],
    ['thienthu', 'Thiên Thư Truyền Thừa', 2, 'manual', 'Thiên thư cổ chứa một phần đạo pháp.'],
    ['tho', 'Trường Thọ Quả Chín Muồi', 2, 'life', 'Trái chín chứa sinh cơ thuần khiết.'],
    ['phacanh', 'Linh Đan Trên Vách Đá', 2, 'break', 'Linh đan hỗ trợ phá cảnh nằm trong khe đá.'],
    ['trieu', 'Linh Khí Triều Tịch', 2, 'exp', 'Linh khí dâng lên như thủy triều.'],
    ['tinhhoa', 'Tinh Hoa Đất Trời', 2, 'allEssence', 'Ngũ hành kết tinh giữa trời đất.'],
    ['tayan', 'Thiên Địa Linh Dịch', 3, 'allEssence', 'Linh dịch ngưng tụ tinh hoa để tôi luyện đạo căn.'],
    ['tiennhan', 'Tiên Nhân Quán Đỉnh', 3, 'insight', 'Hư ảnh tiên nhân truyền đạo, bồi dưỡng sinh cơ.']
  ].map(([id, name, rarity, effect, desc]) => ({ id, name, rarity, effect, desc }));
  const SECTS = [
    { id: 'thanhvan', name: 'Thanh Vân Tông', desc: 'Chính đạo hộ thế · nhiệm vụ trừ yêu, hộ trận.', bonus: 'Công kích +3%', attack: .03 },
    { id: 'huyetsat', name: 'Huyết Sát Môn', desc: 'Lấy chiến dưỡng đạo · nhiệm vụ săn thú, luyện huyết.', bonus: 'Bạo kích +2 điểm %', crit: .02 },
    { id: 'vanduoc', name: 'Vạn Dược Cốc', desc: 'Đan đạo dưỡng sinh · nhiệm vụ hái thuốc, cứu người.', bonus: 'Tốc tu +3%', rate: .03 }
  ];
  const SECT_RANKS = [
    ['Ngoại môn đệ tử', 0, 1], ['Nội môn đệ tử', 180, 2], ['Chân truyền đệ tử', 650, 3],
    ['Chấp sự', 1800, 4], ['Trưởng lão', 4500, 5], ['Thái thượng trưởng lão', 10000, 5]
  ].map(([name, at, tier], index) => ({ name, at, tier, index, stipend: 1 + index * .1 }));
  const SECT_MISSIONS = [
    { id: 'patrol', name: 'Tuần sơn trừ yêu', desc: 'Quét yêu khí quanh sơn môn.', seconds: 90, contribution: 35, minRealm: 0, tier: 1, legacy: true },
    { id: 'herb', name: 'Hái thuốc linh điền', desc: 'Thu hoạch linh thảo cho tông môn.', seconds: 120, contribution: 55, minRealm: 0, tier: 1, legacy: true },
    { id: 'escort', name: 'Hộ tống đệ tử', desc: 'Đưa đệ tử ngoại môn qua yêu vực.', seconds: 180, contribution: 90, minRealm: 2, tier: 1, legacy: true },
    { id: 'relic', name: 'Thám hiểm bí cảnh', desc: 'Tìm di vật trong cấm địa tông môn.', seconds: 300, contribution: 160, minRealm: 5, tier: 1, legacy: true }
  ];
  const missionNames = [
    [null, 'tap', [
      'Quét dọn Tàng Kinh Các', 'Canh giữ sơn môn', 'Vận chuyển vật tư',
      'Tuần tra ngoại vi', 'Khai thác quặng linh', 'Hộ tống thương đội',
      'Trấn áp yêu thú', 'Điều tra dị tượng', 'Truyền công cho sư đệ',
      'Đột kích sào huyệt', 'Hộ tống trưởng lão', 'Dò xét di tích cổ',
      'Trấn thủ phong ấn', 'Truy sát tà tu', 'Thám hiểm cấm địa'
    ]],
    ['thanhvan', 'tv', ['Giảng đạo cho phàm nhân', 'Diệt sói quanh thôn', 'Cứu viện yêu họa', 'Dẫn đường tân đệ tử', 'Phá trận ma tu', 'Bảo vệ linh mạch', 'Khảo hạch nội môn', 'Săn yêu vương', 'Hộ tông đại trận', 'Chinh phạt biên cương']],
    ['huyetsat', 'hs', ['Thu thập huyết khí', 'Chặn chuyến hàng', 'Săn Huyết Điêu', 'Thu phục thôn trại', 'Tế luyện huyết đan', 'Phục kích đối thủ', 'Luyện hóa huyết trì', 'Chiếm giữ linh mạch', 'Chủ trì huyết tế', 'Trấn áp phản đồ']],
    ['vanduoc', 'vd', ['Hái thảo dược', 'Phân loại dược liệu', 'Chữa bệnh phàm nhân', 'Chăm vườn linh dược', 'Tìm Huyết Tham', 'Phụ luyện đan', 'Thu mua dược liệu', 'Giải độc đồng môn', 'Luyện Hoàn Hồn Đan', 'Tìm linh dược vạn năm']]
  ];
  for (const [sect, prefix, names] of missionNames) names.forEach((name, i) => {
    const tier = 1 + Math.floor(i / (sect ? 2 : 3));
    SECT_MISSIONS.push({ id: prefix + (i + 1), name, sect, tier, minRealm: [0, 0, 1, 2, 4][tier - 1],
      desc: sect ? 'Ủy thác riêng của ' + SECTS.find(s => s.id === sect).name + '.' : 'Ủy thác chung của tông môn.',
      seconds: [90, 150, 210, 300, 420][tier - 1] + (i % 2) * 15,
      contribution: [35, 65, 100, 155, 230][tier - 1], stat: ['ngoTinh', 'canCot', 'phucDuyen'][i % 3]
    });
  });
  const SECT_SHOP = [
    { id: 'qi', name: 'Đan tu vi', kind: 'PILL', effect: 'TU_VI', count: 2, cost: 120, rank: 0 },
    { id: 'heal', name: 'Đan hồi phục', kind: 'PILL', effect: 'HOI_PHUC', count: 2, cost: 100, rank: 0 },
    { id: 'ore', name: 'Linh tài', kind: 'MAT', count: 4, cost: 140, rank: 0 },
    { id: 'seed', name: 'Hạt linh thảo', kind: 'SEED', count: 2, cost: 130, rank: 1 },
    { id: 'break', name: 'Đan đột phá', kind: 'PILL', effect: 'DOT_PHA', count: 1, cost: 250, rank: 0 },
    { id: 'essence', name: 'Tinh hoa linh căn', count: 3, cost: 180, rank: 2 },
    { id: 'life', name: 'Đan thọ nguyên', kind: 'PILL', effect: 'THO_NGUYEN', count: 1, cost: 400, rank: 3 },
    { id: 'ward', name: 'Phù hộ kiếp', kind: 'TAL', effect: 'KIEP', count: 1, cost: 180, rank: 1, sect: 'thanhvan' },
    { id: 'power', name: 'Đan chiến đấu', kind: 'PILL', effect: 'CHIEN_DAU', count: 1, cost: 180, rank: 1, sect: 'huyetsat' },
    { id: 'herbs', name: 'Linh thảo', kind: 'HERB', count: 4, cost: 100, rank: 0, sect: 'vanduoc' }
  ];
  const data = { ELEMENT_NAMES, BEATS, TEMPER_EFFECTS, TEMPER_MAX: 10, DUNGEONS, ENCOUNTER_RARITIES, ENCOUNTERS, ENCOUNTER_INTERVAL: 180, SECTS, SECT_RANKS, SECT_MISSIONS, SECT_SHOP };
  root.HU_ADVENTURE_DATA = data;
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
})(typeof window !== 'undefined' ? window : globalThis);
