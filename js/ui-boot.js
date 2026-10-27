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
  const rootLabel = type => ['Dị', 'Âm Dương', 'Hỗn Độn'].includes(type) ? type + ' Linh Căn' : type + ' linh căn';
  const pctText = v => (v > 0 ? '+' : '') + Math.round(v * 100) + '%';

  let creation = {
    name: H.randomName('nam'), nameAuto: true, gender: 'nam',
    age: randInt(14, 30), race: H.rollRace(), ...H.rollRoots(),
    points: TALENT_MAX, talent: blankTalent()
  };
  let rolling = '';

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
    $('startNew').disabled = !H.cleanName($('nameInput').value);
  }

  function raceInfoHtml() {
    const race = creation.race, name = H.raceName(race), b = H.raceBonus(race);
    const bonus = [];
    if (b.hp) bonus.push('Sinh lực ' + pctText(b.hp));
    if (b.atk) bonus.push('công kích ' + pctText(b.atk));
    if (b.rate) bonus.push('tốc tu ' + pctText(b.rate));
    return '<div class="info-title">Chủng tộc ' + esc(name) + '</div>' +
      '<div class="small">Thọ nguyên nền ~<b class="gold">' + H.raceLife(race, 0) + '</b> năm. Thiên phú: <b>' +
      (bonus.length ? bonus.join(' · ') : 'không thiên lệch') + '</b>.</div>' +
      '<div class="dim small">' + esc(RACE_DESC[race] || '') + '</div>';
  }

  function rootInfoHtml() {
    const type = creation.rootType;
    const rate = F.LINH_CAN_RATE[type] / 2;
    const trib = F.LINH_CAN_TRIB[type] || 1;
    const combat = F.LINH_CAN_COMBAT[type] || 1;
    const active = ELEMENTS.map(([name, color], i) => ({ name, color, value: creation.roots[i] }))
      .filter(x => x.value >= 50);
    const descs = active.map(x => '<div class="root-elem-desc"><b style="color:' + x.color + '">' +
      x.name + ':</b> ' + esc(ELEM_DESC[x.name] || '') + '</div>').join('');
    const typeDoc = {
      'Thiên': 'Một hệ đạt 50 trở lên. Tốc độ tu luyện cao nhất trong nhóm linh căn thường.',
      'Song': 'Hai hệ đạt 50 trở lên. Mốc cân bằng: tốc độ tu luyện ×1.',
      'Tam hành': 'Ba hệ đạt 50 trở lên. Tu luyện chậm hơn Song nhưng dễ gieo được nhiều hệ.',
      'Tứ hành': 'Bốn hệ đạt 50 trở lên. Tu luyện chậm, bù lại nền chỉ số ổn định.',
      'Ngụy': 'Cả năm hệ đạt 50 trở lên. Linh căn tạp, tốc độ tu luyện thấp nhất.',
      'Dị': 'Một hệ đặc biệt. Tốc tu ×2, +50% sinh lực/công kích, chịu lôi kiếp ×1.25.',
      'Âm Dương': 'Hai hệ đặc biệt. Tốc tu ×3, +80% sinh lực/công kích, chịu lôi kiếp ×1.4.',
      'Hỗn Độn': 'Năm hệ đặc biệt. Tốc tu ×4, +120% sinh lực/công kích, chịu lôi kiếp ×1.5.'
    }[type] || 'Số hệ đạt 50 trở lên quyết định loại linh căn.';
    return '<div class="info-title">' + esc(rootLabel(type)) +
      ' <span class="root-rate">tốc tu ×' + rate + (combat > 1 ? ' · chiến lực ×' + combat : '') +
      (trib > 1 ? ' · chịu kiếp ×' + trib : '') + '</span></div>' +
      '<div class="small">' + esc(typeDoc) + '</div>' +
      '<div class="root-elem-list">' + descs + '</div>' +
      '<div class="root-doc"><b>Cách đọc:</b> mỗi hệ từ 50 điểm trở lên được tính. 1 hệ = Thiên, 2 = Song, 3 = Tam hành, 4 = Tứ hành, 5 = Ngụy. Dị, Âm Dương và Hỗn Độn là linh căn đặc biệt hiếm.</div>' +
      '<div class="dim small">Gieo lại xúc xắc để đổi linh căn. Điểm ngũ hành quyết định loại linh căn và thiên phú chiến đấu.</div>';
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
    $('raceValue').textContent = H.raceName(creation.race);
    $('raceInfo').innerHTML = raceInfoHtml();
    const active = ELEMENTS.map(([name, color], i) => ({ name, color, value: creation.roots[i] }))
      .filter(x => x.value >= 50);
    $('rootValue').innerHTML = active.length
      ? active.map(x => '<span class="chip" style="color:' + x.color + ';border-color:' + x.color + '">' + x.name + '</span>').join('')
      : '<span class="chip">…</span>';
    $('rootDescription').innerHTML = rootInfoHtml();
    renderStats();
    syncName();
  }

  function roll(kind) {
    if (rolling) return;
    rolling = kind;
    const btnId = { name: 'randomName', age: 'rollAge', race: 'rollRace', root: 'rollRoot' }[kind];
    const btn = btnId ? $(btnId) : null;
    btn?.classList.add('rolling');
    let i = 0;
    const step = () => {
      const welcome = $('welcome');
      if (!welcome || welcome.hidden) { rolling = ''; btn?.classList.remove('rolling'); return; }
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

  /** Hộp thoại "Bế quan trở về": cùng bố cục với bản Hu-gioi (vắng mặt, thời gian tính, tuổi, kết quả, các mục kỳ ngộ/bí cảnh/tông môn). */
  function showOfflineReport(r, before, awaySeconds) {
    const s = UI.s(), g = UI.g();
    const cap = F.offline_cap(s.offlineCap), eff = F.offline_efficiency(s.offlineEff);
    const capped = awaySeconds > cap;
    const months = Math.max(0, Math.round((s.age - before.age) * 12));
    const L = [];
    const row = (cls, html) => L.push('<div class="' + cls + '">' + html + '</div>');
    const section = title => row('report-sec', '— ' + title + ' —');

    row('report-center', 'Bạn đã vắng mặt <b>' + duration(awaySeconds) + '</b>. Thời gian bế quan được tính: <b>' + duration(r.seconds) + '</b>' + (capped ? ' (đã đạt mức tối đa)' : '') + '.');
    row('report-center dim small', 'Hiệu suất ' + pct(eff) + ', tối đa ' + duration(cap) + ' mỗi lần. Linh điền vẫn lớn đến lúc chín.');
    row('cyan', 'Thời gian trong game: +' + months + ' tháng (tuổi ' + Math.floor(before.age) + ' → ' + Math.floor(s.age) + ')');
    row('green', 'Tu vi: +' + num(r.exp) + '&nbsp;&nbsp;&nbsp; Linh thạch: ' + (r.stone < 0 ? '−' : '+') + moneyHTML(Math.abs(r.stone)));
    if (s.realm !== before.realm) row('gold', 'Cảnh giới: ' + F.REALMS[before.realm] + ' → ' + F.REALMS[s.realm]);
    if (r.batches) row('green', 'Nghề phụ: hoàn tất ' + r.batches + ' mẻ.');
    if (r.sectReady && !r.sect) row('gold', 'Nhiệm vụ tông môn đã hoàn tất, đang chờ bạn nhận thưởng.');
    const life = g.lifeInfo();
    if (life.left <= 40) row('danger small', '⚠ Thọ nguyên còn ' + Math.floor(life.left) + ' năm' + (Number.isFinite(life.safeSeconds) ? ': vắng mặt quá ' + duration(life.safeSeconds) + ' nhân vật sẽ tọa hóa' : '') + '. Hãy đột phá đại cảnh giới hoặc dùng Thọ Nguyên Đan.');

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
      null, 'Tiếp tục tu luyện', 'THIÊN MỆNH', { type: 'gold', symbol: '☯', vfx: ['chien_dau', 'linh_khi'] });
  }

  /* ======================================================================
     TỌA HÓA · hết thọ nguyên
     Engine dừng đồng hồ đúng lúc thọ nguyên cạn (advance trả về died). Hộp thoại này bắt buộc:
     người chơi phải chuyển thế (dùng lại cơ chế trọng sinh) mới chơi tiếp.
     ====================================================================== */
  let deathOpen = false;
  UI.onDeath = function (r) {
    if (deathOpen) return;
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
    UI.closeModal(true);
    deathOpen = false;
    UI.g().prestige(true, 'Tọa hóa');
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
    s.created = true;
    $('welcome').hidden = true;
    $('continueGame').hidden = true;
    $('game').hidden = false;
    document.body.classList.add('in-game');
    store.ready = true;
    const awayStart = Date.now(), awaySeconds = Math.max(0, (awayStart - s.lastUpdate) / 1000);
    const before = { age: s.age, realm: s.realm, stone: s.stone, hp: s.hp };
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
    $('createForm').addEventListener('submit', e => {
      e.preventDefault();
      if (store.locked) { UI.toast('Game đang mở ở tab khác. Đóng tab kia rồi tải lại trang.'); return; }
      const name = H.cleanName($('nameInput').value);
      if (!name) { syncName(); return; }
      while (creation.points > 0) {
        const t = TALENTS[randInt(0, TALENTS.length - 1)];
        creation.talent[t.key]++;
        creation.points--;
      }
      store.replace(H.create());
      const s = UI.s();
      Object.assign(s, {
        name, gender: creation.gender, race: creation.race,
        roots: [...creation.roots], rootType: creation.rootType,
        age: creation.age, talent: { ...creation.talent }, created: true
      });
      s.stone = H.startStone(s.talent);
      const g = UI.g();
      /* Tân thủ được tặng nguyên liệu để thử ngay lò rèn và phù phòng. */
      g.add('MAT-001', 8);
      g.add('INK-HG', 2);
      s.hp = g.stats().HP;
      s.mp = g.maxMp();
      g.log(`Thọ nguyên dự kiến ${H.raceLife(creation.race, 0)} tuổi. Bạn đã nhập định — tu vi tự tăng theo thời gian.`);
      g.log(`Bạn mở mắt ra: ${name}, ${creation.age} tuổi, chủng tộc ${H.raceName(creation.race)}, mang ${rootLabel(creation.rootType)} giữa Hư Giới.`);
      start();
    });

    $('continueGame').addEventListener('click', () => UI.safe(() => {
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
      const apply = fn => { fn(); UI.applySettings(); store.write(); };
      if (t.id === 'seasonSetting') apply(() => { UI.s().settings.season = t.value; });
      else if (t.id === 'seasonEffectsSetting') apply(() => { UI.s().settings.seasonEffects = t.checked; });
      else if (t.id === 'cultivationEffectsSetting') apply(() => { UI.s().settings.cultivationEffects = t.checked; });
      else if (t.id === 'combatEffectsSetting') apply(() => { UI.s().settings.combatEffects = t.checked; });
      else if (t.id === 'motionSetting') apply(() => {
        UI.s().settings.motionMode = t.value;
        UI.s().settings.reducedMotion = t.value === 'reduced';
      });
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
      const r = store.catchUp(Date.now(), true);
      store.write();
      UI.refresh();
      if (r && r.seconds >= 20) UI.toast('Bế quan · +' + num(r.exp) + ' tu vi · ' + money(r.stone) + '.', { type: 'loot', title: 'Bế quan trở về' });
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
  UI.renderCreation = renderCreation;
  UI.creation = () => creation;
})(typeof window !== 'undefined' ? window : globalThis);
