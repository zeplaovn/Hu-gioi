/* Nghề phụ (Linh điền 4x4, Vẽ phù; Luyện đan/Luyện khí sắp mở) và Vạn Bảo Các (mua Giấy Phù, bán sản phẩm).
   Chỉ hiển thị: thời gian chín, sâu, tỉ lệ hỏng, giới hạn ngày, giá đều do server tính và kiểm tra lại. */
import { errorText } from "../api.js";
import { num } from "../format.js";
import { createDialog } from "./dialog.js";
import { clear, h, icon } from "./dom.js";

const PLOTS_PER_ROW = 4;
const TIERS = ["Thường", "Thượng phẩm", "Cực phẩm"];

export function remainingText(ms) {
  if (ms <= 0) return "Đã chín";
  const s = Math.ceil(ms / 1000), hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
  return hh > 0 ? `${hh} giờ ${String(mm).padStart(2, "0")} phút` : mm > 0 ? `${mm} phút ${String(ss).padStart(2, "0")} giây` : `${ss} giây`;
}
const goodsOf = (state, id) => (state?.goods ?? []).filter((g) => g.item_id === id).reduce((a, g) => a + g.qty, 0);

/** Kho dữ liệu dùng chung cho hai hộp thoại: tải state, gửi thao tác, giữ lỗi. */
export function createCraftsStore(game) {
  const store = { state: null, busy: false, error: "", offset: 0, note: "", listeners: new Set(), gen: 0,
    subscribe(fn) { store.listeners.add(fn); return () => store.listeners.delete(fn); },
    emit() { for (const fn of [...store.listeners]) fn(); },
    now() { return Date.now() + store.offset; },
    set(next) { store.state = next; store.offset = Date.parse(next.now) - Date.now(); },
    async load() {
      const g = ++store.gen; store.busy = true; store.emit();
      try { const s = await game.api.crafts(); if (g === store.gen) { store.set(s); store.error = ""; } }
      catch (e) { if (g === store.gen) store.error = errorText(e); }
      finally { if (g === store.gen) { store.busy = false; store.emit(); } }
    },
    async act(body) {
      if (store.busy) return null;
      store.busy = true; store.error = ""; store.note = ""; store.emit();
      const before = store.state;
      try { const s = await game.api.craftsAction(body); store.set(s); store.busy = false; store.emit(); return { before, after: s }; }
      catch (e) { store.error = errorText(e); store.busy = false; store.emit(); return null; }
    },
  };
  return store;
}

const expBar = (c, label) => h("div", { class: "craft-exp" },
  h("span", null, `${label} · cấp ${c.level}`),
  h("div", { class: "bar", style: { borderColor: "#00e832" } }, h("div", { class: "bar-fill", style: { background: "#00e832", width: `${c.next_exp ? Math.min(100, (c.exp / c.next_exp) * 100) : 100}%` } }),
    h("span", { class: "bar-text" }, c.next_exp ? `${num(c.exp)} / ${num(c.next_exp)} exp` : `${num(c.exp)} exp · tối đa`)));

