/* Miền luật: social — tri kỷ, đạo hữu, NPC, PvP mô phỏng. Chỉ nhận ID. */
(function (root) {
  'use strict';
  const domain = 'social';
  const commands = Object.freeze(['meetFriend', 'giftFriend', 'discuss', 'npcGift', 'npcOffer', 'npcQuest', 'duel']);

  function install(API) {
    const H = API, F = H.F, { FRIENDS, DAO, RIVALS, PVP_CD, DISCUSS_CD, giftCost, DESIGN, item, NPC_QUESTS, NPC_DISCOUNT_MAX } = H;
    const TEACH_ROLES = ['dạy công pháp', 'dạy bí tịnh'], SELL_ROLES = ['bán đồ', 'luyện đan thuê'];
    const find = (list, id) => {
      const f = list.find(x => x.id === id);
      if (!f) throw Error('Đạo hữu không hợp lệ.');
      return f;
    };
    const at = (game, now) => Number.isFinite(now) ? now : game.s.lastUpdate;

    Object.assign(H.Game.prototype, {
      friend(id) {
        find([...FRIENDS, ...DAO], id);
        return this.s.social.friends[id] || (this.s.social.friends[id] = { affinity: 0, metAt: 0, giftAt: 0, discussAt: 0 });
      },
      meetFriend(payload, now) {
        now = at(this, now);
        find(FRIENDS, payload.id);
        const f = this.friend(payload.id);
        if (f.metAt) throw Error('Đã kết giao với vị đạo hữu này.');
        f.metAt = now;
        f.affinity = Math.max(12, f.affinity);
        this.log('Kết giao một vị đạo hữu mới.');
        return f;
      },
      giftFriend(payload, now) {
        now = at(this, now);
        const def = find(FRIENDS, payload.id), f = this.s.social.friends[payload.id], cost = giftCost(def), amount = 8 + def.realm;
        if (!f?.metAt) throw Error('Hãy kết giao trước khi tặng lễ.');
        if (f.affinity >= 100) throw Error('Tình nghĩa đã viên mãn, không cần tặng thêm.');
        this.spend(cost);
        f.affinity = Math.min(100, f.affinity + amount);
        f.giftAt = now;
        this.log('Tặng lễ một vị tri kỷ: tình nghĩa +' + amount + '.');
        return f.affinity;
      },
      discussGain() { return Math.max(1, Math.floor(this.need() * .02)); },
      discuss(payload, now) {
        now = at(this, now);
        const id = payload.id;
        find(DAO, id);
        if (now < (this.s.social.friends[id]?.discussAt || 0)) throw Error('Vị đạo hữu này đang bế quan, hãy chờ thêm.');
        if (this.s.qi >= this.need()) throw Error('Tu vi đã đầy, không thể luận đạo thêm.');
        const f = this.friend(id), got = this.gainExp(this.discussGain());
        if (!f.metAt) f.metAt = now;
        f.discussAt = now + DISCUSS_CD;
        f.affinity = Math.min(100, f.affinity + 1);
        this.s.social.lastDiscuss = now;
        this.log('Luận đạo cùng đạo hữu: tu vi +' + F.fmt(got) + '.');
        return { gain: got, affinity: f.affinity, discussAt: f.discussAt };
      },
      npcGift(payload) {
        const id = payload.id, key = payload.code, npc = DESIGN.npc[id], x = item(key), s = this.s;
        if (!npc || !x || !this.count(key)) throw Error('Không tìm thấy vị đạo hữu hoặc vật phẩm phù hợp.');
        if (s.equipment.includes(key)) throw Error('Hãy tháo pháp bảo trước khi tặng.');
        const delta = x.code === npc.likes ? 5 : x.code === npc.dislikes ? -5 : 0;
        this.take(key);
        const before = s.npcAffinities[id] || 0;
        s.npcAffinities[id] = Math.max(0, Math.min(100, before + delta));
        const change = s.npcAffinities[id] - before;
        this.log('Tặng ' + x.name + ' cho ' + npc['tên NPC'] + ' · thiện cảm ' + (change >= 0 ? '+' : '') + change + '.');
        return { affinity: s.npcAffinities[id], change };
      },
      /* Ưu đãi theo thiện cảm: tối đa NPC_DISCOUNT_MAX khi thiện cảm 100. */
      npcDiscount(id) { return Math.min(NPC_DISCOUNT_MAX, (this.s.npcAffinities[id] || 0) * NPC_DISCOUNT_MAX / 100); },
      npcPrice(id) {
        const code = DESIGN.npc[id]?.offer;
        if (!item(code)) throw Error('Vị đạo hữu này không có vật phẩm để trao đổi.');
        return F.shop_buy_price(this.price(code)) * (1 - this.npcDiscount(id));
      },
      npcOffer(payload) {
        const id = payload.id, npc = DESIGN.npc[id], role = npc?.['vai trò'], code = npc?.offer, x = item(code);
        const sells = SELL_ROLES.includes(role), teaches = TEACH_ROLES.includes(role);
        if (!npc || !x || !(sells || teaches)) throw Error('Vị đạo hữu này không có vật phẩm để trao đổi.');
        if (x.tier > this.s.realm + 1) throw Error('Vật phẩm vượt quá một bậc cảnh giới.');
        if (teaches && x.kind !== 'BT') throw Error('Bí tịch không hợp lệ.');
        if (this.count(code) >= 1e9) throw Error('Túi đã đầy vật phẩm này.');
        this.spend(this.npcPrice(id));
        this.add(code);
        if (teaches) this.learn({ code });
        this.log(npc['tên NPC'] + (sells ? ' bán ' : ' truyền dạy ') + x.name + '.');
        return { code, role };
      },
      /* Món NPC thích đang có trong túi (không tính pháp bảo đang đeo), cộng mọi phẩm chất. */
      npcGiftKeys(id) {
        const likes = item(DESIGN.npc[id]?.likes);
        if (!likes) return [];
        return Object.keys(this.s.bag).filter(k => item(k)?.code === likes.code && !this.s.equipment.includes(k) && this.count(k) > 0);
      },
      npcGiftStock(id) { return this.npcGiftKeys(id).reduce((n, k) => n + this.count(k), 0); },
      /* Trạng thái bước nhiệm vụ riêng hiện tại của NPC — chỉ đọc, UI dùng để vẽ. */
      npcQuestInfo(id) {
        const npc = DESIGN.npc[id], steps = NPC_QUESTS[npc?.['vai trò']];
        if (!npc || !steps) throw Error('Không tìm thấy vị đạo hữu này.');
        const s = this.s, q = s.npcQuests[id] || { step: 0, base: null }, affinity = s.npcAffinities[id] || 0, def = steps[q.step] || null;
        /* Mốc săn cũ lớn hơn số đã hạ hiện tại nghĩa là bộ đếm đã bị đặt lại (trọng sinh): coi như chưa nhận việc. */
        const based = q.base !== null && q.base <= s.progress.kill;
        const info = { id, step: q.step, total: steps.length, def, done: !def, accepted: based, affinity, locked: false, progress: 0, target: 0, ready: false, cost: 0 };
        if (!def) return info;
        const need = def.need;
        info.locked = affinity < def.minAffinity;
        if (need.type === 'kill') {
          info.target = need.count;
          info.progress = based ? Math.min(need.count, s.progress.kill - q.base) : 0;
          info.ready = based && info.progress >= need.count;
        } else if (need.type === 'gift') {
          info.target = need.count;
          info.progress = Math.min(need.count, this.npcGiftStock(id));
          info.ready = info.progress >= need.count;
        } else {
          info.cost = F.income_rate(s.realm) * need.seconds;
          info.target = info.cost;
          info.progress = Math.min(info.cost, s.stone);
          info.ready = s.stone >= info.cost;
        }
        return info;
      },
      npcQuest(payload) {
        const id = payload.id, info = this.npcQuestInfo(id), s = this.s, npc = DESIGN.npc[id], name = npc['tên NPC'];
        if (info.done) throw Error('Đã hoàn tất chuỗi nhiệm vụ của ' + name + '.');
        if (info.locked) throw Error('Cần thiện cảm ' + info.def.minAffinity + ' với ' + name + ' để nhận việc này.');
        const q = s.npcQuests[id] || (s.npcQuests[id] = { step: 0, base: null }), need = info.def.need;
        if (need.type === 'kill' && !info.accepted) {
          q.base = s.progress.kill;
          this.log('Nhận việc của ' + name + ': ' + info.def.name + '.');
          return { accepted: true, id, step: q.step, name: info.def.name };
        }
        if (!info.ready) throw Error('Chưa đủ điều kiện hoàn thành.');
        if (need.type === 'gift') {
          let left = need.count;
          for (const key of this.npcGiftKeys(id)) {
            const n = Math.min(left, this.count(key));
            this.take(key, n);
            left -= n;
            if (!left) break;
          }
        } else if (need.type === 'stone') this.spend(info.cost);
        const reward = info.def.reward, parts = [];
        if (reward.affinity) {
          const before = s.npcAffinities[id] || 0;
          s.npcAffinities[id] = Math.min(100, before + reward.affinity);
          parts.push('thiện cảm +' + (s.npcAffinities[id] - before));
        }
        if (reward.stone) {
          const gain = F.income_rate(s.realm) * reward.stone;
          s.stone += gain;
          parts.push(F.format_linh_thach(gain));
        }
        if (reward.exp) parts.push('tu vi +' + F.fmt(this.gainExp(Math.max(1, this.need() * reward.exp))));
        const it = reward.item, offer = npc.offer;
        if (it?.pill) { this.add(H.pill(it.pill), it.count || 1); parts.push(item(H.pill(it.pill)).name + ' ×' + (it.count || 1)); }
        if (it?.offer && item(offer)) { this.add(offer, it.offer); parts.push(item(offer).name + ' ×' + it.offer); }
        if (it?.mastery && item(offer)) {
          if (offer in s.learned) { s.learned[offer] = Math.min(1, s.learned[offer] + it.mastery); parts.push('lĩnh ngộ ' + item(offer).name + ' +' + Math.round(it.mastery * 100) + '%'); }
          else { this.add(offer); parts.push(item(offer).name + ' ×1'); }
        }
        q.step++;
        q.base = null;
        const text = name + ' · ' + info.def.name + ': ' + parts.join(' · ') + '.';
        this.log(text);
        return { completed: true, id, step: q.step, text, finished: q.step >= info.total };
      },
      rivalPower(id, now = this.s.lastUpdate) {
        return Math.max(1, Math.round(this.stats(now).CP * find(RIVALS, id).power));
      },
      duel(payload, now) {
        now = at(this, now);
        const id = payload.id, power = this.rivalPower(id, now), pvp = this.s.social.pvp;
        if (now < pvp.lastAt + PVP_CD) throw Error('Đài luận kiếm đang tĩnh lặng, hãy chờ thêm.');
        pvp.lastAt = now;
        const my = this.stats(now).CP, win = this.rng() < F.win_probability(my, power, 3);
        const delta = win ? 18 + Math.floor(this.rng() * 8) : -(12 + Math.floor(this.rng() * 8));
        pvp.rating = Math.max(0, pvp.rating + delta);
        pvp.best = Math.max(pvp.best, pvp.rating);
        if (win) { pvp.wins++; pvp.streak++; } else { pvp.losses++; pvp.streak = 0; }
        const reward = win ? Math.max(1, Math.round(F.loot_linh_thach(this.s.realm, 'tinh anh') * 2)) : 0;
        if (reward) this.s.stone += reward;
        const exp = win ? this.gainExp(Math.max(1, this.need() * .01)) : 0;
        this.log(win ? 'Thắng luận kiếm: danh vọng +' + delta + '.' : 'Thua luận kiếm: danh vọng ' + delta + '.');
        return { win, delta, rating: pvp.rating, best: pvp.best, reward, exp, my, power };
      }
    });
  }

  const mod = Object.freeze({ domain, commands, install });
  (root.HU_RULES = root.HU_RULES || {})[domain] = mod;
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
})(typeof window !== 'undefined' ? window : globalThis);
