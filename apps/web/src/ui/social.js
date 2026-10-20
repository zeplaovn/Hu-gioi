/* Hội thoại NPC nằm trong ba nơi của game: Lịch luyện (lữ khách trung lập), Tông môn (ba tông Hạ Giới), Bí cảnh (kỳ ngộ).
   Chỉ hiển thị; reset ngày, điểm quan hệ, quà và chống thưởng lặp do server quyết (game.social_*). */
import { errorText } from "../api.js";
import { createDialog } from "./dialog.js";
import { clear, h, icon } from "./dom.js";

export const SECTS = [
  { name: "Thanh Vân Tông", desc: "Chính đạo", icon: "scroll" },
  { name: "Huyết Sát Môn", desc: "Ma đạo", icon: "sword" },
  { name: "Vạn Dược Cốc", desc: "Đan đạo", icon: "ginseng" },
];
const isSect = (faction) => SECTS.some((s) => s.name === faction);

export const SOCIAL_KINDS = {
  explore: {
    title: "Lịch luyện",
    intro: "Rời sơn môn đi khắp Hạ Giới, gặp lữ khách và người trên đường. Mỗi người: 1 cuộc trò chuyện và 1 món quà mỗi ngày.",
    pick: (n) => !isSect(n.faction),
  },
  sect: {
    title: "Tông môn",
    intro: "Ba tông môn Hạ Giới. Gặp chưởng môn, trưởng lão và đệ tử; gia nhập tông môn chưa mở trong bản này.",
    pick: (n, faction) => n.faction === faction,
  },
  secret: {
    title: "Bí cảnh",
    intro: "Trong bí cảnh, cơ duyên và biến cố đến bất ngờ. Kỳ ngộ xuất hiện ngẫu nhiên, mỗi lựa chọn đều để lại dấu ấn.",
    pick: () => true,
  },
};

const signed = (n) => `${n >= 0 ? "+" : ""}${n}`;

