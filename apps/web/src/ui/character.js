import { STAT_KEYS, STAT_LABEL } from '@hu-gioi/game-core';
import { h, clear } from './dom.js';
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
        row('Đạo hiệu', l.profile?.dao_hieu ?? 'Chưa đặt', 't-gold'),
        row('Giới tính · Chủng tộc', l.profile?.race ? `${l.profile.gender} · ${l.profile.race}` : 'Chưa có'),
        row('Linh căn', l.profile?.linh_can ? `${l.profile.linh_can.name} (${l.profile.linh_can.elements.join(', ')})` : 'Chưa có'),
        row('Kiếp hiện tại', `Kiếp thứ ${l.life_no}`),
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
      h('p', { class: 'small dim' }, 'Chủng tộc và linh căn là danh tính của kiếp; chưa làm đổi tốc độ tu luyện trong bản này.'),
      h('div', { class: 'row center' }, h('a', { class: 'btn gold', href: '#/quan-dinh' }, 'Quán Đỉnh Thiên Mệnh'),
        h('button', { class: 'btn ghost', onclick: () => dlg.hide() }, 'Đóng')));
  }
  return { ...dlg, open() { render(); dlg.show(); }, refresh() { if (dlg.isOpen) render(); } };
}
