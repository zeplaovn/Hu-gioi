/* HƯ GIỚI · VẠN CHỮ CẢM NGỘ (client/ui/van-chu.js)
 * Hiệu ứng chữ Hán Nôm quanh đạo thân khi nhập định, như đang cảm ngộ công pháp:
 * chữ bay lên rồi tan, và hai vòng chữ xoay quanh người. Thuần trang trí: không đọc/ghi state,
 * không gọi engine. Tự tắt khi giảm chuyển động, tắt hiệu ứng tu luyện, vào chiến đấu hoặc mở trang.
 * Chỉ dùng chữ Hán phổ thông (có trong mọi phông CJK) để tránh ô vuông ở máy thiếu phông chữ Nôm. */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  var doc = document, game = doc.getElementById('game'), hero = doc.getElementById('heroActor');
  if (!game || !hero || hero.querySelector('.hc-field')) return;
  var reduceQuery = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  var GLYPHS = '道氣靈仙劍法心悟天玄無空陰陽火水木金土命魂丹符陣真元神通劫緣性定靜生滅變化因果虛';
  var RISE_MAX = 9, orbits = [];
  function pick() { return GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length)); }
  function tone() { var r = Math.random(); return r < .5 ? 'w' : r < .82 ? 'k' : 'g'; }
  function el(tag, cls) { var n = doc.createElement(tag); if (cls) n.className = cls; return n; }

  var field = el('div', 'hc-field');
  field.setAttribute('aria-hidden', 'true');
  hero.insertBefore(field, hero.firstChild);

  /* Hai vòng chữ xoay ngược chiều nhau, mỗi vòng 5 chữ lệch pha đều nhau. */
  [{ n: 5, t: 16, r: 1, dir: '' }, { n: 5, t: 23, r: 1.45, dir: ' rev' }].forEach(function (cfg, o) {
    var ring = el('div', 'hc-orbit' + cfg.dir);
    ring.style.setProperty('--t', cfg.t + 's');
    ring.style.setProperty('--k', cfg.r);
    for (var i = 0; i < cfg.n; i++) {
      var g = el('span', 'hc-g ' + tone()), u = el('span', 'hc-u'), c = el('b');
      g.style.setProperty('--a', (i * 360 / cfg.n + o * 36) + 'deg');
      c.textContent = pick();
      c.style.animationDelay = (-i * 1.7 - o * 0.9).toFixed(1) + 's';
      /* Đổi chữ khi vừa tắt hẳn: người xem không thấy chữ nhảy. */
      c.addEventListener('animationiteration', function (ev) { ev.target.textContent = pick(); });
      u.appendChild(c); g.appendChild(u); ring.appendChild(g);
    }
    field.appendChild(ring); orbits.push(ring);
  });

  var alive = 0;
  function rise() {
    if (alive >= RISE_MAX) return;
    var n = el('i', 'hc-rise ' + tone());
    n.textContent = pick();
    n.style.setProperty('--x', (Math.random() * 90 - 45).toFixed(0) + '%');
    n.style.setProperty('--h', (150 + Math.random() * 120).toFixed(0) + 'px');
    n.style.setProperty('--s', (0.8 + Math.random() * 0.7).toFixed(2));
    n.style.setProperty('--d', (3.6 + Math.random() * 2.4).toFixed(1) + 's');
    n.style.setProperty('--w', (Math.random() * 40 - 20).toFixed(0) + 'px');
    alive++;
    n.addEventListener('animationend', function () { alive--; if (n.parentNode) n.parentNode.removeChild(n); });
    field.appendChild(n);
  }

  function active() {
    var aura = doc.getElementById('idleAura');
    return !doc.hidden && !(reduceQuery && reduceQuery.matches) && game.getAttribute('data-stage') === 'idle' &&
      !game.classList.contains('page-open') && !(aura && aura.hidden);
  }
  var on = false, timer = 0;
  function loop() {
    var now = active();
    if (now !== on) {
      on = now;
      field.classList.toggle('on', on);
      if (!on) Array.prototype.slice.call(field.querySelectorAll('.hc-rise')).forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); }), alive = 0;
    }
    if (on) rise();
    timer = setTimeout(loop, on ? 650 + Math.random() * 800 : 1500);
  }
  loop();
  doc.addEventListener('visibilitychange', function () { clearTimeout(timer); loop(); });
})();
