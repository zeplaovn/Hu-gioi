/* HƯ GIỚI · MÀN THIÊN KIẾP
 * Phần chuẩn bị được render vào trang riêng #tribulationFx. Chỉ đại cảnh giới
 * mới bước vào nghi lễ độ kiếp; tiểu cảnh giới đột phá trực tiếp và ghi vào nhật ký. */
(function (root) {
  'use strict';
  const H = root.HU_GAME, F = H.F, A = root.HU_ASSETS;
  const UI = root.HU_UI;
  const { $, esc, num, money, pct, duration, row, btn, img, codeAttr, bar, card, empty } = UI.kit;

  const stageName = (realm, stage) => {
    const n = F.STAGES[realm];
    const label = n === 4 ? ['Sơ kỳ', 'Trung kỳ', 'Hậu kỳ', 'Đỉnh phong'][stage - 1] : realm === 13 ? ['Nhập Đạo', 'Hợp Đạo', 'Vô Thượng'][stage - 1] : 'Tầng ' + stage;
    return F.REALMS[realm] + ' · ' + label;
  };

  function prepItems() {
    const s = UI.s(), g = UI.g();
    return Object.keys(s.bag).map(H.item)
      .filter(x => x && x.tier <= s.realm + 1 && ((x.kind === 'PILL' && ['KIEP', 'DOT_PHA'].includes(x.effect)) || (x.kind === 'TAL' && x.effect === 'KIEP')))
      .sort((a, b) => b.tier - a.tier || b.sub - a.sub)
      .slice(0, 10)
      .map(x => {
        const e = F.dan_effect(x.effect, s.realm, s.stage - 1, x.sub, x.kind === 'TAL' ? 0 : s.pillUses, Math.max(0, s.realm - x.tier));
        const text = x.effect === 'KIEP'
          ? `Khiên ${pct(e.khien_theo_HP)} sinh lực · giảm ${pct(e.giam_sat_thuong)} sát thương`
          : `+${pct(e.cong_xac_suat)} xác suất đột phá`;
        return `<article class="shop-item">${img(x.key)}<div><h3>${esc(x.name)} <em>×${g.count(x.key)}</em></h3><p>${text}</p></div>${btn('Dùng', 'consume', codeAttr(x.key), false, 'btn-outline')}</article>`;
      }).join('');
  }

  function chanceCard() {
    const s = UI.s(), g = UI.g();
    return card('Xác suất đột phá', `
      <div class="trib-chance-line"><b id="tribPrepChance">${pct(g.chance())}</b><span id="tribPrepChanceNote">trần 98%</span></div>
      ${row('Xác suất hiện tại', pct(g.chance()))}
      ${row('Bảo hiểm thất bại', s.pity + '/15')}${bar(s.pity / 15 * 100)}
      ${row('Điểm hỗ trợ đan', num(s.breakBonus))}
      ${row('Chúc phúc tông môn', s.sect.blessing ? '+10%' : 'Chưa bật')}
      ${row('Hệ số chịu kiếp của linh căn', '×' + (F.LINH_CAN_TRIB[s.rootType] || 1))}
      <p class="info-note">Thất bại mất 15% tu vi và tăng 1 điểm bảo hiểm lần sau (tối đa 15 lần). Trần xác suất 98% (Vận Khí cộng thêm sau ngưỡng 95%).</p>`, { eyebrow: 'TỈ LỆ' });
  }

  function defenseCard() {
    const s = UI.s(), g = UI.g(), st = g.stats();
    return card('Hộ kiếp hiện có', `
      ${row('Khiên', pct(s.shield) + ' sinh lực')}${row('Giảm sát thương', pct(s.reduction))}
      ${row('Sinh lực tối đa', num(st.HP))}${row('Phòng thủ', num(st.DEF))}
      <div class="trib-defense-badges">
        <span class="${s.shield > 0 ? 'on' : ''}">Hộ thuẫn ${pct(s.shield)}</span>
        <span class="${s.reduction > 0 ? 'on' : ''}">Giảm thương ${pct(s.reduction)}</span>
        <span class="${s.breakBonus > 0 ? 'on' : ''}">Hỗ trợ ${num(s.breakBonus)}</span>
      </div>
      <p class="info-note">Đan và phù hộ kiếp chỉ lấy hiệu ứng mạnh nhất, và mất sau lần đột phá kế tiếp.</p>`, { eyebrow: 'PHÒNG NGỰ' });
  }

  function itemsCard() {
    const prep = prepItems();
    return card('Chuẩn bị đan / phù', prep
      ? `<div class="shop-list">${prep}</div>`
      : `${empty('Chưa có đan hay phù hộ kiếp trong túi.')}<div class="action-group"><button class="btn btn-outline" data-go="world:shop">Mua ở Cửa hàng</button><button class="btn btn-outline" data-go="craft:dan">Tự luyện đan</button></div>`,
      { eyebrow: 'HÀNH TRANG', cls: 'wide' });
  }

  function minorCard() {
    const s = UI.s(), g = UI.g(), chance = g.chance();
    return card('Tiểu cảnh giới · đột phá tại chỗ', `
      <div class="trib-minor-head">
        <div><span class="eyebrow">KHÔNG LÔI KIẾP</span><h3>${esc(stageName(s.realm, s.stage))} → ${esc(stageName(s.realm, s.stage + 1))}</h3></div>
        <div class="chance-ring small" style="--p:${(chance * 100).toFixed(1)}%"><b>${pct(chance)}</b><small>xác suất</small></div>
      </div>
      <p>Tầng nhỏ không triệu hồi lôi kiếp. Đột phá dựa hoàn toàn vào xác suất; thất bại mất 15% tu vi và tăng bảo hiểm. Kết quả được ghi thẳng vào nhật ký thông báo.</p>
      ${row('Tu vi', '<span id="tribMinorQi">' + num(s.qi) + ' / ' + num(g.need()) + '</span>')}${bar(Math.min(100, s.qi / g.need() * 100), '', 'tribMinorQiFill')}
      ${row('Bảo hiểm', s.pity + '/15')}
      <div class="action-group">${btn('Đột phá tầng', 'break', '', s.qi < g.need())}<button class="btn btn-outline" data-go="idle">Về tu luyện</button></div>
      <p class="info-note">Đại cảnh giới kế tiếp mới mở Độ kiếp đài với lôi kiếp và hộ kiếp đầy đủ.</p>`, { eyebrow: 'TIỂU CẢNH GIỚI', cls: 'wide' });
  }

  function completedCard() {
    return card('Đạo Tổ viên mãn', `
      <p>Đạo cơ đã hợp nhất với Thiên đạo. Không còn lôi kiếp nào có thể lay chuyển bạn.</p>
      <p class="info-note">Trọng sinh để nhận Đạo vận, mở vòng tu hành mới với tốc độ cao hơn.</p>
      <div class="action-group"><button class="btn btn-gold" data-go="world:prestige">Mở Trọng sinh</button><button class="btn btn-outline" data-go="idle">Về tiên sơn</button></div>`, { eyebrow: 'ĐẠO TỔ', cls: 'wide' });
  }

  function render() {
    const s = UI.s();
    if (s.completed) return completedCard();
    if (s.stage !== F.STAGES[s.realm]) return minorCard();
    return chanceCard() + defenseCard() + itemsCard();
  }

  function update() {
    const el = $('tribPrepChance');
    if (!el) return;
    const c = UI.g().chance();
    el.textContent = pct(c);
    const note = $('tribPrepChanceNote');
    if (note) note.textContent = c >= .98 ? 'đã chạm trần' : 'trần 98%';
  }

  function request() {
    const s = UI.s(), g = UI.g();
    if (s.completed) throw Error('Đạo Tổ đã chứng đạo. Có thể trọng sinh.');
    if (s.qi < g.need()) throw Error('Tu vi chưa đầy.');
    if (s.stage === F.STAGES[s.realm]) {
      const next = s.realm < 13 ? F.REALMS[s.realm + 1] : 'Đạo Tổ';
      UI.modal('Thiên kiếp giáng thế',
        `<p>Đại cảnh giới <b>${esc(F.REALMS[s.realm])}</b> đã đủ duyên. Thiên đạo triệu hồi lôi kiếp để bước vào <b>${esc(next)}</b>.</p>` +
        `<p>Nhận kiếp sẽ mở Độ kiếp đài. Thất bại mất 15% tu vi; đan và phù hộ kiếp chỉ phát huy tác dụng trên đài.</p>`,
        () => UI.go('tribulation'), 'Nhận thiên kiếp', 'THIÊN ĐẠO',
        { type: 'gold', symbol: '⚡', vfx: ['loi_kiep', 'ha_gioi'] });
      return UI.KEEP;
    }
    /* Tiểu cảnh giới: đột phá trực tiếp, không hộp thoại kết quả. Nhật ký là nơi công bố. */
    const result = UI.command('breakthrough');
    const world = A.tribWorld ? A.tribWorld(s.realm) : 'ha_gioi';
    const onTrib = !!UI.tribulation?.pageOpen;
    const target = onTrib ? 'trib' : 'hero';
    if (onTrib) {
      UI.vfx?.tribStage({ kind: 'loi_kiep', variant: world, fps: 12, size: 'calc(var(--hero-size) * 2.2)' });
    } else {
      UI.vfx?.stage({ kind: 'loi_kiep', variant: world, fps: 12, size: 'clamp(120px,20vw,220px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
    }
    if (result.success) {
      UI.vfx?.effect('break', target);
      UI.vfx?.ring(target);
      UI.vfx?.burst(target, '#ffe29a', 18);
      UI.vfx?.screenFlash('flash-gold', 520);
      UI.vfx?.float('Đột phá · ' + g.realmLabel(), target, 'skill');
    } else {
      UI.vfx?.effect('hit', target);
      UI.vfx?.screenFlash('flash-red', 420);
      UI.vfx?.float('Thất bại · mất 15% tu vi', target);
    }
    return undefined;
  }

  UI.register({
    id: 'tribulation', label: 'Thiên kiếp', icon: 'ICON-MENU-010', eyebrow: 'THIÊN ĐẠO',
    render, update,
    signature: () => {
      const s = UI.s();
      return [s.qi >= UI.g().need(), s.stage, s.realm, s.completed, s.gender, s.shield, s.reduction, s.pity, s.breakBonus, JSON.stringify(s.bag), s.pillUses, UI.g().chance()].join('|');
    }
  });

  UI.tribulationScreen = { render, prepItems, stageName };
  UI.action('break', () => request());
})(typeof window !== 'undefined' ? window : globalThis);
