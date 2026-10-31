/* Miền luật: combat — lịch luyện, kỹ năng, công pháp, pháp bảo và di chuyển.
   Thời gian/RNG do phiên chơi cung cấp; các helper nội bộ dùng tên riêng. */
(function (root) {
  'use strict';
  const domain = 'combat';
  const commands = Object.freeze(['strike', 'skill', 'castManual', 'activateArtifact', 'setEnemyKind', 'travel']);

  function install(API) {
    const H = API, F = H.F, { ITEMS, ENEMY_NAMES, DESIGN, item } = H;
    const pick = (xs, rng) => xs[Math.min(xs.length - 1, Math.floor(rng() * xs.length))];
    const at = (game, now) => Number.isFinite(now) ? now : game.s.lastUpdate;
    const effects = s => s.designCombat;

    Object.assign(H.Game.prototype, {
      enemy() {
        const s = this.s;
        let d = null;
        if (s.zone < 5 && s.enemyKind === 'thường') d = DESIGN.raw['quái vật'].find(x => x['khu vực'] === H.ZONES[s.zone].name);
        else if (s.zone === 4 && ['boss', 'boss kiếp'].includes(s.enemyKind)) d = DESIGN.raw.boss.find(x => x['mã boss'] === 'BS001');
        if (d) {
          const st = {
            HP: d.hp, ATK: d.atk, DEF: d.def, SPD: 10,
            CRIT: d['crit (%)'] / 100, DODGE: d['eva (%)'] / 100, CRIT_DMG: d['crit_dame (%)'] / 100,
            name: d['tên quái'] || d['tên boss'], designId: d['mã quái'] || d['mã boss'],
            level: d['cấp'], elementName: d['hệ'], skill: d['kỹ năng'],
            element: ['kim', 'mộc', 'thủy', 'hỏa', 'thổ'].indexOf(d['hệ'])
          };
          st.CP = F.combat_power(st.HP, st.ATK, st.DEF, st.CRIT, st.CRIT_DMG);
          return st;
        }
        const st = F.stats(s.zone, Math.min(s.stage - 1, F.STAGES[s.zone] - 1)), m = F.MONSTER_MULT[s.enemyKind];
        for (const k of ['HP', 'ATK', 'DEF']) st[k] *= m;
        st.CP = F.combat_power(st.HP, st.ATK, st.DEF);
        st.name = ENEMY_NAMES[s.zone];
        return st;
      },
      rewardDefinedEnemy(id, count = 1, rng = this.rng) {
        const def = DESIGN.raw['quái vật'].find(x => x['mã quái'] === id) || DESIGN.raw.boss.find(x => x['mã boss'] === id);
        if (!def) return { exp: 0, items: {} };
        const exp = this.gainExp(def.exp * count), items = {};
        for (const drop of DESIGN.raw['vật phẩm rơi'].filter(x => x['mã đối thủ'] === id)) {
          const code = DESIGN.legacy(drop['mã vật phẩm']);
          if (!code) continue;
          let n = 0;
          for (let i = 0; i < count; i++) if (rng() < drop['tỉ lệ (%)'] / 100) n += drop['số lượng tối thiểu'] + Math.floor(rng() * (drop['số lượng tối đa'] - drop['số lượng tối thiểu'] + 1));
          if (n) { this.add(code, n); items[code] = (items[code] || 0) + n; }
        }
        return { exp, items };
      },
      attackInterval() {
        return Math.max(.5, F.kill_time(this.s.zone) / 10) / (this.s.rootType === 'Dị' && this.s.rootSub === 'phong' ? 1.1 : 1);
      },
      collectLoot(count = 1, offline = false) {
        const s = this.s, r = s.zone, kind = s.enemyKind;
        const fortune = 1 + (s.talent?.phucDuyen || 0) * .02, herbFortune = 1 + (s.talent?.phucDuyen || 0) * .015;
        s.enemyNum += count; s.progress.kill += count;
        s.stone += F.loot_linh_thach(r, kind) * count * fortune;
        const cores = offline ? count * F.yeu_dan_drop_chance(r, kind) : (this.rng() < F.yeu_dan_drop_chance(r, kind) ? 1 : 0);
        s.yaoValue += cores * F.yeu_dan_value(r, kind);
        const enemy = this.enemy();
        if (enemy.designId) this.rewardDefinedEnemy(enemy.designId, count);
        else {
          const herbs = ITEMS.filter(x => x.kind === 'HERB' && x.tier === r);
          const drops = offline ? Math.floor(count * .3 * herbFortune) : (this.rng() < Math.min(1, .3 * herbFortune) ? 1 : 0);
          if (drops && herbs.length) this.add(pick(herbs, this.rng).code, drops);
        }
        if (!offline) this.log('Hạ ' + this.enemy().name + ', nhận ' + F.format_linh_thach(F.loot_linh_thach(r, kind) * fortune) + '.');
      },
      _strike(mult = 1, now = this.s.lastUpdate, free = false, element = null) {
        now = at(this, now);
        const s = this.s, interval = this.attackInterval();
        if (!free && now < s.manualAt + interval * 1000) throw Error('Chưa đến lượt công kích.');
        if (!free) s.manualAt = now;
        this.tickDefinedCombat(now);
        const enemy = this.enemy(), st = this.stats(now);
        if (s.enemyHp <= 0) s.enemyHp = enemy.HP;
        const advantage = enemy.element >= 0 ? this.affinity(enemy.element) : 0;
        let damage = 0;
        if (this.rng() >= (enemy.DODGE || 0)) {
          let elemental = 1 + advantage;
          if (element) {
            const source = H.ELEMENT_NAMES.findIndex(x => x.toLowerCase() === element), target = enemy.element;
            if (element === 'không hệ') elemental = 1;
            else if (s.rootType === 'Hỗn Độn') {
              elemental = target >= 0 ? 1.1 : 1;
              if (this.activeElements().includes(source)) elemental *= 1.2;
            } else if (s.rootType === 'Dị' && H.DI_LINH_CAN[s.rootSub]?.name.toLowerCase() === element) elemental = target >= 0 && this.activeElements().includes(target) ? 1.2 : 1;
            else if (source >= 0 && target >= 0) elemental = H.BEATS[source] === target ? 1.2 : H.BEATS[target] === source ? .8 : 1;
            else elemental = 1;
            if (s.rootType !== 'Dị' && s.rootType !== 'Hỗn Độn' && [0, 3].includes(source) && this.activeElements().includes(source)) elemental *= 1.1;
          }
          const pen = s.rootType === 'Dị' && s.rootSub === 'loi' && element === 'lôi' ? .10 : 0;
          damage = F.damage(st.ATK, enemy.DEF, mult * elemental, pen, this.rng() < st.CRIT, st.CRIT_DMG);
          s.enemyHp = Math.max(0, s.enemyHp - damage);
        }
        if (s.enemyHp === 0) {
          this.collectLoot();
          s.designCombat.enemyEffects = [];
          s.enemyHp = this.enemy().HP;
          return { damage, won: true };
        }
        if (damage > 0) this.applyArtifactHit(now);
        const controlled = s.designCombat.enemyEffects.some(e => ['freeze', 'stun'].includes(e.type) && e.end > now);
        if (!controlled && this.rng() >= st.DODGE) {
          const phase = enemy.designId?.startsWith('BS') ? DESIGN.phase(enemy.designId, s.enemyHp / enemy.HP)?.multiplier || 1 : DESIGN.multiplier(enemy.skill);
          const hit = F.damage(enemy.ATK, st.DEF, phase * (advantage < 0 ? 1.2 : 1) * (1 - this.rootEffects().reduction), 0, this.rng() < (enemy.CRIT || 0), enemy.CRIT_DMG || 1.5);
          s.hp -= this.absorbCombatDamage(hit, now);
          const bleed = String(enemy.skill || '').match(/chảy máu\s+(\d+(?:[.,]\d+)?)%\s*hp hiện tại\/giây trong\s+(\d+(?:[.,]\d+)?)\s*giây/i);
          if (bleed) s.designCombat.bleed = { pct: Number(bleed[1].replace(',', '.')) / 100, last: now, end: now + Number(bleed[2].replace(',', '.')) * 1000 };
        }
        if (s.hp <= 0) {
          s.hp = st.HP * .28; s.auto = false; s.enemyHp = enemy.HP; s.designCombat.enemyEffects = [];
          this.log('Trọng thương, rút lui điều tức.');
        }
        return { damage, won: false };
      },
      strike(payload, now) { return this._strike(1, at(this, now), false); },
      skill(payload, now) {
        now = at(this, now);
        const index = payload.index, s = this.s;
        if (!Number.isInteger(index) || index < 0 || index > 3) throw Error('Kỹ năng không hợp lệ.');
        if (now < s.cooldowns[index]) throw Error('Kỹ năng đang hồi.');
        const costs = [.12, .15, .18, .26], cd = [5, 7, 12, 15], cost = this.maxMp() * costs[index];
        if (s.mp < cost) throw Error('Không đủ linh khí.');
        s.mp -= cost;
        s.cooldowns[index] = now + Math.max(cd[index], this.attackInterval()) * 1000;
        if (index === 2) s.hp = Math.min(this.stats().HP, s.hp + this.stats().HP * .26 * (1 + this.rootEffects().heal));
        else this._strike([2, 1.5, 1, 3.6][index] * (1 + .02 * (s.tech[index] - 1)), now, true);
      },
      activateArtifact(payload, now) {
        now = at(this, now);
        const key = payload.code, s = this.s, x = item(key), d = x && DESIGN.effects[x.code];
        if (!x || !s.equipment.includes(key) || !d || d['điều kiện kích hoạt'] !== 'khi kích hoạt') throw Error('Pháp bảo này không có kỹ năng kích hoạt.');
        const c = effects(s);
        if (now < (c.itemCooldowns[key] || 0)) throw Error('Pháp bảo đang hồi chiêu.');
        const end = now + d['thời gian (giây)'] * 1000;
        if (d['hiệu ứng'] === 'giáp ảo') { c.shield = this.stats(now).HP * d['lá chắn (% hp tối đa)'] / 100; c.shieldEnd = end; }
        else if (d['hiệu ứng'] === 'hồi máu') { c.heal = { amount: d['hồi máu (hp)'] / d['chu kỳ hồi (giây)'], last: now, end }; }
        else throw Error('Hiệu ứng kích hoạt chưa hỗ trợ.');
        c.itemCooldowns[key] = now + d['hồi chiêu (giây)'] * 1000;
        this.log('Kích hoạt ' + x.name + ' · ' + d['hiệu ứng'] + '.');
        return d['hiệu ứng'];
      },
      castManual(payload, now) {
        now = at(this, now);
        const key = payload.code, s = this.s, x = item(key), d = x?.design, c = effects(s);
        if (!x || d?.group !== 'công pháp' || !(key in s.learned) || !s.activeManuals.includes(key)) throw Error('Hãy lĩnh ngộ và vận hành công pháp.');
        if (now < (c.manualCooldowns[key] || 0)) throw Error('Công pháp đang hồi chiêu.');
        if (s.mp < d['tiêu hao mp']) throw Error('Không đủ linh khí.');
        s.mp -= d['tiêu hao mp'];
        c.manualCooldowns[key] = now + d['hồi chiêu (giây)'] * 1000;
        if (d['công dụng'] === 'công kích') return this._strike(d.atk_multiplier, now, true, d['hệ']);
        if (d.heal) { const amount = d.heal * (1 + this.rootEffects().heal); s.hp = Math.min(this.stats(now).HP, s.hp + amount); }
        if (d.def_bonus) c.buffs.push({ type: 'def', value: d.def_bonus, end: now + d['thời gian buff (giây)'] * 1000 });
        if (d['buff stat'] === 'eva') c.buffs.push({ type: 'dodge', value: d['buff giá trị'] / 100, end: now + d['thời gian buff (giây)'] * 1000 });
        this.log('Vận dụng ' + x.name + '.');
        return { support: true };
      },
      applyArtifactHit(now) {
        const s = this.s, c = effects(s);
        for (const key of s.equipment) {
          const x = item(key), d = DESIGN.effects[x.code];
          if (!d || d['điều kiện kích hoạt'] !== 'khi đánh trúng' || this.rng() >= d['tỉ lệ kích hoạt (%)'] / 100) continue;
          const names = { 'đóng băng': 'freeze', 'gây choáng': 'stun', 'gây độc': 'poison', 'chảy máu': 'bleed' }, type = names[d['hiệu ứng']];
          if (!type) continue;
          const old = c.enemyEffects.find(e => e.type === type && e.source === key);
          if (old) { old.end = now + d['thời gian (giây)'] * 1000; old.stacks = type === 'poison' ? Math.min(d['số lớp tối đa'], old.stacks + 1) : 1; old.last = now; }
          else c.enemyEffects.push({ type, source: key, end: now + d['thời gian (giây)'] * 1000, last: now, stacks: 1, damage: d['độc (sát thương/giây)'] || 0, pct: (d['chảy máu (% hp hiện tại/giây)'] || 0) / 100 });
        }
        if (s.rootType === 'Dị' && ['bang', 'loi', 'doc'].includes(s.rootSub)) {
          const chance = s.rootSub === 'doc' ? .15 : .10;
          if (this.rng() < chance) {
            const type = { bang: 'freeze', loi: 'stun', doc: 'poison' }[s.rootSub];
            const duration = s.rootSub === 'bang' ? 1.5 : s.rootSub === 'loi' ? 1 : 3;
            const old = c.enemyEffects.find(e => e.source === 'root' && e.type === type);
            const entry = { type, source: 'root', end: now + duration * 1000, last: now, stacks: 1, damage: s.rootSub === 'doc' ? this.stats(now).ATK * .05 : 0, pct: 0 };
            if (old) Object.assign(old, entry); else c.enemyEffects.push(entry);
          }
        }
      },
      tickDefinedCombat(now, offline = false) {
        now = at(this, now);
        const s = this.s, c = effects(s);
        if (c.shieldEnd <= now) { c.shield = 0; c.shieldEnd = 0; }
        if (c.heal) {
          const h = c.heal, seconds = Math.max(0, (Math.min(now, h.end) - h.last) / 1000);
          if (seconds) s.hp = Math.min(this.stats(now).HP, s.hp + seconds * h.amount * (1 + this.rootEffects().heal));
          h.last = Math.max(h.last, Math.min(now, h.end));
          if (now >= h.end) c.heal = null;
        }
        c.buffs = c.buffs.filter(b => b.end > now);
        if (offline) { c.enemyEffects = []; c.bleed = null; return; }
        if (c.bleed) {
          const b = c.bleed, seconds = Math.max(0, (Math.min(now, b.end) - b.last) / 1000);
          if (seconds) s.hp *= Math.pow(1 - b.pct, seconds);
          b.last = Math.max(b.last, Math.min(now, b.end));
          if (now >= b.end) c.bleed = null;
        }
        const hadEnemy = s.enemyHp > 0;
        if (hadEnemy) for (const e of c.enemyEffects) {
          const seconds = Math.max(0, (Math.min(now, e.end) - e.last) / 1000);
          if (e.type === 'poison') s.enemyHp = Math.max(0, s.enemyHp - seconds * e.damage * e.stacks);
          else if (e.type === 'bleed') s.enemyHp = Math.max(0, s.enemyHp * Math.pow(1 - e.pct, seconds));
          e.last = Math.max(e.last, Math.min(now, e.end));
        }
        c.enemyEffects = c.enemyEffects.filter(e => e.end > now);
        if (hadEnemy && s.enemyHp === 0) {
          this.collectLoot();
          c.enemyEffects = [];
          s.enemyHp = this.enemy().HP;
        }
      },
      absorbCombatDamage(amount, now) {
        const c = effects(this.s);
        if (c.shieldEnd <= now) { c.shield = 0; c.shieldEnd = 0; }
        const blocked = Math.min(c.shield, amount);
        c.shield -= blocked;
        return amount - blocked;
      },
      setEnemyKind(payload) {
        const kind = payload.kind;
        if (!Object.hasOwn(F.MONSTER_MULT, kind)) throw Error('Loại đối thủ không hợp lệ.');
        this.s.enemyKind = kind;
        this.s.enemyHp = 0;
        this.s.combatClock = 0;
        this.s.designCombat.enemyEffects = [];
        return kind;
      },
      travel(payload) {
        const zone = payload.zone;
        if (!Number.isInteger(zone) || !H.ZONES[zone] || zone > this.s.realm) throw Error('Cảnh giới chưa đủ.');
        const s = this.s;
        s.zone = zone;
        s.enemyHp = 0;
        s.combatClock = 0;
        s.auto = false;
        s.designCombat.enemyEffects = [];
        if (!s.locations.includes(zone)) { s.locations.push(zone); s.progress.travel++; }
        this.log('Đến ' + H.ZONES[zone].name + '.');
        return zone;
      }
    });
  }

  const mod = Object.freeze({ domain, commands, install });
  (root.HU_RULES = root.HU_RULES || {})[domain] = mod;
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
})(typeof window !== 'undefined' ? window : globalThis);
