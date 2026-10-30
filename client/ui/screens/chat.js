/* Kênh thế giới demo: render văn bản thuần, giữ bản nháp khi reconnect/đổi màn. */
(function (root) {
  'use strict';
  const UI = root.HU_UI, { $, esc } = UI.kit;
  const session = new root.HU_CHAT_SESSION.ChatSession();
  let draft = '', sending = false, error = '', pending = null, opened = false;
  const labels = { idle: 'Chưa kết nối', connecting: 'Đang kết nối…', online: 'Đã kết nối', offline: 'Mất kết nối', unavailable: 'Cần mở qua HTTP' };

  function render() {
    return `<section class="chat-panel"><header class="chat-heading"><div><span class="eyebrow gold">TRUYỀN ÂM · DEMO</span><h2>Kênh thế giới</h2></div><span id="chatOnline" class="chat-online"></span></header>
      <p class="info-note">Kênh trò chuyện giữa những đạo hữu đang online. Tính năng cần máy chủ chat riêng (đang được viết lại).</p>
      <div class="chat-connection"><span id="chatStatus" role="status"></span><button type="button" class="btn btn-outline" data-act="chatConnect" id="chatConnect">Kết nối</button><button type="button" class="btn btn-outline" data-act="chatDisconnect" id="chatDisconnect">Rời kênh</button></div>
      ${!session.available ? '<p class="info-note">Máy chủ chat đang được viết lại, hiện chưa có dịch vụ trả lời tại <code>/api/chat/*</code>. Xem <code>docs/backend-plan.md</code>.</p>' : ''}
      <div id="chatFeed" class="chat-feed" role="log" aria-label="Tin nhắn kênh thế giới" aria-live="polite" aria-relevant="additions" tabindex="0"></div>
      <p id="chatEmpty" class="empty-note">Chưa có tin nhắn. Gửi lời chào đến các đạo hữu!</p>
      <form id="chatForm" class="chat-form"><label for="chatInput">Lời truyền âm</label><div><input id="chatInput" type="text" maxlength="400" autocomplete="off" placeholder="Gửi lời đến đạo hữu bốn phương…" value="${esc(draft)}" aria-describedby="chatError chatLimit"><button type="submit" class="btn btn-gold" id="chatSend">Gửi</button></div><small id="chatLimit">Tối đa 400 ký tự · mỗi tin cách nhau 2 giây.</small></form>
      <p id="chatError" class="chat-error" role="status"></p></section>`;
  }
  function update() {
    if (!$('chatFeed')) return;
    const state = session.state, feed = $('chatFeed');
    $('chatStatus').textContent = labels[state.status];
    $('chatStatus').dataset.status = state.status;
    $('chatOnline').textContent = state.online + ' đạo hữu online';
    $('chatError').textContent = error || state.error;
    $('chatConnect').hidden = ['connecting', 'online'].includes(state.status) || !session.available;
    $('chatDisconnect').hidden = !['connecting', 'online', 'offline'].includes(state.status);
    $('chatSend').disabled = sending || state.status !== 'online' || !draft.trim();
    $('chatSend').textContent = sending ? 'Đang gửi…' : 'Gửi';
    const follow = feed.scrollHeight - feed.clientHeight - feed.scrollTop < 48;
    const ids = new Set(state.messages.map(m => m.id));
    [...feed.children].forEach(el => { if (!ids.has(el.dataset.message)) el.remove(); });
    const existing = new Set([...feed.children].map(el => el.dataset.message));
    for (const message of state.messages) {
      if (existing.has(message.id)) continue;
      const el = document.createElement('article');
      el.className = 'chat-message' + (message.senderId === state.self?.id ? ' mine' : '');
      el.dataset.message = message.id;
      const heading = document.createElement('header'), name = document.createElement('b'), time = document.createElement('time'), content = document.createElement('p');
      name.textContent = message.name + (message.senderId === state.self?.id ? ' · Bạn' : '');
      name.title = 'Đạo hữu ' + message.senderId.slice(0, 8);
      time.dateTime = new Date(message.at).toISOString();
      time.textContent = new Date(message.at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      content.textContent = message.text;
      heading.append(name, time); el.append(heading, content); feed.append(el);
    }
    $('chatEmpty').hidden = !!state.messages.length;
    if (follow) feed.scrollTop = feed.scrollHeight;
  }
  function mount() {
    $('chatInput').addEventListener('input', event => { draft = event.target.value; error = ''; update(); });
    $('chatForm').addEventListener('submit', async event => {
      event.preventDefault();
      if (sending || !draft.trim()) return;
      const text = draft.trim();
      if (text.length > 400) return;
      if (!pending || pending.text !== text) pending = { text, id: root.crypto.randomUUID ? root.crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2) };
      sending = true; error = ''; update();
      try {
        await session.send(text, pending.id);
        if (draft.trim() === text) { draft = ''; if ($('chatInput')) $('chatInput').value = ''; }
        pending = null;
      } catch (e) { error = e.message; }
      finally { sending = false; update(); }
    });
    if (!opened && session.available) { opened = true; session.connect(UI.s().name); }
    update();
  }
  session.subscribe(update);
  root.addEventListener('pagehide', () => session.disconnect());
  UI.action('chatConnect', () => { error = ''; session.connect(UI.s().name); return UI.KEEP; });
  UI.action('chatDisconnect', () => { error = ''; session.disconnect(); return UI.KEEP; });
  UI.register({ id: 'chat', label: 'Chat online', icon: '✉', eyebrow: 'TRUYỀN ÂM', render, mount, update });
})(typeof window !== 'undefined' ? window : globalThis);
