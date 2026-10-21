/* Banner phi thăng giữa màn hình: hiệu ứng thuần giao diện (không gọi máy chủ, không đổi dữ liệu).
   Bấm hoặc Esc để đóng sớm; tự tắt sau vài giây. Tôn trọng prefers-reduced-motion. */
import { h } from "./dom.js";

const NEXT = { "Hạ Giới": "Linh Giới", "Linh Giới": "Tiên Giới", "Tiên Giới": "Đại Đạo" };
export const nextWorldName = (name) => NEXT[name] ?? "Đại Đạo";

export function createAscendBanner() {
  let timer = null;
  const title = h("div", { class: "asc-title" }, "PHI THĂNG");
  const sub = h("div", { class: "asc-sub" });
  const el = h("div", { class: "ascend-banner", role: "status", "aria-live": "assertive", hidden: true, onclick: () => hide() },
    h("div", { class: "asc-beam" }), h("div", { class: "asc-ring" }), h("div", { class: "asc-ring r2" }),
    h("div", { class: "asc-card" }, title, sub));
  const onKey = (e) => { if (e.key === "Escape") hide(); };
  function hide() {
    clearTimeout(timer); el.classList.remove("show"); el.hidden = true;
    document.removeEventListener("keydown", onKey);
  }
  return {
    el,
    play(fromWorld) {
      clearTimeout(timer);
      sub.textContent = `${fromWorld} → ${nextWorldName(fromWorld)}`;
      el.hidden = false; el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
      document.addEventListener("keydown", onKey);
      timer = setTimeout(hide, 4800);
    },
    hide,
  };
}