export function createCraftsDialog({ store }) {
  let tab = "farm", selected = 0, seed = "HERB-001", timer = 0;
  const dlg = createDialog({ title: "Nghề phụ", onclose: () => { clearInterval(timer); timer = 0; } });
  dlg.el.classList.add("craft-dialog");
  const btn = (text, fn, disabled = false, cls = "") => h("button", { type: "button", class: ["btn", "sm", cls], disabled: store.busy || disabled, onclick: fn }, text);

  function plotCell(p) {
    const left = p.ready_at ? Date.parse(p.ready_at) - store.now() : 0;
    const label = !p.unlocked ? "🔒" : p.state === "empty" ? "Trống" : p.state === "ready" ? "✔ Chín" : remainingText(left);
    return h("button", { type: "button", class: ["plot", `st-${p.unlocked ? p.state : "locked"}`, p.idx === selected && "on", p.pest && "pest"], "aria-pressed": String(p.idx === selected),
      "aria-label": `Ô ${p.idx + 1}: ${p.unlocked ? (p.crop_name ?? "trống") : "khóa"}`, onclick: () => { selected = p.idx; render(); } },
      h("span", { class: "plot-no" }, p.idx + 1), h("b", null, p.crop_name ?? ""), h("span", { class: "small" }, label),
      p.unlocked && p.state !== "empty" && h("span", { class: "plot-tags" }, "💧".repeat(p.waters), p.fertilized && "🌿", p.pest && "🐛"));
  }

  function plotPanel(s) {
    const p = s.plots[selected], f = s.farm;
    if (!p) return null;
    const act = (kind, extra = {}) => () => store.act({ kind, plot: p.idx, ...extra });
    if (!p.unlocked) {
      const u = p.unlock, cur = u?.cur === "tn" ? "Tiên Ngọc" : "Linh Thạch";
      const lowStage = u && s.stage_idx < u.stage;
      return h("div", { class: "plot-panel" }, h("h4", null, `Ô ${p.idx + 1} · đang khóa`),
        u ? h("p", { class: "small" }, `Mở bằng ${num(u.cost)} ${cur}. Cần cảnh giới số ${u.stage}${lowStage ? " (chưa đạt)" : ""}. Mở theo thứ tự.`) : h("p", { class: "small dim" }, "Ô này chưa mở bán."),
        btn(`Mở khóa · ${u ? num(u.cost) : "?"} ${u?.cur === "tn" ? "TN" : "LS"}`, act("unlock"), !u || lowStage, "gold"));
    }
    if (p.state === "empty") {
      const seeds = s.seeds;
      if (!seeds.find((x) => x.id === seed)?.ok) seed = seeds.find((x) => x.ok)?.id ?? seeds[0].id;
      const sel = h("select", { "aria-label": "Chọn hạt giống", onchange: (e) => { seed = e.target.value; } },
        seeds.map((x) => h("option", { value: x.id, disabled: !x.ok, selected: x.id === seed }, `${x.name} · ${x.grow_hours}h${x.ok ? "" : ` (cần cấp ${x.min_level})`}`)));
      return h("div", { class: "plot-panel" }, h("h4", null, `Ô ${p.idx + 1} · trống`), sel,
        h("div", { class: "social-actions" }, btn("🌱 Gieo hạt", () => store.act({ kind: "plant", plot: p.idx, id: seed }), false, "gold")));
    }
    const left = Date.parse(p.ready_at) - store.now();
    return h("div", { class: "plot-panel" }, h("h4", null, `Ô ${p.idx + 1} · ${p.crop_name}`),
      h("p", { class: "small" }, left > 0 ? `Còn ${remainingText(left)}. ` : "Đã chín. ", `Tưới ${p.waters}/${f.water_max}`, p.fertilized ? " · đã bón phân" : "", p.pest ? " · CÓ SÂU!" : ""),
      h("div", { class: "social-actions" },
        btn("💧 Tưới nước", act("water"), left <= 0 || p.waters >= f.water_max || (p.can_water_at && Date.parse(p.can_water_at) > store.now())),
        btn(`🌿 Bón phân · ${f.fertilize_cost_ls} LS`, act("fertilize"), left <= 0 || p.fertilized),
        btn("🐛 Bắt sâu", act("pest"), !p.pest, p.pest ? "danger" : ""),
        btn("🧺 Thu hoạch", act("harvest"), left > 0, "gold")),
      p.pest && h("p", { class: "small t-red" }, "Sâu đang ăn cây: không bắt thì sản lượng giảm."));
  }

  function farmTab(s) {
    const c = s.crafts.linh_dien;
    return [expBar(c, "Linh điền"),
      h("p", { class: "small dim" }, "Lưới 4×4: 2 ô đầu mở sẵn, 14 ô còn lại mở dần theo cảnh giới, mua bằng Linh Thạch rồi Tiên Ngọc. Cấp cao cho phẩm chất tốt hơn."),
      h("div", { class: "plot-grid", style: { gridTemplateColumns: `repeat(${PLOTS_PER_ROW}, 1fr)` } }, s.plots.map(plotCell)), plotPanel(s)];
  }

  function phuTab(s) {
    const c = s.crafts.ve_phu, left = c.limit - c.used_today;
    return [expBar(c, "Vẽ phù"),
      h("p", null, `Hôm nay: `, h("b", null, `${c.used_today}/${c.limit}`), ` lần · Giấy Phù: `, h("b", null, String(s.paper)), ` · Tỉ lệ vẽ hỏng: `, h("b", { class: "t-red" }, `${c.fail_pct}%`)),
      h("p", { class: "small dim" }, "Mỗi lần vẽ đều tích exp (hỏng ít hơn). Giới hạn lượt tăng theo cảnh giới; lên cấp thì tỉ lệ vẽ hỏng cao hơn. Reset 00:00 UTC (07:00 Việt Nam)."),
      h("div", { class: "social-actions" },
        btn("✍ Vẽ phù", async () => {
          const r = await store.act({ kind: "phu" });
          if (r) { const d = goodsOf(r.after, "PHU-001") - goodsOf(r.before, "PHU-001"); store.note = d > 0 ? "Vẽ thành công một Linh Phù." : "Vẽ hỏng, mất một tờ giấy (vẫn được exp)."; render(); }
        }, left <= 0 || s.paper < 1, "gold"),
        btn("Mua 5 Giấy Phù", () => store.act({ kind: "buy", id: "MAT-003", qty: 5 }))),
      left <= 0 && h("p", { class: "small t-red" }, "Hôm nay đã hết lượt vẽ phù."),
      store.note && h("p", { class: "notice", role: "status" }, store.note)];
  }

  const lockedCraft = (title, slots) => [h("h4", null, title),
    h("p", { class: "dim small" }, "Sắp mở. Bố cục dự kiến:"),
    h("div", { class: "slots" }, slots.map(([t, cls]) => h("div", { class: ["slot", cls] }, t))),
    h("p", { class: "small dim" }, "Kinh nghiệm nghề sẽ nâng cấp và phẩm chất thành phẩm, giống Linh điền và Vẽ phù.")];

  function render() {
    if (!dlg.isOpen) return;
    const s = store.state;
    const tabs = [["farm", "Linh điền"], ["dan", "Luyện đan"], ["khi", "Luyện khí"], ["phu", "Vẽ phù"]];
    clear(dlg.body, h("div", { class: "stack" },
      s && h("p", { class: "small center" }, h("span", { class: "t-cyan" }, `Linh thạch: ${num(s.wallet.ls)}`), " · ", h("span", { class: "t-gold" }, `Tiên ngọc: ${num(s.wallet.tn)}`)),
      h("div", { class: "seg", role: "tablist" }, tabs.map(([k, label]) => h("button", { type: "button", role: "tab", "aria-selected": String(tab === k), onclick: () => { tab = k; store.note = ""; render(); } }, label))),
      store.error && h("p", { class: "notice error", role: "alert" }, store.error),
      !s ? h("p", { class: "dim center" }, "Đang tải…")
        : tab === "farm" ? farmTab(s) : tab === "phu" ? phuTab(s)
        : tab === "dan" ? lockedCraft("Luyện đan", [["Nguyên liệu 1", ""], ["Nguyên liệu 2", ""], ["Nguyên liệu 3", ""], ["Vật phẩm tăng tỉ lệ đan phẩm cao", "boost"]])
        : lockedCraft("Luyện khí", [["Nguyên liệu 1", ""], ["Nguyên liệu 2", ""], ["Nguyên liệu 3", ""], ["Vật phẩm tăng tỉ lệ phẩm chất cao", "boost"]]),
      h("div", { class: "row center" }, btn("Làm mới", () => store.load()), h("button", { type: "button", class: "btn ghost sm", onclick: () => dlg.hide() }, "Đóng"))));
  }

  const unsub = store.subscribe(render);
  return {
    el: dlg.el,
    open() { dlg.show(); render(); void store.load(); clearInterval(timer); timer = setInterval(() => { if (tab === "farm" && !store.busy) render(); }, 1000); },
    hide: dlg.hide,
    destroy() { clearInterval(timer); unsub(); dlg.hide(); },
  };
}

