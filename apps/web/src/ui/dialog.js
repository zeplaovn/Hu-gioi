/* Hộp thoại dùng <dialog> gốc của trình duyệt: có focus trap, Esc để đóng. onclose chạy cả khi người dùng bấm Esc. */
import { h } from "./dom.js";

let seq = 0;

export function createDialog({ title, onclose } = {}) {
  const id = `dlg-title-${++seq}`;
  const heading = h("h2", { id }, title ?? "");
  const body = h("div");
  const el = h("dialog", { "aria-labelledby": id }, heading, body);
  el.addEventListener("close", () => onclose?.());
  return {
    el,
    body,
    setTitle(t) { heading.textContent = t; },
    show() { if (el.isConnected && !el.open) el.showModal(); },
    hide() { if (el.open) el.close(); },
    get isOpen() { return el.open; },
  };
}
