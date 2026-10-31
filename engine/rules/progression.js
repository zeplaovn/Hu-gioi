/* Miền luật: progression — tu vi theo thời gian, đột phá, độ kiếp, Thiên mệnh, trọng sinh,
   nâng cấp và thành tựu. Lệnh nhận (payload, now); now do phiên chơi cung cấp. */
(function (root) {
  'use strict';
  const domain = 'progression';
  const commands = Object.freeze(['absorb', 'upgrade', 'upgradeOffline', 'buyMeta', 'breakthrough', 'prestige', 'reincarnate', 'setAuto']);

  function install(API) {
    const H = API, F = H.F, { item, raceBonus, META_UPGRADES, META_ACHIEVEMENTS, metaDefault, normalizeMeta, create, startStone, CHAOS } = H;
    const at = (game, now) => Number.isFinite(now) ? now : game.s.lastUpdate;
    const clone = value => JSON.parse(JSON.stringify(value));

    Object.assign(H.Game.prototype, {
      need() { return F.exp_need(this.s.realm, this.s.stage - 1); },
      gainExp(value) {
        const gain = Math.max(0, Math.min(value, this.need() - this.s.qi));
        this.s.qi += gain;
        this.s.totalRunExp += gain;
        return gain;
      },
      manualEffects() {
        const s = this.s, out = { rate: 0, attack: 0, guard: 0, alchemy: 0, alchemyChance: 0 };
        for (const key of s.activeManuals) {
          const x = item(key);
          if (!x || x.designOnly) continue;
          const d = x.design;
          const match = d?.group === 'bí tịch' && String(d['công dụng']).match(/(\d+(?:[.,]\d+)?)\s*(?:điểm\s*)?%/);
          if (match && ['luyện khí', 'luyện đan'].includes(d['thể loại'])) {
            const value = Number(match[1].replace(',', '.')) / 100 * 2 ** (x.sub - H.BY_ID[x.code].sub) *
              F.P.CP_MISMATCH ** Math.max(0, s.realm - x.tier) * (F.P.CP_MIN_MASTERY + (1 - F.P.CP_MIN_MASTERY) * s.learned[key]);
            if (d['thể loại'] === 'luyện khí') out.rate += value;
            else out.alchemyChance += value;
            continue;
          }
          const e = F.cong_phap_effect(x.effect, x.sub, Math.max(0, s.realm - x.tier), s.learned[key]);
          out.rate += e.cong_gop_toc_do || 0;
          out.attack += e.tang_ATK || 0;
          out.guard += e.tang_HP_DEF || 0;
          out.alchemy += e.kynang_luyen_dan || e.ky_nang_luyen_dan || 0;
        }
        return out;
      },
      rate(now = this.s.lastUpdate, withBuff = true) {
        const s = this.s, e = this.manualEffects();
        const add = Math.min(.7, e.rate + (s.sect.blessing ? .1 : 0));
        const up = Math.min(.4, (s.tech[1] - 1) * .02 + s.permanent);
        const buff = withBuff ? F.dan_buff(s.buffs.filter(b => b.type === 'rate' && b.end > now).reduce((n, b) => n + b.points, 0)) : 0;
        const race = raceBonus(s.race).rate || 0;
        const talent = (s.talent?.ngoTinh || 0) * .015;
        const meta = 1 + (s.meta?.upgrades?.exp || 0) * .03;
        return F.cultivation_rate(s.realm, add, [up, Math.min(.25, buff), race, talent], s.rootType, F.prestige_mult(s.daoVan)) *
          meta * (1 + this.rootEffects().rate + (this.sectDefinition()?.rate || 0));
      },
      stats(now = this.s.lastUpdate) {
        const s = this.s, st = F.stats(s.realm, s.stage - 1, s.rootType), e = this.manualEffects();
        const rb = raceBonus(s.race), tal = s.talent || {};
        const luck = (s.meta?.upgrades?.luck || 0) * .005, rt = this.rootEffects(), sect = this.sectDefinition();
        let crit = 0, dodge = 0, sta = 0;
        for (const key of s.equipment) {
          const x = item(key), d = x?.design;
          if (d && d.group === 'pháp bảo') {
            const q = 2 ** (x.sub - H.BY_ID[x.code].sub);
            st.HP += d['hp cộng'] * q; st.ATK += d['atk cộng'] * q; st.DEF += d['def cộng'] * q;
            crit += d['crit cộng (%)'] / 100 * q; dodge += d['eva cộng (%)'] / 100 * q; sta += d['sta cộng'] * q;
          } else if (x) {
            const flat = F.item_flat_bonus(x.tier, x.sub);
            st.HP += F.P.HP0 * flat; st.ATK += F.P.ATK0 * flat; st.DEF += F.P.DEF0 * flat;
          }
        }
        const active = s.designCombat.buffs.filter(b => b.end > now);
        st.DEF += active.filter(b => b.type === 'def').reduce((sum, b) => sum + b.value, 0);
        dodge += active.filter(b => b.type === 'dodge').reduce((sum, b) => sum + b.value, 0);
        st.HP *= (1 + (rb.hp || 0)) * (1 + (tal.canCot || 0) * .02) * (1 + e.guard) * (1 + rt.hp);
        st.DEF *= (1 + e.guard + .02 * (s.tech[2] - 1)) * (1 + rt.guard);
        st.ATK *= (1 + (rb.atk || 0)) * (1 + (tal.canCot || 0) * .02) *
          (1 + e.attack + .02 * (s.tech[0] - 1) + s.buffs.filter(b => b.type === 'attack' && b.end > now).reduce((n, b) => n + b.points, 0)) *
          (1 + rt.attack + (sect?.attack || 0));
        st.CRIT = Math.min(.75, F.crit_rate(.01 * (s.tech[0] - 1) + (tal.vanKhi || 0) * .005 + luck) + rt.crit + (sect?.crit || 0) + crit);
        st.DODGE = Math.min(.6, F.dodge_rate(.005 * (s.tech[3] - 1)) + rt.dodge + dodge);
        st.STA = (100 + sta) * (1 + rt.sta);
        st.CRIT_DMG = 1.5 + rt.critDmg;
        st.CP = F.combat_power(st.HP, st.ATK, st.DEF, st.CRIT, st.CRIT_DMG);
        return st;
      },
      maxMp() {
        const s = this.s;
        const bonus = s.equipment.reduce((sum, key) => {
          const x = item(key), d = x?.design;
          return sum + (d && d.group === 'pháp bảo' ? d['mp cộng'] * 2 ** (x.sub - H.BY_ID[x.code].sub) : 0);
        }, 0);
        return (100 * F.stat_scale(s.realm, s.stage - 1) + bonus) * (1 + this.rootEffects().mp);
      },
      chance() {
        const s = this.s;
        return Math.min(.98, F.p_breakthrough(s.realm, s.stage - 1, s.breakBonus + (s.sect.blessing ? .1 : 0), s.pity) +
          (s.talent?.vanKhi || 0) * .003 + (s.meta?.upgrades?.luck || 0) * .003);
      },
      tribulation() {
        const s = this.s, st = this.stats();
        const events = s.stage === F.STAGES[s.realm] ? F.tribulation_events(s.realm) : [];
        return events.map(([name, bolts], i) => {
          const fn = i === 1 ? F.survive_ascension : F.survive_tribulation;
          const [success, survived] = fn(s.realm, st.HP, st.HP * s.shield, s.reduction, 0, s.rootType);
          return { name, bolts, success, survived };
        });
      },
      breakthrough(payload, now) {
        now = at(this, now);
        const s = this.s;
        if (s.completed) throw Error('Đạo Tổ đã chứng đạo. Có thể trọng sinh.');
        if (s.qi + this.need() * 1e-12 < this.need()) throw Error('Tu vi chưa đầy.');
        const chance = this.chance(), events = this.tribulation();
        const success = this.rng() < chance && events.every(x => x.success);
        s.breakBonus = 0; s.shield = 0; s.reduction = 0;
        if (!success) {
          s.qi = F.on_breakthrough_fail(s.qi);
          s.pity = Math.min(15, s.pity + 1);
          this.log('Đột phá thất bại: mất 15% tu vi, tăng bảo hiểm lần sau.');
          return { success, chance, events };
        }
        s.qi = 0; s.pity = 0; s.pillUses = 0; s.progress.breaks++;
        if (s.stage < F.STAGES[s.realm]) s.stage++;
        else if (s.realm < 13) {
          s.realm++; s.stage = 1; s.pillRealmExp = 0; s.permanent = 0; s.tech = [1, 1, 1, 1]; s.zone = s.realm;
          if (!s.locations.includes(s.zone)) { s.locations.push(s.zone); s.progress.travel++; }
        } else s.completed = true;
        let awaken = null;
        if (events.length && ['Ngụy', 'Tứ hành', 'Tam hành', 'Song', 'Thiên'].includes(s.rootType)) {
          const from = s.rootType, p = this.chaosChance();
          if (this.rng() < p) {
            s.rootType = 'Hỗn Độn'; s.rootSub = ''; awaken = { from, to: 'Hỗn Độn', chance: p };
            s.chaosTries = 0;
            this.log('Lôi kiếp tẩy luyện: ngũ hành linh căn hóa thành Hỗn Độn linh căn!');
          } else s.chaosTries = (s.chaosTries || 0) + 1;
        }
        s.hp = this.stats().HP; s.mp = this.maxMp(); s.enemyHp = 0; s.combatClock = 0;
        this.log('Đột phá thành công: ' + this.realmLabel() + '.');
        return { success, chance, events, awaken };
      },
      chaosChance() {
        const s = this.s, K = CHAOS;
        if (!['Ngụy', 'Tứ hành', 'Tam hành', 'Song', 'Thiên'].includes(s.rootType)) return 0;
        return Math.min(K.cap, K.base + (s.talent?.vanKhi || 0) * K.luck + Math.min(K.pityMax, (s.chaosTries || 0) * K.pity));
      },
      realmLabel() {
        const s = this.s, n = F.STAGES[s.realm];
        const label = n === 4 ? ['Sơ kỳ', 'Trung kỳ', 'Hậu kỳ', 'Đỉnh phong'][s.stage - 1]
          : s.realm === 13 ? ['Nhập Đạo', 'Hợp Đạo', 'Vô Thượng'][s.stage - 1] : 'Tầng ' + s.stage;
        return F.REALMS[s.realm] + ' · ' + label + (s.completed ? ' · Chứng đạo' : '');
      },
      upgradeBase(i) { return F.upgrade_base_cost(this.s.realm, i === 1 ? .02 : .02); },
      upgrade(payload, now) {
        const i = payload.index, wanted = payload.count;
        if (!Number.isInteger(i) || i < 0 || i > 3) throw Error('Nâng cấp không hợp lệ.');
        const owned = this.s.tech[i] - 1, base = this.upgradeBase(i);
        const n = Math.min(20 - owned, wanted === 'max' ? F.max_buy(this.s.stone, base, F.P.UP_GROWTH, owned) : wanted);
        if (n <= 0) throw Error('Đã đủ cấp hoặc không đủ linh thạch.');
        this.spend(F.bulk_cost(base, F.P.UP_GROWTH, owned, n));
        this.s.tech[i] += n;
        return n;
      },
      upgradeOffline(payload, now) {
        const s = this.s, key = payload.type === 'cap' ? 'offlineCap' : 'offlineEff';
        if (s[key] >= 8) throw Error('Đã nâng cấp tối đa.');
        const cost = 2 + s[key];
        if (s.daoVan < cost) throw Error('Không đủ Đạo vận.');
        s.daoVan -= cost; s[key]++;
        return s[key];
      },
      metaCost(key) {
        const u = META_UPGRADES[key];
        if (!u) throw Error('Nâng cấp Thiên mệnh không hợp lệ.');
        const lvl = this.s.meta.upgrades[key] || 0;
        return lvl >= u.max ? null : u.cost[lvl];
      },
      buyMeta(payload, now) {
        const key = payload.key, s = this.s, u = META_UPGRADES[key];
        if (!u) throw Error('Nâng cấp Thiên mệnh không hợp lệ.');
        const lvl = s.meta.upgrades[key] || 0;
        if (lvl >= u.max) throw Error('Đã đạt cấp tối đa.');
        const cost = u.cost[lvl];
        if (s.meta.points < cost) throw Error('Không đủ điểm Thiên mệnh.');
        s.meta.points -= cost; s.meta.upgrades[key] = lvl + 1;
        this.log('Thiên mệnh · ' + u.name + ' cấp ' + (lvl + 1) + '.');
        return { key, level: lvl + 1, cost };
      },
      checkMeta(now = this.s.lastUpdate) {
        const s = this.s;
        if (!s.meta) s.meta = metaDefault();
        const out = [];
        for (const a of META_ACHIEVEMENTS) {
          if (!s.meta.achievements[a.id] && a.check(s)) {
            s.meta.achievements[a.id] = now;
            s.meta.points += a.points;
            s.meta.totalPoints += a.points;
            out.push(a);
          }
        }
        return out;
      },
      _prestige(force, cause, now) {
        const s = this.s, reward = F.dao_van(s.totalRunExp);
        if (!force && reward < 10) throw Error('Trọng sinh mở khi nhận ít nhất 10 Đạo vận.');
        const kept = s.qi * s.rebirthKeep, next = create(now);
        for (const k of ['name', 'gender', 'race', 'roots', 'rootType', 'rootSub', 'chaosTries', 'settings', 'learned', 'offlineCap', 'offlineEff', 'createdAt', 'talent', 'social', 'npcAffinities'])
          next[k] = clone(s[k]);
        const meta = normalizeMeta(clone(s.meta || metaDefault()), now);
        const earned = Math.max(1, Math.floor(reward / 5)) + Math.floor(s.realm / 2);
        meta.points += earned; meta.totalPoints += earned;
        meta.history.unshift({ name: s.name, realm: s.realm, stage: s.stage, rebirths: s.rebirths, daoVan: s.daoVan + reward, at: now, cause: cause || (s.completed ? 'Chứng đạo' : 'Trọng sinh') });
        meta.history = meta.history.slice(0, 20);
        next.meta = meta;
        next.activeManuals = s.activeManuals.filter(k => item(k).tier <= 1);
        next.created = true;
        next.daoVan = s.daoVan + reward;
        next.rebirths = s.rebirths + 1;
        next.qi = Math.min(F.exp_need(0, 0), kept);
        next.totalRunExp = 0;
        next.stone = startStone(next.talent, meta);
        next.extraLife = (meta.upgrades.life || 0) * 5;
        next.logs = ['Trọng sinh, nhận ' + F.fmt(reward) + ' Đạo vận · +' + earned + ' Thiên mệnh.'];
        this.s = next; this._lifeWarn = {};
        return reward;
      },
      prestige(payload, now) { return this._prestige(false, '', at(this, now)); },
      reincarnate(payload, now) {
        if (!this.isDead()) throw Error('Thọ nguyên chưa cạn.');
        return this._prestige(true, 'Tọa hóa', at(this, now));
      },
      maxLife() { return H.raceLife(this.s.race, this.s.realm) + this.s.extraLife; },
      isDead() { return !this.s.completed && this.s.age >= this.maxLife(); },
      lifeInfo() {
        const s = this.s, max = this.maxLife(), pace = F.aging_speed(s.realm);
        const left = Math.max(0, max - s.age), sec = pace > 0 ? left / pace : Infinity;
        return { max, left, pace, safeSeconds: s.completed || sec > F.offline_cap(s.offlineCap) ? Infinity : Math.floor(sec) };
      },
      warnLife(max) {
        const left = Math.floor(max - this.s.age), w = this._lifeWarn || (this._lifeWarn = {});
        for (const th of [1, 3, 10]) {
          if (left > th) continue;
          if (!w[th]) {
            for (const u of [1, 3, 10]) if (u >= th) w[u] = 1;
            this.log('⚠ Thọ nguyên chỉ còn ' + Math.max(0, left) + ' năm! Hãy đột phá, dùng Thọ Nguyên Đan hoặc mua Trường Thọ Quả.');
          }
          break;
        }
      },
      absorb(payload, now) {
        const coin = payload.index;
        if (!Number.isInteger(coin) || !F.COINS[coin]) throw Error('Số lượng không hợp lệ.');
        if (this.s.qi >= this.need()) throw Error('Tu vi đã đầy.');
        this.spend(F.COINS[coin][1]);
        return this.gainExp(F.absorb_exp(this.s.realm, coin, 1));
      },
      setAuto(payload) { this.s.auto = payload.enabled; return payload.enabled; }
    });
  }

  const mod = Object.freeze({ domain, commands, install });
  (root.HU_RULES = root.HU_RULES || {})[domain] = mod;
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
})(typeof window !== 'undefined' ? window : globalThis);
