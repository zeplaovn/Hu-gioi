/* Phân loại linh căn (tài liệu B2): ba nhóm tách bạch.
   - Ngũ hành cơ bản: Ngụy (tạp) < Tứ hành < Tam hành < Song < Thiên. Thiên = MỘT hệ thuần, không biến thể.
   - Dị linh căn: biến thể cao cấp của một hệ ngũ hành (Băng/Lôi/Phong/Độc), có thế mạnh riêng. KHÁC Thiên linh căn.
   - Chí tôn: Âm Dương (gieo khi tạo nhân vật) và Hỗn Độn (không gieo bẩm sinh).
   Dữ liệu thuần, không DOM/RNG; luật nằm ở engine/rules. */
(function (root) {
  'use strict';
  const ELEMENTS = ['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'];

  /* effects cộng vào rootEffects(); from = các hệ gốc có thể sinh ra Dị này (chỉ số trong ELEMENTS). */
  const DI_LINH_CAN = {
    bang: { name: 'Băng', from: [2], role: 'Phong ấn · khống chế', desc: 'Biến thể của Thủy; khắc hệ gốc và không bị hệ gốc khắc.', effects: { guard: .08, mp: .10 } },
    loi: { name: 'Lôi', from: [3, 2], role: 'Công sát · phá phòng', desc: 'Biến thể của Hỏa hoặc Thủy; khắc hệ gốc và không bị hệ gốc khắc.', effects: { attack: .10, crit: .05 } },
    phong: { name: 'Phong', from: [1, 2], role: 'Tốc độ · né tránh', desc: 'Biến thể của Mộc hoặc Thủy; khắc hệ gốc và không bị hệ gốc khắc.', effects: { dodge: .10, sta: .10 } },
    doc: { name: 'Độc', from: [1, 4], role: 'Độc · hộ thể', desc: 'Biến thể của Mộc hoặc Thổ; khắc hệ gốc và không bị hệ gốc khắc.', effects: { hp: .05, attack: .05 } }
  };
  const DI_KEYS = Object.keys(DI_LINH_CAN);

  /* Linh căn ngũ hành có cơ hội hóa Hỗn Độn sau khi vượt lôi kiếp:
     nền + Vận Khí + bảo hiểm cộng dồn theo số lần vượt kiếp mà chưa hóa. */
  const CHAOS = { base: .01, luck: .005, pity: .015, pityMax: .15, cap: .25 };

  /* group: nhóm hiển thị; order: thứ hạng trong nhóm (cao = mạnh). */
  const GROUPS = [
    { id: 'ngu_hanh', name: 'Ngũ hành cơ bản', lead: 'Số hệ đạt từ 50 điểm quyết định loại. Càng ít hệ, linh lực càng tinh thuần.' },
    { id: 'di', name: 'Dị linh căn', lead: 'Biến thể cao cấp của một hệ ngũ hành. Tốc tu ngang Thiên linh căn nhưng có thế mạnh riêng và chiến lực cao hơn.' },
    { id: 'chi_ton', name: 'Chí tôn', lead: 'Cấp thần thoại, nằm trên mọi thang xếp hạng.' }
  ];
  const TYPES = {
    'Ngụy': { group: 'ngu_hanh', order: 0, how: 'Cả năm hệ đạt 50+', desc: 'Linh căn tạp: tốc tu thấp nhất, tạp chất nhiều. Có cơ hội hóa Hỗn Độn sau khi vượt lôi kiếp.' },
    'Tứ hành': { group: 'ngu_hanh', order: 1, how: 'Bốn hệ đạt 50+', desc: 'Tiềm lực hạn chế, cần đan dược hỗ trợ để vượt bình cảnh.' },
    'Tam hành': { group: 'ngu_hanh', order: 2, how: 'Ba hệ đạt 50+', desc: 'Chân linh căn: ổn định, đủ sức trúc cơ và tiến xa.' },
    'Song': { group: 'ngu_hanh', order: 3, how: 'Hai hệ đạt 50+', desc: 'Tốc độ nhanh, dễ vượt các bình cảnh nhỏ.' },
    'Thiên': { group: 'ngu_hanh', order: 4, how: 'Đúng một hệ thuần', desc: 'Một hệ ngũ hành thuần túy, tốc tu cực nhanh. Không có biến thể hay thế mạnh riêng như Dị.' },
    'Dị': { group: 'di', order: 0, how: 'Một hệ gốc biến dị: Băng, Lôi, Phong hoặc Độc', desc: 'Khác Thiên linh căn ở chỗ mang thế mạnh đặc thù của biến thể.' },
    'Âm Dương': { group: 'chi_ton', order: 0, how: 'Gieo khi tạo nhân vật (rất hiếm)', desc: 'Cân bằng hai thái cực, uy lực bộc phát vượt trội.' },
    'Hỗn Độn': { group: 'chi_ton', order: 1, how: 'Không gieo được: ngũ hành biến dị sau lôi kiếp', desc: 'Giữ các hệ thành phần ban đầu; khắc ngũ hành và dị, không bị khắc.' }
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
