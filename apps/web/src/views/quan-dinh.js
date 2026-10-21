/* Quán Đỉnh (stat vĩnh viễn) + Thiên Mệnh Các (vật phẩm của kiếp). Giá/giới hạn hiển thị lấy từ game-core; server vẫn kiểm tra lại mọi lần mua. */
import { RULES, STAT_KEYS, STAT_LABEL, TM_CATALOG } from "@hu-gioi/game-core";
import { num } from "../format.js";
import { createDialog } from "../ui/dialog.js";
import { clear, h } from "../ui/dom.js";

const ITEMS = TM_CATALOG.filter((c) => c.kind === "item");

function effect(k) {
  const e = RULES.stat_effects[k], out = [];
  if (e.speed) out.push(`+${(e.speed * 100).toFixed(1).replace(".", ",")}% tốc độ tu luyện mỗi cấp`);
  if (e.risk) out.push(`−${(e.risk * 100).toFixed(1).replace(".", ",")}% nguy cơ tử vong mỗi cấp`);
  return out.join(" · ") || "Chưa có hiệu ứng trong bản này";
}

export function createQuanDinhView({ game }) {
  let confirmId = null;
  const errBox = h("p", { class: "notice error", role: "alert", hidden: true });
  const content = h("div", { class: "stack shop" });
  const dlg = createDialog({ title: "Mua vật phẩm Thiên Mệnh", onclose: () => { confirmId = null; } });
  const el = h("div", null, errBox, content, dlg.el);

  function drawDialog() {
    const it = ITEMS.find((i) => i.id === confirmId);
    if (!it) { dlg.hide(); return; }
    clear(dlg.body, h("div", { class: "stack" },
      h("p", null, "Mua ", h("b", null, it.name), " với ", h("b", { class: "num" }, it.cost), " Thiên Mệnh?"),
      h("p", { class: "notice error" }, "Nếu chết trước khi dùng, vật phẩm mất và Thiên Mệnh không được hoàn lại."),
      h("div", { class: "row" },
        h("button", { class: "btn gold", disabled: game.busy, onclick: buy }, "Xác nhận mua"),
        h("button", { class: "btn ghost", onclick: () => { confirmId = null; dlg.hide(); } }, "Hủy"))));
    dlg.show();
  }

  async function buy() {
    const id = confirmId;
    if (!id) return;
    await game.buyItem(id);
    confirmId = null;
    dlg.hide();
  }

  function render() {
    errBox.hidden = !game.error;
    errBox.textContent = game.error ?? "";
    const s = game.state;
    if (!s) { clear(content, h("p", { class: "dim" }, "Đang tải…")); return; }
    const life = s.life?.status === "alive" ? s.life : null;
    const owned = (id) => life?.items.filter((i) => i.catalog_id === id).length ?? 0;

    clear(content,
      h("section", null,
        h("h1", null, "Quán Đỉnh Thiên Mệnh"),
        h("p", { class: "dim" }, "Dùng Điểm Thiên Mệnh để nâng chỉ số ", h("b", null, "vĩnh viễn"), ": giữ nguyên qua mọi kiếp. Ngươi còn ",
          h("b", { class: "num gold-text" }, num(s.account.tm_balance)), " điểm."),
        h("div", { class: "grid" }, STAT_KEYS.map((k) => {
          const st = s.account.stats[k];
          return h("div", { class: "card row between" },
            h("div", null,
              h("h3", null, STAT_LABEL[k], " ", h("span", { class: "chip num" }, `${st.level} / ${st.cap}`)),
              h("p", { class: "dim small" }, effect(k))),
            h("button", { class: "btn gold", disabled: game.busy || st.next_cost === null || st.next_cost > s.account.tm_balance, onclick: () => game.upgradeStat(k) },
              st.next_cost === null ? "Đã tối đa" : `Nâng · ${num(st.next_cost)}`));
        }))),
      h("section", null,
        h("h2", null, "Thiên Mệnh Các"),
        !life && h("p", { class: "notice" }, "Chưa có kiếp đang sống: Quán Đỉnh nâng chỉ số vĩnh viễn ngay bây giờ được, còn vật phẩm Thiên Mệnh Các chỉ mua được trong một kiếp."),
        h("p", { class: "notice" }, "Vật phẩm ở đây thuộc về ", h("b", null, "kiếp hiện tại"), ". Chết trước khi dùng thì ", h("b", null, "mất và không hoàn Thiên Mệnh"),
          ". Bản này mới có phần mua và giữ vật phẩm; hiệu ứng sử dụng sẽ được thêm cùng các hệ thống tương ứng."),
        h("div", { class: "grid two" }, ITEMS.map((it) =>
          h("div", { class: "card" },
            h("div", { class: "row between" }, h("h3", null, it.name), h("span", { class: "chip gold num" }, `${it.cost} TM`)),
            h("p", { class: "dim small" }, it.effect),
            h("div", { class: "row between" },
              h("span", { class: "small dim num" }, `Đã có ${owned(it.id)} / ${it.per_life_limit} trong kiếp`),
              h("button", { class: "btn ghost", disabled: game.busy || !life || owned(it.id) >= (it.per_life_limit ?? 0) || s.account.tm_balance < (it.cost ?? 0), onclick: () => { confirmId = it.id; drawDialog(); } }, "Mua")))))));
    drawDialog();
  }

  return { el, render, destroy() { dlg.hide(); } };
}
