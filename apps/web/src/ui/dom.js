/* Dựng DOM không framework. Chuỗi luôn đi qua createTextNode/textContent nên không bao giờ bị hiểu là HTML (không XSS). */
import { assetBase } from "../config.js";

/** Gắn con: chuỗi/số -> text node; null/false bị bỏ; mảng được làm phẳng. */
export function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return el;
}

/**
 * h("button", { class: ["btn", cond && "ready"], style: { "--p": "40%" }, disabled: busy, onclick: fn }, "Nhãn")
 * - null/false bỏ thuộc tính; true -> thuộc tính rỗng; on* -> addEventListener.
 */
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = Array.isArray(v) ? v.filter(Boolean).join(" ") : String(v);
    else if (k === "style") {
      if (typeof v === "string") el.style.cssText = v;
      else for (const [p, val] of Object.entries(v)) { if (p.startsWith("--")) el.style.setProperty(p, String(val)); else el.style[p] = val; }
    } else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, String(v));
  }
  return append(el, kids);
}

/** Thay toàn bộ con của el. */
export function clear(el, ...kids) {
  el.replaceChildren();
  return append(el, kids);
}

/** Icon pixel 22px của bộ asset (assets/icons/<tên>_22.png). */
export const icon = (name, cls = "btn-ico", style) =>
  h("img", { class: cls, src: `${assetBase()}/icons/${name}_22.png`, alt: "", style });
