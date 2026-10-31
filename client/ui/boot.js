/* HƯ GIỚI · KHỞI ĐỘNG
 * Màn tạo nhân vật, nạp bản lưu, hộp thoại bế quan, sự kiện vòng đời trang. */
(function (root) {
  'use strict';
  const H = root.HU_GAME, F = H.F, A = root.HU_ASSETS;
  const UI = root.HU_UI;
  const { $, $$, esc, num, money, moneyHTML, pct, duration } = UI.kit;
  const { ELEMENTS } = UI.data;
  const store = UI.store;

  const TALENTS = H.TALENT_INFO;
  const TALENT_KEYS = TALENTS.map(t => t.key);
  const TALENT_MAX = H.TALENT_MAX;
  const PM = d => 'media/assets/ui/button/' + (d < 0 ? 'minus/' : 'plus/');

  const RACE_DESC = {
    nhan: 'Cân bằng, dễ thích nghi với mọi hoàn cảnh; không thiên lệch một đường tu nào.',
    ma: 'Huyết mạch ma đạo, công kích bùng nổ nhưng thọ nguyên ngắn hơn.',
    yeu: 'Yêu tộc trời sinh, sinh lực dồi dào và thân thể bền bỉ.',
    linh: 'Linh thể nhẹ nhàng, gần gũi linh khí nên tu luyện thuận lợi.',
    tien_due: 'Hậu duệ tiên nhân, tu luyện thần tốc và thọ nguyên dài lâu.',
    thu: 'Dã tính bẩm sinh, thân thể cường tráng nhưng khó tĩnh tâm.'
  };
  const ELEM_DESC = {
    Kim: 'sắc bén, thiên về công phạt; kim khí tụ nơi đan điền.',
    Mộc: 'sinh cơ bừng bừng, thiên về sinh lực và hồi phục.',
    Thủy: 'uyển chuyển, thiên về linh khí và né tránh.',
    Hỏa: 'bùng nổ, thiên về bạo kích và uy lực.',
    Thổ: 'vững chãi, thiên về phòng ngự và thọ nguyên.'
  };

  const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const blankTalent = () => Object.fromEntries(TALENT_KEYS.map(k => [k, 0]));
  const rootLabel = (type, sub) => H.rootLabel(type, sub);
  const pctText = v => (v > 0 ? '+' : '') + Math.round(v * 100) + '%';

  let creation = {
    name: H.randomName('nam'), nameAuto: true, gender: 'nam',
    age: randInt(14, 30), race: H.rollRace(), ...H.rollRoots(),
    points: TALENT_MAX, talent: blankTalent()
  };
  let rolling = '', entering = false;

  function nameError() {
    const value = $('nameInput').value;
    if (!value.length || H.cleanName(value)) return '';
    return 'Đạo hiệu cần 2–' + H.NAME_MAX + ' ký tự, không chứa ký tự đặc biệt.';
  }

  function syncName() {
    const err = nameError(), note = $('nameNote');
    note.hidden = !err;
    note.textContent = err;
    $('nameInput').setAttribute('aria-invalid', String(!!err));
    $('startNew').disabled = !H.READY || entering || !H.cleanName($('nameInput').value);
  }

  const raceBonusText = race => {
    const b = H.raceBonus(race), out = [];
    if (b.hp) out.push('sinh lực ' + pctText(b.hp));
    if (b.atk) out.push('công kích ' + pctText(b.atk));
    if (b.rate) out.push('tốc tu ' + pctText(b.rate));
    return out.length ? out.join(' · ') : 'cân bằng, không thiên lệch';
  };

  /* Chủng tộc: danh sách đủ sáu tộc để so sánh; tộc hiện tại được nhấn mạnh. */
  function raceInfoHtml() {
    const cur = creation.race;
    const rows = H.RACES.map(([id, name, weight]) =>
      '<div class="race-row' + (id === cur ? ' is-current' : '') + '"><div class="race-head"><b>' + esc(name) + '</b><span>~' + H.raceLife(id, 0) + ' năm · gặp ' + weight + '%</span></div>' +
      '<div class="race-fx">' + esc(raceBonusText(id)) + '</div><div class="dim small">' + esc(RACE_DESC[id] || '') + '</div></div>').join('');
    return '<div class="info-title">Chủng tộc ' + esc(H.raceName(cur)) + '</div>' +
      '<div class="small">Thọ nguyên nền ~<b class="gold">' + H.raceLife(cur, 0) + '</b> năm. Thiên phú: <b>' + esc(raceBonusText(cur)) + '</b>.</div>' +
      '<div class="race-list">' + rows + '</div>' +
      '<div class="dim small">Gieo xúc xắc để đổi chủng tộc. Tỉ lệ gặp phản ánh độ hiếm của từng tộc.</div>';
  }

  /* Thông tin linh căn: tên + nhóm, mô tả loại, (Dị) biến thể và thế mạnh, hệ ngũ hành, rồi bảng phân loại 3 nhóm. */
  function rootInfoHtml() {
    const type = creation.rootType, sub = creation.rootSub || '';
    const info = H.ROOT_TYPES[type] || { group: 'ngu_hanh', desc: '', how: '' };
    const group = H.ROOT_GROUPS.find(g => g.id === info.group);
    const rate = F.LINH_CAN_RATE[type];
    const trib = F.LINH_CAN_TRIB[type] || 1;
    const combat = F.LINH_CAN_COMBAT[type] || 1;
    const active = ELEMENTS.map(([name, color], i) => ({ name, color, value: creation.roots[i] }))
      .filter(x => x.value >= 50);
    const descs = active.map(x => '<div class="root-elem-desc"><b style="color:' + x.color + '">' +
      x.name + ':</b> ' + esc(ELEM_DESC[x.name] || '') + '</div>').join('');
    const di = type === 'Dị' ? H.DI_LINH_CAN[sub] : null;
    const diBox = di
      ? '<div class="root-di"><b>' + esc(di.name) + ' · ' + esc(di.role) + '</b><div>' + esc(di.desc) + '</div>' +
        '<div class="root-di-fx">Thế mạnh: ' + esc(UI.rootEffectText(di.effects)) + '</div></div>'
      : '';
    const cur = t => (t === type ? ' is-current' : '');
    const tiers = '<div class="root-tiers" role="list">' +
      '<div class="root-tier" role="listitem"><span class="root-tier-name">Ngũ hành cơ bản</span><span class="root-tier-list">' +
        ['Ngụy', 'Tứ hành', 'Tam hành', 'Song', 'Thiên'].map(n => '<i class="' + cur(n).trim() + '">' + n + '</i>').join('<s>›</s>') + '</span></div>' +
      '<div class="root-tier" role="listitem"><span class="root-tier-name">Dị linh căn</span><span class="root-tier-list">' +
        H.DI_KEYS.map(k => '<i class="' + (type === 'Dị' && sub === k ? 'is-current' : '') + '">' + H.DI_LINH_CAN[k].name + '</i>').join('<s>·</s>') + '</span></div>' +
      '<div class="root-tier" role="listitem"><span class="root-tier-name">Chí tôn</span><span class="root-tier-list">' +
        ['Hỗn Độn'].map(n => '<i class="' + cur(n).trim() + '">' + n + '</i>').join('<s>·</s>') + '</span></div>' +
      '</div>';
    return '<div class="info-title">' + esc(rootLabel(type, sub)) +
      ' <span class="root-group root-group-' + esc(info.group) + '">' + esc(group ? group.name : '') + '</span></div>' +
      '<div class="root-rate-line">tốc tu ×' + rate + (combat > 1 ? ' · chiến lực ×' + combat : '') + (trib > 1 ? ' · chịu kiếp ×' + trib : '') + '</div>' +
      '<div class="small">' + esc(info.desc) + '</div>' + diBox +
      (descs ? '<div class="root-elem-title">' + (type === 'Dị' ? 'Hệ ngũ hành gốc' : 'Ngũ hành') + '</div>' : '') +
      '<div class="root-elem-list">' + descs + '</div>' + tiers +
      '<div class="root-doc"><b>Dị ≠ Thiên:</b> Thiên là một hệ ngũ hành thuần; Dị là biến thể cao cấp (Băng, Lôi, Phong, Độc) có thế mạnh riêng. <b>Hỗn Độn</b> không gieo được khi tạo nhân vật.</div>' +
      rootRulesHtml() +
      '<div class="dim small">Gieo lại xúc xắc để đổi linh căn. Điểm ngũ hành quyết định loại linh căn và thiên phú chiến đấu.</div>';
  }

  /* Quy tắc linh căn theo root.txt: tốc tu theo số hệ, tương sinh/khắc, nguồn biến dị Dị linh căn, Hỗn Độn. */
  function rootRulesHtml() {
    const M = root.HU_MERIDIANS;
    if (!M) return '';
    const cnt = [1, 2, 3, 4, 5].map(n => '<i><b>' + M.COUNT_NAME[n].replace(' linh căn', '').replace(' (tạp)', '') + '</b> ×' + M.COUNT_RATE[n] + '</i>').join('');
    const chain = ['Mộc', 'Hỏa', 'Thổ', 'Kim', 'Thủy'].map(h => '<b style="color:' + M.HE_COLOR[h] + '">' + h + '</b>').join(' → ');
    const khac = ['Mộc', 'Thổ', 'Thủy', 'Hỏa', 'Kim'].map(h => '<b style="color:' + M.HE_COLOR[h] + '">' + h + '</b>').join(' → ');
    const di = Object.entries(M.DI_SOURCE).map(([k, from]) => '<b style="color:' + M.HE_COLOR[M.DI_HE[k]] + '">' + M.DI_HE[k] + '</b> ← ' +
      from.map(h => '<span style="color:' + M.HE_COLOR[h] + '">' + h + '</span>').join(' + ')).join(' · ');
    return '<div class="root-rules"><div class="root-elem-title">Theo thiên thư</div>' +
      '<div class="rule-line"><span>Tốc tu theo số hệ</span><span class="rule-chips">' + cnt + '</span></div>' +
      '<div class="rule-line"><span>Tương sinh</span><span>' + chain + ' → Mộc</span></div>' +
      '<div class="rule-line"><span>Tương khắc (+20% / −20% sát thương)</span><span>' + khac + ' → Mộc</span></div>' +
      '<div class="rule-line"><span>Nguồn biến dị Dị linh căn (×2.0)</span><span>' + di + '</span></div>' +
      '<div class="rule-line"><span>Hỗn Độn linh căn (×3.0)</span><span>Chỉ hình thành khi độ kiếp lên đại cảnh giới; không bẩm sinh, không đoạt được.</span></div></div>';
  }

  /* Kinh mạch xem trước: 12 chính kinh theo hệ, đánh dấu mạch cùng hệ / mạch sinh hệ với linh căn. */
  function meridianPreview() {
    const M = root.HU_MERIDIANS;
    return M ? M.preview(creation.roots, creation.rootType, creation.rootSub) : null;
  }
  const zTime = minutes => !Number.isFinite(minutes) ? 'không tích tạp chất' : minutes >= 120 ? '~' + num(minutes / 60) + ' giờ' : '~' + Math.round(minutes) + ' phút';

  function meridianBoxHtml() {
    const M = root.HU_MERIDIANS, pv = meridianPreview();
    if (!M || !pv) return '';
    const chips = M.CHINH_KINH.map((m, i) => {
      const rel = pv.rel[i], color = M.HE_COLOR[m.he];
      return '<span class="mm-chip mm-' + rel + '" style="--c:' + color + '" title="' + esc(m.name + ' · ' + m.he + (rel === 'same' ? ' · cùng hệ linh căn' : rel === 'sinh' ? ' · hệ sinh ra linh căn' : '')) + '">' +
        (rel === 'same' ? '<s>★</s>' : rel === 'sinh' ? '<s>↑</s>' : '') + esc(m.short) + '</span>';
    }).join('');
    const zLine = pv.zPerMinute > 0
      ? 'Tạp chất <b>+' + pv.zPerMinute.toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + '/phút</b> · phạt tốc tu từ ' + zTime(pv.zPenaltyAt50) + '</span>'
      : 'Đơn linh căn: <b>không tích tạp chất</b></span>';
    return '<span class="mm-head"><b>Thập nhị chính kinh</b><em>Tinh khiết ' + pv.purity + '% · ' + esc(pv.countName) + ' ×' + pv.countRate + '</em></span>' +
      '<span class="mm-grid">' + chips + '</span>' +
      '<span class="mm-stat"><span><b>' + pv.same + '</b> mạch cùng hệ <i>(thông ×' + M.SAME_SPEED + ', stat ×' + M.SAME_STAT + ')</i></span>' +
      '<span><b>' + pv.sinh + '</b> mạch sinh hệ <i>(thông ×' + M.SINH_SPEED + ')</i></span></span>' +
      '<span class="mm-z"><span>' + zLine + '</span>' +
      '<span class="mm-note">8 kỳ kinh mở khi Trúc Cơ · mạch tăng tối đa +' + Math.round(pv.maxBonus * 100) + '% tốc tu</span></span>';
  }

  function meridianInfoHtml() {
    const M = root.HU_MERIDIANS, pv = meridianPreview();
    if (!M || !pv) return '';
    const rar = key => { const r = M.RARITY[key]; return '<span class="rar' + (r.rainbow ? ' rainbow' : '') + '" style="color:' + r.color + '">' + r.name + '</span>'; };
    const heTag = he => '<span class="he-tag" style="color:' + M.HE_COLOR[he] + ';border-color:' + M.HE_COLOR[he] + '">' + esc(he) + '</span>';
    const chinh = M.CHINH_KINH.map((m, i) => '<tr class="mm-' + pv.rel[i] + '"><td><b>' + esc(m.name) + '</b>' + (pv.rel[i] === 'same' ? ' <em>★ cùng hệ</em>' : pv.rel[i] === 'sinh' ? ' <em>↑ sinh hệ</em>' : '') + '</td><td>' + heTag(m.he) + '</td><td>' + m.points + '</td><td>' + esc(m.stat) + '</td><td>' + esc(m.perfect) + '</td></tr>').join('');
    const ky = M.KY_KINH.map(m => '<tr><td><b>' + esc(m.name) + '</b></td><td>' + rar(m.rarity) + '</td><td>' + esc(m.stat) + '</td><td>' + esc(m.perfect) + '</td></tr>').join('');
    const t = M.THIEN_MACH;
    return '<div class="info-title">Kinh mạch · đường dẫn linh khí</div>' +
      '<div class="small">Linh căn quyết định <b>hệ</b> và <b>tốc độ</b> hấp thụ linh khí; kinh mạch quyết định linh khí đi qua được <b>bao nhiêu</b>, <b>sạch đến đâu</b> và hóa thành sức mạnh nào. Kinh mạch không chọn lúc tạo nhân vật: bạn thông dần khi tu luyện.</div>' +
      '<div class="mm-summary"><div><span>Hệ linh căn</span><b>' + (pv.diHe ? esc(pv.diHe) + ' (từ ' + pv.diFrom.join('/') + ')' : pv.heList.map(h => '<span style="color:' + M.HE_COLOR[h] + '">' + h + '</span>').join(' · ') || '—') + '</b></div>' +
      '<div><span>Độ tinh khiết</span><b>' + pv.purity + '%</b></div><div><span>Tạp chất Z</span><b>' + (pv.zPerMinute > 0 ? '+' + pv.zPerMinute.toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + '/phút' : 'không tích') + '</b></div>' +
      '<div><span>Đầy Z (tẩu hỏa)</span><b>' + zTime(pv.zMinutes) + '</b></div></div>' +
      '<div class="root-elem-title">12 chính kinh · mở từ Luyện Khí · phải đả thông hết trước khi lên Trúc Cơ</div>' +
      '<div class="mm-table-wrap"><table class="mm-table"><thead><tr><th>Tên</th><th>Hệ</th><th>Huyệt</th><th>Stat (t=100)</th><th>Viên mãn</th></tr></thead><tbody>' + chinh + '</tbody></table></div>' +
      '<div class="root-elem-title">8 kỳ kinh bát mạch · mở khi đạt Trúc Cơ · hệ trung hòa</div>' +
      '<div class="mm-table-wrap"><table class="mm-table"><thead><tr><th>Tên</th><th>Hiếm</th><th>Stat (t=100)</th><th>Viên mãn</th></tr></thead><tbody>' + ky + '</tbody></table></div>' +
      '<div class="root-elem-title">Hỗn Độn Thiên Mạch</div>' +
      '<div class="small"><b style="color:#ffd9a0">' + esc(t.name) + '</b> · ' + rar('thiên') + ' · ' + esc(t.opens) + ': ' + esc(t.stat) + '; ' + esc(t.perfect) + '. Thông tự động t = 100, không thể đoạt.</div>' +
      '<div class="root-rules"><div class="root-elem-title">Cách vận hành</div>' +
      '<div class="rule-line"><span>Mạch cùng hệ linh căn</span><span>thông nhanh ×' + M.SAME_SPEED + ', cộng stat ×' + M.SAME_STAT + '</span></div>' +
      '<div class="rule-line"><span>Mạch của hệ sinh ra linh căn</span><span>thông nhanh ×' + M.SINH_SPEED + '</span></div>' +
      '<div class="rule-line"><span>Tạp chất Z</span><span>tăng mỗi phút = (số hệ − 1) × 0,5 × (1 − tinh khiết). Z ≥ 50: −10% tốc tu; ≥ 80: −30%; = 100: tẩu hỏa nhập ma.</span></div>' +
      '<div class="rule-line"><span>Đột phá</span><span>tầng nhỏ tự động; đại cảnh giới bấm tay và kiểm tra độ thông kinh mạch.</span></div></div>';
  }

  function renderStats() {
    const points = $('pointsValue');
    if (points) points.textContent = 'Số điểm còn lại: ' + creation.points;
    for (const t of TALENTS) {
      const v = creation.talent[t.key] || 0;
      const val = document.querySelector('[data-stat-val="' + t.key + '"]');
      if (val) val.textContent = v;
      for (const d of [-1, 1]) {
        const b = document.querySelector('[data-stat="' + t.key + '"][data-delta="' + d + '"]');
        if (!b) continue;
        const off = d > 0 ? creation.points <= 0 : v <= 0;
        b.disabled = off;
        const img = b.querySelector('img');
        if (img) img.src = PM(d) + (off ? 'disable' : 'normal') + '.png';
      }
    }
  }

  function buildStats() {
    const grid = $('statGrid');
    if (!grid) return;
    grid.innerHTML = TALENTS.map(t =>
      '<div class="stat-row">' +
        '<button type="button" class="stat-name" data-stat-hint="' + t.key + '">' + esc(t.name) + ':</button>' +
        '<span class="stat-val" data-stat-val="' + t.key + '">0</span>' +
        '<button type="button" class="stat-pm" data-stat="' + t.key + '" data-delta="-1" aria-label="Giảm ' + esc(t.name) + '"><img src="' + PM(-1) + 'normal.png" alt="" decoding="async"></button>' +
        '<button type="button" class="stat-pm" data-stat="' + t.key + '" data-delta="1" aria-label="Tăng ' + esc(t.name) + '"><img src="' + PM(1) + 'normal.png" alt="" decoding="async"></button>' +
        '<img class="stat-ico" src="media/assets/ui/icon/menu/' + t.icon + '" alt="" decoding="async">' +
      '</div>'
    ).join('');
  }

  function showStatHint(key) {
    const t = TALENTS.find(x => x.key === key);
    if (!t) return;
    const v = creation.talent[key] || 0;
    $('statHint').textContent = t.name + ': ' + t.desc + ' Hiện tại: ' + t.effect(v) + '.';
  }

  function renderCreation() {
    const input = $('nameInput');
    if (input && input.value !== creation.name) input.value = creation.name;
    $$('[data-gender]').forEach(b => {
      const on = b.dataset.gender === creation.gender;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    $('ageValue').textContent = creation.age + ' tuổi';
    $('raceValue').innerHTML = '<span class="field-main">' + esc(H.raceName(creation.race)) + '</span><span class="field-sub">' + esc(raceBonusText(creation.race)) + ' · thọ ~' + H.raceLife(creation.race, 0) + ' năm</span>';
    $('raceValue').setAttribute('aria-label', 'Chủng tộc ' + H.raceName(creation.race) + ' · xem thông tin');
    const M = root.HU_MERIDIANS, pv = meridianPreview();
    const active = ELEMENTS.map(([name], i) => ({ name, color: M ? M.HE_COLOR[name] : '#fff', value: creation.roots[i] })).filter(x => x.value >= 50);
    const chips = active.map(x => '<span class="chip" style="color:' + x.color + ';border-color:' + x.color + '">' + x.name + '</span>').join('');
    const rate = F.LINH_CAN_RATE[creation.rootType];
    const diChip = creation.rootType === 'Dị'
      ? '<span class="chip chip-di" style="color:' + (M ? M.HE_COLOR[M.DI_HE[creation.rootSub]] : '#fff') + ';border-color:' + (M ? M.HE_COLOR[M.DI_HE[creation.rootSub]] : '#fff') + '">' + esc(H.DI_LINH_CAN[creation.rootSub]?.name || 'Dị') + '</span>' : '';
    $('rootValue').innerHTML = '<span class="field-main">' + esc(rootLabel(creation.rootType, creation.rootSub)) + ' <em>×' + rate + ' tốc tu</em></span>' +
      '<span class="root-line">' + (diChip ? '<span class="root-line-label">Dị</span>' + diChip + '<span class="root-line-label">gốc</span>' : '') + (chips || '<span class="chip">…</span>') + '</span>' +
      '<span class="purity" title="Độ tinh khiết: điểm trung bình các hệ chính"><span class="purity-bar"><i style="width:' + (pv ? pv.purity : 0) + '%"></i></span><b>Tinh khiết ' + (pv ? pv.purity : 0) + '%</b></span>';
    $('rootValue').setAttribute('aria-label', rootLabel(creation.rootType, creation.rootSub) + ' · xem thông tin');
    if ($('meridianValue')) $('meridianValue').innerHTML = meridianBoxHtml();
    renderStats();
    syncName();
  }

  function roll(kind) {
    if (rolling || entering) return;
    rolling = kind;
    const btnId = { name: 'randomName', age: 'rollAge', race: 'rollRace', root: 'rollRoot' }[kind];
    const btn = btnId ? $(btnId) : null;
    btn?.classList.add('rolling');
    let i = 0;
    const step = () => {
      const welcome = $('welcome');
      if (!welcome || welcome.hidden || entering) { rolling = ''; btn?.classList.remove('rolling'); return; }
      if (kind === 'name') { creation.name = H.randomName(creation.gender); creation.nameAuto = true; }
      else if (kind === 'age') creation.age = randInt(14, 30);
      else if (kind === 'race') creation.race = H.rollRace();
      else if (kind === 'root') Object.assign(creation, H.rollRoots());
      renderCreation();
      i++;
      if (i < 9) setTimeout(step, 42 + i * 12);
      else { rolling = ''; btn?.classList.remove('rolling'); renderCreation(); }
    };
    step();
  }

  /** Danh sách "việc nên làm tiếp" sau khi bế quan: chỉ đọc trạng thái, không ghi gì vào save. */
  function nextSteps(s, g) {
    const out = [], st = g.stats ? g.stats() : null;
    if (st && s.hp < st.HP * .5) out.push('Sinh lực còn thấp: nghỉ ngơi hoặc dùng đan hồi phục trước khi đột phá hay vào bí cảnh.');
    if (!s.dungeon?.active && !s.sect?.mission) out.push('Bí cảnh và nhiệm vụ tông môn đang trống: cả hai đều chạy cả khi bạn vắng mặt.');
    if (s.sect?.mission && s.sect.mission.end <= Date.now()) out.push('Nhiệm vụ tông môn đã xong, vào Tông môn để nhận thưởng.');
    return out.slice(0, 3);
  }

  function offlineSnapshot(now) {
    const s = UI.s();
    return { age: s.age, realm: s.realm, stage: s.stage, harvests: s.garden.filter(p => !p.wilt && p.end <= now).length };
  }

  /** Hộp thoại "Bế quan trở về": cùng bố cục với bản Hu-gioi (vắng mặt, thời gian tính, tuổi, kết quả, các mục kỳ ngộ/bí cảnh/tông môn). */
  function showOfflineReport(r, before, awaySeconds) {
    const s = UI.s(), g = UI.g();
    const cap = F.offline_cap(s.offlineCap), eff = F.offline_efficiency(s.offlineEff);
    const capped = awaySeconds > cap;
    const months = Math.max(0, Math.round((s.age - before.age) * 12));
    const L = [];
    const row = (cls, html) => L.push('<div class="' + cls + '">' + html + '</div>');
    const section = title => row('report-sec', '— ' + title + ' —');

    const ups = s.realm === before.realm ? Math.max(0, s.stage - before.stage) : 0;
    row('report-hero', '<div class="rh-time"><span>BẾ QUAN</span><b>' + duration(r.seconds) + '</b></div>' +
      '<div class="rh-grid"><div><span>Tu vi</span><b data-countup="' + Math.max(0, r.exp) + '" data-fmt="num">+0</b></div>' +
      '<div><span>Linh thạch</span><b data-countup="' + r.stone + '" data-fmt="money">+0</b></div>' +
      '<div><span>Tầng mới</span><b class="' + (ups ? 'up' : '') + '">' + (ups ? '+' + ups : '—') + '</b></div></div>' +
      (ups ? '<div class="rh-note">Tự động đột phá: ' + esc(g.realmLabel()) + '</div>' : ''));
    row('report-center', 'Bạn đã vắng mặt <b>' + duration(awaySeconds) + '</b>. Thời gian bế quan được tính: <b>' + duration(r.seconds) + '</b>' + (capped ? ' (đã đạt mức tối đa)' : '') + '.');
    row('report-center dim small', 'Hiệu suất ' + pct(eff) + ', tối đa ' + duration(cap) + ' mỗi lần. Linh điền được chăm khi vắng mặt; cây chín chờ bạn thu hoạch.');
    row('cyan', 'Thời gian trong game: +' + months + ' tháng (tuổi ' + Math.floor(before.age) + ' → ' + Math.floor(s.age) + ')');
    if (s.realm !== before.realm) row('gold', 'Cảnh giới: ' + F.REALMS[before.realm] + ' → ' + F.REALMS[s.realm]);
    if (!s.completed && s.qi >= g.need()) row('gold', '◆ Đã viên mãn — bấm Đột phá để độ kiếp lên đại cảnh giới và tiếp tục hấp thụ linh khí!');
    if (before.harvests) row('green', '🌿 Linh điền: ' + before.harvests + ' ô đã chín, vào Nghề phụ → Linh điền để thu hoạch.');
    if (r.batches) row('green', 'Nghề phụ: hoàn tất ' + r.batches + ' mẻ.');
    if (r.sectReady && !r.sect) row('gold', 'Nhiệm vụ tông môn đã hoàn tất, đang chờ bạn nhận thưởng.');
    const life = g.lifeInfo();
    row('small', s.completed ? 'Thọ nguyên: đã chứng đạo trường sinh.' : 'Thọ nguyên: còn ' + num(Math.floor(life.left)) + ' / ' + num(life.max) + ' năm.');
    if (!s.completed && life.left <= 40) row('danger small', '⚠ Thọ nguyên còn ' + Math.floor(life.left) + ' năm' + (Number.isFinite(life.safeSeconds) ? ': vắng mặt quá ' + duration(life.safeSeconds) + ' nhân vật sẽ tọa hóa' : '') + '. Hãy đột phá đại cảnh giới hoặc dùng Thọ Nguyên Đan.');

    if (r.encounters?.length) {
      section('Kỳ ngộ (' + r.encounters.length + ')');
      r.encounters.slice(0, 8).forEach(e => {
        const d = H.ENCOUNTERS.find(x => x.id === e.id);
        const rar = d && H.ENCOUNTER_RARITIES[d.rarity];
        row('small', '<span style="color:' + (rar ? rar.color : 'inherit') + '">✦ [' + esc(rar ? rar.name : '') + '] ' + esc(d ? d.name : '') + '</span>: ' + esc(e.text));
      });
      if (r.encounters.length > 8) row('dim small', '… và ' + (r.encounters.length - 8) + ' kỳ ngộ khác.');
    }
    if (r.dungeon) {
      section('Bí cảnh');
      row('small', esc(r.dungeon.text));
    }
    if (r.sect) {
      section('Nhiệm vụ tông môn');
      row('small', esc(r.sect.text));
    }
    const tips = nextSteps(s, g);
    if (tips.length) {
      section('Việc nên làm tiếp');
      tips.forEach(x => row('small', '→ ' + esc(x)));
    }
    UI.modal('Bế quan trở về', '<div class="report-lines">' + L.join('') + '</div>',
      null, 'Nhận & tiếp tục tu luyện', 'THIÊN MỆNH', { type: 'gold', symbol: '☯', vfx: ['chien_dau', 'linh_khi'] });
    UI.idle?.countUp(document.getElementById('modalBody'));
  }

  /* ======================================================================
     TỌA HÓA · hết thọ nguyên
     Engine dừng đồng hồ đúng lúc thọ nguyên cạn (advance trả về died). Hộp thoại này bắt buộc:
     người chơi phải chuyển thế (dùng lại cơ chế trọng sinh) mới chơi tiếp.
     ====================================================================== */
  let deathOpen = false;
  UI.onDeath = function (r) {
    if (deathOpen) return;
    UI.tutorial?.close();
    const s = UI.s(), g = UI.g();
    deathOpen = true;
    const reward = F.dao_van(s.totalRunExp), points = Math.max(1, Math.floor(reward / 5)) + Math.floor(s.realm / 2);
    const lead = r && r.seconds >= 20
      ? 'Trong lúc bế quan, thọ nguyên của <b>' + esc(s.name) + '</b> đã cạn. Thân xác tan thành linh khí giữa đất trời.'
      : 'Thọ nguyên của <b>' + esc(s.name) + '</b> đã cạn. Bạn ngồi hóa giữa đất trời, thân xác tan thành linh khí.';
    UI.modal('Tọa hóa',
      '<p>' + lead + '</p>' +
      '<div class="offline-list">' +
        '<div><span>Hưởng thọ</span><b>' + num(Math.floor(s.age)) + ' tuổi</b></div>' +
        '<div><span>Cảnh giới đạt được</span><b>' + esc(g.realmLabel()) + '</b></div>' +
        '<div><span>Tu vi kiếp này</span><b>' + num(s.totalRunExp) + '</b></div>' +
        '<div><span>Đạo vận nhận được</span><b>+' + num(reward) + '</b></div>' +
        '<div><span>Điểm Thiên mệnh</span><b>+' + num(points) + '</b></div>' +
      '</div>' +
      '<p class="info-note">Công pháp, thiên phú, nâng cấp bế quan, Thiên mệnh và cài đặt được giữ lại. Cảnh giới, túi đồ và linh thạch đặt lại.</p>' +
      '<div class="death-actions"><button type="button" class="btn btn-gold btn-wide" data-act="reincarnate">Chuyển thế</button></div>',
      null, '', 'THIÊN MỆNH', { type: 'danger', symbol: '✝', busy: true, vfx: ['loi_kiep', 'ha_gioi'] });
    document.querySelector('[data-act="reincarnate"]')?.focus();
  };
  UI.reincarnate = function () {
    if (!deathOpen) return;
    const reward = F.dao_van(UI.s().totalRunExp);
    UI.command('reincarnate');
    UI.closeModal(true);
    deathOpen = false;
    store.write();
    UI.windows?.closeAll();
    UI.toast('Đã chuyển thế · nhận ' + num(reward) + ' Đạo vận. Một kiếp mới bắt đầu.', { type: 'gold', title: 'Tọa hóa' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'phi_thang', fps: 14, size: 'clamp(140px,22vw,240px)', style: { left: '50%', bottom: '22%', transform: 'translateX(-50%)' } });
    const avatar = $('avatar');
    if (avatar) avatar.src = A.heroPortrait(UI.s().gender, UI.s().realm);
    UI.go('idle');
  };

  function start() {
    const s = UI.s();
    $('welcome').hidden = true;
    $('continueGame').hidden = true;
    $('game').hidden = false;
    document.body.classList.add('in-game');
    store.ready = true;
    const awayStart = Date.now(), awaySeconds = Math.max(0, (awayStart - s.lastUpdate) / 1000);
    const before = offlineSnapshot(awayStart);
    const r = store.catchUp(awayStart, true);
    store.write();
    UI.applySettings();
    const avatar = $('avatar');
    if (avatar) avatar.src = A.heroPortrait(s.gender, s.realm);
    if (r && r.seconds >= 20 && !r.died) showOfflineReport(r, before, awaySeconds);
    UI.windows?.closeAll();
    UI.buildShell?.();
    const hash = String(root.location && root.location.hash || '').replace(/^#\/?/, '').split('/');
    const target = UI.screens[hash[0]] ? hash.filter(Boolean).join(':') : 'idle';
    UI.go(target, { silent: true });
    store.write();
  }

  function bindCreation() {
    $('createForm').addEventListener('submit', async e => {
      e.preventDefault();
      if (!H.READY || entering || store.ready) return;
      if (store.locked) { UI.toast('Game đang mở ở tab khác. Đóng tab kia rồi tải lại trang.'); return; }
      const name = H.cleanName($('nameInput').value);
      if (!name) { syncName(); return; }
      const profile = {
        name, gender: creation.gender, race: creation.race,
        roots: [...creation.roots], rootType: creation.rootType, rootSub: creation.rootSub || '',
        age: creation.age, talent: { ...creation.talent }
      };
      entering = true;
      const button = $('startNew'), label = button.textContent;
      button.textContent = 'Đang vào Hư Giới…';
      $('createForm').setAttribute('aria-busy', 'true');
      syncName();
      try {
        const images = [...A.INTRO, A.zoneBg(0), A.heroPortrait(profile.gender, 0)];
        for (const action of ['dung_yen', 'di_chuyen', 'tan_cong']) {
          for (let i = 0; i < A.heroFrames(profile.gender, 0, action); i++) images.push(A.heroSrc(profile.gender, 0, action, i));
        }
        await root.HU_LOADER.enter(images, () => {});
        const introDone = UI.intro.play();
        UI.intro.focus();
        await introDone;
        if (store.locked) throw Error('Game đang mở ở tab khác. Đóng tab kia rồi tải lại trang.');
        UI.session.create(profile);
        start();
        await UI.intro.close();
        $('stage')?.focus({ preventScroll: true });
        UI.tutorial.start();
      } catch (error) {
        await UI.intro.close();
        UI.toast('Không thể bắt đầu tu tiên: ' + error.message, { type: 'danger', title: 'Khởi tạo nhân vật' });
        if (!$('welcome').hidden) $('nameInput').focus({ preventScroll: true });
      } finally {
        entering = false;
        button.textContent = label;
        $('createForm').removeAttribute('aria-busy');
        syncName();
      }
    });

    $('continueGame').addEventListener('click', () => UI.safe(() => {
      if (entering) return;
      if (store.locked) throw Error('Game đang mở ở tab khác. Đóng tab kia rồi tải lại trang.');
      const saved = store.load();
      if (!saved) throw Error('Không tìm thấy bản lưu hợp lệ.');
      store.replace(saved);
      start();
    }));

    $('nameInput').addEventListener('input', e => {
      creation.name = e.target.value;
      creation.nameAuto = false;
      syncName();
    });
    $('randomName').addEventListener('click', () => roll('name'));
    $('rollAge').addEventListener('click', () => roll('age'));
    $('rollRace').addEventListener('click', () => roll('race'));
    $('rollRoot').addEventListener('click', () => roll('root'));
    const showCreationInfo = type => {
      $('creationInfoTitle').textContent = type === 'race' ? 'Thông tin chủng tộc' : type === 'meridian' ? 'Thông tin kinh mạch' : 'Thông tin linh căn';
      $('creationInfoContent').innerHTML = type === 'race' ? raceInfoHtml() : type === 'meridian' ? meridianInfoHtml() : rootInfoHtml();
      $('creationInfoDialog').showModal();
    };
    $('raceValue').addEventListener('click', () => showCreationInfo('race'));
    $('rootValue').addEventListener('click', () => showCreationInfo('root'));
    $('meridianValue').addEventListener('click', () => showCreationInfo('meridian'));
    $('creationInfoClose').addEventListener('click', () => $('creationInfoDialog').close());
    $$('[data-gender]').forEach(b => b.addEventListener('click', () => {
      creation.gender = b.dataset.gender;
      if (creation.nameAuto || !creation.name) {
        creation.name = H.randomName(creation.gender);
        creation.nameAuto = true;
      }
      renderCreation();
    }));

    $('statGrid').addEventListener('click', e => {
      const hint = e.target.closest('.stat-name');
      if (hint) { showStatHint(hint.dataset.statHint); return; }
      const b = e.target.closest('[data-stat]');
      if (!b || b.disabled) return;
      const key = b.dataset.stat, delta = Number(b.dataset.delta);
      if (delta > 0 && creation.points > 0) { creation.talent[key]++; creation.points--; }
      else if (delta < 0 && creation.talent[key] > 0) { creation.talent[key]--; creation.points++; }
      else return;
      renderStats();
      showStatHint(key);
    });
    $('statGrid').addEventListener('pointerover', e => {
      const b = e.target.closest('.stat-name');
      if (b) showStatHint(b.dataset.statHint);
    });
    $('statGrid').addEventListener('focusin', e => {
      const b = e.target.closest('.stat-name');
      if (b) showStatHint(b.dataset.statHint);
    });
  }

  function bindSettings() {
    document.addEventListener('change', e => {
      if (!store.ready || store.locked || UI.tribulation.active) return;
      const t = e.target;
      const apply = (key,value) => { UI.preference(key,value); UI.applySettings(); store.write(); };
      if (t.id === 'seasonSetting') apply('season',t.value);
      else if (t.id === 'seasonEffectsSetting') apply('seasonEffects',t.checked);
      else if (t.id === 'cultivationEffectsSetting') apply('cultivationEffects',t.checked);
      else if (t.id === 'combatEffectsSetting') apply('combatEffects',t.checked);
      else if (t.id === 'motionSetting') apply('motionMode',t.value);
      else if (t.id === 'importSaveInput' || t.id === 'importFile') {
        const file = t.files && t.files[0];
        t.value = '';
        if (file) importSave(file);
      }
    });
  }

  async function importSave(file) {
    try {
      const value = await store.readImport(file);
      if (!value) return;
      UI.modal('Nhập bản lưu', '<p>Thay nhân vật hiện tại bằng <b>' + esc(value.name) + '</b> · ' + F.REALMS[value.realm] + '.</p><p>Bản hiện tại được giữ trong ô dự phòng trước khi thay.</p>', () => {
        store.keepBeforeImport();
        store.replace(value);
        start();
        UI.toast('Đã nhập bản lưu · ' + value.name + '.', { type: 'success', title: 'Bản lưu' });
        UI.vfx?.stage({ kind: 'chien_dau', variant: 'phi_thang', fps: 14, size: 'clamp(120px,19vw,200px)', style: { left: '50%', bottom: '22%', transform: 'translateX(-50%)' } });
      }, 'Nhập bản lưu', 'THIÊN MỆNH', { type: 'gold', symbol: '⛁', vfx: ['chien_dau', 'linh_phu'] });
    } catch (e) {
      UI.toast('Không thể nhập bản lưu: ' + e.message, { type: 'danger', title: 'Lỗi bản lưu' });
    }
  }

  function bindLifecycle() {
    document.addEventListener('visibilitychange', () => {
      UI.updateSceneEffects();
      if (!store.ready || store.locked) return;
      if (document.hidden) { store.catchUp(); store.write(); return; }
      const now = Date.now(), awaySeconds = Math.max(0, (now - UI.s().lastUpdate) / 1000);
      const before = offlineSnapshot(now);
      const r = store.catchUp(now, true);
      store.write();
      UI.refresh();
      if (r && r.seconds >= 20 && !r.died) {
        if ($('modalLayer').hidden && !UI.tutorial.active && !UI.intro.active && !UI.tribulation.active) showOfflineReport(r, before, awaySeconds);
        else UI.toast('Bế quan · +' + num(r.exp) + ' tu vi · ' + money(r.stone) + '.', { type: 'loot', title: 'Bế quan trở về' });
      }
    });
    root.addEventListener('pagehide', () => {
      if (store.ready && !store.locked) { store.catchUp(Date.now(), document.hidden); store.write(); }
    });
    root.addEventListener('pageshow', e => { if (e.persisted) root.location.reload(); });

    if (root.navigator && root.navigator.locks) {
      store.locked = true;
      try {
        root.navigator.locks.request('hu-gioi-workspace-session', { ifAvailable: true }, async lock => {
          if (!lock) { UI.toast('Game đang mở ở tab khác. Đóng tab kia rồi tải lại trang.'); return; }
          store.locked = false;
          await new Promise(resolve => root.addEventListener('pagehide', resolve, { once: true }));
        });
      } catch (e) {
        store.locked = false;
      }
    }
  }

  function boot() {
    buildStats();
    bindCreation();
    bindSettings();
    bindLifecycle();
    const saved = store.load();
    $('continueGame').hidden = !saved;
    if (saved) {
      $('continueGame').title = 'Tiếp tục ' + saved.name + ' · ' + F.REALMS[saved.realm];
      $('welcomeRebirth').textContent = `Đây là lần trùng sinh thứ ${saved.rebirths + 1} của bạn`;
    }
    renderCreation();
    UI.booted = true;
  }

  UI.boot = boot;
  /* Xem trước các lựa chọn thuần dữ liệu, không mở phiên hay đọc/ghi bản lưu. */
  UI.bootPreview = function () {
    buildStats();
    bindCreation();
    renderCreation();
    UI.mainPreview?.bind();
  };
  UI.renderCreation = renderCreation;
  UI.creation = () => creation;
})(typeof window !== 'undefined' ? window : globalThis);
