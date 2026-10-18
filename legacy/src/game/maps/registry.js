/* Registry chung cho các đại thế giới. Mỗi map lớn tự đăng ký ở file riêng. */
"use strict";
(function () {
  const TT = window.TT;
  if (!TT) return;

  const byId = Object.create(null), order = [];
  const api = TT.maps = {
    byId,
    order,
    defaultWorld: "ha_gioi",

    register(world) {
      if (!world || !world.id || !Array.isArray(world.regions)) throw new Error("invalid_world_map");
      if (byId[world.id]) throw new Error("duplicate_world_map:" + world.id);
      const seen = new Set(), siteSeen = new Set();
      for (const region of world.regions) {
        if (!region || !region.id || seen.has(region.id)) throw new Error("invalid_region:" + world.id);
        seen.add(region.id);
        region.world = world.id;
        region.sites ??= [];
        for (const site of region.sites) {
          if (!site || !site.id || siteSeen.has(site.id)) throw new Error("invalid_site:" + world.id + ":" + region.id);
          siteSeen.add(site.id);
          site.world = world.id;
          site.region = region.id;
        }
      }
      byId[world.id] = world;
      order.push(world.id);
      return world;
    },

    get(id) { return byId[id] || null; },
    list() { return order.map(id => byId[id]); },

    currentWorld(player) {
      return byId[player?.world] || byId[this.defaultWorld] || this.list()[0] || null;
    },

    currentRegion(player) {
      const world = this.currentWorld(player);
      if (!world) return null;
      const allowed = world.regions.filter(r => this.canTravel(player, r));
      return world.regions.find(r => r.id === player?.region && this.canTravel(player, r))
        || allowed[allowed.length - 1]
        || world.regions[0]
        || null;
    },

    currentSite(player) {
      const region = this.currentRegion(player);
      if (!region?.sites?.length) return null;
      return region.sites.find(s => s.id === player?.site) || region.sites[0];
    },

    canEnterWorld(player, world) {
      if (!world || world.playable === false) return false;
      return typeof world.unlock === "function" ? !!world.unlock(player) : true;
    },

    canTravel(player, region) {
      if (!region) return false;
      const world = byId[region.world];
      if (!this.canEnterWorld(player, world)) return false;
      if (typeof region.unlock === "function") return !!region.unlock(player);
      return Number(player?.realm ?? -1) >= Number(region.realm ?? 0);
    },

    travel(player, worldId, regionId) {
      const world = byId[worldId], region = world?.regions.find(r => r.id === regionId);
      if (!region || !this.canTravel(player, region)) return null;
      player.world = world.id;
      player.region = region.id;
      player.site = region.sites?.[0]?.id || null;
      return region;
    },

    travelSite(player, siteId) {
      const region = this.currentRegion(player);
      const site = region?.sites?.find(s => s.id === siteId);
      if (!site || !this.canTravel(player, region)) return null;
      player.world = region.world;
      player.region = region.id;
      player.site = site.id;
      return site;
    },
  };
})();
