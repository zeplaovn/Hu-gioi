/* Thanh tiến độ kiểu bản cũ: viền màu, chữ nằm trên thanh. Tạo một lần, gọi set() để cập nhật (giữ hiệu ứng chạy của thanh). */
import { clamp01 } from "../format.js";
import { h } from "./dom.js";

export const TONE = { jade: "#2fb86a", gold: "#d9a21f", cinnabar: "#c8452e", cyan: "#3aa7d6" };

/**
 * @param {{ label: string, tone?: keyof typeof TONE, showLabel?: boolean }} o
 * showLabel=false: chỉ vẽ thanh (nhãn nằm ở chỗ khác), vẫn giữ aria-label.
 */
export function createBar({ label, tone = "jade", showLabel = true }) {
  const c = TONE[tone];
  const labelEl = h("div", { class: "bar-label", style: { color: c } }, label);
  const fill = h("div", { class: "bar-fill", style: { background: c } });
  const text = h("div", { class: "bar-text num" });
  const track = h("div", { class: "bar", style: { borderColor: c }, role: "progressbar", "aria-label": label, "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": 0 }, fill, text);
  const el = showLabel ? h("div", null, labelEl, track) : track;
  return {
    el,
    /** value: 0..1 */
    set(value, txt = "") {
      const v = clamp01(value);
      fill.style.width = `${v * 100}%`;
      track.setAttribute("aria-valuenow", String(Math.round(v * 100)));
      text.textContent = txt;
      track.title = txt;
    },
    setLabel(t) { labelEl.textContent = t; track.setAttribute("aria-label", t); },
  };
}
