/* HƯ GIỚI · LỊCH LUYỆN: chọn nơi, ghi chép và đếm ngược mười phút. */
(function (root) {
  'use strict';
  const H = root.HU_GAME, F = H.F, UI = root.HU_UI;
  const { $, esc, num, btn, card } = UI.kit;

  function zoneCard() {
    const s = UI.s(), journey = s.exploration?.active;
    const now = Date.now(), remain = journey ? Math.max(0, Math.ceil((journey.end - now) / 1000)) : 600;
    const countdown = String(Math.floor(remain / 60)).padStart(2, '0') + ':' + String(remain % 60).padStart(2, '0');
    return card('Chọn nơi lịch luyện', `
      <p class="info-note">${journey
        ? 'Đang hành tẩu trong bí cảnh. Phải kết thúc chuyến đi mới có thể trở về đài Tu luyện hoặc đổi địa điểm.'
        : 'Chọn địa điểm phù hợp đạo hạnh, sau đó khởi hành. Một chuyến lịch luyện kéo dài đúng mười phút.'}</p>
      <div class="zone-list">${H.ZONES.map(z => `
        <button class="zone-button ${z.id === s.zone ? 'active' : ''}" data-act="travel" data-index="${z.id}"
          ${journey || z.realm > s.realm ? 'disabled' : ''} aria-pressed="${z.id === s.zone}">
          <b>${esc(z.name)}</b><small>${z.realm > s.realm ? 'Mở ở ' + F.REALMS[z.realm] : esc(z.desc)}</small>
        </button>`).join('')}</div>
      ${journey
        ? `<div class="exploration-clock" role="timer" aria-label="Thời gian lịch luyện còn lại">
            <span>Thời gian trở về</span><strong id="explorationCountdown">${countdown}</strong>
            <div class="meter-bar" aria-hidden="true"><i id="explorationProgress" style="width:${(100 - remain / 6).toFixed(1)}%"></i></div>
          </div>`
        : btn('Khởi hành lịch luyện · 10 phút', 'exploreStart', '', false, 'btn-gold')}
    `, { eyebrow: 'BÍ CẢNH', cls: 'zone-card' });
  }

  function journalCard() {
    return card('Nhật ký lịch luyện', '<div class="journal" id="combatJournal" aria-live="polite"></div>',
      { eyebrow: 'DẤU CHÂN TIÊN LỘ' });
  }

  function panel() {
    return '<div class="screen-grid combat-grid exploration-grid">' + zoneCard() + journalCard() + '</div>';
  }

  function update() {
    const s = UI.s(), journey = s.exploration?.active, clock = $('explorationCountdown');
    if (journey && clock) {
      const remaining = Math.max(0, Math.ceil((journey.end - Date.now()) / 1000));
      clock.textContent = String(Math.floor(remaining / 60)).padStart(2, '0') + ':' + String(remaining % 60).padStart(2, '0');
      const bar = $('explorationProgress');
      if (bar) bar.style.width = (100 - remaining / 6).toFixed(1) + '%';
    }
    const journal = $('combatJournal');
    if (journal) journal.innerHTML = s.logs.slice(0, 24)
      .map(v => '<div><time>✦</time>' + esc(v) + '</div>').join('');
  }

  // Không còn yêu thú, thanh kỹ năng hay tự chiến trên sân khấu Lịch luyện.
  UI.skillDock = { update() { const el = $('skillDock'); if (el) el.hidden = true; } };
  UI.combatFx = { sync() {} };
  UI.register({
    id: 'combat', label: 'Lịch luyện', icon: 'ICON-MENU-002', eyebrow: 'LỊCH LUYỆN',
    render: panel, panel, update,
    signature: () => {
      const s = UI.s(), e = s.exploration?.active;
      return [s.zone, e?.start || 0, e?.end || 0, s.exploration?.last?.end || 0,
        s.logs[0] || '', s.logs.length].join('|');
    }
  });

  UI.action('exploreStart', () => {
    const result = UI.command('startExploration');
    UI.toast('Đã khởi hành đến ' + H.ZONES[UI.s().zone].name + ' · hẹn trở về sau 10 phút.',
      { type: 'gold', title: 'Lịch luyện' });
    UI.go('combat');
    return UI.SOFT;
  });
  UI.action('travel', (el, d) => {
    if (UI.s().exploration?.active) throw Error('Chuyến lịch luyện chưa kết thúc; chưa thể đổi địa điểm.');
    const zone = Number(d.index);
    UI.command('travel', { zone });
    UI.toast('Đã chọn ' + H.ZONES[zone].name + ' để lịch luyện.', { type: 'info', title: 'Bí cảnh' });
  });
})(typeof window !== 'undefined' ? window : globalThis);
