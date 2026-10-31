/* Miền luật: adventures — bí cảnh và kỳ ngộ tự động. */
(function (root) {
  'use strict';
  const domain = 'adventures';
  const commands = Object.freeze(['startDungeon', 'abortDungeon']);

  function install(API) {
    const H = API, F = H.F, {
      ELEMENT_NAMES, DUNGEONS, ENCOUNTERS, ENCOUNTER_RARITIES, ENCOUNTER_INTERVAL
    } = H;
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
        return { floors, hp: Math.max(st.HP * .1, hp) };
      },
      estimateDungeon(id) {
        const d = DUNGEONS.find(x => x.id === id);
        if (!d || d.realm > this.s.realm) return 0;
        return this.simulateDungeon(d, { stats: this.stats(), hp: this.s.hp, affinity: this.affinity(d.element) }, seedRng(7391)).floors;
      },
      _startDungeon(id, now) {
        const s = this.s, d = DUNGEONS.find(x => x.id === id), stats = this.stats(now);
        if (!d || d.realm > s.realm) throw Error('Bí cảnh chưa mở.');
        if (s.dungeon.active || s.sect.mission) throw Error('Hãy hoàn tất chuyến bí cảnh hoặc nhiệm vụ đang nhận.');
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
      finishDungeon(now) {
        const s = this.s, a = s.dungeon.active;
        if (!a || now < a.end) return null;
        const d = DUNGEONS.find(x => x.id === a.id), rng = seedRng(a.seed), sim = this.simulateDungeon(d, a, rng);
        const record = s.dungeon.records[d.id] || { best: 0, runs: 0, clears: 0, firstAt: 0 };
        const full = sim.floors === d.floors, first = full && record.clears === 0;
        const fraction = sim.floors / d.floors;
        const stone = F.income_rate(d.realm) * d.seconds * .45 * fraction * (first ? 2 : 1);
        let exp = this.gainExp(F.base_rate(d.realm) * d.seconds * .35 * fraction * (first ? 2 : 1));
        const essence = [0, 0, 0, 0, 0];
        if (full) {
          const boss = H.DESIGN.raw.boss.find(x => x['tên boss'] === d.boss);
          if (boss) {
            const reward = this.rewardDefinedEnemy(boss['mã boss'], 1, rng);
            exp += reward.exp;
            for (const [code, n] of Object.entries(reward.items)) this.log('Thủ lĩnh rơi ' + H.item(code).name + ' ×' + n + '.');
          }
          const i = d.element >= 0 ? d.element : pick(this.activeElements().length ? this.activeElements() : [0, 1, 2, 3, 4], rng);
          essence[i] = 1 + Math.floor(rng() * 2) + (d.floors >= 8 ? 1 : 0) + (first ? 3 : 0);
          this.addEssence(i, essence[i]);
          record.clears++;
          if (first) record.firstAt = a.end;
        }
        s.stone += stone;
        record.runs++;
        record.best = Math.max(record.best, sim.floors);
        s.dungeon.records[d.id] = record;
        const maxHp = this.stats(now).HP, loss = Math.max(0, a.hp - sim.hp) / a.stats.HP;
        s.hp = Math.min(maxHp, Math.max(maxHp * .1, s.hp - maxHp * loss) + maxHp * (.008 + this.rootEffects().regen) * Math.min(F.offline_cap(s.offlineCap), (now - a.end) / 1000));
        const essText = essence.map((n, i) => n ? n + ' Tinh hoa ' + ELEMENT_NAMES[i] : '').filter(Boolean).join(', ');
        const text = d.name + ' · ' + sim.floors + '/' + d.floors + ' tầng' + (full ? ' · hạ ' + d.boss : ' · rút lui dưỡng thương') +
          (first ? ' · thông quan đầu tiên!' : '.') + ' Nhận ' + F.format_linh_thach(stone) + ', ' + F.fmt(exp) + ' tu vi' + (essText ? ', ' + essText : '') + '.';
        s.dungeon.active = null;
        const result = { id: d.id, at: a.end, floors: sim.floors, success: full, first, stone, exp, essence, text };
        s.dungeon.last = result;
        this.log('Bí cảnh · ' + text);
        return result;
      },
      encounterChance() {
        const t = this.s.talent;
        return Math.min(.5, .3 + t.phucDuyen * .012 + (t.vanKhi + this.s.meta.upgrades.luck) * .004 + (this.s.race === 'tien_due' ? .03 : 0));
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
        e.clock += Math.min(seconds, F.offline_cap(s.offlineCap)) * eff;
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
