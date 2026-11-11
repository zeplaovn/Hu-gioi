/* Miền luật: time — chỉ tiến triển khi online; vắng mặt đóng băng mọi bộ đếm. Chỉ bên sở hữu phiên cung cấp đồng hồ. */
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
        if (offline) {
          // Đồng hồ chỉ tiến khi online. Đẩy lịch hẹn tương lai đúng bằng khoảng vắng mặt,
          // không cấp tu vi, tuổi, hồi máu, phần thưởng, kết quả RNG hoặc cooldown.
          const shift = delta => Number.isFinite(delta) ? delta + (now - start) : delta;
          for (const b of [...s.buffs, ...s.debuffs]) if (b.end && b.end > start) b.end = shift(b.end);
          for (let i = 0; i < s.cooldowns.length; i++) if (s.cooldowns[i] > start) s.cooldowns[i] = shift(s.cooldowns[i]);
          for (const job of s.craftQueue) { if (job.start) job.start = shift(job.start); job.end = shift(job.end); }
          for (const plot of s.garden) { plot.plantedAt = shift(plot.plantedAt); plot.end = shift(plot.end); }
          if (s.exploration?.active) {
            s.exploration.active.start = shift(s.exploration.active.start);
            s.exploration.active.end = shift(s.exploration.active.end);
          }
          if (s.sect.mission) {
            s.sect.mission.start = shift(s.sect.mission.start);
            s.sect.mission.end = shift(s.sect.mission.end);
          }
          if (s.dungeon.active) {
            s.dungeon.active.start = shift(s.dungeon.active.start);
            s.dungeon.active.end = shift(s.dungeon.active.end);
          }
          const combat = s.designCombat;
          if (combat) {
            for (const effect of [combat.heal, combat.bleed]) if (effect) {
              if (effect.end) effect.end = shift(effect.end);
              if (effect.last) effect.last = shift(effect.last);
            }
            for (const effect of [...(combat.buffs || []), ...(combat.enemyEffects || [])]) {
              if (effect.end && effect.end > start) effect.end = shift(effect.end);
              // Bảo toàn thời điểm DOT gần nhất, không dồn sát thương offline vào tick đầu khi trở lại.
              if (effect.last && effect.last > 0) effect.last = shift(effect.last);
            }
            if (combat.shieldEnd) combat.shieldEnd = shift(combat.shieldEnd);
            for (const timers of [combat.itemCooldowns, combat.manualCooldowns])
              for (const key of Object.keys(timers || {})) if (timers[key] > start) timers[key] = shift(timers[key]);
          }
          if (s.manualAt > start) s.manualAt = shift(s.manualAt);
          if (s.social?.pvp?.lastAt && s.social.pvp.lastAt + H.PVP_CD > start)
            s.social.pvp.lastAt = shift(s.social.pvp.lastAt);
          for (const friend of Object.values(s.social?.friends || {}))
            if (friend.discussAt > start) friend.discussAt = shift(friend.discussAt);
          // Phiên đấu giá NPC theo giờ riêng của nhân vật; giờ offline không làm nhận hàng tự động.
          if (s.auction) s.auction.pausedMs = Math.max(0, Number(s.auction.pausedMs) || 0) + now - start;
          s.lastUpdate = now;
          s.lastSaved = now;
          return { ...empty(), paused: true };
        }
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
            // Không còn chiến đấu thủ công: trận chạm trán được luận định khi kết thúc
            // lịch luyện theo lựa chọn của người chơi (mặc định là giao chiến).
            exploring.text = this.resolveExplorationMonster(exploring);
          } else if (exploring.kind === 'npc') {
            exploring.text = this.resolveExplorationNpc(exploring);
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

        let seconds = elapsed;
        const eff = 1;
        const maxLife = this.maxLife(), pace = F.aging_speed(s.realm);
        let died = false;
        if (!s.completed && pace > 0 && s.age + pace * seconds >= maxLife) {
          seconds = Math.max(0, (maxLife - s.age) / pace);
          died = true;
          if (seconds <= 0) {
            s.age = Math.max(s.age, maxLife);
            this.markDeath('lifespan', now);
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
        if (died) { s.age = maxLife; this.markDeath('lifespan', now); }
        else this.warnLife(maxLife);
        for (const key of s.activeManuals) s.learned[key] = Math.min(1, s.learned[key] + seconds / (F.realm_time(s.realm) * .5));
        if (s.sect.joined) s.stone += this.sectIncome() * seconds * eff;
        if (s.auto && !offline && !s.dungeon.run) {
          s.combatClock += seconds;
          const interval = this.attackInterval();
          let turns = 0;
          while (s.auto && !this.isDead() && s.combatClock >= interval && turns < 300) {
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

        if (this.isDead()) {
          s.lastUpdate = now; s.lastSaved = now;
          return { ...empty(), died: true, cause: s.death?.cause || 'lifespan' };
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
