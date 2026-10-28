/* Phân loại linh căn (tài liệu B2): ba nhóm tách bạch.
   - Ngũ hành cơ bản: Ngụy (tạp) < Tứ hành < Tam hành < Song < Thiên. Thiên = MỘT hệ thuần, không biến thể.
   - Dị linh căn: biến thể cao cấp của một hệ ngũ hành (Băng/Lôi/Phong/Độc), có thế mạnh riêng. KHÁC Thiên linh căn.
   - Chí tôn: Âm Dương (gieo khi tạo nhân vật) và Hỗn Độn (KHÔNG gieo được: chỉ từ Ngụy sau lôi kiếp).
   Dữ liệu thuần, không DOM/RNG; luật nằm ở shared/rules. */
(function (root) {
  'use strict';
  const ELEMENTS = ['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'];

  /* effects cộng vào rootEffects(); from = các hệ gốc có thể sinh ra Dị này (chỉ số trong ELEMENTS). */
  const DI_LINH_CAN = {
    bang: { name: 'Băng', from: [2], role: 'Phong ấn · khống chế', desc: 'Biến thể của Thủy. Sát thương băng hàn, đóng băng pháp bảo và làm chậm đối phương.', effects: { guard: .12, hp: .05 } },
    loi: { name: 'Lôi', from: [3, 0], role: 'Công sát · phá phòng', desc: 'Biến thể của Hỏa hoặc Kim. Chí cương chí dương, phá vỡ hộ thể cương khí.', effects: { attack: .12, crit: .06 } },
    phong: { name: 'Phong', from: [1], role: 'Tốc độ · né tránh', desc: 'Biến thể của Mộc. Nhanh như gió bão, cắt vạn vật bằng phong nhận.', effects: { dodge: .08, crit: .03, rate: .03 } },
    doc: { name: 'Độc', from: [2, 1], role: 'Miễn độc · hồi phục', desc: 'Biến thể của Thủy hoặc Mộc. Miễn dịch bách độc, chướng khí bào mòn kẻ địch.', effects: { regen: .004, attack: .06 } }
  };
  const DI_KEYS = Object.keys(DI_LINH_CAN);

  /* Tạp linh căn (Ngụy) chỉ có cơ hội hóa Hỗn Độn sau khi vượt lôi kiếp (từ Kết Đan trở lên):
     nền + Vận Khí + bảo hiểm cộng dồn theo số lần vượt kiếp mà chưa hóa. */
  const CHAOS = { base: .06, luck: .005, pity: .015, pityMax: .15, cap: .25 };

  /* group: nhóm hiển thị; order: thứ hạng trong nhóm (cao = mạnh). */
  const GROUPS = [
    { id: 'ngu_hanh', name: 'Ngũ hành cơ bản', lead: 'Số hệ đạt từ 50 điểm quyết định loại. Càng ít hệ, linh lực càng tinh thuần.' },
    { id: 'di', name: 'Dị linh căn', lead: 'Biến thể cao cấp của một hệ ngũ hành. Tốc tu ngang Thiên linh căn nhưng có thế mạnh riêng và chiến lực cao hơn.' },
    { id: 'chi_ton', name: 'Chí tôn', lead: 'Cấp thần thoại, nằm trên mọi thang xếp hạng.' }
  ];
  const TYPES = {
    'Ngụy': { group: 'ngu_hanh', order: 0, how: 'Cả năm hệ đạt 50+', desc: 'Linh căn tạp: tốc tu thấp nhất, tạp chất nhiều. Chỉ loại này mới có cơ hội hóa thành Hỗn Độn, và chỉ sau khi vượt lôi kiếp.' },
    'Tứ hành': { group: 'ngu_hanh', order: 1, how: 'Bốn hệ đạt 50+', desc: 'Tiềm lực hạn chế, cần đan dược hỗ trợ để vượt bình cảnh.' },
    'Tam hành': { group: 'ngu_hanh', order: 2, how: 'Ba hệ đạt 50+', desc: 'Chân linh căn: ổn định, đủ sức trúc cơ và tiến xa.' },
    'Song': { group: 'ngu_hanh', order: 3, how: 'Hai hệ đạt 50+', desc: 'Tốc độ nhanh, dễ vượt các bình cảnh nhỏ.' },
    'Thiên': { group: 'ngu_hanh', order: 4, how: 'Đúng một hệ thuần', desc: 'Một hệ ngũ hành thuần túy, tốc tu cực nhanh. Không có biến thể hay thế mạnh riêng như Dị.' },
    'Dị': { group: 'di', order: 0, how: 'Một hệ gốc biến dị: Băng, Lôi, Phong hoặc Độc', desc: 'Khác Thiên linh căn ở chỗ mang thế mạnh đặc thù của biến thể và chiến lực ×1,5.' },
    'Âm Dương': { group: 'chi_ton', order: 0, how: 'Gieo khi tạo nhân vật (rất hiếm)', desc: 'Cân bằng hai thái cực, uy lực bộc phát vượt trội.' },
    'Hỗn Độn': { group: 'chi_ton', order: 1, how: 'Không gieo được: Ngụy hóa thành sau lôi kiếp', desc: 'Bao trùm cả ngũ hành lẫn bốn Dị linh căn, nhận 50% thế mạnh của mỗi Dị.' }
  };

  /* Tên đầy đủ: Dị theo biến thể ("Băng Linh Căn"), các loại đặc biệt viết hoa, còn lại viết thường. */
  function label(type, sub) {
    if (type === 'Dị') return (DI_LINH_CAN[sub] ? DI_LINH_CAN[sub].name + ' ' : 'Dị ') + 'Linh Căn';
    return ['Âm Dương', 'Hỗn Độn'].includes(type) ? type + ' Linh Căn' : type + ' linh căn';
  }
  /* Hệ gốc được ngũ hành nâng lên 50+ của Dị (dùng khi bản lưu cũ chưa có rootSub). */
  function diFromRoots(roots) {
    const i = roots.reduce((b, v, k) => v > roots[b] ? k : b, 0);
    return ['loi', 'phong', 'bang', 'loi', 'doc'][i];
  }

  const API = { ELEMENTS, DI_LINH_CAN, DI_KEYS, CHAOS, GROUPS, TYPES, label, diFromRoots };
  root.HU_ROOTS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
