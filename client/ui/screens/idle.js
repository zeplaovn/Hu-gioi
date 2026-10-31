/* HƯ GIỚI · MÀN TU LUYỆN */
(function (root) {
  'use strict';
  const H = root.HU_GAME, F = H.F, A = root.HU_ASSETS;
  const UI = root.HU_UI;
  const { $, esc, clamp, num, money, moneyHTML, coinLabel, pct, duration, row, btn, img, codeAttr, bar, card, empty, live } = UI.kit;
  const { QUESTS } = UI.data;

  function pillsBy(effect) {
    const s = UI.s();
    return Object.keys(s.bag).map(H.item)
      .filter(x => x && x.kind === 'PILL' && x.effect === effect && x.tier <= s.realm + 1)
      .sort((a, b) => b.tier - a.tier || b.sub - a.sub);
  }

  function nearGoals() {
    const s = UI.s(), g = UI.g(), need = g.need(), goals = [];
    if (s.completed) goals.push({ icon: '☯', text: 'Đã chứng đạo. Có thể trọng sinh để mở vòng mới.', go: 'meta:prestige', cta: 'Trọng sinh' });
    else if (s.qi >= need) goals.push({ icon: '⚡', text: `Tu vi đã đầy · xác suất ${pct(g.chance())}.`, go: 'tribulation', cta: 'Thiên kiếp' });
    else goals.push({ icon: '☯', text: `Còn khoảng ${duration(F.time_to_goal(need, s.qi, g.rate()))} đến ${g.isPeakStage() ? 'lúc độ kiếp đại cảnh giới' : 'tầng kế (tự động đột phá)'}.`, go: 'character:skills', cta: 'Công pháp' });
    const life = g.lifeInfo();
    if (!s.completed && life.left <= 40) goals.unshift({ icon: '⌛', text: `Thọ nguyên còn ${num(Math.floor(life.left))} năm${Number.isFinite(life.safeSeconds) ? ` · vắng mặt quá ${duration(life.safeSeconds)} sẽ tọa hóa` : ''}.`, go: 'character:bag', cta: 'Hành trang' });
    const claimable = QUESTS.filter(q => !s.claimed.includes(q[0]) && s.progress[q[0]] >= q[2]).length;
    if (claimable) goals.push({ icon: '✦', text: `${claimable} nhiệm vụ đã đủ điều kiện nhận thưởng.`, go: 'world:quests', cta: 'Nhận' });
    const job = s.craftQueue[0];
    if (job) goals.push({ icon: '⚗', text: `Mẻ ${esc(H.item(job.code).name)} xong sau ${live(job.end)}.`, go: 'craft:dan', cta: 'Nghề phụ' });
    const plot = [...s.garden].sort((a, b) => a.end - b.end)[0];
    if (plot) goals.push({ icon: '❀', text: `Linh điền: ${esc(H.item(plot.herb).name)} chín sau ${live(plot.end)}.`, go: 'craft:dien', cta: 'Linh điền' });
    if (!Object.keys(s.learned).length && Object.keys(s.bag).some(k => H.item(k)?.kind === 'BT')) goals.push({ icon: '✧', text: 'Có công pháp trong túi chưa lĩnh ngộ.', go: 'character:bag', cta: 'Hành trang' });
    if (!s.sect.joined) goals.push({ icon: '⌂', text: 'Chọn một tông môn để có thu nhập và ủy thác.', go: 'world:sect', cta: 'Tông môn' });
    return goals.slice(0, 3);
  }

  function qiCard() {
    return card('Tiến độ tu vi', `
      <div class="big-number" id="idleQi">0 / 0</div>
      ${bar(0, 'qi', 'idleQiBar')}
      ${row('Còn lại', '<span id="idleEta">—</span>')}
      ${row('Xác suất đột phá', '<span id="idleChance">—</span>')}
      ${row('Bảo hiểm thất bại', '<span id="idlePity">0/15</span>')}`, { eyebrow: 'ĐẠO CẢNH', cls: 'qi-card' });
  }

  function boostCard() {
    const s = UI.s(), g = UI.g();
    const n = s.tech[1] - 1, one = F.cost(g.upgradeBase(1), 1.15, n), capped = n >= 20;
    const upgrade = `<div class="boost-row"><div><b>Tốc tu +2% · ${n}/20</b><small>Giá một cấp ${moneyHTML(one)}</small></div>
      <div class="action-group">${[1, 10, 'max'].map(k => btn(k === 'max' ? 'Tối đa' : '×' + k, 'upgrade', `data-index="1" data-count="${k}"`, capped || s.stone < one, 'btn-outline')).join('')}</div></div>`;
    const pills = [...pillsBy('TU_VI').slice(0, 2), ...pillsBy('BUFF_TOC').slice(0, 1)].map(x =>
      `<div class="boost-row">${img(x.key, 'mini-img')}<div><b>${esc(x.name)} <em>×${g.count(x.key)}</em></b><small>${x.effect === 'TU_VI' ? 'Cộng thẳng tu vi' : 'Tăng tốc tu có thời hạn'}</small></div>${btn('Dùng', 'consume', codeAttr(x.key), false, 'btn-outline')}</div>`).join('');
    const coins = F.COINS.slice(0, 3).map(([name, value], i) => btn('Hấp thu 1 ' + coinLabel(name), 'absorb', `data-index="${i}"`, s.stone < value || s.qi >= g.need(), 'btn-outline')).join('');
    return card('Tăng tốc tu luyện', upgrade + (pills || '<p class="info-note">Chưa có đan tăng tu vi trong túi. Mua ở Thế giới → Cửa hàng hoặc tự luyện ở Nghề phụ.</p>') + `<div class="action-group coin-row">${coins}</div>`, { eyebrow: 'NÂNG CẤP & ĐAN' });
  }

  function manualsCard() {
    const s = UI.s();
    const slots = Array.from({ length: 3 }, (_, i) => {
      const key = s.activeManuals[i];
      if (!key) return `<button class="manual-slot empty" data-go="character:skills"><span>＋</span><small>Ô trống</small></button>`;
      const x = H.item(key);
      return `<div class="manual-slot">${img(key)}<div><b>${esc(x.name)}</b><small>Thuần thục ${pct(s.learned[key])}</small>${bar(s.learned[key] * 100)}</div></div>`;
    }).join('');
    return card('Công pháp đang vận', `<div class="manual-slots">${slots}</div><p class="info-note">Tối đa ba công pháp cùng vận hành. Thuần thục tăng theo thời gian tu luyện.</p>`,
      { eyebrow: 'TRUYỀN THỪA', aside: '<button class="text-btn" data-go="character:skills">Quản lý ›</button>' });
  }

  function goalsCard() {
    const items = nearGoals().map(x => `<div class="goal"><span class="goal-icon" aria-hidden="true">${x.icon}</span><p>${x.text}</p><button class="text-btn" data-go="${x.go}">${x.cta} ›</button></div>`).join('');
    return card('Mục tiêu gần', items || empty('Không có mục tiêu gần.'), { eyebrow: 'GỢI Ý TIÊN LỘ' });
  }

  function logCard() {
    return card('Nhật ký tu hành', `<div class="journal" id="idleJournal">${UI.s().logs.slice(0, 6).map(v => `<div><time>✦</time>${esc(v)}</div>`).join('')}</div>`, { eyebrow: 'GHI CHÉP' });
  }

  function panel() {
    const s = UI.s(), a = s.dungeon.active, m = s.sect.mission;
    const tasks = card('Hành trình tiên lộ',
      (a ? row(H.DUNGEONS.find(d => d.id === a.id).name, live(a.end)) : '<p>Bí cảnh đã sẵn sàng để thám hiểm.</p>') +
      (m ? row(H.SECT_MISSIONS.find(d => d.id === m.id).name, live(m.end)) : '') +
      row('Kỳ ngộ đã gặp', num(s.encounter.total)) +
      `<div class="action-group"><button class="btn btn-outline" data-go="world:dungeons">Bí cảnh</button><button class="btn btn-outline" data-go="world:encounter">Kỳ ngộ</button><button class="btn btn-outline" data-go="world:sect">Tông môn</button></div>`, { eyebrow: 'TIẾN TRÌNH NỀN' });
    return `<div class="screen-grid idle-grid">${qiCard()}${tasks}${boostCard()}${manualsCard()}${goalsCard()}${logCard()}</div>`;
  }

  function update() {
    const s = UI.s(), g = UI.g();
    const qi = $('idleQi');
    if (!qi) return;
    const need = g.need(), p = clamp(s.qi / need * 100, 0, 100);
    qi.textContent = num(s.qi) + ' / ' + num(need);
    $('idleQiBar').style.width = p + '%';
    $('idleEta').textContent = s.completed ? '—' : p >= 100 ? 'Đã đầy' : duration(F.time_to_goal(need, s.qi, g.rate()));
    $('idleChance').textContent = pct(g.chance());
    $('idlePity').textContent = s.pity + '/15';
    $('idleJournal').innerHTML = s.logs.slice(0, 6).map(v => `<div><time>✦</time>${esc(v)}</div>`).join('');
  }

  const signature = () => {
    const s = UI.s();
    return [s.craftQueue.length, s.garden.length, s.claimed.length, s.sect.joined, s.activeManuals.length, s.qi >= UI.g().need(), s.dungeon.active?.end, s.sect.mission?.end, s.encounter.total].join('|');
  };

  UI.register({
    id: 'idle', label: 'Tu luyện', icon: 'ICON-MENU-001', eyebrow: 'NHẬP ĐỊNH',
    render: panel, panel, update, signature
  });

  UI.action('mode', (el, d) => { UI.command('setAuto', { enabled: d.mode === 'fight' }); return UI.SOFT; });
  UI.action('absorb', (el, d) => {
    const gain = UI.command('absorb', { index: Number(d.index) });
    UI.toast('Hấp thu linh thạch · +' + num(gain) + ' tu vi.', { type: 'loot', title: 'Tu vi' });
    UI.vfx?.effect('qi');
    UI.vfx?.ring('hero', '#70d4e8');
    UI.vfx?.float('+' + num(gain) + ' tu vi', 'hero', 'skill');
  });
  UI.action('upgrade', (el, d) => {
    const n = UI.command('upgrade', { index: Number(d.index), count: d.count === 'max' ? 'max' : Number(d.count) });
    UI.toast('Đã nâng ' + n + ' cấp · tốc tu và chiến lực tăng.', { type: 'success', title: 'Nâng cấp' });
    UI.vfx?.effect('break');
    UI.vfx?.ring();
  });
})(typeof window !== 'undefined' ? window : globalThis);
