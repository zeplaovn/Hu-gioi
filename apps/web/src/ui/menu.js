/* Menu hành động bên phải (2 nhóm như bản gốc) + thanh thao tác nhanh trên điện thoại (dock).
   Mục nào backend v2 chưa có thì hiện "Sắp mở" và bị khóa: không giả vờ chạy. Chỉ gửi ý định, mọi quyết định do server. */
import { pct } from "../format.js";
import { h, icon } from "./dom.js";

/** Nhóm "Tu hành" và "Nhân vật & thế giới". `soon: true` = chưa có ở backend v2. */
const GROUP_ACTIONS = [
  { id: "cultivate", label: "Tu luyện", icon: "orb_green", scroll: true },
  { id: "explore", label: "Lịch luyện", kbd: "L", icon: "sword", soon: true },
  { id: "rest", label: "Nghỉ ngơi", kbd: "N", icon: "peach", soon: true },
  { id: "break", seal: true },
  { id: "stone", label: "Luyện hóa linh thạch", icon: "crystal", soon: true },
  { id: "shop", label: "Cửa hàng đan dược", cls: "cyan", icon: "orb_green", soon: true },
  { id: "skills", label: "Công pháp", cls: "cyan", icon: "scroll", soon: true },
  { id: "sect", label: "Tông môn", cls: "orange", icon: "bagua" },
  { id: "crafts", label: "Nghề phụ", cls: "cyan", icon: "ginseng", soon: true },
  { id: "bag", label: "Túi đồ", cls: "cyan", icon: "charm" },
];
const GROUP_WORLD = [
  { id: "character", label: "Chỉ số nhân vật", cls: "cyan", icon: "portrait" },
  { id: "npc", label: "Nhân duyên Hạ Giới", cls: "cyan", icon: "portrait", href: "#/nhan-duyen" },
  { id: "codex", label: "Tàng Thư Các", cls: "cyan", icon: "scroll", href: "#/thu-vien" },
  { id: "tm", label: "Quán Đỉnh Thiên Mệnh", cls: "gold", icon: "orb_gold", href: "#/quan-dinh" },
  { id: "history", label: "Bia Thiên Mệnh", cls: "gold", icon: "scroll", href: "#/lich-su" },
  { id: "root", label: "Linh căn", cls: "cyan", icon: "orb_green", soon: true },
  { id: "secret", label: "Bí cảnh", cls: "orange", icon: "crystal", soon: true },
  { id: "enc", label: "Kỳ ngộ", cls: "gold", icon: "clover", href: "#/nhan-duyen" },
  { id: "board", label: "Bảng xếp hạng", cls: "gold", icon: "bagua", soon: true },
  { id: "map", label: "Thiên Vân Địa Đồ", cls: "cyan", icon: "portrait", soon: true },
];
const SOON_TITLE = "Chưa mở trong bản v2";

/** Ấn Đột phá: vừa là nút vừa là thanh tiến độ tu vi. Đầy (ready) thì sáng lên. */
function paintSeal(btn, { life, prog, busy }) {
  const label = btn.querySelector(".seal-label"), pctEl = btn.querySelector(".seal-pct");
  let text, canClick = false, ready = false, fill = prog;
  if (life.status === "cleared") { text = "Hoàn tất tuyến chính"; fill = 1; }
  else if (life.ready_for_major) { text = "Đại đột phá"; canClick = true; ready = true; fill = 1; }
  else if (life.tang < 9) { text = `Tu luyện tầng ${life.tang}`; }
  else { text = "Tích tụ tu vi đại đột phá"; }
  label.textContent = text;
  pctEl.textContent = ready || life.status === "cleared" ? "" : pct(prog, 0);
  btn.style.setProperty("--p", `${fill * 100}%`);
  btn.disabled = !canClick || busy;
  btn.classList.toggle("ready", ready);
  btn.title = canClick ? "Có thể thất bại dẫn tới tử vong thật" : life.tang < 9 ? "Tầng 1–8 tự tiến, không có nguy cơ tử vong" : "";
}

function sealButton({ onclick, kbd, showKbd = true }) {
  return h("button", { type: "button", class: "btn act seal", onclick, "aria-keyshortcuts": kbd },
    icon("orb_gold"),
    h("span", { class: "btn-label" }, h("span", { class: "seal-label" }), " ", h("span", { class: "seal-pct" })),
    showKbd && h("kbd", null, kbd));
}

function item(spec, { onBag, onCharacter, onSect, onCultivate }) {
  const kids = [icon(spec.icon), h("span", { class: "btn-label" }, spec.label)];
  if (spec.soon) {
    return h("button", { type: "button", class: ["btn", "act", "soon", spec.cls], disabled: true, title: SOON_TITLE },
      ...kids, h("span", { class: "soon-tag" }, "Sắp mở"));
  }
  if (spec.href) return h("a", { class: ["btn", "act", spec.cls], href: spec.href, style: { textDecoration: "none" } }, ...kids);
  const count = h("span", { class: "count-tag" });
  return Object.assign(h("button", { type: "button", class: ["btn", "act", spec.cls], onclick: spec.id === "character" ? onCharacter : spec.id === "sect" ? onSect : spec.scroll ? onCultivate : onBag }, ...kids, count), { countEl: count });
}

/**
 * @param {{ game: any, onBag: () => void }} o
 * @returns {{ el: HTMLElement, dock: HTMLElement, update(state: any, life: any, prog: number): void }}
 */
export function createMenu({ game, onBag, onCharacter, onSect, onCultivate }) {
  const breakSeal = sealButton({ onclick: () => game.prepare(), kbd: "D" });
  const dockSeal = sealButton({ onclick: () => game.prepare(), kbd: "D", showKbd: false });
  let bagBtn = null;

  const build = (spec) => {
    if (spec.seal) return breakSeal;
    const b = item(spec, { onBag, onCharacter, onSect, onCultivate });
    if (spec.id === "bag") bagBtn = b;
    return b;
  };

  const syncBtn = h("button", { type: "button", class: "btn act dimbtn", onclick: () => game.refresh() },
    h("span", { class: "btn-label" }, "Đồng bộ lại với máy chủ"));

  const el = h("div", { class: "col-right", id: "menu" },
    h("div", { class: "sec" }, "Tu hành"), GROUP_ACTIONS.map(build),
    h("div", { class: "sec" }, "Nhân vật & thế giới"), GROUP_WORLD.map(build),
    syncBtn,
    h("div", { class: "dim small center" }, "Phím tắt: D (đại đột phá)"));

  const dock = h("nav", { class: "dock", "aria-label": "Thao tác nhanh" },
    dockSeal,
    h("a", { class: "btn gold", href: "#/quan-dinh" }, icon("orb_gold"), h("span", { class: "btn-label" }, "Quán Đỉnh")),
    h("button", { type: "button", class: "btn cyan", onclick: onBag }, icon("charm"), h("span", { class: "btn-label" }, "Túi đồ")),
    h("button", { type: "button", class: "btn dimbtn", onclick: () => {
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    } }, icon("bagua"), h("span", { class: "btn-label" }, "Thêm")));

  return {
    el, dock,
    update(state, life, prog) {
      const busy = game.busy;
      paintSeal(breakSeal, { life, prog, busy });
      paintSeal(dockSeal, { life, prog, busy });
      syncBtn.disabled = busy;
      const n = life.items.length;
      if (bagBtn) { bagBtn.countEl.textContent = n ? String(n) : ""; bagBtn.countEl.hidden = !n; }
    },
  };
}
