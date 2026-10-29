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
        <p id="introCaption" class="intro-caption" role="status" aria-live="polite"></p>
        <div class="intro-controls"><span id="introDots" aria-hidden="true"></span><small id="introHint">Chạm để chuyển cảnh · Space tạm dừng · Esc bỏ qua</small></div></div>`;
    document.body.append(el);
    document.body.classList.add('intro-open');
    const welcome = $('welcome'), wasInert = welcome.inert && !$('gameLoading');
    welcome.inert = true;
    let resolve;
    const state = intro = { el, index: 0, timer: 0, paused: false, ended: false, remaining: 0, started: 0, welcome, wasInert,
      promise: new Promise(done => { resolve = done; }) };
    const schedule = () => {
      clearTimeout(state.timer);
      if (state.started) state.remaining = Math.max(0, state.remaining - (performance.now() - state.started));
      state.started = 0;
      const paused = state.paused || document.hidden;
      el.classList.toggle('paused', paused);
      el.getAnimations({ subtree: true }).forEach(animation => paused ? animation.pause() : animation.play());
      if (!state.ended && !state.paused && !document.hidden) {
        state.started = performance.now();
        state.timer = setTimeout(next, state.remaining);
      }
    };
    const finish = () => {
      if (state.ended) return;
      state.ended = true;
      clearTimeout(state.timer);
      el.focus({ preventScroll: true });
      resolve();
    };
    const show = () => {
      const images = el.querySelectorAll('.intro-image'), current = images[state.index % 2];
      current.src = A.INTRO[state.index];
      images.forEach(image => image.classList.toggle('active', image === current));
      state.remaining = Math.max(8000, STORY[state.index].split(/\s+/).length * 230);
      state.started = 0;
      current.getAnimations().forEach(animation => animation.cancel());
      if (!UI.isReduced()) current.animate([
        { transform: state.index % 2 ? 'scale(1.13) translateX(-1%)' : 'scale(1.02) translateX(1%)' },
        { transform: state.index % 2 ? 'scale(1.02) translateX(1%)' : 'scale(1.13) translateX(-1%)' }
      ], { duration: state.remaining + 1800, fill: 'forwards', easing: 'linear' });
      $('introChapter').textContent = `CHƯƠNG ${String(state.index + 1).padStart(2, '0')} / 05`;
      $('introTitle').textContent = CHAPTERS[state.index];
      const caption = $('introCaption');
      caption.textContent = STORY[state.index];
      caption.getAnimations().forEach(animation => animation.cancel());
      if (!UI.isReduced()) caption.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 1500, easing: 'ease-out' });
      $('introDots').innerHTML = STORY.map((_, i) => `<i class="${i <= state.index ? 'on' : ''}"></i>`).join('');
      schedule();
    };
    function next() {
      if (state.ended) return;
      if (state.index === STORY.length - 1) finish();
      else { state.index++; show(); }
    }
    el.addEventListener('click', next);
    const togglePause = () => {
      state.paused = !state.paused;
      $('introHint').textContent = state.paused ? 'Đã tạm dừng · Space để tiếp tục' : 'Chạm để chuyển cảnh · Space tạm dừng · Esc bỏ qua';
      schedule();
    };
    state.visibility = schedule;
    document.addEventListener('visibilitychange', schedule);
    el.addEventListener('keydown', event => {
      event.stopPropagation();
      if (event.key === 'Escape') { event.preventDefault(); finish(); }
      else if (event.key === 'ArrowRight' || event.key === 'Enter') { event.preventDefault(); next(); }
      else if (event.code === 'Space') { event.preventDefault(); if (!event.repeat) togglePause(); }
      else if (event.key === 'Tab') { event.preventDefault(); el.focus({ preventScroll: true }); }
    });
    show();
    return state.promise;
  }

  async function closeIntro() {
    if (!intro) return;
    const state = intro;
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

  function trapTab(el, event) {
    const buttons = [...el.querySelectorAll('button:not(:disabled)')];
    if (!buttons.length) { event.preventDefault(); return; }
    const first = buttons[0], last = buttons.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    else if (!buttons.includes(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
  }

  const STEPS = [
    { target: '#heroActor', title: 'Một hành trình mới', text: 'Đạo thân tự nhập định và hấp thụ linh khí theo thời gian. Số nổi trên nhân vật cho biết lượng vừa hấp thụ.', go: 'idle' },
    { target: '#statusVitals', title: 'Sinh lực, linh khí và thọ nguyên', text: 'Theo dõi ba thanh này trước mỗi chuyến lịch luyện. Đột phá giúp kéo dài tuổi thọ; năm chỉ số thiên phú nằm ngay bên dưới.', go: 'idle' },
    { target: '#equippedItems', title: 'Trang bị trong Hành trang', text: 'Bốn ô pháp bảo nằm ở đầu Hành trang. Chọn một pháp bảo trong túi rồi bấm Trang bị; bấm ô đang mặc để tháo.', go: 'character:bag' },
    { target: '.inventory-cell[data-select="BT-001"]', fallback: '.inventory-items', title: 'Lĩnh ngộ công pháp', text: 'Chọn bí tịch Dẫn Khí Quyết rồi Lĩnh ngộ. Công pháp tự vận hành nếu còn ô trống; vào tab Công pháp để quản lý tối đa ba công pháp đang dùng.', go: 'character:bag' },
    { target: '#menu [data-window="combat"]', title: 'Lịch luyện và cơ duyên', text: 'Lịch luyện để kiếm tài nguyên. Thế giới có nhiệm vụ, bí cảnh và tông môn; Nghề phụ giúp luyện đan, rèn đồ và trồng linh thảo.', go: 'idle' },
    { target: '#btn-break', title: 'Bước qua cảnh giới', text: 'Khi tu vi đầy, nút Đột phá sẽ sáng lên. Bạn đã sẵn sàng! Có thể xem lại hướng dẫn này trong Cài đặt → Hướng dẫn.', go: 'idle' }
  ];
  let tutorial = null;
  const stepTarget = step => document.querySelector(step.target) || (step.fallback ? document.querySelector(step.fallback) : null);
  function placeTutorial() {
    if (!tutorial) return;
    const target = stepTarget(STEPS[tutorial.index]), spot = $('tutorialSpot'), card = $('tutorialCard');
    const width = root.innerWidth, height = root.innerHeight;
    spot.hidden = !target?.getClientRects().length;
    tutorial.el.classList.toggle('no-target', spot.hidden);
    let left = (width - card.offsetWidth) / 2, top = (height - card.offsetHeight) / 2;
    if (!spot.hidden) {
      const r = target.getBoundingClientRect(), clip = target.closest('.win-body')?.getBoundingClientRect();
      const x = Math.max(4, r.left - 5, clip?.left || 0), y = Math.max(4, r.top - 5, clip?.top || 0);
      const right = Math.min(width - 4, r.right + 5, clip?.right ?? width), bottom = Math.min(height - 4, r.bottom + 5, clip?.bottom ?? height);
      Object.assign(spot.style, { left: x + 'px', top: y + 'px', width: Math.max(0, right - x) + 'px', height: Math.max(0, bottom - y) + 'px' });
      const below = bottom + 18, above = y - card.offsetHeight - 18;
      top = below + card.offsetHeight < height - 12 ? below : above > 12 ? above : height - card.offsetHeight - 12;
      left = Math.max(12, Math.min(width - card.offsetWidth - 12, x + (right - x) / 2 - card.offsetWidth / 2));
      if (below + card.offsetHeight >= height - 12 && above <= 12) {
        if (right + 18 + card.offsetWidth < width - 12) left = right + 18;
        else if (x - card.offsetWidth - 18 > 12) left = x - card.offsetWidth - 18;
      }
    }
    Object.assign(card.style, { top: Math.max(12, top) + 'px', left: Math.max(12, left) + 'px' });
  }
  function endTutorial() {
    if (!tutorial) return;
    tutorial.el.remove();
    $('game').inert = tutorial.wasInert;
    root.removeEventListener('resize', placeTutorial);
    document.removeEventListener('scroll', placeTutorial, true);
    tutorial = null;
    UI.go('idle', { silent: true });
    $('stage').focus({ preventScroll: true });
  }
  function showStep() {
    const step = STEPS[tutorial.index];
    UI.windows.closeAll();
    UI.go(step.go, { silent: true });
    $('tutorialTitle').textContent = step.title;
    $('tutorialText').textContent = step.text;
    $('tutorialCount').textContent = `DẪN ĐƯỜNG TIÊN LỘ · ${tutorial.index + 1}/${STEPS.length}`;
    $('tutorialBack').disabled = tutorial.index === 0;
    $('tutorialNext').textContent = tutorial.index === STEPS.length - 1 ? 'Bắt đầu hành trình' : 'Tiếp theo ›';
    stepTarget(step)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    placeTutorial();
    requestAnimationFrame(placeTutorial);
    $('tutorialNext').focus({ preventScroll: true });
  }
  function startTutorial() {
    if (tutorial || !UI.store.ready || UI.intro.active || UI.tribulation.active || !$('modalLayer').hidden) return;
    const el = document.createElement('section');
    el.id = 'tutorialLayer';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'tutorialTitle');
    el.innerHTML = `<div id="tutorialSpot" aria-hidden="true"></div><div id="tutorialCard">
      <span id="tutorialCount" class="eyebrow gold"></span><h2 id="tutorialTitle"></h2><p id="tutorialText" role="status" aria-live="polite"></p>
      <div class="tutorial-actions"><button id="tutorialSkip" class="text-btn" type="button">Bỏ qua</button><button id="tutorialBack" class="btn btn-outline" type="button">Quay lại</button><button id="tutorialNext" class="btn btn-gold" type="button">Tiếp theo ›</button></div></div>`;
    document.body.append(el);
    tutorial = { el, index: 0, wasInert: $('game').inert };
    $('game').inert = true;
    $('tutorialSkip').addEventListener('click', endTutorial);
    $('tutorialBack').addEventListener('click', () => { if (tutorial.index > 0) { tutorial.index--; showStep(); } });
    $('tutorialNext').addEventListener('click', () => {
      if (++tutorial.index === STEPS.length) endTutorial(); else showStep();
    });
    el.addEventListener('keydown', event => {
      event.stopPropagation();
      if (event.key === 'Escape') { event.preventDefault(); endTutorial(); }
      else if (event.key === 'Tab') trapTab(el, event);
    });
    root.addEventListener('resize', placeTutorial);
    document.addEventListener('scroll', placeTutorial, true);
    showStep();
  }
  UI.tutorial = { start: startTutorial, close: endTutorial, get active() { return !!tutorial; } };
  UI.action('tutorial', () => { startTutorial(); return UI.KEEP; });
})(typeof window !== 'undefined' ? window : globalThis);
