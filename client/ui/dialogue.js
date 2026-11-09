/* HƯ GIỚI · Khung hội thoại và Thiên Thư, chỉ đọc state và gửi UI.command. */
(function (root) {
  'use strict';
  const H = root.HU_GAME, UI = root.HU_UI;
  const { esc } = UI.kit;
  const tiers = [['stranger', 0, 'Sơ giao'], ['familiar', 20, 'Quen biết'], ['confidant', 55, 'Tri kỷ']];
  let panel = null, current = null, returnFocus = null;
  const story = H.STORY;

  const chapterById = id => story.ACTS.flatMap(act => act.chapters).find(x => x.id === id);
  const npcById = id => H.DESIGN.npc[id];
  const topicById = (npcId, id) => Object.values(story.NPCS[npcId] || {}).find(x => x.id === id);

  function ensure() {
    if (panel) return panel;
    panel = document.createElement('section');
    panel.className = 'hu-dialogue';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Vạn Giới Đối Thoại');
    panel.innerHTML = '<div class="hu-dialogue-shade" data-dialogue="close"></div>' +
      '<div class="hu-dialogue-frame" tabindex="-1"><header class="hu-dialogue-head">' +
      '<span class="eyebrow gold">VẠN GIỚI ĐỐI THOẠI</span>' +
      '<button type="button" class="text-btn" data-dialogue="close" aria-label="Đóng hội thoại">✕ Đóng</button></header>' +
      '<div class="hu-dialogue-content"></div></div>';
    document.body.append(panel);
    panel.addEventListener('click', event => {
      const b = event.target.closest('[data-dialogue]');
      if (!b) return;
      event.preventDefault();
      const action = b.dataset.dialogue;
      if (action === 'close') close();
      else if (action === 'next') next();
      else if (action === 'topic') openTopic(b.dataset.id);
      else if (action === 'answer') answer(b.dataset.option);
      else if (action === 'topics' && current?.npcId) showTopics(current.npcId);
    });
    return panel;
  }

  function show(html) {
    ensure().querySelector('.hu-dialogue-content').innerHTML = html;
    panel.hidden = false;
    document.body.classList.add('hu-dialogue-open');
    panel.querySelector('.hu-dialogue-frame').focus({ preventScroll: true });
  }

  function close() {
    if (!panel || panel.hidden) return;
    current = null;
    panel.hidden = true;
    document.body.classList.remove('hu-dialogue-open');
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  }

  function openNpc(npcId) {
    if (!npcById(npcId) || !story.NPCS[npcId]) return;
    if (!current) returnFocus = document.activeElement;
    showTopics(npcId);
  }

  function showTopics(npcId) {
    const npc = npcById(npcId);
    if (!npc) return close();
    const affinity = UI.s().npcAffinities[npcId] || 0;
    current = { npcId, type: 'topics' };
    const portrait = '<img class="hu-dialogue-portrait" src="' + esc(npc.ảnh) +
      '" alt="' + esc(npc['tên NPC']) + '" loading="lazy" decoding="async">';
    const topics = tiers.map(([tier, min, label]) => {
      const scene = story.NPCS[npcId][tier], locked = affinity < min;
      return '<button type="button" class="hu-dialogue-topic ' + (locked ? 'locked' : '') +
        '" data-dialogue="topic" data-id="' + esc(scene.id) + '"' + (locked ? ' disabled' : '') + '>' +
        '<b>' + esc(scene.title) + '</b><small>' +
        (locked ? 'Cần thiện cảm ' + min : label + (UI.s().story.read[scene.id] ? ' · Đã nghe' : ' · Chưa nghe')) +
        '</small></button>';
    }).join('');
    show('<div class="hu-dialogue-topic-head">' + portrait +
      '<div><span class="eyebrow gold">KỲ NHÂN HẠ GIỚI</span><h2>' + esc(npc['tên NPC']) +
      '</h2><p>' + esc(npc['bối cảnh']) + '</p><small>Thiện cảm ' + affinity + '/100</small></div></div>' +
      '<p class="hu-dialogue-hint">Chọn chủ đề để hỏi chuyện. Những chuyện thầm kín chỉ mở khi đôi bên đủ tin cậy.</p>' +
      '<div class="hu-dialogue-topics">' + topics + '</div>');
  }

  function openChapter(id) {
    const chapter = chapterById(id);
    if (!chapter || (UI.s().realm < chapter.unlock.realm && !UI.s().story.read[id])) return;
    returnFocus = document.activeElement;
    current = { type: 'chapter', entry: chapter, index: 0 };
    renderLine();
  }

  function openTopic(id) {
    const npcId = current?.npcId, scene = topicById(npcId, id);
    if (!scene) return;
    const index = tiers.findIndex(([tier]) => story.NPCS[npcId][tier]?.id === id);
    if (index < 0 || (UI.s().npcAffinities[npcId] || 0) < tiers[index][1]) return;
    current = { type: 'npc', npcId, entry: scene, index: 0 };
    renderLine();
  }

  function renderLine() {
    if (!current?.entry) return;
    const { entry, index, npcId } = current;
    const chapter = current.type === 'chapter';
    const npc = chapter ? null : npcById(npcId);
    const line = chapter ? { who: 'narrator', text: entry.text } : entry.lines[index];
    const who = line.who === 'player' ? UI.s().name : line.who === 'npc' ? npc['tên NPC'] : 'Thiên Thư';
    const portrait = npc && line.who === 'npc' ? '<img class="hu-dialogue-speaker" src="' +
      esc(npc.ảnh) + '" alt="" loading="lazy" decoding="async">' : '';
    const heading = chapter ? '<span class="eyebrow gold">THIÊN THƯ</span><h2>' + esc(entry.title) + '</h2>' : '';
    const back = chapter ? '' : '<button type="button" class="btn btn-outline" data-dialogue="topics">Chủ đề</button>';
    show(heading + '<div class="hu-dialogue-line">' + portrait + '<div class="hu-dialogue-speech">' +
      '<b>' + esc(who) + '</b><p>' + esc(line.text) + '</p></div></div>' +
      '<div class="hu-dialogue-actions"><span class="hu-dialogue-progress">' +
      (chapter ? 'Một trang Thiên Thư' : 'Lời ' + (index + 1) + '/' + entry.lines.length) +
      '</span>' + back + '<button type="button" class="btn btn-gold" data-dialogue="next">' +
      ((chapter || index === entry.lines.length - 1) ? 'Tiếp tục' : 'Lời tiếp') + ' ›</button></div>');
  }

  async function next() {
    if (!current?.entry) return;
    const { entry, npcId } = current;
    if (current.type === 'npc' && current.index < entry.lines.length - 1) {
      current.index++; return renderLine();
    }
    const selected = UI.s().story.flags[entry.id];
    if (!UI.s().story.read[entry.id]) await UI.command('storyMark', { id: entry.id });
    if (entry.choices?.length && !selected) return renderChoices();
    if (selected) return renderReply(entry.choices.find(x => x.id === selected)?.reply || '');
    if (current.type === 'npc') showTopics(npcId); else close();
  }

  function renderChoices() {
    const entry = current.entry;
    show('<span class="eyebrow gold">LỜI ĐÁP</span><h2>' + esc(entry.title) + '</h2>' +
      '<p class="hu-dialogue-hint">Lời đã ghi sẽ được giữ trong Thiên Thư qua những lần chuyển thế.</p>' +
      '<div class="hu-dialogue-topics">' + entry.choices.map(choice =>
        '<button type="button" class="hu-dialogue-topic" data-dialogue="answer" data-option="' +
        esc(choice.id) + '"><b>' + esc(choice.label) + '</b></button>').join('') + '</div>' +
      '<button type="button" class="btn btn-outline" data-dialogue="' + (current.type === 'npc' ? 'topics' : 'close') + '">Để sau</button>');
  }

  async function answer(option) {
    if (!current?.entry?.choices?.some(choice => choice.id === option)) return;
    await UI.command('storyMark', { id: current.entry.id, option });
    renderReply(current.entry.choices.find(x => x.id === option).reply);
  }

  function renderReply(reply) {
    if (!current) return;
    show('<span class="eyebrow gold">ĐÃ GHI NHẬN</span><h2>' + esc(current.entry.title) +
      '</h2><p class="hu-dialogue-reply">' + esc(reply) + '</p>' +
      '<div class="hu-dialogue-actions">' +
      (current.type === 'npc' ? '<button type="button" class="btn btn-gold" data-dialogue="topics">Trở lại chủ đề</button>' :
        '<button type="button" class="btn btn-gold" data-dialogue="close">Khép Thiên Thư</button>') + '</div>');
  }

  document.addEventListener('keydown', event => {
    if (!panel || panel.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(); }
    if (event.key !== 'Tab') return;
    const buttons = [...panel.querySelectorAll('button:not(:disabled)')];
    if (!buttons.length) return;
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }, true);

  UI.dialogue = { openNpc, openChapter, close };
  UI.action('openNpcDialogue', async (el, data) => { openNpc(data.id); return UI.KEEP; });
  UI.action('openStory', async (el, data) => { openChapter(data.id); return UI.KEEP; });
})(typeof window !== 'undefined' ? window : globalThis);
