/* HƯ GIỚI · MÀN NHÂN VẬT */
(function (root) {
  'use strict';
  const H = root.HU_GAME, F = H.F, A = root.HU_ASSETS;
  const UI = root.HU_UI;
  const { abs, $, esc, num, money, moneyHTML, pct, duration, row, btn, img, codeAttr, bar, card, empty, tabs } = UI.kit;
  const { ELEMENTS } = UI.data;
  const { lists } = UI;
  const S = UI.statNames;

  const TABS = [
    { id: 'stats', label: 'Đạo thể', icon: '☯' },
    { id: 'roots', label: 'Kinh mạch', icon: '❋' },
    { id: 'bag', label: 'Hành trang', icon: '◈' }
  ];

  /* Thanh tiến độ nhỏ kèm nhãn; dùng chung cho tu vi và thọ nguyên ở đầu màn. */
  function meter(label, text, percent, cls) {
    return `<div class="char-meter"><div class="char-meter-top"><span>${label}</span><b>${text}</b></div>${bar(percent, cls)}</div>`;
  }

  function header() {
    const s = UI.s(), g = UI.g();
    const need = g.need(), life = H.raceLife(s.race, s.realm) + s.extraLife;
    const qiPct = need > 0 ? s.qi / need * 100 : 0, agePct = life > 0 ? s.age / life * 100 : 0;
    return `<header class="char-header">
      <div class="portrait"><img src="${A.heroPortrait(s.gender, s.realm)}" alt="${esc(s.name)}" decoding="async"></div>
      <div class="char-id">
        <span class="eyebrow gold">${esc(H.rootLabel(s.rootType, s.rootSub).toUpperCase())}</span>
        <h2>${esc(s.name)}</h2>
        <p class="char-realm">${g.realmLabel()} · ${F.realm_map(s.zone)}</p>
        <p class="muted">${H.raceName(s.race)}</p>
      </div>
      <div class="char-meters">
        ${meter('Tu vi', num(s.qi) + ' / ' + num(need), qiPct, 'qi')}
        ${meter('Thọ nguyên', num(Math.floor(s.age)) + ' / ' + num(life) + ' năm', agePct, 'age')}
      </div>
    </header>`;
  }

  /* Ô chỉ số: nhãn nhỏ phía trên, giá trị lớn phía dưới. */
  const tile = (label, value, cls = '') => `<div class="stat-tile ${cls}"><span>${label}</span><b>${value}</b></div>`;

  function stats() {
    const s = UI.s(), g = UI.g(), st = g.stats();
    const glossary = Object.entries(S).map(([key, label]) =>
      '<div class="stat-definition"><dt>' + esc(label) + '</dt><dd>' + esc(UI.statDescriptions[key] || '') + '</dd></div>'
    ).join('');
    const power = [[S.hp, num(st.HP)], [S.mp, num(g.maxMp())], [S.sta, num(st.STA)], [S.atk, num(st.ATK)], [S.def, num(st.DEF)], [S.spd, num(st.SPD)],
      [S.cp, num(st.CP)], [S.crit, pct(st.CRIT)], [S.critDamage, pct(st.CRIT_DMG)], [S.dodge, pct(st.DODGE)]];
    const talents = H.TALENT_INFO.map(t => {
      const v = s.talent?.[t.key] || 0;
      return `<li class="talent-chip"><b>${esc(t.name)}</b><span>${v} điểm</span><small>${esc(t.effect(v))}</small></li>`;
    }).join('');
    const pillCap = .25 * F.realm_exp_total(s.realm);
    return `<div class="char-sheet">
      ${card('Chiến lực', `<div class="stat-tiles">${power.map(([k, v], i) => tile(k, v, 'stat-tone-' + (i % 5))).join('')}</div>`, { eyebrow: 'CHỈ SỐ', cls: 'sheet-power' })}
      ${card('Thiên phú khởi nguyên', `<ul class="talent-list">${talents}</ul>`, { eyebrow: 'KHỞI NGUYÊN', cls: 'sheet-talent' })}
      ${card('Tu luyện', `<div class="stat-tiles tiles-4">${tile(S.qiRate, num(g.rate()) + '<small>/giây</small>')}${tile('Tu vi từ đan', num(s.pillRealmExp) + '<small>/ ' + num(pillCap) + '</small>')}${tile('Đan đã dùng', s.pillUses + '<small>viên · tầng này</small>')}${tile('Tâm ma', num(s.tamMa || 0) + '<small>/ ' + (H.TAM_MA_MAX || 100) + ' · đột phá −' + (Math.min(15, (s.tamMa || 0) * (H.TAM_MA_BREAK_PENALTY || .0015) * 100)).toFixed(1).replace('.', ',') + '%</small>', s.tamMa >= 50 ? 'tile-warn' : '')}</div>`, { eyebrow: 'ĐẠO CẢNH', cls: 'sheet-cultivate' })}
      ${card('Đạo vận · Thiên mệnh', `<div class="stat-tiles tiles-2">${tile('Thiên Tinh', num(UI.session.pavilion?.balance || 0))}${tile('Số kiếp đã qua', num(UI.session.pavilion?.rebirths || 0))}</div>
        <p class="info-note">Thiên Mệnh Các cho nâng cấp vĩnh viễn, tối đa 20 cấp.</p>
        <div class="action-group"><button class="btn btn-outline" data-go="meta:pavilion">Mở Thiên Mệnh Các ›</button></div>`, { eyebrow: 'LUÂN HỒI', cls: 'sheet-rebirth' })}
      <details class="char-techniques"${UI.tabState?.character === 'skills' ? ' open' : ''}><summary>Công pháp & bồi dưỡng</summary>${skills()}</details>
      ${card('Giải nghĩa chỉ số', `<details class="stat-glossary"><summary>Xem ý nghĩa các chỉ số</summary><dl>${glossary}</dl></details>`, { eyebrow: 'ĐẠO THỂ', cls: 'sheet-glossary' })}
    </div>`;
  }

  function skills() {
    const s = UI.s(), g = UI.g();
    const learned = Object.keys(s.learned).map(key => `<div class="technique-item">${img(key)}<div><h3>${esc(H.item(key).name)}</h3>
      <p>${H.item(key).realm} · ${F.SUBPHAM[H.item(key).sub]} · Thuần thục ${pct(s.learned[key])}</p><p>${esc(H.item(key).description)}</p></div>
      ${['BT-900','BT-901'].includes(H.item(key).code)?'<span class="gold">Đã học bí tịch nghề</span>':btn(s.activeManuals.includes(key) ? 'Dừng vận hành' : 'Vận hành', 'activate', codeAttr(key))}</div>`).join('');
    const ups = ['Công kích +2%', 'Tốc độ hấp thụ linh khí +2%', 'Phòng thủ +2%', 'Né tránh +0,5%'].map((name, i) => {
      const n = s.tech[i] - 1;
      return card(`${name} · ${n}/20`, row('Giá một cấp', moneyHTML(F.cost(g.upgradeBase(i), 1.15, n))) +
        `<div class="action-group">${[1, 10, 'max'].map(k => btn(k === 'max' ? 'Tối đa' : '×' + k, 'upgrade', `data-index="${i}" data-count="${k}"`, n >= 20, 'btn-outline')).join('')}</div>`);
    }).join('');
    return `<p class="screen-lead">Vận hành tối đa ba công pháp. Thuần thục tăng khi tu luyện; thấp hơn một cảnh giới giảm nửa hiệu quả. Nhóm tốc độ hấp thụ linh khí tối đa +70%.</p>
      <div class="skill-list">${learned || empty('Chưa lĩnh ngộ công pháp nào. Mở mục Hành trang để lĩnh ngộ Dẫn Khí Quyết có sẵn.')}</div>
      <h3 class="section-title">Bồi dưỡng theo cảnh giới</h3>
      <p class="info-note">Chi phí mỗi bậc tăng ×1,15. Tu luyện và củng cố đạo cơ có thể tăng tối đa 40% tốc độ hấp thụ linh khí; phần bồi dưỡng thường sẽ bắt đầu lại khi sang đại cảnh giới mới.</p>
      <div class="screen-grid">${ups}</div>`;
  }

  /* Sơ đồ trực quan, chỉ tra cứu kinh mạch dự kiến, chưa tạo trạng thái mới trên máy chủ. */
  const MERIDIAN_POSITIONS = Object.freeze({
    chinh: [[38,39],[29,49],[46,60],[41,67],[58,39],[70,49],[66,77],[56,68],[51,44],[51,54],[35,76],[60,60]],
    ky: [[50,34],[50,22],[50,61],[50,70],[34,86],[66,86],[42,50],[59,50]]
  });

  function meridianPanel() {
    const M = root.HU_MERIDIANS;
    if (!M) return '';
    const state = UI.s(), ui = UI.view, media = root.HU_CUSTOM_MEDIA;
    const group = ui.meridianGroup === 'ky' ? 'ky' : 'chinh';
    // Chính Kinh luôn màu xanh, Kỳ Kinh luôn màu vàng.
    const tone = group === 'ky' ? 'vang' : 'xanh';
    const list = group === 'ky' ? M.KY_KINH : M.CHINH_KINH;
    const picked = Number.isInteger(ui.meridianIndex) && ui.meridianIndex >= 0 && ui.meridianIndex < list.length
      ? ui.meridianIndex : 0;
    const current = list[picked];
    const points = list.map((item, i) => {
      const [x, y] = MERIDIAN_POSITIONS[group][i];
      return '<button type="button" class="meridian-point" data-act="meridianPick" data-index="' + i +
        '" data-label="' + esc(item.short) + '" aria-label="Xem ' + esc(item.name) +
        '" aria-pressed="' + (i === picked) + '" title="' + esc(item.name) +
        '" style="--point-x:' + x + '%;--point-y:' + y + '%;--point-color:' +
        (group === 'ky' ? '#e5c458' : '#75bfed') + '"></button>';
    }).join('');
    // Danh sách theo thứ tự tuần hoàn kinh mạch, từ Phế (01) đến Can (12).
    // Giúp chọn đúng tên khi các điểm trên hình nằm sát nhau.
    const ordered = list.map((item, i) =>
      '<button type="button" class="meridian-sequence-item' + (i === picked ? ' selected' : '') +
      '" data-act="meridianPick" data-index="' + i + '" aria-pressed="' + (i === picked) +
      '" title="' + esc(item.name) + '"><b>' + String(i + 1).padStart(2, '0') + '</b><span>' +
      esc(item.short) + '</span></button>').join('');
    const preview = M.preview(state.roots, state.rootType, state.rootSub);
    const relation = M.relation(current.he, preview.heList);
    const connection = current.he === 'Trung hòa' ? 'Trung hòa'
      : relation === 'same' ? 'Cùng hệ linh căn' : relation === 'sinh' ? 'Hệ tương sinh' : 'Chưa có liên hệ cùng hệ';
    // WebP chất lượng cao chỉ có khi đã cài gói ảnh; SVG minh họa có sẵn trên web.
    const person = media?.installed
      ? media.meridian(state.gender, tone)
      : media?.meridianFallback?.(state.gender, tone);
    const figure = person
      ? '<img class="meridian-person" src="' + esc(abs(person)) + '" alt="Tu sĩ ' +
        (state.gender === 'nu' ? 'nữ' : 'nam') + ' ngồi thiền · ' +
        (tone === 'vang' ? 'Kim quang' : 'Thanh quang') + '" loading="eager" decoding="async">'
      : '<div class="meridian-map-fallback" aria-hidden="true">☯</div>';
    const option = (action, key, val, label, pressed) =>
      '<button type="button" data-act="' + action + '" data-' + key + '="' + val +
      '" aria-pressed="' + pressed + '">' + label + '</button>';
    return '<section class="meridian-panel" aria-label="Sơ đồ kinh mạch tham khảo">' +
      '<div class="meridian-board"><span class="eyebrow gold">KINH MẠCH ĐỒ</span>' +
      '<h3>Huyệt vị trên đạo thể</h3>' +
      '<p class="info-note">Chọn các điểm sáng để xem thông tin. Vị trí chỉ mang tính minh họa, chưa phải cơ chế thông mạch đang hoạt động.</p>' +
      '<div class="meridian-toolbar" role="group" aria-label="Loại kinh mạch">' +
      option('meridianGroup', 'group', 'chinh', '12 Chính Kinh', group === 'chinh') +
      option('meridianGroup', 'group', 'ky', '8 Kỳ Kinh', group === 'ky') + '</div>' +
      '<div class="meridian-map">' + figure + points + '</div>' +
      '<div class="meridian-map-legend"><span>● Chạm điểm sáng để tra cứu</span><span>' +
      (group === 'chinh' ? '12 Chính Kinh · Màu xanh' : '8 Kỳ Kinh · Màu vàng') + '</span></div>' +
      '<div class="meridian-sequence" role="group" aria-label="Danh sách kinh mạch theo thứ tự">' + ordered + '</div></div>' +
      '<div class="meridian-info"><span class="meridian-kind">' + esc(current.kind) + '</span>' +
      '<h4>' + esc(current.name) + '</h4>' +
      row('Ngũ hành', esc(current.he)) +
      row('Độ hiếm dự kiến', esc(M.RARITY[current.rarity]?.name || current.rarity)) +
      row('Mở theo thiết kế', esc(current.opens)) +
      (current.points ? row('Số huyệt theo thiết kế', String(current.points)) : '') +
      row('Liên hệ với linh căn', esc(connection)) +
      '<p class="meridian-effect"><b>Hiệu ứng thiết kế:</b> ' + esc(current.stat) + '</p>' +
      '<p class="meridian-effect"><b>Khi viên mãn:</b> ' + esc(current.perfect) + '</p>' +
      '<p class="meridian-hint">Các hiệu ứng trên là thông tin tham khảo từ bản thiết kế kinh mạch; chưa cộng vào chỉ số nhân vật. Tu luyện linh căn hiện tại vẫn thực hiện ở phần bên dưới.</p>' +
      '</div></section>';
  }

  function roots() {
    return meridianPanel() + UI.adventure.roots();
  }

  function itemDescription(key) {
    const x=H.item(key),d=x.design,e=H.DESIGN.effects[x.code],q=2**(x.sub-H.BY_ID[x.code].sub);
    let detail='';
    if(d?.group==='pháp bảo')detail=row('Thuộc tính','Sinh lực +'+num(d['hp cộng']*q)+' · Linh lực +'+num(d['mp cộng']*q)+' · Công kích +'+num(d['atk cộng']*q)+' · Phòng thủ +'+num(d['def cộng']*q))+row('Né tránh / bạo kích','+'+num(d['eva cộng (%)']*q)+'% / +'+num(d['crit cộng (%)']*q)+'%')+(e?row('Hiệu ứng',esc(e['hiệu ứng'])+' · '+esc(e['điều kiện kích hoạt'])):'');
    else if(d?.group==='công pháp')detail=row('Hệ',esc(d['hệ']))+row('Kỹ năng',esc(d['công dụng'])+' · '+d['tiêu hao mp']+' linh lực · '+d['hồi chiêu (giây)']+' giây');
    else if(d?.group==='bí tịch')detail=row('Thể loại',esc(d['thể loại']))+row('Công dụng',esc(d['công dụng']));
    else if(d?.group==='linh thảo')detail=row('Cách dùng',esc(d['cách dùng']))+row('Hiệu quả',esc(d['hiệu quả']));
    return `<p>${esc(x.description)}</p>${row('Cảnh giới',esc(x.realm))}${row('Phẩm chất',esc((x.grade || x.quality || '') + ' · ' + F.SUBPHAM[x.sub]))}${x.age ? row('Tuổi dược liệu', esc(x.age)) : ''}${row('Nguồn gốc', 'Chưa có dữ liệu nguồn nhận')}${detail}`;
  }

  function bagOrder() {
    const player = UI.session?.playerId;
    if (!player) return [];
    if (UI.view.bagOrderPlayer !== player) {
      UI.view.bagOrderPlayer = player;
      try { const saved = JSON.parse(root.localStorage?.getItem('hugioi.bag-order.' + player) || '[]'); UI.view.bagOrder = Array.isArray(saved) ? saved.filter(x => typeof x === 'string').slice(0, 1000) : []; }
      catch { UI.view.bagOrder = []; }
    }
    return UI.view.bagOrder || [];
  }

  function bag() {
    const s = UI.s(), g = UI.g(), v = UI.view;
    const slots = Array.from({ length: 4 }, (_, i) => {
      const key = s.equipment[i], item = key && H.item(key);
      return `<button type="button" class="gear-slot ${key ? '' : 'empty'} gear-corner-${i}" data-gear-drop="${i}" ${key ? `data-act="equip" ${codeAttr(key)}` : ''} aria-label="${key ? 'Tháo ' + esc(item.name) : 'Ô pháp bảo ' + (i + 1) + ' trống'}">${key ? img(key) : '<span>＋</span>'}<small>${key ? esc(item.name) : 'Ô ' + (i + 1)}</small></button>`;
    }).join('');
    /* Hành trang chứa cả các ô trang bị và toàn bộ vật phẩm trong túi. */
    const xs = Object.keys(s.bag).map(H.item).filter(Boolean)
      .sort((a, b) => a.tier - b.tier || a.kind.localeCompare(b.kind) || a.code.localeCompare(b.code) || a.sub - b.sub);
    const order = bagOrder();
    const visible = xs.slice().sort((a,b) => { const ai=order.indexOf(a.key), bi=order.indexOf(b.key); return (ai < 0 ? Number.MAX_SAFE_INTEGER : ai) - (bi < 0 ? Number.MAX_SAFE_INTEGER : bi); });
    if (!xs.some(x => x.key === v.selected)) v.selected = '';
    const x = H.item(v.selected), usable = x && (['PILL', 'TAL', 'GFT', 'CAT', 'FERT', 'SEED'].includes(x.kind)||(x.kind==='HERB'&&x.design?.['cách dùng']?.includes('ăn trực tiếp')));
    const main = x ? `${img(v.selected, 'detail-img')}<h3 class="detail-title">${esc(x.name)}</h3>${itemDescription(v.selected)}${row('Giá bán', moneyHTML(F.shop_sell_price(g.price(v.selected))))}
      <div class="detail-actions">${btn(x.kind === 'EQ' ? (s.equipment.includes(v.selected) ? 'Tháo' : 'Trang bị') : x.kind === 'BT' ? 'Lĩnh ngộ' : usable ? 'Sử dụng' : 'Công dụng',
        x.kind === 'EQ' ? 'equip' : x.kind === 'BT' ? 'learn' : usable ? 'consume' : 'info', codeAttr(v.selected))}${btn('Bán 1', 'sell', codeAttr(v.selected), s.equipment.includes(v.selected), 'btn-outline')}</div>` : empty('Chọn một vật phẩm.');
    return `<div class="inventory-scene-layout">
      <section id="equippedItems" class="gear-stage" aria-label="Đạo thân và pháp bảo"><div class="gear-stage-heading"><span class="eyebrow gold">ĐẠO THÂN</span><h3>Pháp bảo · ${s.equipment.length}/4</h3></div><img class="gear-hero" src="${esc(A.heroSrc(s.gender, s.zone, 'dung_yen', 0))}" alt="${esc(s.name)} đang ngồi thiền">${slots}<p class="gear-stage-hint">Kéo pháp bảo vào ô trống hoặc chọn rồi bấm Trang bị; ô trống đầu tiên sẽ được dùng.</p></section>
      <section class="inventory-pouch card"><header class="card-head"><div><span class="eyebrow gold">TÚI TRỮ VẬT</span><h3>Hành trang</h3></div><small>${xs.length} loại</small></header><div class="inventory-items">${visible.map(i => `<button class="inventory-cell ${v.selected === i.key ? 'selected' : ''}" data-select="${esc(i.key)}" data-drag-item="${esc(i.key)}" draggable="true" data-sub="${i.sub}" aria-label="${esc(i.name)} · ${F.SUBPHAM[i.sub]} phẩm · số lượng ${num(g.count(i.key))}">${img(i.key)}<span class="inv-count">×${num(g.count(i.key))}</span><span class="inv-sub" aria-hidden="true">${F.SUBPHAM[i.sub]}</span></button>`).join('') || empty('Túi trữ vật đang trống.')}</div></section>
      <section class="card item-detail inventory-detail" aria-live="polite">${main}</section>
    </div>`;

  }

  UI.register({
    id: 'character', label: 'Nhân vật', icon: 'ICON-MENU-003', eyebrow: 'ĐẠO THỂ',
    tabs: TABS,
    render: tab => header() + tabs(TABS, tab) + `<div class="screen-body">${{ stats, skills, roots, bag }[tab]()}</div>`,
    signature: () => {
      const s = UI.s();
      return [s.realm, s.stage, UI.session.pavilion?.balance || 0, s.meta?.points || 0, Object.keys(s.meta?.achievements || {}).length, ...s.rootCraft.essence, ...s.rootCraft.levels, s.sect.id].join('|');
    }
  });

  let draggedEquip = '';
  const moveItem = (key, before) => {
    if (!key || !before || key === before) return;
    const keys = Array.from(document.querySelectorAll('.inventory-items [data-drag-item]'), el => el.dataset.dragItem);
    const from = keys.indexOf(key), to = keys.indexOf(before);
    if (from < 0 || to < 0) return;
    keys.splice(from, 1); keys.splice(keys.indexOf(before), 0, key); UI.view.bagOrder = keys;
    try { if (UI.session?.playerId) root.localStorage?.setItem('hugioi.bag-order.' + UI.session.playerId, JSON.stringify(keys)); } catch { /* vị trí vẫn dùng được trong phiên hiện tại */ }
    UI.refresh();
  };
  const dropEquip = async (key, target) => {
    if (!key || !target?.matches('[data-gear-drop].empty')) return;
    if (H.item(key)?.kind !== 'EQ') { UI.toast('Chỉ pháp bảo mới có thể trang bị.', { type: 'info' }); return; }
    if (UI.s().equipment.includes(key)) { UI.toast('Pháp bảo này đang trang bị.', { type: 'info' }); return; }
    try { await UI.command('equip', { code: key }); UI.toast('Đã trang bị ' + H.item(key).name + '.', { type: 'success', title: 'Pháp bảo' }); UI.refresh(); }
    catch (error) { UI.toast(error.message || 'Không thể trang bị.', { type: 'danger' }); }
  };
  document.addEventListener('dragstart', e => {
    const item = e.target.closest?.('[data-drag-item]');
    if (!item) return;
    draggedEquip = item.dataset.dragItem;
    e.dataTransfer?.setData('text/plain', draggedEquip);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  });
  document.addEventListener('dragover', e => { if (draggedEquip && e.target.closest?.('[data-gear-drop].empty, [data-drag-item]')) e.preventDefault(); });
  document.addEventListener('drop', e => {
    const target = e.target.closest?.('[data-gear-drop].empty, [data-drag-item]');
    if (!target || !draggedEquip) return;
    e.preventDefault(); const key = draggedEquip; draggedEquip = '';
    if (target.dataset.dragItem) moveItem(key, target.dataset.dragItem); else void dropEquip(key, target);
  });
  document.addEventListener('dragend', () => { draggedEquip = ''; });
  let touchDrag = null;
  document.addEventListener('pointerdown', e => {
    const item = e.target.closest?.('[data-drag-item]');
    if (item && e.pointerType === 'touch') touchDrag = { id: e.pointerId, key: item.dataset.dragItem, x: e.clientX, y: e.clientY, moved: false };
  });
  document.addEventListener('pointermove', e => {
    if (!touchDrag || e.pointerId !== touchDrag.id) return;
    if (Math.hypot(e.clientX - touchDrag.x, e.clientY - touchDrag.y) > 12) touchDrag.moved = true;
    if (touchDrag.moved && e.cancelable) e.preventDefault();
  }, { passive: false });
  document.addEventListener('pointerup', e => {
    if (!touchDrag || e.pointerId !== touchDrag.id) return;
    const drag = touchDrag; touchDrag = null;
    if (!drag.moved) return;
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-gear-drop].empty, [data-drag-item]');
    if (target) { e.preventDefault(); if (target.dataset.dragItem) moveItem(drag.key, target.dataset.dragItem); else void dropEquip(drag.key, target); }
  });
  document.addEventListener('pointercancel', () => { touchDrag = null; });

  UI.action('meridianPick', (el, d) => { const n = Number(d.index); if (Number.isInteger(n)) UI.view.meridianIndex = n; });
  UI.action('meridianGroup', (el, d) => { UI.view.meridianGroup = d.group === 'ky' ? 'ky' : 'chinh'; UI.view.meridianIndex = 0; });

  UI.action('equip', async (el, d) => {
    await UI.command('equip', { code: d.code });
    const equipped = UI.s().equipment.includes(d.code);
    UI.toast((equipped ? 'Đã trang bị ' : 'Đã tháo ') + H.item(d.code).name + '.', { type: 'success', title: 'Pháp bảo' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_phu', fps: 12, size: 'clamp(100px,16vw,170px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('learn', async (el, d) => {
    await UI.command('learn', { code: d.code });
    UI.toast('Đã lĩnh ngộ ' + H.item(d.code).name + '.', { type: 'success', title: 'Công pháp' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_phu', fps: 12, size: 'clamp(110px,17vw,180px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('activate', async (el, d) => {
    await UI.command('activate', { code: d.code });
    const on = UI.s().activeManuals.includes(d.code);
    UI.toast((on ? 'Đang vận hành ' : 'Đã dừng ') + H.item(d.code).name + '.', { type: on ? 'success' : 'info', title: 'Công pháp' });
    if (on) UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_phu', fps: 12, size: 'clamp(100px,16vw,170px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('consume', async (el, d) => {
    const x = H.item(d.code), msg = await UI.command('use', { code: d.code });
    const bad = /thất bại|không thể|không đủ|chưa đủ/i.test(msg);
    UI.toast(msg, { type: bad ? 'danger' : 'success', title: bad ? 'Không thể dùng' : 'Sử dụng vật phẩm' });
    if (['PILL', 'TAL'].includes(x?.kind)) {
      if (x.effect === 'KIEP') UI.vfx?.hero({ kind: 'chien_dau', variant: 'ho_thuan', fps: 12 });
      else if (x.effect === 'HOI_PHUC') UI.vfx?.effect('heal');
      else UI.vfx?.effect(x.effect === 'DOT_PHA' ? 'break' : 'qi');
      UI.vfx?.ring('hero', x.effect === 'HOI_PHUC' ? '#63d6a3' : '#e6c164');
    }
  });
  UI.action('sell', async (el, d) => {
    const price = money(F.shop_sell_price(UI.g().price(d.code)));
    await UI.command('sell', { code: d.code });
    UI.toast('Đã bán ' + H.item(d.code).name + ' · +' + price + '.', { type: 'loot', title: 'Bán vật phẩm' });
  });
  UI.action('info', async (el, d) => { UI.toast(H.item(d.code).description, { type: 'info', title: H.item(d.code).name }); return UI.KEEP; });
})(typeof window !== 'undefined' ? window : globalThis);
