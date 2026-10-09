/* Tiện ích giao diện: dựng DOM, modal, thanh tiến độ mượt. */
"use strict";
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k === "value" || k === "disabled" || k === "checked" || k === "src") el[k] = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  return el;
}

(function () {
  const ui = TT.ui = {};
  const root = () => document.getElementById("modal-root");

  /** Tạo cửa sổ modal. onClose (tuỳ chọn): gọi khi bấm nền / Esc. */
  ui.modal = (cls, onClose) => {
    const overlay = h("div", { class: "overlay" });
    const box = h("div", { class: "box " + (cls || "") });
    overlay.append(box);
    overlay._onClose = onClose || null;
    if (onClose) overlay.addEventListener("pointerdown", e => { if (e.target === overlay) onClose(); });
    root().append(overlay);
    return { overlay, box, close: () => overlay.remove() };
  };
  ui.anyModal = () => root().children.length > 0;
  ui.closeTop = () => {
    const kids = [...root().children];
    for (let i = kids.length - 1; i >= 0; i--) if (kids[i]._onClose) { kids[i]._onClose(); return true; }
    return false;
  };

  /** Thanh tiến độ chạy mượt, nhấp nháy khi đầy. */
  const bars = [];
  class Bar {
    constructor(color, height = 20) {
      this.color = color; this.val = 0; this.target = 0; this.text = ""; this.pulse = false; this.t = 0;
      this.fill = h("div", { class: "bar-fill" });
      this.label = h("div", { class: "bar-text" });
      this.el = h("div", { class: "bar", style: { height: height + "px", borderColor: color } }, this.fill, this.label);
      bars.push(this);
    }
    set(v, m, text = "", pulse = false) {
      this.target = m ? clamp(v / m, 0, 1) : 0; this.text = text; this.pulse = pulse;
      if (this.label.textContent !== text) this.label.textContent = text;
    }
    step() {
      this.t++;
      const d = this.target - this.val;
      this.val = Math.abs(d) < 0.002 ? this.target : this.val + d * 0.16;
      let col = this.color;
      if (this.pulse) col = TT.mix(this.color, "#ffffff", 0.5 + 0.5 * Math.sin(this.t * 0.25));
      this.fill.style.width = (this.val * 100).toFixed(2) + "%";
      this.fill.style.background = col;
    }
  }
  ui.Bar = Bar;
  let last = performance.now(), acc = 0;
  const loop = now => {
    acc += Math.min(now - last, 200); last = now;
    while (acc >= 33) {
      acc -= 33;
      for (let i = bars.length - 1; i >= 0; i--) {
        if (!bars[i].el.isConnected && bars[i].t > 3) bars.splice(i, 1); else bars[i].step();
      }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  document.addEventListener("keydown", e => { if (e.key === "Escape") ui.closeTop(); });

  /** Nút bấm chuẩn: icon (đường dẫn ảnh) + chữ. */
  ui.btn = (label, onclick, opts = {}) => h("button", {
    class: "btn " + (opts.cls || ""), onclick, disabled: opts.disabled, title: opts.title,
  }, opts.icon ? h("img", { class: "btn-ico", src: opts.icon, alt: "" }) : null, h("span", {}, label));
})();
