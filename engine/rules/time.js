/* Miền luật: time — tick, bế quan và offline. Chỉ bên sở hữu phiên cung cấp đồng hồ. */
(function (root) {
  'use strict';
  const domain = 'time';
  const commands = Object.freeze(['setPreference']);

  function install(API) {
    const H = API, F = H.F;
    const uniq = xs => [...new Set(xs)];
    const empty = () => ({ seconds: 0, exp: 0, stone: 0, batches: 0, dungeon: null, encounters: [], sect: null, sectReady: false, died: false });

    Object.assign(H.Game.prototype, {
      setPreference(payload) {
        const { key, value } = payload;
        const options = {
          season: ['auto', 'spring', 'summer', 'autumn', 'winter'],
          motionMode: ['auto', 'full', 'reduced'],
          musicTrack: ['auto', 'hu_gioi', 'ngoc_hoa_tram', 'thien_thu']
        };
        const bools = ['seasonEffects', 'cultivationEffects', 'combatEffects', 'music'];
        const valid = Object.hasOwn(options, key) ? options[key].includes(value)
          : bools.includes(key) ? typeof value === 'boolean'
            : key === 'musicVolume' ? Number.isInteger(value) && value >= 0 && value <= 100 : false;
        if (!valid) throw Error('Cài đặt không hợp lệ.');
        this.s.settings[key] = value;
        if (key === 'motionMode') this.s.settings.reducedMotion = value === 'reduced';
        return value;
      },
      integrateRate(start, end, eff = 1) {
        const boundaries = uniq([start, end, ...this.s.buffs.filter(b => b.type === 'rate' && b.end > start && b.end < end).map(b => b.end)]).sort((a, b) => a - b);
        let gain = 0;
        for (let i = 1; i < boundaries.length; i++) gain += this.rate(boundaries[i - 1]) * (boundaries[i] - boundaries[i - 1]) / 1000 * eff;
        return gain;
      },
      advance(now, offline = false) {
        const s = this.s;
        if (!Number.isFinite(now)) now = s.lastUpdate;
        let start = s.lastUpdate, elapsed = Math.max(0, (now - start) / 1000);
        if (now < start) { s.lastUpdate = now; return empty(); }
        if (!elapsed) return empty();
        s.auto = false; // Không còn tự chiến khi nhập định.
        const exploring = s.exploration?.active;
        if (exploring) {
          // Mỗi khoảng thời gian chỉ được tạm dừng đúng một lần, cả khi thoát game.
          const pauseMs = Math.max(0, Math.min(now, exploring.end) - Math.max(start, exploring.start));
          if (pauseMs > 0) {
            for (const buff of s.buffs) if (buff.type === 'rate') buff.end += pauseMs;
            for (const job of s.craftQueue) job.end += pauseMs;
            for (const plot of s.garden) { plot.plantedAt += pauseMs; plot.end += pauseMs; }
            if (s.sect.mission) { s.sect.mission.start += pauseMs; s.sect.mission.end += pauseMs; }
            if (s.dungeon.active) { s.dungeon.active.start += pauseMs; s.dungeon.active.end += pauseMs; }
          }
          if (now < exploring.end) {
            s.lastUpdate = now;
            s.lastSaved = now;
            return { ...empty(), exploring: true, remaining: Math.max(0, exploring.end - now) };
          }
          s.lastUpdate = exploring.end;
          start = exploring.end;
          // Một chuyến lịch luyện chỉ sinh một kỳ ngộ, trao kết quả lúc trở về.
          if (exploring.kind === 'encounter' && exploring.eventId) {
            const event = H.ENCOUNTERS.find(v => v.id === exploring.eventId);
            if (event) {
              const result = this.resolveEncounter(event, exploring.end);
              exploring.text = result.text;
            }
          } else if (exploring.kind === 'monster' && !exploring.cleared) {
            // Không còn chiến đấu thủ công: trận chạm trán được luận định khi
            // kết thúc lịch luyện, không phát sinh tiến trình đánh quái mỗi giây.
            const foe = this.enemy(), chance = F.win_probability(this.stats(exploring.end).CP, foe.CP);
            if (this.rng() < chance) {
              this.collectLoot(1, false);
              exploring.cleared = true;
              exploring.text = 'Đã vượt qua ' + exploring.name + ', thu nhận chiến lợi phẩm.';
            } else {
              exploring.text = 'Gặp ' + exploring.name + ', đạo thân tránh được hiểm họa nhưng chưa thể thu được chiến lợi phẩm.';
            }
          }
          this.log('Lịch luyện kết thúc · ' + exploring.name + '. ' + exploring.text);
          s.exploration.last = exploring;
          s.exploration.active = null;
          if (now <= start) {
            s.lastSaved = now;
            return { ...empty(), explorationFinished: exploring };
          }
          elapsed = Math.max(0, (now - start) / 1000);
        }
        for (let i = 0; i < 400 && this.autoStage(); i++); // bản lưu cũ có tu vi đầy ở tiểu cảnh giới

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
        if (s.auto && offline && !s.dungeon.run) {
          const wins = seconds * eff / (this.attackInterval() * 10) * F.win_probability(this.stats(start).CP, this.enemy().CP) + s.offlineKills;
          const n = Math.floor(wins);
          s.offlineKills = wins - n;
          if (n) this.collectLoot(n, true);
        }
        if (s.auto && !offline && !s.dungeon.run) {
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
        if (!s.dungeon.run) { // đang đánh bí cảnh từng lượt thì không tự hồi, tránh chờ đợi để hồi đầy
          s.hp = Math.min(st.HP, s.hp + st.HP * (.008 + rt.regen) * seconds);
          s.mp = Math.min(this.maxMp(), s.mp + this.maxMp() * .018 * (1 + rt.mpRegen) * seconds);
        }

        const dungeon = this.finishDungeon(now);
        // Kỳ ngộ chỉ phát sinh khi gieo cơ duyên trong Lịch luyện; không còn xuất hiện từ tu vi thụ động.
        const encounters = [];
        const sect = this.finishSect(now, offline);
        const batches = this.finishJobs(now, offline);
        s.buffs = s.buffs.filter(b => b.end > now);
        s.lastUpdate = now;
        s.lastSaved = now;
        this.settleAuction(now);
        return {
          explorationFinished: exploring && !s.exploration?.active ? exploring : null,
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
