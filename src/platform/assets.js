/* Nạp ảnh (canvas dùng Image đã preload; DOM dùng đường dẫn). */
"use strict";
(function () {
  const COUNT = {
    hero: { sit: 3, walk: 6, atk: 5, hurt: 2, dead: 1 },
    vfx: { slash: 8, hit: 8, bolt: 8, break: 8, heal: 8, qi: 8 },
  };
  const MON = { 0: { idle: 4, atk: 4, die: 4 }, 1: { idle: 4, atk: 3, die: 4 }, 2: { idle: 4, atk: 3, die: 4 },
    3: { idle: 4, atk: 3, die: 4 }, 4: { idle: 4, atk: 3, die: 4 } };

  const cache = {};
  const A = TT.A = {
    path: rel => "assets/" + rel,
    img(rel) {                       // Image đã nạp (dùng cho canvas)
      if (!cache[rel]) {
        const im = new Image();
        im.src = "assets/" + rel;
        cache[rel] = im;
      }
      return cache[rel];
    },
    ok: im => im && im.complete && im.naturalWidth > 0,
    frames(group, name) {
      const key = group + ":" + name;
      if (!cache[key]) {
        const n = COUNT[group][name];
        cache[key] = Array.from({ length: n }, (_, i) => A.img(`${group}/${name}_${i}.png`));
      }
      return cache[key];
    },
    hero(name) { return A.frames("hero", name); },
    vfx(name) { return A.frames("vfx", name); },
    season(s, v) { return A.img(`seasons/${s}_${v}.png`); },   // sprite hạt theo mùa: s = 0..3 (Xuân, Hạ, Thu, Đông), v = 0..2
    mon(k, state) {
      const key = `mon:${k}:${state}`;
      if (!cache[key]) cache[key] = Array.from({ length: MON[k][state] }, (_, i) => A.img(`mon/${k}_${state}_${i}.png`));
      return cache[key];
    },
    icon: (name, size = 22) => name ? `assets/icons/${name}_${size}.png` : "",
    preload() {
      const list = [];
      list.push(A.img("bg/title.png"));
      ["far", "mid", "fore"].forEach(n => { for (let i = 0; i < 4; i++) list.push(A.img(`bg/${n}_${i}.png`)); });
      Object.keys(COUNT.hero).forEach(n => list.push(...A.hero(n)));
      Object.keys(COUNT.vfx).forEach(n => list.push(...A.vfx(n)));
      Object.keys(MON).forEach(k => ["idle", "atk", "die"].forEach(s => list.push(...A.mon(+k, s))));
      for (let s = 0; s < 4; s++) for (let v = 0; v < 3; v++) list.push(A.season(s, v));
      for (let i = 1; i <= 6; i++) list.push(A.img(`ui/dice_${i}.png`));
      const farm = ["empty", "seed", "sprout", "grow", "ripe", "wilt", "water", "gold", "fence", "trough", "rune", "scarecrow"];
      farm.forEach(n => list.push(A.img(`farm/${n}.png`)));
      return Promise.all(list.map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; })));
    },
  };

  /* ---- bảng ánh xạ icon ---- */
  const ICON_STAT = { "Tướng Mạo": "portrait", "Phúc Duyên": "charm", "Căn Cốt": "ginseng", "Ngộ Tính": "brain", "Vận Khí": "clover" };
  TT.ICON_STAT = ICON_STAT;

  const ICON_ITEM = {
    "Tụ Khí Đan": "orb_blue", "Hồi Huyết Đan": "orb_green", "Phá Cảnh Đan": "orb_gold", "Trường Thọ Quả": "peach",
    "Hạt Linh Thảo": "clover", "Linh Thảo": "ginseng", "Quặng Linh Thiết": "crystal", "Giấy Phù": "scroll",
    "Cường Lực Phù": "scroll", "Hộ Thân Phù": "scroll", "Phá Cảnh Phù": "scroll",
    "Ngưng Nguyên Đan": "orb_blue", "Hóa Anh Đan": "orb_blue", "Thái Hư Đan": "orb_blue", "Đại Hồi Đan": "orb_green",
    "Thiên Cơ Đan": "orb_gold", "Độ Kiếp Đan": "orb_gold", "Dịch Cân Đan": "brain", "Tạo Hóa Dịch": "brain", "Tục Mệnh Đan": "peach",
    "Phi Kiếm": "sword", "Pháp Bào": "bagua", "Linh Giới": "charm",
    "Linh điền": "ginseng", "Luyện đan": "orb_green", "Vẽ phù lục": "scroll", "Luyện khí": "sword",
  };

  /* ---- ASSET MỚI (cập nhật): huy hiệu công pháp / tông môn, linh thảo, ô đất ---- */
  TT.SKILL_ICON = {
    "Dưỡng Khí Quyết": "meditate", "Thanh Phong Kiếm Pháp": "sword", "Kim Cang Thể": "body",
    "Huyền Thiên Chân Kinh": "scroll", "Cửu Thiên Lôi Pháp": "fist",
  };
  TT.SECT_ICON = { "Thanh Vân Tông": "book_blue", "Huyết Sát Môn": "book_red", "Vạn Dược Cốc": "book_green" };
  // Linh Thảo hiển thị theo phẩm chất (1..4): cỏ, nhân sâm, linh chi, sen băng
  TT.HERB_BY_Q = ["grass", "grass", "ginseng", "lingzhi", "lotus"];
  TT.ITEM_NEW = {
    "Hạt Linh Thảo": "farm/seed.png",
    "Trường Thọ Quả": "plants/fruit_48.png",
    "Nhiệm vụ tông môn": "skills/book_gold_40.png",
    "Kho tông môn": "skills/book_brown_40.png",
    "Linh điền": "farm/ripe.png",
    "Luyện đan": "plants/fire_48.png",
    "Vẽ phù lục": "skills/book_blue_40.png",
    "Luyện khí": "skills/book_brown_40.png",
  };

  TT.herbIcon = q => `assets/plants/${TT.HERB_BY_Q[q] || "grass"}_48.png`;

  // Trả về đường dẫn ảnh icon cho tên vật phẩm / công pháp / chỉ số...
  TT.iconFor = (name, size = 22, q = 0) => {
    if (TT.SKILL_ICON[name]) return `assets/skills/${TT.SKILL_ICON[name]}_40.png`;
    if (TT.SECT_ICON[name]) return `assets/skills/${TT.SECT_ICON[name]}_40.png`;
    if (name === "Linh Thảo") return TT.herbIcon(q || 1);
    if (TT.ITEM_NEW[name]) return "assets/" + TT.ITEM_NEW[name];
    if (name.startsWith("Rời")) return "assets/skills/book_pale_40.png";
    const n = ICON_STAT[name] || ICON_ITEM[name] || (TT.SECTS[name] || name.startsWith("Nhiệm vụ") ? "bagua" : null);
    return n ? A.icon(n, size) : "";
  };
})();
