/* Kinh mạch theo thiết kế root.txt (mục 4 và 5): dữ liệu thuần + hàm xem trước khi tạo nhân vật.
   Kinh mạch KHÔNG có mã; nhận diện bằng tên. Chưa là trạng thái của engine: trang tạo nhân vật chỉ dùng để xem trước. */
(function (root) {
  'use strict';
  const ELEMENTS = ['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'];

  /* Màu hệ (root.txt mục 0): kim bạc, mộc xanh lá, thổ nâu vàng, hỏa đỏ, thủy xanh dương,
     phong trắng, độc xanh lá đậm, băng xanh dương nhạt, lôi tím, hỗn độn đen trắng. */
  const HE_COLOR = {
    Kim: '#cfd8de', Mộc: '#6fd36f', Thổ: '#c9a24f', Hỏa: '#f0604d', Thủy: '#4aa8f2',
    Phong: '#f4f4f4', Độc: '#2f9e55', Băng: '#a8e4ff', Lôi: '#b58aff', 'Hỗn Độn': '#e8e8e8', 'Trung hòa': '#9aa7ad'
  };
  /* Màu phẩm cấp (root.txt mục 0): phàm trắng, linh tím, huyền vàng, địa đỏ, thiên ngũ sắc. */
  const RARITY = {
    phàm: { name: 'Phàm', color: '#f1f1f1' }, linh: { name: 'Linh', color: '#b98cff' }, huyền: { name: 'Huyền', color: '#f2cf5b' },
    địa: { name: 'Địa', color: '#f0604d' }, thiên: { name: 'Thiên', color: '#ffd9a0', rainbow: true }
  };

  /* Tương sinh: mộc -> hỏa -> thổ -> kim -> thủy -> mộc. Tương khắc: mộc -> thổ -> thủy -> hỏa -> kim -> mộc. */
  const SINH = { Mộc: 'Hỏa', Hỏa: 'Thổ', Thổ: 'Kim', Kim: 'Thủy', Thủy: 'Mộc' };
  const KHAC = { Mộc: 'Thổ', Thổ: 'Thủy', Thủy: 'Hỏa', Hỏa: 'Kim', Kim: 'Mộc' };
  const SINH_RA = Object.fromEntries(Object.entries(SINH).map(([a, b]) => [b, a]));

  /* [tên, tên ngắn, hệ, số huyệt, stat khi t = 100, hiệu ứng viên mãn] */
  const CHINH_KINH = [
    ['Thủ Thái Âm Phế Kinh', 'Phế', 'Kim', 11, 'công kích +3%, bạo kích +1%', 'công pháp kim +3% sát thương'],
    ['Thủ Dương Minh Đại Trường Kinh', 'Đại Trường', 'Kim', 20, 'phòng thủ +3%, thể lực +3%', 'thải 5% tạp chất mỗi lần tu luyện'],
    ['Túc Dương Minh Vị Kinh', 'Vị', 'Thổ', 45, 'sinh lực +3%', 'đan hồi sinh lực hiệu quả +5%'],
    ['Túc Thái Âm Tỳ Kinh', 'Tỳ', 'Thổ', 21, 'phòng thủ +3%, sinh lực +2%', 'giảm 2% sát thương nhận vào'],
    ['Thủ Thiếu Âm Tâm Kinh', 'Tâm', 'Hỏa', 9, 'công kích +3%, sát thương bạo kích +3%', 'công pháp hỏa +3% sát thương'],
    ['Thủ Thái Dương Tiểu Trường Kinh', 'Tiểu Trường', 'Hỏa', 19, 'linh lực +3%', 'đan tu vi hấp thụ +3%'],
    ['Túc Thái Dương Bàng Quang Kinh', 'Bàng Quang', 'Thủy', 67, 'linh lực +3%, né tránh +1%', 'kháng độc +5%'],
    ['Túc Thiếu Âm Thận Kinh', 'Thận', 'Thủy', 27, 'linh lực +3%, thể lực +4%', 'thọ nguyên +1%'],
    ['Thủ Quyết Âm Tâm Bào Kinh', 'Tâm Bào', 'Trung hòa', 9, 'giảm 1% sát thương nhận vào', 'kháng choáng +5%'],
    ['Thủ Thiếu Dương Tam Tiêu Kinh', 'Tam Tiêu', 'Trung hòa', 23, 'tốc độ hấp thụ linh khí +3%', 'hồi linh lực ngoài chiến đấu +5%'],
    ['Túc Thiếu Dương Đởm Kinh', 'Đởm', 'Mộc', 44, 'bạo kích +1%, né tránh +2%', 'công pháp mộc +3% hiệu quả'],
    ['Túc Quyết Âm Can Kinh', 'Can', 'Mộc', 14, 'sinh lực +3%, hồi sinh lực +3%', 'hồi sinh lực từ công pháp +5%']
  ].map(([name, short, he, points, stat, perfect]) => ({ name, short, kind: 'chính kinh', he, rarity: 'phàm', opens: 'Luyện Khí', points, stat, perfect }));

  /* [tên, độ hiếm, stat khi t = 100, hiệu ứng viên mãn] (mở cùng lúc khi đạt Trúc Cơ, hệ trung hòa) */
  const KY_KINH = [
    ['Nhâm Mạch', 'linh', 'linh lực +8%, hồi linh lực +5%', 'mở ô "hồi linh lực khi nghỉ"'],
    ['Đốc Mạch', 'linh', 'công kích +8%, bạo kích +3%', 'đòn đầu tiên mỗi trận +10% sát thương'],
    ['Xung Mạch', 'huyền', 'sinh lực +10%, hồi sinh lực +3%', 'hồi 3% sinh lực khi sinh lực < 30% (hồi chiêu 60 giây)'],
    ['Đới Mạch', 'huyền', 'phòng thủ +8%', 'kháng "phong mạch" +30%'],
    ['Âm Kiều Mạch', 'địa', 'thể lực +10%, linh lực +5%', 'giảm 5% tiêu hao linh lực công pháp'],
    ['Dương Kiều Mạch', 'địa', 'né tránh +5%, tốc độ ra chiêu +5%', 'né thành công: hồi 1% thể lực'],
    ['Âm Duy Mạch', 'địa', 'kháng độc/băng +10%', 'miễn nhiễm 1 hiệu ứng khống chế đầu tiên mỗi trận'],
    ['Dương Duy Mạch', 'địa', 'sát thương bạo kích +15%', 'bạo kích có 10% tạo thêm 1 đòn đánh phụ']
  ].map(([name, rarity, stat, perfect]) => ({ name, short: name.replace(' Mạch', ''), kind: 'kỳ kinh', he: 'Trung hòa', rarity, opens: 'Trúc Cơ', points: null, stat, perfect }));

  const THIEN_MACH = {
    name: 'Hỗn Độn Thiên Mạch', kind: 'đặc thù', he: 'Hỗn Độn', rarity: 'thiên', opens: 'Khi có Hỗn Độn linh căn',
    stat: 'sinh lực +5%, linh lực +5%, công kích +5%, phòng thủ +5%', perfect: 'miễn tạp chất; mọi mạch cùng hệ được tính như "cùng hệ với linh căn"'
  };

  /* Hệ số tốc độ tu luyện theo số hệ của linh căn (root.txt mục 4.1). */
  const COUNT_RATE = { 1: 1.5, 2: 1.2, 3: 1.0, 4: 0.8, 5: 0.6 };
  const COUNT_NAME = { 1: 'Đơn linh căn', 2: 'Song linh căn', 3: 'Tam linh căn', 4: 'Tứ linh căn', 5: 'Ngũ linh căn (tạp)' };
  /* Dị linh căn biến dị từ hệ nào (root.txt mục 4.2). */
  const DI_SOURCE = { phong: ['Mộc', 'Thủy'], doc: ['Mộc', 'Thổ'], bang: ['Thủy'], loi: ['Hỏa', 'Thủy'] };
  const DI_HE = { phong: 'Phong', doc: 'Độc', bang: 'Băng', loi: 'Lôi' };
  /* Bonus tốc độ thông kinh mạch (mục 5.3b) và tạp chất (5.3d). */
  const SAME_SPEED = 1.25, SAME_STAT = 1.5, SINH_SPEED = 1.10;
  const BONUS_TU_LUYEN = { chinh: 0.02, tamTieu: 0.03, ky: 0.03 };

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  /* Các hệ ngũ hành đang hoạt động của nhân vật (điểm >= 50). Dị tính "cùng hệ" với hệ nguồn biến dị. */
  function activeHe(roots) { return ELEMENTS.filter((_, i) => (roots[i] || 0) >= 50); }
  /* Độ tinh khiết 0-100%: điểm trung bình của các hệ đang hoạt động. */
  function purity(roots) {
    const act = ELEMENTS.map((_, i) => roots[i] || 0).filter(v => v >= 50);
    return act.length ? clamp(Math.round(act.reduce((a, b) => a + b, 0) / act.length), 0, 100) : 0;
  }
  /* Tạp chất Z tăng mỗi phút thực = (số hệ - 1) x 0.5 x (1 - tinh khiết/100). */
  function zPerMinute(heCount, purityPct) { return Math.max(0, (heCount - 1) * 0.5 * (1 - purityPct / 100)); }
  /* phạt tốc tu theo Z: <50: 0 | 50-79: 10% | 80-99: 30% | 100: tẩu hỏa nhập ma */
  function zPenalty(z) { return z >= 100 ? 1 : z >= 80 ? 0.3 : z >= 50 ? 0.1 : 0; }

  /* Quan hệ của một mạch với linh căn: 'same' (cùng hệ), 'sinh' (hệ sinh ra hệ linh căn), 'none'. */
  function relation(he, heList) {
    if (he === 'Trung hòa' || !heList.length) return 'none';
    if (heList.includes(he)) return 'same';
    if (heList.some(h => SINH_RA[h] === he)) return 'sinh';
    return 'none';
  }

  /* Xem trước cho một linh căn: số mạch cùng hệ / sinh hệ, tạp chất, tốc tu tối đa từ mạch. */
  function preview(roots, type, sub) {
    const heList = activeHe(roots), count = type === 'Dị' ? 1 : Math.max(1, heList.length), pur = purity(roots);
    const rel = CHINH_KINH.map(m => relation(m.he, type === 'Hỗn Độn' ? ELEMENTS : heList));
    const z = zPerMinute(count, pur);
    return {
      heList, count, purity: pur, rel,
      same: rel.filter(r => r === 'same').length, sinh: rel.filter(r => r === 'sinh').length,
      neutral: CHINH_KINH.filter(m => m.he === 'Trung hòa').length,
      zPerMinute: z, zMinutes: z > 0 ? 100 / z : Infinity, zPenaltyAt50: z > 0 ? 50 / z : Infinity,
      countRate: COUNT_RATE[count] || 1, countName: COUNT_NAME[count] || '',
      /* tối đa lý thuyết từ mạch: 12 chính kinh x 2% + Tam Tiêu 3% + 8 kỳ kinh x 3% = 51% */
      maxBonus: 12 * BONUS_TU_LUYEN.chinh + BONUS_TU_LUYEN.tamTieu + 8 * BONUS_TU_LUYEN.ky,
      diHe: type === 'Dị' ? DI_HE[sub] || null : null, diFrom: type === 'Dị' ? DI_SOURCE[sub] || [] : []
    };
  }

  const API = {
    ELEMENTS, HE_COLOR, RARITY, SINH, KHAC, SINH_RA, CHINH_KINH, KY_KINH, THIEN_MACH,
    COUNT_RATE, COUNT_NAME, DI_SOURCE, DI_HE, SAME_SPEED, SAME_STAT, SINH_SPEED, BONUS_TU_LUYEN,
    activeHe, purity, zPerMinute, zPenalty, relation, preview
  };
  root.HU_MERIDIANS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
