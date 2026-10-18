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

  /** Tạo cửa sổ modal.
      onClose (tuỳ chọn): gọi khi bấm nền / Esc.  opts: { label, alert, dismissible:false }.
      Modal có role="dialog", giữ focus bên trong (Tab xoay vòng), trả focus về nơi đã mở khi đóng, và khóa cuộn nền. */
  ui.modal = (cls, onClose, opts = {}) => {
    const overlay = h("div", { class: "overlay" });
    const box = h("div", { class: "box " + (cls || ""), role: opts.alert ? "alertdialog" : "dialog", "aria-modal": "true", tabindex: "-1" });
    if (opts.label) box.setAttribute("aria-label", opts.label);
    overlay.append(box);
    overlay._onClose = opts.dismissible === false ? null : (onClose || null);
    overlay._prev = document.activeElement;
    if (overlay._onClose) overlay.addEventListener("pointerdown", e => { if (e.target === overlay) overlay._onClose(); });
    root().append(overlay);
    box.focus({ preventScroll: true });
    return { overlay, box, close: () => overlay.remove() };
  };
  ui.anyModal = () => root().children.length > 0;
  ui.closeTop = () => {
    const kids = [...root().children];
    for (let i = kids.length - 1; i >= 0; i--) if (kids[i]._onClose) { kids[i]._onClose(); return true; }
    return false;
  };
  const FOCUSABLE = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';
  document.addEventListener("keydown", e => {                    // giữ Tab trong modal trên cùng
    if (e.key !== "Tab") return;
    const top = root().lastElementChild;
    if (!top) return;
    const box = top.firstElementChild, items = [...box.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null);
    if (!items.length) { e.preventDefault(); box.focus(); return; }
    const first = items[0], last = items[items.length - 1], cur = document.activeElement;
    if (!box.contains(cur) || cur === box) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
    else if (e.shiftKey && cur === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus(); }
  });
  /* khóa cuộn nền khi có modal; khi modal bị gỡ thì trả focus về nút đã mở nó (kể cả khi bị gỡ bằng replaceChildren) */
  new MutationObserver(muts => {
    document.body.classList.toggle("modal-open", root().children.length > 0);
    for (const m of muts) for (const n of m.removedNodes) {
      const prev = n._prev;
      if (prev && prev.isConnected && prev !== document.body && !root().children.length && typeof prev.focus === "function") prev.focus({ preventScroll: true });
    }
  }).observe(root(), { childList: true });

  /** Hộp xác nhận trong game (thay cho confirm() của trình duyệt, không chặn vòng lặp idle).
      Trả về Promise<boolean>. opts: { title, text, ok, cancel, danger }. Với thao tác nguy hiểm, focus mặc định ở nút Hủy. */
  ui.confirm = ({ title = "Xác nhận", text = "", ok = "Đồng ý", cancel = "Hủy", danger = false } = {}) => new Promise(resolve => {
    let done = false;
    const finish = v => { if (done) return; done = true; m.close(); resolve(v); };
    const m = ui.modal("confirm-box", () => finish(false), { label: title, alert: true });
    const bCancel = ui.btn(cancel, () => finish(false), { cls: "dimbtn" }), bOk = ui.btn(ok, () => finish(true), { cls: danger ? "red" : "gold" });
    m.box.append(h("h2", { class: "mtitle" }, title), h("p", { class: "confirm-text pre" }, text), h("div", { class: "row center" }, bCancel, bOk));
    (danger ? bCancel : bOk).focus();
  });

  /** Thông báo nhỏ góc màn hình (tự tắt, bấm để tắt sớm). kind: "info" | "good" | "bad". */
  let toastBox = null;
  ui.toast = (msg, kind = "info", ms = 3500) => {
    if (!toastBox || !toastBox.isConnected) { toastBox = h("div", { id: "toasts", role: "status", "aria-live": "polite" }); document.body.append(toastBox); }
    const t = h("div", { class: "toast toast-" + kind, onclick: () => t.remove() }, msg);
    toastBox.append(t);
    while (toastBox.childElementCount > 4) toastBox.firstElementChild.remove();
    setTimeout(() => t.remove(), ms);
    return t;
  };

  /** Thanh tiến độ chạy mượt, nhấp nháy khi đầy. */
  const bars = [];
  class Bar {
    constructor(color, height = 20) {
      this.color = color; this.val = 0; this.target = 0; this.text = ""; this.pulse = false; this.t = 0;
      this.fill = h("div", { class: "bar-fill" });
      this.label = h("div", { class: "bar-text" });
      this.el = h("div", { class: "bar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": "0", style: { height: height + "px", borderColor: color } }, this.fill, this.label);
      bars.push(this);
    }
    set(v, m, text = "", pulse = false) {
      this.target = m ? clamp(v / m, 0, 1) : 0; this.text = text; this.pulse = pulse;
      if (this.label.textContent !== text) {
        this.label.textContent = text;
        this.el.setAttribute("aria-valuenow", String(Math.round(this.target * 100))); this.el.setAttribute("aria-valuetext", text);
      }
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
  }, opts.icon ? h("img", { class: "btn-ico", src: opts.icon, alt: "" }) : null, h("span", { class: "btn-label" }, label),
  opts.kbd ? h("kbd", { "aria-hidden": "true" }, opts.kbd) : null);
})();
