/* Hư Giới — Thiên mệnh được chọn một lần ở Khởi Nguyên, không có trọng sinh. */
(function (root) {
  'use strict';
  const H = root.HU_GAME, F = H.F, UI = root.HU_UI;
  const { esc, num, row, btn, card, empty, tabs } = UI.kit;
  const TABS = [
    { id: 'destiny', label: 'Thiên mệnh', icon: '✦' },
    { id: 'achievements', label: 'Thành tựu kiếp này', icon: '✧' },
    { id: 'story', label: 'Thiên Thư', icon: '❖' }
  ];

  function header() {
    const choice = H.META_UPGRADES[UI.s().destiny];
    return `<header class="screen-title"><span class="eyebrow gold">THIÊN MỆNH</span><h2>Thiên mệnh</h2></header>
      <p class="screen-lead">Thiên mệnh được chọn miễn phí khi tạo nhân vật, áp dụng duy nhất cho kiếp này. Khi tọa hóa, tất cả lựa chọn, thành tựu và Thiên Thư của nhân vật sẽ mất.</p>
      ${choice ? card('Thiên mệnh đã chọn', row('Dấu ấn', esc(choice.name)) + row('Hiệu ứng', esc(choice.desc)), { eyebrow: 'KHỞI NGUYÊN' }) : ''}`;
  }

  function destiny() {
    const current = UI.s().destiny;
    return `<div class="screen-grid">${Object.entries(H.META_UPGRADES).map(([key, d]) =>
      card(d.name, `<div class="meta-upgrade-head"><span class="meta-upgrade-icon" aria-hidden="true">${d.icon}</span>
        <div>${row('Hiệu ứng khi chọn', esc(d.desc))}${row('Trạng thái', key === current ? 'Thiên mệnh hiện tại' : 'Không thể đổi trong kiếp này')}</div></div>`,
        { eyebrow: key === current ? 'ĐÃ CHỌN' : 'KHỞI NGUYÊN' })
      ).join('')}</div>`;
  }
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

  const body = { destiny, achievements, story };
  UI.register({
    id: 'meta', label: 'Thiên mệnh', icon: '✦', eyebrow: 'THIÊN MỆNH', tabs: TABS,
    render: tab => header() + tabs(TABS, tab) + '<div class="screen-body">' + (body[tab] || destiny)() + '</div>',
    signature: () => {
      const s = UI.s();
      return [s.destiny, Object.keys(s.meta.achievements).length, s.realm, JSON.stringify(s.story)].join('|');
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
