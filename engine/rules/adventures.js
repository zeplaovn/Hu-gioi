/* Miền luật: adventures — bí cảnh và kỳ ngộ tự động. */
(function (root) {
  'use strict';
  const domain = 'adventures';
  const commands = Object.freeze(['startDungeon', 'abortDungeon', 'enterDungeon', 'dungeonAct']);
  /* Bí cảnh tương tác: chi phí thể lực mỗi hành động (guard hồi thể lực), thưởng thêm khi tự tay đánh. */
  const RUN = Object.freeze({ attack: 8, power: 24, guardGain: 20, passiveGain: 4, floorGain: 12, healMp: .18, healPct: .26, healCd: 3, bonus: 1.2, logMax: 6, mobHp: .6, mobAtk: .75, bossHp: 1.8, bossAtk: .8 });

  function install(API) {
    const H = API, F = H.F, {
      ELEMENT_NAMES, DUNGEONS, ENCOUNTERS, ENCOUNTER_RARITIES, ENCOUNTER_INTERVAL
    } = H;
    H.DUNGEON_RUN = RUN; // UI đọc chi phí thể lực/hồi chiêu để hiển thị, không tự định giá trị
    const at = (game, now) => Number.isFinite(now) ? now : game.s.lastUpdate;
    const pick = (list, rng) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
    const seedRng = seed => () => {
      seed = (seed + 0x6D2B79F5) >>> 0;
      let t = Math.imul(seed ^ (seed >>> 15), seed | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    Object.assign(H.Game.prototype, {
      dungeonEnemy(d, floor) {
        const boss = floor === d.floors && H.DESIGN.raw.boss.find(x => x['tên boss'] === d.boss);
        if (boss) return F.combat_power(boss.hp, boss.atk, boss.def, boss['crit (%)'] / 100, boss['crit_dame (%)'] / 100);
        const st = F.stats(d.realm, 0), mult = (.48 + .12 * (floor - 1)) * (floor === d.floors ? 1.5 : 1);
        return F.combat_power(st.HP, st.ATK, st.DEF) * mult;
      },
      simulateDungeon(d, snapshot, rng) {
        const st = snapshot.stats;
        const power = F.combat_power(st.HP, st.ATK, st.DEF, st.CRIT) * (1 + snapshot.affinity);
        let hp = snapshot.hp, floors = 0;
        for (let floor = 1; floor <= d.floors; floor++) {
          if (hp < st.HP * .25) break;
          const enemy = this.dungeonEnemy(d, floor), ratio = enemy / Math.max(1, power), mitigation = enemy / (enemy + .6 * st.DEF);
          const boss = floor === d.floors && H.DESIGN.raw.boss.find(x => x['tên boss'] === d.boss);
          let enemyHp = boss ? boss.hp : enemy * 3;
          const enemyMax = enemyHp;
          for (let turn = 0; turn < 40 && hp > 0 && enemyHp > 0; turn++) {
            enemyHp -= power * (.85 + rng() * .3) * (rng() < st.CRIT ? 1.5 : 1);
            if (enemyHp > 0 && rng() >= st.DODGE) {
              const phase = boss ? H.DESIGN.phase(boss['mã boss'], enemyHp / enemyMax)?.multiplier || 1 : 1;
              hp -= st.HP * .045 * ratio * mitigation * phase;
            }
          }
          if (enemyHp > 0) break;
          floors = floor;
        }
        return { floors, hp: Math.max(0, hp) };
      },
      estimateDungeon(id) {
        const d = DUNGEONS.find(x => x.id === id);
        if (!d || d.realm > this.s.realm) return 0;
        return this.simulateDungeon(d, { stats: this.stats(), hp: this.s.hp, affinity: this.affinity(d.element) }, seedRng(7391)).floors;
      },
      _startDungeon(id, now) {
        const s = this.s, d = DUNGEONS.find(x => x.id === id), stats = this.stats(now);
        if (!d || d.realm > s.realm) throw Error('Bí cảnh chưa mở.');
        if (s.dungeon.active || s.dungeon.run || s.sect.mission) throw Error('Hãy hoàn tất chuyến bí cảnh hoặc nhiệm vụ đang nhận.');
        if (s.hp < stats.HP * .5) throw Error('Cần ít nhất 50% sinh lực để vào bí cảnh.');
        s.dungeon.active = {
          id, start: now, end: now + d.seconds * 1000, seed: Math.floor(this.rng() * 4294967296), stats,
          hp: s.hp, affinity: this.affinity(d.element)
        };
        this.log('Bước vào bí cảnh ' + d.name + ' · ' + d.floors + ' tầng · thủ lĩnh ' + d.boss + '.');
        return s.dungeon.active;
      },
      startDungeon(payload, now) { return this._startDungeon(payload.id, at(this, now)); },
      abortDungeon() {
        if (!this.s.dungeon.active) throw Error('Chưa thám hiểm bí cảnh.');
        this.s.dungeon.active = null;
        this.log('Rút khỏi bí cảnh, chuyến đi không có phần thưởng.');
      },
      /* Chốt thưởng một chuyến bí cảnh (tự động hoặc tương tác): ghi kỷ lục, cộng linh thạch/tu vi/tinh hoa, tạo kết quả. */
      grantDungeonReward(d, floors, at, rng, bonus = 1) {
        const s = this.s, record = s.dungeon.records[d.id] || { best: 0, runs: 0, clears: 0, firstAt: 0 };
        const full = floors === d.floors, first = full && record.clears === 0, fraction = floors / d.floors;
        const stone = F.income_rate(d.realm) * d.seconds * .45 * fraction * (first ? 2 : 1) * bonus;
        let exp = this.gainExp(F.base_rate(d.realm) * d.seconds * .35 * fraction * (first ? 2 : 1) * bonus);
        const essence = [0, 0, 0, 0, 0];
        if (full) {
          const boss = H.DESIGN.raw.boss.find(x => x['tên boss'] === d.boss);
          if (boss) {
            const reward = this.rewardDefinedEnemy(boss['mã boss'], 1, rng);
            exp += reward.exp;
            for (const [code, n] of Object.entries(reward.items)) this.log('Thủ lĩnh rơi ' + H.item(code).name + ' ×' + n + '.');
          }
          const i = d.element >= 0 ? d.element : pick(this.activeElements().length ? this.activeElements() : [0, 1, 2, 3, 4], rng);
          essence[i] = 1 + Math.floor(rng() * 2) + (d.floors >= 8 ? 1 : 0) + (first ? 3 : 0) + (bonus > 1 ? 1 : 0);
          this.addEssence(i, essence[i]);
          record.clears++;
          if (first) record.firstAt = at;
        }
        s.stone += stone;
        record.runs++;
        record.best = Math.max(record.best, floors);
        s.dungeon.records[d.id] = record;
        const essText = essence.map((n, i) => n ? n + ' Tinh hoa ' + ELEMENT_NAMES[i] : '').filter(Boolean).join(', ');
        const text = d.name + ' · ' + floors + '/' + d.floors + ' tầng' + (full ? ' · hạ ' + d.boss : ' · rút lui dưỡng thương') +
          (first ? ' · thông quan đầu tiên!' : '.') + ' Nhận ' + F.format_linh_thach(stone) + ', ' + F.fmt(exp) + ' tu vi' + (essText ? ', ' + essText : '') + '.';
        const result = { id: d.id, at, floors, success: full, first, stone, exp, essence, text };
        s.dungeon.last = result;
        this.log('Bí cảnh · ' + text);
        return result;
      },
      finishDungeon(now) {
        const s = this.s, a = s.dungeon.active;
        if (!a || now < a.end) return null;
        const d = DUNGEONS.find(x => x.id === a.id), rng = seedRng(a.seed), sim = this.simulateDungeon(d, a, rng);
        s.dungeon.active = null;
        if (sim.hp <= 0) {
          s.hp = 0; this.markDeath('combat', now);
          this.log('Bí cảnh đoạt mạng đạo thân; không có phần thưởng.');
          return { id: d.id, died: true, why: 'combat', success: false, floors: sim.floors };
        }
        const result = this.grantDungeonReward(d, sim.floors, a.end, rng);
        const maxHp = this.stats(now).HP, loss = Math.max(0, a.hp - sim.hp) / a.stats.HP;
        s.hp = Math.max(0, Math.min(maxHp, s.hp - maxHp * loss));
        return result;
      },
      /* Đối thủ của một tầng trong chuyến tương tác. Chỉ số quy theo cảnh giới bí cảnh để người vừa đủ cảnh giới đánh được;
         thủ lĩnh vẫn dùng tỉ lệ né/bạo kích, giai đoạn và bảng thưởng của dữ liệu thiết kế. */
      runEnemy(d, floor) {
        const design = floor === d.floors && H.DESIGN.raw.boss.find(x => x['tên boss'] === d.boss);
        const st = F.stats(d.realm, 0), mult = .5 + .08 * (floor - 1), last = floor === d.floors;
        return {
          name: last ? d.boss : 'Hộ vệ tầng ' + floor,
          HP: st.HP * mult * (last ? RUN.bossHp : RUN.mobHp), ATK: st.ATK * mult * (last ? RUN.bossAtk : RUN.mobAtk), DEF: st.DEF * mult,
          DODGE: design ? design['eva (%)'] / 100 : 0, CRIT: design ? design['crit (%)'] / 100 : .05,
          CRIT_DMG: design ? design['crit_dame (%)'] / 100 : 1.5, boss: last, id: design ? design['mã boss'] : ''
        };
      },
      rollIntent(boss) { return this.rng() < (boss ? .4 : .25) ? 'heavy' : 'light'; },
      enterDungeon(payload, now) {
        now = at(this, now);
        const s = this.s, d = DUNGEONS.find(x => x.id === payload.id), st = this.stats(now);
        if (!d || d.realm > s.realm) throw Error('Bí cảnh chưa mở.');
        if (s.dungeon.active || s.dungeon.run || s.sect.mission) throw Error('Hãy hoàn tất chuyến bí cảnh hoặc nhiệm vụ đang nhận.');
        if (s.hp < st.HP * .5) throw Error('Cần ít nhất 50% sinh lực để vào bí cảnh.');
        const enemy = this.runEnemy(d, 1), staMax = Math.round(st.STA);
        s.auto = false;
        s.dungeon.run = {
          id: d.id, floor: 1, enemyMax: enemy.HP, enemyHp: enemy.HP, sta: staMax, staMax, turn: 0,
          intent: this.rollIntent(enemy.boss), healCd: 0, cleared: 0, log: ['Bước vào ' + d.name + '. Tầng 1: ' + enemy.name + '.']
        };
        this.log('Vào bí cảnh ' + d.name + ' · tự tay chiến đấu ' + d.floors + ' tầng.');
        return s.dungeon.run;
      },
      _endRun(d, now, why) {
        const s = this.s, run = s.dungeon.run;
        const result = this.grantDungeonReward(d, run.cleared, now, this.rng, RUN.bonus);
        s.dungeon.run = null;
        return { ...result, why };
      },
      dungeonAct(payload, now) {
        now = at(this, now);
        const s = this.s, run = s.dungeon.run, action = payload.action;
        if (!run) throw Error('Chưa vào bí cảnh trực tiếp.');
        const d = DUNGEONS.find(x => x.id === run.id);
        if (action === 'retreat') return { ended: this._endRun(d, now, 'retreat') };
        const st = this.stats(now), enemy = this.runEnemy(d, run.floor), say = text => { run.log.unshift(text); run.log.length = Math.min(RUN.logMax, run.log.length); };
        if ((action === 'attack' || action === 'power') && run.sta < RUN[action]) throw Error('Không đủ thể lực, hãy thủ thế để hồi sức.');
        const healCost = this.maxMp() * RUN.healMp;
        if (action === 'heal') {
          if (run.healCd > 0) throw Error('Hồi phục còn ' + run.healCd + ' lượt nữa.');
          if (s.mp < healCost) throw Error('Không đủ linh khí.');
        }
        let dealt = 0, healed = 0, taken = 0, guarding = false;
        if (action === 'attack' || action === 'power') {
          run.sta -= RUN[action];
          if (this.rng() >= enemy.DODGE) {
            const crit = this.rng() < st.CRIT;
            dealt = F.damage(st.ATK, enemy.DEF, (action === 'power' ? 2.2 : 1) * (1 + this.affinity(d.element)), 0, crit, st.CRIT_DMG);
            run.enemyHp = Math.max(0, run.enemyHp - dealt);
            say((action === 'power' ? 'Trọng kích' : 'Đánh') + (crit ? ' bạo kích' : '') + ' ' + enemy.name + ': −' + F.fmt(dealt) + '.');
          } else say(enemy.name + ' né được đòn của bạn.');
        } else if (action === 'guard') {
          guarding = true;
          run.sta = Math.min(run.staMax, run.sta + RUN.guardGain);
          say('Thủ thế vận khí, thể lực +' + RUN.guardGain + '.');
        } else {
          s.mp -= healCost;
          healed = Math.min(st.HP - s.hp, st.HP * RUN.healPct * (1 + this.rootEffects().heal));
          s.hp += healed;
          run.healCd = RUN.healCd + 1;
          say('Vận công hồi phục: sinh lực +' + F.fmt(healed) + '.');
        }
        if (run.enemyHp <= 0) {
          run.cleared = run.floor;
          if (run.floor >= d.floors) { say('Hạ ' + enemy.name + '!'); return { dealt, healed, taken, ended: this._endRun(d, now, 'clear') }; }
          run.floor++;
          const next = this.runEnemy(d, run.floor);
          run.enemyMax = run.enemyHp = next.HP;
          run.sta = Math.min(run.staMax, run.sta + RUN.floorGain);
          run.intent = this.rollIntent(next.boss);
          run.healCd = Math.max(0, run.healCd - 1);
          run.turn++;
          say('Qua tầng ' + run.cleared + '. Tầng ' + run.floor + ': ' + next.name + '.');
          return { dealt, healed, taken, floorCleared: run.cleared };
        }
        const heavy = run.intent === 'heavy';
        if (this.rng() >= st.DODGE) {
          const phase = enemy.id ? H.DESIGN.phase(enemy.id, run.enemyHp / run.enemyMax)?.multiplier || 1 : 1;
          let hit = F.damage(enemy.ATK, st.DEF, (heavy ? 1.8 : 1) * phase * (1 - this.rootEffects().reduction), 0, this.rng() < enemy.CRIT, enemy.CRIT_DMG);
          if (guarding) hit *= heavy ? .2 : .4;
          taken = this.absorbCombatDamage(hit, now);
          s.hp -= taken;
          say(enemy.name + (heavy ? ' tung đòn nặng' : ' tấn công') + (guarding ? ' (đã thủ thế)' : '') + ': −' + F.fmt(taken) + ' sinh lực.');
        } else say('Bạn né được đòn của ' + enemy.name + '.');
        run.turn++;
        run.healCd = Math.max(0, run.healCd - 1);
        run.sta = Math.min(run.staMax, run.sta + RUN.passiveGain);
        run.intent = this.rollIntent(enemy.boss);
        if (s.hp <= 0) {
          s.hp = 0;
          this.markDeath('combat', now);
          s.dungeon.run = null;
          say('Sinh lực cạn trong bí cảnh. Đạo thân tọa hóa.');
          this.log('Bí cảnh đoạt mạng đạo thân; không có phần thưởng.');
          return { dealt, healed, taken, died: true, ended: { why: 'combat', died: true } };
        }
        return { dealt, healed, taken };
      },
      encounterChance() {
        const t = this.s.talent;
        return Math.min(.5, (.3 + t.phucDuyen * .012 + (t.vanKhi + this.s.meta.upgrades.luck) * .004 + (this.s.race === 'tien_due' ? .03 : 0)) * (1 + H.PAVILION.bonus(this.s.pavilion?.coDuyen)));
      },
      resolveEncounter(ev, now) {
        const s = this.s, mult = ENCOUNTER_RARITIES[ev.rarity].mult, reward = [];
        const exp = () => reward.push('tu vi +' + F.fmt(this.gainExp(F.base_rate(s.realm) * 40 * mult)));
        const essence = all => {
          const els = this.activeElements(), selected = all ? els : [pick(els.length ? els : [0, 1, 2, 3, 4], this.rng)];
          for (const i of selected) { const n = ev.rarity + 1; this.addEssence(i, n); reward.push('Tinh hoa ' + ELEMENT_NAMES[i] + ' +' + n); }
        };
        const itemKinds = { herb: ['HERB'], seed: ['SEED'], pill: ['PILL', 'TU_VI'], material: ['MAT'], manual: ['BT'], break: ['PILL', 'DOT_PHA'] };
        if (itemKinds[ev.effect]) {
          const [kind, effect] = itemKinds[ev.effect];
          const x = this.rewardItem(kind, effect, s.realm, this.rng, F.income_rate(s.realm) * 180 * mult);
          if (x) { this.add(x.code); reward.push(x.name + ' ×1'); } else exp();
        } else if (ev.effect === 'stone' || ev.effect === 'loss') {
          const n = F.income_rate(s.realm) * 45 * mult;
          const gain = ev.effect === 'loss' ? -Math.min(s.stone * .02, n * .3) : n;
          s.stone += gain;
          reward.push((gain < 0 ? 'mất ' : '+') + F.format_linh_thach(Math.abs(gain)));
        } else if (ev.effect === 'hurt') {
          const n = Math.min(Math.max(0, s.hp - 1), this.stats(now).HP * .08);
          s.hp -= n;
          reward.push('sinh lực −' + F.fmt(n));
        } else if (ev.effect === 'heal') {
          const max = this.stats(now).HP, n = Math.min(max - s.hp, max * .3 * mult);
          s.hp += n;
          reward.push('sinh lực +' + F.fmt(n));
          exp();
        } else if (ev.effect === 'essence' || ev.effect === 'allEssence') essence(ev.effect === 'allEssence');
        else if (ev.effect === 'life' || ev.effect === 'insight') {
          const years = Math.max(1, Math.round(F.lifespan(s.realm) * .01));
          s.extraLife += years;
          reward.push('thọ nguyên +' + F.fmt(years) + ' năm');
          if (ev.effect === 'insight') exp();
        } else exp();
        const text = ev.desc + ' ' + reward.join(' · ') + '.', entry = { id: ev.id, at: now, text };
        const journal = s.encounter.journal[ev.id] || { count: 0, firstAt: now, lastAt: now };
        journal.count++; journal.lastAt = now;
        s.encounter.journal[ev.id] = journal;
        s.encounter.total++;
        s.encounter.recent.unshift(entry);
        s.encounter.recent.length = Math.min(12, s.encounter.recent.length);
        this.log('Kỳ ngộ [' + ENCOUNTER_RARITIES[ev.rarity].name + '] ' + ev.name + ': ' + text);
        return entry;
      },
      advanceEncounters(seconds, now, eff = 1) {
        const s = this.s, e = s.encounter, before = e.clock;
        e.clock += seconds * eff;
        const count = Math.floor(e.clock / ENCOUNTER_INTERVAL), found = [];
        e.clock %= ENCOUNTER_INTERVAL;
        if (!count) return found;
        const rareBoost = 1 + s.talent.phucDuyen * .035, luck = s.talent.vanKhi + s.meta.upgrades.luck;
        const pool = ENCOUNTERS.map(ev => ({
          ev,
          weight: ENCOUNTER_RARITIES[ev.rarity].weight / ENCOUNTERS.filter(x => x.rarity === ev.rarity).length *
            (ev.rarity ? rareBoost : 1) / (['loss', 'hurt'].includes(ev.effect) ? 1 + luck * .06 : 1)
        }));
        const total = pool.reduce((n, x) => n + x.weight, 0);
        for (let i = 0; i < count; i++) {
          if (this.rng() >= this.encounterChance()) continue;
          let roll = this.rng() * total, ev = pool[0].ev;
          for (const x of pool) { roll -= x.weight; if (roll <= 0) { ev = x.ev; break; } }
          const at = Math.min(now, s.lastUpdate + ((i + 1) * ENCOUNTER_INTERVAL - before) / eff * 1000);
          found.push(this.resolveEncounter(ev, at));
        }
        return found;
      }
    });
  }

  const mod = Object.freeze({ domain, commands, install });
  (root.HU_RULES = root.HU_RULES || {})[domain] = mod;
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
})(typeof window !== 'undefined' ? window : globalThis);
