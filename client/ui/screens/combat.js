/* HƯ GIỚI · LỊCH LUYỆN: chọn nơi, ghi chép và đếm ngược mười phút. */
(function (root) {
  'use strict';
  const H = root.HU_GAME, F = H.F, UI = root.HU_UI;
  const { $, esc, num, btn, card } = UI.kit;

  function zoneCard() {
    const s = UI.s(), journey = s.exploration?.active, blocked = root.HU_COMMANDS?.activityConflict(s, 'startExploration');
    const now = Date.now(), remain = journey ? Math.max(0, Math.ceil((journey.end - now) / 1000)) : 600;
    const countdown = String(Math.floor(remain / 60)).padStart(2, '0') + ':' + String(remain % 60).padStart(2, '0');
    return card('Chọn nơi lịch luyện', `
      <p class="info-note">${journey
        ? 'Đang hành tẩu trong bí cảnh. Phải kết thúc chuyến đi mới có thể trở về đài Tu luyện hoặc đổi địa điểm.'
        : 'Chọn địa điểm phù hợp đạo hạnh, sau đó khởi hành. Một chuyến lịch luyện kéo dài đúng mười phút.'}</p>
      ${blocked && !journey ? '<p class="info-note">' + esc(blocked) + '</p>' : ''}
      <p class="info-note">Hoàn thành chuyến đi nhận ${H.EXPLORE_POINTS} điểm lịch luyện · hiện có ${num(s.adventurePoints || 0)} điểm. Dùng điểm để mượn sách tại Tàng Kinh Các trong tông môn.</p>
      ${journey ? `<div class="exploration-clock" role="timer" aria-label="Thời gian lịch luyện còn lại">
            <span>Thời gian trở về</span><strong id="explorationCountdown">${countdown}</strong>
            <div class="meter-bar" aria-hidden="true"><i id="explorationProgress" style="width:${(100 - remain / 6).toFixed(1)}%"></i></div>
          </div>${eventBlock()}` : ''}
      <div class="zone-list">${H.ZONES.map(z => `
        <button class="zone-button ${z.id === s.zone ? 'active' : ''}" data-act="travel" data-index="${z.id}"
          ${journey || z.realm > s.realm ? 'disabled' : ''} aria-pressed="${z.id === s.zone}">
          <b>${esc(z.name)}</b><small>${z.realm > s.realm ? 'Mở ở ' + F.REALMS[z.realm] : esc(z.desc)}</small>
        </button>`).join('')}</div>
      ${journey ? '' : btn('Khởi hành lịch luyện · 10 phút', 'exploreStart', '', !!blocked, 'btn-gold')}
    `, { eyebrow: 'BÍ CẢNH', cls: 'zone-card' });
  }

  /* Sự kiện ngẫu nhiên của chuyến đi hiện tại: quái, NPC hoặc kỳ duyên địa bảo.
     Quái và NPC cho chọn cách ứng phó; kết quả chỉ được tính khi hết chuyến. */
  const EVENT_LABELS = { monster: 'YÊU THÚ CHẶN ĐƯỜNG', npc: 'GẶP GỠ ĐẠO HỮU', encounter: 'KỲ DUYÊN ĐỊA BẢO' };
  function eventBlock() {
    const s = UI.s(), e = s.exploration?.active;
    if (!e) return '';
    const options = (H.EXPLORE_CHOICES || {})[e.kind], chosen = e.choice >= 0, tamMaMax = H.TAM_MA_MAX || 100;
    const choices = options ? `<div class="event-choices" role="group" aria-label="Cách ứng phó">${options.map((o, i) => `
        <button class="event-choice ${chosen && e.choice === i ? 'active' : ''}" data-act="exploreChoice" data-index="${i}"
          ${chosen ? 'disabled' : ''} aria-pressed="${chosen && e.choice === i}">
          <b>${esc(o.label)}</b><small>${esc(o.desc)}</small>
        </button>`).join('')}</div>` : '';
    const note = e.kind === 'encounter'
      ? 'Cơ duyên sẽ hiển lộ khi chuyến đi kết thúc. Phúc Duyên và Vận Khí càng cao, kỳ ngộ càng quý.'
      : chosen ? 'Đã quyết định. Kết quả được tính khi chuyến đi kết thúc.'
        : e.kind === 'npc' ? 'Không chọn thì chỉ lướt qua, không đổi tâm ma. Tâm ma hiện tại: ' + num(s.tamMa || 0) + '/' + tamMaMax + '.'
          : 'Không chọn thì mặc định giao chiến. Tâm ma hiện tại: ' + num(s.tamMa || 0) + '/' + tamMaMax + '.';
    return `<section class="event-block event-${esc(e.kind)}" aria-label="Sự kiện lịch luyện">
      <span class="eyebrow gold">${EVENT_LABELS[e.kind] || 'SỰ KIỆN'}</span><h3>${esc(e.name)}</h3>
      <p class="event-text">${esc(e.text)}</p>${choices}<p class="info-note">${note}</p></section>`;
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
      return [s.craftQueue.length,s.dungeon?.active?.end,s.dungeon?.run?.id,s.zone, e?.start || 0, e?.end || 0, e?.kind || '', e?.choice ?? -1, s.tamMa || 0, s.exploration?.last?.end || 0,
        s.logs[0] || '', s.logs.length, s.adventurePoints || 0].join('|');
    }
  });

  UI.action('exploreStart', async () => {
    const result = await UI.command('startExploration');
    UI.toast('Đã khởi hành đến ' + H.ZONES[UI.s().zone].name + ' · hẹn trở về sau 10 phút.',
      { type: 'gold', title: 'Lịch luyện' });
    UI.go('combat');
    // Rerender ngay để vô hiệu hóa nút khởi hành và bộ chọn nơi, không chờ tick tiếp theo.
    // Cuộn về đầu để người chơi thấy ngay sự kiện vừa gặp, vì nút Khởi hành nằm cuối danh sách địa điểm.
    const reveal = () => { const body = $('explorationCountdown')?.closest('.win-body'); if (body) body.scrollTop = 0; };
    reveal(); setTimeout(reveal, 0);
  });
  UI.action('exploreChoice', async (el, d) => {
    const e = UI.s().exploration?.active, option = (H.EXPLORE_CHOICES || {})[e?.kind]?.[Number(d.index)];
    await UI.command('exploreChoice', { index: Number(d.index) });
    UI.toast('Đã chọn "' + (option?.label || 'ứng phó') + '". Kết quả sẽ có khi chuyến đi kết thúc.', { type: 'info', title: 'Lịch luyện' });
  });
  UI.action('travel', async (el, d) => {
    if (UI.s().exploration?.active) throw Error('Chuyến lịch luyện chưa kết thúc; chưa thể đổi địa điểm.');
    const zone = Number(d.index);
    await UI.command('travel', { zone });
    UI.toast('Đã chọn ' + H.ZONES[zone].name + ' để lịch luyện.', { type: 'info', title: 'Bí cảnh' });
  });
})(typeof window !== 'undefined' ? window : globalThis);
