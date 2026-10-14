export interface Site { id: string; name: string; danger: number; reward: number; }
export interface Region { id: string; name: string; realm: number; danger: number; reward: number; sites: readonly Site[]; }
export interface World { id: string; name: string; playable: boolean; regions: readonly Region[]; }

const S = (id: string, name: string, danger: number, reward = 1): Site => ({ id, name, danger, reward });
const R = (id: string, name: string, realm: number, danger: number, reward: number, sites: readonly Site[]): Region => ({ id, name, realm, danger, reward, sites });

export const WORLDS: readonly World[] = [
  {
    id: "ha_gioi", name: "Hạ Giới", playable: true,
    regions: [
      R("pham", "Phàm Nhân Thành", 0, 0, 1.00, [S("pham_thanh", "Thanh Khê Thành", 0), S("pham_rung", "Thanh Khê Lâm", 1, 1.03), S("pham_mieu", "Cổ Miếu Vô Danh", 1, 1.06)]),
      R("thanhvan", "Thanh Vân Sơn", 1, 1, 1.08, [S("thanhvan_chan", "Thanh Vân Sơn Môn", 0), S("thanhvan_khe", "Linh Tuyền Khê", 1, 1.04), S("thanhvan_dinh", "Vọng Vân Đài", 2, 1.08)]),
      R("vanyeu", "Vạn Yêu Lâm", 2, 2, 1.16, [S("vanyeu_ngoai", "Ngoại Lâm", 1), S("vanyeu_hothuy", "Hồ Thúy Tâm", 2, 1.05), S("vanyeu_cay", "Cổ Thụ Yêu Đình", 3, 1.10)]),
      R("hacphong", "Hắc Phong Cốc", 3, 3, 1.25, [S("hacphong_cua", "Phong Khẩu", 2), S("hacphong_mo", "Cổ Khoáng Động", 3, 1.05), S("hacphong_dai", "Tàn Trận Đài", 4, 1.10)]),
      R("thienha", "Thiên Hà Hải", 4, 4, 1.35, [S("thienha_cang", "Thiên Hà Cảng", 3), S("thienha_dao", "Lưu Vân Quần Đảo", 4, 1.05), S("thienha_vuc", "Hải Nhãn Thâm Uyên", 5, 1.10)]),
      R("hoangco", "Hoang Cổ Chi Địa", 5, 5, 1.46, [S("hoangco_bien", "Hoang Cổ Biên Thành", 4), S("hoangco_mo", "Cổ Mộ Quần", 5, 1.06), S("hoangco_dien", "Thái Cổ Tàn Điện", 6, 1.12)]),
      R("hukhong", "Hư Không Liệt Cốc", 6, 6, 1.58, [S("hukhong_tram", "Liệt Không Trạm", 5), S("hukhong_cau", "Đoạn Không Kiều", 6, 1.06), S("hukhong_tam", "Hư Không Tâm Nhãn", 7, 1.12)]),
      R("dangthien", "Đăng Thiên Cổ Lộ", 7, 7, 1.72, [S("dangthien_chan", "Cổ Lộ Khởi Điểm", 6), S("dangthien_dai", "Vấn Đạo Thiên Đài", 7, 1.06), S("dangthien_cua", "Thiên Môn Ngoại Quan", 8, 1.12)]),
      R("thienmon", "Thiên Môn Sơn", 8, 8, 1.88, [S("thienmon_chan", "Thiên Môn Sơn Đạo", 7), S("thienmon_kiep", "Cửu Tiêu Kiếp Hải", 8, 1.06), S("thienmon_dai", "Phi Thăng Đài", 9, 1.12)]),
    ],
  },
  { id: "tien_gioi", name: "Tiên Giới", playable: false, regions: [] },
  { id: "than_gioi", name: "Thần Giới", playable: false, regions: [] },
];

export const worldById = (id: string) => WORLDS.find(w => w.id === id) ?? null;
export const regionById = (worldId: string, regionId: string) => worldById(worldId)?.regions.find(r => r.id === regionId) ?? null;
export const siteById = (worldId: string, regionId: string, siteId: string) => regionById(worldId, regionId)?.sites.find(s => s.id === siteId) ?? null;

export function canTravel(realm: number, worldId: string, regionId: string): boolean {
  const world = worldById(worldId);
  const region = regionById(worldId, regionId);
  return !!world?.playable && !!region && realm >= region.realm;
}
