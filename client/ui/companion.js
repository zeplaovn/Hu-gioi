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
  /* Giọng "Bổn hệ thống": kiêu kỳ, hay mắng nhưng quan tâm. Bốn loại lời nổi trên đầu Linh Hồ:
     chat (phiếm), nag (giục việc), hint (gợi ý), warn (cảnh báo); praise khi xong nhiệm vụ. {tokens} được thay lúc nói. */
  const chatLines = [
    'Ngươi nên biết ơn ta đấy, hahaha... Có bổn hệ thống bên cạnh, tiên lộ của ngươi đỡ lạc đường hơn nhiều!',
    'Hừ, đừng tưởng bổn hệ thống rảnh rỗi. Ta chỉ tiện thể ngồi đây xem ngươi tu luyện thôi!',
    'Ngươi biết không? Đuôi của bổn hệ thống mềm nhất tiên giới. Cấm sờ nha!',
    'Hôm nay linh khí không tệ, ta tâm tình tốt, tạm thời không mắng ngươi.',
    'Ngươi mà đột phá thành công thì cũng có công của ta một nửa đấy nhé, hahaha...',
    'Đừng có nhìn ta chằm chằm như thế. Làm việc của ngươi đi!',
    'Nghe nói có kẻ tu mãi không lên cấp. Ồ, nói ngươi à? Đùa thôi, đùa thôi!',
    'Bổn hệ thống vừa đếm mây trên tiên sơn, đếm tới đám thứ chín thì quên mất. Đừng nói với ai nhé.',
    'Ngươi cứ thong thả. Nhưng thong thả quá thì ta buồn ngủ đấy!',
    'Hôm nay ngươi trông… tạm được. Đừng để ta phải rút lại lời khen này!',
    'Ai cho phép ngươi tu luyện mà không chào bổn hệ thống một tiếng? Thôi, lần này tha cho.',
    'Có bạn đồng hành xinh đẹp như ta, ngươi đúng là có phúc tám đời!'
  ];
  const urgeLines = [
    'Ngươi chưa nhận nhiệm vụ nào à? Mở “Nhiệm vụ” cho bổn hệ thống xem nào, đồ lười!',
    'Rảnh thế mà không nhận nhiệm vụ? Bổn hệ thống đã chuẩn bị sẵn thử thách rồi đấy!',
    'Không nhiệm vụ thì không tiến bộ. Đạo lý đơn giản vậy mà cũng phải để ta nhắc sao?'
  ];
  const nagLines = [
    'Nhiệm vụ “{name}” vẫn còn dang dở đấy. Còn thiếu {left} {unit}, làm đi chứ ngươi!',
    'Bổn hệ thống đã nhắc ngươi bao nhiêu lần rồi, “{name}” làm xong chưa? Còn thiếu {left} {unit} đấy!',
    'Lần thứ {n} rồi nhé! “{name}” vẫn chưa xong. Ngươi định để bổn hệ thống nói đến khô miệng sao?',
    'Ngươi… ngươi cố tình chọc giận bổn hệ thống phải không? “{name}” còn thiếu {left} {unit}!'
  ];
  const hintLines = [
    'Gợi ý: Linh điền cần ngươi ghé thăm đều đặn. Dược thảo không tự bay vào túi đâu!',
    'Gợi ý: Nghề phụ cũng là một con đường. Đừng chỉ biết đánh yêu thú!',
    'Gợi ý: Có Truyền âm thì dùng đi, ngươi định tu tiên một mình mãi sao?',
    'Gợi ý: Tông môn có nhiều thứ hay ho. Ghé xem, đừng ở lì một chỗ!',
    'Gợi ý: Sinh lực thấp thì nghỉ ngơi, đừng liều mạng. Ta không muốn đổi ký chủ đâu!',
    'Gợi ý: Tu vi đầy thì nhớ xem điều kiện đột phá, đừng để bổn hệ thống nhắc hoài.'
  ];
  let companion, panel, bubble, messages, missionBox, identity = '', mission = null, lastNotice = '', lastNoticeAt = 0;
  let position = null, dragging = null, bubbleUntil = 0, bubbleKind = '', chatterEnabled = true;
  let nextChatterAt = 0, chatterWasEligible = false, lastLine = '', nagCount = 0;
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
    say(text); postponeChatter(); lastLine = text;
    if (!panel.hidden || !popupAllowed(s)) return;
    bubble.querySelector('.fox-bubble-text').textContent = text;
    bubble.dataset.kind = kind;
    bubble.hidden = false; bubbleUntil = Date.now() + BUBBLE_DURATION; bubbleKind = kind;
  }
  const pick = list => {
    const pool = list.filter(line => line !== lastLine);
    const choices = pool.length ? pool : list;
    return choices[Math.floor(Math.random() * choices.length)];
  };
  const fill = (text, vars) => text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  function missionInfo(s) {
    if (!mission || mission.done) return null;
    const def = missions.find(m => m.key === mission.key);
    const progress = Math.max(0, Math.min(def.count, Math.floor((Number(s.progress?.[def.key]) || 0) - mission.base)));
    return { def, progress, left: def.count - progress };
  }
  /* Lời tự lên tiếng: giục nhiệm vụ (càng nhắc càng gắt), trò chuyện phiếm, gợi ý chung. */
  function scheduledLine(s) {
    const info = missionInfo(s), roll = Math.random();
    if (info ? roll < 0.5 : roll < 0.35) {
      if (!info) return { kind: 'nag', text: pick(urgeLines) };
      const level = Math.min(nagCount, nagLines.length - 1);
      const text = fill(nagLines[level], { name: info.def.name, left: info.left, unit: info.def.unit, n: nagCount + 1 });
      nagCount++;
      return { kind: 'nag', text };
    }
    return roll < 0.85 ? { kind: 'chat', text: pick(chatLines) } : { kind: 'hint', text: pick(hintLines) };
  }
  function updateChatter(s, now) {
    const eligible = chatterEnabled && panel.hidden && popupAllowed(s);
    if (!eligible) { chatterWasEligible = false; return; }
    if (!chatterWasEligible) { chatterWasEligible = true; postponeChatter(now); return; }
    if (now < nextChatterAt || !bubble.hidden) return;
    const line = scheduledLine(s);
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
    identity = key; mission = null; lastNotice = ''; lastNoticeAt = 0; nagCount = 0;
    hideBubble(); chatterWasEligible = false; lastLine = '';
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
  /* Cảnh báo/nhắc việc cấp bách theo trạng thái thật; null nếu không có gì gấp. */
  function notice(s) {
    const g = UI.g(), now = UI.session.serverNow();
    if (g && s.hp < g.stats().HP * 0.3) return { kind: 'warn', text: 'Cảnh báo: Sinh lực của ngươi sắp cạn rồi, còn định lao đầu vào đánh à? Nghỉ ngơi đi, đừng để bổn hệ thống phải lo!' };
    if (g && !s.completed && s.qi >= g.need()) return { kind: 'hint', text: 'Đinh! Tu vi đã đầy mà ngươi còn đứng đó? Mau xem điều kiện đột phá đi!' };
    if (s.garden?.some(p => !p.wilt && p.end <= now)) return { kind: 'hint', text: 'Nhắc nhở: Linh dược chín rồi mà ngươi chưa thu hoạch? Ghé Linh điền ngay, kẻo phí công bổn hệ thống nhắc!' };
    if (s.craftQueue?.some(j => j.end <= now)) return { kind: 'hint', text: 'Nhắc nhở: Lò chế tạo xong từ lâu rồi! Ngươi định để nó nguội đến bao giờ?' };
    return null;
  }
  function guide(s) {
    return notice(s)?.text || 'Gợi ý: Ngươi còn nhiều việc phải làm đấy: xem Nhiệm vụ, ghé Linh điền hoặc tiếp tục tu luyện. Đừng để bổn hệ thống nhắc thêm lần nữa!';
  }
  function drawMission(s) {
    if (!missionBox) return;
    if (!mission) { missionBox.textContent = 'Chưa có nhiệm vụ. Nhấn “Nhiệm vụ” để nhận một thử thách ngẫu nhiên.'; return; }
    const def = missions.find(m => m.key === mission.key);
    const progress = Math.max(0, Math.min(def.count, Math.floor((Number(s.progress?.[def.key]) || 0) - mission.base)));
    if (progress >= def.count && !mission.done) {
      mission.done = true; nagCount = 0; save(s);
      announce('Đinh! Nhiệm vụ “' + def.name + '” hoàn thành. Hừ, cũng không tệ. Ngươi nên biết ơn bổn hệ thống đã nhắc nhở đấy, hahaha...', s, 'praise');
    }
    missionBox.textContent = def.name + ' · ' + def.text + ' ' + progress + '/' + def.count + (mission.done ? ' · Hoàn thành ✨' : '') + ' · Chỉ lưu trên thiết bị, không có phần thưởng vật phẩm.';
  }
  function newMission(s) {
    if (mission && !mission.done) { say('Ngươi đang có nhiệm vụ rồi, tham lam vừa thôi! Hoàn thành hoặc hủy đi rồi hãy nhận cái mới.'); return; }
    const def = missions[Math.floor(Math.random() * missions.length)];
    mission = { key: def.key, base: Number(s.progress?.[def.key]) || 0, done: false }; nagCount = 0;
    save(s); drawMission(s); say('Đinh! Nhiệm vụ của ngươi: ' + def.name + '. ' + def.text + ' Bổn hệ thống sẽ canh chừng đấy!');
  }
  function reply(value, s) {
    const text = value.trim(); if (!text) return;
    say(text, 'player');
    const t = text.toLocaleLowerCase('vi');
    if (/nhiệm vụ|nhiem vu|thử thách/.test(t)) newMission(s);
    else if (/gợi ý|goi y|nhắc|nhac|cảnh báo|canh bao|làm gì/.test(t)) say(guide(s));
    else if (/xin chào|chào|hello|hi\b/.test(t)) say('Hừ, bổn hệ thống có mặt. Hôm nay ngươi lại muốn làm gì đây?');
    else if (/cảm ơn|cam on/.test(t)) say('Biết ơn là tốt. Ngươi nên biết ơn ta đấy, hahaha...');
    else if (/bạn là ai|ngươi là ai|là ai/.test(t)) say('Bổn hệ thống chính là Linh Hồ, người dẫn đường kiêm giám sát của ngươi. Nhớ cho kỹ!');
    else if (/chán|mệt|buồn/.test(t)) say('Hừ, mới thế đã than. Nghỉ chút cũng được, nhưng đừng để bổn hệ thống thấy ngươi bỏ bê tu luyện!');
    else say('Ta đang nghe đây. Muốn “gợi ý”, “cảnh báo” hay xin “nhiệm vụ” thì nói rõ ra, đừng lằng nhằng!');
  }
  function build() {
    const game = document.getElementById('game'), actor = document.getElementById('heroActor');
    if (!game || !actor || panel) return;
    // Linh vật theo đạo thân; cửa sổ chat có tọa độ riêng trong khung nhìn.
    companion = document.createElement('div'); companion.className = 'fox-companion';
    companion.innerHTML = '<div class="fox-bubble" hidden><button class="fox-bubble-open" type="button" aria-label="Trả lời Linh Hồ"><span class="fox-bubble-text" aria-live="polite"></span><small>Chạm để trò chuyện</small></button><button class="fox-bubble-close" type="button" aria-label="Ẩn lời nhắn Linh Hồ">×</button></div><button class="fox-launch" type="button" aria-label="Mở Linh Hồ hệ thống" aria-controls="foxPanel" aria-expanded="false"><img src="media/assets/companion/linh-ho.gif" alt=""></button>';
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
    const urgent = notice(s);
    if (!urgent) lastNotice = '';
    else if (urgent.text !== lastNotice && now - lastNoticeAt > 60000) {
      lastNotice = urgent.text; lastNoticeAt = now; announce(urgent.text, s, urgent.kind);
    }
    updateChatter(s, now);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hideBubble(); chatterWasEligible = false; stopDrag(); }
  });
  setInterval(() => { if (!document.hidden) { try { update(); } catch (e) { console.warn('Linh Hồ:', e.message); } } }, 2000);
})(window);
