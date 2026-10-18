/* Chat thế giới: nút nổi "Chat" + hộp thoại chat chung cho mọi người chơi đã đăng nhập.
   - Không dùng websocket / SDK: hỏi máy chủ định kỳ qua REST (4 giây khi đang mở chat, 30 giây khi đóng để đếm tin chưa đọc).
   - Nội dung tin nhắn chỉ đi vào DOM bằng textContent (h() tạo text node), không bao giờ là HTML.
   - Tên người gửi do máy chủ điền (lấy từ bảng xếp hạng), client không tự đặt được. Tin giữ tối đa 2 ngày.
   Chỉ hoạt động khi đã cấu hình Supabase và chạy migration 20261014_chat.sql; nếu máy chủ chưa có bảng chat thì nút tự ẩn. */
"use strict";
(function () {
  const cloud = TT.cloud;
  if (!cloud || !cloud.enabled || !cloud.chatList) return;
  const MAX_LEN = 200, KEEP = 150, POLL_OPEN = 4000, POLL_IDLE = 30000, SEND_GAP = 2000;
  const G = TT.Game.prototype;

  const byId = new Map();                       // id -> tin (đã khử trùng)
  let lastId = 0, loaded = false, unread = 0, unavailable = false, inflight = null, fab = null, badge = null, bgTimer = 0, win = null;

  const hhmm = t => { const d = new Date(t); return isNaN(d) ? "" : d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }); };
  const myId = () => { const u = cloud.user(); return u ? u.id : ""; };
  const missing = e => !!e && e.status === 404;                 // bảng / hàm chat chưa có trên máy chủ (chưa chạy migration)

  /** Lấy tin mới. Trả về các tin vừa thêm (cũ -> mới). Gộp các lần gọi chồng nhau thành một. */
  function sync() {
    if (unavailable || !cloud.user()) return Promise.resolve([]);
    if (inflight) return inflight;
    const first = !loaded;                                      // lần tải đầu (kể cả khi chat còn trống) không tính là tin chưa đọc
    inflight = cloud.chatList({ after: lastId }).then(rows => {
      const fresh = [];
      for (const r of rows) {
        if (!r || typeof r.id !== "number" || byId.has(r.id)) continue;
        byId.set(r.id, { id: r.id, user_id: String(r.user_id || ""), name: String(r.name || "Vô danh"), body: String(r.body || ""), t: r.created_at, admin: r.is_admin === true });
        fresh.push(byId.get(r.id));
        if (r.id > lastId) lastId = r.id;
      }
      while (byId.size > KEEP) byId.delete(byId.keys().next().value);
      if (!first && !win) unread += fresh.filter(m => m.user_id !== myId()).length;   // lần tải đầu không tính là chưa đọc
      loaded = true; paintBadge();
      return fresh;
    }).catch(e => { if (missing(e)) goUnavailable(); throw e; }).finally(() => { inflight = null; });
    return inflight;
  }
  function goUnavailable() {
    unavailable = true; clearInterval(bgTimer);
    if (fab) fab.remove();
    if (win) win.close();
  }

  /* ---------- nút nổi + đếm tin chưa đọc ---------- */
  function paintBadge() {
    if (!fab) return;
    badge.hidden = unread <= 0;
    badge.textContent = unread > 99 ? "99+" : String(unread);
    fab.setAttribute("aria-label", unread > 0 ? `Mở chat thế giới, ${unread} tin mới` : "Mở chat thế giới");
  }
  function mount() {
    if (unavailable || !cloud.user() || (fab && fab.isConnected)) return;
    badge = h("span", { class: "chat-badge", hidden: true });
    fab = h("button", { class: "chat-fab", type: "button", onclick: () => G.openChat.call(TT.game) },
      h("span", { "aria-hidden": "true" }, "💬 "), h("span", { class: "chat-fab-label" }, "Chat"), badge);
    document.body.append(fab);
    paintBadge();
    const bg = () => { if (!win && !document.hidden) sync().catch(() => { /* mất mạng: thử lại lần sau */ }); };
    clearInterval(bgTimer); bgTimer = setInterval(bg, POLL_IDLE); bg();
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden && fab && !unavailable) sync().catch(() => {}); });
  for (const name of ["showGame", "showCreate"]) {              // hiện nút khi đã vào game (hoặc màn tạo nhân vật); màn đăng nhập thì không có nút
    const orig = G[name];
    if (typeof orig !== "function") continue;
    G[name] = function () { const r = orig.apply(this, arguments); mount(); return r; };
  }

  /* ---------- hộp thoại chat ---------- */
  const errText = e => {
    const m = String((e && e.message) || "");
    if (m === "too_fast") return "Bạn gửi hơi nhanh, hãy chờ vài giây.";
    if (m === "empty") return "Hãy nhập nội dung tin nhắn.";
    if (m === "too_long") return `Tin nhắn quá dài (tối đa ${MAX_LEN} ký tự).`;
    if (missing(e)) return "Chat chưa được bật trên máy chủ.";
    if (e && (e.auth || e.status === 401 || m === "not_authenticated")) return "Phiên đăng nhập đã hết hạn, hãy tải lại trang.";
    return cloud.errorText(e);
  };

  G.openChat = function () {
    if (unavailable || (win && win.m.overlay.isConnected)) return;
    let timer = 0, sending = false, nextOk = 0, shown = 0;
    const m = TT.ui.modal("dlg-box chat-box", () => close(), { label: "Chat thế giới" });
    const list = h("div", { class: "chat-list", role: "log", "aria-live": "polite", "aria-relevant": "additions" });
    const note = h("div", { class: "chat-note small dim", role: "status" }, "Đang tải…");
    const input = h("input", { class: "chat-in", type: "text", maxlength: String(MAX_LEN), autocomplete: "off", enterkeyhint: "send", placeholder: "Nói gì đó với mọi người…", "aria-label": "Nội dung tin nhắn" });
    const count = h("span", { class: "chat-count small dim", "aria-hidden": "true" }, `0/${MAX_LEN}`);
    const sendBtn = TT.ui.btn("Gửi", () => {}, { cls: "gold" });
    sendBtn.type = "submit";
    const say = (text, bad) => { note.textContent = text || ""; note.classList.toggle("red-t", !!bad); };
    const close = () => { clearInterval(timer); win = null; m.close(); unread = 0; paintBadge(); };

    const paint = () => {                                       // chỉ thêm tin mới, không vẽ lại cả danh sách (không mất cuộn / bôi chọn)
      const stick = list.scrollHeight - list.scrollTop - list.clientHeight < 48 || shown === 0, me = myId(), add = [];
      for (const msg of byId.values()) if (msg.id > shown) add.push(h("div", { class: "chat-msg" + (msg.user_id === me ? " me" : "") + (msg.admin ? " admin" : "") },
        h("span", { class: "chat-time small dim" }, hhmm(msg.t)), " ", msg.admin ? h("span", { class: "chat-admin-tag", title: "Quản trị viên" }, "QTV") : "", h("span", { class: "chat-name" }, msg.name), h("span", { class: "chat-colon" }, ": "), h("span", { class: "chat-text" }, msg.body)));
      if (add.length) { list.append(...add); shown = Math.max(...[...byId.keys()]); }
      while (list.childElementCount > KEEP) list.firstElementChild.remove();
      if (!list.childElementCount) list.append(h("p", { class: "chat-empty dim center" }, "Chưa có ai nói gì. Hãy là người đầu tiên!"));
      else if (add.length) list.querySelector(".chat-empty")?.remove();
      if (stick) list.scrollTop = list.scrollHeight;
    };
    const poll = async () => {
      if (document.hidden) return;
      try { await sync(); say(""); paint(); } catch (e) { if (unavailable) return; say(e && e.net ? "Mất kết nối, đang thử lại…" : errText(e), true); }
    };
    const send = async e => {
      e.preventDefault();
      const text = input.value.replace(/\s+/g, " ").trim();
      if (!text || sending) return;
      if (Date.now() < nextOk) return say("Bạn gửi hơi nhanh, hãy chờ vài giây.", true);
      sending = true; sendBtn.disabled = true; say("");
      try { await cloud.chatSend(text); input.value = ""; count.textContent = `0/${MAX_LEN}`; nextOk = Date.now() + SEND_GAP; await sync().catch(() => {}); paint(); }
      catch (err) { say(errText(err), true); }
      finally { sending = false; sendBtn.disabled = false; input.focus(); }
    };
    input.addEventListener("input", () => { count.textContent = `${input.value.length}/${MAX_LEN}`; });
    m.box.append(
      h("h2", { class: "mtitle" }, "Chat thế giới"),
      h("div", { class: "dim small center" }, "Người chơi đã đăng nhập đều xem được. Tên hiển thị là đạo hiệu trên bảng xếp hạng. Tin giữ tối đa 2 ngày."),
      list, note,
      h("form", { class: "chat-form", novalidate: true, onsubmit: send }, input, count, sendBtn),
      h("div", { class: "row center" }, TT.ui.btn("Đóng", () => close(), { cls: "dimbtn sm" })));
    win = { m, close };
    unread = 0; paintBadge(); paint(); poll();
    timer = setInterval(poll, POLL_OPEN);
    input.focus();
  };
})();
