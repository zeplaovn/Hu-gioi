/* Linh Hồ: bạn đồng hành mô phỏng giọng "Bổn hệ thống", chỉ đọc trạng thái; nhiệm vụ lưu trên thiết bị. */
(function (root) {
  'use strict';
  const UI = root.HU_UI;
  if (!UI) return;
  const missions = [
    { key: 'kill', count: 5, unit: 'yêu thú', name: 'Trừ yêu hộ đạo', text: 'Đánh bại thêm 5 yêu thú.' },
    { key: 'meditate', count: 60, unit: 'giây tu luyện', name: 'Tĩnh tâm nhập định', text: 'Tu luyện thêm 60 giây.' },
    { key: 'breaks', count: 1, unit: 'lần đột phá', name: 'Tiến thêm một bước', text: 'Đột phá thêm 1 lần.' },
    { key: 'alchemy', count: 1, unit: 'lần luyện đan', name: 'Đan hương thoảng qua', text: 'Luyện thêm 1 lần đan.' }
  ];
  const POSITION_KEY = 'hu-linh-ho-window-v1', CHATTER_KEY = 'hu-linh-ho-chatter-v1';
  const CHATTER_MIN = 45000, CHATTER_RANGE = 45000, BUBBLE_DURATION = 10000;
  /* Lời thoại và trí thông minh nằm ở companion-brain.js (thuần luật). Ở đây chỉ dựng facts từ trạng thái thật. */
  const brain = root.HU_COMPANION_BRAIN?.create();
  if (!brain) return;
  let companion, panel, bubble, messages, missionBox, identity = '', mission = null;
  let position = null, dragging = null, bubbleUntil = 0, bubbleKind = '', chatterEnabled = true;
  let nextChatterAt = 0, chatterWasEligible = false, hiddenAt = 0;
  try {
    const saved = JSON.parse(localStorage.getItem(POSITION_KEY));
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) position = { x: saved.x, y: saved.y };
  } catch {}
  try { chatterEnabled = localStorage.getItem(CHATTER_KEY) !== 'off'; } catch {}
  const state = () => { try { const s = UI.s(); return s && s.created ? s : null; } catch { return null; } };
  const storageKey = s => 'hu-linh-ho:' + s.name + ':' + s.createdAt;
  function save(s) { try { localStorage.setItem(storageKey(s), JSON.stringify(mission)); } catch {} }
  function hideBubble() {
    if (bubble) bubble.hidden = true;
    bubbleUntil = 0; bubbleKind = '';
  }
  function postponeChatter(now = Date.now()) {
    nextChatterAt = now + CHATTER_MIN + Math.floor(Math.random() * CHATTER_RANGE);
  }
  function popupAllowed(s) {
    const game = document.getElementById('game'), tribulation = document.getElementById('tribulationFx');
    return !!(s && !s.death && !s.presencePaused && !document.hidden && game && !game.hidden &&
      !game.classList.contains('page-open') && (!tribulation || tribulation.hidden) &&
      !document.body.classList.contains('hu-dialogue-open'));
  }
  function announce(text, s, kind = 'chat') {
    say(text); postponeChatter();
    if (!panel.hidden || !popupAllowed(s)) return;
    bubble.querySelector('.fox-bubble-text').textContent = text;
    bubble.dataset.kind = kind;
    bubble.hidden = false; bubbleUntil = Date.now() + BUBBLE_DURATION; bubbleKind = kind;
    fitBubble();
  }
  /* Chữ căn giữa trên đầu Linh Hồ; dịch ngang vừa đủ để không tràn mép màn hình. */
  function fitBubble() {
    bubble.style.marginLeft = '0px';
    const r = bubble.getBoundingClientRect(), v = root.visualViewport, pad = 8;
    const left = (v?.offsetLeft || 0) + pad, right = (v?.offsetLeft || 0) + (v?.width || root.innerWidth) - pad;
    let dx = 0;
    if (r.right > right) dx = right - r.right;
    if (r.left + dx < left) dx = left - r.left;
    bubble.style.marginLeft = Math.round(dx) + 'px';
  }
  function missionInfo(s) {
    if (!mission || mission.done) return null;
    const def = missions.find(m => m.key === mission.key);
    const progress = Math.max(0, Math.min(def.count, Math.floor((Number(s.progress?.[def.key]) || 0) - mission.base)));
    return { def, progress, left: def.count - progress };
  }
  /* Facts: ảnh chụp tình huống thật của đạo thân cho bộ não; mọi trường đều chịu được dữ liệu thiếu. */
  function facts(s) {
    const g = UI.g(), now = UI.session.serverNow(), info = missionInfo(s);
    const call = fn => { try { return typeof g?.[fn] === 'function' ? Number(g[fn]()) : NaN; } catch { return NaN; } };
    const maxHp = (() => { try { return Number(g?.stats?.().HP) || 0; } catch { return 0; } })();
    const need = call('need'), maxLife = call('maxLife'), age = Number(s.age) || 0;
    const realm = Number(s.realm) || 0, stage = Number(s.stage) || 1;
    return {
      name: s.name, realm, stage, realmName: (root.HU_BALANCE?.REALMS || [])[realm] || 'tu sĩ',
      hp: Number(s.hp) || 0, maxHp, hpPct: maxHp > 0 ? (Number(s.hp) || 0) / maxHp : 1,
      qi: Number(s.qi) || 0, need: need > 0 ? need : 0, qiPct: need > 0 ? (Number(s.qi) || 0) / need : 0,
      completed: !!s.completed, age, maxLife: maxLife > 0 ? maxLife : 0, lifeLeft: maxLife > 0 ? maxLife - age : Infinity,
      gardenReady: (s.garden || []).filter(p => !p.wilt && p.end <= now).length,
      craftReady: (s.craftQueue || []).filter(j => j.end <= now).length,
      sectJoined: !!s.sect?.joined,
      hasMission: !!mission, missionDone: !!mission?.done,
      mission: info ? { name: info.def.name, unit: info.def.unit, progress: info.progress, left: info.left, count: info.def.count } : null
    };
  }
  function updateChatter(s, now) {
    const eligible = chatterEnabled && panel.hidden && popupAllowed(s);
    if (!eligible) { chatterWasEligible = false; return; }
    if (!chatterWasEligible) { chatterWasEligible = true; postponeChatter(now); return; }
    if (now < nextChatterAt || !bubble.hidden) return;
    const line = brain.chatter(facts(s));
    announce(line.text, s, line.kind);
  }

  /* Cửa sổ nằm trong vùng nhìn thấy, kể cả khi bàn phím điện thoại mở. */
  function fitPanel(preferred = position) {
    if (!panel || panel.hidden) return;
    const v = root.visualViewport, pad = 8;
    const left = (v?.offsetLeft || 0) + pad, top = (v?.offsetTop || 0) + pad;
    const width = Math.max(1, (v?.width || root.innerWidth) - pad * 2);
    const height = Math.max(1, (v?.height || root.innerHeight) - pad * 2);
    panel.style.width = Math.min(360, width) + 'px';
    panel.style.maxHeight = height + 'px';
    const rect = panel.getBoundingClientRect();
    const clamp = (n, min, max) => Math.max(min, Math.min(n, Math.max(min, max)));
    position = {
      x: clamp(preferred?.x ?? left + (width - rect.width) / 2, left, left + width - rect.width),
      y: clamp(preferred?.y ?? top + (height - rect.height) / 2, top, top + height - rect.height)
    };
    panel.style.left = position.x + 'px'; panel.style.top = position.y + 'px'; panel.style.transform = 'none';
  }
  function savePosition() {
    try { if (position) localStorage.setItem(POSITION_KEY, JSON.stringify(position)); } catch {}
  }
  function stopDrag() {
    if (!dragging) return;
    const pointerId = dragging.id; dragging = null;
    panel.classList.remove('dragging');
    try { panel.querySelector('header').releasePointerCapture(pointerId); } catch {}
    savePosition();
  }
  function bindDrag() {
    const handle = panel.querySelector('header');
    handle.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.isPrimary === false || e.target.closest('button')) return;
      e.preventDefault(); fitPanel(); stopDrag();
      dragging = { id: e.pointerId, x: e.clientX, y: e.clientY, origin: { ...position } };
      try { handle.setPointerCapture(e.pointerId); } catch { dragging = null; return; }
      panel.classList.add('dragging');
    });
    handle.addEventListener('pointermove', e => {
      if (!dragging || dragging.id !== e.pointerId) return;
      fitPanel({ x: dragging.origin.x + e.clientX - dragging.x, y: dragging.origin.y + e.clientY - dragging.y });
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'])
      handle.addEventListener(name, e => { if (dragging?.id === e.pointerId) stopDrag(); });
    handle.addEventListener('keydown', e => {
      if (e.target !== handle || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(e.key)) return;
      e.preventDefault(); stopDrag(); fitPanel();
      const step = e.shiftKey ? 40 : 16;
      fitPanel(e.key === 'Home' ? null : {
        x: position.x + (e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0),
        y: position.y + (e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0)
      });
      savePosition();
    });
    const fit = () => { stopDrag(); fitPanel(); };
    root.addEventListener('resize', fit);
    root.visualViewport?.addEventListener('resize', fit);
    root.visualViewport?.addEventListener('scroll', fit);
    if (typeof root.ResizeObserver === 'function') new root.ResizeObserver(() => fitPanel()).observe(panel);
  }
  function load(s) {
    const key = storageKey(s);
    if (identity === key) return;
    identity = key; mission = null; brain.reset();
    hideBubble(); chatterWasEligible = false;
    try {
      const data = JSON.parse(localStorage.getItem(key));
      if (data && missions.some(m => m.key === data.key) && Number.isFinite(data.base) && data.base >= 0 && typeof data.done === 'boolean') mission = data;
    } catch {}
    if (messages) messages.replaceChildren();
    say('Đinh! Bổn hệ thống đã kết nối. Từ nay ngươi đừng hòng lười biếng!');
  }
  function say(text, who = 'fox') {
    if (!messages) return;
    const item = document.createElement('p'); item.className = 'fox-message ' + who;
    item.textContent = text; messages.append(item);
    while (messages.children.length > 30) messages.firstChild.remove();
    messages.scrollTop = messages.scrollHeight;
  }
  const guide = s => brain.reply('gợi ý', facts(s)).text;
  function drawMission(s) {
    if (!missionBox) return;
    if (!mission) { missionBox.textContent = 'Chưa có nhiệm vụ. Nhấn “Nhiệm vụ” để nhận một thử thách ngẫu nhiên.'; return; }
    const def = missions.find(m => m.key === mission.key);
    const progress = Math.max(0, Math.min(def.count, Math.floor((Number(s.progress?.[def.key]) || 0) - mission.base)));
    if (progress >= def.count && !mission.done) {
      mission.done = true; brain.resetMission(); save(s);
      announce('Đinh! Nhiệm vụ “' + def.name + '” hoàn thành. Hừ, cũng không tệ. Ngươi nên biết ơn bổn hệ thống đã nhắc nhở đấy, hahaha...', s, 'praise');
    }
    missionBox.textContent = def.name + ' · ' + def.text + ' ' + progress + '/' + def.count + (mission.done ? ' · Hoàn thành ✨' : '') + ' · Chỉ lưu trên thiết bị, không có phần thưởng vật phẩm.';
  }
  function newMission(s) {
    if (mission && !mission.done) { say('Ngươi đang có nhiệm vụ rồi, tham lam vừa thôi! Hoàn thành hoặc hủy đi rồi hãy nhận cái mới.'); return; }
    const def = missions[Math.floor(Math.random() * missions.length)];
    mission = { key: def.key, base: Number(s.progress?.[def.key]) || 0, done: false }; brain.resetMission();
    save(s); drawMission(s); say('Đinh! Nhiệm vụ của ngươi: ' + def.name + '. ' + def.text + ' Bổn hệ thống sẽ canh chừng đấy!');
  }
  function cancelMission(s) {
    if (mission) {
      mission = null; brain.resetMission(); save(s); drawMission(s);
      say('Đã bỏ nhiệm vụ hiện tại. Hừ, nửa đường bỏ cuộc, đúng là đồ lười! Muốn nhận cái mới thì nói “nhiệm vụ”.');
    } else say('Ngươi có nhiệm vụ nào đâu mà đòi hủy? Nói “nhiệm vụ” để ta giao việc!');
  }
  function reply(value, s) {
    const text = value.trim(); if (!text) return;
    say(text, 'player');
    const out = brain.reply(text, facts(s));
    if (out.action === 'mission') newMission(s);
    else if (out.action === 'cancel') cancelMission(s);
    else if (out.text) say(out.text);
  }
  function build() {
    const game = document.getElementById('game'), actor = document.getElementById('heroActor');
    if (!game || !actor || panel) return;
    // Linh vật theo đạo thân; cửa sổ chat có tọa độ riêng trong khung nhìn.
    companion = document.createElement('div'); companion.className = 'fox-companion';
    companion.innerHTML = '<div class="fox-bubble" hidden><span class="fox-bubble-text" aria-live="polite"></span></div><button class="fox-launch" type="button" aria-label="Mở Linh Hồ hệ thống" aria-controls="foxPanel" aria-expanded="false"><img src="media/assets/companion/linh-ho.gif" alt=""></button>';
    panel = document.createElement('section'); panel.className = 'fox-panel'; panel.id = 'foxPanel';
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Linh Hồ hệ thống'); panel.hidden = true;
    panel.innerHTML = '<header tabindex="0" aria-label="Di chuyển cửa sổ Linh Hồ bằng phím mũi tên, Home để căn giữa" title="Kéo để di chuyển · Phím mũi tên để dịch chuyển · Home để căn giữa"><div><strong>✧ Linh Hồ Hệ Thống</strong><small>Kéo thanh này để di chuyển</small></div><button type="button" class="fox-close" aria-label="Đóng">×</button></header><div class="fox-messages" aria-live="polite"></div><div class="fox-mission"></div><div class="fox-actions"><button type="button" data-fox="guide">Gợi ý &amp; cảnh báo</button><button type="button" data-fox="mission">Nhiệm vụ</button><button type="button" data-fox="cancel">Hủy nhiệm vụ</button></div><form class="fox-form"><input aria-label="Nói với Linh Hồ" maxlength="200" placeholder="Nói gì đó với Linh Hồ…"><button type="submit">Gửi</button></form><label class="fox-chatter-setting"><input class="fox-chatter-toggle" type="checkbox">Linh Hồ tự lên tiếng (trò chuyện, giục việc)</label><p class="fox-foot">Đối thoại theo mẫu, không phải AI. Nhiệm vụ lưu trên thiết bị.</p>';
    actor.append(companion); game.append(panel);
    bubble = companion.querySelector('.fox-bubble'); messages = panel.querySelector('.fox-messages'); missionBox = panel.querySelector('.fox-mission');
    const launch = companion.querySelector('.fox-launch');
    const toggle = open => {
      stopDrag(); panel.hidden = !open; launch.setAttribute('aria-expanded', String(open));
      hideBubble(); chatterWasEligible = false;
      if (open) { fitPanel(); panel.querySelector('.fox-form input').focus({ preventScroll: true }); }
    };
    launch.addEventListener('click', () => toggle(panel.hidden));
    panel.querySelector('.fox-close').addEventListener('click', () => { toggle(false); launch.focus({ preventScroll: true }); });
    panel.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.stopPropagation(); toggle(false); launch.focus({ preventScroll: true }); }
    });
    panel.addEventListener('click', e => {
      const action = e.target.dataset.fox, s = state(); if (!action || !s) return;
      if (action === 'guide') say(guide(s));
      if (action === 'mission') newMission(s);
      if (action === 'cancel') { cancelMission(s); return; }
    });
    panel.querySelector('form').addEventListener('submit', e => {
      e.preventDefault(); const s = state(), input = panel.querySelector('.fox-form input');
      if (s) reply(input.value, s); input.value = '';
    });
    const chatterToggle = panel.querySelector('.fox-chatter-toggle');
    chatterToggle.checked = chatterEnabled;
    chatterToggle.addEventListener('change', () => {
      chatterEnabled = chatterToggle.checked; chatterWasEligible = false;
      if (['chat', 'nag', 'hint'].includes(bubbleKind)) hideBubble();
      try { localStorage.setItem(CHATTER_KEY, chatterEnabled ? 'on' : 'off'); } catch {}
    });
    bindDrag();
  }
  function update() {
    const s = state(), now = Date.now();
    if (!s) {
      if (companion) companion.hidden = true;
      if (panel) { stopDrag(); panel.hidden = true; companion.querySelector('.fox-launch').setAttribute('aria-expanded', 'false'); }
      hideBubble(); chatterWasEligible = false; return;
    }
    build(); if (!panel) return; companion.hidden = false;
    load(s);
    if (now >= bubbleUntil || !popupAllowed(s)) hideBubble();
    drawMission(s);
    const f = facts(s), event = brain.observe(f);
    if (event && (event.always || (chatterEnabled && panel.hidden))) announce(event.text, s, event.kind);
    else {
      const urgent = brain.urgent(f);
      if (urgent) announce(urgent.text, s, urgent.kind);
    }
    updateChatter(s, now);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = Date.now(); hideBubble(); chatterWasEligible = false; stopDrag(); return; }
    const s = state(), away = hiddenAt ? Date.now() - hiddenAt : 0; hiddenAt = 0;
    if (!s || !brain || !chatterEnabled || !panel || !panel.hidden) return;
    const line = brain.welcome(facts(s), away);
    if (line) announce(line.text, s, line.kind);
  });
  setInterval(() => { if (!document.hidden) { try { update(); } catch (e) { console.warn('Linh Hồ:', e.message); } } }, 2000);
})(window);
