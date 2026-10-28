/* Phiên offline. UI gọi dispatch(); đồng hồ/RNG thuộc adapter này. */
(function(root){
  'use strict';
  const H = root.HU_GAME, C = root.HU_COMMANDS;
  class LocalSession {
    constructor({ clock = Date.now, rng = Math.random } = {}) {
      this.clock = clock; this.rng = rng;
      this.listeners = new Set(); this.achievements = [];
      this.replace(H.create(clock()));
    }
    subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
    emit(event) { this.listeners.forEach(fn => fn(event)); }
    replace(state) {
      this.achievements = [];
      this.game = new H.Game(state, this.rng, message => this.emit({ type: 'log', message }));
      return this.game;
    }
    create(profile) { return this.replace(H.createCharacter(profile,this.clock(),this.rng)); }
    collectAchievements() { this.achievements.push(...this.game.checkMeta()); }
    drainAchievements() { return this.achievements.splice(0); }
    dispatch(type, payload = {}) {
      const command = C.validate({ type, payload });
      const now = this.clock();
      this.advance(now);
      const result = C.execute(this.game,command,now);
      this.collectAchievements();
      return result;
    }
    advance(now = this.clock(), offline = false) {
      if (!this.game.s.created) return null;
      const result = this.game.advance(now,offline || now - this.game.s.lastUpdate > 15000);
      this.collectAchievements();
      if (this.game.isDead()) this.emit({ type: 'death', report: result });
      return result;
    }
  }
  root.HU_LOCAL_SESSION = { LocalSession };
})(typeof window !== 'undefined' ? window : globalThis);
