/* Thiên Vân Địa Đồ: ba đại giới và tính năng mỗi giới. "Xem trước" chỉ đổi giao diện trên trình duyệt này, không đổi dữ liệu thật. */
import { createDialog } from "./dialog.js";
import { clear, h } from "./dom.js";
import { FEATURES, WORLDS, availableIn, getPreview, setPreview, worldByServerName } from "../world.js";

export function createWorldMapDialog({ getRealWorldName, onChange }) {
  const dlg = createDialog({ title: "Thiên Vân Địa Đồ" });
  dlg.el.classList.add("worldmap-dialog");
  function draw() {
    const real = worldByServerName(getRealWorldName()).id, prev = getPreview();
    clear(dlg.body,
      h("p", { class: "frame-note" }, "Khung giao diện ba đại giới. Tên địa danh theo tài liệu thiết kế; bản đồ chính thức chưa chốt."),
      prev && h("p", { class: "frame-note" }, "Đang xem trước giao diện của giới khác (không ảnh hưởng nhân vật). ",
        h("button", { type: "button", class: "btn sm", onclick: () => { setPreview(null); onChange(); draw(); } }, "Quay về giới thật")),
      h("div", { class: "frame-cards" }, WORLDS.map((w) => h("section", { class: ["frame-card", w.id === (prev ?? real) && "current"], style: { borderColor: w.color } },
        h("h3", { style: { color: w.color } }, w.name, w.id === real ? " · nhân vật đang ở đây" : ""),
        h("p", null, w.tagline),
        h("p", { class: "dim small" }, `Nơi chốn: ${w.places.join(" · ")}`),
        h("ul", { class: "frame-features" }, FEATURES.map((f) => h("li", { class: availableIn(f.id, w.id) ? "" : "off" },
          `${availableIn(f.id, w.id) ? "✓" : "✗"} ${f.label}${f.status === "frame" && availableIn(f.id, w.id) ? " (khung)" : ""}`))),
        w.id !== (prev ?? real) && h("button", { type: "button", class: "btn sm cyan", onclick: () => { setPreview(w.id === real ? null : w.id); onChange(); draw(); } }, "Xem giao diện giới này")))),
      h("div", { class: "dialog-actions" }, h("button", { type: "button", class: "btn", onclick: () => dlg.hide() }, "Đóng")));
  }
  return { el: dlg.el, open() { draw(); dlg.show(); } };
}
