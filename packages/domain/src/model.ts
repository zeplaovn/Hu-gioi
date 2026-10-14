export const STATS = ["Tướng Mạo", "Phúc Duyên", "Căn Cốt", "Ngộ Tính", "Vận Khí"] as const;
export type StatName = (typeof STATS)[number];

export const STAT_DESC: Record<StatName, string> = {
  "Tướng Mạo": "Xã giao: giảm giá, tăng cơ hội NPC/quý nhân và nhiệm vụ giao tiếp.",
  "Phúc Duyên": "Cơ duyên: tăng chất lượng kỳ ngộ, chiến lợi phẩm và né tránh.",
  "Căn Cốt": "Thể chất: tăng tu luyện, khí huyết, chiến lực và phòng ngự.",
  "Ngộ Tính": "Ngộ đạo: tăng tu vi theo thời gian và tỉ lệ đột phá.",
  "Vận Khí": "May mắn: tăng chí mạng, đột phá và giảm kỳ ngộ bất lợi.",
};

export const RACES = {
  "Nhân": { lifespan: 90, bonus: {} },
  "Ma": { lifespan: 90, bonus: { "Căn Cốt": 2, "Tướng Mạo": -2 } },
  "Yêu": { lifespan: 115, bonus: { "Căn Cốt": 1, "Ngộ Tính": -1 } },
  "Linh": { lifespan: 100, bonus: { "Ngộ Tính": 1, "Căn Cốt": -1 } },
  "Tiên Duệ": { lifespan: 135, bonus: { "Phúc Duyên": 2, "Vận Khí": 1, "Căn Cốt": -2 } },
  "Thú": { lifespan: 80, bonus: { "Căn Cốt": 2, "Ngộ Tính": -2 } },
} as const satisfies Record<string, { lifespan: number; bonus: Partial<Record<StatName, number>> }>;
export type RaceName = keyof typeof RACES;

export const FIVE = ["Kim", "Mộc", "Thủy", "Hỏa", "Thổ"] as const;
export const RARE_ELEMENTS = ["Lôi", "Băng", "Phong"] as const;
export type ElementName = (typeof FIVE)[number] | (typeof RARE_ELEMENTS)[number];

export type ElementBonus = Partial<Record<"atk" | "def" | "hp" | "exp" | "crit" | "dodge" | "regen", number>> & {
  color: string;
  story: string;
};

export const ELEMENTS: Record<ElementName, ElementBonus> = {
  Kim: { color: "#e8d28a", atk: 0.12, crit: 0.02, story: "Sắc bén, cứng cỏi." },
  Mộc: { color: "#6edc7a", hp: 0.10, regen: 0.5, story: "Sinh sôi, hồi phục." },
  Thủy: { color: "#6ab8ff", exp: 0.10, dodge: 0.03, story: "Uyển chuyển, ngộ đạo." },
  Hỏa: { color: "#ff7a45", atk: 0.06, crit: 0.06, story: "Bạo liệt, hủy diệt." },
  Thổ: { color: "#c9a26a", def: 0.15, hp: 0.05, story: "Vững chãi, kiên cố." },
  Lôi: { color: "#c58cff", atk: 0.18, crit: 0.08, story: "Dị căn: thiên lôi giáng thế." },
  Băng: { color: "#9fe8ff", def: 0.15, exp: 0.10, story: "Dị căn: hàn khí vạn năm." },
  Phong: { color: "#a8f0c8", dodge: 0.10, exp: 0.10, crit: 0.02, story: "Dị căn: nhẹ như gió." },
};

export interface Root {
  els: ElementName[];
}

export interface RootType {
  n: number;
  name: string;
  exp: number;
  scale: number;
  weight: number;
  life: number;
  keep: number;
}

export const ROOT_TYPES: readonly RootType[] = [
  { n: 1, name: "Thiên Linh Căn", exp: 0.40, scale: 1.00, weight: 6, life: 0, keep: 0 },
  { n: 2, name: "Song Linh Căn", exp: 0.22, scale: 0.80, weight: 18, life: 0, keep: 0 },
  { n: 3, name: "Tam Linh Căn", exp: 0.08, scale: 0.62, weight: 34, life: 25, keep: 0.03 },
  { n: 4, name: "Tứ Linh Căn", exp: -0.02, scale: 0.50, weight: 27, life: 55, keep: 0.06 },
  { n: 5, name: "Ngũ Linh Căn", exp: -0.10, scale: 0.40, weight: 12, life: 100, keep: 0.10 },
] as const;

export const RARE_ROOT: RootType = { n: 1, name: "Dị Linh Căn", exp: 0.45, scale: 1, weight: 3, life: 0, keep: 0 };

export interface Character {
  id?: string;
  name: string;
  gender: "Nam" | "Nữ";
  age: number;
  race: RaceName;
  root: Root;
  stats: Record<StatName, number>;
  lifespan: number;
  realm: number;
  tang: number;
  exp: number;
  hp: number;
  stone: number;
  months: number;
  world: string;
  region: string;
  site: string;
}
