/* HƯ GIỚI · BỘ PHÁT HIỆU ỨNG KHUNG HÌNH
 * Nhận chuỗi 8 khung PNG từ HU_ASSETS và đổi src theo nhịp thời gian.
 * Chuỗi slash/hit/bolt/break/heal/qi và nhịp vòng sáng/hạt tham chiếu Hu-gioi.
 * Phát bằng DOM, cùng tọa độ nhân vật; chạy trực tiếp qua file://. */
(function (root) {
  'use strict';
  const A = root.HU_ASSETS, UI = root.HU_UI;
  if (!A || !UI) return;

  const running = new Set();
  const MAX_EFFECTS = 64;
  const hostOf = host => typeof host === 'string' ? document.querySelector(host) : host;
  const prefersReduced = () => !!UI.isReduced?.();
  const effectsEnabled = () => {
    const s = UI.s?.();
    return !prefersReduced() && s?.settings?.combatEffects !== false;
  };

  function transient(host, el, ms, enabled = effectsEnabled) {
    if (!host || !enabled() || document.hidden || running.size >= MAX_EFFECTS) return null;
    host.append(el);
    let timer;
    const handle = { el, stop() { clearTimeout(timer); el.remove(); running.delete(handle); } };
    running.add(handle);
    timer = setTimeout(handle.stop, ms);
    return handle;
  }

  function play(host, opts = {}) {
    const elHost = hostOf(host);
    if (!elHost || !opts.kind || !opts.variant) return null;
    if (!effectsEnabled() || document.hidden || running.size >= MAX_EFFECTS) return null;
    const imgs = A.preloadVfx(opts.kind, opts.variant);
    if (!imgs.length) return null;

    const sprite = document.createElement('img');
    sprite.className = 'vfx-sprite ' + (opts.className || '');
    sprite.alt = opts.alt || '';
    if (!opts.alt) sprite.setAttribute('aria-hidden', 'true');
    sprite.draggable = false;
    sprite.decoding = 'async';
    if (opts.style) Object.assign(sprite.style, opts.style);
    if (opts.size) { sprite.style.width = opts.size; sprite.style.height = opts.size; }
    sprite.src = imgs[0].src;
    elHost.append(sprite);

    const fps = Math.max(1, Number(opts.fps) || 14);
    const frameMs = 1000 / fps;
    let index = 0, start = 0, raf = 0, stopped = false;
    const handle = {
      el: sprite,
      stop() {
        if (stopped) return;
        stopped = true;
        cancelAnimationFrame(raf);
        sprite.remove();
        running.delete(handle);
        opts.onDone?.(false);
      }
    };
    running.add(handle);

    const tick = now => {
      if (stopped) return;
      if (!elHost.isConnected || !effectsEnabled() || document.hidden) { handle.stop(); return; }
      if (!start) start = now;
      const want = Math.floor((now - start) / frameMs);
      if (want !== index) {
        index = want;
        if (index >= imgs.length) {
          if (opts.loop) {
            index = 0;
            start = now;
          } else {
            stopped = true;
            cancelAnimationFrame(raf);
            sprite.remove();
            running.delete(handle);
            opts.onDone?.(true);
            return;
          }
        }
        sprite.src = imgs[index].src;
      }
      raf = requestAnimationFrame(tick);
    };
    // Chờ ảnh tải xong để lần phát đầu không bỏ qua các khung hình.
    Promise.all(imgs.map(im => im.decode ? im.decode().catch(() => null) : Promise.resolve())).then(() => {
      if (!stopped) raf = requestAnimationFrame(tick);
    });
    return handle;
  }

  function at(host, opts = {}) {
    const style = { ...(opts.style || {}) };
    if (opts.x != null) style.left = opts.x;
    if (opts.y != null) style.top = opts.y;
    if (opts.size) { style.width = opts.size; style.height = opts.size; }
    return play(host, { ...opts, style });
  }

  const stage = opts => at('#stageVfx', {
    fps: 16,
    ...opts,
    className: 'stage-vfx-sprite ' + (opts.className || '')
  });

  const trib = opts => at('#tribVfxLayer', {
    fps: 14,
    ...opts,
    className: 'trib-vfx-sprite ' + (opts.className || '')
  });

  function position(target = 'hero') {
    const onTrib = target === 'trib' || (target === 'hero' && UI.tribulation?.pageOpen);
    const host = hostOf(onTrib ? '#tribStageVfx' : '#stageVfx');
    if (!host || !host.getClientRects().length) return null;
    const r = host.getBoundingClientRect();
    if (onTrib) {
      const stage = hostOf('#tribStage'), css = getComputedStyle(stage);
      return { host, x: parseFloat(css.getPropertyValue('--altar-x')) || r.width / 2,
        y: parseFloat(css.getPropertyValue('--altar-y')) || r.height * .6,
        height: hostOf('#tribActor').getBoundingClientRect().height };
    }
    const actor = hostOf(target === 'enemy' ? '#enemySprite' : '#heroSprite');
    if (!actor?.getClientRects().length) return null;
    const a = actor.getBoundingClientRect();
    if (target !== 'enemy') {
      const sprite = A.HERO, height = sprite.bodyHeight[actor.dataset.action] || sprite.bodyHeight.dung_yen;
      return { host, x: a.left + a.width * sprite.anchorX / sprite.width - r.left,
        y: a.top + a.height * sprite.anchorY / sprite.height - r.top, height: a.height * height / sprite.height };
    }
    return { host, x: a.left + a.width / 2 - r.left, y: a.bottom - r.top, height: a.height };
  }

  function onActor(opts, target = 'hero') {
    const p = position(target);
    if (!p) return null;
    const { style = {}, ground = true, ...rest } = opts;
    return at(p.host, { fps: 14, size: Math.max(100, p.height * 1.5) + 'px', ...rest,
      style: { ...style, left: p.x + 'px', top: (ground ? p.y + 4 : p.y - p.height * .45) + 'px',
        bottom: 'auto', transform: ground ? 'translate(-50%,-100%)' : 'translate(-50%,-50%)' } });
  }
  const hero = opts => onActor(opts);
  const tribStage = opts => onActor({ ...opts, className: 'trib-stage-vfx-sprite ' + (opts.className || '') }, 'trib');

  function effect(name, target = 'hero', opts = {}) {
    return onActor({ kind: 'hu_gioi', variant: name, ground: ['bolt', 'break', 'heal'].includes(name), fps: 15, ...opts }, target);
  }

  function ring(target = 'hero', color = '#e6c164') {
    const p = position(target);
    if (!p) return;
    const el = document.createElement('i');
    el.className = 'vfx-ring';
    Object.assign(el.style, { left: p.x + 'px', top: p.y + 'px', color, width: p.height + 'px', height: p.height * .32 + 'px' });
    transient(p.host, el, 850);
  }

  function burst(target = 'hero', color = '#ffe29a', count = 16) {
    const p = position(target);
    if (!p || !effectsEnabled()) return;
    for (let i = 0; i < Math.min(count, root.innerWidth < 600 ? 12 : 24); i++) {
      const el = document.createElement('i'), angle = Math.random() * Math.PI * 2, d = 24 + Math.random() * 70;
      el.className = 'vfx-particle';
      Object.assign(el.style, { left: p.x + 'px', top: (p.y - p.height * .35) + 'px', background: color, color });
      el.style.setProperty('--dx', Math.cos(angle) * d + 'px');
      el.style.setProperty('--dy', Math.sin(angle) * d - 20 + 'px');
      transient(p.host, el, 700);
    }
  }

  function float(text, target = 'enemy', cls = '') {
    const p = position(target);
    if (!p) return;
    const el = document.createElement('span');
    el.className = 'float-text ' + cls;
    el.textContent = text;
    Object.assign(el.style, { left: p.x + 'px', top: (p.y - p.height * .8) + 'px' });
    transient(p.host, el, 1000);
  }

  function cultivationGain(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const p = position('hero');
    if (!p) return;
    const el = document.createElement('span');
    el.className = 'float-text cultivation-gain';
    el.textContent = '+' + UI.kit.num(amount) + ' linh khí';
    el.setAttribute('aria-hidden', 'true');
    Object.assign(el.style, { left: p.x + 'px', top: (p.y - p.height * .85) + 'px' });
    transient(p.host, el, 1600, () => !prefersReduced() && UI.s().settings.cultivationEffects !== false);
  }

  function clear(host) {
    const el = hostOf(host);
    if (!el) return;
    [...running].forEach(h => { if (el.contains(h.el)) h.stop(); });
  }

  function clearAll() { [...running].forEach(h => h.stop()); }

  function screenFlash(cls = 'flash-gold', ms = 520) {
    const el = document.createElement('div');
    el.className = 'vfx-flash ' + cls;
    el.style.animationDuration = ms + 'ms';
    transient(hostOf(UI.tribulation?.pageOpen ? '#tribStage' : '#scene'), el, ms);
  }

  document.addEventListener('visibilitychange', () => { if (document.hidden) clearAll(); });

  UI.vfx = {
    play, at, stage, trib, tribStage, hero, effect, ring, burst, float, cultivationGain, clear, clearAll, screenFlash, effectsEnabled,
    preload: (kind, variant) => A.preloadVfx(kind, variant)
  };
})(typeof window !== 'undefined' ? window : globalThis);
