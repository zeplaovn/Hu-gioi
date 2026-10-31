/* Miền luật: time — tick, bế quan và offline. Chỉ bên sở hữu phiên cung cấp đồng hồ. */
(function (root) {
  'use strict';
  const domain = 'time';
  const commands = Object.freeze([]);

  function install(API) {
    const H = API, F = H.F;
    const uniq = xs => [...new Set(xs)];
    const empty = () => ({ seconds: 0, exp: 0, stone: 0, batches: 0, dungeon: null, encounters: [], sect: null, sectReady: false, died: false });

    Object.assign(H.Game.prototype, {
      integrateRate(start, end, eff = 1) {
        const boundaries = uniq([start, end, ...this.s.buffs.filter(b => b.type === 'rate' && b.end > start && b.end < end).map(b => b.end)]).sort((a, b) => a - b);
        let gain = 0;
        for (let i = 1; i < boundaries.length; i++) gain += this.rate(boundaries[i - 1]) * (boundaries[i] - boundaries[i - 1]) / 1000 * eff;
        return gain;
      },
      advance(now, offline = false) {
        const s = this.s;
        if (!Number.isFinite(now)) now = s.lastUpdate;
        const start = s.lastUpdate, elapsed = Math.max(0, (now - start) / 1000);
        if (now < start) { s.lastUpdate = now; return empty(); }
        if (!elapsed) return empty();

        let seconds = offline ? Math.min(elapsed, F.offline_cap(s.offlineCap)) : elapsed;
        const eff = offline ? F.offline_efficiency(s.offlineEff) : 1;
        const maxLife = this.maxLife(), pace = F.aging_speed(s.realm);
        let died = false;
        if (!s.completed && pace > 0 && s.age + pace * seconds >= maxLife) {
          seconds = Math.max(0, (maxLife - s.age) / pace);
          died = true;
          if (seconds <= 0) {
            s.age = Math.max(s.age, maxLife);
            s.lastUpdate = now;
            s.lastSaved = now;
            return { ...empty(), died: true };
          }
        }
        const end = start + seconds * 1000, before = s.stone, beforeExp = s.totalRunExp;
        this.tickDefinedCombat(end, offline);
        this.gainExp(this.integrateRate(start, end, eff));
        s.progress.meditate += seconds;
        s.tick += seconds;
        s.age += pace * seconds;
        if (died) s.age = maxLife;
        else this.warnLife(maxLife);
        for (const key of s.activeManuals) s.learned[key] = Math.min(1, s.learned[key] + seconds / (F.realm_time(s.realm) * .5));
        if (s.sect.joined) s.stone += this.sectIncome() * seconds * eff;
        if (s.auto && offline) {
          const wins = seconds * eff / (this.attackInterval() * 10) * F.win_probability(this.stats(start).CP, this.enemy().CP) + s.offlineKills;
          const n = Math.floor(wins);
          s.offlineKills = wins - n;
          if (n) this.collectLoot(n, true);
        }
        if (s.auto && !offline) {
          s.combatClock += seconds;
          const interval = this.attackInterval();
          let turns = 0;
          while (s.auto && s.combatClock >= interval && turns < 300) {
            s.combatClock -= interval;
            this._strike(1, now, true);
            turns++;
          }
        }
        const st = this.stats(now), rt = this.rootEffects();
        s.hp = Math.min(st.HP, s.hp + st.HP * (.008 + rt.regen) * seconds);
        s.mp = Math.min(this.maxMp(), s.mp + this.maxMp() * .018 * (1 + rt.mpRegen) * seconds);

        const dungeon = this.finishDungeon(now);
        const encounters = this.advanceEncounters(seconds, now, eff);
        const sect = this.finishSect(now, offline);
        const batches = this.finishJobs(now, offline);
        s.buffs = s.buffs.filter(b => b.end > now);
        s.lastUpdate = now;
        s.lastSaved = now;
        this.settleAuction(now);
        return {
          seconds, exp: s.totalRunExp - beforeExp, stone: s.stone - before, batches,
          dungeon, encounters, sect, sectReady: !!s.sect.mission && s.sect.mission.end <= now, died
        };
      }
    });
  }

  const mod = Object.freeze({ domain, commands, install });
  (root.HU_RULES = root.HU_RULES || {})[domain] = mod;
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
})(typeof window !== 'undefined' ? window : globalThis);
