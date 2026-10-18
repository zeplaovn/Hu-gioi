/* Phase 3: nội dung riêng cho 27 địa điểm Hạ Giới. Không thay đổi progression/world unlock. */
"use strict";
(function () {
  if (!window.TT?.maps) return;
  const world = TT.maps.get("ha_gioi");
  if (!world) return;

  const bossNames = [
    "Huyết Nha Sơn Quân", "Thanh Vân Lôi Điểu", "Vạn Mộc Yêu Vương",
    "Hắc Phong Cổ Khôi", "Hải Nhãn Long Linh", "Hoang Cổ Thi Vương",
    "Liệt Không Ma Chủ", "Vấn Đạo Tâm Ma", "Cửu Tiêu Kiếp Linh",
  ];
  const eventNames = ["Dị tượng", "Cơ duyên", "Mật lộ"];
  const accents = ["#8bc5a1", "#8fb7e8", "#76c985", "#b9a177", "#72b6d6", "#b99b7c", "#8f83ce", "#d0a96d", "#d7c9ff"];

  const makeEvent = (region, site, ri, si) => ({
    id: `${site.id}_event`,
    name: `${eventNames[si]} · ${site.name}`,
    text: si === 0
      ? `Linh khí tại ${site.name} đột nhiên dao động, để lộ một dấu vết bị che giấu.`
      : si === 1
        ? `Một luồng khí tức cổ xưa lướt qua ${site.name}, kéo theo cơ duyên khó gặp.`
        : `Bạn phát hiện một lối đi bí mật trong ${site.name}, phía cuối có ánh linh quang chập chờn.`,
    rewardStone: 4 + ri * 5 + si * 3,
    expMonths: 1 + Math.floor((ri + si) / 3),
  });

  const makeLoot = (region, site, ri, si) => [
    { name: site.resources?.[0] || "Tài nguyên bản địa", weight: 55, stone: 4 + ri * 3 + si },
    { name: site.resources?.[1] || "Linh vật hiếm", weight: 30, stone: 7 + ri * 4 + si * 2 },
    { name: `${region.name} Tinh Hoa`, weight: 15, stone: 12 + ri * 6 + si * 3, expMonths: 1 + Math.floor(ri / 3) },
  ];

  for (let ri = 0; ri < world.regions.length; ri++) {
    const region = world.regions[ri];
    for (let si = 0; si < region.sites.length; si++) {
      const site = region.sites[si];
      site.theme = {
        id: `${region.id}-${si}`,
        biome: region.biome,
        accent: accents[ri],
        ambience: `${region.biome} · ${site.kind}`,
      };
      site.specialEvent = makeEvent(region, site, ri, si);
      site.lootTable = makeLoot(region, site, ri, si);
      site.npcInteraction = {
        npc: site.npcs?.[0] || "Tu sĩ vô danh",
        text: `${site.npcs?.[0] || "Một tu sĩ"} đề nghị trao đổi tin tức về ${site.name}.`,
        rewardStone: 3 + ri * 2 + si,
      };
      site.elite = {
        name: `Tinh Anh · ${site.monsters?.[site.monsters.length - 1] || "Yêu Thú"}`,
        powerMul: 1.16 + ri * 0.015 + si * 0.02,
        rewardMul: 1.22 + si * 0.05,
      };
      if (si === region.sites.length - 1) {
        site.boss = {
          name: bossNames[ri],
          powerMul: 1.42 + ri * 0.025,
          rewardMul: 1.65 + ri * 0.035,
          encounterRate: 0.035,
        };
      }
    }
  }

  TT.maps.weightedPick = function (entries, rng = Math.random) {
    if (!Array.isArray(entries) || !entries.length) return null;
    const total = entries.reduce((sum, x) => sum + Math.max(0, Number(x.weight || 0)), 0);
    if (total <= 0) return entries[0] || null;
    let n = rng() * total;
    for (const item of entries) {
      n -= Math.max(0, Number(item.weight || 0));
      if (n <= 0) return item;
    }
    return entries[entries.length - 1];
  };

  TT.maps.applySiteTheme = function (player) {
    const site = this.currentSite(player);
    if (typeof document === "undefined" || !site?.theme) return site?.theme || null;
    document.documentElement?.style?.setProperty("--site-accent", site.theme.accent);
    document.body?.setAttribute("data-site-theme", site.theme.id);
    return site.theme;
  };
})();