/** @param {{ game: any, kind: "explore" | "sect" | "secret" }} o */
export function createSocialDialog({ game, kind }) {
  const cfg = SOCIAL_KINDS[kind];
  let state = null, selected = null, offer = null, reply = null, error = "", busy = false, destroyed = false, generation = 0, faction = SECTS[0].name;
  const dlg = createDialog({ title: cfg.title });
  dlg.el.classList.add("social-dialog");

  async function load() {
    const token = ++generation;
    busy = true; render();
    try {
      const next = await game.api.social();
      if (destroyed || token !== generation) return;
      if (state && state.life_id !== next.life_id) { offer = null; reply = null; selected = null; }
      state = next; error = "";
    } catch (e) { if (!destroyed && token === generation) error = errorText(e); }
    finally { if (!destroyed && token === generation) { busy = false; render(); } }
  }

  async function act(action, id = "", choice = "") {
    if (busy || !state || !selected) return;
    busy = true; error = ""; render();
    try {
      const r = await game.api.socialAction({ life_id: state.life_id, kind: action, npc_id: selected, id, choice_id: choice });
      if (destroyed) return;
      if (r.offer_id) { offer = r; reply = null; }
      else { offer = null; reply = r.npc_reply ? r : null; }
      state = await game.api.social();
    } catch (e) { if (!destroyed) error = errorText(e); }
    finally { if (!destroyed) { busy = false; render(); } }
  }

  const btn = (text, fn, disabled = false, cls = "") => h("button", { type: "button", class: ["btn", "sm", cls], disabled: busy || disabled, onclick: fn }, text);
  const select = (id) => { selected = id; offer = null; reply = null; render(); };

  function detail(npc) {
    const gifts = state.gifts.filter((g) => g.quantity > 0);
    return h("div", { class: "social-detail" },
      h("h3", null, npc.name), h("p", { class: "dim small" }, `${npc.faction} · Thiện cảm ${npc.affection} · Tín nhiệm ${npc.trust}`),
      !npc.available && h("p", { class: "small" }, "Nhân vật hiện không khả dụng."),
      kind !== "secret" && h("div", { class: "social-actions" },
        btn(npc.daily_done ? "Đã trò chuyện hôm nay" : "Chuyện thường ngày", () => act("daily"), !npc.available || npc.daily_done),
        btn("Câu chuyện của nhân vật", () => act("story"), !npc.available, "gold")),
      reply && h("div", { class: "social-dialogue", role: "status" }, h("p", null, reply.npc_reply),
        h("p", { class: "small dim" }, `Thiện cảm ${signed(reply.affection_delta)} · Tín nhiệm ${signed(reply.trust_delta)}`)),
      offer?.scene && h("div", { class: "social-dialogue" }, h("h3", null, offer.scene.title), h("p", null, offer.scene.npc_text),
        offer.scene.choices.map((c) => btn(c.player_text, () => act("choose", offer.offer_id, c.choice_id), !npc.available))),
      offer?.kind === "gift" && h("div", { class: "social-dialogue" },
        h("p", null, `Tặng ${state.gifts.find((g) => g.gift_id === offer.gift_id)?.name ?? offer.gift_id}? Món quà sẽ được trừ khi xác nhận.`),
        btn("Xác nhận tặng", () => act("gift_confirm", offer.offer_id), !npc.available, "gold"), btn("Hủy", () => act("gift_cancel", offer.offer_id))),
      kind !== "secret" && [
        h("h4", null, "Quà trong túi"),
        gifts.length === 0 ? h("p", { class: "small dim" }, "Chưa có quà trong túi. Cửa hàng quà chưa mở bán.")
          : h("div", { class: "social-actions" }, gifts.map((g) => btn(`${g.name} ×${g.quantity}`, () => act("gift_prepare", g.gift_id), !npc.available || npc.gift_done)))]);
  }

  function renderSecret() {
    const events = state.offers.filter((o) => o.kind === "event");
    const nameOf = (id) => state.npcs.find((n) => n.id === id)?.name ?? "";
    const npc = state.npcs.find((n) => n.id === selected);
    return [
      events.length === 0 && !offer && !reply && h("p", { class: "dim center" }, "Hôm nay bí cảnh chưa mở kỳ ngộ nào. Kỳ ngộ mới có thể xuất hiện sau reset 00:00 UTC (07:00 Việt Nam)."),
      h("div", { class: "social-actions" }, events.map((o) => btn(`${o.scene.title} · ${nameOf(o.npc_id)}`, () => { selected = o.npc_id; offer = o; reply = null; render(); }, false, "gold"))),
      npc && (offer || reply) && detail(npc)];
  }

  function renderPeople() {
    const people = state.npcs.filter((n) => cfg.pick(n, faction));
    if (selected && !people.some((n) => n.id === selected)) selected = null;
    selected ??= people[0]?.id ?? null;
    const npc = people.find((n) => n.id === selected);
    return [
      kind === "sect" && h("div", { class: "sect-list" }, SECTS.map((s) => h("div", { class: ["sect-card", s.name === faction && "on"] },
        icon(s.icon, "sect-icon"), h("div", null, h("strong", null, s.name), h("p", { class: "small dim" }, s.desc)),
        h("button", { type: "button", class: "btn sm", disabled: busy, "aria-pressed": String(s.name === faction), onclick: () => { faction = s.name; selected = null; offer = null; reply = null; render(); } }, s.name === faction ? "Đang xem" : "Xem môn nhân")))),
      h("div", { class: "social-layout" },
        h("nav", { class: "social-roster", "aria-label": "Nhân vật" }, people.map((n) => h("button", { type: "button", class: ["btn", n.id === selected && "gold"], "aria-pressed": String(n.id === selected), disabled: busy, onclick: () => select(n.id) },
          h("strong", null, n.name), h("span", { class: "small" }, `Thiện cảm ${n.affection} · Tín nhiệm ${n.trust}`)))),
        npc && detail(npc))];
  }

  function render() {
    if (destroyed || !dlg.isOpen) return;
    clear(dlg.body, h("div", { class: "stack" },
      h("p", { class: "dim small center" }, cfg.intro),
      kind !== "secret" && h("p", { class: "small dim center" }, "Reset 00:00 UTC · 07:00 Việt Nam."),
      error && h("p", { class: "notice error", role: "alert" }, error),
      busy && h("p", { class: "small dim center", role: "status" }, "Đang đồng bộ…"),
      state && (kind === "secret" ? renderSecret() : renderPeople()),
      h("div", { class: "row center" }, btn("Làm mới", load), h("button", { type: "button", class: "btn ghost sm", onclick: () => dlg.hide() }, "Đóng"))));
  }

  return {
    el: dlg.el,
    open() { dlg.show(); render(); void load(); },
    hide: () => dlg.hide(),
    destroy() { destroyed = true; generation++; dlg.hide(); },
  };
}
