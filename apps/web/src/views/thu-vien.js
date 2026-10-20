import content from '../content.generated.js';
import { assetBase } from '../config.js';
import { clear, h } from '../ui/dom.js';

export const availableChapters = (stage = -1) => content.chapters.filter(c => c.stage <= stage);
const WORLDS = ['Hạ Giới', 'Linh Giới', 'Tiên Giới'];
const normalize = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();

export function createThuVienView({ game }) {
  let tab = 'story', query = '', world = '', lastStage = null;
  const body = h('div', { class: 'codex-body' });
  const search = h('input', { type: 'search', placeholder: 'Tìm tên, mã hoặc vùng đất…', 'aria-label': 'Tìm trong thư viện', oninput: e => { query = e.target.value; draw(); } });
  const filter = h('select', { 'aria-label': 'Lọc theo giới', onchange: e => { world = e.target.value; draw(); } },
    h('option', { value: '' }, 'Cả ba giới'), WORLDS.map(w => h('option', { value: w }, w)));
  const tabs = h('nav', { class: 'codex-tabs', 'aria-label': 'Mục thư viện' });
  const controls = h('div', { class: 'codex-controls' }, search, filter);
  for (const [key, label] of [['story', 'Trường thiên'], ['monsters', 'Bách Quái Chí'], ['items', 'Vật phẩm']]) {
    tabs.append(h('button', { class: 'btn', type: 'button', 'data-tab': key, onclick: () => { tab = key; draw(); } }, label));
  }
  const el = h('section', { class: 'codex' }, h('h1', null, 'Tàng Thư Các'),
    h('p', { class: 'dim' }, 'Một đường về qua ba giới'), tabs, controls, body);
  const illustration = r => r.image && h('img', { class: 'codex-art', src: `${assetBase()}/${r.image}`, loading: 'lazy', alt: `Minh họa ${r.name}`, onerror: e => { e.currentTarget.hidden = true; } });
  const details = (label, value) => value && h('p', null, h('b', null, `${label}: `), value);
  function draw() {
    const stage = game.state?.life?.stage?.idx ?? -1;
    lastStage = stage;
    tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tab === tab)));
    controls.hidden = tab === 'story';
    if (tab === 'story') {
      const open = availableChapters(stage);
      clear(body, h('p', { class: 'dim small' }, 'Trường thiên mở dần theo cảnh giới của kiếp hiện tại. Đây là truyện tham chiếu; việc đọc không tự hoàn thành nhiệm vụ hoặc thay đổi quan hệ.'),
        ...content.chapters.map(c => c.stage > stage
          ? h('div', { class: 'panel codex-locked' }, 'Chương chưa mở — tiếp tục hành trình tu luyện.')
          : h('details', { class: 'panel codex-chapter', open: c.id === open.at(-1)?.id }, h('summary', null, c.title), ...c.paragraphs.map(p => h('p', null, p)))));
      return;
    }
    const worldIdx = WORLDS.indexOf(game.state?.life?.stage?.world);
    const all = tab === 'monsters' ? content.monsters : content.items;
    const visible = all.filter(r => (!r.world || WORLDS.indexOf(r.world) <= worldIdx) && (!world || r.world === world) && normalize([r.name, r.id, r.monster_id, r.territory].join(' ')).includes(normalize(query)));
    clear(body, h('p', { class: 'dim small', role: 'status' }, `${visible.length} hồ sơ. Các lựa chọn và hệ quả trong Bách Quái Chí là nội dung thiết kế; chưa phải nhiệm vụ có thể nhận tại đây.`),
      h('div', { class: 'codex-grid' }, visible.map(r => h('article', { class: 'panel codex-card' }, illustration(r),
        h('h2', null, r.name), h('p', { class: 'dim small' }, [r.monster_id || r.id, r.world, r.realm, r.classification || r.type || r.slot].filter(Boolean).join(' · ')),
        tab === 'monsters' ? [details('Vùng đất', r.territory), details('Nguồn gốc', r.ancient_origin), details('Dấu tích', r.historical_event), details('Động cơ', r.motivation), details('Liên hệ', r.faction_npc_links), details('Tập tính', r.behavior), details('Lựa chọn', r.player_choices), details('Hệ quả', r.quest_consequence)]
          : [details('Công dụng', r.effect || r.main_stat || r.use), details('Phẩm chất', r.rarity), details('Nguồn', r.source)]))));
  }
  return { el, render() { const s = game.state?.life?.stage?.idx ?? -1; if (lastStage !== s) draw(); }, destroy() {} };
}
