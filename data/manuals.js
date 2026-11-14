/* Công pháp và bí tịch: phân hệ, số ô, chiêu thức ngoại tu, đan hiếm.
   Thuần dữ liệu và hàm tính, không đọc trạng thái người chơi. Engine và giao diện cùng dùng file này.
   Ba hệ:
   - ngoai: ngoại tu, skill chủ động đặt vào ô, thi triển khi chiến đấu (tiêu hao linh lực, có hồi chiêu).
   - noi:   nội tu, skill bị động, đặt vào ô thì luôn có hiệu lực (tốc độ tu, sinh lực, phòng ngự).
   - nghe:  bí tịch nghề (luyện đan, luyện pháp bảo, vẽ phù), không chiếm ô; học xong là mở nghề.
   Phẩm chất sách (sub: 0 hạ, 1 trung, 2 thượng, 3 cực) và cảnh giới (tier) quyết định độ mạnh. */
(function (root) {
  'use strict';

  const SCHOOLS = Object.freeze({
    ngoai: { id: 'ngoai', label: 'Ngoại tu', mode: 'chủ động', note: 'Đặt vào ô để thi triển khi chiến đấu.' },
    noi: { id: 'noi', label: 'Nội tu', mode: 'bị động', note: 'Đặt vào ô, luôn có hiệu lực khi vận hành.' },
    nghe: { id: 'nghe', label: 'Bí tịch nghề', mode: 'nghề', note: 'Không chiếm ô; học xong là mở nghề.' }
  });
  const TRADES = Object.freeze({ dan: 'Luyện đan', khi: 'Luyện pháp bảo', phu: 'Vẽ phù lục' });
  const QUALITY = Object.freeze(['Hạ phẩm', 'Trung phẩm', 'Thượng phẩm', 'Cực phẩm']);
  const MAX_SLOTS = 4;

  /* Số ô theo cảnh giới (chỉ số từ 0). Ngoại tu mở sớm hơn nội tu một chút. */
  function slots(realm) {
    const r = Math.max(0, Math.floor(Number(realm) || 0));
    return {
      ngoai: Math.min(MAX_SLOTS, 1 + Math.floor((r + 2) / 3)),
      noi: Math.min(MAX_SLOTS, 1 + Math.floor((r + 1) / 3))
    };
  }

  /* Sách thuộc hệ nào. x là vật phẩm kind 'BT'. */
  function school(x) {
    if (!x || x.kind !== 'BT') return null;
    const d = x.design;
    if (d?.group === 'công pháp') return 'ngoai';
    if (d?.group === 'bí tịch') return d['thể loại'] === 'luyện khí' ? 'noi' : 'nghe';
    if (x.effect === 'TOC' || x.effect === 'PHONG') return 'noi';
    if (x.effect === 'DAN') return 'nghe';
    return 'ngoai';
  }

  /* Nghề của bí tịch nghề: dan | khi | phu, hoặc null. */
  function trade(x) {
    if (school(x) !== 'nghe') return null;
    const t = x.design?.['thể loại'];
    if (t === 'luyện pháp bảo') return 'khi';
    if (t === 'vẽ phù lục') return 'phu';
    return 'dan';
  }

  /* Phẩm chất sách nhân lên độ mạnh chiêu thức: hạ 1.0, trung 1.3, thượng 1.6, cực 1.9. */
  const quality = x => 1 + .3 * Math.max(0, Math.min(3, Number(x?.sub) || 0));

  /* Chiêu thức của ngoại tu. Trả về mô tả thuần: engine nhân thêm độ thuần thục và lệch cảnh giới.
     kind: attack | guard | heal | evade. mpPct là phần trăm linh lực tối đa. */
  function skillOf(x) {
    if (school(x) !== 'ngoai') return null;
    const d = x.design || {}, q = quality(x), tier = Math.max(0, Number(x.tier) || 0);
    const base = {
      element: d['hệ'] || 'không hệ',
      cooldown: Number(d['hồi chiêu (giây)']) || 5 + Math.min(10, tier),
      mpPct: Math.min(.3, .06 + .012 * tier)
    };
    if (d['công dụng'] === 'phòng ngự' || d.def_bonus)
      return { ...base, kind: 'guard', value: (d.def_bonus || 15) * q, seconds: Number(d['thời gian buff (giây)']) || 6 };
    if (d.heal) return { ...base, kind: 'heal', value: d.heal * q };
    if (d['buff stat'] === 'eva')
      return { ...base, kind: 'evade', value: (Number(d['buff giá trị']) || 15) * q, seconds: Number(d['thời gian buff (giây)']) || 10 };
    return { ...base, kind: 'attack', multiplier: (Number(d.atk_multiplier) || 1.2 + .15 * tier) * q };
  }

  /* Đan hiếm: cần bí tịch luyện đan đủ cấp. Cấp sách = tier*4 + sub, cần >= 2*tierĐan + 4.
     Sách phẩm cao bù được cảnh giới thấp hơn. */
  const RARE_EFFECTS = Object.freeze(['KIEP', 'THO_NGUYEN', 'DOT_PHA', 'CUNG_CO']);
  function isRarePill(x) {
    if (!x || x.kind !== 'PILL') return false;
    if (x.effect === 'KIEP' || x.effect === 'THO_NGUYEN') return true;
    return RARE_EFFECTS.includes(x.effect) && x.tier >= 3;
  }
  const rank = x => (Number(x?.tier) || 0) * 4 + (Number(x?.sub) || 0);
  const pillNeed = x => 2 * (Number(x?.tier) || 0) + 4;
  /* learnedItems: danh sách vật phẩm bí tịch đã lĩnh ngộ. */
  function pillGate(pill, learnedItems) {
    if (!isRarePill(pill)) return { rare: false, ok: true, need: 0, have: 0 };
    const have = Math.max(-1, ...learnedItems.filter(m => trade(m) === 'dan').map(rank));
    return { rare: true, ok: have >= pillNeed(pill), need: pillNeed(pill), have };
  }

  /* Mô tả ngắn cho giao diện. */
  function describe(x) {
    const sc = school(x);
    if (sc === 'ngoai') {
      const k = skillOf(x), pct = v => Math.round(v * 100) + '%';
      if (k.kind === 'attack') return `Chiêu công kích · sát thương ×${k.multiplier.toFixed(2)} · hồi ${k.cooldown}s`;
      if (k.kind === 'guard') return `Thủ thế · +${Math.round(k.value)} phòng ngự trong ${k.seconds}s · hồi ${k.cooldown}s`;
      if (k.kind === 'heal') return `Hồi sinh lực ${Math.round(k.value)} · hồi ${k.cooldown}s`;
      return `Thân pháp · +${Math.round(k.value)}% né tránh trong ${k.seconds}s · hồi ${k.cooldown}s`;
    }
    if (sc === 'noi') return x.description || 'Hiệu lực bị động khi vận hành.';
    if (sc === 'nghe') return `Mở nghề ${TRADES[trade(x)].toLowerCase()}. ` + (x.design?.['công dụng'] || x.description || '');
    return '';
  }

  const API = Object.freeze({ SCHOOLS, TRADES, QUALITY, MAX_SLOTS, slots, school, trade, quality, skillOf, isRarePill, pillGate, pillNeed, rank, describe });
  root.HU_MANUALS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
