/* Hư Giới — nhân vật bán hiện thực từ player.zip.
 * Không chỉnh gameplay hoặc schema. Thiếu ảnh mới thì giữ nguyên sprite gốc.
 * Nạp sau boot.js để có thể bọc action du hành, ra đòn, tọa hóa và trọng sinh. */
(function (root) {
  'use strict';
  const A = root.HU_ASSETS, UI = root.HU_UI;
  if (!A || !UI) return;

  const BASE = 'media/assets/chars/player/realistic/';
  const COUNT = 6;
  const ANIM = Object.freeze({ dung_yen: 'thien_dinh', di_chuyen: 'di_bo', tan_cong: 'tung_skill', tu_vong: 'guc_nga' });
  const DURATIONS = Object.freeze({
    nam: { thien_dinh: 250, di_bo: 170, tung_skill: 155, guc_nga: 200 },
    nu:  { thien_dinh: 180, di_bo: 150, tung_skill: 140, guc_nga: 220 }
  });
  const original = {
    heroFrames: A.heroFrames, heroSrc: A.heroSrc,
    heroPortrait: A.heroPortrait, preloadHero: A.preloadHero
  };
  const available = { nam: false, nu: false };
  const inspected = { nam: false, nu: false };
  const cache = new Map();
  const motion = {
    lastAction: '', lastGender: '', actionStart: 0,
    walkUntil: 0, attackUntil: 0, deadAt: 0, deadGender: ''
  };
  const sex = g => g === 'nu' ? 'nu' : 'nam';
  const path = (g, action, i) => BASE + sex(g) + '/' + action + '/' + String(i).padStart(2, '0') + '.webp';
  const has = g => !!available[sex(g)];
  const now = () => Date.now();
  function currentState() {
    try { return typeof UI.s === 'function' ? UI.s() : null; } catch { return null; }
  }
  function reduced() {
    try { if (typeof UI.isReduced === 'function') return !!UI.isReduced(); } catch { /* chưa có phiên */ }
    const mode = currentState()?.settings?.motionMode;
    return mode === 'reduced' || (mode !== 'full' && !!root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  }
  function effectiveAction(g, raw, t) {
    const s = currentState();
    if (motion.deadAt && motion.deadGender === g || s?.created && s.hp <= 0) return 'guc_nga';
    if (motion.walkUntil > t && motion.lastGender === g) return 'di_bo';
    if (motion.attackUntil > t && motion.lastGender === g) return 'tung_skill';
    return ANIM[raw] || 'thien_dinh';
  }
  function frame(g, action, t) {
    if (action !== motion.lastAction || g !== motion.lastGender) {
      motion.lastAction = action;
      motion.lastGender = g;
      motion.actionStart = action === 'guc_nga' && motion.deadAt ? motion.deadAt : t;
    }
    if (reduced()) return action === 'guc_nga' ? COUNT - 1 : 0;
    const elapsed = Math.max(0, t - motion.actionStart);
    const index = Math.floor(elapsed / DURATIONS[g][action]);
    return action === 'guc_nga' ? Math.min(COUNT - 1, index) : index % COUNT;
  }
  function resetTimeline() {
    motion.lastAction = '';
    motion.actionStart = 0;
  }
  function playWalk() {
    const s = currentState();
    motion.lastGender = sex(s?.gender);
    motion.walkUntil = now() + COUNT * DURATIONS[motion.lastGender].di_bo;
    resetTimeline();
    if (has(motion.lastGender)) A.preloadHero(motion.lastGender, s?.realm || 0, 'di_chuyen');
  }
  function playSkill() {
    const s = currentState();
    motion.lastGender = sex(s?.gender);
    motion.attackUntil = now() + COUNT * DURATIONS[motion.lastGender].tung_skill;
    resetTimeline();
    if (has(motion.lastGender)) A.preloadHero(motion.lastGender, s?.realm || 0, 'tan_cong');
  }
  function playDeath() {
    const s = currentState();
    motion.deadGender = sex(s?.gender);
    motion.deadAt = now();
    motion.walkUntil = motion.attackUntil = 0;
    resetTimeline();
    if (has(motion.deadGender)) A.preloadHero(motion.deadGender, s?.realm || 0, 'tu_vong');
  }
  function clearDeath() {
    motion.deadAt = 0;
    motion.deadGender = '';
    motion.attackUntil = motion.walkUntil = 0;
    resetTimeline();
  }

  // Giữ nguyên hợp đồng HU_ASSETS để màn tu luyện, chiến đấu, độ kiếp,
  // onboarding và avatar cùng sử dụng một nguồn ảnh.
  A.heroFrames = (g, zone, action = 'dung_yen') => has(g) && Object.hasOwn(ANIM, action)
    ? COUNT : original.heroFrames(g, zone, action);
  A.heroSrc = (g, zone, action = 'dung_yen', index = 0) => {
    if (!has(g) || !Object.hasOwn(ANIM, action)) return original.heroSrc(g, zone, action, index);
    const gender = sex(g), t = now();
    const name = effectiveAction(gender, action, t);
    return path(gender, name, frame(gender, name, t));
  };
  A.heroPortrait = (g, zone) => has(g) ? BASE + sex(g) + '/portrait.webp' : original.heroPortrait(g, zone);
  A.preloadHero = (g, zone, action = 'dung_yen') => {
    if (!has(g) || !Object.hasOwn(ANIM, action)) return original.preloadHero(g, zone, action);
    if (typeof root.Image !== 'function') return [];
    const key = sex(g) + '/' + ANIM[action];
    if (!cache.has(key)) {
      cache.set(key, Array.from({ length: COUNT }, (_, i) => {
        const image = new root.Image();
        image.decoding = 'async';
        image.src = path(g, ANIM[action], i);
        return image;
      }));
    }
    return cache.get(key);
  };

  // Gắn chuyển động vào các sự kiện hiện có; không thay đổi kết quả lệnh engine.
  const oldAttack = UI.heroAttack;
  if (typeof oldAttack === 'function') UI.heroAttack = function (...args) {
    playSkill();
    return oldAttack.apply(this, args);
  };
  const oldTravel = UI.actions?.travel;
  if (typeof oldTravel === 'function') UI.action('travel', function (...args) {
    const result = oldTravel.apply(this, args);
    playWalk();
    return result;
  });
  const oldDeath = UI.onDeath;
  if (typeof oldDeath === 'function') UI.onDeath = function (...args) {
    playDeath();
    return oldDeath.apply(this, args);
  };
  const oldReincarnate = UI.reincarnate;
  if (typeof oldReincarnate === 'function') UI.reincarnate = function (...args) {
    const result = oldReincarnate.apply(this, args);
    clearDeath();
    return result;
  };

  // Kiểm tra 1 khung/người trước khi bật bộ mới. Nhánh chưa có ảnh không bị vỡ UI.
  function probe(g) {
    if (inspected[g] || typeof root.Image !== 'function') return;
    inspected[g] = true;
    const image = new root.Image();
    image.onload = () => { available[g] = true; render(); };
    image.onerror = () => { available[g] = false; render(); };
    image.src = path(g, 'thien_dinh', 0);
  }
  function render() {
    const s = currentState();
    const g = sex(s?.gender);
    const doc = root.document;
    if (!doc) return;
    doc.documentElement?.classList?.toggle('hg-realistic-player', has(g));
    if (!s?.created || !has(g) || doc.hidden) return;
    const mode = doc.getElementById('game')?.dataset.stage || 'idle';
    const raw = mode === 'combat' && s.auto ? 'tan_cong' : doc.getElementById('heroSprite')?.dataset.action || 'dung_yen';
    const hero = doc.getElementById('heroSprite');
    if (hero) {
      const src = A.heroSrc(g, s.realm, raw);
      if (hero.getAttribute('src') !== src) hero.src = src;
      hero.alt = effectiveAction(g, raw, now()) === 'guc_nga' ? 'Đạo thân gục ngã' :
        effectiveAction(g, raw, now()) === 'di_bo' ? 'Đạo thân đang di chuyển' :
        effectiveAction(g, raw, now()) === 'tung_skill' ? 'Đạo thân thi triển kỹ năng' : 'Đạo thân đang nhập định';
    }
    const portrait = doc.getElementById('avatar');
    const portraitSrc = A.heroPortrait(g, s.realm);
    if (portrait && portrait.getAttribute('src') !== portraitSrc) portrait.src = portraitSrc;
    const trib = doc.getElementById('tribHero');
    if (trib && doc.getElementById('tribStage')?.offsetParent !== null) {
      const src = A.heroSrc(g, s.realm, 'dung_yen');
      if (trib.getAttribute('src') !== src) trib.src = src;
    }
  }
  UI.playerPack = Object.freeze({ has, playWalk, playSkill, playDeath, clearDeath, render,
    get availability() { return { nam: available.nam, nu: available.nu }; } });
  probe('nam'); probe('nu');
  if (typeof root.setInterval === 'function') root.setInterval(render, 100);
})(typeof window !== 'undefined' ? window : globalThis);
