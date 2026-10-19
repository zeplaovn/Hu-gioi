/* Màn Tu luyện: 3 cột như bản cũ (nhân vật · cảnh + nhật ký · hành động). Chỉ hiển thị; mọi quyết định do server. */
import { STAGES, STAT_KEYS, STAT_LABEL } from "@hu-gioi/game-core";
import { assetBase } from "../config.js";
import { causeLabel, clamp01, num, pct } from "../format.js";
import { createBar } from "../ui/bar.js";
import { createDialog } from "../ui/dialog.js";
import { clear, h, icon } from "../ui/dom.js";
import { createScene } from "../ui/scene.js";

const WORLD = {
  "Hạ Giới": { id: "ha_gioi", color: "#7fffa0" },
  "Linh Giới": { id: "linh_gioi", color: "#7fdcff" },
  "Tiên Giới": { id: "tien_gioi", color: "#ffe27a" },
};
const ICON = { TuongMao: "portrait", PhucDuyen: "clover", CanCot: "sword", NgoTinh: "brain", VanKhi: "charm" };
const SEASON_NAME = ["Xuân", "Hạ", "Thu", "Đông"];
// Mùa chạy theo tầng: tầng 1–2 Xuân, 3–4 Hạ, 5–6 Thu, 7–9 Đông (9 tầng = một vòng bốn mùa).
const seasonOf = (tang) => Math.min(3, Math.max(0, Math.floor((tang - 1) / 2.25)));
const dec = (x) => x.toFixed(3).replace(".", ",");
const progressOf = (life) => clamp01(life.need_s > 0 ? life.progress_s / life.need_s : 0);

