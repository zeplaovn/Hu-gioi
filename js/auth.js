/* Giao diện đăng nhập / đăng ký, hộp thoại xử lý dữ liệu lệch nhau, chỉ báo đồng bộ và nút đăng xuất.
   Chỉ hoạt động khi đã cấu hình Supabase (TT.cloud.enabled); nếu không, game chạy ngoại tuyến như cũ. */
"use strict";
(function () {
  const cloud = TT.cloud;
  if (!cloud || !cloud.enabled) return;
  const auth = TT.auth = {};
  const app = () => document.getElementById("app");
  const busy = text => app().replaceChildren(h("div", { id: "loading", role: "status" }, text));
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* ---------- luồng mở game ---------- */
  auth.boot = async start => {
    busy("Đang kết nối tài khoản…");
    let r;
    try { r = await cloud.bootstrap(); } catch (e) { return fatal(e, start); }
    return handle(r, start);
  };
  async function handle(r, start) {
    if (r.state === "anon") return showAuth(start, r.expired ? "Phiên đăng nhập đã hết hạn, hãy đăng nhập lại." : "");
    if (r.state === "reload") return location.reload();
    if (r.state === "conflict") return askConflict(r.row, start);
    if (r.state === "offer-upload") return askUpload(start);
    wire();
    if (r.offline) TT.ui.toast("Đang ngoại tuyến: tiến trình sẽ được đồng bộ khi có mạng.", "info", 6000);
    start();
  }
  function fatal(e, start) {
    app().replaceChildren(h("div", { class: "auth-screen" }, h("div", { class: "auth-card", role: "alert" },
      h("h1", { class: "auth-title" }, "Không vào được tài khoản"), h("p", { class: "center" }, cloud.errorText(e)),
      h("div", { class: "row center" }, TT.ui.btn("Thử lại", () => auth.boot(start), { cls: "gold" }), TT.ui.btn("Đăng xuất", () => doSignOut(false), { cls: "dimbtn" })))));
  }


  /* ---------- hCaptcha (khi có site key) ---------- */
  const HC_URL = "https://js.hcaptcha.com/1/api.js?render=explicit";
  const hcHost = u => { try { const x = new URL(u, location.href); return x.protocol === "https:" && (x.hostname === "hcaptcha.com" || x.hostname.endsWith(".hcaptcha.com")); } catch (e) { return false; } };
  let hcLoading = null;
  function loadHcaptcha() {                                     // nạp 1 lần; CSP chỉ cho phép *.hcaptcha.com, Trusted Types chỉ cho URL script thuộc hCaptcha
    if (window.hcaptcha && window.hcaptcha.render) return Promise.resolve();
    if (hcLoading) return hcLoading;
    hcLoading = new Promise((resolve, reject) => {
      const tt = window.trustedTypes;
      let url = HC_URL;
      if (tt && tt.createPolicy) {
        // hCaptcha tự chèn thêm script lúc chạy: chính sách "default" chỉ chấp nhận URL script của hCaptcha, HTML và mã script tự do vẫn bị chặn.
        if (!tt.defaultPolicy) { try { tt.createPolicy("default", { createScriptURL: u => { if (hcHost(u)) return u; throw new TypeError("Script URL không được phép"); }, createHTML: () => { throw new TypeError("HTML không được phép"); }, createScript: () => { throw new TypeError("Script không được phép"); } }); } catch (e) { /* đã có chính sách */ } }
        try { url = tt.createPolicy("tvdl-hcaptcha-" + Date.now().toString(36), { createScriptURL: u => (u === HC_URL ? u : (() => { throw new TypeError("URL không được phép"); })()) }).createScriptURL(HC_URL); } catch (e) { /* dùng chuỗi thường nếu không tạo được */ }
      }
      const s = document.createElement("script");
      s.src = url; s.async = true; s.defer = true;
      s.onload = () => { const t0 = Date.now(), wait = () => (window.hcaptcha && window.hcaptcha.render ? resolve() : Date.now() - t0 > 10000 ? reject({ message: "hcaptcha_load" }) : setTimeout(wait, 100)); wait(); };
      s.onerror = () => reject({ net: true, message: "hcaptcha_load" });
      document.head.appendChild(s);
    }).catch(e => { hcLoading = null; throw e; });
    return hcLoading;
  }

  /* ---------- màn đăng nhập / đăng ký ---------- */
  function showAuth(start, note) {
    let mode = "login", pending = false, capToken = "", capWidget = null;
    const capBox = h("div", { class: "captcha-box", id: "a-captcha", hidden: !cloud.captchaKey });
    const capReset = () => { capToken = ""; try { if (capWidget !== null && window.hcaptcha) window.hcaptcha.reset(capWidget); } catch (e) { /* bỏ qua */ } };
    const msg = h("div", { class: "auth-msg small", role: "alert", "aria-live": "assertive" }, note || "");
    const say = (text, kind) => { msg.textContent = text || ""; msg.className = "auth-msg small" + (kind ? " " + kind : ""); };
    const email = h("input", { id: "a-email", class: "field auth-in", type: "email", autocomplete: "email", inputmode: "email", maxlength: "254", required: true, autocapitalize: "none", spellcheck: "false" });
    const pass = h("input", { id: "a-pass", class: "field auth-in", type: "password", autocomplete: "current-password", maxlength: "72", required: true });
    const pass2 = h("input", { id: "a-pass2", class: "field auth-in", type: "password", autocomplete: "new-password", maxlength: "72" });
    const show = h("input", { id: "a-show", type: "checkbox", onchange: () => { pass.type = pass2.type = show.checked ? "text" : "password"; } });
    const row2 = h("div", { class: "auth-field", hidden: true }, h("label", { for: "a-pass2" }, "Nhập lại mật khẩu"), pass2);
    const submit = TT.ui.btn("Đăng nhập", () => {}, { cls: "gold wide" });
    submit.type = "submit";                                     // bấm nút hoặc Enter đều đi qua onsubmit của form
    const forgot = h("button", { class: "linkbtn", type: "button", onclick: async () => {
      if (!EMAIL_RE.test(email.value.trim())) return say("Hãy nhập email của bạn trước.", "red-t");
      if (cloud.captchaKey && !capToken) return say("Hãy tích ô xác minh hCaptcha trước.", "red-t");
      try { await cloud.recover(email.value.trim(), capToken); capReset(); say("Nếu email này đã đăng ký, bạn sẽ nhận được thư đặt lại mật khẩu.", "green"); }
      catch (e) { capReset(); say(cloud.errorText(e), "red-t"); }
    } }, "Quên mật khẩu?");
    const seg = (m, label) => h("button", { class: "seg", type: "button", role: "radio", "data-m": m, onclick: () => setMode(m) }, label);
    const segLogin = seg("login", "Đăng nhập"), segReg = seg("register", "Đăng ký");
    const setMode = m => {
      mode = m; say("");
      segLogin.classList.toggle("on", m === "login"); segLogin.setAttribute("aria-checked", String(m === "login"));
      segReg.classList.toggle("on", m === "register"); segReg.setAttribute("aria-checked", String(m === "register"));
      row2.hidden = m !== "register"; pass2.required = m === "register"; forgot.hidden = m !== "login";
      pass.autocomplete = m === "login" ? "current-password" : "new-password";
      submit.querySelector(".btn-label").textContent = m === "login" ? "Đăng nhập" : "Tạo tài khoản";
    };
    const form = h("form", { class: "auth-form", novalidate: true, onsubmit: async e => {
      e.preventDefault(); if (pending) return;
      const em = email.value.trim(), pw = pass.value;
      if (!EMAIL_RE.test(em)) return say("Email không hợp lệ.", "red-t");
      if (mode === "register") {
        if (pw.length < 8) return say("Mật khẩu cần ít nhất 8 ký tự.", "red-t");
        if (pw !== pass2.value) return say("Hai mật khẩu không khớp.", "red-t");
      } else if (!pw) return say("Hãy nhập mật khẩu.", "red-t");
      if (cloud.captchaKey && !capToken) return say("Hãy tích ô xác minh hCaptcha trước.", "red-t");
      pending = true; submit.disabled = true; say("Đang xử lý…", "dim");
      try {
        if (mode === "register") {
          const r = await cloud.signUp(em, pw, capToken); capReset();
          if (!r.signedIn) { pending = false; submit.disabled = false; setMode("login"); say("Hãy kiểm tra hộp thư để xác nhận email, rồi quay lại đăng nhập.", "green"); return; }
        } else { await cloud.signIn(em, pw, capToken); capReset(); }
        pass.value = pass2.value = "";
        return auth.boot(start);                                // đã đăng nhập: nạp dữ liệu tài khoản (hoặc vào màn tạo nhân vật nếu tài khoản mới)
      } catch (err) { capReset(); say(cloud.errorText(err), "red-t"); }
      pending = false; submit.disabled = false;
    } },
    h("div", { class: "auth-field" }, h("label", { for: "a-email" }, "Email"), email),
    h("div", { class: "auth-field" }, h("label", { for: "a-pass" }, "Mật khẩu"), pass),
    row2,
    h("label", { class: "auth-show small dim", for: "a-show" }, show, " Hiện mật khẩu"),
    capBox, msg, h("div", { class: "row center" }, submit), h("div", { class: "center" }, forgot));
    app().replaceChildren(h("div", { class: "auth-screen" }, h("div", { class: "auth-card" },
      h("h1", { class: "auth-title" }, "THIÊN VÂN ĐẠI LỤC"),
      h("p", { class: "dim small center" }, "Đăng nhập để lưu tiến trình trên tài khoản và chơi tiếp trên mọi thiết bị."),
      h("div", { class: "seg-row", role: "radiogroup", "aria-label": "Chế độ" }, segLogin, segReg), form,
      h("p", { class: "dim small center" }, "Tài khoản mới sẽ tạo nhân vật ngay sau khi đăng ký."))));
    setMode("login"); email.focus();
    if (cloud.captchaKey) loadHcaptcha().then(() => {
      if (!capBox.isConnected) return;
      capWidget = window.hcaptcha.render(capBox, { sitekey: cloud.captchaKey, theme: "dark", callback: t => { capToken = String(t || ""); }, "expired-callback": () => { capToken = ""; }, "error-callback": () => { capToken = ""; say("hCaptcha gặp lỗi, hãy tải lại trang và thử lại.", "red-t"); } });
    }, () => say("Không tải được hCaptcha. Hãy kiểm tra mạng hoặc tắt trình chặn quảng cáo rồi tải lại trang.", "red-t"));
  }

  /* ---------- dữ liệu máy chủ và máy này khác nhau ---------- */
  const when = t => { const d = new Date(t); return isNaN(d) ? "" : ` (lưu lúc ${d.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })})`; };
  const describe = (raw, t) => {                                // tóm tắt đủ để phân biệt hai bản: tên, cảnh giới, số tháng đã tu, linh thạch, thời điểm lưu
    try {
      if (!raw || !raw.player) return "Chưa có nhân vật";
      const p = TT.sec.cleanPlayer(JSON.parse(JSON.stringify(raw.player)));
      return p ? `${p.name} · ${p.realm_name()} · tháng ${p.months} · ${p.stone} linh thạch${when(t)}` : "Không đọc được";
    } catch (e) { return "Không đọc được"; } finally { TT.sec.error = ""; }
  };
  const localSummary = () => {
    const s = TT.sec.read("tu_tien_save_v2", "save"); let t = 0;
    try { t = JSON.parse(localStorage.getItem("tu_tien_save_v2")).t; } catch (e) { /* bỏ qua */ }
    return describe(s && s.obj, t);
  };
  function chooser({ title, text, cloudLabel, localLabel, row, onCloud, onLocal }) {
    const m = TT.ui.modal("dlg-box", null, { label: title, alert: true, dismissible: false });
    m.box.append(h("h2", { class: "mtitle" }, title), h("p", { class: "center pre" }, text),
      h("div", { class: "info-lines panel" },
        h("div", {}, h("span", { class: "dim" }, "Trên tài khoản: "), h("b", {}, row ? describe(row.save, row.updated_at) : "Chưa có dữ liệu")),
        h("div", {}, h("span", { class: "dim" }, "Trên máy này: "), h("b", {}, localSummary()))),
      h("div", { class: "row center" },
        TT.ui.btn(cloudLabel, async () => { m.close(); await onCloud(); }, { cls: "gold" }),
        TT.ui.btn(localLabel, async () => {
          if (await TT.ui.confirm({ title: "Ghi đè dữ liệu?", text: "Dữ liệu bị bỏ sẽ mất vĩnh viễn, không khôi phục được.", ok: "Tôi hiểu, tiếp tục", cancel: "Quay lại", danger: true })) { m.close(); await onLocal(); }
        }, { cls: "red" })));
    return m;
  }
  function askConflict(row, start) {
    busy("");
    chooser({
      title: "Dữ liệu trên máy và trên tài khoản khác nhau",
      text: "Có thể bạn đã chơi ở thiết bị khác. Hãy chọn bản muốn giữ.",
      cloudLabel: "Dùng dữ liệu trên tài khoản", localLabel: "Dùng dữ liệu trên máy này", row,
      onCloud: () => { cloud.discardLocal(row); location.reload(); },
      onLocal: async () => { try { await cloud.acceptLocalUpload(); wire(); start(); } catch (e) { fatal(e, start); } },
    });
  }
  function askUpload(start) {
    busy("");
    const m = TT.ui.modal("dlg-box", null, { label: "Dữ liệu có sẵn trên máy", alert: true, dismissible: false });
    m.box.append(h("h2", { class: "mtitle" }, "Có dữ liệu chơi sẵn trên máy này"),
      h("p", { class: "center pre" }, `${localSummary()}\n\nBạn muốn tải tiến trình này lên tài khoản mới không?`),
      h("div", { class: "row center" },
        TT.ui.btn("Tải lên tài khoản", async () => { m.close(); try { await cloud.acceptLocalUpload(); wire(); start(); } catch (e) { fatal(e, start); } }, { cls: "gold" }),
        TT.ui.btn("Bắt đầu mới", async () => {
          if (await TT.ui.confirm({ title: "Bỏ dữ liệu trên máy?", text: "Tiến trình trên máy này sẽ bị xóa và không khôi phục được.", ok: "Xóa và bắt đầu mới", cancel: "Quay lại", danger: true })) { m.close(); cloud.discardLocal(null); wire(); start(); }
        }, { cls: "red" })));
  }

  /* ---------- trong game: chỉ báo đồng bộ, xung đột lúc đang chơi, đăng xuất ---------- */
  const hhmm = t => new Date(t).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  function paint() {
    const el = TT.game && TT.game.U && TT.game.U.save; if (!el) return;
    const st = cloud.status();
    const t = ({ syncing: ["Đang đồng bộ…", 0], synced: ["Đã đồng bộ " + hhmm(st.t || Date.now()), 0], offline: ["Ngoại tuyến · chưa đồng bộ", 1], conflict: ["Dữ liệu bị lệch", 1], error: [st.text || "Lỗi đồng bộ", 1], signedout: ["Cần đăng nhập lại", 1] })[st.state] || [cloud.dirty() ? "Chờ đồng bộ…" : "Đã đồng bộ", 0];
    el.textContent = t[0]; el.classList.toggle("bad", !!t[1]);
  }
  let wired = false;
  function wire() {
    if (wired) return; wired = true;
    cloud.onStatus(st => {
      paint();
      if (st.state === "conflict") runtimeConflict();
      if (st.state === "signedout") {
        const m = TT.ui.modal("dlg-box", null, { label: "Cần đăng nhập lại", alert: true, dismissible: false });
        m.box.append(h("h2", { class: "mtitle" }, "Phiên đăng nhập đã hết hạn"), h("p", { class: "center" }, "Tiến trình trên máy vẫn được giữ. Hãy đăng nhập lại để tiếp tục đồng bộ."),
          h("div", { class: "row center" }, TT.ui.btn("Đăng nhập lại", () => { TT.sec.stale = true; location.reload(); }, { cls: "gold" })));
      }
    });
    const G = TT.Game.prototype, showGame = G.showGame, showCreate = G.showCreate;
    G.showGame = function () { showGame.apply(this, arguments); paint(); };
    G.showCreate = function () {
      showCreate.apply(this, arguments);
      const box = document.querySelector(".create-right .col.center");
      if (box) box.prepend(h("div", { class: "acct-row" }, auth.chip()));
    };
    if (TT.game && TT.game.U && TT.game.U.save) paint();
  }
  async function runtimeConflict() {
    TT.sec.stale = true;                                        // dừng ghi trong lúc người chơi quyết định
    if (TT.game) { clearInterval(TT.game.idleTimer); TT.game.locked = true; }
    let row = null; try { row = await cloud.pull(); } catch (e) { /* vẫn cho chọn */ }
    chooser({
      title: "Tài khoản đã được lưu từ nơi khác",
      text: "Một thiết bị khác vừa lưu tiến trình lên tài khoản. Hãy chọn bản muốn giữ.",
      cloudLabel: "Dùng dữ liệu trên tài khoản", localLabel: "Giữ dữ liệu trên máy này", row,
      onCloud: async () => { await cloud.resolveConflict("cloud"); location.reload(); },
      onLocal: async () => { try { await cloud.resolveConflict("local"); location.reload(); } catch (e) { TT.ui.toast(cloud.errorText(e), "bad"); } },
    });
  }
  async function doSignOut(ask = true) {
    if (ask) {
      const pending = cloud.dirty();
      const yes = await TT.ui.confirm({ title: "Đăng xuất?", text: pending ? "Tiến trình mới sẽ được đồng bộ trước khi đăng xuất. Bản lưu tạm trên máy này sẽ bị xóa." : "Dữ liệu đã nằm trên tài khoản. Bản lưu tạm trên máy này sẽ bị xóa.", ok: "Đăng xuất", cancel: "Ở lại" });
      if (!yes) return;
    }
    TT.sec.stale = true;                                        // chặn mọi lần ghi tiếp theo của game
    busy("Đang đăng xuất…");
    try { await cloud.signOut(); }
    catch (e) {
      if (!e || !e.unsynced) throw e;
      const drop = await TT.ui.confirm({ title: "Chưa đồng bộ được tiến trình", text: "Tiến trình mới nhất chưa lên được tài khoản (mất mạng hoặc dữ liệu bị lệch). Nếu đăng xuất bây giờ, phần này sẽ mất vĩnh viễn.", ok: "Vẫn đăng xuất", cancel: "Ở lại", danger: true });
      if (!drop) return location.reload();
      await cloud.signOut({ force: true });
    }
    location.reload();
  }
  async function doDelete() {
    const yes = await TT.ui.confirm({ title: "Xóa tài khoản vĩnh viễn?", text: "Toàn bộ nhân vật, thành tựu và lịch sử trên tài khoản sẽ bị xóa và KHÔNG thể khôi phục. Bản lưu trên máy này cũng bị xóa.", ok: "Xóa vĩnh viễn", cancel: "Quay lại", danger: true });
    if (!yes) return;
    TT.sec.stale = true; busy("Đang xóa tài khoản…");
    try { await cloud.deleteAccount(); }
    catch (e) { TT.sec.stale = false; TT.ui.toast(cloud.errorText(e), "bad"); return location.reload(); }
    location.reload();
  }
  /* ---------- bảng xếp hạng ---------- */
  const lvName = lv => `${TT.REALMS[Math.floor((lv - 1) / 9)] || "?"} tầng ${(lv - 1) % 9 + 1}`;
  const years = mo => (mo >= 12 ? `${Math.floor(mo / 12)} năm ${mo % 12} tháng` : `${mo} tháng`);
  TT.Game.prototype.openBoard = function () {
    const m = TT.ui.modal("dlg-box board-box", null, { label: "Bảng xếp hạng", alert: false });
    const body = h("div", { class: "board-body", role: "status" }, "Đang tải bảng xếp hạng…");
    const tabs = [[0, "Mọi thời đại"], [7, "7 ngày qua"]].map(([d, label]) => h("button", { class: "seg", type: "button", role: "tab", onclick: () => load(d) }, label));
    const note = h("p", { class: "dim small center" });
    m.box.append(h("h2", { class: "mtitle" }, "Bảng xếp hạng"), h("div", { class: "board-tabs", role: "tablist" }, tabs), body, note,
      h("div", { class: "row center" }, TT.ui.btn("Đóng", () => m.close(), { cls: "dimbtn sm" })));
    let seq = 0;
    const medal = i => (i < 3 ? ["🥇", "🥈", "🥉"][i] : String(i + 1));
    async function load(days) {
      const my = ++seq;
      tabs.forEach((t, i) => { const on = (i === 0) === (days === 0); t.classList.toggle("on", on); t.setAttribute("aria-selected", String(on)); });
      note.textContent = days
        ? "Chỉ gồm người vừa đạt cảnh giới mới trong 7 ngày qua, nên người mới vẫn có cơ hội lên bảng. Đạo hiệu hiển thị công khai."
        : "Xếp theo cảnh giới cao nhất từng đạt, bằng nhau thì ai tu ít thời gian hơn xếp trên. Đạo hiệu của bạn hiển thị công khai cho người chơi khác.";
      body.setAttribute("role", "status"); body.textContent = "Đang tải bảng xếp hạng…";
      try {
        const { top, mine, rank, uid } = await cloud.leaderboard({ days });
        if (my !== seq || !m.box.isConnected) return;
        const row = (r, i, you) => h("li", { class: "board-row" + (r.user_id === uid || you ? " me" : "") },
          h("span", { class: "board-rank" }, i == null ? "—" : medal(i)),
          h("span", { class: "board-name" }, r.name, r.user_id === uid ? " (bạn)" : ""),
          h("span", { class: "board-realm", style: { color: TT.REALM_COLORS[Math.floor((r.level - 1) / 9)] } }, lvName(r.level)),
          h("span", { class: "board-time dim small" }, years(r.months)));
        const list = top.length ? h("ol", { class: "board-list" }, top.map((r, i) => row(r, i))) : h("p", { class: "center dim" }, days ? "Tuần này chưa có ai lập thành tích mới. Hãy là người đầu tiên!" : "Chưa có ai trên bảng. Hãy tu luyện và lưu game để là người đầu tiên!");
        const you = mine && rank == null ? h("div", { class: "board-you" }, h("div", { class: "dim small center" }, "Thành tích của bạn (ngoài top 50)"), h("ol", { class: "board-list" }, row(mine, null, true))) : null;
        body.replaceChildren(list, ...(you ? [you] : []));
        body.removeAttribute("role");
      } catch (e) { if (my === seq) body.textContent = cloud.errorText(e); }
    }
    load(0);
  };

  auth.chip = () => {
    const u = cloud.user();
    return h("span", { class: "acct" }, h("span", { class: "acct-mail small dim", title: u ? u.email : "" }, u ? u.email : ""),
      TT.ui.btn("Đăng xuất", () => doSignOut(), { cls: "dimbtn sm" }),
      TT.ui.btn("Xóa tài khoản", doDelete, { cls: "dimbtn sm", title: "Xóa vĩnh viễn tài khoản và dữ liệu trên máy chủ" }));
  };
})();
