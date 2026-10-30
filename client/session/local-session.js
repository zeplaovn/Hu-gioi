/* Phiên offline: bên sở hữu đồng hồ và RNG của một người chơi trên thiết bị.
   UI chỉ gọi dispatch(); mọi luật nằm trong engine/. Khi engine chưa READY, phiên chưa có game. */
(function (root) {
  'use strict';
  const H = root.HU_GAME, C = root.HU_COMMANDS;
  class LocalSession {
    constructor({ clock = Date.now, rng = Math.random } = {}) {
      this.clock = clock;
      this.rng = rng;
      this.game = null;
      this.listeners = new Set();
      this.achievements = [];
      if (H.READY) this.replace(H.create(clock()));
    }
    get ready() { return !!this.game; }
    subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
    emit(event) { this.listeners.forEach(fn => fn(event)); }
    replace(state) {
      this.achievements = [];
      this.game = new H.Game(state, this.rng, message => this.emit({ type: 'log', message }));
      return this.game;
    }
    create(profile) { return this.replace(H.createCharacter(profile, this.clock(), this.rng)); }
    collectAchievements() { this.achievements.push(...this.game.checkMeta()); }
    drainAchievements() { return this.achievements.splice(0); }
    dispatch(type, payload = {}) {
      const command = C.validate({ type, payload });
      const now = this.clock();
      this.advance(now);
      const result = C.execute(this.game, command, now);
      this.collectAchievements();
      return result;
    }
    advance(now = this.clock(), offline = false) {
      if (!this.game.s.created) return null;
      const result = this.game.advance(now, offline || now - this.game.s.lastUpdate > 15000);
      this.collectAchievements();
      if (this.game.isDead()) this.emit({ type: 'death', report: result });
      return result;
    }
  }
  root.HU_LOCAL_SESSION = { LocalSession };
})(typeof window !== 'undefined' ? window : globalThis);
