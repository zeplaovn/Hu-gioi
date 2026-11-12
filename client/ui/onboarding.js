/* HƯ GIỚI · lời mở đầu và hướng dẫn người chơi mới. Dùng được trực tiếp qua file://. */
(function (root) {
  'use strict';
  const UI = root.HU_UI, A = root.HU_ASSETS;
  const { $ } = UI.kit;
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const STORY = [
    'Trái Đất... từng là nơi chúng ta tin rằng bản thân nắm rõ mọi quy luật, một thế giới của nhịp sống êm đềm và những lo toan đời thường bé nhỏ.',
    'Cho đến ngày hôm ấy, khi màn đêm vô tận xé rách bầu trời. Những trận văn cổ xưa từ cõi hư vô giáng xuống, thắp sáng nhân gian bằng hàng vạn ký tự bí ẩn.',
    'Không một cảnh báo, không một lời giải thích... Từng người, từng người một tan biến vào hư không, bị cuốn đi khỏi thực tại mà họ từng biết.',
    'Họ vượt qua giang hà vũ trụ, xuyên qua những tàn tích tiên gia đã phủ bụi triệu năm, nơi thiên đạo tái lập và mở ra cánh cổng đến cõi mộng ảo tận cùng.',
    'Chào mừng đến với Hư Giới! Nơi muôn vàn sinh linh rơi xuống những góc trời xa lạ — kẻ hóa thành cô độc giữa muôn ngàn hiểm nguy, người đứng trước cơ duyên thành Tiên hóa Thánh. Và số phận của bạn... chính thức bắt đầu từ đây!'
  ];
  const CHAPTERS = ['Nhân gian', 'Thiên biến', 'Ly giới', 'Vượt hư không', 'Tiên lộ khởi nguyên'];
  const TYPE_INTERVAL = 35, SCROLL_DURATION = 2400;
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('vi', { granularity: 'grapheme' }) : null;
  const lettersOf = text => segmenter ? Array.from(segmenter.segment(text), part => part.segment) : Array.from(text);
  let intro = null;

  function playIntro() {
    if (intro) return intro.promise;
    const el = document.createElement('section');
    el.id = 'storyIntro';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Khởi nguyên Hư Giới');
    el.tabIndex = -1;
    el.innerHTML = `<div class="intro-images" aria-hidden="true"><img class="intro-image" alt=""><img class="intro-image" alt=""></div>
      <div class="intro-shade"></div><div class="intro-dust" aria-hidden="true"></div><div class="intro-letterbox" aria-hidden="true"></div>
      <header class="intro-top"><span>HƯ GIỚI</span><span>THIÊN MỆNH KHỞI NGUYÊN</span></header>
      <div class="intro-bottom"><span id="introChapter" class="eyebrow gold"></span><h2 id="introTitle"></h2>
        <p id="introCaption" class="intro-caption" aria-hidden="true"><span id="introVisible"></span><span id="introPending"></span></p>
        <p id="introNarration" class="intro-narration" role="status" aria-live="polite" aria-atomic="true"></p>
        <div class="intro-controls"><span id="introDots" aria-hidden="true"></span></div></div>`;
    document.body.append(el);
    document.body.classList.add('intro-open');
    const welcome = $('welcome'), wasInert = welcome.inert && !$('gameLoading');
    welcome.inert = true;
    let resolve;
    const state = intro = { el, index: 0, timer: 0, ended: false, elapsed: 0, started: null, welcome, wasInert,
      promise: new Promise(done => { resolve = done; }) };
    const schedule = () => {
      clearTimeout(state.timer);
      if (state.started !== null) state.elapsed += performance.now() - state.started;
      state.started = null;
      const paused = document.hidden;
      el.classList.toggle('paused', paused);
      el.getAnimations({ subtree: true }).forEach(animation => paused ? animation.pause() : animation.play());
      if (!state.ended && !paused) {
        state.started = performance.now();
        tick();
      }
    };
    const finish = () => {
      if (state.ended) return;
      state.ended = true;
      clearTimeout(state.timer);
      $('introCaption').getAnimations().forEach(animation => animation.cancel());
      $('introVisible').textContent = 'Đang bước vào Hư Giới…';
      $('introPending').textContent = '';
      $('introNarration').textContent = 'Đang bước vào Hư Giới.';
      el.focus({ preventScroll: true });
      resolve();
    };
    const phase = (name, duration) => {
      state.phase = name;
      state.duration = duration;
      state.elapsed = 0;
      state.started = null;
      if (name === 'scroll' && duration) $('introCaption').animate([
        { opacity: 1, transform: 'translateY(0)' },
        { opacity: 0, transform: 'translateY(-24vh)' }
      ], { duration, fill: 'forwards', easing: 'ease-in-out' });
      schedule();
    };
    function tick() {
      if (state.ended || document.hidden) return;
      const elapsed = state.elapsed + performance.now() - state.started;
      if (state.phase === 'typing') {
        const count = Math.min(state.letters.length, Math.floor(elapsed / TYPE_INTERVAL));
        if (count !== state.written) {
          state.written = count;
          $('introVisible').textContent = state.letters.slice(0, count).join('');
          $('introPending').textContent = state.letters.slice(count).join('');
        }
      }
      if (elapsed >= state.duration) {
        if (state.phase === 'typing') phase('reading', state.readingDuration);
        else if (state.phase === 'reading') phase('scroll', state.reduced ? 0 : SCROLL_DURATION);
        else next();
        return;
      }
      const delay = state.phase === 'typing' ? Math.min(TYPE_INTERVAL, state.duration - elapsed) : state.duration - elapsed;
      state.timer = setTimeout(tick, delay);
    }
    const show = () => {
      const images = el.querySelectorAll('.intro-image'), current = images[state.index % 2];
      current.src = A.INTRO[state.index];
      images.forEach(image => image.classList.toggle('active', image === current));
      state.reduced = UI.isReduced();
      state.letters = lettersOf(STORY[state.index]);
      state.written = state.reduced ? state.letters.length : 0;
      const words = STORY[state.index].split(/\s+/).length;
      state.readingDuration = state.reduced ? Math.max(8000, words * 230) : Math.max(1800, words * 60);
      const typingDuration = state.reduced ? 0 : state.letters.length * TYPE_INTERVAL;
      current.getAnimations().forEach(animation => animation.cancel());
      if (!state.reduced) current.animate([
        { transform: state.index % 2 ? 'scale(1.13) translateX(-1%)' : 'scale(1.02) translateX(1%)' },
        { transform: state.index % 2 ? 'scale(1.02) translateX(1%)' : 'scale(1.13) translateX(-1%)' }
      ], { duration: typingDuration + state.readingDuration + SCROLL_DURATION + 1800, fill: 'forwards', easing: 'linear' });
      $('introChapter').textContent = `CHƯƠNG ${String(state.index + 1).padStart(2, '0')} / 05`;
      $('introTitle').textContent = CHAPTERS[state.index];
      const caption = $('introCaption');
      caption.getAnimations().forEach(animation => animation.cancel());
      $('introVisible').textContent = state.reduced ? STORY[state.index] : '';
      $('introPending').textContent = state.reduced ? '' : STORY[state.index];
      $('introNarration').textContent = CHAPTERS[state.index] + '. ' + STORY[state.index];
      $('introDots').innerHTML = STORY.map((_, i) => `<i class="${i <= state.index ? 'on' : ''}"></i>`).join('');
      phase(state.reduced ? 'reading' : 'typing', state.reduced ? state.readingDuration : typingDuration);
    };
    function next() {
      if (state.ended) return;
      if (state.index === STORY.length - 1) finish();
      else { state.index++; show(); }
    }
    state.visibility = schedule;
    document.addEventListener('visibilitychange', schedule);
    show();
    return state.promise;
  }

  async function closeIntro() {
    if (!intro) return;
    const state = intro;
    state.ended = true;
    clearTimeout(state.timer);
    document.removeEventListener('visibilitychange', state.visibility);
    state.el.classList.add('leaving');
    await wait(UI.isReduced() ? 0 : 500);
    state.el.remove();
    state.welcome.inert = state.wasInert;
    document.body.classList.remove('intro-open');
    intro = null;
  }
  UI.intro = { play: playIntro, close: closeIntro, focus: () => intro?.el.focus({ preventScroll: true }), get active() { return !!intro; } };

  /* Bảng dẫn đường không khóa màn hình: người chơi phải tự thực hiện từng thao tác.
     Điều kiện hoàn thành và phần thưởng vẫn do máy chủ quyết định. */
  let guide = null, marked = null;
  const GUIDE_KEY = 'huGioiNoviceGuideHidden:';
  const key = () => GUIDE_KEY + (UI.session?.playerId || '');
  function hiddenByPlayer() {
    try { return !!UI.session?.playerId && root.localStorage?.getItem(key()) === '1'; } catch { return false; }
  }
  function rememberHidden(value) {
    try { if (UI.session?.playerId) root.localStorage?.setItem(key(), value ? '1' : '0'); } catch { /* vẫn sử dụng trong phiên */ }
  }
  function plan(s, info, now) {
    const q = info.quest;
    if (!q) return null;
    if (info.ready) return { page: 'quests', target: '[data-act="claimQuest"][data-id="' + q.id + '"]', text: 'Mục tiêu đã hoàn thành. Mở Nhiệm vụ và chạm Nhận thưởng để tiếp tục.', action: 'Đi nhận thưởng' };
    switch (q.id) {
      case 'novice_meditate':
        return { page: 'idle', target: '.status-progress', text: 'Giữ game đang mở và kết nối. Tu vi tự tăng; hãy nhập định đủ 60 giây (' + Math.min(60, Math.floor(s.progress.meditate)) + '/60).', action: 'Xem tu vi' };
      case 'novice_sect':
        if (UI.sectMeasured && !UI.sectMeasured()) return { page: 'sect:missions', target: '[data-act="sectMeasure"]', text: 'Mở Tông môn và chạm bia đo linh căn để biết danh phận nhập môn.', action: 'Đến bia đo linh căn' };
        return { page: 'world:sect', target: '[data-act="joinSect"]:not(:disabled)', text: 'Mở Tông môn, đọc giới thiệu rồi chạm Gia nhập ở tông môn bạn chọn.', action: 'Mở tông môn' };
      case 'novice_mission': {
        const m = s.sect.mission;
        if (m && m.end > now) return { page: 'world:sect', target: '[data-act="sectMissionClaim"]', text: 'Ủy thác đang thực hiện. Giữ game mở, chờ hết giờ rồi trở lại nhận kết quả; nếu thất bại hãy thử lại.', action: 'Xem ủy thác' };
        if (m) return { page: 'world:sect', target: '[data-act="sectMissionClaim"]:not(:disabled)', text: 'Ủy thác đã đến hạn. Chạm Nhận thưởng; nếu nhiệm vụ thất bại, hãy nhận lại một ủy thác khác.', action: 'Đến nhận kết quả' };
        return { page: 'world:sect', target: '[data-act="sectMissionStart"]:not(:disabled)', text: 'Trong bảng Ủy thác tông môn, chọn một nhiệm vụ đang mở và chạm Nhận.', action: 'Chọn ủy thác' };
      }
      case 'novice_explore': {
        const e = s.exploration?.active;
        if (!e) return { page: 'combat', target: '[data-act="exploreStart"]:not(:disabled)', text: 'Mở Lịch luyện, chọn nơi phù hợp và chạm Khởi hành. Một chuyến kéo dài 10 phút khi game đang mở.', action: 'Mở lịch luyện' };
        if (e.choice < 0 && (e.kind === 'npc' || e.kind === 'monster')) return { page: 'combat', target: '[data-act="exploreChoice"]:not(:disabled)', text: 'Chọn một cách ứng phó với sự kiện. Đọc kỹ từng lựa chọn và nguy cơ trước khi quyết định.', action: 'Xem sự kiện' };
        return { page: 'combat', target: '#explorationCountdown', text: 'Tiếp tục mở game cho đến khi chuyến lịch luyện kết thúc và bạn trở về.', action: 'Xem chuyến đi' };
      }
      case 'novice_alchemy': {
        if (s.craftQueue.length) return { page: 'craft:dan', target: '.craft-top', text: 'Mẻ đan đang luyện. Giữ game mở đến khi hoàn tất; thất bại thì chuẩn bị nguyên liệu và thử lại.', action: 'Xem lò đan' };
        const book = root.HU_GAME.SECT_BOOKS.find(b => b.id === s.borrowedBook && b.kind === 'PILL');
        if (!book && !s.sect.joined && UI.sectMeasured && !UI.sectMeasured()) return { page: 'sect:missions', target: '[data-act="sectMeasure"]', text: 'Đo linh căn rồi gia nhập tông môn để mượn sách luyện đan.', action: 'Đến bia đo linh căn' };
        if (!book && !s.sect.joined) return { page: 'sect:missions', target: '[data-act="joinSect"]:not(:disabled)', text: 'Gia nhập tông môn để mượn sách luyện đan ở Tàng Kinh Các.', action: 'Vào tông môn' };
        if (!book && (s.adventurePoints || 0) < 40) return { page: 'sect:missions', target: '[data-act="sectMissionStart"]:not(:disabled)', text: 'Cần 40 điểm lịch luyện để mượn Đan Đạo Chân Giải · Hạ Giới. Hoàn thành ủy thác hoặc lịch luyện để kiếm điểm.', action: 'Kiếm điểm' };
        if (!book) return { page: 'sect:library', target: '[data-act="borrowSectBook"][data-id="dan_ha"]:not(:disabled)', text: 'Trong Tàng Kinh Các, mượn Đan Đạo Chân Giải · Hạ Giới với 40 điểm để mở công thức luyện đan.', action: 'Mượn sách đan' };
        return { page: 'craft:dan', target: '[data-act="craft"]:not(:disabled)', text: 'Mở Luyện đan, tìm công thức có đủ nguyên liệu rồi chạm Xếp mẻ luyện. Có thể mua thêm dược liệu nếu thiếu.', action: 'Mở luyện đan' };
      }
      case 'novice_stage':
        return { page: 'idle', target: '.status-progress', text: 'Tiếp tục tu luyện đến Luyện Khí tầng 3. Tiểu cảnh giới tự đột phá khi đủ tu vi.', action: 'Xem tu luyện' };
      case 'novice_peak':
        return { page: 'idle', target: '.status-progress', text: 'Tiếp tục tu luyện đến tầng cuối Luyện Khí. Chuẩn bị sinh lực và vật phẩm hộ kiếp trước khi độ kiếp.', action: 'Xem tu luyện' };
      case 'novice_foundation':
        return { page: s.qi >= UI.g().need() ? 'tribulation' : 'idle', target: s.qi >= UI.g().need() ? '#tribStart' : '.status-progress', text: s.qi >= UI.g().need() ? 'Tu vi đã đủ. Xem kỹ xác suất và hộ kiếp trước khi dẫn lôi: thất bại khiến nhân vật tử vong.' : 'Tích đủ tu vi ở đỉnh Luyện Khí trước khi chuẩn bị độ kiếp. Thất bại khiến nhân vật tử vong.', action: s.qi >= UI.g().need() ? 'Xem chuẩn bị độ kiếp' : 'Xem tu luyện' };
      default: return { page: q.go, target: '', text: q.desc, action: 'Đi thực hiện' };
    }
  }
  function clearMark() { marked?.classList.remove('novice-guide-target'); marked = null; }
  function findTarget(selector) {
    if (!selector) return null;
    return [...document.querySelectorAll(selector)].find(el => el.getClientRects().length && !el.closest('[hidden], [inert]')) || null;
  }
  function updateGuide() {
    if (!guide || !UI.store.ready || !UI.s().created) return;
    const info = UI.g().noviceQuestInfo(), q = info.quest;
    if (!q) { closeGuide(); UI.toast('Đã hoàn thành hành trình tân thủ đến Trúc Cơ.', { type: 'success', title: 'Tiên lộ' }); return; }
    const p = plan(UI.s(), info, Date.now());
    const markerKey = q.id + ':' + info.ready + ':' + p.target;
    if (guide.markerKey !== markerKey) clearMark();
    guide.markerKey = markerKey;
    guide.plan = p;
    const setText = (id, value) => { const el = $(id); if (el.textContent !== value) el.textContent = value; };
    setText('noviceGuideCount', 'TÂN THỦ · ' + (info.index + 1) + '/' + root.HU_GAME.NOVICE_QUESTS.length);
    setText('noviceGuideTitle', q.name);
    setText('noviceGuideText', p.text);
    setText('noviceGuideGo', p.action);
    if (marked && (!marked.isConnected || !marked.getClientRects().length)) clearMark();
  }
  function pointToStep() {
    if (!guide) return;
    updateGuide();
    const p = guide?.plan;
    if (!p) return;
    UI.go(p.page);
    const screen = p.page.split(':')[0];
    if (screen !== 'idle' && screen !== 'tribulation' && UI.windows.has(screen)) UI.windows.render(screen);
    clearMark();
    const point = () => {
      if (!guide || guide.plan !== p) return;
      const target = findTarget(p.target);
      if (!target) return;
      target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
      const r = target.getBoundingClientRect();
      guide.el.classList.toggle('target-low', r.top + r.height / 2 > root.innerHeight / 2);
      target.classList.add('novice-guide-target');
      marked = target;
    };
    point();
    root.requestAnimationFrame(point);
  }
  function closeGuide() {
    if (!guide) return;
    clearMark(); guide.el.remove(); guide = null;
  }
  function startGuide(force = true) {
    if (!UI.store.ready || !UI.s().created || UI.intro.active || UI.tribulation.active || !$('modalLayer').hidden) return;
    if (!force && hiddenByPlayer()) return;
    if (!UI.g().noviceQuestInfo().quest) return;
    if (guide) { updateGuide(); return; }
    if (force) rememberHidden(false);
    const el = document.createElement('aside');
    el.id = 'noviceGuide';
    el.setAttribute('aria-label', 'Hướng dẫn tân thủ');
    el.innerHTML = '<div class="novice-guide-heading"><span id="noviceGuideCount" class="eyebrow gold"></span><button id="noviceGuideHide" type="button" aria-label="Ẩn hướng dẫn">×</button></div><h2 id="noviceGuideTitle"></h2><p id="noviceGuideText" role="status" aria-live="polite"></p><div class="novice-guide-actions"><button id="noviceGuideGo" type="button" class="btn btn-gold">Chỉ vị trí</button><button id="noviceGuideCollapse" type="button" class="btn btn-outline" aria-expanded="true">Thu gọn</button></div>';
    document.body.append(el);
    guide = { el, plan: null };
    $('noviceGuideGo').addEventListener('click', pointToStep);
    $('noviceGuideHide').addEventListener('click', () => { rememberHidden(true); closeGuide(); });
    $('noviceGuideCollapse').addEventListener('click', event => {
      const collapsed = el.classList.toggle('collapsed');
      event.currentTarget.textContent = collapsed ? 'Mở rộng' : 'Thu gọn';
      event.currentTarget.setAttribute('aria-expanded', String(!collapsed));
    });
    updateGuide();
  }
  UI.tutorial = { start: () => startGuide(true), resume: () => startGuide(false), close: closeGuide, update: updateGuide, plan, get active() { return !!guide; } };
  UI.action('tutorial', () => { startGuide(true); return UI.KEEP; });
})(typeof window !== 'undefined' ? window : globalThis);