export function createPlayView({ game }) {
  const errBox = h("p", { class: "notice error", role: "alert", hidden: true, style: { marginBottom: "12px" } });
  const stage = h("div");
  const waitP = h("p", { class: "dim" }, "Đang đọc thiên cơ…");
  let understood = false;

  const confirmDlg = createDialog({ title: "Xác nhận đại đột phá", onclose: () => { if (game.prepared) game.cancelPrepare(); } });
  const resultDlg = createDialog({ title: "", onclose: () => { if (game.result) game.dismissResult(); } });
  const el = h("div", null, errBox, stage, confirmDlg.el, resultDlg.el);

  let mode = null, ui = null, scene = null;

  /* ---------- chưa có kiếp ---------- */
  function buildNone() {
    scene = createScene({ world: "ha_gioi", season: 0, label: "Hạ Giới" });
    const startBtn = h("button", { class: "btn gold", onclick: () => game.startLife() }, icon("orb_gold"), "Nhập thế");
    clear(stage,
      h("div", { class: "main", style: { gridTemplateColumns: "minmax(0, 700px)", justifyContent: "center" } },
        h("div", { class: "col-center" }, scene.el,
          h("section", { class: "card gold stack", style: { marginTop: "12px" } },
            h("h1", null, "Bắt đầu một kiếp"),
            h("p", { class: "dim" }, "Ngươi sẽ thức tỉnh ở Hạ Giới với tay trắng. Kiếp này chỉ kết thúc khi tọa hóa, đại đột phá thất bại hoặc chết trong nội dung sinh tử."),
            startBtn))));
    ui = { startBtn };
  }

  /* ---------- đang sống ---------- */
  function buildAlive() {
    scene = createScene({ world: "ha_gioi", season: 0 });
    const realm = h("p", { class: "realm" });
    const sub = h("p", { class: "dim" });
    const expBar = createBar({ label: "Tu vi", tone: "cyan" });
    const ageBar = createBar({ label: "Thọ nguyên", tone: "gold" });

    const statBars = {};
    const statRows = STAT_KEYS.map((k) => {
      statBars[k] = createBar({ label: STAT_LABEL[k], tone: "jade", showLabel: false });
      return h("div", { class: "mini-stat" },
        h("img", { src: `${assetBase()}/icons/${ICON[k]}_22.png`, alt: "" }),
        h("span", null, STAT_LABEL[k]),
        statBars[k].el);
    });

    const kv = {};
    const kvRow = (key, label, cls) => [h("dt", null, label), (kv[key] = h("dd", { class: ["num", cls] }))];
    const dl = h("dl", { class: "kv small" },
      kvRow("speed", "Tốc độ tu luyện"), kvRow("risk", "Hệ số rủi ro"), kvRow("tm", "Thiên Mệnh kiếp này", "t-gold"),
      kvRow("ls", "Linh Thạch"), kvRow("lt", "Linh Tinh"), kvRow("tn", "Tiên Ngọc"));

    const clearedNote = h("p", { class: "notice", role: "status", hidden: true, style: { marginTop: "10px" } },
      "Ngươi đã hoàn tất tuyến chính và đứng tại Đài Quy Hương. Kiếp này kết thúc trong vinh quang; Thiên Mệnh đã được ghi vào Bia.");

    const state = { lastLogId: 0, follow: true };
    const jumpBtn = h("button", { class: "log-jump", type: "button", hidden: true, onclick: () => { state.follow = true; jumpBtn.hidden = true; logEl.scrollTop = logEl.scrollHeight; } }, "↓ Tin mới");
    const logEl = h("ol", {
      class: "log", "aria-live": "polite", "aria-label": "Nhật ký tu luyện", tabindex: "0",
      onscroll: () => { state.follow = logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight < 40; jumpBtn.hidden = state.follow; },
    });

    const breakPanel = h("section", { class: "panel" });
    const itemsPanel = h("section", { class: "panel", style: { marginTop: "12px" } });

    clear(stage,
      h("div", { class: "main" },
        h("aside", { class: "col-left" },
          h("section", { class: "panel" },
            realm, sub, expBar.el, ageBar.el,
            h("p", { class: "sec" }, "Chỉ số vĩnh viễn (Thiên Mệnh)"), statRows,
            h("p", { class: "sec" }, "Thân thể"), dl)),
        h("div", { class: "col-center" }, scene.el, clearedNote, h("div", { class: "log-wrap" }, logEl, jumpBtn)),
        h("aside", { class: "col-right" }, breakPanel, itemsPanel)));

    ui = { realm, sub, expBar, ageBar, statBars, kv, clearedNote, logEl, jumpBtn, breakPanel, itemsPanel, state };
  }

  const sealBtn = (label, prog) =>
    h("button", { class: "btn seal", disabled: true, style: { "--p": `${prog * 100}%` } }, h("span", null, label), h("span", { class: "seal-pct" }, pct(prog, 0)));

  function drawBreak(s, life, prog) {
    const pending = s.pending_intent;
    const kids = [h("p", { class: "sec", style: { marginTop: "0" } }, "Đột phá")];
    if (life.status === "cleared") {
      kids.push(h("button", { class: "btn seal", disabled: true, style: { "--p": "100%" } }, "Hoàn tất tuyến chính"));
    } else if (life.tang < 9) {
      kids.push(sealBtn(`Tu luyện tầng ${life.tang}`, prog),
        h("p", { class: "dim small", style: { marginTop: "8px" } }, "Tầng 1–8 tự tiến khi đủ tu vi, ", h("b", null, "không có nguy cơ tử vong"),
          ", kể cả lúc ngươi vắng mặt. Tới tầng 9 sẽ dừng chờ ngươi xác nhận đại đột phá."));
    } else if (life.ready_for_major) {
      if (pending && !game.prepared) {
        kids.push(h("div", { class: "alert-box" },
          h("span", null, `Có một lời xác nhận đang chờ (xác suất tử vong ${pct(pending.death_prob, 2)}).`),
          h("button", { class: "btn danger", onclick: () => game.resumePending() }, "Tiếp tục xác nhận")));
      } else {
        kids.push(h("button", { class: "btn seal ready", style: { "--p": "100%" }, disabled: game.busy, onclick: () => game.prepare() }, "Đại đột phá"),
          h("p", { class: "small", style: { marginTop: "8px", color: "#ffd9cf" } }, "Có thể thất bại dẫn tới ", h("b", null, "tử vong thật"), "."));
      }
    } else {
      kids.push(sealBtn("Tích tụ tu vi đại đột phá", prog));
    }
    clear(ui.breakPanel, kids);
  }

  function drawItems(s, life) {
    clear(ui.itemsPanel,
      h("p", { class: "sec", style: { marginTop: "0" } }, "Vật phẩm của kiếp"),
      life.items.length === 0
        ? h("p", { class: "dim small" }, "Chưa có gì. Vật phẩm Thiên Mệnh mua ở Quán Đỉnh nằm ở đây và ", h("b", null, "mất khi chết"), ".")
        : h("ul", { class: "small", style: { margin: "0", paddingLeft: "1.1rem" } },
            life.items.map((it) => h("li", null, it.name, it.used && [" ", h("span", { class: "dim" }, "(đã dùng)")]))),
      h("a", { class: "btn gold wide", style: { marginTop: "10px", textDecoration: "none" }, href: "#/quan-dinh" },
        icon("orb_gold"), `Quán Đỉnh · ${num(s.account.tm_balance)} TM`));
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

  function updateAlive(s, life) {
    const w = WORLD[life.stage.world] ?? WORLD["Hạ Giới"];
    const season = seasonOf(life.tang);
    const prog = progressOf(life);

    ui.realm.textContent = life.stage.name;
    ui.realm.style.color = w.color;
    ui.sub.textContent = `Kiếp thứ ${life.life_no} · ${life.stage.world} · tầng ${life.tang}/9`;
    ui.expBar.el.hidden = life.status !== "alive";
    ui.expBar.setLabel(`Tu vi tầng ${life.tang}`);
    ui.expBar.set(prog, pct(prog, 0));
    ui.ageBar.set(life.lifespan.cap_years > 0 ? life.lifespan.used_years / life.lifespan.cap_years : 0,
      `${num(Math.round(life.lifespan.used_years))} / ${num(life.lifespan.cap_years)} năm`);
    for (const k of STAT_KEYS) {
      const st = s.account.stats[k];
      ui.statBars[k].set(st.cap > 0 ? st.level / st.cap : 0, `${st.level} / ${st.cap}`);
    }
    ui.kv.speed.textContent = `×${dec(life.speed_mult)}`;
    ui.kv.risk.textContent = `×${dec(life.risk_mult)}`;
    ui.kv.tm.textContent = num(life.tm_earned_life);
    ui.kv.ls.textContent = num(life.wallet.ls);
    ui.kv.lt.textContent = num(life.wallet.lt);
    ui.kv.tn.textContent = num(life.wallet.tn);

    scene.update({ world: w.id, season, color: w.color, pulse: game.pulse, label: `${life.stage.world} · mùa ${SEASON_NAME[season]}` });
    ui.clearedNote.hidden = life.status !== "cleared";
    syncLog();
    drawBreak(s, life, prog);
    drawItems(s, life);
  }

  /* ---------- hộp thoại ---------- */
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
  }

  function ensureMode(m) {
    if (mode === m) return;
    scene?.destroy(); scene = null; ui = null; mode = m;
    if (m === "none") buildNone();
    else if (m === "alive") buildAlive();
    else clear(stage, waitP);
  }

  function render() {
    const s = game.state, life = s?.life ?? null;
    errBox.hidden = !game.error;
    errBox.textContent = game.error ?? "";
    if (!s) { ensureMode("wait"); waitP.hidden = !game.loading; }
    else if (!life) { ensureMode("none"); ui.startBtn.disabled = game.busy; }
    else { ensureMode("alive"); updateAlive(s, life); }
    drawDialogs();
  }

  return { el, render, destroy() { scene?.destroy(); confirmDlg.hide(); resultDlg.hide(); } };
}