export function createShopDialog({ store }) {
  const dlg = createDialog({ title: "Vạn Bảo Các" });
  dlg.el.classList.add("craft-dialog");
  const btn = (text, fn, disabled = false, cls = "") => h("button", { type: "button", class: ["btn", "sm", cls], disabled: store.busy || disabled, onclick: fn }, text);
  function render() {
    if (!dlg.isOpen) return;
    const s = store.state;
    clear(dlg.body, h("div", { class: "stack" },
      h("p", { class: "dim small center" }, "Mua nguyên liệu nghề phụ và bán sản phẩm lấy Linh Thạch. Giá do máy chủ quyết định; phẩm chất cao bán giá cao hơn."),
      s && h("p", { class: "small center t-cyan" }, `Linh thạch: ${num(s.wallet.ls)}`),
      store.error && h("p", { class: "notice error", role: "alert" }, store.error),
      !s ? h("p", { class: "dim center" }, "Đang tải…") : [
        h("h4", null, "Mua"),
        s.shop_buy.map((it) => h("div", { class: "sect-card shop-row" }, icon("scroll", "sect-icon"), h("div", null, h("strong", null, it.name), h("p", { class: "small dim" }, `${it.price} LS / cái`)),
          h("div", { class: "social-actions" }, [1, 5, 10].map((q) => btn(`×${q}`, () => store.act({ kind: "buy", id: it.id, qty: q }), s.wallet.ls < it.price * q))))),
        h("h4", null, "Bán"),
        s.goods.length === 0 ? h("p", { class: "small dim" }, "Kho trống. Thu hoạch linh thảo hoặc vẽ phù để có hàng bán.")
          : s.goods.map((g) => h("div", { class: "sect-card shop-row" }, icon("charm", "sect-icon"),
              h("div", null, h("strong", null, `${g.name} · ${g.tier_name ?? TIERS[g.tier]}`), h("p", { class: "small dim" }, `×${g.qty} · ${g.price} LS / cái`)),
              h("div", { class: "social-actions" }, btn("Bán 1", () => store.act({ kind: "sell", id: g.item_id, tier: g.tier, qty: 1 })), g.qty > 1 && btn(`Bán hết (${g.qty})`, () => store.act({ kind: "sell", id: g.item_id, tier: g.tier, qty: g.qty }), false, "gold"))))],
      h("div", { class: "row center" }, btn("Làm mới", () => store.load()), h("button", { type: "button", class: "btn ghost sm", onclick: () => dlg.hide() }, "Đóng"))));
  }
  const unsub = store.subscribe(render);
  return { el: dlg.el, open() { dlg.show(); render(); void store.load(); }, hide: dlg.hide, destroy() { unsub(); dlg.hide(); } };
}
