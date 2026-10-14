/* UI bản đồ thế giới: một cửa sổ, nhiều đại thế giới; gameplay từng map nằm ở module riêng. */
"use strict";
(function () {
  if (!window.TT?.maps || !TT.Game || !TT.ui) return;
  const G = TT.Game.prototype;

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  const realmName = r => TT.REALMS?.[r] || `cảnh giới ${r}`;

  G.openWorldMap = function (initialWorld) {
    if (this.worldMapWin?.overlay?.isConnected) return;
    const m = TT.ui.modal("dlg-box world-map-box", () => close(), { label: "Thiên Vân Địa Đồ" });
    this.worldMapWin = m;
    let worldId = TT.maps.get(initialWorld) ? initialWorld : (this.p?.world || "ha_gioi");
    let selected = this.p?.region || "pham";

    const close = () => {
      m.close();
      if (this.worldMapWin === m) this.worldMapWin = null;
    };

    const renderPreview = (world, body) => {
      const atlas = document.createElement("img");
      atlas.className = "world-preview-atlas";
      atlas.src = world.preview;
      atlas.alt = `Toàn cảnh ${world.name}`;
      atlas.loading = "lazy";
      atlas.decoding = "async";
      const grid = el("div", "world-preview-grid");
      world.regions.forEach((region, i) => {
        const card = el("article", "world-preview-card");
        const copy = el("div", "world-preview-copy");
        copy.append(el("div", "preview-index", String(i + 1).padStart(2, "0")), el("h3", "", region.name), el("p", "dim small", region.desc));
        card.append(copy);
        grid.append(card);
      });
      body.append(
        el("div", "world-lock-note", world.unlockText || "Khu vực chưa mở."),
        atlas,
        grid
      );
    };

    const renderHaGioi = (world, body) => {
      const current = TT.maps.currentRegion(this.p);
      if (!world.regions.some(r => r.id === selected)) selected = current?.id || world.regions[0]?.id;
      const selectedRegion = world.regions.find(r => r.id === selected) || current || world.regions[0];

      const map = el("div", "ha-map-canvas");
      world.regions.forEach((region, i) => {
        const can = TT.maps.canTravel(this.p, region), active = current?.id === region.id;
        const b = el("button", `ha-map-node n${i}${active ? " current" : ""}${selected === region.id ? " selected" : ""}${can ? "" : " locked"}`);
        b.type = "button";
        b.disabled = !can;
        b.setAttribute("aria-label", can ? region.name : `${region.name}, khóa tới ${realmName(region.realm)}`);
        b.append(el("span", "node-dot", active ? "●" : can ? "◆" : "✦"), el("span", "node-name", region.name));
        if (!can) b.append(el("span", "node-lock", realmName(region.realm)));
        b.onclick = () => { selected = region.id; render(); };
        map.append(b);
      });

      const detail = el("section", "map-region-detail");
      const can = TT.maps.canTravel(this.p, selectedRegion), here = current?.id === selectedRegion.id;
      const title = el("div", "map-region-title");
      title.append(el("h3", "", selectedRegion.name), el("span", `danger-tag danger-${Math.min(8, selectedRegion.danger || 0)}`, `Nguy hiểm ${selectedRegion.danger}`));
      const stats = el("div", "map-region-stats");
      stats.append(
        el("span", "", `Yêu cầu: ${realmName(selectedRegion.realm)}`),
        el("span", "", `Thưởng lịch luyện ×${selectedRegion.reward.toFixed(2)}`)
      );
      const go = el("button", `game-btn map-travel-btn${here ? " current" : ""}`, here ? "Đang ở đây" : can ? "Đi tới khu vực" : "Chưa đủ cảnh giới");
      go.type = "button";
      go.disabled = here || !can;
      go.onclick = () => {
        const moved = TT.maps.travel(this.p, world.id, selectedRegion.id);
        if (!moved) return;
        this.log(`Bạn tới ${moved.name}.`, "cyan");
        this.autosave();
        render();
      };
      detail.append(title, el("p", "", selectedRegion.desc), stats, go);
      body.append(map, detail);
    };

    const render = () => {
      const world = TT.maps.get(worldId) || TT.maps.get("ha_gioi");
      m.box.replaceChildren();
      const head = el("div", "world-map-head");
      head.append(el("h2", "mtitle", "Thiên Vân Địa Đồ"), el("p", "dim small", "Mỗi đại thế giới là một map độc lập. Hạ Giới đang hoạt động; Tiên Giới và Thần Giới đã tách kiến trúc để mở rộng theo progression sau này."));

      const tabs = el("div", "world-map-tabs");
      TT.maps.list().forEach(w => {
        const b = el("button", `world-map-tab${w.id === world.id ? " on" : ""}`, w.name);
        b.type = "button";
        b.onclick = () => { worldId = w.id; render(); };
        tabs.append(b);
      });

      const banner = el("div", `world-banner world-${world.id}`);
      const badge = el("span", `world-status ${world.playable === false ? "locked" : "open"}`, world.playable === false ? "Bản đồ mở rộng" : "Đang hoạt động");
      banner.append(el("div", "world-kicker", world.subtitle || ""), el("h2", "", world.name), el("p", "", world.desc || ""), badge);

      const body = el("div", "world-map-body");
      if (world.id === "ha_gioi") renderHaGioi(world, body);
      else renderPreview(world, body);

      const footer = el("div", "world-map-footer");
      const closeBtn = el("button", "game-btn dimbtn", "Đóng");
      closeBtn.type = "button";
      closeBtn.onclick = close;
      footer.append(closeBtn);
      m.box.append(head, tabs, banner, body, footer);
    };

    render();
  };

  // ha_gioi_fix.js tạo nút cũ. Giữ vị trí nhưng đổi entry point thành bản đồ đa thế giới.
  const showGame0 = G.showGame;
  G.showGame = function () {
    const out = showGame0.apply(this, arguments);
    const b = document.querySelector(".world-map-btn");
    if (b) {
      const label = b.querySelector(".btn-label");
      if (label) label.textContent = "Thiên Vân Địa Đồ";
      else if (b.childNodes.length) b.setAttribute("aria-label", "Thiên Vân Địa Đồ");
      b.title = "Mở bản đồ Hạ Giới / Tiên Giới / Thần Giới";
    }
    return out;
  };
})();
