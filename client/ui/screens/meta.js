/* Hư Giới — Thiên Mệnh Các dùng Thiên Tinh kiếm trong hành trình hiện tại. */
(function (root) {
  'use strict';
  const H = root.HU_GAME, F = H.F, UI = root.HU_UI;
  const { esc, num, row, btn, card, empty, tabs } = UI.kit;
  const TABS = [
    { id: 'destiny', label: 'Thiên mệnh', icon: '✦' },
    { id: 'pavilion', label: 'Thiên Mệnh Các', icon: '✧' },
    { id: 'achievements', label: 'Thành tựu', icon: '✧' },
    { id: 'story', label: 'Thiên Thư', icon: '❖' }
  ];

  function header() {
    const choice = H.META_UPGRADES[UI.s().destiny];
    return `<header class="screen-title"><span class="eyebrow gold">THIÊN MỆNH</span><h2>Thiên mệnh</h2></header>
      <p class="screen-lead">Thiên mệnh chỉ được chọn một lần khi tạo đạo thân. Khi tọa hóa, hành trình này kết thúc; không có cơ chế trọng sinh.</p>
      ${choice ? card('Thiên mệnh đã chọn', row('Dấu ấn', esc(choice.name)) + row('Hiệu ứng', esc(choice.desc)), { eyebrow: 'KHỞI NGUYÊN' }) : ''}`;
  }

  function destiny() {
    const current = UI.s().destiny;
    return `<div class="screen-grid">${Object.entries(H.META_UPGRADES).map(([key, d]) =>
      card(d.name, `<div class="meta-upgrade-head"><span class="meta-upgrade-icon" aria-hidden="true">${d.icon}</span>
        <div>${row('Hiệu ứng khi chọn', esc(d.desc))}${row('Trạng thái', key === current ? 'Thiên mệnh hiện tại' : 'Không thể đổi khi đang tu hành')}</div></div>`,
        { eyebrow: key === current ? 'ĐÃ CHỌN' : 'KHỞI NGUYÊN' })
      ).join('')}</div>`;
  }
  function pavilion() {
    const p = UI.session.pavilion || { balance: 0, upgrades: {} };
    return '<p class="screen-lead">Thiên Tinh nhận khi đột phá đại cảnh giới và hợp nhất đạo ấn. Thiên Mệnh Các nâng cấp sức mạnh cho đạo thân hiện tại; một thuộc tính tối đa 20 cấp, hiệu quả tối đa +50%.</p>' +
      card('Thiên Tinh', row('Hiện có', num(p.balance) + ' ✧') +
        row('Đã tích lũy', num(p.totalEarned || 0) + ' ✧') +
        row('Tổng Thiên Tinh đã nhận', num(p.totalEarned || 0)), { eyebrow: 'TÀI NGUYÊN TU HÀNH' }) +
      '<div class="screen-grid">' + Object.entries(H.PAVILION.stats).map(([key, item]) => {
        const lvl = Math.min(20, p.upgrades?.[key] || 0), cost = H.PAVILION.upgradeCost(lvl);
        return card(item.name,
          '<p>' + esc(item.desc) + '</p>' +
          row('Cấp nâng cấp', lvl + '/20') +
          row('Hiệu quả', '+' + (H.PAVILION.bonus(lvl) * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + '%') +
          (cost === null ? '<p class="gold">Đã viên mãn</p>' :
            btn('Nâng cấp · ' + cost + ' Thiên Tinh', 'pavilionBuy', 'data-kind="upgrade" data-key="' + esc(key) + '"', p.balance < cost, 'btn-outline')),
          { eyebrow: 'THIÊN PHÚ' });
      }).join('') + '</div>';
  }
  function relics() {
    const p = UI.session.pavilion || { balance: 0, relics: {} };
    return '<p class="screen-lead">Kỳ Trân được giữ trong kho tài khoản. Khi tạo nhân vật mới, mỗi loại bảo vật đang có tự tiêu hao một món, giúp đạo thân nhập đạo nhanh hơn; tối đa 5 món mỗi loại.</p>' +
      '<div class="screen-grid">' + Object.entries(H.PAVILION.relics).map(([key, item]) => {
        const count = p.relics?.[key] || 0;
        return card(item.name, '<p>' + esc(item.desc) + '</p>' +
          row('Trong kho', count + '/' + item.maxStored) + row('Giá', item.cost + ' Thiên Tinh') +
          btn('Đổi bảo vật', 'pavilionBuy', 'data-kind="relic" data-key="' + esc(key) + '"',
            count >= item.maxStored || (p.balance || 0) < item.cost, 'btn-outline'),
          { eyebrow: 'KỲ TRÂN XUYÊN KIẾP' });
      }).join('') + '</div>';
  }
  UI.action('pavilionBuy', async (el, data) => {
    if (el?.disabled) return UI.KEEP;
    const label = el?.textContent;
    if (el) { el.disabled = true; el.textContent = 'Đang gửi tới Thiên Mệnh Các…'; }
    try {
      const result = await UI.session.pavilionPurchase(data.kind, data.key);
      if (result) UI.toast('Thiên Mệnh Các đã ghi nhận giao dịch. Thiên Tinh và bảo vật được lưu trên máy chủ.', { type: 'success' });
    } finally {
      if (el) { el.disabled = false; el.textContent = label; }
    }
  });

  function achievements() {
    const m = UI.s().meta, unlocked = Object.keys(m.achievements).length;
    return `<p class="screen-lead">Thành tựu chỉ ghi nhận trong kiếp này, không cấp điểm tích lũy. Đã đạt ${unlocked}/${H.META_ACHIEVEMENTS.length}.</p>
      <div class="meta-ach-grid">${H.META_ACHIEVEMENTS.map(a => {
        const at = m.achievements[a.id];
        return `<article class="meta-ach ${at ? 'on' : 'locked'}"><span class="meta-ach-icon" aria-hidden="true">${at ? '✦' : '○'}</span>
          <div><b>${esc(a.name)}</b><p>${esc(a.desc)}</p>${at ? `<small>Đã đạt · ${new Date(at).toLocaleDateString('vi-VN')}</small>` : ''}</div></article>`;
      }).join('')}</div>`;
  }
  function story() {
    const s = UI.s(), all = H.STORY.ACTS.flatMap(act => act.chapters), read = s.story?.read || {};
    return '<p class="screen-lead">Vạn Kiếp Tàng Thư ghi lại dấu chân người lạc giới, từ Thanh Vân Sơn tới Hồng Mông Đạo Vực. ' +
      'Chương mới mở dần theo cảnh giới; lời đã ghi sẽ mất khi đạo thân tọa hóa.</p>' +
      card('Thiên Thư', row('Đã đọc', Object.keys(read).filter(id => all.some(ch => ch.id === id)).length + '/' + all.length),
        { eyebrow: 'THIÊN MỆNH · TÀNG THƯ' }) +
      H.STORY.ACTS.map(act => '<section class="hu-story-act"><h3>' + esc(act.title) +
        ' <small>· ' + esc(act.world) + '</small></h3><div class="hu-story-list">' +
        act.chapters.map(ch => {
          const seen = !!read[ch.id], unlocked = s.realm >= ch.unlock.realm || seen;
          return '<article class="hu-story-chapter' + (unlocked ? '' : ' locked') + '">' +
            '<div><small>' + esc(F.REALMS[ch.unlock.realm]) + (seen ? ' · Đã đọc' : '') +
            '</small><h4>' + esc(ch.title) + '</h4><p>' +
            (unlocked ? esc(ch.text.slice(0, 92)) + '…' : 'Đạt cảnh giới ' + esc(F.REALMS[ch.unlock.realm]) + ' để mở.') +
            '</p></div>' + (unlocked ? btn(seen ? 'Đọc lại' : 'Đọc chương', 'openStory', 'data-id="' + esc(ch.id) + '"', false, 'btn-outline') : '') +
            '</article>';
        }).join('') + '</div></section>').join('');
  }

  const body = { destiny, pavilion, relics, achievements, story };
  UI.register({
    id: 'meta', label: 'Thiên mệnh', icon: '✦', eyebrow: 'THIÊN MỆNH', tabs: TABS,
    render: tab => header() + tabs(TABS, tab) + '<div class="screen-body">' + (body[tab] || destiny)() + '</div>',
    signature: () => {
      const s = UI.s();
      return [s.destiny, Object.keys(s.meta.achievements).length, s.realm, JSON.stringify(s.story), JSON.stringify(UI.session.pavilion)].join('|');
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
