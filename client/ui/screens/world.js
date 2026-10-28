/* HƯ GIỚI · MÀN THẾ GIỚI */
(function (root) {
  'use strict';
  const H = root.HU_GAME, F = H.F, A = root.HU_ASSETS;
  const UI = root.HU_UI;
  const { abs, $, esc, num, money, moneyHTML, coinLabel, pct, duration, row, btn, img, codeAttr, card, empty, tabs, live } = UI.kit;
  const { QUESTS } = UI.data;
  const { lists } = UI;

  const TABS = [
    { id: 'map', label: 'Bản đồ', icon: '✥' },
    { id: 'dungeons', label: 'Bí cảnh', icon: '⚔' },
    { id: 'quests', label: 'Nhiệm vụ', icon: '✦' },
    { id: 'sect', label: 'Tông môn', icon: '⌂' },
    { id: 'encounter', label: 'Kỳ ngộ', icon: '❂' },
    { id: 'shop', label: 'Cửa hàng', icon: '◈' },
    { id: 'auction', label: 'Đấu giá', icon: '⚖' },
    { id: 'catalog', label: 'Tra cứu', icon: '☰' },
    { id: 'prestige', label: 'Trọng sinh', icon: '☯' }
  ];

  const map = () => {
    const s = UI.s();
    const realms = [['Hạ Giới', 0, 'ha_gioi'], ['Linh Giới', 5, 'linh_gioi'], ['Tiên Giới', 9, 'tien_gioi']];
    const here = A.worldOf(s.realm);
    return `<p class="screen-lead">Hạ Giới: Luyện Khí–Hóa Thần · Linh Giới: Luyện Hư–Độ Kiếp · Tiên Giới: Chân Tiên–Đạo Tổ.</p>
      <div class="map-grid">${realms.map(([name, r, w]) => `<div class="realm-card ${s.realm < r ? 'locked' : ''}" style="background-image:linear-gradient(#0003,#07131bf2),url('${abs(A.BG[w])}')"><div class="realm-card-content"><h3>${name}</h3><p>Mở từ ${F.REALMS[r]}</p><span class="pill">${s.realm >= r ? 'Đã khai mở' : 'Chưa mở'}</span></div></div>`).join('')}</div>
      <figure class="world-map"><img src="${A.MAPS[here]}" alt="Bản đồ ${A.WORLD_NAME[here]}" loading="lazy" decoding="async"><figcaption>Bản đồ ${A.WORLD_NAME[here]}</figcaption></figure>
      <div class="action-group"><button class="btn btn-gold" data-go="combat">⚔ Chọn khu vực lịch luyện ›</button><button class="btn btn-outline" data-go="world:dungeons">Khám phá bí cảnh ›</button></div>`;
  };

  const quests = () => {
    const s = UI.s(), g = UI.g(), fragments = H.ITEMS.filter(x => x.kind === 'QITEM');
    return `<p class="screen-lead">Mỗi nhiệm vụ nhận thưởng một lần trong mỗi vòng tu hành.</p><div class="screen-grid">${QUESTS.map(([id, name, max, stone, pill, qty]) =>
      card(name, `${row('Tiến độ', num(Math.min(max, s.progress[id])) + ' / ' + max)}<p>${moneyHTML(stone)} · ${esc(H.item(pill).name)} ×${qty}</p>${btn(s.claimed.includes(id) ? 'Đã nhận' : 'Nhận thưởng', 'claimQuest', `data-id="${id}"`, s.claimed.includes(id) || s.progress[id] < max)}`)).join('')}
      ${card('Hợp nhất đạo ấn', `<p>Gom sáu mảnh ở kỳ ngộ Đạo Tổ để đổi 10 Đạo vận.</p>${fragments.map(x => row(x.name, g.count(x.code) + '/1')).join('')}${btn('Hợp ấn', 'fragments', '', !fragments.every(x => g.count(x.code) > 0) || s.claimed.includes('fragments'))}`)}</div>`;
  };

  const sect = () => UI.adventure.sect();
  const encounter = () => UI.adventure.encounters();
  const dungeons = () => UI.adventure.dungeons();

  const shop = () => {
    const s = UI.s(), g = UI.g(), v = UI.view;
    const xs = H.ITEMS.filter(x => x.kind !== 'QITEM' && x.tier <= s.realm + 1 && lists.matches(x));
    return `<p class="screen-lead">Mở đến một cảnh giới cao hơn. Giá mua = 120% giá trị. Số dư ${moneyHTML(s.stone)}.</p>${lists.controls({ quality: true })}${lists.pager(xs.length)}
      <div class="shop-list">${lists.slice(xs).map(x => {
        const key = ['PILL', 'EQ', 'BT', 'TAL'].includes(x.kind) ? H.keyFor(x.code, v.quality) : x.code;
        return `<article class="shop-item">${img(key)}<div><h3>${esc(x.name)}</h3><p>${x.category} · ${x.realm} · ${F.SUBPHAM[H.item(key).sub]} phẩm</p><p>${esc(x.description)}</p></div>${btn(moneyHTML(F.shop_buy_price(g.price(key))), 'buy', codeAttr(key))}</article>`;
      }).join('')}</div>
      ${card('Yêu đan và linh thạch', `${row('Giá trị yêu đan', moneyHTML(s.yaoValue))}${btn('Bán yêu đan', 'sellYao', '', s.yaoValue <= 0)}<p>Hấp thu linh thạch để đổi lấy tu vi với hiệu suất 15%; loại thấp hơn cảnh giới bị giảm hiệu quả.</p><div class="action-group coin-row">${F.COINS.map(([n, val], i) => btn('Hấp thu 1 ' + coinLabel(n), 'absorb', `data-index="${i}"`, s.stone < val, 'btn-outline')).join(' ')}</div>`)}`;
  };

  const auction = () => {
    const s = UI.s(), g = UI.g();
    return `<p class="screen-lead">Phiên mô phỏng kết thúc đầu giờ tiếp theo. Đặt mỗi lô một lần; vật phẩm giao tự động khi kết phiên.</p><p>${live((s.auction.cycle + 1) * 3600000)}</p>
      <div class="auction-lots">${g.lots().map(x => `<section class="auction-lot">${img(x.code)}<h3>${esc(x.name)}</h3><p>${moneyHTML(g.price(x.code))}</p>${btn(s.auction.offers[x.code] ? 'Đã đặt' : 'Đặt giá', 'bid', codeAttr(x.code), !!s.auction.offers[x.code])}</section>`).join('')}</div>`;
  };

  const catalog = () => {
    const xs = H.ITEMS.filter(lists.matches);
    return `<p class="screen-lead">493 mã vật phẩm · 61 đan dược · 80 linh thảo. Tìm bằng tên mới, tên cũ hoặc ID.</p>${lists.controls()}${lists.pager(xs.length)}
      <div class="shop-list">${lists.slice(xs).map(x => `<article class="shop-item">${img(x.code)}<div><h3>${esc(x.name)}</h3><p>${x.code} · ${x.category} · ${x.realm} · ${F.SUBPHAM[x.sub]}</p><p>${esc(x.description)}</p><small>Tên cũ: ${esc(x.originalName)}</small></div></article>`).join('')}</div>`;
  };

  const prestige = () => {
    const s = UI.s(), reward = F.dao_van(s.totalRunExp), remaining = Math.max(0, F.exp_for_dao_van(Math.max(10, reward + 1)) - s.totalRunExp);
    return `<p class="screen-lead">Mở từ 10 Đạo vận nhận được. Giữ công pháp đã lĩnh ngộ, thiên phú, nâng cấp offline và cài đặt.</p><div class="screen-grid">
      ${card('Chuyển thế', `${row('Tu vi thực nhận vòng này', num(s.totalRunExp))}${row('Phần thưởng', num(reward) + ' Đạo vận')}${row('Tu vi tới mốc kế tiếp', num(remaining))}${row('Số lần trọng sinh', s.rebirths)}${btn('Trọng sinh', 'prestige', '', reward < 10)}<p class="info-note">Đặt lại cảnh giới, tiền, túi đồ, nâng cấp thường và nhiệm vụ. Tu vi tràn ngưỡng đột phá không tính Đạo vận.</p>`)}
      ${card('Bế quan vĩnh viễn', `${row('Đạo vận', num(s.daoVan))}${row('Giới hạn offline', duration(F.offline_cap(s.offlineCap)))}${btn('+2 giờ · ' + (2 + s.offlineCap) + ' Đạo vận', 'offlineCap', '', s.offlineCap >= 8)}${row('Hiệu suất offline', pct(F.offline_efficiency(s.offlineEff)))}${btn('+5 điểm % · ' + (2 + s.offlineEff) + ' Đạo vận', 'offlineEff', '', s.offlineEff >= 8)}<p class="info-note">Tối đa 24 giờ và 100%. Tiêu Đạo vận sẽ giảm hệ số tốc tu tương ứng.</p>`)}
      ${card('Thiên mệnh', `${row('Điểm khả dụng', num(s.meta?.points || 0))}${row('Thành tựu', Object.keys(s.meta?.achievements || {}).length + '/' + H.META_ACHIEVEMENTS.length)}${row('Kiếp trước', num(s.meta?.history?.length || 0))}<button class="btn btn-outline" data-go="meta">Mở Thiên mệnh ›</button><p class="info-note">Thành tựu và nâng cấp vĩnh viễn được giữ qua trọng sinh.</p>`, { eyebrow: 'XUYÊN KIẾP' })}</div>`;
  };

  const body = { map, dungeons, quests, sect, encounter, shop, auction, catalog, prestige };
  UI.register({
    id: 'world', label: 'Thế giới', icon: 'ICON-MENU-007', eyebrow: 'BA GIỚI', tabs: TABS,
    render: tab => `<header class="screen-title"><span class="eyebrow gold">BA GIỚI</span><h2>Thế giới</h2></header>${tabs(TABS, tab)}<div class="screen-body">${body[tab]()}</div>`,
    update: () => UI.adventure.update(),
    signature: tab => {
      const s = UI.s(), g = UI.g();
      return [s.realm, s.stage, s.sect.joined, s.sect.id, s.sect.earned, s.sect.contribution, s.sect.mission?.id || '', s.sect.mission?.end || 0, s.sect.blessing, s.sect.last?.at, s.sect.repeat, s.meta?.points || 0,
        s.dungeon.active?.end || 0, s.dungeon.last?.at || 0, s.encounter.total, Math.floor(Date.now() / 864e5),
        tab === 'dungeons' || tab === 'sect' ? Math.floor(s.hp / g.stats().HP * 10) : '', s.stone >= F.price_ha(s.realm)].join('|');
    }
  });

  UI.action('buy', (el, d) => {
    UI.command('buy', { code: d.code });
    UI.toast('Đã mua ' + H.item(d.code).name + '.', { type: 'loot', title: 'Cửa hàng' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_phu', fps: 12, size: 'clamp(100px,16vw,170px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('bid', (el, d) => {
    UI.command('bid', { code: d.code });
    UI.toast('Đã đặt giá ' + H.item(d.code).name + '.', { type: 'gold', title: 'Đấu giá' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_phu', fps: 12, size: 'clamp(100px,16vw,170px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('joinSect', (el, d) => {
    UI.command('joinSect', { id: d.id || 'thanhvan' });
    UI.toast('Đã gia nhập ' + UI.g().sectDefinition().name + ' · mở thu nhập thụ động.', { type: 'success', title: 'Tông môn' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_phu', fps: 12, size: 'clamp(110px,17vw,180px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('sectMissionStart', (el, d) => {
    const m = UI.command('startSectMission', { id: d.id });
    const def = H.SECT_MISSIONS.find(x => x.id === m.id);
    UI.toast('Nhận nhiệm vụ · ' + def.name + ' · ' + duration(def.seconds) + '.', { type: 'info', title: 'Tông môn' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_khi', fps: 12, size: 'clamp(100px,16vw,170px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('sectMissionClaim', () => {
    const r = UI.command('claimSectMission');
    UI.toast(r.text, { type: r.success ? 'loot' : 'danger', title: 'Tông môn' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'phi_thang', fps: 12, size: 'clamp(100px,16vw,170px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('blessing', () => {
    const s = UI.s();
    UI.command('setBlessing', { enabled: !s.sect.blessing });
    UI.toast(s.sect.blessing ? 'Chúc phúc đã bật · tốc tu +10%.' : 'Chúc phúc đã tắt.', { type: s.sect.blessing ? 'success' : 'info', title: 'Tông môn' });
    if (s.sect.blessing) UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_phu', fps: 12, size: 'clamp(100px,16vw,170px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('donate', () => {
    const s = UI.s();
    UI.command('donateSect');
    UI.toast('Cống hiến +100 · tổng ' + num(s.sect.contribution) + '.', { type: 'loot', title: 'Tông môn' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_khi', fps: 12, size: 'clamp(100px,16vw,170px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('sectExchange', () => {
    const p = UI.command('buySect', { id: 'break' });
    UI.toast('Đổi ' + p.cost + ' cống hiến · nhận ' + p.name + '.', { type: 'loot', title: 'Tông môn' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_phu', fps: 12, size: 'clamp(100px,16vw,170px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('claimQuest', (el, d) => {
    const q = UI.command('claimQuest', { id: d.id });
    UI.toast('Đã nhận thưởng ' + q[1] + ' · ' + money(q[3]) + ' và ' + H.item(q[4]).name + ' ×' + q[5] + '.', { type: 'success', title: 'Nhiệm vụ' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'phi_thang', fps: 14, size: 'clamp(110px,18vw,190px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('fragments', () => {
    UI.command('claimFragments');
    UI.toast('Hợp nhất đạo ấn · +10 Đạo vận.', { type: 'gold', title: 'Đạo ấn' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'phi_thang', fps: 14, size: 'clamp(120px,19vw,200px)', style: { left: '50%', bottom: '22%', transform: 'translateX(-50%)' } });
  });
  UI.action('encounter', (el, d) => {
    const { item: x, part } = UI.command('manualEncounter', { index: Number(d.index) });
    if (x) {
      UI.toast('Cơ duyên · nhận ' + x.name + '.', { type: 'gold', title: 'Kỳ ngộ' });
    }
    if (part) {
      UI.toast('Đạo Tổ kỳ ngộ · nhận ' + part.name + '.', { type: 'gold', title: 'Kỳ ngộ' });
    }
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_khi', fps: 12, size: 'clamp(110px,17vw,180px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('prestige', () => {
    const reward = F.dao_van(UI.s().totalRunExp);
    UI.modal('Xác nhận trọng sinh', `<p>Nhận <b>${num(reward)} Đạo vận</b>. Cảnh giới, túi đồ và tiền thường đặt lại.</p>`, () => {
      UI.command('prestige');
      UI.toast('Đã chuyển thế · nhận ' + num(reward) + ' Đạo vận.', { type: 'gold', title: 'Trọng sinh' });
      UI.vfx?.stage({ kind: 'chien_dau', variant: 'phi_thang', fps: 14, size: 'clamp(140px,22vw,240px)', style: { left: '50%', bottom: '22%', transform: 'translateX(-50%)' } });
      UI.go('idle');
    }, 'Trọng sinh', 'THIÊN MỆNH', { type: 'gold', symbol: '☯', vfx: ['chien_dau', 'linh_phu'] });
    return UI.KEEP;
  });
  UI.action('offlineCap', () => {
    UI.command('upgradeOffline', { type: 'cap' });
    UI.toast('Giới hạn bế quan · ' + duration(F.offline_cap(UI.s().offlineCap)) + '.', { type: 'success', title: 'Bế quan' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_phu', fps: 12, size: 'clamp(100px,16vw,170px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('offlineEff', () => {
    UI.command('upgradeOffline', { type: 'eff' });
    UI.toast('Hiệu suất offline · ' + pct(F.offline_efficiency(UI.s().offlineEff)) + '.', { type: 'success', title: 'Bế quan' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_phu', fps: 12, size: 'clamp(100px,16vw,170px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
})(typeof window !== 'undefined' ? window : globalThis);
