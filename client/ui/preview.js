/* Xem giao diện chính khi engine chưa sẵn sàng. Không tạo phiên hay truy cập bản lưu. */
(function (root) {
  'use strict';
  const UI = root.HU_UI, H = root.HU_GAME, A = root.HU_ASSETS;
  if (!UI || !H || !A) return;
  const $ = id => document.getElementById(id);
  const MENU = ['idle', 'combat', 'craft', 'character', 'world', 'settings'];
  let bound = false;

  function text(id, value) { $(id).textContent = value; }

  function renderTalents(creation) {
    const container = $('statusTalents');
    container.replaceChildren();
    for (const talent of H.TALENT_INFO) {
      const value = creation.talent[talent.key] || 0;
      const row = document.createElement('div');
      row.className = 'status-talent';
      const icon = document.createElement('img');
      icon.src = A.BASE + 'ui/icon/menu/' + talent.icon;
      icon.alt = '';
      const label = document.createElement('span');
      label.textContent = talent.name;
      const number = document.createElement('b');
      number.textContent = value;
      const meter = document.createElement('meter');
      meter.min = 0;
      meter.max = H.TALENT_MAX;
      meter.value = value;
      meter.setAttribute('aria-label', talent.name);
      row.title = talent.name + ': ' + value + ' điểm';
      row.append(icon, label, number, meter);
      container.append(row);
    }
  }

  function renderMenu() {
    const menu = $('menu');
    menu.replaceChildren();
    for (const id of MENU) {
      const def = UI.screens[id];
      if (!def) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.disabled = true;
      button.title = def.label + ' · chưa khả dụng trong bản xem trước';
      button.setAttribute('aria-label', button.title);
      if (id === 'idle') button.classList.add('on');
      if (def.icon && /^ICON-/.test(def.icon)) {
        const icon = document.createElement('img');
        icon.src = A.BASE + 'ui/icon/menu/' + def.icon + '-40.png';
        icon.alt = '';
        button.append(icon);
      }
      const label = document.createElement('span');
      label.textContent = def.label;
      button.append(label);
      menu.append(button);
    }
    const more = document.createElement('button');
    more.type = 'button';
    more.disabled = true;
    more.title = 'Thêm · chưa khả dụng trong bản xem trước';
    more.setAttribute('aria-label', more.title);
    const icon = document.createElement('span');
    icon.className = 'ico';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '⋯';
    const label = document.createElement('span');
    label.textContent = 'Thêm';
    more.append(icon, label);
    menu.append(more);
  }

  function renderLog() {
    const feed = $('logFeed');
    feed.replaceChildren();
    for (const [tag, message] of [
      ['TIN', 'Đây là bản xem trước giao diện; mọi chỉ số đều là minh họa.'],
      ['DUYÊN', 'Tiên lộ sẽ mở khi luật chơi được hoàn thiện.']
    ]) {
      const row = document.createElement('div');
      row.className = 'log-entry ' + (tag === 'TIN' ? 'info' : 'gold');
      const badge = document.createElement('span');
      badge.className = 'log-tag';
      badge.textContent = tag;
      const content = document.createElement('span');
      content.className = 'log-text';
      content.textContent = message;
      row.append(badge, content);
      feed.append(row);
    }
    text('logCount', '2');
    $('logCount').setAttribute('aria-label', '2 tin trong nhật ký');
  }

  function show() {
    if (H.READY) return;
    const creation = UI.creation();
    const name = H.cleanName($('nameInput').value) || 'Đạo hữu';
    const age = creation.age;
    const life = H.raceLife(creation.race, 0);

    text('playerName', name);
    text('stageHeroName', name);
    text('playerRealm', 'Luyện Khí');
    text('playerRoot', H.rootLabel(creation.rootType, creation.rootSub).toUpperCase());
    $('avatar').src = A.heroPortrait(creation.gender, 0);
    $('heroSprite').src = A.heroSrc(creation.gender, 0);
    $('sceneBackdrop').style.backgroundImage = 'url("' + A.zoneBg(0) + '")';
    text('topQiHint', '68%');
    text('topQiText', '68 / 100');
    $('topQiFill').style.width = '68%';
    text('hpValue', '100 / 100');
    text('mpValue', '80 / 100');
    $('hpFill').style.width = '100%';
    $('mpFill').style.width = '80%';
    text('lifeValue', age + ' / ' + life + ' năm');
    $('lifeFill').style.width = Math.min(100, age / life * 100) + '%';
    $('lifeMeter').setAttribute('aria-valuemax', String(life));
    $('lifeMeter').setAttribute('aria-valuenow', String(Math.min(age, life)));
    $('lifeMeter').setAttribute('aria-valuetext', $('lifeValue').textContent);
    text('topRate', '+12/giây');
    text('rateText', '+12 tu vi/giây');
    text('moneyTop', '380');
    text('topDaoVan', '0');
    text('saveState', 'Không lưu · Xem trước');
    text('idleQuote', 'Một niệm tĩnh tâm, thiên địa tự khai.');
    $('modeMeditate').classList.add('active');
    $('modeMeditate').setAttribute('aria-pressed', 'true');
    $('modeFight').setAttribute('aria-pressed', 'false');
    $('game').querySelectorAll('[data-window], [data-act]').forEach(button => { button.disabled = true; });
    renderTalents(creation);
    renderMenu();
    renderLog();
    $('previewBar').hidden = false;
    $('welcome').hidden = true;
    $('game').hidden = false;
    document.body.classList.add('in-game', 'ui-preview');
    $('previewBack').focus({ preventScroll: true });
  }

  function back() {
    $('game').hidden = true;
    $('previewBar').hidden = true;
    $('welcome').hidden = false;
    $('logPanel').classList.remove('collapsed');
    $('logToggle').setAttribute('aria-expanded', 'true');
    document.body.classList.remove('in-game', 'ui-preview', 'log-collapsed');
    $('previewGame').focus({ preventScroll: true });
  }

  function bind() {
    if (bound || H.READY) return;
    bound = true;
    $('previewGame').hidden = false;
    $('startNew').hidden = true;
    $('previewGame').addEventListener('click', show);
    $('previewBack').addEventListener('click', back);
    $('logToggle').addEventListener('click', () => {
      const collapsed = $('logPanel').classList.toggle('collapsed');
      document.body.classList.toggle('log-collapsed', collapsed);
      $('logToggle').setAttribute('aria-expanded', String(!collapsed));
      $('logToggle').setAttribute('aria-label', collapsed ? 'Mở rộng nhật ký' : 'Thu gọn nhật ký');
      $('logToggle').title = collapsed ? 'Mở rộng nhật ký' : 'Thu gọn nhật ký';
    });
  }

  UI.mainPreview = { bind };
})(typeof window !== 'undefined' ? window : globalThis);
