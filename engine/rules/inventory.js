/* Miền luật: inventory — túi đồ, trang bị, công pháp, tiêu hao, mua bán, đấu giá mô phỏng. */
(function (root) {
  'use strict';
  const domain = 'inventory';
  const commands = Object.freeze(['buy', 'sell', 'equip', 'learn', 'activate', 'use', 'sellYao', 'bid']);

  function install(API) {
    const H = API, F = H.F, { item, ITEMS } = H;
    const at = (game, now) => Number.isFinite(now) ? now : game.s.lastUpdate;

    Object.assign(H.Game.prototype, {
      price(key) {
        const x = item(key);
        if (!x) throw Error('Không có vật phẩm này.');
        if (x.kind === 'HERB') return F.herb_price(x.tier, x.sub, x.years);
        if (x.kind === 'SEED') return F.herb_price(x.tier, x.sub) * .5;
        return F.price_ha(x.tier, x.sub);
      },
      buy(payload, now) {
        const key = payload.code, x = item(key);
        if (!x || x.tier > this.s.realm + 1 || x.kind === 'QITEM') throw Error('Vật phẩm chưa mở khóa.');
        this.spend(F.shop_buy_price(this.price(key)));
        this.add(key);
        return key;
      },
      sell(payload, now) {
        const key = payload.code;
        if (this.s.equipment.includes(key)) throw Error('Hãy tháo pháp bảo trước khi bán.');
        this.take(key);
        const gain = F.shop_sell_price(this.price(key));
        this.s.stone += gain;
        return gain;
      },
      equip(payload, now) {
        const key = payload.code, s = this.s, x = item(key);
        if (!x || x.kind !== 'EQ' || !this.count(key)) throw Error('Không có pháp bảo này.');
        if (s.equipment.includes(key)) {
          s.equipment = s.equipment.filter(k => k !== key);
          s.hp = Math.min(s.hp, this.stats().HP);
          s.mp = Math.min(s.mp, this.maxMp());
          return false;
        }
        if (x.tier > s.realm + 1) throw Error('Chỉ dùng pháp bảo cao hơn tối đa một cảnh giới.');
        if (s.equipment.length >= 4) throw Error('Đã đầy bốn ô pháp bảo.');
        s.equipment.push(key);
        return true;
      },
      learn(payload, now) {
        const key = payload.code, s = this.s, x = item(key);
        if (!x || x.kind !== 'BT' || !this.count(key)) throw Error('Không có bí tịch này.');
        if (x.tier > s.realm + 1) throw Error('Công pháp vượt quá một bậc cảnh giới.');
        this.take(key);
        s.learned[key] = Math.min(1, (s.learned[key] || 0) + .05);
        if (!['BT-900', 'BT-901'].includes(x.code) && !s.activeManuals.includes(key) && s.activeManuals.length < 3) s.activeManuals.push(key);
        return s.learned[key];
      },
      activate(payload, now) {
        const key = payload.code, s = this.s, x = item(key);
        if (!(key in s.learned)) throw Error('Chưa lĩnh ngộ công pháp.');
        if (!x) throw Error('Vật phẩm không hợp lệ.');
        if (['BT-900', 'BT-901'].includes(x.code)) throw Error('Bí tịch nghề được áp dụng sau khi lĩnh ngộ.');
        if (x.tier > s.realm + 1) throw Error('Công pháp vượt quá một bậc cảnh giới.');
        if (s.activeManuals.includes(key)) s.activeManuals = s.activeManuals.filter(k => k !== key);
        else {
          if (s.activeManuals.length >= 3) throw Error('Chỉ vận hành ba công pháp.');
          s.activeManuals.push(key);
        }
        s.hp = Math.min(s.hp, this.stats().HP);
        return s.activeManuals.includes(key);
      },
      use(payload, now) {
        now = at(this, now);
        const key = payload.code, s = this.s, x = item(key);
        if (!x || !this.count(key)) throw Error('Vật phẩm không có trong túi.');
        if (x.tier > s.realm + 1) throw Error('Vật phẩm vượt quá một bậc cảnh giới.');
        let message = 'Đã dùng ' + x.name;
        if (x.kind === 'PILL') {
          const diff = Math.max(0, s.realm - x.tier);
          const e = F.dan_effect(x.effect, s.realm, s.stage - 1, x.sub, s.pillUses, diff);
          if (x.effect === 'TU_VI') {
            const n = F.dan_exp_gain_capped(s.realm, s.stage - 1, x.sub, s.pillUses, s.pillRealmExp, diff);
            const got = this.gainExp(n);
            if (got <= 0) throw Error('Đã đầy tu vi hoặc đạt trần đan trong cảnh giới.');
            s.pillRealmExp += got; s.pillUses++;
            message = 'Tu vi +' + F.fmt(got);
          } else if (x.effect === 'HOI_PHUC') {
            s.hp = Math.min(this.stats().HP, s.hp + this.stats().HP * e.hoi_phan_tram_HP * (1 + this.rootEffects().heal));
            s.mp = Math.min(this.maxMp(), s.mp + this.maxMp() * e.hoi_phan_tram_HP);
          } else if (x.effect === 'BUFF_TOC') s.buffs.push({ type: 'rate', points: e.diem, end: now + e.thoi_luong * 1000 });
          else if (x.effect === 'DOT_PHA') s.breakBonus = Math.min(10, s.breakBonus + e.diem);
          else if (x.effect === 'KIEP') { s.shield = Math.max(s.shield, e.khien_theo_HP); s.reduction = Math.max(s.reduction, e.giam_sat_thuong); }
          else if (x.effect === 'THO_NGUYEN') s.extraLife += e.nam;
          else if (x.effect === 'CUNG_CO') {
            if (s.permanent >= e.tran_moi_canh_gioi) throw Error('Đã đạt trần củng cố cảnh giới.');
            s.permanent = Math.min(e.tran_moi_canh_gioi, s.permanent + e.cong_gop);
          } else if (x.effect === 'GIAI_DOC') s.debuffs = [];
          else if (x.effect === 'CHIEN_DAU') s.buffs.push({ type: 'attack', points: e.tang_ATK, end: now + e.thoi_luong * 1000 });
          else if (x.effect === 'TRONG_SINH') s.rebirthKeep = Math.max(s.rebirthKeep, e.giu_tien_do);
        } else if (x.kind === 'HERB' && x.design?.['cách dùng']?.includes('ăn trực tiếp')) {
          const amount = String(x.design['hiệu quả']).match(/hồi\s+(\d+(?:[.,]\d+)?)\s*hp/i);
          if (!amount) throw Error('Chưa có hiệu quả ăn trực tiếp hợp lệ.');
          const max = this.stats(now).HP;
          if (s.hp >= max) throw Error('Sinh lực đã đầy.');
          s.hp = Math.min(max, s.hp + Number(amount[1].replace(',', '.')) * (1 + this.rootEffects().heal));
        } else if (x.kind === 'TAL') {
          if (x.effect === 'KIEP') {
            const e = F.dan_effect('KIEP', s.realm, s.stage - 1, x.sub, 0, Math.max(0, s.realm - x.tier));
            s.shield = Math.max(s.shield, e.khien_theo_HP);
            s.reduction = Math.max(s.reduction, e.giam_sat_thuong);
          } else this._strike((x.code === 'TAL-PL-001' ? 1.2 : 2) * 2 ** x.sub, now, true);
        } else if (x.kind === 'GFT') {
          s.stone += this.price(key) * .5;
        } else if (x.kind === 'CAT') {
          s.craftBoost = Math.min(2, s.craftBoost + .5);
        } else if (x.kind === 'FERT') {
          const plot = s.garden.find(p => !p.wilt && p.end > now);
          if (!plot) throw Error('Linh điền chưa có cây đang lớn.');
          plot.end = now + (plot.end - now) * .7;
        } else if (x.kind === 'SEED') {
          this.plant(x.herb, now);
          message = 'Đã gieo ' + x.name;
        } else throw Error(x.description || 'Vật phẩm dùng trong chế tạo.');
        this.take(key);
        this.log(message);
        return message;
      },
      sellYao() {
        if (this.s.yaoValue <= 0) throw Error('Chưa có yêu đan.');
        const amount = F.shop_sell_price(this.s.yaoValue);
        this.s.stone += amount; this.s.yaoValue = 0;
        return amount;
      },
      lots() { return ITEMS.filter(x => x.kind === 'EQ' && x.tier === this.s.realm).slice(0, 3); },
      bid(payload, now) {
        now = at(this, now);
        this.settleAuction(now);
        const code = payload.code;
        if (!this.lots().some(x => x.code === code)) throw Error('Lô này không còn mở.');
        if (this.s.auction.offers[code]) throw Error('Đã đặt lô này.');
        const cost = this.price(code);
        this.spend(cost);
        this.s.auction.offers[code] = cost;
        return cost;
      },
      settleAuction(now) {
        now = at(this, now);
        const cycle = Math.floor(now / 3600000);
        if (cycle <= this.s.auction.cycle) return;
        for (const code of Object.keys(this.s.auction.offers)) {
          if (item(code)) {
            this.add(code);
            this.log('Đấu giá mô phỏng: nhận ' + item(code).name + '.');
          }
        }
        this.s.auction = { cycle, offers: {} };
      }
    });
  }

  const mod = Object.freeze({ domain, commands, install });
  (root.HU_RULES = root.HU_RULES || {})[domain] = mod;
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
})(typeof window !== 'undefined' ? window : globalThis);
