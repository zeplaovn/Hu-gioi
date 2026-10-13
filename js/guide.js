/* Gợi ý "việc nên làm tiếp" cho người chơi (đặc biệt người mới): một dòng gợi ý trên màn chính và một mục trong báo cáo khi quay lại.
   Chỉ đọc trạng thái nhân vật, không ghi gì vào save; việc ẩn gợi ý được nhớ riêng trên từng trình duyệt. */
"use strict";
(function () {
  if (!TT.Game) return;
  const G = TT.Game.prototype, OFF = "tu_tien_hint_off";
  const store = {
    get: () => { try { return localStorage.getItem(OFF) === "1"; } catch (e) { return false; } },
    set: v => { try { if (v) localStorage.setItem(OFF, "1"); else localStorage.removeItem(OFF); } catch (e) { /* bỏ qua */ } },
  };

  /** Danh sách gợi ý theo độ ưu tiên: [{ id, text, label, run }]. */
  /** Số giây thật có thể vắng mặt mà nhân vật chưa tọa hóa (quy đổi theo tỉ lệ bù thời gian vắng mặt). */
  TT.safeAway = p => {
    const I = TT.IDLE, months = Math.max(0, (12 - (p.months % 12)) % 12 + (p.lifespan - p.age - 1) * 12);
    const eff = Math.max(0, months * I.MONTH_TICKS - 1);
    const real = eff <= I.FULL_RATE_S ? eff : I.FULL_RATE_S + (eff - I.FULL_RATE_S) / I.OFFLINE_RATE;
    return eff > I.OFFLINE_CAP_S ? Infinity : Math.floor(real);
  };

  TT.advice = g => {
    const p = g && g.p, out = [];
    if (!p || g.dead) return out;
    const add = (id, text, label, run) => out.push({ id, text, label, run });
    const need = p.need_exp(), left = p.lifespan - p.age, S = p.secret, sx = p.sectx;
    if (p.exp >= need && p.hp < p.max_hp() * 0.5) add("hurt", "Tu vi đã đủ nhưng khí huyết còn thấp. Đột phá thất bại có thể gây Tẩu hỏa nhập ma; hãy Nghỉ ngơi hoặc dùng đan dược hồi phục trước.", "Nghỉ ngơi", () => g.act(g.actRest));
    if (p.exp >= need) add("break", `Tu vi đã đủ. Bấm Đột phá để lên ${p.tang === 9 ? "đại cảnh giới (thọ nguyên tăng thêm)" : "tầng " + (p.tang + 1)}.${p.breakChance(p.tang === 9) < 0.5 ? " Tỉ lệ còn thấp, có thể áp chế thêm hoặc dùng Phá Cảnh Đan." : ""}`, "Đột phá", () => g.act(g.actBreakthrough));
    if (left <= 40) add("life", `Thọ nguyên chỉ còn ${Math.max(0, left)} năm${Number.isFinite(TT.safeAway(p)) ? `: vắng mặt quá ${TT.fmtTime(TT.safeAway(p))} nhân vật sẽ tọa hóa` : ""}. Hãy đột phá đại cảnh giới hoặc mua Trường Thọ Quả ở cửa hàng.`, "Cửa hàng", () => g.openShop());
    const cheapest = Math.min(...Object.values(TT.SKILLS).filter(s => s.realm <= p.realm).map(s => s.cost));
    if (!p.skills.length) add("skill", p.stone >= cheapest ? "Bạn chưa có công pháp nào. Học Dưỡng Khí Quyết để tăng 20% tốc độ tu luyện." : `Bạn chưa có công pháp. Cần ${cheapest} linh thạch để học công pháp đầu tiên: dùng Luyện hóa linh thạch hoặc Lịch luyện để kiếm thêm.`, p.stone >= cheapest ? "Công pháp" : "Lịch luyện", p.stone >= cheapest ? () => g.openSkills() : () => g.act(g.actExplore));
    const ripe = (p.plots || []).filter(x => x && !x.wilt && x.age >= TT.RIPE).length;
    if (ripe) add("farm", `Linh điền có ${ripe} ô Linh Thảo đã chín. Thu hoạch sớm để không bị quá chín.`, "Linh điền", () => g.openFarm());
    if (S && !S.active && !(sx && sx.active) && TT.SECRETS.some(d => d.realm <= p.realm) && p.hp >= p.max_hp() * 0.5) add("secret", "Bí cảnh đang trống. Thám hiểm chạy cả khi bạn vắng mặt và cho tu vi, linh thạch, vật phẩm.", "Bí cảnh", () => g.openSecrets());
    if (!p.sect && p.realm >= 1) add("sect", "Bạn đã đủ cảnh giới để gia nhập tông môn: nhận bổng lộc, cộng tốc độ tu luyện và làm nhiệm vụ tông môn.", "Tông môn", () => g.openSect());
    else if (p.sect && sx && !sx.active) add("mission", "Chưa có nhiệm vụ tông môn nào đang chạy. Nhận một nhiệm vụ để tích điểm cống hiến.", "Tông môn", () => g.openSect());
    if (!out.length) add("idle", `Cứ để nhân vật nhập định: còn khoảng ${TT.fmtTime(p.monthsToFull() * TT.IDLE.MONTH_TICKS)} nữa tu vi mới viên mãn. Trong lúc chờ có thể làm Linh điền, nghề phụ hoặc Kỳ ngộ.`, null, null);
    return out;
  };

  /* ---------- dòng gợi ý trên màn chính ---------- */
  const build = G.buildIdlePanel;
  G.buildIdlePanel = function () {
    const panel = build.apply(this, arguments), U = this.U;
    U.hintText = h("span", { class: "hint-text small" });
    U.hintGo = TT.ui.btn("Làm ngay", () => { const a = U.hintCur; if (a && a.run) a.run(); }, { cls: "gold sm" });
    const hide = TT.ui.btn("✕", () => { store.set(true); this.hintRefresh(); TT.ui.toast && TT.ui.toast("Đã ẩn gợi ý. Hộp thoại Chỉ số nhân vật có nút bật lại.", "info", 4000); }, { cls: "dimbtn sm", title: "Ẩn gợi ý" });
    hide.setAttribute("aria-label", "Ẩn gợi ý");
    U.hintBox = h("div", { class: "hint-box", role: "note" }, h("span", { class: "hint-mark", "aria-hidden": "true" }, "💡"), U.hintText, U.hintGo, hide);
    panel.append(U.hintBox);
    return panel;
  };
  G.hintRefresh = function () {
    const U = this.U;
    if (!U || !U.hintBox) return;
    const list = this.p && !this.dead && !store.get() ? TT.advice(this) : [], top = list[0] || null;
    U.hintBox.hidden = !top;
    if (!top) { U.hintCur = null; return; }
    U.hintCur = top;
    if (U.hintText.textContent !== top.text) U.hintText.textContent = top.text;
    U.hintGo.hidden = !top.run;
    const lab = U.hintGo.querySelector(".btn-label") || U.hintGo.querySelector("span");
    if (lab && top.label && lab.textContent !== top.label) lab.textContent = top.label;
  };
  const refresh = G.refresh;
  G.refresh = function () { refresh.apply(this, arguments); this.hintRefresh(); };
  G.hintToggle = function () { store.set(!store.get()); this.hintRefresh(); };
  TT.hintOff = () => store.get();
})();
