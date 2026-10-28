/* HƯ GIỚI · MÀN NHÂN VẬT */
(function (root) {
  'use strict';
  const H = root.HU_GAME, F = H.F, A = root.HU_ASSETS;
  const UI = root.HU_UI;
  const { $, esc, num, money, moneyHTML, pct, duration, row, btn, img, codeAttr, bar, card, empty, tabs } = UI.kit;
  const { ELEMENTS } = UI.data;
  const { lists } = UI;

  const TABS = [
    { id: 'stats', label: 'Đạo thể', icon: '☯' },
    { id: 'skills', label: 'Công pháp', icon: '✧' },
    { id: 'roots', label: 'Linh căn', icon: '❋' },
    { id: 'bag', label: 'Hành trang', icon: '◈' }
  ];

  function header() {
    const s = UI.s(), g = UI.g();
    return `<header class="char-header">
      <div class="portrait"><img src="${A.heroPortrait(s.gender, s.realm)}" alt="${esc(s.name)}" decoding="async"></div>
      <div><span class="eyebrow gold">${esc(H.rootLabel(s.rootType, s.rootSub).toUpperCase())}</span><h2>${esc(s.name)}</h2>
        <p>${g.realmLabel()} · ${F.realm_map(s.zone)}</p>
        <p class="muted">Chủng tộc ${H.raceName(s.race)} · Tuổi ${num(Math.floor(s.age))} / thọ nguyên ${num(H.raceLife(s.race, s.realm) + s.extraLife)} năm</p></div>
    </header>`;
  }

  function stats() {
    const s = UI.s(), g = UI.g(), st = g.stats();
    const slots = Array.from({ length: 4 }, (_, i) => {
      const key = s.equipment[i];
      return key
        ? `<button class="gear-slot" data-act="equip" ${codeAttr(key)} title="Bấm để tháo">${img(key)}<small>${esc(H.item(key).name)}</small></button>`
        : `<button class="gear-slot empty" data-go="character:bag" title="Ô pháp bảo trống"><span>＋</span><small>Ô trống</small></button>`;
    }).join('');
    return `<div class="screen-grid">
      ${card('Chiến lực', [['Sinh lực', st.HP], ['Công kích', st.ATK], ['Phòng thủ', st.DEF], ['Thân pháp', st.SPD], ['Chiến lực', st.CP]].map(([k, v]) => row(k, num(v))).join('') + row('Bạo kích', pct(st.CRIT)) + row('Né tránh', pct(st.DODGE)), { eyebrow: 'CHỈ SỐ' })}
      ${card('Pháp bảo trang bị', `<div class="gear-row">${slots}</div><p class="info-note">Tối đa bốn pháp bảo, cao hơn cảnh giới một bậc. Vào tab Hành trang để trang bị.</p>`, { eyebrow: 'TRANG BỊ' })}
      ${card('Tu luyện', `
        ${row('Tu vi', num(s.qi) + ' / ' + num(g.need()))}${row('Tốc độ', num(g.rate()) + '/giây')}
        ${row('Tu vi từ đan / trần', num(s.pillRealmExp) + ' / ' + num(.25 * F.realm_exp_total(s.realm)))}
        ${row('Kháng đan tầng này', s.pillUses + ' viên')}`, { eyebrow: 'ĐẠO CẢNH' })}
      ${card('Thiên phú khởi nguyên', H.TALENT_INFO.map(t => {
        const v = s.talent?.[t.key] || 0;
        return row(t.name, v + ' điểm · ' + t.effect(v));
      }).join(''), { eyebrow: 'KHỞI NGUYÊN' })}
      ${card('Đạo vận · Thiên mệnh', `
        ${row('Đạo vận', num(s.daoVan))}${row('Tốc tu vĩnh viễn', '×' + num(F.prestige_mult(s.daoVan)))}${row('Số lần trọng sinh', s.rebirths)}${row('Điểm Thiên mệnh', num(s.meta?.points || 0))}
        <div class="action-group"><button class="btn btn-outline" data-go="world:prestige">Mở Trọng sinh ›</button><button class="btn btn-outline" data-go="meta">Mở Thiên mệnh ›</button></div>`, { eyebrow: 'LUÂN HỒI' })}
    </div>`;
  }

  function skills() {
    const s = UI.s(), g = UI.g();
    const learned = Object.keys(s.learned).map(key => `<div class="technique-item">${img(key)}<div><h3>${esc(H.item(key).name)}</h3>
      <p>${H.item(key).realm} · ${F.SUBPHAM[H.item(key).sub]} · Thuần thục ${pct(s.learned[key])}</p><p>${esc(H.item(key).description)}</p></div>
      ${btn(s.activeManuals.includes(key) ? 'Dừng vận hành' : 'Vận hành', 'activate', codeAttr(key))}</div>`).join('');
    const ups = ['Công kích +2%', 'Tốc tu +2%', 'Phòng thủ +2%', 'Điểm né +0,5%'].map((name, i) => {
      const n = s.tech[i] - 1;
      return card(`${name} · ${n}/20`, row('Giá một cấp', moneyHTML(F.cost(g.upgradeBase(i), 1.15, n))) +
        `<div class="action-group">${[1, 10, 'max'].map(k => btn(k === 'max' ? 'Tối đa' : '×' + k, 'upgrade', `data-index="${i}" data-count="${k}"`, n >= 20, 'btn-outline')).join('')}</div>`);
    }).join('');
    return `<p class="screen-lead">Vận hành tối đa ba công pháp. Thuần thục tăng khi tu luyện; thấp hơn một cảnh giới giảm nửa hiệu quả. Nhóm tốc tu tối đa +70%.</p>
      <div class="skill-list">${learned || empty('Chưa lĩnh ngộ công pháp nào. Vào tab Hành trang để lĩnh ngộ Dẫn Khí Quyết có sẵn.')}</div>
      <h3 class="section-title">Nâng cấp theo cảnh giới</h3>
      <p class="info-note">Giá tăng ×1,15 mỗi cấp. Nâng cấp thường và củng cố tối đa +40% tốc tu; cấp thường đặt lại khi qua đại cảnh giới.</p>
      <div class="screen-grid">${ups}</div>`;
  }

  function roots() {
    return UI.adventure.roots();
  }

  function itemDescription(key) {
    const x = H.item(key);
    return `<p>${esc(x.description)}</p>${row('Cảnh giới', x.realm)}${row('Phẩm chất', (x.grade || x.quality || '') + ' · ' + F.SUBPHAM[x.sub])}${row('Mã', esc(x.code))}${x.age ? row('Tuổi dược liệu', esc(x.age)) : ''}`;
  }

  function bag() {
    const s = UI.s(), g = UI.g(), v = UI.view;
    /* Hành trang hiện toàn bộ đồ trong túi: không còn bảng tra cứu/lọc/phân trang (tra cứu vật phẩm nằm ở Thế giới → Tra cứu). */
    const xs = Object.keys(s.bag).map(H.item).filter(Boolean)
      .sort((a, b) => a.tier - b.tier || a.kind.localeCompare(b.kind) || a.code.localeCompare(b.code) || a.sub - b.sub);
    const visible = xs;
    if (!xs.some(x => x.key === v.selected)) v.selected = visible[0]?.key || '';
    const x = H.item(v.selected), usable = x && ['PILL', 'TAL', 'GFT', 'CAT', 'FERT', 'SEED'].includes(x.kind);
    const main = x ? `${img(v.selected, 'detail-img')}<h3 class="detail-title">${esc(x.name)}</h3>${itemDescription(v.selected)}${row('Giá bán', moneyHTML(F.shop_sell_price(g.price(v.selected))))}
      <div class="detail-actions">${btn(x.kind === 'EQ' ? (s.equipment.includes(v.selected) ? 'Tháo' : 'Trang bị') : x.kind === 'BT' ? 'Lĩnh ngộ' : usable ? 'Sử dụng' : 'Công dụng',
        x.kind === 'EQ' ? 'equip' : x.kind === 'BT' ? 'learn' : usable ? 'consume' : 'info', codeAttr(v.selected))}${btn('Bán 1', 'sell', codeAttr(v.selected), s.equipment.includes(v.selected), 'btn-outline')}</div>` : empty('Chọn một vật phẩm.');
    return `<p class="screen-lead">${Object.keys(s.bag).length} loại và phẩm chất trong túi. Giá bán bằng 40% giá trị vật phẩm.</p>
      <div class="inventory-layout">
        <div class="card"><div class="inventory-items">${visible.map(i => `<button class="inventory-cell ${v.selected === i.key ? 'selected' : ''}" data-select="${esc(i.key)}" data-sub="${i.sub}" aria-label="${esc(i.name)} · ${F.SUBPHAM[i.sub]} phẩm · số lượng ${num(g.count(i.key))}">${img(i.key)}<span class="inv-count">×${num(g.count(i.key))}</span><span class="inv-sub" aria-hidden="true">${F.SUBPHAM[i.sub]}</span></button>`).join('') || empty('Không có vật phẩm phù hợp.')}</div></div>
        <div class="card item-detail">${main}</div>
      </div>`;
  }

  UI.register({
    id: 'character', label: 'Nhân vật', icon: 'ICON-MENU-003', eyebrow: 'ĐẠO THỂ',
    tabs: TABS,
    render: tab => header() + tabs(TABS, tab) + `<div class="screen-body">${{ stats, skills, roots, bag }[tab]()}</div>`,
    signature: () => {
      const s = UI.s();
      return [s.realm, s.stage, s.daoVan, s.meta?.points || 0, Object.keys(s.meta?.achievements || {}).length, s.rebirths, ...s.rootCraft.essence, ...s.rootCraft.levels, s.sect.id].join('|');
    }
  });

  UI.action('equip', (el, d) => {
    UI.command('equip', { code: d.code });
    const equipped = UI.s().equipment.includes(d.code);
    UI.toast((equipped ? 'Đã trang bị ' : 'Đã tháo ') + H.item(d.code).name + '.', { type: 'success', title: 'Pháp bảo' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_phu', fps: 12, size: 'clamp(100px,16vw,170px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('learn', (el, d) => {
    UI.command('learn', { code: d.code });
    UI.toast('Đã lĩnh ngộ ' + H.item(d.code).name + '.', { type: 'success', title: 'Công pháp' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_phu', fps: 12, size: 'clamp(110px,17vw,180px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('activate', (el, d) => {
    UI.command('activate', { code: d.code });
    const on = UI.s().activeManuals.includes(d.code);
    UI.toast((on ? 'Đang vận hành ' : 'Đã dừng ') + H.item(d.code).name + '.', { type: on ? 'success' : 'info', title: 'Công pháp' });
    if (on) UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_phu', fps: 12, size: 'clamp(100px,16vw,170px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('consume', (el, d) => {
    const x = H.item(d.code), msg = UI.command('use', { code: d.code });
    const bad = /thất bại|không thể|không đủ|chưa đủ/i.test(msg);
    UI.toast(msg, { type: bad ? 'danger' : 'success', title: bad ? 'Không thể dùng' : 'Sử dụng vật phẩm' });
    if (['PILL', 'TAL'].includes(x?.kind)) {
      if (x.effect === 'KIEP') UI.vfx?.hero({ kind: 'chien_dau', variant: 'ho_thuan', fps: 12 });
      else if (x.effect === 'HOI_PHUC') UI.vfx?.effect('heal');
      else UI.vfx?.effect(x.effect === 'DOT_PHA' ? 'break' : 'qi');
      UI.vfx?.ring('hero', x.effect === 'HOI_PHUC' ? '#63d6a3' : '#e6c164');
    }
  });
  UI.action('sell', (el, d) => {
    const price = money(F.shop_sell_price(UI.g().price(d.code)));
    UI.command('sell', { code: d.code });
    UI.toast('Đã bán ' + H.item(d.code).name + ' · +' + price + '.', { type: 'loot', title: 'Bán vật phẩm' });
  });
  UI.action('info', (el, d) => { UI.toast(H.item(d.code).description, { type: 'info', title: H.item(d.code).name }); return UI.KEEP; });
})(typeof window !== 'undefined' ? window : globalThis);
