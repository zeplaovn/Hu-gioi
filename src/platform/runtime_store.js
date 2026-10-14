/* Runtime state adapter: game save/meta only live in memory. Database is the persistent source of truth. */
"use strict";
(function () {
  const SAVE = "tu_tien_save_v2", META = "tu_tien_meta_v1", FLAG = "tu_tien_sec_v1";
  const gameKeys = new Set([SAVE, META]);
  const mem = new Map();
  let hydrating = false;
  const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));

  // Remove old local-save payloads from previous versions. Auth/session preferences are untouched.
  try {
    [SAVE, META].forEach(k => [k, k + "_bak", k + "_rejected"].forEach(x => localStorage.removeItem(x)));
    localStorage.removeItem(FLAG);
    localStorage.removeItem("tu_tien_cloud_rev");
    localStorage.removeItem("tu_tien_cloud_uid");
    localStorage.removeItem("tu_tien_cloud_dirty");
  } catch (e) { /* storage may be unavailable; persistent game state is not needed anymore */ }

  const sec = TT.sec;
  const read0 = sec.read.bind(sec), write0 = sec.write.bind(sec);
  const backup0 = sec.backupTime.bind(sec), restore0 = sec.restore.bind(sec);

  sec.read = (key, scope) => gameKeys.has(key)
    ? (mem.has(key) ? { obj: clone(mem.get(key)) } : null)
    : read0(key, scope);

  sec.write = (key, scope, obj) => {
    if (!gameKeys.has(key)) return write0(key, scope, obj);
    if (sec.stale && !hydrating) return false;
    mem.set(key, clone(obj));
    sec.lastSave = { ok: true, t: Date.now() };
    if (!hydrating && TT.cloud && TT.cloud.enabled && TT.cloud.markDirty) TT.cloud.markDirty();
    return true;
  };

  sec.backupTime = (key, scope) => gameKeys.has(key) ? 0 : backup0(key, scope);
  sec.restore = (key, scope) => gameKeys.has(key) ? false : restore0(key, scope);

  TT.readSave = () => {
    const raw = mem.get(SAVE);
    if (!raw || typeof raw !== "object") return { count: 1, player: null };
    const count = Math.max(1, Math.min(1e6, Math.trunc(+raw.count) || 1));
    if (!raw.player) return { count, player: null };
    const p = sec.cleanPlayer(clone(raw.player));
    if (!p) return { count, player: null };
    return { count, player: p };
  };

  TT.writeSave = (count, player) => sec.write(SAVE, "save", { count, player: player || null });

  TT.runtimeStore = {
    snapshot() {
      const s = mem.get(SAVE), m = mem.get(META);
      return { save: s ? clone(s) : null, meta: m && typeof m === "object" ? clone(m) : {} };
    },
    hydrate(save, meta) {
      hydrating = true;
      try {
        mem.clear();
        if (save && typeof save === "object") mem.set(SAVE, clone(save));
        if (meta && typeof meta === "object") mem.set(META, clone(meta));
        if (TT.meta && meta && typeof meta === "object") Object.assign(TT.meta, clone(meta));
        sec.stale = false;
      } finally { hydrating = false; }
    },
    clear() {
      hydrating = true;
      try { mem.clear(); sec.stale = false; } finally { hydrating = false; }
    },
  };
})();
