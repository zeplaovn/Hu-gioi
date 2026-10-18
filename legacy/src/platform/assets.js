/* Nạp ảnh (canvas dùng Image đã preload; DOM dùng đường dẫn). */
"use strict";
(function () {
  const COUNT = {
    vfx: { slash: 8, hit: 8, bolt: 8, break: 8, heal: 8, qi: 8 },
  };

  /* ---- Cấu trúc assets theo 3 đại thế giới chính thức: ha_gioi -> linh_gioi -> tien_gioi ----
     parallax/{world}/{prefix}{far|mid|fore}_{mùa 0..3}.png   (prefix theo tên file thực tế trong từng thư mục)
     player/{male|female}/{world}/{idle|walk|atk}/{n}.png      (n bắt đầu từ 1, số khung tự dò)
     monster/{world}/{loài}/{idle|atk|die}/{n}.png
     vfx/seasons/{mùa}_{biến thể}.png                          */
  const WORLDS = ["ha_gioi", "linh_gioi", "tien_gioi"];
  const BG_PREFIX = { ha_gioi: "", linh_gioi: "tien_", tien_gioi: "than_" };
  // Quái cấp 0..4 -> thư mục loài của từng thế giới (thứ tự yếu -> mạnh, có thể chỉnh tại đây).
  const MON_KIND = {
    ha_gioi: ["wolf", "fox", "bear", "phoenix", "dragon"],
    linh_gioi: ["stone_golem", "legend_fox", "electric_qilin_wolf", "legend_crane", "eastern_dragon"],
    tien_gioi: ["celestial_spirit_wolf", "nine_tailed_fox_spirit", "armored_halberd_warrior", "celestial_knight", "cosmic_mage"],
  };
  const MON_TIERS = 5;
  const HERO_DIR = { sit: "idle", walk: "walk", atk: "atk" };
  const FRAME_MAX = 8;                 // số khung tối đa khi dò ảnh 1.png, 2.png, ...

  const worldId = () => {
    try {
      const g = TT.game, w = TT.maps && TT.maps.currentWorld(g && g.p);
      return w && WORLDS.includes(w.id) ? w.id : "ha_gioi";
    } catch (e) { return "ha_gioi"; }
  };
  const genderDir = () => {
    const g = TT.game;
    return ((g && g.p && g.p.gender) || (g && g.gender)) === "Nữ" ? "female" : "male";
  };

  /* Đường dẫn cũ (bg/, seasons/) được dịch sang cấu trúc mới để code vẽ không phải đổi. */
  const resolve = rel => {
    let m;
    if (rel === "bg/title.png") return "parallax/title.png";
    if ((m = /^bg\/(far|mid|fore)_(\d)\.png$/.exec(rel))) {
      const w = worldId();
      return `parallax/${w}/${BG_PREFIX[w]}${m[1]}_${m[2]}.png`;
    }
    if ((m = /^seasons\/(.+)$/.exec(rel))) return "vfx/seasons/" + m[1];
    return rel;
  };

  const cache = {};
  const load = path => {
    if (!cache[path]) {
      const im = new Image();
      im.src = "assets/" + path;
      cache[path] = im;
    }
    return cache[path];
  };
  const ok = im => im && im.complete && im.naturalWidth > 0;
  const wait = im => new Promise(r => {
    if (im.complete) { r(); return; }
    im.addEventListener("load", r, { once: true });
    im.addEventListener("error", r, { once: true });
  });
  /* Dò các khung 1..max; khi tải xong thì bỏ khung không tồn tại (sửa tại chỗ để tham chiếu cũ vẫn đúng). */
  const probe = (pathOf, max = FRAME_MAX) => {
    const arr = Array.from({ length: max }, (_, i) => load(pathOf(i + 1)));
    arr.ready = Promise.all(arr.map(wait)).then(() => {
      for (let i = arr.length - 1; i >= 0; i--) if (!ok(arr[i])) arr.splice(i, 1);
    });
    return arr;
  };

  const A = TT.A = {
    path: rel => "assets/" + resolve(rel),
    img(rel) { return load(resolve(rel)); },   // Image đã nạp (dùng cho canvas)
    ok,
    frames(group, name) {
      const key = group + ":" + name;
      if (!cache[key]) {
        const n = COUNT[group][name];
        cache[key] = Array.from({ length: n }, (_, i) => A.img(`${group}/${name}_${i}.png`));
      }
      return cache[key];
    },
    hero(name) {
      const g = genderDir(), w = worldId(), key = `hero:${g}:${w}:${name}`;
      if (!cache[key]) {
        // dead / hurt chỉ có 1 ảnh duy nhất (male/ha_gioi), dùng chung cho mọi thế giới & giới tính
        if (name === "dead" || name === "hurt") cache[key] = [load(`player/male/ha_gioi/${name}.png`)];
        else cache[key] = probe(i => `player/${g}/${w}/${HERO_DIR[name]}/${i}.png`);
      }
      return cache[key];
    },
    vfx(name) { return A.frames("vfx", name); },
    season(s, v) { return A.img(`seasons/${s}_${v}.png`); },   // sprite hạt theo mùa: s = 0..3 (Xuân, Hạ, Thu, Đông), v = 0..2
    mon(k, state) {
      const w = worldId(), kinds = MON_KIND[w], key = `mon:${w}:${k}:${state}`;
      if (!cache[key]) {
        const kind = kinds[Math.max(0, Math.min(k, kinds.length - 1))];
        cache[key] = probe(i => `monster/${w}/${kind}/${state}/${i}.png`, 6);
      }
      return cache[key];
    },
    icon: (name, size = 22) => name ? `assets/icons/${name}_${size}.png` : "",
    /** Nạp ảnh dùng trong game cho thế giới + giới tính hiện tại (thế giới khác nạp lười khi cần).
     *  onProgress(đã_xong, tổng) được gọi sau mỗi mục (lỗi cũng tính là xong để không kẹt). */
    preload(onProgress) {
      const units = [];                 // mỗi mục: một Image hoặc một mảng khung
      units.push(A.img("bg/title.png"));
      ["far", "mid", "fore"].forEach(n => { for (let i = 0; i < 4; i++) units.push(A.img(`bg/${n}_${i}.png`)); });
      ["sit", "walk", "atk", "hurt", "dead"].forEach(n => units.push(A.hero(n)));
      Object.keys(COUNT.vfx).forEach(n => units.push(A.vfx(n)));
      for (let k = 0; k < MON_TIERS; k++) ["idle", "atk", "die"].forEach(s => units.push(A.mon(k, s)));
      for (let s = 0; s < 4; s++) for (let v = 0; v < 3; v++) units.push(A.season(s, v));
      for (let i = 1; i <= 6; i++) units.push(A.img(`ui/dice_${i}.png`));
      const farm = ["empty", "seed", "sprout", "grow", "ripe", "wilt", "water", "gold", "fence", "trough", "rune", "scarecrow"];
      farm.forEach(n => units.push(A.img(`farm/${n}.png`)));
      const total = units.length; let done = 0;
      const report = () => { if (onProgress) { try { onProgress(done, total); } catch (e) { /* UI lỗi không được chặn việc nạp */ } } };
      const tick = () => { done++; report(); };
      report();
      return Promise.all(units.map(u => {
        const p = Array.isArray(u) ? (u.ready || Promise.all(u.map(wait))) : wait(u);
        return p.then(tick);
      }));
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
