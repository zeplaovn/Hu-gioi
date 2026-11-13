/* Linh Hồ: bạn đồng hành mô phỏng, chỉ đọc trạng thái; nhiệm vụ lưu trên thiết bị. */
(function (root) {
  'use strict';
  const UI = root.HU_UI;
  if (!UI) return;
  const missions = [
    { key: 'kill', count: 5, name: 'Trừ yêu hộ đạo', text: 'Đánh bại thêm 5 yêu thú.' },
    { key: 'meditate', count: 60, name: 'Tĩnh tâm nhập định', text: 'Tu luyện thêm 60 giây.' },
    { key: 'breaks', count: 1, name: 'Tiến thêm một bước', text: 'Đột phá thêm 1 lần.' },
    { key: 'alchemy', count: 1, name: 'Đan hương thoảng qua', text: 'Luyện thêm 1 lần đan.' }
  ];
  const POSITION_KEY = 'hu-linh-ho-window-v1', CHATTER_KEY = 'hu-linh-ho-chatter-v1';
  const CHATTER_MIN = 60000, CHATTER_RANGE = 60000, BUBBLE_DURATION = 12000;
  const chatterLines = [
    'Đinh! Ký chủ chăm chỉ quá. Ta ngồi đây canh linh khí giúp đạo hữu nhé!',
    'Tiên lộ còn dài. Hôm nay đạo hữu muốn chinh phục điều gì?',
    'Nghe nói tu hành cần tâm tĩnh… mà đuôi ta cứ muốn vẫy mãi!',
    'Một chút tiến bộ mỗi ngày cũng là cơ duyên lớn. Đạo hữu cứ thong thả nhé.',
    'Đạo hữu có chuyện gì muốn kể không? Linh Hồ đang lắng nghe đây.',
    'Ta vừa đếm mây trên tiên sơn. Đếm đến đám thứ chín thì… quên mất rồi!',
    'Đinh! Hệ thống xác nhận: có bạn đồng hành thì tiên lộ vui hơn nhiều.',
    'Linh khí hôm nay thật dễ chịu. Cùng ta ngắm tiên sơn một chút nhé!'
  ];
  let companion, panel, bubble, messages, missionBox, identity = '', mission = null, lastNotice = '', lastNoticeAt = 0;
  let position = null, dragging = null, bubbleUntil = 0, bubbleKind = '', chatterEnabled = true;
  let nextChatterAt = 0, chatterWasEligible = false, lastChatter = '';
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
  function announce(text, s, kind = 'notice') {
    say(text); postponeChatter();
    if (!panel.hidden || !popupAllowed(s)) return;
    bubble.querySelector('.fox-bubble-text').textContent = text;
    bubble.hidden = false; bubbleUntil = Date.now() + BUBBLE_DURATION; bubbleKind = kind;
  }
  function updateChatter(s, now) {
    const eligible = chatterEnabled && panel.hidden && popupAllowed(s);
    if (!eligible) { chatterWasEligible = false; return; }
    if (!chatterWasEligible) { chatterWasEligible = true; postponeChatter(now); return; }
    if (now < nextChatterAt || !bubble.hidden) return;
    const lines = chatterLines.filter(line => line !== lastChatter);
    lastChatter = lines[Math.floor(Math.random() * lines.length)];
    announce(lastChatter, s, 'chatter');
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
    identity = key; mission = null; lastNotice = ''; lastNoticeAt = 0;
    hideBubble(); chatterWasEligible = false; lastChatter = '';
    try {
      const data = JSON.parse(localStorage.getItem(key));
      if (data && missions.some(m => m.key === data.key) && Number.isFinite(data.base) && data.base >= 0 && typeof data.done === 'boolean') mission = data;
    } catch {}
    if (messages) messages.replaceChildren();
    say('Đinh! Linh Hồ đã kết nối. Ta sẽ đồng hành cùng đạo hữu trên tiên lộ nhé!');
  }
  function say(text, who = 'fox') {
    if (!messages) return;
    const item = document.createElement('p'); item.className = 'fox-message ' + who;
    item.textContent = text; messages.append(item);
    while (messages.children.length > 30) messages.firstChild.remove();
    messages.scrollTop = messages.scrollHeight;
  }
  function guide(s) {
    const g = UI.g();
    if (g && s.hp < g.stats().HP * 0.3) return 'Cảnh báo: sinh lực đang thấp! Hãy nghỉ ngơi, hồi phục trước khi tiếp tục chiến đấu.';
    if (g && !s.completed && s.qi >= g.need()) return 'Đinh! Tu vi đã đầy. Đạo hữu có thể xem điều kiện đột phá.';
    if (s.garden?.some(p => !p.wilt && p.end <= UI.session.serverNow())) return 'Nhắc nhở: linh dược đã đến lúc thu hoạch. Hãy ghé Linh điền nhé!';
    if (s.craftQueue?.some(j => j.end <= UI.session.serverNow())) return 'Nhắc nhở: có công việc chế tạo đã hoàn thành. Hãy kiểm tra lò nhé!';
    return 'Gợi ý: thử xem Nhiệm vụ ngày, thăm Linh điền hoặc tiếp tục tu luyện để mở rộng tiên lộ.';
  }
  function drawMission(s) {
    if (!missionBox) return;
    if (!mission) { missionBox.textContent = 'Chưa có nhiệm vụ. Nhấn “Nhiệm vụ” để nhận một thử thách ngẫu nhiên.'; return; }
    const def = missions.find(m => m.key === mission.key);
    const progress = Math.max(0, Math.min(def.count, Math.floor((Number(s.progress?.[def.key]) || 0) - mission.base)));
    if (progress >= def.count && !mission.done) { mission.done = true; save(s); announce('Đinh! Nhiệm vụ “' + def.name + '” hoàn thành. Đạo hữu thật lợi hại!', s); }
    missionBox.textContent = def.name + ' · ' + def.text + ' ' + progress + '/' + def.count + (mission.done ? ' · Hoàn thành ✨' : '') + ' · Chỉ lưu trên thiết bị, không có phần thưởng vật phẩm.';
  }
  function newMission(s) {
    if (mission && !mission.done) { say('Đạo hữu đang có nhiệm vụ. Hãy hoàn thành hoặc hủy trước khi nhận nhiệm vụ mới nhé.'); return; }
    const def = missions[Math.floor(Math.random() * missions.length)];
    mission = { key: def.key, base: Number(s.progress?.[def.key]) || 0, done: false };
    save(s); drawMission(s); say('Đinh! Nhiệm vụ ngẫu nhiên: ' + def.name + '. ' + def.text);
  }
  function reply(value, s) {
    const text = value.trim(); if (!text) return;
    say(text, 'player');
    const t = text.toLocaleLowerCase('vi');
    if (/nhiệm vụ|nhiem vu|thử thách/.test(t)) newMission(s);
    else if (/gợi ý|goi y|nhắc|nhac|cảnh báo|canh bao|làm gì/.test(t)) say(guide(s));
    else if (/xin chào|chào|hello|hi\b/.test(t)) say('Linh Hồ có mặt! Hôm nay đạo hữu muốn khám phá điều gì?');
    else if (/cảm ơn|cam on/.test(t)) say('Được đồng hành cùng đạo hữu là niềm vui của ta!');
    else say('Ta đang lắng nghe đây. Đạo hữu có thể hỏi ta “gợi ý”, “cảnh báo” hoặc xin một “nhiệm vụ” nhé!');
  }
  function build() {
    const game = document.getElementById('game'), actor = document.getElementById('heroActor');
    if (!game || !actor || panel) return;
    // Linh vật theo đạo thân; cửa sổ chat có tọa độ riêng trong khung nhìn.
    companion = document.createElement('div'); companion.className = 'fox-companion';
    companion.innerHTML = '<div class="fox-bubble" hidden><button class="fox-bubble-open" type="button" aria-label="Trả lời Linh Hồ"><span class="fox-bubble-text" aria-live="polite"></span><small>Chạm để trò chuyện</small></button><button class="fox-bubble-close" type="button" aria-label="Ẩn lời nhắn Linh Hồ">×</button></div><button class="fox-launch" type="button" aria-label="Mở Linh Hồ hệ thống" aria-controls="foxPanel" aria-expanded="false"><img src="media/assets/companion/linh-ho.gif" alt=""></button>';
    panel = document.createElement('section'); panel.className = 'fox-panel'; panel.id = 'foxPanel';
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Linh Hồ hệ thống'); panel.hidden = true;
    panel.innerHTML = '<header tabindex="0" aria-label="Di chuyển cửa sổ Linh Hồ bằng phím mũi tên, Home để căn giữa" title="Kéo để di chuyển · Phím mũi tên để dịch chuyển · Home để căn giữa"><div><strong>✧ Linh Hồ Hệ Thống</strong><small>Kéo thanh này để di chuyển</small></div><button type="button" class="fox-close" aria-label="Đóng">×</button></header><div class="fox-messages" aria-live="polite"></div><div class="fox-mission"></div><div class="fox-actions"><button type="button" data-fox="guide">Gợi ý &amp; cảnh báo</button><button type="button" data-fox="mission">Nhiệm vụ</button><button type="button" data-fox="cancel">Hủy nhiệm vụ</button></div><form class="fox-form"><input aria-label="Nói với Linh Hồ" maxlength="200" placeholder="Nói gì đó với Linh Hồ…"><button type="submit">Gửi</button></form><label class="fox-chatter-setting"><input class="fox-chatter-toggle" type="checkbox">Lời nhắn ngẫu nhiên</label><p class="fox-foot">Đối thoại theo mẫu, không phải AI. Nhiệm vụ lưu trên thiết bị.</p>';
    actor.append(companion); game.append(panel);
    bubble = companion.querySelector('.fox-bubble'); messages = panel.querySelector('.fox-messages'); missionBox = panel.querySelector('.fox-mission');
    const launch = companion.querySelector('.fox-launch');
    const toggle = open => {
      stopDrag(); panel.hidden = !open; launch.setAttribute('aria-expanded', String(open));
      hideBubble(); chatterWasEligible = false;
      if (open) { fitPanel(); panel.querySelector('.fox-form input').focus({ preventScroll: true }); }
    };
    launch.addEventListener('click', () => toggle(panel.hidden));
    companion.querySelector('.fox-bubble-open').addEventListener('click', () => toggle(true));
    companion.querySelector('.fox-bubble-close').addEventListener('click', () => { hideBubble(); postponeChatter(); });
    panel.querySelector('.fox-close').addEventListener('click', () => { toggle(false); launch.focus({ preventScroll: true }); });
    panel.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.stopPropagation(); toggle(false); launch.focus({ preventScroll: true }); }
    });
    panel.addEventListener('click', e => {
      const action = e.target.dataset.fox, s = state(); if (!action || !s) return;
      if (action === 'guide') say(guide(s));
      if (action === 'mission') newMission(s);
      if (action === 'cancel') { if (mission) { mission = null; save(s); drawMission(s); say('Đã bỏ nhiệm vụ hiện tại. Khi sẵn sàng, đạo hữu có thể nhận nhiệm vụ khác.'); } else say('Hiện chưa có nhiệm vụ nào.'); }
    });
    panel.querySelector('form').addEventListener('submit', e => {
      e.preventDefault(); const s = state(), input = panel.querySelector('.fox-form input');
      if (s) reply(input.value, s); input.value = '';
    });
    const chatterToggle = panel.querySelector('.fox-chatter-toggle');
    chatterToggle.checked = chatterEnabled;
    chatterToggle.addEventListener('change', () => {
      chatterEnabled = chatterToggle.checked; chatterWasEligible = false;
      if (bubbleKind === 'chatter') hideBubble();
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
    const notice = guide(s);
    if (notice.startsWith('Gợi ý:')) lastNotice = '';
    if (!notice.startsWith('Gợi ý:') && notice !== lastNotice && now - lastNoticeAt > 60000) {
      lastNotice = notice; lastNoticeAt = now; announce(notice, s);
    }
    updateChatter(s, now);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hideBubble(); chatterWasEligible = false; stopDrag(); }
  });
  setInterval(() => { if (!document.hidden) { try { update(); } catch (e) { console.warn('Linh Hồ:', e.message); } } }, 2000);
})(window);
