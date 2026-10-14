/* Persistence guard for critical gameplay outcomes. */
"use strict";
(function () {
  if (!TT.Game) return;
  const G = TT.Game.prototype;
  const syncOnly = () => {
    if (TT.cloud && TT.cloud.enabled && TT.cloud.syncNow) Promise.resolve(TT.cloud.syncNow()).catch(() => {});
  };

  // Terminal methods already wrote the correct null/new-life snapshot. Never let the generic
  // critical barrier autosave the dead character back over that terminal state.
  const critical0 = G.syncCritical;
  if (typeof critical0 === "function") {
    G.syncCritical = function () {
      if (this.dead) { syncOnly(); return; }
      return critical0.apply(this, arguments);
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
})();
