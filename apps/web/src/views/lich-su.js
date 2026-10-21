/* Bia Thiên Mệnh: lịch sử các kiếp của tài khoản. */
import { STAGES } from "@hu-gioi/game-core";
import { causeLabel, dateTime, num } from "../format.js";
import { clear, h } from "../ui/dom.js";

const where = (idx, tang) => `${STAGES.find(s=>s.idx===idx)?.name ?? (idx===0?"Phàm Nhân (lịch sử)":"?")} · tầng ${tang}`;

export function createLichSuView({ game }) {
  const body = h("div");
  const el = h("div", null,
    h("h1", null, "Bia Thiên Mệnh"),
    h("p", { class: "dim" }, "Lịch sử các kiếp của ngươi. Tài sản đã mất, nhưng dấu vết còn mãi."),
    body);

  function render() {
    const s = game.state;
    if (!s) { clear(body, h("p", { class: "dim" }, "Đang tải…")); return; }
    if (s.history.length === 0) { clear(body, h("p", { class: "notice" }, "Chưa có kiếp nào kết thúc.")); return; }
    clear(body,
      h("div", { class: "card table-wrap" },
        h("table", null,
          h("thead", null, h("tr", null, ["Kiếp", "Kết cục", "Dừng ở", "Số ngày tu", "TM nhận", "Kết thúc"].map((t) => h("th", null, t)))),
          h("tbody", null, s.history.map((x) =>
            h("tr", null,
              h("td", { class: "num" }, `#${x.life_no}`), h("td", null, causeLabel(x.cause)), h("td", null, where(x.stage_idx, x.tang)),
              h("td", { class: "num" }, num(x.credited_days)), h("td", { class: "num" }, x.tm_earned), h("td", { class: "dim" }, dateTime(x.ended_at))))))),
      h("p", { class: "dim small" }, "Hiển thị tối đa 10 kiếp gần nhất."));
  }

  return { el, render, destroy() {} };
}
