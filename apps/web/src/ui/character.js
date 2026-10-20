import { STAT_KEYS, STAT_LABEL } from '@hu-gioi/game-core';
import { h, clear, icon } from './dom.js';
import { createDialog } from './dialog.js';
import { num, pct } from '../format.js';

// Read server state only; this panel never allocates stats or fabricates combat values.
export function createCharacterDialog({ game }) {
  const dlg = createDialog({ title: 'Chỉ số nhân vật' });
  function render() {
    const s = game.state, l = s?.life;
    if (!l) { dlg.hide(); return; }
    const row = (label, value, cls = '') => h('tr', null, h('td', { class: 'dim' }, label), h('td', { class: cls }, value));
    clear(dlg.body,
      h('h3', { class: 't-green center' }, 'Thông tin'),
      h('table', { class: 'character-table' }, h('tbody', null,
        row('Kiếp hiện tại', `Kiếp thứ ${l.life_no}`, 't-gold'),
        row('Cảnh giới', `${l.stage.name} tầng ${l.tang}`, 't-cyan'),
        row('Đại giới', l.stage.world),
        row('Tu vi', pct(l.need_s > 0 ? l.progress_s / l.need_s : 0, 1)),
        row('Thọ nguyên đã dùng', `${num(Math.round(l.lifespan.used_years))} / ${num(l.lifespan.cap_years)} năm`),
        row('Tốc độ tu luyện', `×${l.speed_mult.toFixed(3)}`),
        row('Linh thạch', num(l.wallet.ls), 't-cyan'),
        row('Linh tinh', num(l.wallet.lt)), row('Tiên ngọc', num(l.wallet.tn)),
        row('Thiên Mệnh', num(s.account.tm_balance), 't-gold'))),
      h('h3', { class: 't-green center' }, '— Chỉ số vĩnh viễn —'),
      h('table', { class: 'character-table' }, h('tbody', null, STAT_KEYS.map(k => row(STAT_LABEL[k], `${s.account.stats[k].level} / ${s.account.stats[k].cap}`)))),
      h('p', { class: 'small dim' }, 'Đạo hiệu, chủng tộc, linh căn và khí huyết sẽ hiển thị khi hệ thống nhân vật được mở.'),
      h('div', { class: 'row center' }, h('a', { class: 'btn gold', href: '#/quan-dinh' }, 'Quán Đỉnh Thiên Mệnh'),
        h('button', { class: 'btn ghost', onclick: () => dlg.hide() }, 'Đóng')));
  }
  return { ...dlg, open() { render(); dlg.show(); }, refresh() { if (dlg.isOpen) render(); } };
}

export function createSectDialog() {
  const dlg = createDialog({ title: 'Tông môn' });
  const sects = [
    ['Thanh Vân Tông', 'Chính đạo', 'scroll'],
    ['Huyết Sát Môn', 'Ma đạo', 'sword'],
    ['Vạn Dược Cốc', 'Đan đạo', 'ginseng'],
  ];
  clear(dlg.body,
    h('p', { class: 'center t-cyan' }, 'Các tông môn Hạ Giới'),
    h('div', { class: 'sect-list' }, sects.map(([name, desc, img]) => h('div', { class: 'sect-card' },
      icon(img, 'sect-icon'), h('div', null, h('strong', null, name), h('p', { class: 'small dim' }, desc)),
      h('button', { class: 'btn sm', disabled: true, title: 'Hệ thống gia nhập tông môn chưa mở' }, 'Chưa mở')))),
    h('p', { class: 'small dim' }, 'Gia nhập tông môn chưa mở. Bạn có thể gặp các nhân vật trong Nhân duyên Hạ Giới.'),
    h('div', { class: 'row center' }, h('a', { class: 'btn cyan', href: '#/nhan-duyen' }, 'Gặp môn nhân'),
      h('button', { class: 'btn ghost', onclick: () => dlg.hide() }, 'Đóng')));
  return dlg;
}
