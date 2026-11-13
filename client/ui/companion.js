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
  let companion, panel, bubble, messages, missionBox, identity = '', mission = null, lastNotice = '', lastNoticeAt = 0;
  const state = () => { try { const s = UI.s(); return s && s.created ? s : null; } catch { return null; } };
  const storageKey = s => 'hu-linh-ho:' + s.name + ':' + s.createdAt;
  function save(s) { try { localStorage.setItem(storageKey(s), JSON.stringify(mission)); } catch {} }
  function load(s) {
    const key = storageKey(s);
    if (identity === key) return;
    identity = key; mission = null; lastNotice = ''; lastNoticeAt = 0;
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
    if (progress >= def.count && !mission.done) { mission.done = true; save(s); say('Đinh! Nhiệm vụ “' + def.name + '” hoàn thành. Đạo hữu thật lợi hại!'); bubble.textContent = 'Nhiệm vụ hoàn thành! ✨'; bubble.hidden = false; }
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
    // Linh vật theo điểm neo và kích thước của đạo thân; bảng thoại nằm ngoài
    // sân khấu để không bị cắt khi dùng màn hình nhỏ.
    companion = document.createElement('div'); companion.className = 'fox-companion';
    companion.innerHTML = `<span class="fox-bubble" aria-live="polite" hidden></span><button class="fox-launch" type="button" aria-label="Mở Linh Hồ hệ thống" aria-controls="foxPanel" aria-expanded="false"><img src="media/assets/companion/linh-ho.gif" alt=""></button>`;
    panel = document.createElement('section'); panel.className = 'fox-panel'; panel.id = 'foxPanel';
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Linh Hồ hệ thống'); panel.hidden = true;
    panel.innerHTML = `<header><div><strong>✧ Linh Hồ Hệ Thống</strong><small>Bạn đồng hành · mô phỏng</small></div><button type="button" class="fox-close" aria-label="Đóng">×</button></header><div class="fox-messages" aria-live="polite"></div><div class="fox-mission"></div><div class="fox-actions"><button type="button" data-fox="guide">Gợi ý &amp; cảnh báo</button><button type="button" data-fox="mission">Nhiệm vụ</button><button type="button" data-fox="cancel">Hủy nhiệm vụ</button></div><form class="fox-form"><input aria-label="Nói với Linh Hồ" maxlength="200" placeholder="Nói gì đó với Linh Hồ…"><button type="submit">Gửi</button></form><p class="fox-foot">Đối thoại theo mẫu, không phải AI. Nhiệm vụ lưu trên thiết bị.</p>`;
    actor.append(companion); game.append(panel);
    bubble = companion.querySelector('.fox-bubble'); messages = panel.querySelector('.fox-messages'); missionBox = panel.querySelector('.fox-mission');
    const launch = companion.querySelector('.fox-launch');
    const toggle = open => { panel.hidden = !open; launch.setAttribute('aria-expanded', String(open)); if (open) { bubble.hidden = true; panel.querySelector('input').focus(); } };
    launch.addEventListener('click', () => toggle(panel.hidden));
    panel.querySelector('.fox-close').addEventListener('click', () => { toggle(false); launch.focus(); });
    panel.addEventListener('keydown', e => { if (e.key === 'Escape') { toggle(false); launch.focus(); } });
    panel.addEventListener('click', e => {
      const action = e.target.dataset.fox, s = state(); if (!action || !s) return;
      if (action === 'guide') say(guide(s));
      if (action === 'mission') newMission(s);
      if (action === 'cancel') { if (mission) { mission = null; save(s); drawMission(s); say('Đã bỏ nhiệm vụ hiện tại. Khi sẵn sàng, đạo hữu có thể nhận nhiệm vụ khác.'); } else say('Hiện chưa có nhiệm vụ nào.'); }
    });
    panel.querySelector('form').addEventListener('submit', e => { e.preventDefault(); const s = state(), input = panel.querySelector('input'); if (s) reply(input.value, s); input.value = ''; });
  }
  function update() {
    const s = state();
    if (!s) { if (companion) companion.hidden = true; if (panel) { panel.hidden = true; companion.querySelector('.fox-launch').setAttribute('aria-expanded', 'false'); } return; }
    build(); if (!panel) return; companion.hidden = false;
    load(s); drawMission(s);
    const notice = guide(s), now = Date.now();
    if (notice.startsWith('Gợi ý:')) lastNotice = '';
    if (!notice.startsWith('Gợi ý:') && notice !== lastNotice && now - lastNoticeAt > 60000) {
      lastNotice = notice; lastNoticeAt = now; bubble.textContent = notice; bubble.hidden = false; say(notice);
    }
  }
  setInterval(() => { if (!document.hidden) { try { update(); } catch (e) { console.warn('Linh Hồ:', e.message); } } }, 2000);
})(window);
