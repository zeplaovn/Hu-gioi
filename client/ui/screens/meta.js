/* Hư Giới — Thiên mệnh, thành tựu và Thiên Thư. Thiên Mệnh Các chỉ còn ở màn tạo nhân vật. */
(function (root) {
  'use strict';
  const H = root.HU_GAME, F = H.F, UI = root.HU_UI, L = root.HU_LABELS;
  const { esc, num, row, btn, card, empty, tabs } = UI.kit;
  const TABS = [
    { id: 'destiny', label: 'Thiên mệnh', icon: '✦' },
    { id: 'achievements', label: 'Thành tựu', icon: '✧' },
    { id: 'story', label: 'Thiên Thư', icon: '❖' }
  ];

  function header() {
    const choice = H.META_UPGRADES[UI.s().destiny];
    return `<header class="screen-title"><span class="eyebrow gold">THIÊN MỆNH</span><h2>Thiên mệnh</h2></header>
      <p class="screen-lead">Dấu ấn Thiên Mệnh là buff khởi đầu, phải mua tại Quầy Khởi Nguyên trước khi lập đạo thân. Mỗi đạo thân chỉ nhận một dấu ấn; khi tọa hóa, hành trình này kết thúc.</p>
      ${choice ? card('Dấu ấn đã nhận', row('Dấu ấn', L ? L.span(choice.name, 'destiny', UI.s().destiny, { variant: 'name' }) : esc(choice.name)) + row('Hiệu ứng', esc(choice.desc)), { eyebrow: 'KHỞI NGUYÊN' }) : card('Chưa có Dấu ấn', '<p>Đạo thân này không mang Dấu ấn Thiên Mệnh. Dấu ấn chỉ có thể mua trước khi lập đạo thân.</p>', { eyebrow: 'KHỞI NGUYÊN' })}`;
  }

  function destiny() {
    const current = UI.s().destiny;
    return `<div class="screen-grid">${Object.entries(H.META_UPGRADES).map(([key, d]) => {
      const product = Object.values(H.PAVILION.starter).find(item => item.destiny === key);
      return card(L ? L.span(d.name, 'destiny', key, { variant: 'name' }) : esc(d.name), `<div class="meta-upgrade-head"><span class="meta-upgrade-icon" aria-hidden="true">${d.icon}</span>
        <div>${row('Hiệu ứng', esc(d.desc))}${row('Mua tại', 'Quầy Khởi Nguyên · ' + (product ? product.cost + ' Thiên Tinh' : 'không bán'))}${row('Trạng thái', key === current ? 'Dấu ấn hiện tại' : 'Chưa nhận')}</div></div>`,
        { eyebrow: key === current ? 'ĐANG DÙNG' : 'KHỞI NGUYÊN' });
    }).join('')}</div>`;
  }
  function achievements() {
    const m = UI.s().meta, unlocked = Object.keys(m.achievements).length;
    return `<p class="screen-lead">Thành tựu gắn với đạo thân hiện tại, không cấp điểm tích lũy. Đã đạt ${unlocked}/${H.META_ACHIEVEMENTS.length}.</p>
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

  const body = { destiny, achievements, story };
  UI.register({
    id: 'meta', label: 'Thiên mệnh', icon: '✦', eyebrow: 'THIÊN MỆNH', tabs: TABS,
    render: tab => header() + tabs(TABS, tab) + '<div class="screen-body">' + (body[tab] || destiny)() + '</div>',
    signature: () => {
      const s = UI.s();
      return [s.destiny, Object.keys(s.meta.achievements).length, s.realm, JSON.stringify(s.story), JSON.stringify(UI.session.pavilion)].join('|');
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
