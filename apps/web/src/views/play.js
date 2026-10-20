/* Màn Tu luyện theo bố cục game gốc: cột trái (nhân vật) · giữa (cảnh, khung nhập định, nhật ký) · phải (menu hành động).
   Chỉ hiển thị; mọi quyết định do server. Mục backend v2 chưa có hiện "Sắp mở" (xem ui/menu.js). */
import { STAGES, STAT_KEYS, STAT_LABEL } from "@hu-gioi/game-core";
import { assetBase } from "../config.js";
import { causeLabel, clamp01, num, pct } from "../format.js";
import { SEASON_NAME, idleStatus, lifespanLeft, nextHint, progressOf, seasonOf } from "../shell.js";
import { createBar } from "../ui/bar.js";
import { createDialog } from "../ui/dialog.js";
import { clear, h, icon } from "../ui/dom.js";
import { createMenu } from "../ui/menu.js";
import { createScene } from "../ui/scene.js";

const WORLD = {
  "Hạ Giới": { id: "ha_gioi", color: "#7fffa0" },
  "Linh Giới": { id: "linh_gioi", color: "#7fdcff" },
  "Tiên Giới": { id: "tien_gioi", color: "#ffe27a" },
};
const ICON = { TuongMao: "portrait", PhucDuyen: "clover", CanCot: "sword", NgoTinh: "brain", VanKhi: "charm" };
const dec = (x) => x.toFixed(3).replace(".", ",");
const isTyping = (t) => t instanceof HTMLElement && (/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName) || t.isContentEditable);

