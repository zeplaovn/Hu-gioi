/* HƯ GIỚI · LỚP GIAO DIỆN IDLE
 * Thanh tài nguyên có số chạy, thanh tu vi, dock nâng cấp nhanh, nút đột phá đại cảnh giới,
 * hiệu ứng AFK, chấm thông báo trên tab, hiệu ứng tự động đột phá và đếm số cho popup bế quan.
 * Chỉ đọc trạng thái từ HU_UI; mọi thay đổi game đi qua data-act như các màn khác. */
(function (root) {
  'use strict';
  const UI = root.HU_UI, H = root.HU_GAME, A = root.HU_ASSETS;
  if (!UI || !H || !A || !UI.kit) return;
  const F = H.F;
  const { $, esc, clamp, num, money, moneyHTML, pct, duration } = UI.kit;

  const state = { built: false, prev: null, dock: '', stone: 0, shown: { stone: null, dao: null }, tweens: new Map(), coinTier: '' };

  const session = () => { try { return UI.s && UI.s().created ? UI.s() : null; } catch { return null; } };
  const game = () => { try { return UI.g(); } catch { return null; } };
  const reducedMotion = s => {
    const mode = s.settings && s.settings.motionMode;
    const mq = typeof root.matchMedia === 'function' ? root.matchMedia('(prefers-reduced-motion: reduce)') : null;
    return mode === 'reduced' || (mode !== 'full' && !!(mq && mq.matches));
  };
  const fxOn = s => !document.hidden && !reducedMotion(s) && s.settings.cultivationEffects !== false && (!UI.vfx || UI.vfx.effectsEnabled());

  /* ---------- Dựng DOM một lần ---------- */
  function mk(tag, cls, html) { const el = document.createElement(tag); if (cls) el.className = cls; if (html != null) el.innerHTML = html; return el; }

  function build() {
    if (state.built) return true;
    const scene = $('scene'), hud = scene && scene.querySelector('.stage-hud');
    if (!scene || !hud || !$('playerRealm')) return false;

    hud.append(mk('div', 'idle-chips', `
      <div class="idle-chip stone" id="chipStone" title="Linh thạch"><span class="chip-ico" id="chipStoneIco"></span><b id="chipStoneVal">0</b></div>
      <div class="idle-chip rate" id="chipRate" title="Tu vi hấp thụ mỗi giây"><span class="chip-ico" aria-hidden="true">☯</span><b id="chipRateVal">+0/giây</b></div>
      <div class="idle-chip dao" id="chipDao" title="Đạo vận"><span class="chip-ico" aria-hidden="true">✧</span><b id="chipDaoVal">0</b></div>`));
    hud.querySelector('.idle-chips').id = 'idleChips';

    const deck = mk('div', 'idle-deck', `
      <button type="button" class="peak-cta" id="peakCta" data-act="break" hidden></button>
      <div class="quick-dock" id="quickDock" role="group" aria-label="Nâng cấp nhanh"></div>`);
    deck.id = 'idleDeck';
    const bottom = scene.querySelector('.scene-bottom');
    scene.insertBefore(deck, bottom || null);

    $('playerRealm').after(mk('div', 'stage-pips', ''));
    $('playerRealm').nextElementSibling.id = 'stagePips';

    const hero = scene.querySelector('.hero-wrap');
    if (hero) hero.insertBefore(mk('div', 'hero-rune', '<i></i>'), hero.firstChild);

    const motes = mk('div', 'idle-motes', '');
    motes.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 16; i++) {
      const m = mk('i');
      m.style.cssText = `--x:${(Math.random() * 100).toFixed(1)}%;--s:${(2 + Math.random() * 3).toFixed(1)}px;--d:${(7 + Math.random() * 8).toFixed(1)}s;--delay:${(-Math.random() * 12).toFixed(1)}s;--dx:${(Math.random() * 80 - 40).toFixed(0)}px`;
      motes.append(m);
    }
    scene.insertBefore(motes, scene.querySelector('.idle-aura'));

    if (typeof root.ResizeObserver === 'function') {
      new root.ResizeObserver(() => { $('stage')?.style.setProperty('--deck-h', Math.round(deck.offsetHeight) + 'px'); }).observe(deck);
    }
    state.built = true;
    return true;
  }

  /* ---------- Số chạy ---------- */
  function tween(key, target, render) {
    const cur = state.shown[key];
    if (cur == null) { state.shown[key] = target; render(target); return; }
    if (cur === target && !state.tweens.has(key)) return;
    const prev = state.tweens.get(key);
    if (prev && prev.to === target) return;
    const from = cur, start = performance.now(), dur = Math.min(700, 250 + Math.abs(target - from) / Math.max(1, Math.abs(target)) * 450);
    const entry = { to: target };
    state.tweens.set(key, entry);
    const step = now => {
      if (state.tweens.get(key) !== entry) return;
      const t = clamp((now - start) / dur, 0, 1), eased = 1 - Math.pow(1 - t, 3);
      const v = t >= 1 ? target : from + (target - from) * eased;
      state.shown[key] = v;
      render(v);
      if (t < 1) requestAnimationFrame(step); else state.tweens.delete(key);
    };
    requestAnimationFrame(step);
  }

  function coinTierFor(value) {
    let name = 'Hạ';
    for (const [label, amount] of F.COINS) if (Number(value) >= amount) name = label;
    return /Tiên tinh|Hỗn Độn/.test(name) ? 'jade' : name === 'Hạ' ? 'low' : 'high';
  }

  function updateChips(s, g) {
    const val = $('chipStoneVal'), ico = $('chipStoneIco');
    if (!val) return;
    const gain = s.stone - state.stone;
    if (state.prev && gain >= 1 && state.stone !== 0) {
      const chip = $('chipStone'), tag = mk('span', 'chip-gain', '+' + money(gain));
      chip.append(tag); setTimeout(() => tag.remove(), 1400);
      chip.classList.remove('bump'); void chip.offsetWidth; chip.classList.add('bump');
    }
    state.stone = s.stone;
    tween('stone', s.stone, v => {
      val.textContent = money(Math.max(0, v));
      const tier = coinTierFor(v);
      if (tier !== state.coinTier) { state.coinTier = tier; ico.innerHTML = `<img src="${esc(A.moneyIcon(tier))}" alt="" decoding="async">`; }
    });
    $('chipStone').setAttribute('aria-label', 'Linh thạch ' + money(s.stone));
    $('chipRateVal').textContent = '+' + num(g.rate()) + '/giây';
    tween('dao', s.daoVan, v => { $('chipDaoVal').textContent = num(Math.round(v)); });
  }

  /* ---------- Dải tầng, nút đột phá đại cảnh giới (tu vi xem ở bảng trạng thái) ---------- */
  function updateProgress(s, g) {
    const need = g.need(), p = clamp(s.qi / need * 100, 0, 100), full = p >= 100 - 1e-9;
    const peak = g.isPeakStage(), total = F.STAGES[s.realm];
    $('stage')?.style.setProperty('--qi-p', String((p / 100).toFixed(3)));

    const cta = $('peakCta'), ready = !s.completed && peak && full;
    if (cta.hidden === ready) cta.hidden = !ready;
    if (ready) {
      const next = s.realm < 13 ? F.REALMS[s.realm + 1] : 'Đạo Tổ';
      const html = `⚡ ĐỘT PHÁ ĐẠI CẢNH GIỚI<small>${esc(F.REALMS[s.realm])} → ${esc(next)} · xác suất ${pct(g.chance())}</small>`;
      if (cta.dataset.html !== html) { cta.dataset.html = html; cta.innerHTML = html; }
    }

    const pips = $('stagePips'), key = s.realm + ':' + s.stage + ':' + total;
    if (pips && pips.dataset.key !== key) {
      pips.dataset.key = key;
      pips.setAttribute('aria-label', 'Tầng ' + s.stage + ' trên ' + total);
      pips.innerHTML = Array.from({ length: total }, (_, i) => {
        const n = i + 1, cls = [n < s.stage ? 'done' : n === s.stage ? 'now' : '', n === total ? 'peak' : ''].filter(Boolean).join(' ');
        return `<i class="${cls}"></i>`;
      }).join('');
    }
  }

  /* ---------- Dock nâng cấp nhanh ---------- */
  function pills(s, effect) {
    return Object.keys(s.bag).map(H.item).filter(x => x && x.kind === 'PILL' && x.effect === effect && x.tier <= s.realm + 1)
      .sort((a, b) => b.tier - a.tier || b.sub - a.sub);
  }

  function dockHTML(s, g) {
    const growth = (F.P && F.P.UP_GROWTH) || 1.15, owned = s.tech[1] - 1, base = g.upgradeBase(1), capped = owned >= 20;
    const one = F.cost(base, growth, owned), peakFull = g.isPeakStage() && s.qi >= g.need();
    const ten = Math.min(10, 20 - owned), tenCost = ten > 0 ? F.bulk_cost(base, growth, owned, ten) : Infinity;
    const b = (label, count, cost) => `<button type="button" data-act="upgrade" data-index="1" data-count="${count}" ${capped || s.stone < cost ? 'disabled' : ''}>${label}</button>`;
    const upgrade = `<div class="qd-card up"><div class="qd-top"><span class="qd-name">Tốc tu +2% <small>${owned}/20</small></span>
      <span class="qd-price">${capped ? 'Tối đa' : moneyHTML(one)}</span></div>
      <div class="qd-btns">${b('×1', 1, one)}${b('×10', 10, tenCost)}${b('Tối đa', 'max', one)}</div></div>`;

    let coin = -1;
    for (let i = 2; i >= 0; i--) if (F.COINS[i] && s.stone >= F.COINS[i][1]) { coin = i; break; }
    const absorbOk = coin >= 0 && !peakFull;
    const absorbGain = coin >= 0 ? F.absorb_exp(s.realm, coin, 1) : 0;
    const absorb = `<div class="qd-card${coin < 0 ? ' empty' : ''}"><div class="qd-top"><span class="qd-name">Hấp thu</span>
      <span class="qd-price">${coin >= 0 ? '1 ' + esc(F.COINS[coin][0]) : 'Thiếu linh thạch'}</span></div>
      <button type="button" class="qd-one" data-act="absorb" data-index="${Math.max(coin, 0)}" ${absorbOk ? '' : 'disabled'}>${coin >= 0 ? '+' + num(absorbGain) + ' tu vi' : 'Hấp thu'}</button></div>`;

    const pill = pills(s, 'TU_VI')[0];
    const dan = pill
      ? `<div class="qd-card"><div class="qd-top"><span class="qd-name">${esc(pill.name)}</span><span class="qd-price">×${g.count(pill.key)}</span></div>
        <button type="button" class="qd-one" data-act="consume" data-code="${esc(pill.key)}" ${peakFull ? 'disabled' : ''}>Dùng đan</button></div>`
      : `<div class="qd-card empty"><div class="qd-top"><span class="qd-name">Đan tu vi</span><span class="qd-price">Chưa có</span></div>
        <button type="button" class="qd-one" data-go="craft:dan">Luyện đan</button></div>`;
    return upgrade + absorb + dan;
  }

  function updateDock(s, g) {
    const dock = $('quickDock');
    if (!dock) return;
    const html = dockHTML(s, g);
    if (html !== state.dock) { state.dock = html; dock.innerHTML = html; }
  }

  /* ---------- Chấm thông báo trên tab ---------- */
  function dot(id, on) {
    const btn = document.querySelector('#menu [data-window="' + id + '"]');
    if (!btn) return;
    let el = btn.querySelector('.badge.dot');
    if (on && !el) { el = mk('em', 'badge dot'); btn.append(el); }
    if (el) el.hidden = !on;
  }

  function updateDots(s, g) {
    const quests = (UI.data && UI.data.QUESTS) || [];
    const claimable = quests.some(q => !s.claimed.includes(q[0]) && s.progress[q[0]] >= q[2]);
    dot('world', claimable);
    dot('idle', !s.completed && g.isPeakStage() && s.qi >= g.need());
    dot('craft', s.garden.some(p => !p.wilt && p.end <= Date.now()) || s.craftQueue.some(j => j.end <= Date.now()));
  }

  /* ---------- Tự động đột phá + hiệu ứng ---------- */
  function onAutoStage(s, g, ups) {
    const label = g.realmLabel();
    const xp = document.querySelector('#status .status-progress');
    if (xp) { xp.classList.remove('stage-up'); void xp.offsetWidth; xp.classList.add('stage-up'); }
    if ($('modalLayer') && !$('modalLayer').hidden) return;
    UI.toast('Tự động đột phá: ' + label + '.', { type: 'success', title: ups > 1 ? 'Đột phá +' + ups + ' tầng' : 'Đột phá' });
    if (UI.vfx && fxOn(s)) {
      UI.vfx.effect('break');
      UI.vfx.ring('hero', '#f2d679');
      UI.vfx.float(ups > 1 ? '+' + ups + ' tầng!' : 'Đột phá!', 'hero', 'won');
    }
  }

  /* ---------- Cầu linh khí bay vào thanh tu vi ở bảng trạng thái ---------- */
  function orbs(s) {
    const scene = $('scene'), hero = $('heroSprite'), target = $('topQiFill');
    if (!scene || !hero || !target || !fxOn(s) || s.auto || $('game').dataset.stage !== 'idle') return;
    if (UI.tribulation && UI.tribulation.pageOpen) return;
    const sr = scene.getBoundingClientRect(), hr = hero.getBoundingClientRect(), tr = target.parentElement.getBoundingClientRect();
    if (!hr.width || !tr.width) return;
    const sx = hr.left + hr.width / 2 - sr.left, sy = hr.top + hr.height * .45 - sr.top;
    const tx = tr.left + Math.max(10, tr.width * clamp(s.qi / Math.max(1, UI.g().need()), 0, 1)) - sr.left - sx;
    const ty = tr.top + tr.height / 2 - sr.top - sy;
    for (let i = 0; i < 2; i++) {
      const o = mk('span', 'qi-orb');
      o.style.cssText = `left:${sx + (Math.random() * 40 - 20)}px;top:${sy + (Math.random() * 30 - 15)}px;--tx:${tx}px;--ty:${ty}px;--t:${(0.9 + Math.random() * .5).toFixed(2)}s;animation-delay:${i * 180}ms`;
      scene.append(o);
      setTimeout(() => o.remove(), 2000);
    }
  }

  /* ---------- Vòng cập nhật ---------- */
  function update() {
    const s = session(), g = game();
    if (!s || !g || typeof g.isPeakStage !== 'function') return;
    if (!build()) return;
    updateChips(s, g);
    updateProgress(s, g);
    updateDock(s, g);
    updateDots(s, g);
    const prev = state.prev;
    if (prev && prev.created === s.created && s.realm === prev.realm && s.stage > prev.stage) onAutoStage(s, g, s.stage - prev.stage);
    state.prev = { created: s.created, realm: s.realm, stage: s.stage };
    $('stage')?.classList.toggle('low-fx', reducedMotion(s));
    $('scene')?.classList.toggle('low-fx', reducedMotion(s) || s.settings.cultivationEffects === false);
  }

  /* ---------- Đếm số cho popup (phần tử [data-countup]) ---------- */
  function countUp(container) {
    (container || document).querySelectorAll('[data-countup]').forEach(el => {
      const to = Number(el.dataset.countup) || 0, fmt = el.dataset.fmt || 'num', sign = to < 0 ? '−' : '+', abs = Math.abs(to);
      const show = v => { el.textContent = sign + (fmt === 'money' ? money(v) : num(Math.round(v))); };
      const s = session();
      if (!s || reducedMotion(s) || abs === 0) { show(abs); return; }
      const start = performance.now(), dur = 1100;
      const step = now => { const t = clamp((now - start) / dur, 0, 1); show(abs * (1 - Math.pow(1 - t, 3))); if (t < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  }

  UI.idle = { update, countUp, orbs: () => { const s = session(); if (s) orbs(s); } };
  setInterval(() => { try { update(); } catch (e) { console.warn('Hư Giới · idle-hud:', e.message); } }, 500);
  setInterval(() => { try { UI.idle.orbs(); } catch (e) { /* hiệu ứng không được làm hỏng game */ } }, 1100);
})(typeof window !== 'undefined' ? window : globalThis);
