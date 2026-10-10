/* Tiến trình xuyên kiếp: Thiên Mệnh (nâng cấp vĩnh viễn), Thành tựu, Bia Thiên Đạo (lịch sử các kiếp),
   và quản lý dữ liệu (xuất / nhập / xóa save). Lưu riêng ở khóa tu_tien_meta_v1 nên không đụng tới save cũ. */
"use strict";
(function () {
  const KEY = "tu_tien_meta_v1", SAVE_KEY = "tu_tien_save_v2", FLAG = "tu_tien_sec_v1", MAX_HISTORY = 20;

  /* ---------- Thiên Mệnh: nâng cấp vĩnh viễn, mua bằng điểm nhận được khi chết / phi thăng ---------- */
  const UP = {
    pts: { name: "Thiên Tư", icon: "clover", cost: [3, 5, 8, 12, 18], desc: "+1 điểm phân bổ chỉ số khi tạo nhân vật mỗi cấp." },
    stone: { name: "Túi Càn Khôn", icon: "crystal", cost: [2, 3, 4, 6, 8], desc: "+20 linh thạch khởi đầu mỗi cấp." },
    life: { name: "Trường Sinh", icon: "peach", cost: [3, 4, 6, 8, 12], desc: "+5 năm thọ nguyên khởi đầu mỗi cấp." },
    exp: { name: "Đạo Tâm", icon: "orb_blue", cost: [4, 6, 9, 13, 18], desc: "+3% tốc độ tu luyện vĩnh viễn mỗi cấp." },
    luck: { name: "Thiên Vận", icon: "orb_gold", cost: [5, 9, 14], desc: "+1 Vận Khí khởi đầu mỗi cấp." },
  };

  /* ---------- Thành tựu ---------- */
  const RN = ["", "Luyện Khí", "Trúc Cơ", "Kim Đan", "Nguyên Anh", "Hóa Thần", "Luyện Hư", "Đại Thừa", "Độ Kiếp"];
  const ACH = [];
  const add = (id, name, desc, pts, icon, ok) => ACH.push({ id, name, desc, pts, icon, ok });
  for (let r = 1; r <= 8; r++) add("realm" + r, `Đạt cảnh giới ${RN[r]}`, `Đột phá lên cảnh giới ${RN[r]}.`, r + 1, "orb_gold", p => p.realm >= r);
  add("ascend", "Phi thăng Tiên Giới", "Vượt qua thiên kiếp cuối cùng, đại đạo viên mãn.", 25, "orb_gold", () => false);
  add("kill10", "Thợ săn yêu thú", "Đánh bại 10 yêu thú trong một kiếp.", 1, "sword", p => p.track.kills >= 10);
  add("kill50", "Sát tinh", "Đánh bại 50 yêu thú trong một kiếp.", 3, "sword", p => p.track.kills >= 50);
  add("kill200", "Huyết Ma", "Đánh bại 200 yêu thú trong một kiếp.", 6, "sword", p => p.track.kills >= 200);
  add("explore30", "Người lữ hành", "Lịch luyện 30 lần trong một kiếp.", 1, "clover", p => p.track.explores >= 30);
  add("explore150", "Du hành giả", "Lịch luyện 150 lần trong một kiếp.", 3, "clover", p => p.track.explores >= 150);
  add("skills", "Học giả Tàng Kinh Các", "Học đủ cả 5 công pháp.", 3, "scroll", p => p.skills.length >= Object.keys(TT.SKILLS).length);
  add("sect", "Có chốn nương thân", "Gia nhập một tông môn.", 1, "bagua", p => !!p.sect);
  add("mission10", "Đệ tử chăm chỉ", "Hoàn thành 10 nhiệm vụ tông môn.", 2, "bagua", p => p.track.missions >= 10);
  add("rich", "Phú ông", "Sở hữu 1.000 linh thạch cùng lúc.", 2, "crystal", p => p.stone >= 1000);
  add("trader", "Thương nhân", "Bán vật phẩm thu về tổng 300 linh thạch.", 2, "crystal", p => p.track.sold >= 300);
  add("herb10", "Nông phu tu tiên", "Thu hoạch 10 Linh Thảo.", 1, "ginseng", p => p.track.herbs >= 10);
  add("craft1", "Luyện đan sư tập sự", "Chế tạo thành công 1 đan dược hoặc phù lục.", 1, "orb_green", p => p.track.crafted >= 1);
  add("craft20", "Đại sư chế tác", "Chế tạo thành công 20 đan dược / phù lục.", 3, "orb_green", p => p.track.crafted >= 20);
  add("gear1", "Thợ rèn pháp khí", "Rèn được một món pháp khí.", 1, "sword", p => Object.keys(p.gear).length >= 1);
  add("gear3", "Võ trang đầy đủ", "Trang bị đủ cả 3 loại pháp khí.", 3, "charm", p => Object.keys(p.gear).length >= 3);
  add("trib1", "Vượt Thiên Kiếp", "Sống sót qua một lần Thiên Kiếp.", 3, "orb_blue", p => p.track.trib >= 1);
  add("trib4", "Lôi Kiếp Bất Tử", "Sống sót qua 4 lần Thiên Kiếp trong một kiếp.", 8, "orb_blue", p => p.track.trib >= 4);
  add("fail3", "Thất bại là mẹ thành công", "Đột phá thất bại 3 lần trong một kiếp.", 1, "brain", p => p.track.fails >= 3);
  add("age100", "Lão tiên", "Sống tới 100 tuổi.", 3, "peach", p => p.age >= 100);
  add("lives5", "Luân hồi chuyển thế", "Trải qua 5 kiếp.", 3, "bagua", (p, M) => M.totals.lives >= 5);

  /* ---------- trạng thái ---------- */
  const fresh = () => ({
    v: 1, legacy: 0, earned: 0, up: { pts: 0, stone: 0, life: 0, exp: 0, luck: 0 },
    history: [], ach: {}, totals: { lives: 0, wins: 0, kills: 0 }, best: 0,
  });
  const num = (v, d = 0) => (Number.isFinite(+v) ? Math.max(0, Math.trunc(+v)) : d);

  /** Làm sạch dữ liệu đọc từ localStorage / file nhập vào. */
  const sanitize = raw => {
    const m = fresh();
    if (!raw || typeof raw !== "object") return m;
    m.legacy = num(raw.legacy); m.earned = num(raw.earned); m.best = num(raw.best);
    for (const k of Object.keys(UP)) m.up[k] = Math.min(UP[k].cost.length, num(raw.up?.[k]));
    for (const k of Object.keys(m.totals)) m.totals[k] = num(raw.totals?.[k]);
    if (raw.ach && typeof raw.ach === "object") for (const a of ACH) if (raw.ach[a.id]) m.ach[a.id] = num(raw.ach[a.id], 1);
    if (Array.isArray(raw.history)) {
      m.history = raw.history.slice(0, MAX_HISTORY).filter(x => x && typeof x === "object").map(x => ({
        n: num(x.n), race: String(x.race ?? "").slice(0, 20), gender: String(x.gender ?? "").slice(0, 8),
        realm: String(x.realm ?? "").slice(0, 40), age: num(x.age), end: ["win", "death", "abandon"].includes(x.end) ? x.end : "death",
        cause: String(x.cause ?? "").slice(0, 120), pts: num(x.pts), ts: num(x.ts),
      }));
    }
    return m;
  };

  /** Kiểm tra tính nhất quán: điểm đã tiêu phải khớp đúng giá các nâng cấp, tổng điểm không vượt mức có thể kiếm được. */
  const consistent = m => {
    let spent = 0;
    for (const k of Object.keys(UP)) for (let i = 0; i < m.up[k]; i++) spent += UP[k].cost[i];
    const achPts = ACH.reduce((n, a) => n + (m.ach[a.id] ? a.pts : 0), 0);
    const allAch = ACH.reduce((n, a) => n + a.pts, 0);
    return m.earned - m.legacy === spent && m.earned >= achPts && m.earned <= allAch + m.totals.lives * 80;
  };
  const plain = m => ({ v: 1, legacy: m.legacy, earned: m.earned, up: m.up, history: m.history, ach: m.ach, totals: m.totals, best: m.best });

  let M = fresh();
  {
    const r = TT.sec.read(KEY, "meta");
    if (r?.bad) TT.sec.error = "Dữ liệu Thiên Mệnh bị chỉnh sửa nên đã được đặt lại.";
    else if (r?.obj) {
      const m = sanitize(r.obj);
      if (consistent(m)) M = m; else TT.sec.error = "Dữ liệu Thiên Mệnh không hợp lệ nên đã được đặt lại.";
    }
  }
  TT.meta = M;
  const save = () => TT.sec.write(KEY, "meta", plain(M));

  M.save = save;
  M.UP = UP; M.ACH = ACH;
  M.bonus = k => (k === "exp" ? M.up.exp * 0.03 : M.up[k] || 0);
  M.upCost = k => UP[k].cost[M.up[k]];            // undefined nếu đã tối đa
  M.buy = k => {
    const c = M.upCost(k);
    if (c === undefined || M.legacy < c) return false;
    M.legacy -= c; M.up[k]++; save(); return true;
  };

  const unlock = (g, a) => {
    if (M.ach[a.id]) return;
    M.ach[a.id] = Date.now() || 1; M.legacy += a.pts; M.earned += a.pts; save();
    g?.log(`★ Thành tựu mở khóa: ${a.name}  (+${a.pts} điểm Thiên Mệnh)`, "gold");
    g?.scene?.floatText("Thành tựu: " + a.name, TT.C.GOLD, 0);
  };

  /** Kiểm tra thành tựu (gọi mỗi lần giao diện làm mới). */
  M.check = g => {
    const p = g.p;
    if (!p || !p.track) return;
    for (const a of ACH) if (!M.ach[a.id] && a.ok(p, M)) unlock(g, a);
  };

  /** Kết thúc một kiếp: kind = "win" | "death" | "abandon". Trả về số điểm Thiên Mệnh nhận được. */
  M.endLife = (g, kind, cause = "") => {
    const p = g.p;
    if (!p || p._ended) return 0;
    p._ended = true;
    let pts = Math.floor(p.level / 6) + p.realm;
    if (kind === "death") pts = Math.max(1, pts);
    else if (kind === "abandon") pts = Math.floor(pts / 2);   // bỏ dở giữa chừng chỉ được nửa điểm
    else pts += 20;
    M.legacy += pts; M.earned += pts;
    M.totals.lives++; M.totals.kills += p.track?.kills || 0;
    if (kind === "win") M.totals.wins++;
    M.best = Math.max(M.best, p.level);
    M.history.unshift({
      n: g.count, race: p.race, gender: p.gender, realm: p.realm_name(), age: p.age, end: kind,
      cause: kind === "win" ? "Phi thăng Tiên Giới" : kind === "abandon" ? "Trùng sinh giữa chừng" : cause, pts, ts: Date.now(),
    });
    M.history.length = Math.min(M.history.length, MAX_HISTORY);
    save();
    if (kind === "win") unlock(g, ACH.find(a => a.id === "ascend"));
    if (pts > 0 && kind !== "abandon") g.log(`Thiên Mệnh: +${pts} điểm (hiện có ${M.legacy}). Mở "Thiên Đạo Các" để nâng cấp cho kiếp sau.`, "cyan");
    return pts;
  };

  /* ---------- xuất / nhập / xóa dữ liệu (có chữ ký, nhập vào được kiểm tra lại toàn bộ) ---------- */
  M.exportText = () => {
    const cur = TT.readSave();
    const data = JSON.stringify({ save: cur.player ? { count: cur.count, player: cur.player } : null, meta: plain(M) });
    return JSON.stringify({ game: "thien-van-dai-luc", v: 2, data, sig: TT.sec.sign("export", data) });
  };
  M.importText = text => {
    let env, d;
    try { env = JSON.parse(text); } catch (e) { return "Nội dung không phải JSON hợp lệ."; }
    if (!env || env.game !== "thien-van-dai-luc" || typeof env.data !== "string" || typeof env.sig !== "string") return "Đây không phải dữ liệu xuất từ game này.";
    if (TT.sec.sign("export", env.data) !== env.sig) return "Chữ ký không khớp: dữ liệu đã bị chỉnh sửa hoặc hỏng.";
    try { d = JSON.parse(env.data); } catch (e) { return "Dữ liệu bên trong bị hỏng."; }
    const meta = sanitize(d?.meta);
    if (!consistent(meta)) return "Dữ liệu Thiên Mệnh không hợp lệ.";
    let save = null;
    if (d.save != null) {
      const p = TT.sec.cleanPlayer(d.save.player);
      if (!p) return "Save nhân vật bị từ chối: " + TT.sec.error;
      save = { count: Math.max(1, Math.trunc(+d.save.count) || 1), player: p };
    }
    if (save) TT.sec.write(SAVE_KEY, "save", save);
    TT.sec.write(KEY, "meta", plain(meta));
    return "";
  };
  M.wipe = () => { try { [SAVE_KEY, KEY, FLAG].forEach(k => localStorage.removeItem(k)); } catch (e) { /* bỏ qua */ } };

  /* ================= GIAO DIỆN: THIÊN ĐẠO CÁC ================= */
  const G = TT.Game.prototype;
  const ico = name => { const i = h("img", { class: "row-ico", src: TT.A.icon(name, 40), alt: "" }); i.addEventListener("error", () => { i.style.visibility = "hidden"; }); return i; };
  const fmtDate = ts => { try { return new Date(ts).toLocaleDateString("vi-VN"); } catch (e) { return ""; } };
  const row = (icon, name, desc, extra, btn) => h("div", { class: "row-item panel" }, icon ? ico(icon) : null,
    h("div", { class: "info" }, h("div", { class: "bold" }, name), h("div", { class: "dim small" }, desc), extra || null),
    btn ? h("div", { class: "row-btns" }, btn) : null);

  const download = (name, text) => {
    const a = h("a", { href: URL.createObjectURL(new Blob([text], { type: "application/json" })), download: name });
    document.body.append(a); a.click(); a.remove();
  };
  const copyText = async text => {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const t = h("textarea", { style: { position: "fixed", opacity: 0 } }); t.value = text;
      document.body.append(t); t.select();
      let ok = false; try { ok = document.execCommand("copy"); } catch (e2) { /* bỏ qua */ }
      t.remove(); return ok;
    }
  };

  G.openHub = function (tab = "up") {
    if (this.hub) this.hub.close();
    const m = TT.ui.modal("dlg-box hub-box", () => { m.close(); this.hub = null; });
    this.hub = m;
    const tabs = [["up", "Thiên Mệnh"], ["ach", "Thành tựu"], ["hist", "Kiếp trước"], ["data", "Dữ liệu"]];
    const render = (t, note = "") => {
      const body = h("div", { class: "rows" });
      let head = "";
      if (t === "up") {
        head = `Điểm Thiên Mệnh: ${M.legacy}   (đã kiếm tổng cộng ${M.earned})`;
        body.append(h("div", { class: "dim small hub-note" }, "Nhận điểm khi nhân vật chết hoặc phi thăng (cảnh giới càng cao càng nhiều), cùng phần thưởng thành tựu. Nâng cấp có hiệu lực vĩnh viễn cho mọi kiếp sau."));
        for (const [k, u] of Object.entries(UP)) {
          const lv = M.up[k], c = M.upCost(k);
          const b = TT.ui.btn(c === undefined ? "Tối đa" : "Nâng", () => {
            if (!M.buy(k)) return;
            if (k === "pts" && this.lblPoints?.isConnected) { this.points++; this.refreshPoints(); }   // đang ở màn tạo nhân vật
            render("up");
          }, { cls: "gold sm", disabled: c === undefined || M.legacy < c });
          body.append(row(u.icon, `${u.name}  [${lv}/${u.cost.length}]`, u.desc, h("div", { class: "gold small" }, c === undefined ? "Đã đạt cấp tối đa" : `Giá: ${c} điểm`), b));
        }
      } else if (t === "ach") {
        const n = ACH.filter(a => M.ach[a.id]).length;
        head = `Thành tựu: ${n} / ${ACH.length}`;
        const sorted = [...ACH].sort((a, b) => (M.ach[b.id] ? 1 : 0) - (M.ach[a.id] ? 1 : 0));
        for (const a of sorted) {
          const got = !!M.ach[a.id];
          body.append(row(a.icon, (got ? "✔ " : "") + a.name, a.desc,
            h("div", { class: got ? "green small" : "gold small" }, got ? `Đã đạt ${fmtDate(M.ach[a.id])}` : `Thưởng: +${a.pts} điểm Thiên Mệnh`)));
        }
      } else if (t === "hist") {
        head = `Đã trải qua ${M.totals.lives} kiếp · Phi thăng ${M.totals.wins} lần · Cảnh giới cao nhất: ${bestRealm()}`;
        if (!M.history.length) body.append(h("div", { class: "dim center hub-note" }, "Chưa có kiếp nào kết thúc. Bia Thiên Đạo sẽ ghi lại tại đây."));
        for (const x of M.history) {
          body.append(row(x.end === "win" ? "orb_gold" : "bagua",
            `Kiếp ${x.n}: ${x.gender} ${x.race} - ${x.realm}`, `Thọ ${x.age} tuổi. ${x.cause}`,
            h("div", { class: "cyan small" }, `${fmtDate(x.ts)}  ·  +${x.pts} Thiên Mệnh`)));
        }
      } else {
        head = "Quản lý dữ liệu";
        const ta = h("textarea", { class: "data-ta", rows: 4, placeholder: "Dán dữ liệu đã xuất vào đây rồi bấm Nhập…" });
        const msg = h("div", { class: "small center hub-note" }, note);
        body.append(
          h("div", { class: "dim small hub-note" }, "Save lưu trong trình duyệt này. Hãy xuất ra file để sao lưu hoặc chuyển sang thiết bị khác."),
          h("div", { class: "row center" },
            TT.ui.btn("Sao chép dữ liệu", async () => { msg.textContent = (await copyText(M.exportText())) ? "Đã sao chép vào clipboard." : "Không sao chép được, hãy dùng nút Tải file."; msg.className = "small center hub-note green"; }, { cls: "cyan sm" }),
            TT.ui.btn("Tải file .json", () => { download("thien-van-dai-luc-save.json", M.exportText()); }, { cls: "cyan sm" })),
          ta,
          h("div", { class: "row center" },
            TT.ui.btn("Nhập dữ liệu", () => {
              const err = M.importText(ta.value.trim());
              if (err) { msg.textContent = err; msg.className = "small center hub-note red-t"; return; }
              if (confirm("Đã nhập xong. Tải lại trang để áp dụng?")) location.reload();
            }, { cls: "gold sm" }),
            TT.ui.btn("Xóa toàn bộ dữ liệu", () => {
              if (confirm("XÓA TOÀN BỘ save, Thiên Mệnh và thành tựu? Không thể hoàn tác!")) { M.wipe(); location.reload(); }
            }, { cls: "red sm" })),
          msg);
      }
      m.box.replaceChildren(
        h("h2", { class: "mtitle" }, "Thiên Đạo Các"),
        h("div", { class: "hub-tabs" }, tabs.map(([k, label]) => h("button", { class: "hub-tab" + (k === t ? " on" : ""), onclick: () => render(k) }, label))),
        h("div", { class: "cyan center pw" }, head), body,
        h("div", { class: "row center" }, TT.ui.btn("Đóng", () => { m.close(); this.hub = null; }, { cls: "dimbtn sm" })));
    };
    render(tab);
  };

  const bestRealm = () => {
    if (!M.best) return "chưa có";
    const r = Math.floor((M.best - 1) / 9), t = (M.best - 1) % 9 + 1;
    return `${TT.REALMS[r]} tầng ${t}`;
  };

  /* ---- gắn vào màn tạo nhân vật / màn chơi chính (bọc hàm gốc, không sửa screens.js) ---- */
  const showCreate = G.showCreate;
  G.showCreate = function () {
    showCreate.call(this);
    const extra = M.bonus("pts");
    if (extra) { this.points += extra; this.refreshPoints(); }
    const box = document.querySelector(".create-right .col.center");
    if (box) box.insertBefore(TT.ui.btn(`Thiên Đạo Các  (Thiên Mệnh: ${M.legacy})`, () => this.openHub(), { cls: "wide cyan", icon: TT.A.icon("bagua", 22) }), box.lastElementChild);
  };

  const showGame = G.showGame;
  G.showGame = function () {
    showGame.call(this);
    const right = document.querySelector(".col-right");
    const saveBtn = right && [...right.querySelectorAll("button")].find(b => b.textContent.includes("Lưu game"));
    if (right && saveBtn) right.insertBefore(TT.ui.btn("Thiên Đạo Các", () => this.openHub(), { cls: "cyan act", icon: TT.A.icon("bagua", 22) }), saveBtn);
  };
})();
