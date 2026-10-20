import { h, clear } from '../ui/dom.js';
import { errorText } from '../api.js';

export function createNpcView({ game }) {
  const el = h('section', { class: 'social-page' });
  let state = null, selected = null, offer = null, reply = null, error = '', busy = false, destroyed = false;
  let generation = 0;
  async function load() {
    const token = ++generation;
    busy = true; render();
    try {
      const next = await game.api.social();
      if (destroyed || token !== generation) return;
      if (state && state.life_id !== next.life_id) { offer = null; reply = null; }
      state = next; selected ??= state.npcs[0]?.id; error = '';
    } catch (e) { if (!destroyed && token === generation) error = errorText(e); }
    finally { if (!destroyed && token === generation) { busy = false; render(); } }
  }
  async function act(kind, id = '', choice = '') {
    if (busy || !state) return;
    busy = true; error = ''; render();
    try {
      const response = await game.api.socialAction({ life_id: state.life_id, kind, npc_id: selected, id, choice_id: choice });
      if (destroyed) return;
      if (response.offer_id) { offer = response; reply = null; }
      else { offer = null; reply = response.npc_reply ? response : null; }
      state = await game.api.social();
    } catch (e) { if (!destroyed) error = errorText(e); }
    finally { if (!destroyed) { busy = false; render(); } }
  }
  function render() {
    if (destroyed) return;
    const npc = state?.npcs.find(n => n.id === selected);
    const button = (text, fn, disabled = false) => h('button', { class: 'btn', disabled: busy || disabled, onclick: fn }, text);
    clear(el,
      h('h1', null, 'Nhân duyên Hạ Giới'),
      h('p', { class: 'dim' }, 'Gặp gỡ, chuyện thường ngày và những lựa chọn để lại dấu ấn trong một kiếp.'),
      h('p', { class: 'small dim' }, 'Mỗi NPC: 1 cuộc trò chuyện và 1 món quà mỗi ngày. Reset 00:00 UTC · 07:00 Việt Nam.'),
      error && h('p', { class: 'red', role: 'alert' }, error),
      busy && h('p', { role: 'status' }, 'Đang đồng bộ…'),
      button('Đồng bộ', load),
      state && h('div', { class: 'social-layout' },
        h('nav', { class: 'social-roster', 'aria-label': 'Nhân vật' }, state.npcs.map(n =>
          h('button', { class: ['btn', n.id === selected && 'gold'], 'aria-pressed': n.id === selected ? 'true' : 'false', disabled: busy,
            onclick: () => { selected = n.id; offer = null; reply = null; render(); } },
            h('strong', null, n.name), h('span', { class: 'small dim' }, n.faction),
            h('span', { class: 'small' }, `Thiện cảm ${n.affection} · Tín nhiệm ${n.trust}`)))),
        npc && h('div', { class: 'social-detail' },
          h('h2', null, npc.name), h('p', { class: 'dim' }, npc.faction),
          !npc.available && h('p', null, 'Nhân vật hiện không khả dụng. Quan hệ vẫn được giữ khi phi thăng trong cùng kiếp.'),
          h('div', { class: 'social-actions' },
            button(npc.daily_done ? 'Đã trò chuyện hôm nay' : 'Chuyện thường ngày', () => act('daily'), !npc.available || npc.daily_done),
            button('Câu chuyện của nhân vật', () => act('story'), !npc.available)),
          state.offers.filter(o => o.npc_id === selected && o.kind === 'event').map(o => button('Kỳ ngộ: ' + o.scene.title, () => { offer = o; reply = null; render(); }, !npc.available)),
          reply && h('div', { class: 'social-dialogue', role: 'status' }, h('p', null, reply.npc_reply),
            h('p', { class: 'small dim' }, `Thiện cảm ${reply.affection_delta >= 0 ? '+' : ''}${reply.affection_delta} · Tín nhiệm ${reply.trust_delta >= 0 ? '+' : ''}${reply.trust_delta}`)),
          offer?.scene && h('div', { class: 'social-dialogue' }, h('h3', null, offer.scene.title), h('p', null, offer.scene.npc_text),
            offer.scene.choices.map(c => button(c.player_text, () => act('choose', offer.offer_id, c.choice_id), !npc.available))),
          offer?.kind === 'gift' && h('div', { class: 'social-dialogue' },
            h('p', null, 'Tặng ' + (state.gifts.find(g => g.gift_id === offer.gift_id)?.name ?? offer.gift_id) + '? Món quà sẽ được trừ khi xác nhận.'),
            button('Xác nhận tặng', () => act('gift_confirm', offer.offer_id), !npc.available),
            button('Hủy', () => act('gift_cancel', offer.offer_id))),
          h('h3', null, 'Quà trong túi'),
          h('p', { class: 'small dim' }, 'Quà dùng Linh Thạch hạ phẩm. Giá chưa được chốt trong tài liệu; cửa hàng quà chưa mở bán.'),
          state.gifts.filter(g => g.quantity > 0).length === 0 && h('p', null, 'Chưa có quà trong túi.'),
          state.gifts.filter(g => g.quantity > 0).map(g => button(`${g.name} ×${g.quantity}`, () => act('gift_prepare', g.gift_id), !npc.available || npc.gift_done)),
          h('details', null, h('summary', null, 'Danh mục 36 món quà và nguồn thu thập'),
            state.gifts.map(g => h('p', { class: 'small' }, `${g.name} — ${g.acquisition}`)))
        )),
    );
  }
  void load();
  return { el, render, destroy() { destroyed = true; generation++; } };
}
