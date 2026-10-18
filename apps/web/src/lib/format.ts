/** Hiển thị: số, phần trăm, thời gian. Thuần hàm để test được. */
const nf = new Intl.NumberFormat("vi-VN");
export const num = (n: number): string => nf.format(n);

export const pct = (p: number, digits = 1): string => (p * 100).toFixed(digits).replace(".", ",") + "%";

export function clamp01(x: number): number {
  return Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0;
}

/** 3725 -> "1 giờ 2 phút"; dưới 1 phút -> "dưới 1 phút". */
export function duration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  const parts: string[] = [];
  if (d) parts.push(`${d} ngày`);
  if (h) parts.push(`${h} giờ`);
  if (m && !d) parts.push(`${m} phút`);
  return parts.length ? parts.join(" ") : "dưới 1 phút";
}

export const CAUSE_LABEL: Record<string, string> = {
  breakthrough: "Đại đột phá thất bại",
  lifespan: "Tọa hóa (hết thọ nguyên)",
  cleared: "Hoàn tất tuyến chính",
};
export const causeLabel = (c: string): string => CAUSE_LABEL[c] ?? c;

export const dateTime = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
};
