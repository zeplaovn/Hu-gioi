/* HƯ GIỚI · MÀN GIAO DU
 * Tri kỷ, đạo hữu, luận kiếm PvP và bảng xếp hạng. Toàn bộ tương tác lưu trong
 * state.social; không cần máy chủ và vẫn chạy tốt qua file://. */
(function (root) {
  'use strict';
  const H = root.HU_GAME, F = H.F, A = root.HU_ASSETS;
  const UI = root.HU_UI;
  const { esc, num, money, moneyHTML, pct, row, btn, card, tabs, live } = UI.kit;

  const TABS = [
    { id: 'friends', label: 'Tri kỷ', icon: '♡' },
    { id: 'dao', label: 'Đạo hữu', icon: '✧' },
    { id: 'pvp', label: 'PvP', icon: '⚔' },
    { id: 'ranking', label: 'Bảng xếp hạng', icon: '♛' }
  ];

  const PVP_CD = 25000;
  const DISCUSS_CD = 120000;

  const FRIENDS = [
    { id: 'trieu-nguyet', name: 'Triệu Nguyệt', gender: 'nu', realm: 2, title: 'Thanh Vân kiếm tu', line: 'Một kiếm thanh minh, nguyện cùng đạo hữu soi rọi tiên lộ.' },
    { id: 'ho-thanh', name: 'Hồ Thanh', gender: 'nam', realm: 4, title: 'Tán tu dược sư', line: 'Ta giữ vườn thuốc, ngươi giữ đạo tâm. Gặp nhau là duyên.' },
    { id: 'bach-tuyet', name: 'Bạch Tuyết', gender: 'nu', realm: 6, title: 'Băng cốc truyền nhân', line: 'Tuyết rơi vô thanh, nhưng lời hẹn của người ta nhớ rất rõ.' },
    { id: 'mac-kiem', name: 'Mạc Kiếm', gender: 'nam', realm: 8, title: 'Kiếm si tán nhân', line: 'Thiên hạ kiếm pháp vô cùng; có tri kỷ cùng luận mới thú.' }
  ];

  const DAO = [
    { id: 'ly-van-du', name: 'Lý Vân Du', gender: 'nam', realm: 1, school: 'Kiếm đạo', line: 'Đạo hữu, một chén trà đổi một tầng cảnh ngộ?' },
    { id: 'to-mong', name: 'Tô Mộng', gender: 'nu', realm: 3, school: 'Đan đạo', line: 'Linh khí quanh người huynh thật dễ chịu, cùng luận một chút chứ?' },
    { id: 'han-tu', name: 'Hàn Tử', gender: 'nam', realm: 5, school: 'Trận pháp', line: 'Trận pháp không chỉ để vây địch, còn để giữ tâm.' },
    { id: 'diep-lan', name: 'Diệp Lan', gender: 'nu', realm: 7, school: 'Âm dương', line: 'Âm dương chuyển hóa, đạo hữu thấy được bao nhiêu phần?' },
    { id: 'van-thuong', name: 'Vân Thương', gender: 'nam', realm: 9, school: 'Lôi pháp', line: 'Sấm sét không đáng sợ; đáng sợ là tâm mình động trước sấm sét.' },
    { id: 'dao-quang', name: 'Dao Quang', gender: 'nu', realm: 11, school: 'Tinh tú', line: 'Mỗi vì sao là một lời nhắc: đừng quên mình đến từ đâu.' }
  ];

  const RIVALS = [
    { id: 'hanh-chu', name: 'Hành Chu', gender: 'nam', realm: 2, power: .78, rating: 960, school: 'Quyền pháp' },
    { id: 'lieu-yen', name: 'Liễu Yên', gender: 'nu', realm: 4, power: .96, rating: 1010, school: 'Phiêu vân kiếm' },
    { id: 'thach-cuong', name: 'Thạch Cương', gender: 'nam', realm: 6, power: 1.12, rating: 1060, school: 'Kim cương thể' },
    { id: 'tich-da', name: 'Tịch Dạ', gender: 'nam', realm: 8, power: 1.28, rating: 1120, school: 'Ám ảnh đạo' }
  ];

  const RANKS = [
    { name: 'Đạo Tổ Huyền Cơ', realm: 13, rating: 1380, title: 'Chấp chưởng thiên đạo' },
    { name: 'Thiên Kiếm Tôn', realm: 12, rating: 1310, title: 'Kiếm ý phá vân' },
    { name: 'Bạch Cốt Tiên', realm: 11, rating: 1250, title: 'Tử khí hóa tiên' },
    { name: 'Lưu Ly Chân Nhân', realm: 10, rating: 1180, title: 'Một niệm thành xuân' },
    { name: 'Vô Danh Kiếm Khách', realm: 9, rating: 1120, title: 'Kiếm xuất vô ảnh' },
    { name: 'Mộc Uyển Nhi', realm: 7, rating: 1070, title: 'Linh dược chi chủ' },
    { name: 'Tần Trường Ca', realm: 6, rating: 1020, title: 'Ca vang ba giới' }
  ];

  const affinityRank = v => v >= 90 ? 'Sinh tử chi giao' : v >= 50 ? 'Tri kỷ' : v >= 20 ? 'Tương tri' : 'Sơ giao';
  const pvpTier = r => r >= 1350 ? 'Kiếm tiên' : r >= 1200 ? 'Tông sư' : r >= 1050 ? 'Kiếm khách' : r >= 900 ? 'Tán tu' : 'Sơ nhập';
  const giftCost = f => 120 + f.realm * 90;
  const discussGain = () => Math.max(1, Math.floor(UI.g().need() * .02));

  const portrait = f => A.heroPortrait(f.gender, f.realm);

  function friendCard(f) {
    const s = UI.s(), st = s.social.friends[f.id], met = !!st?.metAt, aff = st?.affinity || 0;
    return `<article class="social-card ${met ? '' : 'is-locked'}">
      <div class="social-portrait"><img src="${portrait(f)}" alt="${esc(f.name)}" loading="lazy" decoding="async"></div>
      <div class="social-copy">
        <span class="eyebrow">${esc(f.title)}</span><h3>${esc(f.name)}</h3>
        <p>${esc(f.line)}</p>
        ${met ? `<div class="affinity-line"><span>${affinityRank(aff)}</span><b>${aff}/100</b></div><div class="affinity-bar"><i style="width:${aff}%"></i></div>` : '<p class="info-note">Chưa kết giao · gặp gỡ để mở tương tác.</p>'}
      </div>
      <div class="social-actions">${met
        ? btn(aff >= 100 ? 'Tình nghĩa viên mãn' : `Tặng lễ · ${moneyHTML(giftCost(f))}`, 'moreGift', `data-id="${f.id}"`, aff >= 100, 'btn-outline')
        : btn('Kết giao', 'moreMeet', `data-id="${f.id}"`)}</div>
    </article>`;
  }

  function friends() {
    const met = Object.values(UI.s().social.friends).filter(f => f.metAt).length;
    return `<p class="screen-lead">Tri kỷ là những người đồng hành trên tiên lộ. Kết giao, tặng lễ để nâng tình nghĩa; mỗi vị có một câu chuyện riêng.</p>
      ${card('Tình nghĩa đã kết', `${row('Số tri kỷ', met + ' / ' + FRIENDS.length)}${row('Tặng lễ', 'Tăng 8–20 tình nghĩa')}${row('Giới hạn', '100 tình nghĩa mỗi người')}<p class="info-note">Tặng lễ tiêu linh thạch. Tình nghĩa không giảm theo thời gian hay trọng sinh.</p>`, { eyebrow: 'GIAO TÌNH' })}
      <div class="social-list">${FRIENDS.map(friendCard).join('')}</div>`;
  }

  function daoCard(f) {
    const st = UI.s().social.friends[f.id], end = st?.discussAt || 0, ready = Date.now() >= end;
    return `<article class="social-card compact">
      <div class="social-portrait small"><img src="${portrait(f)}" alt="${esc(f.name)}" loading="lazy" decoding="async"></div>
      <div class="social-copy"><span class="eyebrow">${esc(f.school)} · ${esc(F.REALMS[f.realm])}</span><h3>${esc(f.name)}</h3><p>${esc(f.line)}</p>
        <p class="info-note">Luận đạo nhận khoảng <b>${num(discussGain())}</b> tu vi · hồi ${Math.round(DISCUSS_CD / 1000)} giây.</p></div>
      <div class="social-actions">${btn(ready ? 'Luận đạo' : 'Đang bế quan', 'moreDiscuss', `data-id="${f.id}"`, !ready)}<p class="cooldown">${ready ? 'Sẵn sàng' : live(end)}</p></div>
    </article>`;
  }

  function dao() {
    return `<p class="screen-lead">Đạo hữu bốn phương cùng luận đạo. Mỗi lần luận đạo nhận một ít tu vi, tăng nhẹ tình nghĩa và có thời gian hồi riêng.</p>
      ${card('Luận đạo', `${row('Tu vi mỗi lần', '≈ ' + num(discussGain()))}${row('Thời gian hồi', Math.round(DISCUSS_CD / 1000) + ' giây')}${row('Tình nghĩa', '+1 mỗi lần')}<p class="info-note">Tu vi nhận được không vượt quá thanh tu vi hiện tại. Khi tu vi đã đầy, hãy đột phá trước.</p>`, { eyebrow: 'ĐỒNG ĐẠO' })}
      <div class="social-list">${DAO.map(daoCard).join('')}</div>`;
  }

  function pvp() {
    const s = UI.s(), pvp = s.social.pvp, g = UI.g(), my = g.stats().CP, ready = Date.now() >= pvp.lastAt + PVP_CD;
    return `<p class="screen-lead">Luận kiếm với các cao thủ cùng cảnh giới. Thắng tăng danh vọng, nhận linh thạch và tu vi; thua mất một ít danh vọng.</p>
      <div class="screen-grid">
        ${card('Đài luận kiếm', `<div class="pvp-rating"><b>${num(pvp.rating)}</b><span>${pvpTier(pvp.rating)}</span></div>
          ${row('Thắng / Thua', num(pvp.wins) + ' / ' + num(pvp.losses))}${row('Chuỗi thắng', num(pvp.streak))}${row('Danh vọng cao nhất', num(pvp.best))}${row('Chiến lực của bạn', num(my))}
          <p class="info-note">Mỗi trận hồi ${Math.round(PVP_CD / 1000)} giây. Thắng +18–25, thua −12–19 danh vọng.</p>`, { eyebrow: 'DANH VỌNG' })}
        ${card('Quy tắc', `<p>Đối thủ được mô phỏng theo chiến lực hiện tại, nên mỗi cảnh giới đều có thử thách riêng.</p>${row('Thắng', 'Linh thạch · tu vi · danh vọng')}${row('Thua', 'Mất danh vọng, không mất tu vi')}${row('Trạng thái', ready ? 'Sẵn sàng' : live(pvp.lastAt + PVP_CD))}`, { eyebrow: 'LUẬT ĐẤU' })}
      </div>
      <div class="social-list pvp-list">${RIVALS.map(f => {
        const power = Math.max(1, Math.round(my * f.power)), chance = F.win_probability(my, power);
        return `<article class="social-card compact">
          <div class="social-portrait small"><img src="${portrait(f)}" alt="${esc(f.name)}" loading="lazy" decoding="async"></div>
          <div class="social-copy"><span class="eyebrow">${esc(f.school)} · ${esc(F.REALMS[f.realm])}</span><h3>${esc(f.name)}</h3>
            <p>Chiến lực đối thủ <b>${num(power)}</b> · kỳ vọng thắng <b>${pct(chance)}</b></p>
            <p class="info-note">Danh vọng nền ${num(f.rating)} · phần thưởng theo cảnh giới hiện tại.</p></div>
          <div class="social-actions">${btn('Luận kiếm', 'moreDuel', `data-id="${f.id}"`, !ready)}<p class="cooldown">${ready ? 'Sẵn sàng' : live(pvp.lastAt + PVP_CD)}</p></div>
        </article>`;
      }).join('')}</div>`;
  }

  function ranking() {
    const s = UI.s(), pvp = s.social.pvp;
    const entries = [...RANKS.map(r => ({ ...r, you: false })), { name: s.name, realm: s.realm, rating: pvp.rating, title: 'Đạo hữu hữu duyên', you: true }]
      .sort((a, b) => b.rating - a.rating);
    const mine = entries.findIndex(e => e.you) + 1;
    return `<p class="screen-lead">Bảng xếp hạng danh vọng ba giới. Hạng của bạn được cập nhật sau mỗi trận luận kiếm; thứ hạng chỉ là hư danh, đạo tâm mới là thật.</p>
      ${card('Thứ hạng của bạn', `<div class="rank-me"><b>#${mine}</b><span>${esc(s.name)}</span><em>${num(pvp.rating)} danh vọng</em></div>${row('Cảnh giới', UI.g().realmLabel())}${row('Thắng / Thua', num(pvp.wins) + ' / ' + num(pvp.losses))}`, { eyebrow: 'HIỆN TẠI' })}
      <div class="rank-list">${entries.map((e, i) => `<div class="rank-row ${e.you ? 'you' : ''} ${i < 3 ? 'top' : ''}">
        <span class="rank-no">${i < 3 ? ['Ⅰ', 'Ⅱ', 'Ⅲ'][i] : '#' + (i + 1)}</span>
        <span class="rank-name"><b>${esc(e.name)}</b><small>${esc(F.REALMS[e.realm] || '')} · ${esc(e.title || '')}</small></span>
        <span class="rank-rating">${num(e.rating)}<small>danh vọng</small></span>
      </div>`).join('')}</div>`;
  }

  const body = { friends, dao, pvp, ranking };

  UI.register({
    id: 'more', label: 'Giao du', icon: '♡', eyebrow: 'GIAO DU', tabs: TABS,
    render: tab => `<header class="screen-title"><span class="eyebrow gold">GIAO DU</span><h2>Giao du</h2></header>${tabs(TABS, tab)}<div class="screen-body">${body[tab]()}</div>`,
    signature: () => {
      const s = UI.s(), now = Date.now(), pvp = s.social.pvp;
      const f = Object.values(s.social.friends).map(v => v.affinity + ':' + (v.discussAt <= now ? 1 : 0)).join(',');
      return f + '|' + pvp.rating + '|' + pvp.wins + '|' + pvp.losses + '|' + pvp.streak + '|' + pvp.best + '|' + (pvp.lastAt + PVP_CD <= now ? 1 : 0);
    }
  });

  const findFriend = id => FRIENDS.find(f => f.id === id);
  const findDao = id => DAO.find(f => f.id === id);
  const findRival = id => RIVALS.find(f => f.id === id);

  UI.action('moreMeet', (el, d) => {
    const f = findFriend(d.id);
    if (!f) throw Error('Không tìm thấy vị đạo hữu này.');
    UI.g().meetFriend(d.id, Date.now());
    UI.toast('Đã kết giao với ' + f.name + '.', { type: 'success', title: 'Tri kỷ' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_phu', fps: 12, size: 'clamp(100px,16vw,170px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });

  UI.action('moreGift', (el, d) => {
    const f = findFriend(d.id);
    if (!f) throw Error('Không tìm thấy vị đạo hữu này.');
    const aff = UI.g().giftFriend(d.id, giftCost(f), 8 + f.realm, Date.now());
    UI.toast('Tặng lễ ' + f.name + ' · tình nghĩa ' + aff + '/100.', { type: 'gold', title: 'Tri kỷ' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_phu', fps: 12, size: 'clamp(100px,16vw,170px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });

  UI.action('moreDiscuss', (el, d) => {
    const f = findDao(d.id);
    if (!f) throw Error('Không tìm thấy vị đạo hữu này.');
    const r = UI.g().discuss(d.id, Date.now(), discussGain(), DISCUSS_CD);
    UI.toast('Luận đạo cùng ' + f.name + ' · tu vi +' + num(r.gain) + '.', { type: 'success', title: 'Đạo hữu' });
    UI.vfx?.effect('qi');
    UI.vfx?.ring('hero', '#70d4e8');
  });

  UI.action('moreDuel', (el, d) => {
    const f = findRival(d.id);
    if (!f) throw Error('Không tìm thấy đối thủ này.');
    const power = Math.max(1, Math.round(UI.g().stats().CP * f.power));
    const r = UI.g().duel(power, Date.now(), PVP_CD);
    UI.toast((r.win ? 'Thắng ' : 'Thua ') + f.name + ' · danh vọng ' + (r.delta > 0 ? '+' : '') + r.delta +
      (r.win ? ' · +' + money(r.reward) + ' · +' + num(r.exp) + ' tu vi' : '') + '.',
      { type: r.win ? 'success' : 'danger', title: r.win ? 'Luận kiếm thắng' : 'Luận kiếm thua' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: r.win ? 'phi_thang' : 'ha_gioi', fps: 14, size: 'clamp(120px,19vw,200px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
    if (r.win) UI.vfx?.ring('hero', '#e6c164');
  });
})(typeof window !== 'undefined' ? window : globalThis);
