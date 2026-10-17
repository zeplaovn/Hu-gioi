// Bảng cảnh giới trong shared/: 57 cấp, 3 giới (+ Hỗn Độn dành sẵn), phi thăng ở Hóa Thần đỉnh và Đại Thừa đỉnh.
import test from "node:test"; import assert from "node:assert/strict";
import {
  GIOI, REALMS, MAX_LEVEL, ASCENSION_LEVELS,
  describeLevel, realmIndexOfLevel, levelOf, realmRange, ascensionAt, gioiOfLevel, firstLevelOfGioi,
} from "../shared/realms.js";

test("12 cảnh giới, tổng 57 cấp = 13 + 11 x 4", () => {
  assert.equal(REALMS.length, 12);
  assert.equal(MAX_LEVEL, 57);
  assert.equal(REALMS[0].stages.length, 13);
  for (const r of REALMS.slice(1)) assert.deepEqual(r.stages, ["sơ", "trung", "hậu", "đỉnh"], r.id);
});

test("id duy nhất, không dấu, chỉ gồm a-z0-9_", () => {
  const ids = [...REALMS.map(r => r.id), ...GIOI.map(g => g.id)];
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[a-z0-9_]+$/);
});

test("tên cảnh giới theo thiết kế: Kim Đan (không phải Kết Đan), Độ Kiếp không còn là cảnh giới", () => {
  const names = REALMS.map(r => r.name);
  assert.deepEqual(names, ["Luyện Khí", "Trúc Cơ", "Kim Đan", "Nguyên Anh", "Hóa Thần", "Luyện Hư", "Hợp Thể", "Đại Thừa",
    "Chân Tiên", "Kim Tiên", "Thái Ất Kim Tiên", "Đại La Kim Tiên"]);
  assert.ok(!names.includes("Độ Kiếp") && !names.includes("Phàm Nhân"));
});

test("các cảnh giới liền nhau, phủ kín cấp 1..57 không hở không chồng", () => {
  let next = 1;
  REALMS.forEach((_, i) => {
    const { first, last } = realmRange(i);
    assert.equal(first, next, REALMS[i].id);
    assert.equal(last - first + 1, REALMS[i].stages.length);
    next = last + 1;
  });
  assert.equal(next - 1, MAX_LEVEL);
});

test("khứ hồi: levelOf(realmIndex, stage) và describeLevel khớp nhau ở mọi cấp", () => {
  for (let lv = 1; lv <= MAX_LEVEL; lv++) {
    const d = describeLevel(lv);
    assert.equal(d.level, lv);
    assert.equal(levelOf(d.realmIndex, d.stage), lv);
    assert.equal(realmIndexOfLevel(lv), d.realmIndex);
  }
});

test("mốc cấp cụ thể", () => {
  assert.equal(describeLevel(1).name, "Luyện Khí tầng 1");
  assert.equal(describeLevel(13).name, "Luyện Khí tầng 13");
  assert.equal(describeLevel(14).name, "Trúc Cơ sơ");
  assert.equal(describeLevel(18).name, "Kim Đan sơ");
  assert.equal(describeLevel(29).name, "Hóa Thần đỉnh");
  assert.equal(describeLevel(30).name, "Luyện Hư sơ");
  assert.equal(describeLevel(57).name, "Đại La Kim Tiên đỉnh");
});

test("giới: Hạ 1-29, Linh 30-41, Tiên 42-57", () => {
  const range = g => { const l = []; for (let lv = 1; lv <= MAX_LEVEL; lv++) if (gioiOfLevel(lv) === g) l.push(lv); return [l[0], l.at(-1), l.length]; };
  assert.deepEqual(range("ha_gioi"), [1, 29, 29]);
  assert.deepEqual(range("linh_gioi"), [30, 41, 12]);
  assert.deepEqual(range("tien_gioi"), [42, 57, 16]);
  assert.equal(firstLevelOfGioi("linh_gioi"), 30);
  assert.equal(firstLevelOfGioi("tien_gioi"), 42);
});

test("phi thăng chỉ ở Hóa Thần đỉnh (29, Thiên Kiếp → Linh Giới) và Đại Thừa đỉnh (41, Lôi Kiếp → Tiên Giới)", () => {
  assert.deepEqual(ASCENSION_LEVELS, [29, 41]);
  assert.deepEqual(ascensionAt(29), { to: "linh_gioi", trial: "Thiên Kiếp" });
  assert.deepEqual(ascensionAt(41), { to: "tien_gioi", trial: "Lôi Kiếp" });
  assert.equal(ascensionAt(28), null);
  assert.equal(ascensionAt(57), null);   // Đại La đỉnh là đích cuối Mùa 1, chưa có cửa phi thăng
});

test("Hỗn Độn đã dành sẵn nhưng chưa có cảnh giới, không nằm trong cấp của Mùa 1", () => {
  const hd = GIOI.find(g => g.id === "hon_don");
  assert.ok(hd && hd.reserved);
  assert.equal(firstLevelOfGioi("hon_don"), null);
  assert.ok(REALMS.every(r => r.gioi !== "hon_don"));
  for (const r of REALMS) assert.ok(GIOI.some(g => g.id === r.gioi), r.id);
});

test("đầu vào không hợp lệ trả về null/-1, không ném lỗi", () => {
  for (const bad of [0, -1, 58, 1.5, NaN, null, undefined, "3"]) {
    assert.equal(describeLevel(bad), null, String(bad));
    assert.equal(realmIndexOfLevel(bad), -1, String(bad));
    assert.equal(gioiOfLevel(bad), null, String(bad));
    assert.equal(ascensionAt(bad), null, String(bad));
  }
  assert.equal(levelOf(99, 1), null);
  assert.equal(levelOf(1, 0), null);
  assert.equal(levelOf(1, 5), null);
  assert.equal(realmRange(99), null);
});

test("dữ liệu bị đóng băng, không sửa nhầm được lúc chạy", () => {
  assert.ok(Object.isFrozen(REALMS) && Object.isFrozen(REALMS[0]) && Object.isFrozen(GIOI));
  assert.throws(() => { "use strict"; REALMS[0].name = "x"; }, TypeError);
});
