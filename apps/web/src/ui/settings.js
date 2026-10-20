/* Hộp thoại Cài đặt: nhạc nền (bật/tắt, âm lượng, chọn bản). Lưu trong trình duyệt. */
import { TRACKS } from "../audio.js";
import { createDialog } from "./dialog.js";
import { clear, h } from "./dom.js";

export function createSettingsDialog({ audio }) {
  const dlg = createDialog({ title: "Cài đặt" });
  function render() {
    const s = audio.settings;
    const vol = h("input", { type: "range", min: "0", max: "100", step: "5", value: String(Math.round(s.volume * 100)), id: "vol", disabled: !s.music, "aria-label": "Âm lượng nhạc nền",
      oninput: (e) => { audio.update({ volume: Number(e.target.value) / 100 }); volLabel.textContent = `${e.target.value}%`; } });
    const volLabel = h("span", { class: "num" }, `${Math.round(s.volume * 100)}%`);
    const choice = (id, label) => h("label", { class: "check" },
      h("input", { type: "radio", name: "track", value: id, checked: s.track === id, disabled: !s.music, onchange: () => audio.update({ track: id }) }), ` ${label}`);
    clear(dlg.body, h("div", { class: "stack settings" },
      h("h3", { class: "t-green" }, "Âm thanh"),
      h("label", { class: "check" }, h("input", { type: "checkbox", id: "music", checked: s.music, onchange: (e) => audio.update({ music: e.target.checked }) }), " Nhạc nền"),
      h("div", { class: "row" }, h("label", { for: "vol" }, "Âm lượng"), vol, volLabel),
      h("fieldset", { class: "settings-tracks" }, h("legend", { class: "small dim" }, "Bản nhạc"),
        choice("auto", "Luân phiên cả hai bản"), TRACKS.map((t) => choice(t.id, t.title))),
      s.music && audio.blocked && h("p", { class: "small dim", role: "status" }, "Trình duyệt chặn tự phát nhạc; nhạc sẽ vang lên khi ngươi chạm vào trang."),
      h("p", { class: "small dim" }, "Cài đặt chỉ lưu trên trình duyệt này và không ảnh hưởng tiến trình tu luyện."),
      h("div", { class: "row center" }, h("button", { type: "button", class: "btn ghost", onclick: () => dlg.hide() }, "Đóng"))));
  }
  return { el: dlg.el, open() { render(); dlg.show(); }, hide: dlg.hide, refresh() { if (dlg.isOpen) render(); } };
}
