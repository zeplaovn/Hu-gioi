/* Hiệu ứng (VFX) từ bộ asset thu-vien/hieu_ung: đường dẫn khung hình + trình phát khung hình thuần (không đụng DOM, test được bằng Node). */
import { assetBase } from "../config.js";

const pad = (n) => String(n).padStart(2, "0");
const seq = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** Mỗi hiệu ứng: tên tệp (không gồm _NN.png), dải số khung, kích thước hiển thị tương đối. */
export const VFX = {
  linhKhi:   { stem: "chien_dau__linh_khi__linh_khi", frames: seq(0, 7), fps: 8 },
  dotPha:    { stem: "dot_pha__ha_gioi__dot_pha", frames: seq(0, 7), fps: 14 },
  phiThang:  {
    linh_gioi: { stem: "phi_thang__linh_gioi__phi_thang", frames: seq(1, 8), fps: 10 },
    tien_gioi: { stem: "phi_thang__tien_gioi__phi_thang", frames: seq(1, 8), fps: 10 },
  },
  loiKiep:   {
    ha_gioi:   { stem: "loi_kiep__ha_gioi__tia_set", frames: seq(0, 7), fps: 16 },
    linh_gioi: { stem: "loi_kiep__linh_gioi__loi_kiep", frames: seq(1, 8), fps: 16 },
    tien_gioi: { stem: "loi_kiep__tien_gioi__loi_kiep", frames: seq(1, 8), fps: 16 },
  },
};

/** Chọn hiệu ứng theo đại giới; Hạ Giới không có Phi Thăng riêng nên trả về null. */
export const vfxFor = (name, world) => {
  const v = VFX[name];
  if (!v) return null;
  return v.stem ? v : (v[world] ?? null);
};

export const frameUrls = (v, base = assetBase()) => v.frames.map((n) => `${base}/thu-vien/hieu_ung/hieu_ung__${v.stem}_${pad(n)}.png`);

/** Khung hình hiện tại của một hiệu ứng đang phát. `age` tính theo tick 30 Hz. Trả null khi đã hết (không lặp). */
export function frameAt(v, age, { loop = false } = {}) {
  const i = Math.floor((age / 30) * v.fps);
  if (loop) return i % v.frames.length;
  return i < v.frames.length ? i : null;
}
