/* Lõi game: trạng thái, nhật ký, khóa thao tác, trôi thời gian, hành động, túi đồ, cửa hàng, công pháp, tông môn. */
"use strict";
(function () {
  const { C, REALMS, SECTS, SKILLS, STATS, MONSTERS, ITEMS, MATS, QMUL, QN, USABLE } = TT;

  class Game {
    constructor() {
      const data = TT.readSave();
      this.count = data.count ?? 1;
      this.saved = data.player;
      this.p = null; this.inGame = false; this.locked = false; this.dead = false;
      this.q = []; this.cur = null; this.token = 0; this.breaking = false;
      this.dlg = null; this.scene = null; this.actionBtns = [];
      this.farmFx = {};
      this.idleTimer = null; this.idleLast = 0; this.quiet = false; this.fullShown = 0; this.rep = null;
      window.addEventListener("keydown", e => this.onKey(e));
    }

    /* ---------- phím tắt ---------- */
    onKey(e) {
      if (!this.inGame || this.dead || TT.ui.anyModal() || e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName)) return;
      const fn = { t: this.actTrain, l: this.actExplore, n: this.actRest, d: this.actBreakthrough }[e.key.toLowerCase()];
      if (fn) { e.preventDefault(); this.act(fn); }
    }

    /* ---------- nhật ký (gõ chữ dần) ---------- */
    log(msg, tag) { if (!this.quiet) this.q.push([msg + "\n", tag]); }

    startPump() {
      clearInterval(this.pumpTimer);
      const tok = this.token;
      this.pumpTimer = setInterval(() => this.pump(tok), 22);
    }
    pump(tok) {
      const box = this.logEl;
      if (tok !== this.token || !box || !box.isConnected) { clearInterval(this.pumpTimer); return; }
      let n = 2 + this.q.length * 3;
      if (!this.cur && !this.q.length) return;
      while (n > 0 && (this.cur || this.q.length)) {
        if (!this.cur) {
          const [text, tag] = this.q.shift();
          const span = h("span", { class: tag ? "t-" + tag : "" });
          box.append(span);
          this.cur = { text, i: 0, span };
        }
        const { text, i, span } = this.cur;
        const take = Math.min(n, text.length - i);
        span.textContent += text.slice(i, i + take);
        this.cur.i += take; n -= take;
        if (this.cur.i >= text.length) this.cur = null;
      }
      while (box.childElementCount > 500) box.firstElementChild.remove();
      if (box._follow !== false) box.scrollTop = box.scrollHeight;       // đang kéo lên đọc dòng cũ thì không giật về cuối
    }

    /* ---------- cập nhật giao diện ---------- */
    refresh() {
      const p = this.p, U = this.U;
      if (!p || !U) return;
      const need = p.need_exp(), col = TT.REALM_COLORS[p.realm];
      U.realm.textContent = p.realm_name(); U.realm.style.color = col;
      U.name.textContent = p.name;
      U.who.textContent = `${p.gender} · ${p.race} · ${p.age} tuổi`;
      U.root.replaceChildren(...p.root.els.map(e => h("span", { class: "chip", style: { color: TT.ELEMENTS[e].color, borderColor: TT.ELEMENTS[e].color } }, e)),
        h("span", { class: "dim small" }, " " + TT.rootInfo(p.root).name));
      if (p.exp < need) this.fullShown = 0;
      U.barExp.set(p.exp, need, `${TT.fmtNum(p.exp)} / ${TT.fmtNum(need)}`, p.exp >= need);
      U.barHp.set(p.hp, p.max_hp(), `${p.hp} / ${p.max_hp()}`);
      U.barAge.set(p.age, p.lifespan, `${p.age} / ${p.lifespan} năm`);
      STATS.forEach(s => U.statBars[s].set(p.stats[s], 30, String(p.stats[s])));
      U.power.textContent = `Chiến lực: ${p.power()}   Phòng ngự: ${p.def()}\nTốc độ tu luyện: x${p.exp_mult().toFixed(2)}`;
      U.skills.textContent = "Công pháp: " + (p.skills.length ? p.skills.join(", ") : "chưa có");
      U.sect.textContent = "Tông môn: " + (p.sect ? p.sect : "chưa gia nhập");
      U.stone.textContent = `Linh thạch: ${p.stone}`;
      const y = Math.floor(p.months / 12) + 1, m = p.months % 12 + 1;
      U.time.textContent = `Năm ${y}, tháng ${m} (${TT.SEASONS[Math.floor(p.months / 3) % 4]})`;
      this.scene.setSeason(Math.floor((p.months % 12) / 3));
      TT.meta?.check(this);
      this.idleRefresh();
    }

    /** Lưu: ghi lại mốc thời gian idle đã xử lý tới đâu để lần mở sau tính được thời gian vắng mặt. */
    autosave() {
      if (this.p && this.p.idle) this.p.idle.ts = this.idleLast || Date.now();
      TT.writeSave(this.count, this.p);
    }
    manualSave() { if (this.p && !this.dead) { this.autosave(); this.log("Đã lưu game.", "dim"); } }

    lock(ms) { this.locked = true; setTimeout(() => { this.locked = false; }, ms); }

    act(fn) {
      if (this.locked || this.dead || !this.inGame) return;
      fn.call(this);
    }

    passTime(months = 1) {
      const p = this.p;
      for (let i = 0; i < months; i++) {
        p.months++;
        this.rollEncounter();                       // kỳ ngộ: mỗi tháng có cơ hội gặp một lần
        if (p.months % 12 === 0) {
          p.age++;
          if (p.sect) {
            const st = Math.round(SECTS[p.sect].stipend * TT.sectRank(p).stipend); p.stone += st;
            this.log(`Tông môn phát lương năm: +${st} linh thạch.`, "cyan");
          }
          if (p.age % 10 === 0) this.log(`Bạn đã ${p.age} tuổi.`, "dim");
        }
      }
      if (p.age >= p.lifespan) { this.die("Thọ nguyên cạn kiệt, bạn ngồi hóa giữa đất trời..."); return false; }
      this.renderFarm();
      return true;
    }

    endAction() { if (this.dead) return; this.refresh(); this.autosave(); }

    die(reason) {
      this.dead = true;
      TT.meta?.endLife(this, "death", reason);
      this.log(reason, "red");
      this.log(`=== BẠN ĐÃ CHẾT ===  Cảnh giới: ${this.p.realm_name()}, hưởng thọ ${this.p.age} tuổi.`, "red");
      this.log("Bấm 'Trùng sinh' để bắt đầu kiếp mới.", "gold");
      this.scene.setDead(); this.scene.flash("#ff3030", 14);
      this.actionBtns.forEach(b => { b.disabled = true; });
      this.refresh();
      TT.writeSave(this.count + 1, null);
    }

    winGame() {
      this.dead = true;
      TT.meta?.endLife(this, "win");
      this.log("★★★ Thiên kiếp qua đi, bạn phi thăng Tiên Giới! Đại đạo viên mãn! ★★★", "gold");
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          this.scene.burst(this.scene.cx, this.scene.gy - 60, C.GOLD, 30);
          this.scene.fxOnce("break", null, this.scene.gy + 8, 0.3, "s");
        }, i * 250);
      }
      this.actionBtns.forEach(b => { b.disabled = true; });
      TT.writeSave(this.count + 1, null);
    }

    reincarnate() {
      TT.meta?.endLife(this, "abandon");
      this.count++; this.saved = null;
      TT.writeSave(this.count, null);
      this.showCreate();
    }

    gain(n, label = "tu vi") { this.p.exp += n; this.scene.floatText(`+${n} ${label}`, C.GREEN); }

    /* ================= HÀNH ĐỘNG CHÍNH ================= */
    actTrain() {
      const p = this.p;
      let gain = int(p.monthGain(Math.random));
      this.scene.play("train", 55);
      if (Math.random() < p.stats["Ngộ Tính"] / 100) {
        gain *= 2;
        this.log(`Linh quang chợt lóe, bạn đốn ngộ! Tu vi +${gain}`, "gold");
        this.scene.flash("#fff2a8", 8); this.scene.addRing(C.GOLD);
        this.scene.fxOnce("break", null, this.scene.gy + 8, 0.4, "s");
      } else this.log(`Bạn nhắm mắt vận công một tháng. Tu vi +${gain}`, "green");
      this.gain(gain);
      this.lock(700);
      if (this.passTime(1)) this.endAction();
    }

    actRest() {
      const p = this.p, heal = int(p.max_hp() * 0.5);
      p.hp = Math.min(p.max_hp(), p.hp + heal);
      this.scene.play("rest", 55);
      this.scene.floatText(`+${heal} khí huyết`, "#6dff9a");
      this.log(`Bạn nghỉ ngơi dưỡng thương. Khí huyết +${heal}`);
      this.lock(700);
      if (this.passTime(1)) this.endAction();
    }

    actExplore() {
      const p = this.p, sc = this.scene;
      const luck = p.stats["Vận Khí"] + p.stats["Phúc Duyên"];
      const r = rnd(1, 100) + luck;
      p.track.explores++;
      this.lock(1300);
      if (r >= 115) {
        const g = int(p.monthGain() * rnd(3, 5));
        sc.play("explore", 45);
        this.log("★ Cơ duyên! Bạn tìm thấy di tích tu sĩ cổ, nhận truyền thừa.", "gold");
        setTimeout(() => this.gainFx(g), 700);
        return this.finishExplore();
      }
      if (r >= 85) {
        const s = rnd(5, 20) + p.realm * 10;
        p.stone += s; sc.play("explore", 45);
        sc.floatText(`+${s} linh thạch`, C.CYAN);
        this.log(`Bạn nhặt được túi trữ vật, bên trong có ${s} linh thạch.`, "cyan");
      } else if (r >= 55) {
        if (this.fight()) return;
      } else if (r >= 30) {
        sc.play("explore", 45);
        if (rnd(1, 20) <= p.stats["Tướng Mạo"]) {
          const s = rnd(3, 12) + p.realm * 3;
          p.stone += s; sc.floatText(`+${s} linh thạch`, C.CYAN);
          this.log(`Một vị tiền bối thấy bạn thuận mắt, tặng ${s} linh thạch.`, "cyan");
        } else {
          const s = Math.min(p.stone, rnd(2, 8));
          p.stone -= s; sc.floatText(`-${s} linh thạch`, C.RED);
          this.log(`Bạn bị kẻ lừa đảo dụ dỗ, mất ${s} linh thạch.`, "red");
        }
      } else {
        const d = rnd(5, 15);
        p.hp -= d; sc.play("explore", 45); sc.flash("#40ff40", 8);
        sc.floatText(`-${d} khí huyết`, C.RED);
        this.log(`Bạn lạc vào chướng khí, khí huyết -${d}.`, "red");
        if (p.hp <= 0) { this.die("Bạn trúng độc khí mà chết giữa núi hoang."); return; }
      }
      this.finishExplore();
    }

    gainFx(g) {
      if (this.dead) return;
      const sc = this.scene;
      this.p.exp += g;
      sc.floatText(`+${g} tu vi`, C.GOLD); sc.flash("#fff2a8", 8); sc.addRing(C.GOLD);
      sc.fxOnce("break", null, sc.gy + 8, 0.4, "s");
      this.refresh();
    }

    finishExplore() { if (this.passTime(1)) this.endAction(); }

    /** Trả về true nếu nhân vật chết. */
    fight() {
      const p = this.p, sc = this.scene;
      const tier = Math.min(Math.floor(p.realm / 2), 4);
      const mon = pick(MONSTERS[tier]);
      const mp = p.level * 3 + rnd(3, 16);
      const me = p.power() + rnd(0, 10) + p.fbuff;
      p.fbuff = 0;
      const win = me >= mp;
      sc.play("fight", 75, win, tier);
      this.log(`Bạn chạm trán ${mon} (chiến lực ${mp}) - chiến lực bạn ${me}.`);
      if (win) {
        const g = int((mp * 1.2 + rnd(2, 8)) * p.exp_mult());
        const s = rnd(2, 10) + p.realm * 3;
        const lost = rnd(0, 10);
        p.track.kills++;
        p.hp = Math.max(1, p.hp - lost); p.stone += s;
        setTimeout(() => {
          if (this.dead) return;
          p.exp += g;
          sc.floatText(`+${g} tu vi`, C.GREEN); sc.floatText(`+${s} linh thạch`, C.CYAN, 40);
          this.refresh();
        }, 1000);
        this.log(`Bạn đánh bại ${mon}! Tu vi +${g}, linh thạch +${s}, khí huyết -${lost}.`, "green");
      } else {
        let d = rnd(15, 35) + (mp - me);
        if (p.guard > 0) {
          d = int(d * Math.max(0.15, 1 - 0.35 * p.guard));
          p.guard = 0.0;
          this.log("Hộ Thân Phù phát sáng, giảm bớt sát thương!", "cyan");
        }
        p.hp -= d;
        this.log(`${mon} mạnh hơn! Bạn bị thương, khí huyết -${d}.`, "red");
        if (p.hp <= 0) {
          this.dead = true;                        // chặn thao tác trong lúc diễn hoạt cảnh
          setTimeout(() => { this.dead = false; this.die(`Bạn bị ${mon} xé xác, hồn phách tiêu tán.`); }, 1000);
          return true;
        }
      }
      return false;
    }

    actStone() {
      const p = this.p;
      if (p.stone < 10) { this.log("Cần ít nhất 10 linh thạch để luyện hóa.", "red"); return; }
      p.stone -= 10;
      const g = int(p.monthGain() * 1.5);
      this.scene.play("train", 45); this.scene.addRing(C.CYAN);
      this.gain(g);
      this.log(`Bạn hấp thu 10 linh thạch. Tu vi +${g}`, "green");
      this.lock(600);
      this.endAction();
    }

    /** Đột phá do người chơi chủ động kích hoạt (nhập định không bao giờ tự đột phá). */
    actBreakthrough() {
      const p = this.p, need = p.need_exp();
      if (this.breaking) return;
      if (p.exp < need) { this.log(`Tu vi chưa đủ (${p.exp}/${need}).`, "red"); return; }
      const big = p.tang === 9;
      if (big && p.realm + 1 >= 3) {                 // đại cảnh giới từ Kim Đan trở lên phải qua Thiên Kiếp
        const est = this.tribEstimate(p.realm + 1);
        if (p.hp < est.expect * 1.2) {
          TT.ui.confirm({
            title: "Thiên Kiếp sắp giáng",
            text: `${est.strikes} đạo lôi, ước tính mất ~${est.expect} khí huyết.\nKhí huyết hiện tại: ${p.hp}/${p.max_hp()}. Nên nghỉ ngơi trước.`,
            ok: "Vẫn đột phá", cancel: "Nghỉ trước", danger: true,
          }).then(yes => { if (yes && this.inGame && !this.dead && !this.breaking && this.p === p) this.beginBreak(p, need, big); });
          return;
        }
      }
      this.beginBreak(p, need, big);
    }

    beginBreak(p, need, big) {
      const chance = p.breakChance(big);
      this.breaking = true;
      this.log(`Bạn bắt đầu đột phá${big ? " đại cảnh giới" : ""}... (tỉ lệ thành công ~${int(chance * 100)}%)`, "gold");
      this.scene.play("break", 80);
      this.lock(1700);
      const tok = this.token;
      setTimeout(() => this.finishBreak(chance, big, need, tok), 1450);
    }

    finishBreak(chance, big, need, tok) {
      if (tok !== this.token || !this.inGame) return;     // đã trùng sinh / thoát ván cũ
      this.breaking = false;
      if (this.dead) return;
      const p = this.p, sc = this.scene;
      p.pill = 0.0; p.suppress = false; this.fullShown = 0;
      if (Math.random() < chance) {
        p.exp -= need; p.track.brk++;
        sc.flash("#ffffff", 10); sc.burst(sc.cx, sc.gy - 60, C.GOLD, 36); sc.addRing(C.GOLD);
        sc.fxOnce("break", null, sc.gy + 8, 0.3, "s");
        if (big) {
          if (!this.tribulation(p.realm + 1)) return;   // chết dưới thiên lôi
          if (p.realm === REALMS.length - 1) { this.refresh(); this.winGame(); return; }
          p.realm++; p.tang = 1;
          p.lifespan += TT.PROG.LIFE[p.realm];
          p.hp = p.max_hp();
          sc.floatText("ĐỘT PHÁ: " + REALMS[p.realm], C.GOLD);
          this.log(`★ Đột phá đại cảnh giới: ${REALMS[p.realm]}! Thọ nguyên tăng lên ${p.lifespan} tuổi.`, "gold");
        } else {
          p.tang++;
          p.hp = Math.min(p.max_hp(), p.hp + 20);
          sc.floatText(`Lên tầng ${p.tang}!`, C.GOLD);
          this.log(`Đột phá thành công, lên ${p.realm_name()}.`, "green");
        }
      } else {
        p.track.fails++;
        p.exp = int(p.exp * p.failKeep(big));
        const d = rnd(10, 30) + (big ? 20 : 0) + p.realm * 6;
        p.hp -= d;
        sc.flash("#ff3030", 12); sc.fxOnce("hit", null, sc.gy - 60, 0.4); sc.shake = 12;
        sc.floatText(`THẤT BẠI -${d}`, C.RED);
        this.log(`Đột phá thất bại! Tu vi hao tổn ${int((1 - p.failKeep(big)) * 100)}%, khí huyết -${d}.`, "red");
        if (p.hp <= 0) { this.die("Tẩu hỏa nhập ma, thân tử đạo tiêu."); return; }
      }
      if (this.passTime(1)) this.endAction();
    }

    /* ================= THIÊN KIẾP ================= */
    /** Số đạo lôi và sát thương kỳ vọng khi vượt kiếp lên cảnh giới R. */
    tribEstimate(R) {
      const p = this.p, pw = p.power(), mit = pw / (pw + 150 + R * 40);
      const strikes = 3 + (R >> 1), base = (10 + R * 9) * (1 - mit);
      const gf = p.guard > 0 ? Math.max(0.15, 1 - 0.35 * p.guard) : 1;
      return { strikes, base, mit, gf, expect: int(strikes * base * gf) };
    }

    /** Thiên Kiếp: nhiều đạo lôi đánh xuống, khí huyết về 0 là chết. Trả về false nếu nhân vật đã chết. */
    tribulation(R) {
      if (R < 3) return true;
      const p = this.p, sc = this.scene, est = this.tribEstimate(R);
      this.log(`⚡ Thiên Kiếp giáng xuống! ${est.strikes} đạo lôi kiếp bổ thẳng vào người bạn...`, "gold");
      if (p.guard > 0) { this.log("Hộ Thân Phù hóa thành màn sáng, che chắn bớt lôi kiếp!", "cyan"); p.guard = 0.0; }
      let total = 0, dead = false;
      for (let i = 0; i < est.strikes; i++) {
        const d = Math.max(1, int(est.base * est.gf * uni(0.8, 1.25)));
        total += d; p.hp -= d;
        setTimeout(() => {
          if (!this.inGame) return;
          sc.flash("#cfe8ff", 6); sc.shake = 8; sc.fxOnce("bolt", sc.cx + rnd(-30, 30), sc.gy - 4, 0.6, "s");
          sc.floatText(`-${d}`, C.RED, rnd(-40, 40));
        }, i * 220);
        if (p.hp <= 0) { dead = true; break; }
      }
      if (dead) { this.die("Thiên kiếp quá mạnh, thân xác hóa thành tro bụi dưới lôi đình."); return false; }
      p.track.trib++;
      this.log(`Bạn gắng gượng chịu ${est.strikes} đạo thiên lôi, mất ${total} khí huyết nhưng vẫn sống sót!`, "gold");
      const s = pick(STATS);
      p.stats[s]++;
      this.log(`Lôi kiếp tẩy lễ thân thể, ${s} +1.`, "green");
      return true;
    }

    /* ================= TÚI ĐỒ ================= */
    /** noTrack = true: vật phẩm nhặt được (kỳ ngộ / bí cảnh) không tính vào thành tựu thu hoạch / chế tạo. */
    invAdd(name, q = 0, n = 1, noTrack = false) {
      const k = q === 0 ? name : `${name}|${q}`, inv = this.p.inv;
      inv[k] = (inv[k] || 0) + n;
      if (inv[k] <= 0) delete inv[k];
      const t = this.p.track;
      if (t && n > 0 && !noTrack) { if (name === "Linh Thảo") t.herbs += n; else if (USABLE.includes(name)) t.crafted += n; }
    }
    invKeys(name) {
      return Object.keys(this.p.inv).filter(k => k.split("|")[0] === name).map(k => [k, k.includes("|") ? +k.split("|")[1] : 0]);
    }
    invN(name) { return this.invKeys(name).reduce((s, [k]) => s + this.p.inv[k], 0); }
    /** Lấy n món, trả về mảng phẩm chất đã lấy. */
    invTake(name, n, lowest = false) {
      const got = [];
      const keys = this.invKeys(name).sort((a, b) => lowest ? a[1] - b[1] : b[1] - a[1]);
      for (const [k, q] of keys) {
        while (n > 0 && (this.p.inv[k] || 0) > 0) { this.p.inv[k]--; got.push(q); n--; }
        if (this.p.inv[k] === 0) delete this.p.inv[k];
      }
      return got;
    }
    invTakeExact(name, q) {
      const k = `${name}|${q}`;
      if ((this.p.inv[k] || 0) <= 0) return false;
      if (--this.p.inv[k] <= 0) delete this.p.inv[k];
      return true;
    }

    applyItem(name, q) {
      const p = this.p, m = QMUL[q], sc = this.scene;
      if (name === "Tụ Khí Đan") {
        const g = int(p.need_exp() * TT.PROG.PILL * m); p.exp += g;
        sc.fxOnce("qi", null, null, 0.4);
        return `Tụ Khí Đan: tu vi +${g}.`;
      }
      if (name === "Hồi Huyết Đan") {
        const hh = int(p.max_hp() * Math.min(1.0, 0.5 * m));
        p.hp = Math.min(p.max_hp(), p.hp + hh);
        sc.fxOnce("heal", null, sc.gy + 6, 0.35, "s");
        return `Hồi Huyết Đan: khí huyết +${hh}.`;
      }
      if (name === "Phá Cảnh Đan") {
        p.pill = Math.min(0.5, p.pill + 0.15 * m);
        sc.fxOnce("break", null, sc.gy + 8, 0.4, "s");
        return "Phá Cảnh Đan: tỉ lệ đột phá tăng.";
      }
      if (name === "Cường Lực Phù") { p.fbuff += int(10 * m); return `Cường Lực Phù: chiến lực trận kế +${int(10 * m)}.`; }
      if (name === "Hộ Thân Phù") { p.guard = Math.max(p.guard, m); return "Hộ Thân Phù: linh quang hộ thể cho trận kế."; }
      p.pill = Math.min(0.5, p.pill + 0.08 * m);
      return "Phá Cảnh Phù: tỉ lệ đột phá tăng.";
    }

    useItem(name, q) {
      if (this.dead || !this.invTakeExact(name, q)) return;
      this.log(this.applyItem(name, q), "gold");
      this.scene.addRing(C.CYAN);
    }

    sellItem(key) {
      const n = key.split("|")[0], q = key.includes("|") ? +key.split("|")[1] : 0;
      if ((this.p.inv[key] || 0) <= 0) return;
      if (--this.p.inv[key] <= 0) delete this.p.inv[key];
      const v = TT.sellValue(n, q);
      this.p.stone += v; this.p.track.sold += v;
      this.log(`Bán ${n} được ${v} linh thạch.`, "cyan");
    }

    openBag() { this.openDialog("Túi đồ", () => this.rowsBag()); }
    rowsBag() {
      const rows = [];
      for (const [n, q] of Object.entries(this.p.gear))
        rows.push({ name: `${n} [${QN[q]}]`, icon: TT.iconFor(n, 40), desc: TT.itemDesc(n, q), price: "Đang trang bị", btn: "Đã mang", cb: () => {}, ok: false });
      for (const k of Object.keys(this.p.inv).sort()) {
        const n = k.split("|")[0], q = k.includes("|") ? +k.split("|")[1] : 0, use = USABLE.includes(n);
        rows.push({
          name: `${n}${q ? ` [${QN[q]}]` : ""}  x${this.p.inv[k]}`, icon: TT.iconFor(n, 40, q), desc: TT.itemDesc(n, q),
          price: `Giá bán: ${TT.sellValue(n, q)} linh thạch`, btn: use ? "Dùng" : "—", cb: () => this.useItem(n, q), ok: use,
          extra: { text: "Bán", cb: () => this.sellItem(k), ok: true },
        });
      }
      if (!rows.length) rows.push({ name: "Túi đồ trống", desc: "Mua nguyên liệu ở Cửa hàng hoặc tự chế tạo ở Nghề phụ.", price: "", btn: "—", cb: () => {}, ok: false });
      return rows;
    }

    /* ================= CỬA HÀNG / CÔNG PHÁP / TÔNG MÔN ================= */
    openShop() { this.openDialog("Cửa hàng đan dược", () => this.rowsShop()); }
    shopPrice(name) {
      const p = this.p, disc = p.sect ? SECTS[p.sect].disc : 1.0;
      return int({ ...ITEMS, ...MATS }[name].cost * (1 + p.realm * 0.3) * disc);
    }
    rowsShop() {
      return [...Object.entries(ITEMS), ...Object.entries(MATS)].map(([name, it]) => {
        const pr = this.shopPrice(name);
        return { name, icon: TT.iconFor(name, 40), desc: it.desc, price: `Giá: ${pr} linh thạch`, btn: "Mua", cb: () => this.buy(name), ok: this.p.stone >= pr };
      });
    }
    buy(name) {
      const p = this.p, pr = this.shopPrice(name), sc = this.scene;
      if (p.stone < pr) return;
      p.stone -= pr;
      if (MATS[name]) { this.invAdd(name); this.log(`Mua ${name} (trong túi: ${this.invN(name)}).`, "cyan"); return; }
      if (name === "Tụ Khí Đan") {
        const g = int(p.need_exp() * TT.PROG.PILL); this.gain(g);
        this.log(`Dùng Tụ Khí Đan, tu vi +${g}.`, "green");
      } else if (name === "Hồi Huyết Đan") {
        p.hp = p.max_hp(); sc.floatText("Hồi đầy khí huyết", "#6dff9a");
        this.log("Dùng Hồi Huyết Đan, khí huyết hồi đầy.", "green");
      } else if (name === "Phá Cảnh Đan") {
        p.pill = Math.min(0.4, p.pill + 0.2);
        this.log(`Nuốt Phá Cảnh Đan, tỉ lệ đột phá lần tới +${int(p.pill * 100)}%.`, "gold");
      } else if (name === "Trường Thọ Quả") {
        const y = TT.lifeBonus(8, p.realm); p.lifespan += y; sc.floatText(`Thọ nguyên +${y}`, C.GOLD);
        this.log(`Ăn Trường Thọ Quả, thọ nguyên +${y} năm.`, "gold");
      }
      sc.addRing(C.CYAN);
      const fx = { "Tụ Khí Đan": ["qi", null, 0.4, "center"], "Phá Cảnh Đan": ["break", sc.gy + 8, 0.4, "s"],
        "Hồi Huyết Đan": ["heal", sc.gy + 6, 0.35, "s"], "Trường Thọ Quả": ["heal", sc.gy + 6, 0.35, "s"] }[name];
      sc.fxOnce(fx[0], null, fx[1], fx[2], fx[3]);
    }

    openSkills() { this.openDialog("Tàng Kinh Các - Công pháp", () => this.rowsSkills()); }
    rowsSkills() {
      const p = this.p, rows = [];
      for (const [name, s] of Object.entries(SKILLS)) {
        const icon = TT.iconFor(name, 40);
        if (p.skills.includes(name)) rows.push({ name, icon, desc: s.desc, price: "Đã lĩnh ngộ", btn: "Đã học", cb: () => {}, ok: false });
        else {
          const need = p.realm >= s.realm ? "" : `  (yêu cầu: ${REALMS[s.realm]})`;
          const ok = p.realm >= s.realm && p.stone >= s.cost;
          rows.push({ name, icon, desc: s.desc, price: `Giá: ${s.cost} linh thạch${need}`, btn: "Học", cb: () => this.learn(name), ok });
        }
      }
      return rows;
    }
    learn(name) {
      const p = this.p, s = SKILLS[name];
      if (p.stone < s.cost || p.realm < s.realm || p.skills.includes(name)) return;
      p.stone -= s.cost; p.skills.push(name);
      p.hp = Math.min(p.max_hp(), p.hp);
      this.log(`Bạn lĩnh ngộ công pháp [${name}]!`, "gold");
      this.scene.floatText(name, C.GOLD); this.scene.flash("#9fd0ff", 8);
    }

    openSect() { this.openDialog("Tông môn", () => this.rowsSect()); }
    rowsSect() {
      const p = this.p, rows = [];
      if (p.sect) {
        const rk = TT.sectRank(p), X = p.sectx, run = X && X.active && TT.missionById(X.active.id);
        rows.push({ name: "Bảng nhiệm vụ", icon: TT.iconFor("Nhiệm vụ tông môn"), desc: `Chức vị: ${rk.name} · cống hiến ${X ? X.contrib : 0}. Nhiệm vụ chạy theo thời gian thật, kể cả khi đóng game.${run ? " Đang làm: " + run.name + "." : ""}`, price: "", btn: "Mở", cb: () => this.openMissions(), ok: true });
        rows.push({ name: "Kho tông môn", icon: TT.iconFor("Kho tông môn"), desc: "Đổi cống hiến lấy đan dược, nguyên liệu, Tinh Hoa...", price: "", btn: "Mở", cb: () => this.openSectShop(), ok: true });
        rows.push({ name: "Rời " + p.sect, icon: TT.iconFor("Rời"), desc: "Mất toàn bộ phúc lợi của tông môn.", price: "", btn: "Rời đi", cb: () => this.leaveSect(), ok: true });
      } else {
        for (const [name, s] of Object.entries(SECTS)) {
          const ok = p.realm >= s.realm;
          rows.push({ name, icon: TT.iconFor(name, 40), desc: s.desc, price: ok ? "" : `Yêu cầu: ${REALMS[s.realm]}`, btn: "Gia nhập", cb: () => this.joinSect(name), ok });
        }
      }
      return rows;
    }
    joinSect(name) {
      const p = this.p;
      if (rnd(1, 20) <= 8 + p.stats["Tướng Mạo"]) {
        this.sectEnter(name);
        this.log(`Bạn được [${name}] nhận làm đệ tử!`, "gold");
        this.scene.floatText("Gia nhập " + name, C.GOLD);
      } else this.log(`[${name}] từ chối bạn lần này. Tướng Mạo càng cao càng dễ được nhận.`, "red");
    }
    leaveSect() { this.log(`Bạn rời khỏi [${this.p.sect}].`, "dim"); this.sectExit(); }
  }
  TT.Game = Game;
})();
