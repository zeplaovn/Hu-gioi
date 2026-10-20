/* Trang đăng nhập / đăng ký. Form dựng một lần để không mất nội dung ô nhập khi đổi chế độ hoặc báo lỗi. */
import { configured } from "../config.js";
import { h } from "../ui/dom.js";

export function createLoginView({ auth }) {
  const el = h("section", { class: "hero" },
    h("div", { class: "hanzi", "aria-hidden": "true" }, "天"),
    h("p", { class: "dim eyebrow" }, "Sau Thiên Biến, nhân loại bị dịch chuyển khỏi Trái Đất…"),
    h("h1", null, "Thiên Vân Đại Lục"),
    h("p", { class: "lede" }, "Một kiếp tu sĩ, ba đại giới. Tu luyện theo thời gian thật, vượt Hạ Giới, Linh Giới, Tiên Giới. Chết thật là mất tất cả, chỉ còn Thiên Mệnh theo ngươi qua kiếp sau."),
  );

  if (!configured()) {
    el.append(h("p", { class: "notice error", role: "alert" },
      "Chưa cấu hình Supabase. Đặt ", h("code", null, "PUBLIC_SUPABASE_URL"), " và ", h("code", null, "PUBLIC_SUPABASE_ANON_KEY"),
      " trong ", h("code", null, "apps/web/.env"), " (xem README)."));
    return { el, render() {}, destroy() {} };
  }

  let mode = "in", busy = false, msg = null;
  const email = h("input", { id: "email", type: "email", autocomplete: "email", required: true });
  const password = h("input", { id: "pw", type: "password", minlength: "8", autocomplete: "current-password", required: true });
  const title = h("h2");
  const note = h("p", { class: "notice", role: "status", hidden: true });
  const submit = h("button", { class: "btn" });
  const tabIn = h("button", { type: "button", role: "tab", onclick: () => setMode("in") }, "Đăng nhập");
  const tabUp = h("button", { type: "button", role: "tab", onclick: () => setMode("up") }, "Đăng ký");
  const tabs = h("div", { class: "seg", role: "tablist" }, tabIn, tabUp);
  const setMode = (m) => { mode = m; msg = null; sync(); };
  const showPw = h("input", { type: "checkbox", id: "showpw", onchange: (e) => { password.type = e.target.checked ? "text" : "password"; } });

  const form = h("form", { class: "auth-card stack", onsubmit: onSubmit },
    tabs,
    title,
    h("div", null, h("label", { for: "email" }, "Email"), email),
    h("div", null, h("label", { for: "pw" }, "Mật khẩu"), password,
      h("label", { class: "check small", for: "showpw", style: { marginTop: "6px" } }, showPw, "Hiện mật khẩu")),
    note,
    submit.classList.add("wide", "gold") || submit,
  );
  el.append(form);

  function sync() {
    title.textContent = mode === "in" ? "Nhập đạo" : "Lập đạo hiệu";
    submit.textContent = mode === "in" ? "Đăng nhập" : "Đăng ký";
    tabIn.setAttribute("aria-selected", String(mode === "in"));
    tabUp.setAttribute("aria-selected", String(mode === "up"));
    password.setAttribute("autocomplete", mode === "in" ? "current-password" : "new-password");
    submit.disabled = busy;
    note.hidden = !msg;
    note.textContent = msg ?? "";
  }

  async function onSubmit(e) {
    e.preventDefault();
    busy = true; msg = null; sync();
    try { msg = mode === "in" ? await auth.signIn(email.value, password.value) : await auth.signUp(email.value, password.value); }
    catch { msg = "Không đăng nhập được, vui lòng thử lại."; }
    busy = false; sync();
  }

  sync();
  return { el, render() {}, destroy() {} };
}
