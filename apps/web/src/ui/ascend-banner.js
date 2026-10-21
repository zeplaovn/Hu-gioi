/* Banner phi thăng giữa màn hình: hiệu ứng thuần giao diện (không gọi máy chủ, không đổi dữ liệu).
   Bấm hoặc Esc để đóng sớm; tự tắt sau vài giây. Tôn trọng prefers-reduced-motion. */
import { h } from "./dom.js";

const NEXT = { "Hạ Giới": "Linh Giới", "Linh Giới": "Tiên Giới", "Tiên Giới": "Đại Đạo" };
export const nextWorldName = (name) => NEXT[name] ?? "Đại Đạo";

/** Tia sáng bay lên: giá trị cố định theo chỉ số để dựng lại giống nhau mỗi lần. */
function sparks() {
  return Array.from({ length: 36 }, (_, i) => h("i", { style: {
    "--x": `${(i * 37) % 100}%`, "--s": `${3 + (i % 4) * 2}px`, "--d": `${2.2 + (i % 5) * 0.5}s`,
    "--t": `${((i * 13) % 20) / 10}s`, "--dx": `${((i % 7) - 3) * 18}px` } }));
}

/** Sao rơi: vệt sáng chéo từ trên xuống, giá trị cố định theo chỉ số. */
function stars() {
  return Array.from({ length: 22 }, (_, i) => h("i", { style: {
    "--x": `${(i * 29) % 90 - 10}%`, "--l": `${70 + (i % 5) * 28}px`, "--d": `${1.4 + (i % 4) * 0.45}s`, "--t": `${((i * 17) % 30) / 10}s` } }));
}

export function createAscendBanner() {
  let timer = null;
  const title = h("div", { class: "asc-title" }, "PHI THĂNG");
  const sub = h("div", { class: "asc-sub" });
  const el = h("div", { class: "ascend-banner", role: "status", "aria-live": "assertive", hidden: true, onclick: () => hide() },
    h("div", { class: "asc-rays" }), h("div", { class: "asc-beam" }), h("div", { class: "asc-stars" }, stars()), h("div", { class: "asc-sparks" }, sparks()),
    h("div", { class: "asc-ring" }), h("div", { class: "asc-ring r2" }), h("div", { class: "asc-ring r3" }), h("div", { class: "asc-flash" }),
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
      timer = setTimeout(hide, 6200);
    },
    hide,
  };
}
