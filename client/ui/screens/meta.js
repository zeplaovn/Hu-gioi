/* HƯ GIỚI · MÀN THIÊN MỆNH
 * Tiến trình xuyên kiếp: thành tựu, nâng cấp vĩnh viễn và bia lịch sử các kiếp.
 * Nằm trong state.meta, được giữ qua trọng sinh và chỉ mất khi xóa toàn bộ bản lưu. */
(function (root) {
  'use strict';
  const H = root.HU_GAME, F = H.F;
  const UI = root.HU_UI;
  const { esc, num, pct, duration, row, btn, card, empty, tabs } = UI.kit;

  const TABS = [
    { id: 'upgrades', label: 'Thiên mệnh', icon: '✦' },
    { id: 'achievements', label: 'Thành tựu', icon: '✧' },
    { id: 'history', label: 'Kiếp trước', icon: '☯' },
    { id: 'prestige', label: 'Trọng sinh', icon: '↻' }
  ];

  function stageName(realm, stage) {
    const n = F.STAGES[realm];
    const label = n === 4 ? ['Sơ kỳ', 'Trung kỳ', 'Hậu kỳ', 'Đỉnh phong'][stage - 1] : realm === 13 ? ['Nhập Đạo', 'Hợp Đạo', 'Vô Thượng'][stage - 1] : 'Tầng ' + stage;
    return F.REALMS[realm] + ' · ' + label;
  }

  function header() {
    const s = UI.s(), m = s.meta, total = H.META_ACHIEVEMENTS.length;
    const unlocked = Object.keys(m.achievements).length;
    return `<header class="screen-title"><span class="eyebrow gold">THIÊN MỆNH</span><h2>Thiên mệnh</h2></header>
      <div class="meta-hero">
        <div class="meta-points"><span>ĐIỂM KHẢ DỤNG</span><b>${num(m.points)}</b><small>Đã nhận ${num(m.totalPoints)} · ${unlocked}/${total} thành tựu</small></div>
        <div><p>Thiên mệnh là tiến trình vĩnh viễn xuyên kiếp. Điểm nhận từ thành tựu và mỗi lần trọng sinh; nâng cấp ở đây không bị đặt lại khi chuyển thế.</p>
        <p class="info-note">Chỉ xóa tiến trình trong Cài đặt mới xóa toàn bộ Thiên mệnh. Điểm đã tiêu không hoàn lại.</p></div>
      </div>`;
  }

  function upgrades() {
    const m = UI.s().meta;
    return `<p class="screen-lead">Nâng cấp vĩnh viễn áp dụng cho kiếp hiện tại và các kiếp sau. Riêng túi Càn Khôn và Trường Sinh phát huy từ lần trọng sinh kế tiếp.</p>
      <div class="screen-grid">${Object.entries(H.META_UPGRADES).map(([key, u]) => {
        const level = m.upgrades[key] || 0, cost = level >= u.max ? null : u.cost[level];
        return card(u.name, `
          <div class="meta-upgrade-head"><span class="meta-upgrade-icon" aria-hidden="true">${u.icon}</span><div>${row('Cấp', level + '/' + u.max)}${row('Hiệu ứng', u.desc)}${row('Giá cấp kế', cost === null ? 'Đã tối đa' : cost + ' điểm')}</div></div>
          <div class="meta-pips" aria-hidden="true">${Array.from({ length: u.max }, (_, i) => `<i class="${i < level ? 'on' : ''}"></i>`).join('')}</div>
          <button class="btn ${cost === null ? 'btn-outline' : 'btn-gold'}" data-act="metaBuy" data-key="${key}" ${cost === null || m.points < cost ? 'disabled' : ''}>${cost === null ? 'Đã tối đa' : 'Nâng cấp · ' + cost + ' điểm'}</button>`,
          { eyebrow: 'VĨNH VIỄN' });
      }).join('')}</div>`;
  }

  function achievements() {
    const m = UI.s().meta, unlocked = Object.keys(m.achievements).length;
    return `<p class="screen-lead">Thành tựu tự mở khi đạt mốc và trao điểm Thiên mệnh một lần. ${unlocked}/${H.META_ACHIEVEMENTS.length} đã hoàn thành.</p>
      <div class="meta-ach-grid">${H.META_ACHIEVEMENTS.map(a => {
        const at = m.achievements[a.id];
        return `<article class="meta-ach ${at ? 'on' : 'locked'}">
          <span class="meta-ach-icon" aria-hidden="true">${at ? '✦' : '○'}</span>
          <div><b>${esc(a.name)}</b><p>${esc(a.desc)}</p>${at ? `<small>Đã nhận · ${new Date(at).toLocaleDateString('vi-VN')}</small>` : ''}</div>
          <em>+${a.points}</em>
        </article>`;
      }).join('')}</div>`;
  }

  function history() {
    const list = UI.s().meta.history;
    if (!list.length) return empty('Chưa có kiếp trước nào. Trọng sinh để ghi tên vào Bia Thiên Đạo.');
    return `<p class="screen-lead">Bia Thiên Đạo ghi lại những kiếp đã đi qua. Mỗi dòng là một lần chuyển thế hoặc chứng đạo.</p>
      <div class="meta-history">${list.map(h => `<article class="meta-life">
        <header><b>${esc(h.name)}</b><span>${esc(stageName(h.realm, h.stage))}</span></header>
        <p>${esc(h.cause)} · ${num(h.rebirths)} lần trọng sinh · ${num(h.daoVan)} Đạo vận</p>
        <time>${h.at ? new Date(h.at).toLocaleString('vi-VN') : '—'}</time>
      </article>`).join('')}</div>`;
  }

  function prestige() {
    const s = UI.s(), reward = F.dao_van(s.totalRunExp), remaining = Math.max(0, F.exp_for_dao_van(Math.max(10, reward + 1)) - s.totalRunExp);
    return `<p class="screen-lead">Mở từ 10 Đạo vận nhận được. Giữ công pháp đã lĩnh ngộ, thiên phú, nâng cấp offline và cài đặt.</p><div class="screen-grid">
      ${card('Chuyển thế', `${row('Tu vi thực nhận vòng này', num(s.totalRunExp))}${row('Phần thưởng', num(reward) + ' Đạo vận')}${row('Tu vi tới mốc kế tiếp', num(remaining))}${row('Số lần trọng sinh', s.rebirths)}${btn('Trọng sinh', 'prestige', '', reward < 10)}<p class="info-note">Đặt lại cảnh giới, tiền, túi đồ, nâng cấp thường và nhiệm vụ. Tu vi tràn ngưỡng đột phá không tính Đạo vận.</p>`)}
      ${card('Bế quan vĩnh viễn', `${row('Đạo vận', num(s.daoVan))}${row('Giới hạn offline', duration(F.offline_cap(s.offlineCap)))}${btn('+2 giờ · ' + (2 + s.offlineCap) + ' Đạo vận', 'offlineCap', '', s.offlineCap >= 8)}${row('Hiệu suất offline', pct(F.offline_efficiency(s.offlineEff)))}${btn('+5 điểm % · ' + (2 + s.offlineEff) + ' Đạo vận', 'offlineEff', '', s.offlineEff >= 8)}<p class="info-note">Tối đa 24 giờ và 100%. Tiêu Đạo vận sẽ giảm hệ số tốc tu tương ứng.</p>`)}</div>`;
  }
  const body = { upgrades, achievements, history, prestige };

  UI.register({
    id: 'meta', label: 'Thiên mệnh', icon: '✦', eyebrow: 'THIÊN MỆNH', tabs: TABS,
    render: tab => header() + tabs(TABS, tab) + `<div class="screen-body">${body[tab]()}</div>`,
    signature: () => {
      const s = UI.s(), m = s.meta;
      return [m.points, m.totalPoints, Object.keys(m.achievements).length, Object.values(m.upgrades).join(','), m.history.length].join('|');
    }
  });

  UI.action('metaBuy', (el, d) => {
    const r = UI.command('buyMeta', { key: d.key });
    UI.toast('Thiên mệnh · ' + H.META_UPGRADES[r.key].name + ' cấp ' + r.level + '.', { type: 'gold', title: 'Thiên mệnh' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_phu', fps: 12, size: 'clamp(100px,16vw,170px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
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
    UI.vfx?.effect('qi');
  });
  UI.action('offlineEff', () => {
    UI.command('upgradeOffline', { type: 'eff' });
    UI.toast('Hiệu suất offline · ' + pct(F.offline_efficiency(UI.s().offlineEff)) + '.', { type: 'success', title: 'Bế quan' });
    UI.vfx?.effect('qi');
  });

  UI.metaScreen = { stageName };
})(typeof window !== 'undefined' ? window : globalThis);
