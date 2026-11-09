/* Miền luật: progression — tu vi theo thời gian, đột phá, độ kiếp, Thiên mệnh, trọng sinh,
   nâng cấp và thành tựu. Lệnh nhận (payload, now); now do phiên chơi cung cấp. */
(function (root) {
  'use strict';
  const domain = 'progression';
  const commands = Object.freeze(['absorb', 'upgrade', 'breakthrough', 'setAuto']);

  function install(API) {
    const H = API, F = H.F, { item, raceBonus, META_ACHIEVEMENTS, metaDefault, CHAOS } = H;
    const at = (game, now) => Number.isFinite(now) ? now : game.s.lastUpdate;

    Object.assign(H.Game.prototype, {
      need() { return F.exp_need(this.s.realm, this.s.stage - 1); },
      /* Cộng tu vi. Tiểu cảnh giới tự động đột phá khi đầy tu vi (kể cả nhiều tầng liên tiếp khi bế quan);
         tu vi chỉ dừng lại ở tầng cuối của đại cảnh giới, chờ người chơi bấm Đột phá thủ công. */
      gainExp(value) {
        let left = Math.max(0, Number(value) || 0), total = 0, guard = 0;
        while (left > 0 && guard++ < 400) {
          const take = Math.min(left, Math.max(0, this.need() - this.s.qi));
          this.s.qi += take;
          this.s.totalRunExp += take;
          total += take;
          left -= take;
          if (!this.autoStage()) break;
        }
        return total;
      },
      /* Tầng cuối của đại cảnh giới (viên mãn): chỉ còn đại đột phá bằng tay. */
      isPeakStage() { return this.s.stage >= F.STAGES[this.s.realm]; },
      /* Tự động lên 1 tầng nhỏ nếu tu vi đã đầy. Trả về true nếu có lên tầng. */
      autoStage() {
        const s = this.s;
        if (s.completed || this.isPeakStage()) return false;
        if (s.qi + this.need() * 1e-12 < this.need()) return false;
        s.qi = 0; s.pity = 0; s.pillUses = 0; s.progress.breaks++;
        s.stage++;
        s.hp = this.stats().HP; s.mp = this.maxMp();
        this.log('Tự động đột phá: ' + this.realmLabel() + '.');
        return true;
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
      /* Xác suất thực: lôi kiếp là phép thử tất định (đủ hộ kiếp hay không), nên chỉ cần một đợt "chưa đủ sức"
         thì đột phá chắc chắn thất bại dù chance() vẫn hiện xác suất nền. Giao diện dùng hàm này để không đánh lừa người chơi. */
      breakthroughOdds() {
        const events = this.isPeakStage() ? this.tribulation() : [];
        const base = this.chance(), failing = events.filter(e => !e.success);
        return { base, chance: failing.length ? 0 : base, doomed: failing.length > 0, failing: failing.map(e => e.name), events };
      },
      breakthrough(payload, now) {
        now = at(this, now);
        const s = this.s;
        if (s.completed) throw Error('Đạo Tổ đã chứng đạo; hành trình đã viên mãn.');
        if (s.qi + this.need() * 1e-12 < this.need()) throw Error('Tu vi chưa đầy.');
        if (!this.isPeakStage()) { this.autoStage(); return { success: true, chance: 1, events: [], auto: true }; }
        const chance = this.chance(), events = this.tribulation();
        const success = this.rng() < chance && events.every(x => x.success);
        s.breakBonus = 0; s.shield = 0; s.reduction = 0;
        if (!success) {
          s.pity = 0;
          s.death = { cause: 'tribulation', at: now };
          this.log('Độ kiếp thất bại. Đạo thân tọa hóa; toàn bộ tiến trình kiếp này chấm dứt.');
          return { success: false, died: true, chance, events };
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
      checkMeta(now = this.s.lastUpdate) {
        const s = this.s;
        if (!s.meta) s.meta = metaDefault();
        const out = [];
        for (const a of META_ACHIEVEMENTS) {
          if (!s.meta.achievements[a.id] && a.check(s)) {
            s.meta.achievements[a.id] = now;
            out.push(a);
          }
        }
        return out;
      },
      maxLife() { return H.raceLife(this.s.race, this.s.realm) + this.s.extraLife; },
      isDead() { return !!this.s.death || (!this.s.completed && this.s.age >= this.maxLife()); },
      markDeath(cause, now = this.s.lastUpdate) {
        if (!['tribulation', 'pvp', 'combat', 'lifespan'].includes(cause)) throw Error('Nguyên nhân tọa hóa không hợp lệ.');
        if (!this.s.death) this.s.death = { cause, at: now };
        this.s.hp = Math.max(0, this.s.hp);
        return this.s.death;
      },
      lifeInfo() {
        const s = this.s, max = this.maxLife(), pace = F.aging_speed(s.realm);
        const left = Math.max(0, max - s.age), sec = pace > 0 ? left / pace : Infinity;
        return { max, left, pace, seconds: s.completed ? Infinity : Math.floor(sec), safeSeconds: Infinity };
      },
      warnLife(max) {
        const left = Math.floor(max - this.s.age), w = this._lifeWarn || (this._lifeWarn = {});
        for (const th of [1, 3, 10]) {
          if (left > th) continue;
          if (!w[th]) {
            for (const u of [1, 3, 10]) if (u >= th) w[u] = 1;
            this.log('⚠ Thọ nguyên chỉ còn ' + Math.max(0, left) + ' năm! Hãy đột phá đại cảnh giới để nới thọ nguyên, hoặc dùng Thọ Nguyên Đan nếu đã có. Nếu tọa hóa, toàn bộ hành trình kiếp này bị xóa.');
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
