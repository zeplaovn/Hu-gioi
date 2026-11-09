/* HƯ GIỚI · TIÊN KHÍ (client/ui/tien-khi.js)
 * Lớp "hơi thở" cho giao diện. Chỉ quan sát DOM đã có và thêm vài phần tử trang trí;
 * không gọi engine, không đổi state, không lưu gì. Gỡ file này đi thì game vẫn chạy
 * y như cũ (chỉ mất sương, nhịp thở, linh quang và vệt chạm).
 * Nạp ngay trước client/main.js. */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;

  var doc = document;
  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var game = doc.getElementById('game');
  var scene = doc.getElementById('scene');
  var hero = doc.getElementById('heroActor');
  if (!game) return;

  function el(tag, cls) {
    var node = doc.createElement(tag);
    if (cls) node.className = cls;
    return node;
  }

  /* 1. Sương trôi sau đạo thân + vòng nhịp thở quanh đạo thân (idempotent). */
  var mist = null;
  if (scene && !scene.querySelector('.tx-mist')) {
    mist = el('div', 'tx-mist');
    mist.setAttribute('aria-hidden', 'true');
    mist.appendChild(el('b'));
    mist.appendChild(el('b'));
    var shade = scene.querySelector('.scene-shade');
    if (shade && shade.nextSibling) scene.insertBefore(mist, shade.nextSibling);
    else scene.appendChild(mist);
  } else if (scene) {
    mist = scene.querySelector('.tx-mist');
  }
  if (hero && !hero.querySelector('.tx-breath')) {
    var breath = el('div', 'tx-breath');
    breath.setAttribute('aria-hidden', 'true');
    hero.insertBefore(breath, hero.firstChild);
  }

  /* 2. --linh: tỉ lệ tu vi (0..1) đọc từ thanh tu vi, để CSS làm sáng/nhịp thở theo. */
  var qiFill = doc.getElementById('topQiFill');
  function readQi() {
    if (!qiFill) return;
    var w = parseFloat(qiFill.style.width);
    if (isNaN(w)) return;
    var p = Math.max(0, Math.min(1, w / 100));
    game.style.setProperty('--linh', p.toFixed(3));
    doc.documentElement.style.setProperty('--linh', p.toFixed(3));
  }
  if (qiFill && window.MutationObserver) {
    new MutationObserver(readQi).observe(qiFill, { attributes: true, attributeFilter: ['style'] });
  }
  readQi();

  /* 3. data-ready: hào quang vàng quanh đạo thân khi có thể đột phá. */
  var breakBtn = doc.getElementById('btn-break');
  function readReady() {
    var ready = !!(breakBtn && breakBtn.classList.contains('ready') && !breakBtn.classList.contains('auto'));
    if (ready) game.setAttribute('data-ready', '');
    else game.removeAttribute('data-ready');
  }
  if (breakBtn && window.MutationObserver) {
    new MutationObserver(readReady).observe(breakBtn, { attributes: true, attributeFilter: ['class'] });
  }
  readReady();

  /* 4. Ánh sáng bám con trỏ (chuột) và vệt linh khí khi chạm nút. */
  var HOVER_SEL = '.btn,#menu button,.page-nav button,.tab,.zone-button';
  var pending = null;
  var raf = window.requestAnimationFrame || function (fn) { return setTimeout(fn, 16); };
  function setPointer(target, x, y) {
    var r = target.getBoundingClientRect();
    target.style.setProperty('--mx', Math.round(x - r.left) + 'px');
    target.style.setProperty('--my', Math.round(y - r.top) + 'px');
  }
  doc.addEventListener('pointermove', function (ev) {
    if (reduced || ev.pointerType !== 'mouse' || !ev.target || !ev.target.closest) return;
    var target = ev.target.closest(HOVER_SEL);
    if (!target) return;
    if (pending) { pending.x = ev.clientX; pending.y = ev.clientY; pending.t = target; return; }
    pending = { x: ev.clientX, y: ev.clientY, t: target };
    raf(function () {
      var p = pending; pending = null;
      if (p) setPointer(p.t, p.x, p.y);
    });
  }, { passive: true });

  doc.addEventListener('pointerdown', function (ev) {
    if (reduced || !ev.target || !ev.target.closest) return;
    var btn = ev.target.closest('.btn');
    if (!btn || btn.disabled) return;
    var r = btn.getBoundingClientRect();
    var dot = el('i', 'tx-ripple');
    dot.style.setProperty('--rx', Math.round(ev.clientX - r.left) + 'px');
    dot.style.setProperty('--ry', Math.round(ev.clientY - r.top) + 'px');
    btn.appendChild(dot);
    setTimeout(function () { if (dot.parentNode) dot.parentNode.removeChild(dot); }, 750);
  }, { passive: true });

  /* 5. Linh quang thoảng qua sân khấu mỗi 18-40 giây lúc tĩnh tu. */
  function wisp() {
    if (!mist || reduced || doc.hidden) return;
    if (game.getAttribute('data-stage') === 'combat') return;
    if (game.classList.contains('page-open')) return;
    if (scene.classList.contains('low-fx') || doc.getElementById('stage')?.classList.contains('low-fx')) return;
    var w = el('i', 'tx-wisp');
    w.style.setProperty('--wy', (14 + Math.random() * 38).toFixed(1) + '%');
    w.style.setProperty('--wr', (-4 - Math.random() * 10).toFixed(1) + 'deg');
    w.style.setProperty('--wd', (-6 - Math.random() * 14).toFixed(1) + 'vh');
    w.style.setProperty('--wt', (4.5 + Math.random() * 3).toFixed(1) + 's');
    mist.appendChild(w);
    void w.offsetWidth;
    w.className = 'tx-wisp go';
    w.addEventListener('animationend', function () { if (w.parentNode) w.parentNode.removeChild(w); });
  }
  function scheduleWisp() {
    setTimeout(function () { wisp(); scheduleWisp(); }, 18000 + Math.random() * 22000);
  }
  if (mist && !reduced) scheduleWisp();
})();