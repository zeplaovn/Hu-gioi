/* Persistence/balance guard for critical gameplay outcomes. */
"use strict";
(function () {
  if (!TT.Game) return;
  const G = TT.Game.prototype;
  const syncOnly = () => {
    if (TT.cloud && TT.cloud.enabled && TT.cloud.syncNow) Promise.resolve(TT.cloud.syncNow()).catch(() => {});
  };

  // Keep all user-facing descriptions aligned with the effective breakthrough cap.
  for (const name of ["Phá Cảnh Đan", "Thiên Cơ Đan", "Độ Kiếp Đan"]) {
    const it = TT.ITEMS && TT.ITEMS[name];
    if (it && typeof it.desc === "string") it.desc = it.desc.replace(/tối đa 40%/g, "tối đa 30%");
  }

  // Terminal methods already wrote the correct null/new-life snapshot. Never let the generic
  // critical barrier autosave the dead character back over that terminal state.
  const critical0 = G.syncCritical;
  if (typeof critical0 === "function") {
    G.syncCritical = function () {
      if (this.dead) { syncOnly(); return; }
      return critical0.apply(this, arguments);
    };
  }

  // Shop pills historically allowed 40%. Clamp immediately after the transaction and explicitly
  // tell the player when excess medicinal force is discarded.
  const buy0 = G.buy;
  if (typeof buy0 === "function") {
    G.buy = function (name) {
      const before = this.p ? this.p.pill || 0 : 0;
      const r = buy0.apply(this, arguments);
      const it = TT.ITEMS && TT.ITEMS[name];
      if (it && it.kind === "pill" && this.p && this.p.pill > 0.30) {
        this.p.pill = 0.30;
        if (before < 0.30) this.log("Dược lực Phá Cảnh đã đạt giới hạn 30%; phần vượt quá tự tiêu tán.", "dim");
        this.refresh?.(); this.autosave?.(); syncOnly();
      }
      return r;
    };
  }

  // Some combat/encounter rewards are applied after their visual delay. Flush once more after
  // those delayed mutations land so a reload cannot roll the reward/result back.
  const gainFx0 = G.gainFx;
  if (typeof gainFx0 === "function") {
    G.gainFx = function () { const r = gainFx0.apply(this, arguments); this.syncCritical?.(); return r; };
  }
  const fight0 = G.fight;
  if (typeof fight0 === "function") {
    G.fight = function () {
      const r = fight0.apply(this, arguments);
      setTimeout(() => { if (this.inGame && !this.dead) this.syncCritical?.(); }, 800);
      return r;
    };
  }

  // Craft ingredients are saved when crafting starts; crafted output must also be flushed when
  // the minigame resolves so a reload cannot discard a successful rare craft.
  const openCraft0 = G.openCraft;
  if (typeof openCraft0 === "function") {
    G.openCraft = function (title, stages, onDone) {
      const guarded = typeof onDone === "function" ? (score => {
        const r = onDone(score);
        this.syncCritical?.();
        return r;
      }) : onDone;
      return openCraft0.call(this, title, stages, guarded);
    };
  }
})();
