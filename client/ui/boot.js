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

  const freshCreation = () => ({
    name: H.randomName('nam'), nameAuto: true, gender: 'nam',
    age: randInt(14, 30), race: H.rollRace(), ...H.rollRoots(),
    points: TALENT_MAX, talent: blankTalent(), destiny: 'exp'
  });
  let creation = freshCreation();
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
    const start = $('startNew');
    start.disabled = !H.READY || entering || creation.points !== 0 || !H.cleanName($('nameInput').value);
    start.title = creation.points > 0 ? 'Phân bổ hết ' + creation.points + ' điểm thiên phú còn lại để bắt đầu.' : '';
  }

  const raceBonusText = race => {
    const b = H.raceBonus(race), out = [];
    if (b.hp) out.push('sinh lực ' + pctText(b.hp));
    if (b.atk) out.push('công kích ' + pctText(b.atk));
    if (b.rate) out.push('tốc độ hấp thụ linh khí ' + pctText(b.rate));
    return out.length ? out.join(' · ') : 'cân bằng, không thiên lệch';
  };

  /* Thọ nguyên quy ra thời gian thực (tính từ F.aging_speed qua H.lifePace), nói thẳng sự khắc nghiệt của Luyện Khí. */
  function lifePaceText(race, age) {
    const p = H.lifePace(race, 0, age);
    return 'Một năm thọ nguyên ≈ ' + duration(p.secondsPerYear) + ' tu luyện liên tục; thọ nguyên Luyện Khí tính từ lúc sinh chỉ ≈ ' + duration(p.lifeSeconds) + ', nhập đạo ở tuổi ' + age + ' thì còn ≈ ' + duration(p.leftSeconds) + '. Linh căn kém mà thiếu đan dược trợ lực thì dễ tọa hóa ngay ở Luyện Khí; tộc thọ ngắn càng khó thoát.';
  }

  /* Chủng tộc: danh sách đủ sáu tộc để so sánh; tộc hiện tại được nhấn mạnh. */
  function raceInfoHtml() {
    const cur = creation.race;
    const rows = H.RACES.map(([id, name, weight]) =>
      '<div class="race-row' + (id === cur ? ' is-current' : '') + '"><div class="race-head"><b>' + esc(name) + '</b><span>~' + H.raceLife(id, 0) + ' năm · gặp ' + weight + '%</span></div>' +
      '<div class="race-fx">' + esc(raceBonusText(id)) + '</div><div class="dim small">' + esc(RACE_DESC[id] || '') + '</div></div>').join('');
    return '<div class="info-title">Chủng tộc ' + esc(H.raceName(cur)) + '</div>' +
      '<div class="small">Thọ nguyên nền ~<b class="gold">' + H.raceLife(cur, 0) + '</b> năm. Thiên phú: <b>' + esc(raceBonusText(cur)) + '</b>.</div>' +
      '<div class="small danger">' + esc(lifePaceText(cur, creation.age)) + '</div>' +
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
    const pv = meridianPreview();
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
      '<div class="root-rate-line">tốc độ hấp thụ linh khí ×' + rate + (combat > 1 ? ' · chiến lực ×' + combat : '') + (trib > 1 ? ' · chịu kiếp ×' + trib : '') + '</div>' +
      '<div class="root-rate-line">Độ tinh khiết <b class="gold">' + (pv ? pv.purity : 0) + '%</b> (điểm trung bình các hệ chính)</div>' +
      '<div class="small">' + esc(info.desc) + '</div>' + diBox +
      (descs ? '<div class="root-elem-title">' + (type === 'Dị' ? 'Hệ ngũ hành gốc' : 'Ngũ hành') + '</div>' : '') +
      '<div class="root-elem-list">' + descs + '</div>' + tiers +
      '<div class="root-doc"><b>Dị ≠ Thiên:</b> Thiên là một hệ ngũ hành thuần; Dị là biến thể cao cấp (Băng, Lôi, Phong, Độc) có thế mạnh riêng. <b>Hỗn Độn</b> không gieo được khi tạo nhân vật.</div>' +
      rootRulesHtml() +
      '<div class="dim small">Gieo lại xúc xắc để đổi linh căn. Điểm ngũ hành quyết định loại linh căn và thiên phú chiến đấu.</div>';
  }

  /* Quy tắc linh căn theo root.txt: tốc độ hấp thụ linh khí theo số hệ, tương sinh/khắc, nguồn biến dị Dị linh căn, Hỗn Độn. */
  function rootRulesHtml() {
    const M = root.HU_MERIDIANS;
    if (!M) return '';
    const cnt = [1, 2, 3, 4, 5].map(n => '<i><b>' + M.COUNT_NAME[n].replace(' linh căn', '').replace(' (tạp)', '') + '</b> ×' + M.COUNT_RATE[n] + '</i>').join('');
    const chain = ['Mộc', 'Hỏa', 'Thổ', 'Kim', 'Thủy'].map(h => '<b style="color:' + M.HE_COLOR[h] + '">' + h + '</b>').join(' → ');
    const khac = ['Mộc', 'Thổ', 'Thủy', 'Hỏa', 'Kim'].map(h => '<b style="color:' + M.HE_COLOR[h] + '">' + h + '</b>').join(' → ');
    const di = Object.entries(M.DI_SOURCE).map(([k, from]) => '<b style="color:' + M.HE_COLOR[M.DI_HE[k]] + '">' + M.DI_HE[k] + '</b> ← ' +
      from.map(h => '<span style="color:' + M.HE_COLOR[h] + '">' + h + '</span>').join(' + ')).join(' · ');
    return '<div class="root-rules"><div class="root-elem-title">Theo thiên thư</div>' +
      '<div class="rule-line"><span>Tốc độ hấp thụ linh khí theo số hệ</span><span class="rule-chips">' + cnt + '</span></div>' +
      '<div class="rule-line"><span>Tương sinh</span><span>' + chain + ' → Mộc</span></div>' +
      '<div class="rule-line"><span>Tương khắc (+20% / −20% sát thương)</span><span>' + khac + ' → Mộc</span></div>' +
      '<div class="rule-line"><span>Nguồn biến dị Dị linh căn (×2.0)</span><span>' + di + '</span></div>' +
      '<div class="rule-line"><span>Hỗn Độn linh căn (×3.0)</span><span>Chỉ hình thành khi độ kiếp lên đại cảnh giới; không bẩm sinh, không đoạt được.</span></div></div>';
  }

  /* Độ tinh khiết linh căn (điểm trung bình các hệ chính) lấy từ data/meridians.js. */
  function meridianPreview() {
    const M = root.HU_MERIDIANS;
    return M ? M.preview(creation.roots, creation.rootType, creation.rootSub) : null;
  }

  function renderStats() {
    const points = $('pointsValue');
    if (points) {
      const complete = creation.points === 0;
      points.textContent = complete
        ? 'Đã phân bổ đủ ' + TALENT_MAX + '/' + TALENT_MAX + ' điểm thiên phú.'
        : 'Còn ' + creation.points + '/' + TALENT_MAX + ' điểm — cần phân bổ hết để bắt đầu.';
      points.classList.toggle('points-complete', complete);
      points.classList.toggle('points-pending', !complete);
    }
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
    $('raceValue').innerHTML = '<span class="field-main">' + esc(H.raceName(creation.race)) + '</span>';
    $('raceValue').setAttribute('aria-label', 'Chủng tộc ' + H.raceName(creation.race) + ' · xem thông tin');
    $('rootValue').innerHTML = '<span class="field-main">' + esc(rootLabel(creation.rootType, creation.rootSub)) + '</span>';
    $('rootValue').setAttribute('aria-label', rootLabel(creation.rootType, creation.rootSub) + ' · xem thông tin');
    if ($('destinySelect')) $('destinySelect').value = creation.destiny;
    renderStats();
    syncName();
  }

  async function roll(kind) {
    if (rolling || entering) return;
    if (kind === 'name') {
      creation.name = H.randomName(creation.gender); creation.nameAuto = true;
      renderCreation(); return;
    }
    rolling = kind;
    const btnId = { age: 'rollAge', race: 'rollRace', root: 'rollRoot' }[kind];
    const btn = $(btnId);
    btn?.classList.add('rolling');
    try {
      // Một ticket máy chủ chứa đồng thời tuổi, chủng tộc và linh căn.
      const preview = await UI.session.previewCreation();
      Object.assign(creation, preview);
      renderCreation();
      UI.toast('Đã nhận thiên cơ mới từ máy chủ (tối đa 5 lần/24 giờ).', { type: 'info' });
    } catch (error) {
      UI.toast('Không thể gieo lại: ' + error.message, { type: 'danger' });
    } finally {
      rolling = '';
      btn?.classList.remove('rolling');
    }
  }

  /* Không có catch-up/báo cáo bế quan: offline đóng băng toàn bộ tiến trình. */
  let deathOpen = false;
  UI.onDeath = function (r) {
    if (deathOpen || !store.ready) return;
    if (UI.tribulation?.pageOpen) { UI.pendingDeathReport = r || {}; return; }
    UI.tutorial?.close();
    const s = UI.s(), g = UI.g();
    deathOpen = true;
    const why = { tribulation: 'Thiên kiếp giáng xuống, đạo thân đã tọa hóa.', pvp: 'Luận kiếm thất bại, đạo thân đã tọa hóa.', combat: 'Sinh lực cạn trong giao chiến, đạo thân đã tọa hóa.', lifespan: 'Thọ nguyên đã cạn, đạo thân đã tọa hóa.' };
    const lead = why[s.death?.cause] || 'Đạo thân đã tọa hóa. Không còn cơ hội hồi sinh.';
    UI.modal('Tọa hóa',
      '<p>' + lead + '</p>' +
      '<div class="offline-list">' +
        '<div><span>Hưởng thọ</span><b>' + num(Math.floor(s.age)) + ' tuổi</b></div>' +
        '<div><span>Cảnh giới cuối cùng</span><b>' + esc(g.realmLabel()) + '</b></div>' +
        '<div><span>Tu vi kiếp này</span><b>' + num(s.totalRunExp) + '</b></div>' +
      '</div>' +
      '<p class="info-note">Kiếp này đã khép lại. Trở về Khởi Nguyên sẽ xóa nhân vật, vật phẩm, linh thạch và thành tựu kiếp này. Thiên Tinh, cấp Thiên Mệnh Các và Kỳ Trân còn trong kho vẫn được giữ theo tài khoản. Chuyển kiếp miễn phí.</p>' +
      '<div class="death-actions"><button type="button" class="btn btn-gold btn-wide" data-act="resetAfterDeath">Trở về Khởi Nguyên</button></div>',
      null, '', 'THIÊN MỆNH', { type: 'danger', symbol: '✝', busy: true, vfx: ['loi_kiep', 'ha_gioi'] });
    document.querySelector('[data-act="resetAfterDeath"]')?.focus();
  };
  UI.resetAfterDeath = async function () {
    if (!deathOpen || store.locked) return;
    /* Xóa nhân vật chỉ khi máy chủ xác nhận đã tọa hóa. */
    store.ready = false;
    try {
      const preview = await store.resetAfterDeath();
      creation = { ...freshCreation(), ...preview };
    } catch (error) {
      store.ready = true;
      UI.toast('Không thể xóa nhân vật trên máy chủ: ' + error.message, { type: 'danger' });
      return;
    }
    UI.closeModal(true);
    deathOpen = false;
    UI.windows?.closeAll();
    UI.tabState = {};
    UI.view = { category: 'Tất cả', query: '', page: 0, quality: 0, selected: '', onlyReady: false };
    UI.current = 'idle';
    // Giữ nguyên tuổi/chủng tộc/linh căn trong ticket vừa cấp bởi máy chủ.
    rolling = '';
    $('continueGame').hidden = true;
    $('continueGame').title = '';
    $('welcomeRebirth').textContent = 'Bước vào kiếp thứ ' + ((UI.session.pavilion?.rebirths || 0) + 1) + ' · Thiên Tinh được giữ vĩnh viễn.';
    $('game').hidden = true;
    $('welcome').hidden = false;
    document.body.classList.remove('in-game');
    try { root.history?.replaceState(null, '', root.location.pathname + root.location.search); } catch { /* file:// */ }
    renderCreation();
    $('nameInput')?.focus({ preventScroll: true });
  };

  function start() {
    const s = UI.s();
    $('welcome').hidden = true;
    $('continueGame').hidden = true;
    $('game').hidden = false;
    document.body.classList.add('in-game');
    store.ready = true;
    // Snapshot đã được backend xác minh; không tính tiến trình khi quay lại.
    const r = null;
    const wasExploring = !!s.exploration?.active;
    UI.applySettings();
    const avatar = $('avatar');
    if (avatar) avatar.src = A.heroPortrait(s.gender, s.realm);
    UI.windows?.closeAll();
    UI.buildShell?.();
    const hash = String(root.location && root.location.hash || '').replace(/^#\/?/, '').split('/');
    // Khôi phục trang người chơi đã chọn, kể cả khi đang lịch luyện.
    // Nếu chuyến cũ đã kết thúc và trang trước là Lịch luyện thì về đài.
    const requested = UI.screens[hash[0]] ? hash.filter(Boolean).join(':') : '';
    const target = wasExploring && !s.exploration?.active && (!requested || requested === 'combat')
      ? 'idle' : requested || (s.exploration?.active ? 'combat' : 'idle');
    UI.go(target, { silent: true });
    if (UI.g().isDead()) UI.onDeath?.(r);
    if (wasExploring) {
      try { root.history?.replaceState(null, '', '#' + target); } catch { /* file:// */ }
    }
    store.write();
  }

  function bindCreation() {
    $('createForm').addEventListener('submit', async e => {
      e.preventDefault();
      if (!H.READY || entering || store.ready) return;
      if (store.locked) { UI.toast('Game đang mở ở tab khác. Đóng tab kia rồi tải lại trang.'); return; }
      const name = H.cleanName($('nameInput').value);
      if (!name) { syncName(); return; }
      if (creation.points !== 0) {
        renderStats();
        syncName();
        $('pointsValue')?.focus({ preventScroll: true });
        return;
      }
      const profile = {
        name, gender: creation.gender, race: creation.race,
        roots: [...creation.roots], rootType: creation.rootType, rootSub: creation.rootSub || '',
        age: creation.age, talent: { ...creation.talent }, destiny: creation.destiny
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
        await root.HU_LOADER.enter(images, () => {
          if (!H.READY) throw new Error('Engine chưa sẵn sàng.');
        });
        const introDone = UI.intro.play();
        UI.intro.focus();
        await introDone;
        if (store.locked) throw Error('Game đang mở ở tab khác. Đóng tab kia rồi tải lại trang.');
        await UI.session.create(profile);
        start();
        await UI.intro.close();
        $('stage')?.focus({ preventScroll: true });
        UI.tutorial.start();
      } catch (error) {
        await UI.intro.close();
        UI.toast('Chưa thể bước lên tiên lộ: ' + error.message, { type: 'danger', title: 'Lập đạo thân' });
        if (!$('welcome').hidden) $('nameInput').focus({ preventScroll: true });
      } finally {
        entering = false;
        button.textContent = label;
        $('createForm').removeAttribute('aria-busy');
        syncName();
      }
    });

    $('continueGame').addEventListener('click', () => UI.safe(async () => {
      if (entering) return;
      if (store.locked) throw Error('Game đang mở ở tab khác. Đóng tab kia rồi tải lại trang.');
      await store.synchronize();
      const saved = store.load();
      if (!saved) throw Error('Không tìm thấy nhân vật trên máy chủ.');
      start();
    }));

    $('nameInput').addEventListener('input', e => {
      creation.name = e.target.value;
      creation.nameAuto = false;
      syncName();
    });
    $('destinySelect')?.addEventListener('change', e => { creation.destiny = e.target.value; renderCreation(); });
    $('randomName').addEventListener('click', () => roll('name'));
    $('rollAge').addEventListener('click', () => roll('age'));
    $('rollRace').addEventListener('click', () => roll('race'));
    $('rollRoot').addEventListener('click', () => roll('root'));
    const showCreationInfo = type => {
      $('creationInfoTitle').textContent = type === 'race' ? 'Thông tin chủng tộc' : 'Thông tin linh căn';
      $('creationInfoContent').innerHTML = type === 'race' ? raceInfoHtml() : rootInfoHtml();
      $('creationInfoDialog').showModal();
    };
    $('raceValue').addEventListener('click', () => showCreationInfo('race'));
    $('rootValue').addEventListener('click', () => showCreationInfo('root'));
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
      syncName();
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
      const apply = async (key,value) => {
        try { await UI.preference(key,value); UI.applySettings(); UI.refresh(); }
        catch (error) { UI.toast('Lưu cài đặt thất bại: ' + error.message, { type: 'danger' }); }
      };
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
      UI.modal('Khôi phục hành trình', '<p>Thay nhân vật hiện tại bằng <b>' + esc(value.name) + '</b> · ' + F.REALMS[value.realm] + '.</p><p>Bản hiện tại được giữ trong ô dự phòng trước khi thay.</p>', () => {
        store.keepBeforeImport();
        store.replace(value);
        start();
        UI.toast('Đã khôi phục hành trình · ' + value.name + '.', { type: 'success', title: 'Hành trình' });
        UI.vfx?.stage({ kind: 'chien_dau', variant: 'phi_thang', fps: 14, size: 'clamp(120px,19vw,200px)', style: { left: '50%', bottom: '22%', transform: 'translateX(-50%)' } });
      }, 'Khôi phục hành trình', 'THIÊN MỆNH', { type: 'gold', symbol: '⛁', vfx: ['chien_dau', 'linh_phu'] });
    } catch (e) {
      UI.toast('Chưa thể khôi phục hành trình: ' + e.message, { type: 'danger', title: 'Khôi phục thất bại' });
    }
  }

  function bindLifecycle() {
    document.addEventListener('visibilitychange', () => {
      UI.updateSceneEffects();
      if (!store.ready || store.locked) return;
      if (document.hidden) {
        UI.session.pause().catch(error => console.warn('Không gửi được tín hiệu dừng:', error.message));
        return;
      }
      UI.session.synchronize(true).then(() => UI.refresh()).catch(error => UI.toast('Không đồng bộ được tiến trình: ' + error.message, { type: 'danger' }));
    });
    root.addEventListener('pagehide', () => {
      if (store.ready && !store.locked) UI.session.pause().catch(() => { /* lease server tự kết thúc */ });
    });
    root.addEventListener('pageshow', e => { if (e.persisted) root.location.reload(); });
    UI.session.subscribe(event => {
      if (event.type === 'death' && store.ready) UI.onDeath(event.report);
    });

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

  async function showForAccount(account) {
    if (!account?.id) throw Error('Phải đăng nhập để tải nhân vật online.');
    creation = freshCreation();
    await store.setAccount(account.id, account);
    if (UI.session.ticket?.preview) Object.assign(creation, UI.session.ticket.preview);
    $('accountLabel').textContent = account.email || 'Tài khoản online';
    $('accountExit').textContent = 'Đăng xuất';
    const saved = store.load();
    $('continueGame').hidden = !saved;
    $('welcomeRebirth').textContent = saved
      ? 'Đạo thân chỉ có một mạng. Thất bại sẽ mất toàn bộ kiếp này.'
      : 'Kiếp thứ ' + ((UI.session.pavilion?.rebirths || 0) + 1) + ' · chọn Thiên mệnh, giữ trọn Thiên Tinh từ tiền kiếp.';
    $('continueGame').title = saved ? 'Tiếp tục ' + saved.name + ' · ' + F.REALMS[saved.realm] : '';
    $('welcome').hidden = false;
    renderCreation();
  }
  async function leaveAccount() {
    if (store.ready && !store.locked) {
      try { await UI.session.pause(); } catch { /* server tự đóng băng sau heartbeat timeout */ }
    }
    store.ready = false;
    UI.tutorial?.close();
    UI.windows?.closeAll();
    if (!$('modalLayer').hidden) UI.closeModal(true);
    UI.session.disconnect();
    $('game').hidden = true;
    $('welcome').hidden = true;
    document.body.classList.remove('in-game');
  }
  function boot() {
    buildStats();
    bindCreation();
    bindSettings();
    bindLifecycle();
    UI.booted = true;
    root.HU_AUTH?.boot({ onEnter: showForAccount, onExit: leaveAccount });
    if (!root.HU_AUTH) showForAccount(null);
  }

  UI.boot = boot;
  /* Xem trước các lựa chọn thuần dữ liệu, không mở phiên hay đọc/ghi bản lưu. */
  UI.bootPreview = function () {
    buildStats();
    bindCreation();
    renderCreation();
    UI.mainPreview?.bind();
    root.HU_AUTH?.boot({ onEnter: () => { $('welcome').hidden = false; }, onExit: () => { $('welcome').hidden = true; $('game').hidden = true; } });
    if (!root.HU_AUTH) $('welcome').hidden = false;
  };
  UI.renderCreation = renderCreation;
  UI.creation = () => creation;
})(typeof window !== 'undefined' ? window : globalThis);
