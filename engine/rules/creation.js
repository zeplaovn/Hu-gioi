/* Miền luật: creation — dựng nhân vật từ hồ sơ do màn tạo nhân vật gửi.
   Bên sở hữu phiên chọn now và RNG; engine không tự lấy đồng hồ hay ngẫu nhiên. */
(function (root) {
  'use strict';
  const domain = 'creation';
  const commands = Object.freeze([]);

  function install(API) {
    const H = API;

    H.createCharacter = function (profile, now, rng) {
      if (!profile || typeof profile !== 'object' || Array.isArray(profile)) throw Error('Hồ sơ nhân vật không hợp lệ.');
      if (!Number.isFinite(now)) throw Error('Thiếu thời gian tạo nhân vật.');
      if (typeof rng !== 'function') throw Error('Thiếu nguồn ngẫu nhiên.');
      const name = H.cleanName(profile.name), talent = {}, keys = H.TALENT_INFO.map(t => t.key);
      if (!name) throw Error('Đạo hiệu không hợp lệ.');
      if (!['nam', 'nu'].includes(profile.gender) || !H.RACES.some(r => r[0] === profile.race)) throw Error('Hồ sơ nhân vật không hợp lệ.');
      if (!Number.isInteger(profile.age) || profile.age < 14 || profile.age > 30) throw Error('Tuổi khởi nguyên không hợp lệ.');
      if (!Array.isArray(profile.roots) || profile.roots.length !== 5 || !profile.roots.every(n => Number.isInteger(n) && n >= 0 && n <= 100) || !Object.hasOwn(H.F.LINH_CAN_RATE, profile.rootType)) throw Error('Linh căn không hợp lệ.');
      /* Hỗn Độn chỉ đạt được sau lôi kiếp; Dị phải có biến thể hợp lệ, các loại khác không có. */
      if (profile.rootType === 'Hỗn Độn') throw Error('Hỗn Độn linh căn chỉ có thể đạt được sau lôi kiếp.');
      if (profile.rootType === 'Âm Dương') throw Error('Âm Dương linh căn không còn được tạo mới.');
      const rootSub = profile.rootType === 'Dị' ? profile.rootSub : '';
      if (profile.rootType === 'Dị' && !Object.hasOwn(H.DI_LINH_CAN, rootSub)) throw Error('Dị linh căn không hợp lệ.');
      /* Loại linh căn phải khớp điểm các hệ: ngũ hành suy từ số hệ đạt 50 điểm; Dị chỉ có đúng một hệ gốc (thuộc `from` của biến thể) đạt 50. */
      const strong = profile.roots.reduce((a, n, i) => (n >= 50 ? a.concat(i) : a), []);
      if (!strong.length) throw Error('Linh căn không khớp: chưa có hệ nào đạt 50 điểm.');
      if (profile.rootType === 'Dị') {
        if (strong.length !== 1 || !H.DI_LINH_CAN[rootSub].from.includes(strong[0])) throw Error('Dị linh căn không khớp hệ gốc của biến thể.');
      } else if (H.rootType(profile.roots) !== profile.rootType) throw Error('Linh căn không khớp với số hệ đạt 50 điểm.');
      let total = 0;
      for (const key of keys) {
        const n = profile.talent?.[key] ?? 0;
        if (!Number.isInteger(n) || n < 0 || n > H.TALENT_MAX) throw Error('Thiên phú không hợp lệ.');
        talent[key] = n;
        total += n;
      }
      if (total > H.TALENT_MAX) throw Error('Thiên phú vượt quá 8 điểm.');
      if (total !== H.TALENT_MAX) throw Error('Phải phân bổ đủ 8 điểm thiên phú trước khi vào game.');
      const s = H.create(now);
      Object.assign(s, { name, gender: profile.gender, race: profile.race, roots: [...profile.roots], rootType: profile.rootType, rootSub, age: profile.age, talent, created: true });
      s.stone = H.startStone(talent);
      const g = new H.Game(s, rng);
      g.add('MAT-001', 8);
      g.add('INK-HG', 2);
      s.hp = g.stats().HP;
      s.mp = g.maxMp();
      const label = H.rootLabel(s.rootType, s.rootSub);
      g.log(`Thọ nguyên dự kiến ${H.raceLife(s.race, 0)} tuổi. Bạn đã nhập định — tu vi tự tăng theo thời gian.`);
      g.log(`Bạn mở mắt ra: ${name}, ${s.age} tuổi, chủng tộc ${H.raceName(s.race)}, mang ${label} giữa Hư Giới.`);
      return s;
    };
  }

  const mod = Object.freeze({ domain, commands, install });
  (root.HU_RULES = root.HU_RULES || {})[domain] = mod;
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
})(typeof window !== 'undefined' ? window : globalThis);
