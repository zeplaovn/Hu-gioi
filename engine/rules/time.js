/* Miền luật: time — chỉ tiến triển khi online; vắng mặt đóng băng mọi bộ đếm. Chỉ bên sở hữu phiên cung cấp đồng hồ. */
(function (root) {
  'use strict';
  const domain = 'time';
  const commands = Object.freeze(['setPreference', 'startRetreat', 'stopRetreat', 'acknowledgeRetreat']);

  function install(API) {
    const H = API, F = H.F;
    const uniq = xs => [...new Set(xs)];
    const empty = () => ({ seconds: 0, exp: 0, stone: 0, batches: 0, dungeon: null, encounters: [], sect: null, sectReady: false, died: false });
    const finishRetreat = (s, reason, now) => {
      const active = s.retreat.active;
      if (!active) return s.retreat.report;
      const { end, ...summary } = active;
      s.retreat = { active: null, report: { ...summary, reason, endedAt: now } };
      return s.retreat.report;
    };

    Object.assign(H.Game.prototype, {
      startRetreat(payload, now) {
        const s = this.s;
        if (![1800, 7200, 28800].includes(payload.duration)) throw Error('Thời lượng bế quan không hợp lệ.');
        if (s.retreat?.active) throw Error('Đã có phiên bế quan đang diễn ra.');
        if (s.retreat?.report) throw Error('Hãy xem báo cáo bế quan trước khi bắt đầu phiên mới.');
        if (s.progress.meditate < 60) throw Error('Hãy tu luyện online đủ 60 giây để mở bế quan.');
        if (s.completed) throw Error('Đạo quả kiếp này đã viên mãn.');
        if (s.exploration?.active || s.dungeon?.active || s.dungeon?.run || s.sect?.mission || s.craftQueue.length)
          throw Error('Hãy hoàn tất hoạt động đang làm trước khi bế quan.');
        if (this.isPeakStage() && s.qi >= this.need()) throw Error('Tu vi đã viên mãn. Hãy chuẩn bị độ kiếp.');
        if (this.lifeInfo().seconds <= 300) throw Error('Thọ nguyên còn dưới 5 phút; hãy xử lý trước khi bế quan.');
        s.retreat = { active: { duration: payload.duration, startedAt: now, end: now + payload.duration * 1000,
          seconds: 0, exp: 0, stone: 0, stages: 0, loot: {}, events: [] }, report: null };
        return { duration: payload.duration, end: s.retreat.active.end };
      },
      stopRetreat(payload, now) {
        if (!this.s.retreat?.active && !this.s.retreat?.report) throw Error('Không có phiên bế quan.');
        return finishRetreat(this.s, 'manual', now);
      },
      acknowledgeRetreat() {
        if (!this.s.retreat?.report) throw Error('Không có báo cáo bế quan.');
        this.s.retreat.report = null;
        return true;
      },
      setPreference(payload) {
        const { key, value } = payload;
        const options = {
          season: ['auto', 'spring', 'summer', 'autumn', 'winter'],
          motionMode: ['auto', 'full', 'reduced'],
          musicTrack: ['auto', 'vo_uu']
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
          s.adventurePoints = Math.min(1e9, (s.adventurePoints || 0) + H.EXPLORE_POINTS);
          this.log('Lịch luyện kết thúc · ' + exploring.name + '. ' + exploring.text + ' Điểm lịch luyện +' + H.EXPLORE_POINTS + '.');
          s.exploration.last = exploring;
          s.exploration.active = null;
          if (now <= start) {
            s.lastSaved = now;
            return { ...empty(), explorationFinished: exploring };
          }
          elapsed = Math.max(0, (now - start) / 1000);
        }
        // Resolve an automatic dungeon exactly when it ends, before any later
        // meditation. A fatal run must not grant progress after the death.
        const dungeonEnd = s.dungeon.active?.end;
        if (dungeonEnd > start && dungeonEnd < now) {
          const first = this.advance(dungeonEnd, false);
          if (this.isDead()) {
            s.lastUpdate = now; s.lastSaved = now;
            return { ...first, died: true, cause: s.death?.cause || 'combat',
              explorationFinished: exploring && !s.exploration?.active ? exploring : null };
          }
          const second = this.advance(now, false);
          return { ...second, seconds: first.seconds + second.seconds, exp: first.exp + second.exp,
            stone: first.stone + second.stone, batches: first.batches + second.batches,
            dungeon: second.dungeon || first.dungeon, sect: second.sect || first.sect,
            encounters: [...first.encounters, ...second.encounters],
            explorationFinished: second.explorationFinished || (exploring && !s.exploration?.active ? exploring : null) };
        }
        const workEnd = Math.max(start,
          s.craftQueue.length ? s.craftQueue[s.craftQueue.length - 1].end : start,
          s.dungeon.active?.end || start);
        const trainingStart = s.dungeon.run ? now : Math.min(now, workEnd);
        if (trainingStart < now) {
          for (let i = 0; i < 400 && this.autoStage(); i++); // bản lưu cũ có tu vi đầy
        }

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
        const meditationStart = Math.min(end, Math.max(start, trainingStart));
        const meditationSeconds = Math.max(0, (end - meditationStart) / 1000);
        if (meditationSeconds > 0) this.gainExp(this.integrateRate(meditationStart, end, eff));
        s.progress.meditate += meditationSeconds;
        s.tick += seconds;
        s.age += pace * seconds;
        if (died) { s.age = maxLife; this.markDeath('lifespan', now); }
        else this.warnLife(maxLife);
        for (const key of s.activeManuals) s.learned[key] = Math.min(1, s.learned[key] + meditationSeconds / (F.realm_time(s.realm) * .5));
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

    // Bế quan chỉ theo dõi tiến trình online hiện có. Máy chủ vẫn chạy cùng luật
    // tu luyện; báo cáo dừng ở thời điểm hết phiên, không tạo thêm phần thưởng.
    const advanceTime = H.Game.prototype.advance;
    H.Game.prototype.advance = function (now, offline = false) {
      const s = this.s, active = s.retreat?.active, start = s.lastUpdate;
      if (!active || !Number.isFinite(now) || now <= start) return advanceTime.call(this, now, offline);
      if (offline) {
        const result = advanceTime.call(this, now, true);
        active.end += now - start;
        return result;
      }

      let end = Math.min(now, active.end), reason = now >= active.end ? 'finished' : '';
      const life = this.lifeInfo().seconds;
      if (Number.isFinite(life)) {
        const warningAt = start + Math.max(0, life - 300) * 1000;
        if (warningAt <= end) { end = warningAt; reason = 'life'; }
      }
      // Tính đúng lúc đầy tầng cuối, kể cả khi một heartbeat vượt nhiều tầng.
      let remaining = Math.max(0, this.need() - s.qi);
      for (let stage = s.stage + 1; stage <= F.STAGES[s.realm]; stage++)
        remaining += F.exp_need(s.realm, stage - 1);
      if (remaining <= this.integrateRate(start, end)) {
        let lo = start, hi = end;
        while (hi - lo > 1) {
          const mid = Math.floor((lo + hi) / 2);
          if (this.integrateRate(start, mid) >= remaining) hi = mid;
          else lo = mid;
        }
        end = hi; reason = 'ready';
      }

      const before = { tick: s.tick, exp: s.totalRunExp, stone: s.stone, stage: s.stage, bag: { ...s.bag } };
      const log = this.onLog, events = [];
      this.onLog = message => { events.push(String(message).slice(0, 240)); log?.(message); };
      let first;
      try { first = advanceTime.call(this, end, false); }
      finally { this.onLog = log; }
      active.seconds = Math.min(active.duration, active.seconds + Math.max(0, s.tick - before.tick));
      active.exp += Math.max(0, s.totalRunExp - before.exp);
      active.stone += Math.max(0, s.stone - before.stone);
      active.stages += Math.max(0, s.stage - before.stage);
      for (const [code, count] of Object.entries(s.bag)) {
        const gain = Math.max(0, count - (before.bag[code] || 0));
        if (gain && (Object.hasOwn(active.loot, code) || Object.keys(active.loot).length < 20))
          active.loot[code] = Math.min(1e9, (active.loot[code] || 0) + gain);
      }
      active.events = [...active.events, ...events].slice(-12);
      if (this.isDead()) reason = 'death';
      else if (this.isPeakStage() && s.qi >= this.need()) reason = 'ready';
      if (reason) finishRetreat(s, reason, end);
      if (end >= now || this.isDead()) return first;

      // Sau khi bế quan kết thúc, tiếp tục luật tu luyện thông thường cho phần còn lại.
      const second = advanceTime.call(this, now, false);
      return { ...second, seconds: first.seconds + second.seconds, exp: first.exp + second.exp,
        stone: first.stone + second.stone, batches: first.batches + second.batches,
        dungeon: second.dungeon || first.dungeon, sect: second.sect || first.sect,
        encounters: [...first.encounters, ...second.encounters],
        explorationFinished: second.explorationFinished || first.explorationFinished };
    };
  }

  const mod = Object.freeze({ domain, commands, install });
  (root.HU_RULES = root.HU_RULES || {})[domain] = mod;
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
})(typeof window !== 'undefined' ? window : globalThis);
