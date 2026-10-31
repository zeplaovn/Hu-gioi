/* Miền luật: world — nhiệm vụ, kỳ ngộ thủ công, tông môn và tôi luyện linh căn. */
(function (root) {
  'use strict';
  const domain = 'world';
  const commands = Object.freeze([
    'claimQuest', 'claimFragments', 'manualEncounter', 'joinSect', 'leaveSect', 'donateSect',
    'setBlessing', 'setSectRepeat', 'startSectMission', 'claimSectMission', 'abortSectMission',
    'buySect', 'temperRoot'
  ]);

  function install(API) {
    const H = API, F = H.F, {
      ITEMS, ZONES, QUESTS, item, DESIGN,
      ELEMENT_NAMES, BEATS, TEMPER_EFFECTS, TEMPER_MAX,
      SECTS, SECT_RANKS, SECT_MISSIONS, SECT_SHOP
    } = H;
    const at = (game, now) => Number.isFinite(now) ? now : game.s.lastUpdate;
    const pick = (xs, rng) => xs[Math.min(xs.length - 1, Math.floor(rng() * xs.length))];
    const sectDefault = H.sectDefault;

    Object.assign(H.Game.prototype, {
      claimQuest(payload) {
        const s = this.s, q = QUESTS.find(q => q[0] === payload.id);
        if (!q || s.claimed.includes(q[0]) || s.progress[q[0]] < q[2]) throw Error('Chưa thể nhận thưởng.');
        s.stone += q[3];
        this.add(q[4], q[5]);
        s.claimed.push(q[0]);
        return q;
      },
      claimFragments() {
        const s = this.s, parts = ITEMS.filter(x => x.kind === 'QITEM');
        if (s.claimed.includes('fragments')) throw Error('Đã nhận thưởng.');
        if (!parts.length || !parts.every(x => this.count(x.code) > 0)) throw Error('Chưa đủ sáu mảnh.');
        parts.forEach(x => this.take(x.code));
        s.daoVan += 10;
        s.claimed.push('fragments');
        return 10;
      },
      manualEncounter(payload, now) {
        now = at(this, now);
        const s = this.s;
        if (now < s.encounter.usedAt + 90000) throw Error('Cơ duyên đang hồi phục.');
        const kind = payload.index === 0 ? 'HERB' : payload.index === 1 ? 'MAT' : 'PILL';
        const pool = ITEMS.filter(x => x.kind === kind && x.tier === s.realm);
        const x = pool.length ? pool[s.encounter.index % pool.length] : null;
        let part = null;
        if (x) this.add(x.code);
        if (s.realm === 13) {
          const parts = ITEMS.filter(x => x.kind === 'QITEM');
          if (parts.length) { part = parts[s.encounter.index % parts.length]; this.add(part.code); }
        }
        s.encounter.index++;
        s.encounter.usedAt = now;
        return { item: x || null, part };
      },

      activeElements() { return ELEMENT_NAMES.map((_, i) => i).filter(i => this.s.roots[i] >= 50); },
      rootEffects() {
        const out = { attack: 0, hp: 0, mp: 0, sta: 0, guard: 0, rate: 0, crit: 0, dodge: 0, regen: 0, heal: 0, mpRegen: 0, critDmg: 0, reduction: 0 };
        const els = this.activeElements(), scale = 1 / Math.sqrt(Math.max(1, els.length));
        for (const i of els) for (const [key, value] of Object.entries(TEMPER_EFFECTS[i])) out[key] += value * this.s.rootCraft.levels[i] * scale;
        const base = [{ attack: .05, crit: .02 }, { hp: .08, heal: .15 }, { mp: .08, dodge: .02, mpRegen: .10 }, { attack: .08, critDmg: .05 }, { guard: .08, hp: .05, reduction: .05 }];
        const add = effects => { for (const [key, value] of Object.entries(effects || {})) out[key] += value; };
        if (this.s.rootType === 'Dị') add(H.DI_LINH_CAN[this.s.rootSub]?.effects);
        else if (this.s.rootType === 'Hỗn Độn') add({ hp: .15, mp: .15, attack: .10, guard: .10, dodge: .05, crit: .05, critDmg: .20 });
        else if (this.s.rootType !== 'Âm Dương') for (const i of els) add(base[i]);
        return out;
      },
      temperCost(i) { return 2 + 2 * (this.s.rootCraft.levels[i] || 0); },
      temperRoot(payload) {
        const i = payload.index, c = this.s.rootCraft, cost = this.temperCost(i);
        if (!Number.isInteger(i) || !this.activeElements().includes(i)) throw Error('Chỉ tôi luyện hệ linh căn đạt 50 điểm.');
        if (c.levels[i] >= TEMPER_MAX) throw Error('Đã tôi luyện tối đa.');
        if (c.essence[i] < cost) throw Error('Không đủ Tinh hoa ' + ELEMENT_NAMES[i] + '.');
        c.essence[i] -= cost;
        c.levels[i]++;
        this.log('Tôi luyện linh căn ' + ELEMENT_NAMES[i] + ' · cấp ' + c.levels[i] + '/' + TEMPER_MAX + '.');
        return c.levels[i];
      },
      addEssence(i, n) { this.s.rootCraft.essence[i] = Math.min(1e9, this.s.rootCraft.essence[i] + n); },
      affinity(element) {
        if (element < 0) return 0;
        const els = this.activeElements();
        if (this.s.rootType === 'Hỗn Độn') return .10;
        if (this.s.rootType === 'Dị') return els.includes(element) ? .20 : 0;
        if (els.some(i => BEATS[i] === element)) return .20;
        return els.some(i => BEATS[element] === i) ? -.20 : 0;
      },

      sectDefinition() { return this.s.sect.joined ? SECTS.find(x => x.id === this.s.sect.id) : null; },
      sectRank() {
        const index = Math.max(0, SECT_RANKS.findLastIndex(r => this.s.sect.earned >= r.at));
        return { ...SECT_RANKS[index], next: SECT_RANKS[index + 1] || null };
      },
      sectIncome() { return F.income_by_source(this.s.realm)['tông môn'] * this.sectRank().stipend; },
      joinSect(payload) {
        const id = payload.id, d = SECTS.find(x => x.id === id);
        if (!d) throw Error('Tông môn không hợp lệ.');
        if (this.s.sect.joined) throw Error('Đã là đệ tử tông môn.');
        this.s.sect = { ...sectDefault(), joined: true, id };
        this.log('Gia nhập ' + d.name + ' · mở thu nhập và ủy thác tông môn.');
        return d;
      },
      leaveSect() {
        if (this.s.sect.mission) throw Error('Hãy hoàn tất hoặc hủy nhiệm vụ trước.');
        this.s.sect = sectDefault();
        this.log('Rời tông môn, trở lại làm tán tu.');
      },
      addContribution(n) { const x = this.s.sect; x.contribution += n; x.earned += n; },
      donateSect() {
        if (!this.s.sect.joined) throw Error('Chưa nhập tông.');
        this.spend(F.price_ha(this.s.realm));
        this.addContribution(100);
        this.log('Cống hiến tông môn +100.');
      },
      setBlessing(payload) {
        if (!this.s.sect.joined) throw Error('Chưa nhập tông.');
        this.s.sect.blessing = payload.enabled;
        return payload.enabled;
      },
      setSectRepeat(payload) {
        if (!this.s.sect.joined) throw Error('Chưa nhập tông.');
        this.s.sect.repeat = payload.enabled;
        return payload.enabled;
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
      _startSectMission(id, now) {
        const s = this.s, def = this.sectMissions().find(m => m.id === id);
        if (!s.sect.joined) throw Error('Chưa nhập tông.');
        if (s.sect.mission || s.dungeon.active) throw Error('Hãy hoàn tất chuyến bí cảnh hoặc nhiệm vụ đang nhận.');
        if (!def) throw Error('Nhiệm vụ chưa mở.');
        if (s.hp < this.stats().HP * .4) throw Error('Cần ít nhất 40% sinh lực.');
        s.sect.mission = {
          id, start: now, end: now + def.seconds * 1000, realm: s.realm, stage: s.stage,
          featured: this.featuredMission(now)?.id === id, chance: this.missionChance(def)
        };
        this.log('Nhận nhiệm vụ tông môn: ' + def.name + '.');
        return s.sect.mission;
      },
      startSectMission(payload, now) { return this._startSectMission(payload.id, at(this, now)); },
      abortSectMission() {
        this.s.sect.mission = null;
        this.s.sect.repeat = false;
        this.log('Hủy nhiệm vụ tông môn, không nhận thưởng.');
      },
      _claimSectMission(now) {
        const s = this.s, m = s.sect.mission;
        if (!m) throw Error('Chưa nhận nhiệm vụ tông môn.');
        if (now < m.end) throw Error('Nhiệm vụ chưa hoàn thành.');
        const def = SECT_MISSIONS.find(d => d.id === m.id), previous = this.sectRank().index;
        const success = def.legacy || this.rng() < m.chance;
        const excellent = success && !def.legacy && this.rng() < .08 + s.talent.phucDuyen * .01;
        const mult = (m.featured ? 1.5 : 1) * (excellent ? 2 : 1);
        const contribution = success ? Math.round(def.contribution * mult) : 0;
        const stone = success && !def.legacy ? F.income_rate(m.realm) * def.seconds * .25 * mult : 0;
        const exp = success && !def.legacy ? this.gainExp(F.base_rate(m.realm) * def.seconds * .18 * mult) : 0;
        if (success) { this.addContribution(contribution); s.stone += stone; s.sect.missionsDone++; }
        else { s.hp = Math.max(1, s.hp - this.stats().HP * .1); s.sect.repeat = false; }
        s.sect.mission = null;
        const text = def.name + (success ? (excellent ? ' · xuất sắc' : ' · hoàn thành') + ' · cống hiến +' + contribution + ', ' + F.format_linh_thach(stone) + ', tu vi +' + F.fmt(exp) : ' · thất bại, mất 10% sinh lực tối đa.') + (m.featured ? ' · ủy thác nổi bật ×1,5.' : '.');
        const result = { id: def.id, at: now, success, contribution, stone, exp, text };
        s.sect.last = result;
        this.log('Tông môn · ' + text);
        if (this.sectRank().index > previous) this.log('Thăng chức tông môn: ' + this.sectRank().name + '.');
        return { ...result, def };
      },
      claimSectMission(payload, now) { return this._claimSectMission(at(this, now)); },
      finishSect(now, offline) {
        const x = this.s.sect;
        if (!x.repeat || !x.mission || x.mission.end > now) return null;
        const result = this._claimSectMission(now);
        if (!offline && result.success && this.s.hp >= this.stats().HP * .4) this._startSectMission(result.id, now);
        return result;
      },
      sectShopOffer(id) {
        const d = SECT_SHOP.find(x => x.id === id);
        if (!d) return null;
        const reward = d.kind ? this.rewardItem(d.kind, d.effect, this.s.realm, () => 0) : null;
        const cost = Math.ceil(Math.max(d.cost * (1 + this.s.realm) ** 1.2, reward ? this.price(reward.code) * d.count / F.income_rate(this.s.realm) * .6 : 0));
        return { ...d, item: reward, cost, locked: !this.s.sect.joined || this.sectRank().index < d.rank || (!!d.sect && this.s.sect.id !== d.sect) || (!!d.kind && !reward) };
      },
      buySect(payload) {
        const id = payload.id, element = payload.element ?? this.activeElements()[0];
        const offer = this.sectShopOffer(id), x = this.s.sect;
        if (!offer || offer.locked) throw Error('Vật phẩm tông môn chưa mở.');
        if (x.contribution < offer.cost) throw Error('Không đủ cống hiến.');
        if (id === 'essence' && !this.activeElements().includes(element)) throw Error('Hệ linh căn không hợp lệ.');
        x.contribution -= offer.cost;
        if (id === 'essence') this.addEssence(element, offer.count);
        else this.add(offer.item.code, offer.count);
        const name = id === 'essence' ? 'Tinh hoa ' + ELEMENT_NAMES[element] : offer.item.name;
        this.log('Kho tông môn · nhận ' + name + ' ×' + offer.count + ' · −' + offer.cost + ' cống hiến.');
        return { ...offer, name };
      },
      rewardItem(kind, effect, realm = this.s.realm, rng = this.rng, budget = Infinity) {
        const pool = ITEMS.filter(x => x.kind === kind && (!effect || x.effect === effect) && x.tier <= realm && this.price(x.code) <= budget);
        if (!pool.length) return null;
        const tier = Math.max(...pool.map(x => x.tier));
        return pick(pool.filter(x => x.tier === tier), rng);
      }
    });
  }

  const mod = Object.freeze({ domain, commands, install });
  (root.HU_RULES = root.HU_RULES || {})[domain] = mod;
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
})(typeof window !== 'undefined' ? window : globalThis);
