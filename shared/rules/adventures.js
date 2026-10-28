/* Bí cảnh, kỳ ngộ, tông môn và tôi luyện. Quy tắc thuần, không DOM/storage. */
(function (root) {
  'use strict';
  const node = typeof module !== 'undefined' && module.exports;
  const D = node ? require('../data/adventures.js') : root.HU_ADVENTURE_DATA;
  const RT = node ? require('../data/roots.js') : root.HU_ROOTS;
  const { ELEMENT_NAMES, BEATS, TEMPER_EFFECTS, TEMPER_MAX, DUNGEONS, ENCOUNTERS, ENCOUNTER_RARITIES, ENCOUNTER_INTERVAL, SECTS, SECT_RANKS, SECT_MISSIONS, SECT_SHOP } = D;
  const number = (v, fallback = 0, max = 1e100) => Number.isFinite(Number(v)) ? Math.max(0, Math.min(max, Number(v))) : fallback;
  const int = (v, fallback = 0, max = 1e9) => Math.floor(number(v, fallback, max));
  const object = v => v && typeof v === 'object' && !Array.isArray(v);
  const pick = (list, rng) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
  const seedRng = seed => () => {
    seed = (seed + 0x6D2B79F5) >>> 0;
    let t = Math.imul(seed ^ (seed >>> 15), seed | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const sectDefault = () => ({ joined: false, id: '', contribution: 0, earned: 0, blessing: false, claimedDay: '', mission: null, missionsDone: 0, repeat: false, last: null });
  const defaults = () => ({
    sect: sectDefault(),
    rootCraft: { essence: [0, 0, 0, 0, 0], levels: [0, 0, 0, 0, 0] },
    dungeon: { active: null, records: {}, last: null },
    encounter: { index: 0, usedAt: 0, clock: 0, total: 0, journal: {}, recent: [] }
  });
  let H, F;
  function normalize(s, raw, now) {
    s.rootCraft = {
      essence: ELEMENT_NAMES.map((_, i) => int(raw.rootCraft?.essence?.[i])),
      levels: ELEMENT_NAMES.map((_, i) => s.roots[i] >= 50 ? int(raw.rootCraft?.levels?.[i], 0, TEMPER_MAX) : 0)
    };
    const old = raw.sect || {}, joined = !!old.joined;
    const id = joined ? (SECTS.some(x => x.id === old.id) ? old.id : 'thanhvan') : '';
    s.sect = { ...sectDefault(), joined, id, contribution: number(old.contribution),
      earned: Math.max(number(old.earned), number(old.contribution), raw.version < 7 ? int(old.missionsDone) * 35 : 0),
      blessing: joined && !!old.blessing, claimedDay: String(old.claimedDay || '').slice(0, 10),
      missionsDone: int(old.missionsDone), repeat: joined && !!old.repeat };
    const g = new H.Game(s), m = old.mission, def = SECT_MISSIONS.find(x => x.id === m?.id);
    if (joined && object(m) && def && g.sectMissions().includes(def) && Number.isFinite(Number(m.end))) {
      const end = number(m.end, now, now + def.seconds * 1000);
      s.sect.mission = { id: def.id, start: Math.min(end, number(m.start, Math.max(0, end - def.seconds * 1000), now)), end,
        realm: int(m.realm, s.realm, s.realm), stage: Math.max(1, int(m.stage, s.stage, F.STAGES[s.realm])),
        featured: !!m.featured, chance: def.legacy ? 1 : Math.max(.1, number(m.chance, .8, .98)) };
    }
    const cleanResult = (v, defs) => {
      if (!object(v) || !defs.some(d => d.id === v.id)) return null;
      return { id: v.id, at: number(v.at, 0, now), text: String(v.text || '').slice(0, 500),
        stone: number(v.stone), exp: number(v.exp), contribution: int(v.contribution), success: !!v.success,
        floors: int(v.floors, 0, 10), first: !!v.first, essence: ELEMENT_NAMES.map((_, i) => int(v.essence?.[i])) };
    };
    s.sect.last = cleanResult(old.last, SECT_MISSIONS);
    s.dungeon = { active: null, records: {}, last: cleanResult(raw.dungeon?.last, DUNGEONS) };
    for (const d of DUNGEONS) {
      const r = raw.dungeon?.records?.[d.id];
      if (!object(r)) continue;
      s.dungeon.records[d.id] = { best: int(r.best, 0, d.floors), runs: int(r.runs), clears: int(r.clears), firstAt: number(r.firstAt, 0, now) };
    }
    const a = raw.dungeon?.active, dungeon = DUNGEONS.find(d => d.id === a?.id);
    if (object(a) && dungeon && s.realm >= dungeon.realm && object(a.stats) && !s.sect.mission && Number.isFinite(Number(a.end))) {
      const end = number(a.end, now, now + dungeon.seconds * 1000), st = {};
      for (const k of ['HP', 'ATK', 'DEF', 'CRIT', 'DODGE']) st[k] = number(a.stats[k], 0, k === 'CRIT' ? .75 : k === 'DODGE' ? .6 : 1e50);
      if (st.HP > 0 && st.ATK > 0) s.dungeon.active = { id: dungeon.id, start: Math.min(end, number(a.start, end - dungeon.seconds * 1000, now)), end,
        seed: int(a.seed, 1, 4294967295), stats: st, hp: number(a.hp, st.HP, st.HP), affinity: Math.max(-.35, Math.min(.6, Number(a.affinity) || 0)) };
    }
    const e = raw.encounter || {};
    s.encounter = { index: int(e.index), usedAt: number(e.usedAt, 0, now), clock: number(e.clock, 0, ENCOUNTER_INTERVAL - .001), total: 0, journal: {}, recent: [] };
    for (const d of ENCOUNTERS) {
      const r = e.journal?.[d.id];
      if (!object(r) || !int(r.count)) continue;
      s.encounter.journal[d.id] = { count: int(r.count), firstAt: number(r.firstAt, 0, now), lastAt: number(r.lastAt, 0, now) };
      s.encounter.total += int(r.count);
    }
    if (Array.isArray(e.recent)) s.encounter.recent = e.recent.filter(v => object(v) && ENCOUNTERS.some(d => d.id === v.id)).slice(0, 12)
      .map(v => ({ id: v.id, at: number(v.at, 0, now), text: String(v.text || '').slice(0, 500) }));
  }
  function install(api) {
    H = api; F = H.F;
    Object.assign(H, D);
    Object.assign(H.Game.prototype, {
      activeElements() { return ELEMENT_NAMES.map((_, i) => i).filter(i => this.s.roots[i] >= 50); },
      rootEffects() {
        const out = { attack: 0, hp: 0, guard: 0, rate: 0, crit: 0, dodge: 0, regen: 0 };
        const els = this.activeElements(), scale = 1 / Math.sqrt(Math.max(1, els.length));
        for (const i of els) for (const [key, value] of Object.entries(TEMPER_EFFECTS[i])) out[key] += value * this.s.rootCraft.levels[i] * scale;
        // Dị linh căn có thế mạnh riêng; Hỗn Độn bao trùm cả bốn Dị nên nhận 50% mỗi loại.
        const di = this.s.rootType === 'Dị' ? [[this.s.rootSub, 1]] : this.s.rootType === 'Hỗn Độn' ? RT.DI_KEYS.map(k => [k, .5]) : [];
        for (const [k, w] of di) for (const [key, value] of Object.entries(RT.DI_LINH_CAN[k]?.effects || {})) out[key] += value * w;
        return out;
      },
      temperCost(i) { return 2 + 2 * (this.s.rootCraft.levels[i] || 0); },
      temperRoot(i) {
        if (!Number.isInteger(i) || !this.activeElements().includes(i)) throw Error('Chỉ tôi luyện hệ linh căn đạt 50 điểm.');
        const c = this.s.rootCraft, cost = this.temperCost(i);
        if (c.levels[i] >= TEMPER_MAX) throw Error('Đã tôi luyện tối đa.');
        if (c.essence[i] < cost) throw Error('Không đủ Tinh hoa ' + ELEMENT_NAMES[i] + '.');
        c.essence[i] -= cost; c.levels[i]++;
        this.log('Tôi luyện linh căn ' + ELEMENT_NAMES[i] + ' · cấp ' + c.levels[i] + '/' + TEMPER_MAX + '.');
        return c.levels[i];
      },
      addEssence(i, n) { this.s.rootCraft.essence[i] = Math.min(1e9, this.s.rootCraft.essence[i] + n); },
      affinity(element) {
        if (element < 0) return 0;
        const els = this.activeElements(), scale = 1 / Math.sqrt(Math.max(1, els.length));
        const a = els.reduce((sum, i) => sum + ((i === element ? .2 : BEATS[i] === element ? .3 : 0) * (1 + .08 * this.s.rootCraft.levels[i]) - (BEATS[element] === i ? .25 : 0)) * scale, 0);
        return Math.max(-.35, Math.min(.6, a));
      },
      dungeonEnemy(d, floor) {
        const st = F.stats(d.realm, 0), mult = (.48 + .12 * (floor - 1)) * (floor === d.floors ? 1.5 : 1);
        return F.combat_power(st.HP, st.ATK, st.DEF) * mult;
      },
      simulateDungeon(d, snapshot, rng) {
        const st = snapshot.stats, power = F.combat_power(st.HP, st.ATK, st.DEF, st.CRIT) * (1 + snapshot.affinity);
        let hp = snapshot.hp, floors = 0;
        for (let floor = 1; floor <= d.floors; floor++) {
          if (hp < st.HP * .25) break;
          const enemy = this.dungeonEnemy(d, floor), ratio = enemy / Math.max(1, power), mitigation = enemy / (enemy + .6 * st.DEF);
          let enemyHp = enemy * 3;
          for (let turn = 0; turn < 40 && hp > 0 && enemyHp > 0; turn++) {
            enemyHp -= power * (.85 + rng() * .3) * (rng() < st.CRIT ? 1.5 : 1);
            if (enemyHp > 0 && rng() >= st.DODGE) hp -= st.HP * .045 * ratio * mitigation;
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
      startDungeon(id, now = this.s.lastUpdate) {
        const s = this.s, d = DUNGEONS.find(x => x.id === id), stats = this.stats(now);
        if (!d || d.realm > s.realm) throw Error('Bí cảnh chưa mở.');
        if (s.dungeon.active || s.sect.mission) throw Error('Hãy hoàn tất chuyến bí cảnh hoặc nhiệm vụ đang nhận.');
        if (s.hp < stats.HP * .5) throw Error('Cần ít nhất 50% sinh lực để vào bí cảnh.');
        s.dungeon.active = { id, start: now, end: now + d.seconds * 1000, seed: Math.floor(this.rng() * 4294967296), stats,
          hp: s.hp, affinity: this.affinity(d.element) };
        this.log('Bước vào bí cảnh ' + d.name + ' · ' + d.floors + ' tầng · thủ lĩnh ' + d.boss + '.');
        return s.dungeon.active;
      },
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
        const fraction = sim.floors / d.floors, stone = F.income_rate(d.realm) * d.seconds * .45 * fraction * (first ? 2 : 1);
        const exp = this.gainExp(F.base_rate(d.realm) * d.seconds * .35 * fraction * (first ? 2 : 1));
        const essence = [0, 0, 0, 0, 0];
        if (full) {
          const i = d.element >= 0 ? d.element : pick(this.activeElements().length ? this.activeElements() : [0, 1, 2, 3, 4], rng);
          essence[i] = 1 + Math.floor(rng() * 2) + (d.floors >= 8 ? 1 : 0) + (first ? 3 : 0);
          this.addEssence(i, essence[i]); record.clears++;
          if (first) record.firstAt = a.end;
        }
        s.stone += stone; record.runs++; record.best = Math.max(record.best, sim.floors); s.dungeon.records[d.id] = record;
        const maxHp = this.stats(now).HP, loss = Math.max(0, a.hp - sim.hp) / a.stats.HP;
        s.hp = Math.min(maxHp, Math.max(maxHp * .1, s.hp - maxHp * loss) + maxHp * (.008 + this.rootEffects().regen) * Math.min(F.offline_cap(s.offlineCap), (now - a.end) / 1000));
        const essText = essence.map((n, i) => n ? n + ' Tinh hoa ' + ELEMENT_NAMES[i] : '').filter(Boolean).join(', ');
        const text = d.name + ' · ' + sim.floors + '/' + d.floors + ' tầng' + (full ? ' · hạ ' + d.boss : ' · rút lui dưỡng thương') +
          (first ? ' · thông quan đầu tiên!' : '.') + ' Nhận ' + F.format_linh_thach(stone) + ', ' + F.fmt(exp) + ' tu vi' + (essText ? ', ' + essText : '') + '.';
        s.dungeon.active = null;
        const result = { id: d.id, at: a.end, floors: sim.floors, success: full, first, stone, exp, essence, text };
        s.dungeon.last = result; this.log('Bí cảnh · ' + text);
        return result;
      },
      encounterChance() {
        const t = this.s.talent;
        return Math.min(.5, .3 + t.phucDuyen * .012 + (t.vanKhi + this.s.meta.upgrades.luck) * .004 + (this.s.race === 'tien_due' ? .03 : 0));
      },
      rewardItem(kind, effect, realm = this.s.realm, rng = this.rng, budget = Infinity) {
        let pool = H.ITEMS.filter(x => x.kind === kind && (!effect || x.effect === effect) && x.tier <= realm && this.price(x.code) <= budget);
        if (!pool.length) return null;
        const tier = Math.max(...pool.map(x => x.tier));
        return pick(pool.filter(x => x.tier === tier), rng);
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
          s.stone += gain; reward.push((gain < 0 ? 'mất ' : '+') + F.format_linh_thach(Math.abs(gain)));
        } else if (ev.effect === 'hurt') {
          const n = Math.min(Math.max(0, s.hp - 1), this.stats(now).HP * .08); s.hp -= n; reward.push('sinh lực −' + F.fmt(n));
        } else if (ev.effect === 'heal') {
          const max = this.stats(now).HP, n = Math.min(max - s.hp, max * .3 * mult); s.hp += n; reward.push('sinh lực +' + F.fmt(n)); exp();
        } else if (ev.effect === 'essence' || ev.effect === 'allEssence') essence(ev.effect === 'allEssence');
        else if (ev.effect === 'life' || ev.effect === 'insight') {
          const years = Math.max(1, Math.round(F.lifespan(s.realm) * .01)); s.extraLife += years; reward.push('thọ nguyên +' + F.fmt(years) + ' năm');
          if (ev.effect === 'insight') exp();
        } else exp();
        const text = ev.desc + ' ' + reward.join(' · ') + '.', entry = { id: ev.id, at: now, text };
        const journal = s.encounter.journal[ev.id] || { count: 0, firstAt: now, lastAt: now };
        journal.count++; journal.lastAt = now; s.encounter.journal[ev.id] = journal; s.encounter.total++;
        s.encounter.recent.unshift(entry); s.encounter.recent.length = Math.min(12, s.encounter.recent.length);
        this.log('Kỳ ngộ [' + ENCOUNTER_RARITIES[ev.rarity].name + '] ' + ev.name + ': ' + text);
        return entry;
      },
      advanceEncounters(seconds, now, eff = 1) {
        const s = this.s, e = s.encounter, before = e.clock;
        e.clock += Math.min(seconds, F.offline_cap(s.offlineCap)) * eff;
        const count = Math.floor(e.clock / ENCOUNTER_INTERVAL), found = []; e.clock %= ENCOUNTER_INTERVAL;
        if (!count) return found;
        const rareBoost = 1 + s.talent.phucDuyen * .035, luck = s.talent.vanKhi + s.meta.upgrades.luck;
        const pool = ENCOUNTERS.map(ev => ({ ev, weight: ENCOUNTER_RARITIES[ev.rarity].weight / ENCOUNTERS.filter(x => x.rarity === ev.rarity).length *
          (ev.rarity ? rareBoost : 1) / (['loss', 'hurt'].includes(ev.effect) ? 1 + luck * .06 : 1) }));
        const total = pool.reduce((n, x) => n + x.weight, 0);
        for (let i = 0; i < count; i++) {
          if (this.rng() >= this.encounterChance()) continue;
          let roll = this.rng() * total, ev = pool[0].ev;
          for (const x of pool) { roll -= x.weight; if (roll <= 0) { ev = x.ev; break; } }
          const at = Math.min(now, s.lastUpdate + ((i + 1) * ENCOUNTER_INTERVAL - before) / eff * 1000);
          found.push(this.resolveEncounter(ev, at));
        }
        return found;
      },
      sectDefinition() { return this.s.sect.joined ? SECTS.find(x => x.id === this.s.sect.id) : null; },
      sectRank() {
        const index = Math.max(0, SECT_RANKS.findLastIndex(r => this.s.sect.earned >= r.at));
        return { ...SECT_RANKS[index], next: SECT_RANKS[index + 1] || null };
      },
      sectIncome() { return F.income_by_source(this.s.realm)['tông môn'] * this.sectRank().stipend; },
      joinSect(id = 'thanhvan') {
        const d = SECTS.find(x => x.id === id);
        if (!d) throw Error('Tông môn không hợp lệ.');
        if (this.s.sect.joined) throw Error('Đã là đệ tử tông môn.');
        this.s.sect = { ...sectDefault(), joined: true, id };
        this.log('Gia nhập ' + d.name + ' · mở thu nhập và ủy thác tông môn.');
      },
      leaveSect() {
        if (this.s.sect.mission) throw Error('Hãy hoàn tất hoặc hủy nhiệm vụ trước.');
        this.s.sect = sectDefault(); this.log('Rời tông môn, trở lại làm tán tu.');
      },
      addContribution(n) { const x = this.s.sect; x.contribution += n; x.earned += n; },
      donateSect() {
        if (!this.s.sect.joined) throw Error('Chưa nhập tông.');
        this.spend(F.price_ha(this.s.realm)); this.addContribution(100);
        this.log('Cống hiến tông môn +100.');
      },
      sectMissions(all = false) {
        return SECT_MISSIONS.filter(m => (!m.sect || m.sect === this.s.sect.id) && (all || (m.minRealm <= this.s.realm && m.tier <= this.sectRank().tier)));
      },
      featuredMission(now = this.s.lastUpdate) {
        const list = this.sectMissions().filter(m => !m.legacy);
        const offset = Math.max(0, SECTS.findIndex(x => x.id === this.s.sect.id)) * 7;
        return list[(Math.floor(now / 864e5) + offset) % list.length] || null;
      },
      missionChance(def) {
        if (def.legacy) return 1;
        const st = F.stats(this.s.realm, this.s.stage - 1), baseline = F.combat_power(st.HP, st.ATK, st.DEF);
        return Math.max(.1, Math.min(.98, .68 + .14 * this.stats().CP / baseline - .035 * (def.tier - 1) + (this.s.talent[def.stat] || 0) * .012));
      },
      startSectMission(id, now = this.s.lastUpdate) {
        const s = this.s, def = this.sectMissions().find(m => m.id === id);
        if (!s.sect.joined) throw Error('Chưa nhập tông.');
        if (s.sect.mission || s.dungeon.active) throw Error('Hãy hoàn tất chuyến bí cảnh hoặc nhiệm vụ đang nhận.');
        if (!def) throw Error('Nhiệm vụ chưa mở.');
        if (s.hp < this.stats().HP * .4) throw Error('Cần ít nhất 40% sinh lực.');
        s.sect.mission = { id, start: now, end: now + def.seconds * 1000, realm: s.realm, stage: s.stage,
          featured: this.featuredMission(now)?.id === id, chance: this.missionChance(def) };
        this.log('Nhận nhiệm vụ tông môn: ' + def.name + '.');
        return s.sect.mission;
      },
      abortSectMission() {
        this.s.sect.mission = null; this.s.sect.repeat = false;
        this.log('Hủy nhiệm vụ tông môn, không nhận thưởng.');
      },
      claimSectMission(now = this.s.lastUpdate) {
        const s = this.s, m = s.sect.mission;
        if (!m) throw Error('Chưa nhận nhiệm vụ tông môn.');
        if (now < m.end) throw Error('Nhiệm vụ chưa hoàn thành.');
        const def = SECT_MISSIONS.find(d => d.id === m.id), previous = this.sectRank().index;
        const success = def.legacy || this.rng() < m.chance, excellent = success && !def.legacy && this.rng() < .08 + s.talent.phucDuyen * .01;
        const mult = (m.featured ? 1.5 : 1) * (excellent ? 2 : 1);
        const contribution = success ? Math.round(def.contribution * mult) : 0;
        const stone = success && !def.legacy ? F.income_rate(m.realm) * def.seconds * .25 * mult : 0;
        const exp = success && !def.legacy ? this.gainExp(F.base_rate(m.realm) * def.seconds * .18 * mult) : 0;
        if (success) { this.addContribution(contribution); s.stone += stone; s.sect.missionsDone++; }
        else { s.hp = Math.max(1, s.hp - this.stats().HP * .1); s.sect.repeat = false; }
        s.sect.mission = null;
        const text = def.name + (success ? (excellent ? ' · xuất sắc' : ' · hoàn thành') + ' · cống hiến +' + contribution + ', ' + F.format_linh_thach(stone) + ', tu vi +' + F.fmt(exp) : ' · thất bại, mất 10% sinh lực tối đa.') + (m.featured ? ' · ủy thác nổi bật ×1,5.' : '.');
        const result = { id: def.id, at: now, success, contribution, stone, exp, text };
        s.sect.last = result; this.log('Tông môn · ' + text);
        if (this.sectRank().index > previous) this.log('Thăng chức tông môn: ' + this.sectRank().name + '.');
        return { ...result, def };
      },
      finishSect(now, offline) {
        const x = this.s.sect;
        if (!x.repeat || !x.mission || x.mission.end > now) return null;
        const result = this.claimSectMission(now);
        if (!offline && result.success && this.s.hp >= this.stats().HP * .4) this.startSectMission(result.id, now);
        return result;
      },
      sectShopOffer(id) {
        const d = SECT_SHOP.find(x => x.id === id);
        if (!d) return null;
        const item = d.kind ? this.rewardItem(d.kind, d.effect, this.s.realm, () => 0) : null;
        const cost = Math.ceil(Math.max(d.cost * (1 + this.s.realm) ** 1.2, item ? this.price(item.code) * d.count / F.income_rate(this.s.realm) * .6 : 0));
        return { ...d, item, cost, locked: !this.s.sect.joined || this.sectRank().index < d.rank || (!!d.sect && this.s.sect.id !== d.sect) || (!!d.kind && !item) };
      },
      buySect(id, element = this.activeElements()[0]) {
        const offer = this.sectShopOffer(id), x = this.s.sect;
        if (!offer || offer.locked) throw Error('Vật phẩm tông môn chưa mở.');
        if (x.contribution < offer.cost) throw Error('Không đủ cống hiến.');
        if (id === 'essence' && !this.activeElements().includes(element)) throw Error('Hệ linh căn không hợp lệ.');
        x.contribution -= offer.cost;
        if (id === 'essence') this.addEssence(element, offer.count); else this.add(offer.item.code, offer.count);
        const name = id === 'essence' ? 'Tinh hoa ' + ELEMENT_NAMES[element] : offer.item.name;
        this.log('Kho tông môn · nhận ' + name + ' ×' + offer.count + ' · −' + offer.cost + ' cống hiến.');
        return { ...offer, name };
      }
    });
  }
  const api = { defaults, normalize, install };
  root.HU_ADVENTURES = api;
  if (node) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
