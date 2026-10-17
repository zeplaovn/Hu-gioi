/* Bảng cảnh giới — NGUỒN DUY NHẤT cho client, Edge Function, test, script cân bằng và hằng số SQL.
 *
 * Luật thuần: không đụng DOM, không gọi mạng, không đọc đồng hồ.
 * Mọi nơi cần biết "có bao nhiêu cấp", "cấp N thuộc cảnh giới nào", "cấp nào phải phi thăng"
 * đều hỏi file này; không viết lại các con số đó ở nơi khác.
 *
 * Cấp (level) đếm từ 1. Phàm Nhân là trạng thái khởi đầu (cấp 0), chưa tính cấp.
 * Tên cảnh giới/giai đoạn dùng cho hiển thị; `id` là chuỗi tiếng Việt không dấu dùng trong code, DB và tên file ảnh.
 */

/** Giới. `hon_don` đã dành chỗ (mở sau khi phi thăng khỏi Tiên Giới) nhưng chưa có cảnh giới nào: ngoài phạm vi Mùa 1. */
export const GIOI = Object.freeze([
  Object.freeze({ id: "ha_gioi", name: "Hạ Giới" }),
  Object.freeze({ id: "linh_gioi", name: "Linh Giới" }),
  Object.freeze({ id: "tien_gioi", name: "Tiên Giới" }),
  Object.freeze({ id: "hon_don", name: "Hỗn Độn", reserved: true }),
]);

const BON_GIAI_DOAN = Object.freeze(["sơ", "trung", "hậu", "đỉnh"]);
const MUOI_BA_TANG = Object.freeze(Array.from({ length: 13 }, (_, i) => `tầng ${i + 1}`));

/** Một cảnh giới. `ascend` có mặt ở cảnh giới cuối của một giới: đạt giai đoạn cuối + qua kiếp thì sang giới kế. */
const R = (id, name, gioi, stages, ascend) =>
  Object.freeze({ id, name, gioi, stages, ...(ascend ? { ascend: Object.freeze(ascend) } : {}) });

export const REALMS = Object.freeze([
  R("luyen_khi", "Luyện Khí", "ha_gioi", MUOI_BA_TANG),
  R("truc_co", "Trúc Cơ", "ha_gioi", BON_GIAI_DOAN),
  R("kim_dan", "Kim Đan", "ha_gioi", BON_GIAI_DOAN),
  R("nguyen_anh", "Nguyên Anh", "ha_gioi", BON_GIAI_DOAN),
  R("hoa_than", "Hóa Thần", "ha_gioi", BON_GIAI_DOAN, { to: "linh_gioi", trial: "Thiên Kiếp" }),
  R("luyen_hu", "Luyện Hư", "linh_gioi", BON_GIAI_DOAN),
  R("hop_the", "Hợp Thể", "linh_gioi", BON_GIAI_DOAN),
  R("dai_thua", "Đại Thừa", "linh_gioi", BON_GIAI_DOAN, { to: "tien_gioi", trial: "Lôi Kiếp" }),
  R("chan_tien", "Chân Tiên", "tien_gioi", BON_GIAI_DOAN),
  R("kim_tien", "Kim Tiên", "tien_gioi", BON_GIAI_DOAN),
  R("thai_at_kim_tien", "Thái Ất Kim Tiên", "tien_gioi", BON_GIAI_DOAN),
  R("dai_la_kim_tien", "Đại La Kim Tiên", "tien_gioi", BON_GIAI_DOAN),
]);

/** Cấp đầu tiên của từng cảnh giới (START[i] = cấp thấp nhất của REALMS[i]); phần tử cuối = MAX_LEVEL + 1. */
const START = (() => {
  const out = [1];
  for (const r of REALMS) out.push(out[out.length - 1] + r.stages.length);
  return Object.freeze(out);
})();

/** Số cấp tối đa của Mùa 1 (tính từ bảng, không ghi cứng). */
export const MAX_LEVEL = START[REALMS.length] - 1;

const isLevel = lv => Number.isInteger(lv) && lv >= 1 && lv <= MAX_LEVEL;

/** Chỉ số cảnh giới (0-based) của cấp `lv`, hoặc -1 nếu cấp không hợp lệ. */
export function realmIndexOfLevel(lv) {
  if (!isLevel(lv)) return -1;
  let lo = 0, hi = REALMS.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (START[mid] <= lv) lo = mid; else hi = mid - 1;
  }
  return lo;
}

/** Tra cấp: { level, realmIndex, realm, stage (1-based), stageName, gioi, name }, hoặc null nếu không hợp lệ. */
export function describeLevel(lv) {
  const ri = realmIndexOfLevel(lv);
  if (ri < 0) return null;
  const realm = REALMS[ri], stage = lv - START[ri] + 1;
  const stageName = realm.stages[stage - 1];
  return { level: lv, realmIndex: ri, realm, stage, stageName, gioi: realm.gioi, name: `${realm.name} ${stageName}` };
}

/** Cấp của (cảnh giới ri, giai đoạn stage 1-based), hoặc null nếu ngoài phạm vi. */
export function levelOf(realmIndex, stage) {
  const realm = REALMS[realmIndex];
  if (!realm || !Number.isInteger(stage) || stage < 1 || stage > realm.stages.length) return null;
  return START[realmIndex] + stage - 1;
}

/** Cấp đầu và cấp cuối của một cảnh giới. */
export function realmRange(realmIndex) {
  const realm = REALMS[realmIndex];
  return realm ? { first: START[realmIndex], last: START[realmIndex] + realm.stages.length - 1 } : null;
}

/** Cấp `lv` là cấp cuối của cảnh giới có cửa phi thăng? Trả về { to, trial } hoặc null. */
export function ascensionAt(lv) {
  const d = describeLevel(lv);
  if (!d || !d.realm.ascend || d.stage !== d.realm.stages.length) return null;
  return d.realm.ascend;
}

/** Danh sách cấp có cửa phi thăng, theo thứ tự tăng dần. */
export const ASCENSION_LEVELS = Object.freeze(
  Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).filter(lv => ascensionAt(lv)),
);

/** Giới của cấp `lv`, hoặc null. */
export const gioiOfLevel = lv => describeLevel(lv)?.gioi ?? null;

/** Cấp đầu tiên của một giới (ví dụ để chặn vào khu theo giới), hoặc null nếu giới chưa có cảnh giới. */
export function firstLevelOfGioi(gioiId) {
  const i = REALMS.findIndex(r => r.gioi === gioiId);
  return i < 0 ? null : START[i];
}
