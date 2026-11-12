/* Truyền âm vạn giới online: chỉ render văn bản thuần; Bearer JWT ở ChatSession. */
(function (root) {
  'use strict';
  const UI = root.HU_UI, { $, esc } = UI.kit;
  const session = new root.HU_CHAT_SESSION.ChatSession();
  let draft = '', sending = false, error = '', pending = null, opened = false, journalOpen = false, journalMarkup = '';
  const CHANNELS = [
    { id: 'world', title: 'Thế giới', help: 'Kênh công khai toàn máy chủ.' },
    { id: 'sect', title: 'Tông môn', help: 'Chỉ thành viên cùng tông môn được đọc và gửi.' },
    { id: 'dao_huu', title: 'Đạo hữu', help: 'Phòng đạo hữu công khai, không phải nhắn tin riêng.' },
    { id: 'dao_lu', title: 'Đạo lữ', help: 'Phòng đạo lữ công khai, không phải nhắn tin riêng.' }
  ];
  const MAX_TEXT = 80; // khớp Edge API và CHECK trong DB
  const REALM_NAMES = () => root.HU_BALANCE?.REALMS || [];
  const labels = { idle: 'Chưa kết nối', connecting: 'Đang kết nối…', online: 'Đã kết nối', offline: 'Mất kết nối', unavailable: 'Hãy mở Hư Giới từ đường dẫn trực tuyến để truyền âm' };

  function render() {
    const activeChannel = CHANNELS.find(x => x.id === session.channel) || CHANNELS[0];
    return `<section class="chat-panel" aria-label="Truyền âm vạn giới">
      <header class="chat-heading">
        <div class="chat-brand"><span class="chat-seal" aria-hidden="true">✧</span><div>
          <span class="eyebrow gold">TRUYỀN ÂM · VẠN GIỚI</span>
          <h2>Truyền âm</h2></div></div>
        <span id="chatOnline" class="chat-online" aria-label="Số đạo hữu trực tuyến"></span>
      </header>
      <nav id="chatChannels" class="chat-channels" role="tablist" aria-label="Chuyển kênh Truyền âm">
        ${CHANNELS.map(ch => '<button type="button" role="tab" data-chat-channel="' + ch.id +
          '" aria-selected="' + (ch.id === session.channel) + '" tabindex="' + (ch.id === session.channel ? 0 : -1) +
          '">' + esc(ch.title) + '</button>').join('')}<button type="button" role="tab" data-chat-channel="journal" aria-selected="false" tabindex="-1">Nhật ký</button></nav>
      <div class="chat-context">
        <p id="chatChannelInfo">${esc(activeChannel.help)}</p>
        <span class="chat-retention">Tin lưu tạm thời · Chỉ dành cho người chơi</span>
      </div>
      <div class="chat-connection">
        <span id="chatStatus" role="status" aria-live="polite"></span>
        <div class="chat-connection-actions">
          <button type="button" class="btn btn-outline" data-act="chatConnect" id="chatConnect">Thử kết nối</button>
          <button type="button" class="btn btn-outline" data-act="chatDisconnect" id="chatDisconnect">Rời kênh</button>
        </div>
      </div>
      ${!session.available ? '<p class="chat-availability" role="status">Truyền âm cần kết nối HTTPS và tài khoản đã đăng nhập.</p>' : ''}
      <div class="chat-transcript">
        <div id="chatFeed" class="chat-feed" role="log" aria-label="Tin nhắn kênh thế giới" aria-live="polite" aria-relevant="additions" tabindex="0"></div>
        <div id="chatJournal" class="chat-feed chat-journal" role="log" aria-label="Nhật ký tu tiên" tabindex="0" hidden></div>
        <div id="chatEmpty" class="chat-empty">
          <span aria-hidden="true">✧</span><strong>Chưa có lời truyền âm</strong>
          <p>Kết nối và gửi lời chào tới các đạo hữu đang hành tẩu trong Hư Giới.</p>
        </div>
      </div>
      <form id="chatForm" class="chat-form" aria-label="Soạn lời truyền âm">
        <label for="chatInput">Gửi lời truyền âm</label>
        <div class="chat-compose-row"><input id="chatInput" type="text" maxlength="${MAX_TEXT}" autocomplete="off"
          placeholder="Nhập lời truyền âm…" value="${esc(draft)}" aria-describedby="chatError chatLimit">
          <button type="submit" class="btn btn-gold" id="chatSend" aria-label="Gửi lời truyền âm">Gửi <span aria-hidden="true">➤</span></button></div>
        <div class="chat-compose-meta"><small id="chatLimit">Tối đa ${MAX_TEXT} ký tự, chỉ chữ và số · Mỗi tin cách nhau 15 giây</small><span id="chatLength" aria-live="off"></span></div>
        <p id="chatError" class="chat-error" role="status" aria-live="polite"></p>
      </form>
    </section>`;
  }
  function refreshComposer() {
    const send = $('chatSend');
    if (!send) return;
    const left = Math.max(0, Math.ceil((session.cooldownUntil() - Date.now()) / 1000));
    send.disabled = sending || session.state.status !== 'online' || !draft.trim() || left > 0;
    send.innerHTML = sending ? 'Đang gửi…' : left ? left + ' giây' : 'Gửi <span aria-hidden="true">➤</span>';
    if ($('chatLimit')) $('chatLimit').textContent = left
      ? 'Hồi linh truyền âm · còn ' + left + ' giây để gửi tin tiếp theo'
      : 'Tối đa ' + MAX_TEXT + ' ký tự, chỉ chữ và số · Mỗi tin cách nhau 15 giây';
    if ($('chatLength')) $('chatLength').textContent = Array.from(draft).length + '/' + MAX_TEXT;
  }

  /* Tên hiển thị: "Tên • Cảnh giới" (cảnh giới tô màu theo bậc); admin do máy chủ xác nhận hiện
     "Admin • Hư Giới Chi Chủ". Chỉ dùng textContent; lớp CSS lấy từ số nguyên đã kẹp 0–13. */
  function fillName(node, message, mine) {
    node.textContent = '';
    if (message.admin === true) {
      node.className = 'chat-name chat-admin';
      node.append('Admin • Hư Giới Chi Chủ');
    } else {
      node.className = 'chat-name';
      node.append(String(message.name || 'Vô danh'));
      const realm = Number.isInteger(message.realm) ? Math.max(0, Math.min(13, message.realm)) : -1;
      const label = realm >= 0 ? REALM_NAMES()[realm] : '';
      if (label) {
        node.append(' • ');
        const tag = document.createElement('span');
        tag.className = 'chat-realm realm-' + realm;
        tag.textContent = label;
        node.append(tag);
      }
    }
    if (mine) node.append(' · Bạn');
  }

  function update() {
    if (!$('chatFeed')) return;
    const state = session.state, feed = $('chatFeed');
    $('chatStatus').textContent = labels[state.status] || 'Chưa kết nối';
    $('chatStatus').dataset.status = state.status;
    $('chatOnline').textContent = state.online + ' đạo hữu đang hiện diện';
    $('chatError').textContent = error || state.error;
    const active = journalOpen ? 'journal' : session.channel;
    document.querySelectorAll('[data-chat-channel]').forEach(el => {
      el.classList.toggle('on', el.dataset.chatChannel === active);
      el.setAttribute('aria-selected', String(el.dataset.chatChannel === active));
    });
    if ($('chatChannelInfo')) $('chatChannelInfo').textContent = journalOpen ? 'Ghi chép tu hành và thông báo gần đây.' : CHANNELS.find(x => x.id === session.channel)?.help || '';
    $('chatFeed').hidden = journalOpen;
    $('chatJournal').hidden = !journalOpen;
    $('chatForm').hidden = journalOpen;
    document.querySelector('.chat-connection').hidden = journalOpen;
    if (journalOpen) {
      const source = $('logFeed'), target = $('chatJournal'), markup = source?.innerHTML || '';
      if (markup !== journalMarkup || !target.childNodes.length) {
        const followJournal = target.scrollHeight - target.clientHeight - target.scrollTop < 48;
        target.replaceChildren(...[...(source?.childNodes || [])].map(node => node.cloneNode(true)));
        if (followJournal) target.scrollTop = target.scrollHeight;
        journalMarkup = markup;
      }
    }
    feed.setAttribute('aria-label', 'Tin nhắn kênh ' + (CHANNELS.find(x => x.id === session.channel)?.title || 'thế giới'));
    $('chatConnect').hidden = ['connecting', 'online'].includes(state.status) || !session.available;
    $('chatDisconnect').hidden = !['connecting', 'online', 'offline'].includes(state.status);
    refreshComposer();
    document.querySelectorAll('[data-chat-channel]').forEach(el => el.tabIndex = el.dataset.chatChannel === active ? 0 : -1);
    const follow = feed.scrollHeight - feed.clientHeight - feed.scrollTop < 48;
    const ids = new Set(state.messages.map(m => m.id));
    [...feed.children].forEach(el => { if (!ids.has(el.dataset.message)) el.remove(); });
    const existing = new Set([...feed.children].map(el => el.dataset.message));
    for (const message of state.messages) {
      if (existing.has(message.id)) continue;
      const el = document.createElement('article');
      const mine = message.senderId === state.self?.id;
      el.className = 'chat-message' + (mine ? ' mine' : '') + (message.pending ? ' pending' : '');
      el.dataset.message = message.id;
      const heading = document.createElement('header'), name = document.createElement('b'), time = document.createElement('time'), content = document.createElement('p');
      fillName(name, message, mine);
      name.title = 'Đạo hữu ' + message.senderId.slice(0, 8);
      if (message.pending) {
        time.textContent = 'Đang gửi…';
      } else {
        time.dateTime = new Date(message.at).toISOString();
        time.textContent = new Date(message.at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      }
      content.textContent = message.text;
      heading.append(name, time); el.append(heading, content); feed.append(el);
    }
    $('chatEmpty').hidden = journalOpen || !!state.messages.length || state.status === 'connecting';
    if (follow) feed.scrollTop = feed.scrollHeight;
  }
  function mount() {
    const switchChannel = channel => {
      if (channel === 'journal') { journalOpen = true; update(); return; }
      if (!CHANNELS.some(item => item.id === channel)) return;
      const change = channel !== session.channel;
      journalOpen = false;
      if (change) { pending = null; error = ''; void session.connect(channel); }
      update();
    };
    $('chatChannels')?.addEventListener('click', event => {
      const tab = event.target.closest('[data-chat-channel]');
      if (tab) switchChannel(tab.dataset.chatChannel);
    });
    $('chatChannels')?.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const ids = [...CHANNELS.map(ch => ch.id), 'journal'];
      const current = ids.indexOf(journalOpen ? 'journal' : session.channel);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? ids.length - 1 :
        (current + (event.key === 'ArrowRight' ? 1 : -1) + ids.length) % ids.length;
      switchChannel(ids[next]);
      $('chatChannels')?.querySelector('[data-chat-channel="' + ids[next] + '"]')?.focus();
    });
    $('chatInput').addEventListener('input', event => {
      const clean = root.HU_CHARACTER.sanitizeText(event.target.value);
      if (clean !== event.target.value) event.target.value = clean;
      draft = clean; error = ''; update();
    });
    $('chatForm').addEventListener('submit', async event => {
      event.preventDefault();
      if (sending || !draft.trim() || Date.now() < session.cooldownUntil()) return;
      const text = draft.trim();
      if (Array.from(text).length > MAX_TEXT || !root.HU_CHARACTER.TEXT_OK.test(text)) return;
      if (!pending || pending.text !== text || pending.channel !== session.channel) {
        try {
          pending = { text, channel: session.channel, id: root.HU_REMOTE_SESSION.secureRequestId() };
        } catch (e) {
          error = e.message; update(); return;
        }
      }
      sending = true; error = ''; update();
      try {
        await session.send(text, pending.id);
        if (draft.trim() === text) { draft = ''; if ($('chatInput')) $('chatInput').value = ''; }
        pending = null;
      } catch (e) { error = e.message; }
      finally { sending = false; update(); }
    });
    // Phiên mới hoặc nhân vật bắt đầu lại: kết nối lại sau khi đóng/mở cửa sổ.
    if (session.available && (!opened || session.state.status === 'idle')) { opened = true; session.connect(); }
    update();
  }
  session.subscribe(update);
  root.addEventListener('pagehide', () => session.disconnect());
  UI.action('chatConnect', () => { error = ''; session.connect(); return UI.KEEP; });
  UI.action('chatDisconnect', () => { error = ''; session.disconnect(); return UI.KEEP; });
  /* Bong bóng chat nổi ngoài màn chơi: bấm để mở khung nhỏ, đóng lại vẫn giữ kết nối và đếm tin mới. */
  const bubble = { el: null, panel: null, btn: null, badge: null, open: false, unread: 0, seen: 0 };
  const POSITION_KEY = 'huGioiChatBubblePosition';
  let dragSuppressClick = false;
  const clampPos = (value, max) => Math.max(8, Math.min(Math.max(8, max - 64), value));
  function bubblePosition(x, y, persist = false) {
    if (!bubble.el) return;
    const width = root.innerWidth || document.documentElement.clientWidth;
    const height = root.innerHeight || document.documentElement.clientHeight;
    x = clampPos(x, width);
    y = clampPos(y, height);
    bubble.el.classList.add('drag-positioned');
    for (const [key, value] of Object.entries({ left: x + 'px', top: y + 'px', right: 'auto', bottom: 'auto' }))
      bubble.el.style.setProperty(key, value, 'important');
    // Giữ bảng truyền âm trong viewport ngay cả khi ngọc giản nằm giữa màn.
    const panel = bubble.panel, panelWidth = Math.min(360, width - 28);
    const absoluteLeft = Math.max(8, Math.min(width - panelWidth - 8, x + 28 - panelWidth / 2));
    const below = Math.max(0, height - y - 70), above = Math.max(0, y - 8);
    const down = below > above;
    panel.style.left = (absoluteLeft - x) + 'px';
    panel.style.right = 'auto';
    panel.style.top = down ? '65px' : 'auto';
    panel.style.bottom = down ? 'auto' : '65px';
    panel.style.maxHeight = Math.max(80, Math.min(520, down ? below : above)) + 'px';
    if (persist) {
      try { root.localStorage?.setItem(POSITION_KEY, JSON.stringify({ x, y })); } catch { /* bảo vệ chế độ riêng tư */ }
    }
  }
  function bubbleDraggable() {
    let pos = null;
    try { pos = JSON.parse(root.localStorage?.getItem(POSITION_KEY) || 'null'); } catch {}
    if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) bubblePosition(pos.x, pos.y);
    let gesture = null;
    bubble.btn.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const rect = bubble.el.getBoundingClientRect();
      gesture = { id: e.pointerId, x: e.clientX, y: e.clientY, left: rect.left, top: rect.top, moved: false };
      try { bubble.btn.setPointerCapture(e.pointerId); } catch { /* touch WebKit: click vẫn hoạt động */ }
    });
    bubble.btn.addEventListener('pointermove', e => {
      if (!gesture || e.pointerId !== gesture.id) return;
      const dx = e.clientX - gesture.x, dy = e.clientY - gesture.y;
      if (!gesture.moved && Math.hypot(dx, dy) < 6) return;
      gesture.moved = true;
      bubble.btn.classList.add('dragging');
      e.preventDefault();
      bubblePosition(gesture.left + dx, gesture.top + dy);
    });
    const finish = e => {
      if (!gesture || e.pointerId !== gesture.id) return;
      if (gesture.moved) {
        dragSuppressClick = true;
        const rect = bubble.el.getBoundingClientRect();
        bubblePosition(rect.left, rect.top, true);
      }
      gesture = null;
      bubble.btn.classList.remove('dragging');
    };
    bubble.btn.addEventListener('pointerup', finish);
    bubble.btn.addEventListener('pointercancel', finish);
    root.addEventListener('resize', () => {
      if (!bubble.el?.classList.contains('drag-positioned')) return;
      const rect = bubble.el.getBoundingClientRect();
      bubblePosition(rect.left, rect.top);
    });
  }
  function bubbleBuild() {
    if (!UI.release.chat || bubble.el || !root.document) return;
    const el = document.createElement('div');
    el.id = 'chatBubble'; el.className = 'chat-bubble';
    el.innerHTML = '<button type="button" class="chat-bubble-btn" aria-expanded="false" aria-controls="chatFloating" aria-label="Mở chat thế giới"><img class="chat-bubble-icon" src="media/assets/ui/icon/chat/truyen-am.svg" width="36" height="36" alt="" aria-hidden="true" decoding="async"><i class="chat-bubble-badge" hidden>0</i></button>' +
      '<div id="chatBubblePanel" class="chat-bubble-panel" role="dialog" aria-label="Truyền âm vạn giới" hidden><button type="button" class="chat-bubble-close" aria-label="Thu nhỏ chat">×</button><div class="chat-bubble-body"></div></div>';
    document.body.appendChild(el);
    bubble.el = el; bubble.btn = el.querySelector('.chat-bubble-btn'); bubble.panel = el.querySelector('.chat-bubble-panel'); bubble.badge = el.querySelector('.chat-bubble-badge');
    // Launcher chỉ mở cửa sổ desktop, không tạo form chat trùng id.
    bubbleDraggable();
    bubble.btn.addEventListener('click', e => {
      if (dragSuppressClick) { dragSuppressClick = false; e.preventDefault(); e.stopPropagation(); return; }
      bubbleToggle();
    });
    el.querySelector('.chat-bubble-close').addEventListener('click', () => bubbleToggle(false));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && bubble.open) bubbleToggle(false); });
    session.subscribe(bubbleCount);
  }
  function bubbleCount() {
    const n = session.state.messages.length;
    if (bubble.open) { bubble.seen = n; bubble.unread = 0; }
    else bubble.unread = Math.max(0, n - bubble.seen);
    if (bubble.badge) { bubble.badge.hidden = !bubble.unread; bubble.badge.textContent = bubble.unread > 9 ? '9+' : String(bubble.unread); }
    bubble.el?.classList.toggle('has-new', !!bubble.unread);
  }
  function bubbleToggle(force) {
    if (!UI.release.chat) return;
    bubbleBuild();
    const wins = UI.windows;
    if (!wins) return;
    const w = wins.map.get('chat');
    if (force === false) { if (w) wins.close('chat'); }
    else if (force === true) wins.open('chat');
    else wins.toggle('chat');
    bubble.open = wins.has('chat') && !wins.map.get('chat')?.minimized;
    bubbleCount();
  }

  UI.chatBubble = { open: () => bubbleToggle(true), close: () => bubbleToggle(false), toggle: () => bubbleToggle() };
  /* Chỉ hiện khi đã vào game (có #game hiển thị), nên dựng sau khi nhân vật được tạo. */
  function bubbleSync() {
    const game = document.getElementById('game');
    const show = !!(UI.release.chat && game && !game.hidden && UI.s && UI.s().created);
    if (show) bubbleBuild();
    // Giảm tải DB: chỉ mở/poll kênh khi cửa sổ Truyền âm nhìn thấy được;
    // thu nhỏ/đóng cửa sổ hoặc ẩn tab thì ngắt vòng poll sau tối đa 1 giây.
    const win = UI.windows?.map?.get('chat');
    const visible = !!(show && win && !win.minimized && !root.document.hidden);
    if (bubble.open !== visible) { bubble.open = visible; bubbleCount(); }
    bubble.btn?.setAttribute('aria-expanded', String(visible));
    if (!visible && opened) { opened = false; session.disconnect(); }
    if (visible && !opened && session.available) { opened = true; void session.connect(); }
    if (bubble.el) bubble.el.hidden = !show;
    if (visible) refreshComposer();
  }
  if (root.document) setInterval(() => { try { bubbleSync(); } catch { /* bỏ qua */ } }, 1000);
  UI.register({ id: 'chat', label: 'Truyền âm', icon: '✧', eyebrow: 'TRUYỀN ÂM', render, mount, update });
})(typeof window !== 'undefined' ? window : globalThis);