export function createPlayView({ game }) {
  const errBox = h("p", { class: "notice error", role: "alert", hidden: true, style: { marginBottom: "12px" } });
  const stage = h("div");
  const waitP = h("p", { class: "dim" }, "Đang đọc thiên cơ…");
  let understood = false;
  let bagOpen = false;
  const dismissed = new Set();                      // gợi ý đã tắt trong phiên này

  const confirmDlg = createDialog({ title: "Xác nhận đại đột phá", onclose: () => { if (game.prepared) game.cancelPrepare(); } });
  const resultDlg = createDialog({ title: "", onclose: () => { if (game.result) game.dismissResult(); } });
  const bagDlg = createDialog({ title: "Túi đồ", onclose: () => { bagOpen = false; } });
  const el = h("div", null, errBox, stage, confirmDlg.el, resultDlg.el, bagDlg.el);

  let mode = null, ui = null, scene = null, menu = null;

  /* ---------- phím tắt: D = đại đột phá (chỉ khi server báo sẵn sàng) ---------- */
  function onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey || e.key.toLowerCase() !== "d") return;
    if (mode !== "alive" || isTyping(document.activeElement) || document.querySelector("dialog[open]")) return;
    const life = game.state?.life;
    if (!life || !life.ready_for_major || life.status !== "alive" || game.busy) return;
    e.preventDefault();
    void game.prepare();
  }
  window.addEventListener("keydown", onKey);

  /* ---------- chưa có kiếp: màn "nhập thế" (bố cục như màn tạo nhân vật của bản gốc) ---------- */
  function buildNone() {
    const startBtn = h("button", { class: "btn gold wide go", onclick: () => game.startLife() }, icon("orb_gold"), h("span", { class: "btn-label" }, "Nhập thế"));
    const lives = h("h2", { class: "center" });
    const tm = h("p", { class: "dim small center" });
    clear(stage,
      h("div", { class: "create-screen" },
        h("div", null,
          h("div", { class: "scene-wrap" }, h("img", { class: "banner", src: `${assetBase()}/parallax/title.png`, alt: "Thiên Vân Đại Lục" })),
          lives,
          h("p", { class: "story" }, "Sau Thiên Biến, toàn bộ nhân loại bị dịch chuyển khỏi Trái Đất tới Thiên Vân Đại Lục. Ngươi bắt đầu một kiếp tu sĩ: sống sót, tu luyện và đi xuyên ba đại giới — Hạ Giới, Linh Giới, Tiên Giới — trong cùng một kiếp."),
          h("p", { class: "dim small story" }, "Tu vi tự tăng theo thời gian thật, kể cả khi ngươi đóng game. Tầng 1–8 không có nguy cơ tử vong; tới tầng 9 game dừng chờ ngươi xác nhận đại đột phá.")),
        h("div", null,
          h("div", { class: "panel info-box" }, h("b", null, "Luật của kiếp"),
            h("p", { class: "small" }, "Kiếp chỉ kết thúc khi tọa hóa, đại đột phá thất bại hoặc chết trong nội dung sinh tử. Chết thật là mất toàn bộ tài sản của kiếp; Điểm Thiên Mệnh và chỉ số vĩnh viễn được giữ lại.")),
          h("p", { class: "small dim" }, "Nhân vật khởi đầu ở Hạ Giới với tay trắng. Việc chọn đạo hiệu, chủng tộc và linh căn chưa mở trong bản v2."),
          startBtn, tm)));
    ui = { startBtn, lives, tm };
  }

  /* ---------- đang sống ---------- */
  function buildAlive() {
    scene = createScene({ world: "ha_gioi", season: 0 });
    const realm = h("div", { class: "realm" });
    const pname = h("div", { class: "pname" });
    const sub = h("div", { class: "dim" });
    const expBar = createBar({ label: "Tu vi", tone: "jade" });
    const ageBar = createBar({ label: "Thọ nguyên", tone: "gold" });

    const statBars = {};
    const statRows = STAT_KEYS.map((k) => {
      statBars[k] = createBar({ label: STAT_LABEL[k], tone: "jade", showLabel: false });
      return h("div", { class: "mini-stat" }, h("img", { src: `${assetBase()}/icons/${ICON[k]}_22.png`, alt: "" }), h("span", null, STAT_LABEL[k]), statBars[k].el);
    });
    const fold = h("details", { class: "stat-fold", open: !matchMedia("(max-width: 760px)").matches },
      h("summary", null, "Chỉ số vĩnh viễn (Thiên Mệnh)"), statRows);

    const kv = {};
    const kvRow = (key, label, cls) => [h("dt", null, label), (kv[key] = h("dd", { class: ["num", cls] }))];
    const dl = h("dl", { class: "kv small" },
      kvRow("speed", "Tốc độ tu luyện"), kvRow("risk", "Hệ số rủi ro"), kvRow("tm", "Thiên Mệnh kiếp này", "t-gold"),
      kvRow("ls", "Linh Thạch"), kvRow("lt", "Linh Tinh"), kvRow("tn", "Tiên Ngọc"));

    /* khung nhập định */
    const idleState = h("span", { class: "bold" });
    const idleRate = h("span", { class: "dim small" });
    const stageBar = createBar({ label: "", tone: "cyan", showLabel: false });
    const idleNote = h("div", { class: "dim small" });
    const hintText = h("span", { class: "hint-text" });
    const hintCta = h("span", { class: "hint-cta" });
    const hintClose = h("button", { type: "button", class: "btn ghost sm hint-x", "aria-label": "Tắt gợi ý", title: "Tắt gợi ý" }, "✕");
    const hintBox = h("div", { class: "hint-box", role: "status", hidden: true }, h("span", { "aria-hidden": "true" }, "💡"), hintText, hintCta, hintClose);
    const idlePanel = h("div", { class: "panel idle-panel" }, h("div", { class: "idle-row" }, idleState, h("span", { class: "spacer" }), idleRate), stageBar.el, idleNote, hintBox);

    const clearedNote = h("p", { class: "notice", role: "status", hidden: true, style: { marginTop: "10px" } },
      "Ngươi đã hoàn tất tuyến chính và đứng tại Đài Quy Hương. Thiên Mệnh đã được ghi vào Bia. Kết thúc Quy Phàm và các nhánh hậu truyện chưa mở trong phiên bản này.");

    const state = { lastLogId: 0, follow: true };
    const jumpBtn = h("button", { class: "log-jump", type: "button", hidden: true, onclick: () => { state.follow = true; jumpBtn.hidden = true; logEl.scrollTop = logEl.scrollHeight; } }, "↓ Tin mới");
    const logEl = h("ol", {
      class: "log", "aria-live": "polite", "aria-label": "Nhật ký tu luyện", tabindex: "0",
      onscroll: () => { state.follow = logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight < 40; jumpBtn.hidden = state.follow; },
    });

    menu = createMenu({ game, onBag: () => { bagOpen = true; drawBag(); } });

    clear(stage,
      h("div", { class: "main" },
        h("aside", { class: "col-left" }, realm, pname, sub, expBar.el, ageBar.el, fold, dl),
        h("div", { class: "col-center" }, scene.el, clearedNote, idlePanel, h("div", { class: "log-wrap" }, logEl, jumpBtn)),
        menu.el),
      menu.dock);

    ui = { realm, pname, sub, expBar, ageBar, statBars, kv, clearedNote, logEl, jumpBtn, state,
      idleState, idleRate, stageBar, idleNote, hintBox, hintText, hintCta, hintClose, hintId: null };
  }

  function syncLog() {
    const { logEl, jumpBtn, state } = ui;
    const L = game.log;
    if (L.length === 0 && state.lastLogId !== 0) { logEl.replaceChildren(); state.lastLogId = 0; return; }
    let added = false;
    for (const l of L) {
      if (l.id > state.lastLogId) { logEl.append(h("li", { class: `t-${l.tag || "plain"}` }, l.text)); state.lastLogId = l.id; added = true; }
    }
    while (logEl.childElementCount > 200) logEl.firstElementChild.remove();
    if (added && state.follow) logEl.scrollTop = logEl.scrollHeight;
    jumpBtn.hidden = state.follow;
  }

  function drawHint(s) {
    const hint = nextHint(s);
    const show = !!hint && !dismissed.has(hint.id);
    ui.hintBox.hidden = !show;
    if (!show) { ui.hintId = null; return; }
    if (ui.hintId === hint.id && ui.hintText.textContent === hint.text) return;      // không dựng lại nếu không đổi
    ui.hintId = hint.id;
    ui.hintText.textContent = hint.text;
    clear(ui.hintCta, hint.cta && (hint.cta.href
      ? h("a", { class: "btn sm gold", href: hint.cta.href, style: { textDecoration: "none" } }, hint.cta.label)
      : h("button", { type: "button", class: "btn sm danger", onclick: () => game.resumePending() }, hint.cta.label)));
    ui.hintClose.onclick = () => { dismissed.add(hint.id); ui.hintBox.hidden = true; };
  }

  function updateAlive(s, life) {
    const w = WORLD[life.stage.world] ?? WORLD["Hạ Giới"];
    const season = seasonOf(life.tang);
    const prog = progressOf(life);
    const st = idleStatus(life);

    ui.realm.textContent = life.stage.name;
    ui.realm.style.color = w.color;
    ui.pname.textContent = `Kiếp thứ ${life.life_no}`;
    ui.sub.textContent = `${life.stage.world} · tầng ${life.tang}/9`;
    ui.expBar.el.hidden = life.status !== "alive";
    ui.expBar.setLabel(`Tu vi tầng ${life.tang}`);
    ui.expBar.set(prog, pct(prog, 0));
    ui.ageBar.set(life.lifespan.cap_years > 0 ? life.lifespan.used_years / life.lifespan.cap_years : 0,
      `${num(Math.round(life.lifespan.used_years))} / ${num(life.lifespan.cap_years)} năm`);
    for (const k of STAT_KEYS) {
      const t = s.account.stats[k];
      ui.statBars[k].set(t.cap > 0 ? t.level / t.cap : 0, `${t.level} / ${t.cap}`);
    }
    ui.kv.speed.textContent = `×${dec(life.speed_mult)}`;
    ui.kv.risk.textContent = `×${dec(life.risk_mult)}`;
    ui.kv.tm.textContent = num(life.tm_earned_life);
    ui.kv.ls.textContent = num(life.wallet.ls);
    ui.kv.lt.textContent = num(life.wallet.lt);
    ui.kv.tn.textContent = num(life.wallet.tn);

    ui.idleState.textContent = st.text;
    ui.idleState.className = `bold t-${st.tone}`;
    ui.idleRate.textContent = `Tốc độ tu luyện ×${dec(life.speed_mult)}`;
    const stageProg = life.status === "cleared" ? 1 : clamp01((life.tang - 1 + prog) / 9);
    ui.stageBar.set(stageProg, `${life.stage.name} · tầng ${life.tang}/9`);
    ui.idleNote.textContent = life.status === "cleared"
      ? "Kiếp đã viên mãn."
      : `Thọ nguyên còn ${num(lifespanLeft(life))} năm. Vắng mặt không gây tử vong: tầng 1–8 vẫn tự tiến, tới tầng 9 game dừng chờ ngươi.`;
    drawHint(s);

    scene.update({ world: w.id, season, color: w.color, pulse: game.pulse, label: `${life.stage.world} · mùa ${SEASON_NAME[season]}` });
    ui.clearedNote.hidden = life.status !== "cleared";
    syncLog();
    menu.update(s, life, prog);
  }

  /* ---------- hộp thoại ---------- */
  function drawBag() {
    const life = game.state?.life;
    if (!bagOpen || !life) { bagDlg.hide(); return; }
    clear(bagDlg.body, h("div", { class: "stack" },
      life.items.length === 0
        ? h("p", { class: "dim" }, "Chưa có gì. Vật phẩm Thiên Mệnh mua ở Quán Đỉnh nằm ở đây và ", h("b", null, "mất khi chết"), ".")
        : h("ul", { class: "bag-list" }, life.items.map((it) =>
            h("li", { class: "panel row between" }, h("span", { class: "bold" }, it.name), it.used ? h("span", { class: "chip" }, "đã dùng") : h("span", { class: "chip jade" }, "chưa dùng")))),
      h("p", { class: "dim small" }, "Chết thật là mất toàn bộ vật phẩm trong túi, kể cả vật phẩm Thiên Mệnh chưa dùng (không hoàn Thiên Mệnh)."),
      h("div", { class: "row center" }, h("a", { class: "btn gold", href: "#/quan-dinh", onclick: () => bagDlg.hide(), style: { textDecoration: "none" } }, icon("orb_gold"), "Quán Đỉnh"),
        h("button", { class: "btn ghost", onclick: () => bagDlg.hide() }, "Đóng"))));
    bagDlg.show();
  }

  function drawDialogs() {
    const p = game.prepared;
    if (p) {
      const confirmBtn = h("button", { class: "btn danger", disabled: game.busy || (p.lethal && !understood), onclick: () => game.confirm() }, "Đột phá");
      const box = h("input", { type: "checkbox", checked: understood, onchange: (e) => { understood = e.target.checked; confirmBtn.disabled = game.busy || (p.lethal && !understood); } });
      clear(confirmDlg.body,
        h("div", { class: "stack" },
          h("p", { style: { textAlign: "center" } }, "Xác suất ", h("b", null, "tử vong"), " lần này: ", h("b", { class: "num t-red" }, pct(p.death_prob, 2))),
          h("p", { class: "dim" }, p.warning),
          p.lethal && h("label", { class: "check" }, box, " Ta hiểu: nếu chết, ta mất toàn bộ tài sản của kiếp này."),
          h("div", { class: "row" }, confirmBtn, h("button", { class: "btn ghost", onclick: () => game.cancelPrepare() }, "Để sau"))));
      confirmDlg.show();
    } else { understood = false; confirmDlg.hide(); }

    const r = game.result;
    if (r) {
      resultDlg.setTitle(r.outcome === "death" ? "Vẫn lạc" : r.outcome === "cleared" ? "Viên mãn" : "Đột phá thành công");
      let content;
      if (r.outcome === "success") {
        const name = STAGES[r.stage_idx]?.name ?? r.stage_id;
        content = [h("p", null, "Ngươi bước vào ", h("b", null, name), ` ở ${r.world}.`),
          r.ascended && h("p", { class: "t-gold" }, "Phi Thăng: ngươi rời đại giới cũ nhưng vẫn là một kiếp, không mất gì.")];
      } else if (r.outcome === "cleared") {
        content = [h("p", null, "Ngươi đã hoàn tất tuyến chính của kiếp này.")];
      } else {
        content = [h("p", null, "Nguyên nhân: ", h("b", null, causeLabel(r.cause)), "."),
          h("p", { class: "dim" }, "Tài sản của kiếp đã tan biến. Thiên Mệnh và chỉ số vĩnh viễn vẫn còn. Một kiếp mới đã bắt đầu.")];
      }
      clear(resultDlg.body, h("div", { class: "stack" }, content, h("button", { class: "btn", onclick: () => game.dismissResult() }, "Đã rõ")));
      resultDlg.show();
    } else resultDlg.hide();
    drawBag();
  }

  function ensureMode(m) {
    if (mode === m) return;
    scene?.destroy(); scene = null; ui = null; menu = null; mode = m;
    if (m === "none") buildNone();
    else if (m === "alive") buildAlive();
    else clear(stage, waitP);
  }

  function render() {
    const s = game.state, life = s?.life ?? null;
    errBox.hidden = !game.error;
    errBox.textContent = game.error ?? "";
    if (!s) { ensureMode("wait"); waitP.hidden = !game.loading; }
    else if (!life) {
      ensureMode("none");
      ui.startBtn.disabled = game.busy;
      const n = s.account.life_count ?? 0;
      ui.lives.textContent = n > 0 ? `Đây là kiếp thứ ${n + 1} của ngươi` : "Kiếp đầu tiên của ngươi";
      ui.tm.textContent = `Điểm Thiên Mệnh đang giữ: ${num(s.account.tm_balance)}`;
    } else { ensureMode("alive"); updateAlive(s, life); }
    drawDialogs();
  }

  return {
    el, render,
    destroy() {
      window.removeEventListener("keydown", onKey);
      scene?.destroy(); confirmDlg.hide(); resultDlg.hide(); bagDlg.hide();
    },
  };
}
