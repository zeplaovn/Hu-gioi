/* Các bảng mở rộng dùng chung cửa sổ Thế giới / Nhân vật. */
(function (root) {
  'use strict';
  const H = root.HU_GAME, F = H.F, UI = root.HU_UI;
  const { esc, num, moneyHTML, pct, duration, row, btn, card, empty, live, bar } = UI.kit;
  const element = i => i < 0 ? 'Vô hệ' : H.ELEMENT_NAMES[i];
  const color = i => UI.data.ELEMENTS[i]?.[1] || '#b6c7dc';
  const signed = n => (n >= 0 ? '+' : '') + pct(n);
  const clock = a => `<progress class="adventure-progress" max="100" value="0" data-job-start="${a.start}" data-job-end="${a.end}" aria-label="Tiến độ chuyến đi"></progress>${row('Còn lại', live(a.end))}`;
  const essenceText = a => a.map((n, i) => n ? `${element(i)} ×${num(n)}` : '').filter(Boolean).join(' · ');
  const date = at => new Date(at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  function dungeonResult(r) {
    const d = H.DUNGEONS.find(x => x.id === r.id);
    return card(d.name + ' · ' + r.floors + '/' + d.floors + ' tầng',
      `<p class="${r.success ? 'gold' : 'muted'}">${r.success ? 'Đã hạ ' + d.boss : 'Đã rút lui dưỡng thương.'}${r.first ? ' · Thông quan đầu tiên!' : ''}</p>` +
      row('Linh thạch', moneyHTML(r.stone)) + row('Tu vi thực nhận', '+' + num(r.exp)) +
      (r.essence.some(Boolean) ? row('Tinh hoa', essenceText(r.essence)) : '') +
      '<button class="text-btn" data-go="character:roots">Tôi luyện linh căn ›</button>', { eyebrow: 'KẾT QUẢ GẦN NHẤT', cls: 'adventure-result' });
  }
  /* Thanh chỉ số có nhãn chữ và vai trò meter để đọc được bằng trình đọc màn hình. */
  const meter = (label, value, max, cls) => {
    const v = Math.max(0, Math.min(max, value));
    return `<div class="run-meter"><span>${label}</span><div class="meter-bar ${cls}" role="meter" aria-label="${label}" aria-valuemin="0" aria-valuemax="${Math.round(max)}" aria-valuenow="${Math.round(v)}"><i style="width:${max > 0 ? v / max * 100 : 0}%"></i></div><b>${num(v)} / ${num(max)}</b></div>`;
  };
  function runPanel() {
    const s = UI.s(), g = UI.g(), run = s.dungeon.run, R = H.DUNGEON_RUN;
    if (!run) return '';
    const d = H.DUNGEONS.find(x => x.id === run.id), enemy = g.runEnemy(d, run.floor), st = g.stats();
    const phase = enemy.id ? H.DESIGN.phase(enemy.id, run.enemyHp / run.enemyMax) : null;
    const heavy = run.intent === 'heavy', mpCost = g.maxMp() * R.healMp;
    const pips = Array.from({ length: d.floors }, (_, i) => `<i class="${i < run.cleared ? 'done' : i + 1 === run.floor ? 'now' : ''}" aria-hidden="true"></i>`).join('');
    const act = (move, label, hint, off, style) => btn(`${label}<small>${hint}</small>`, 'dungeonAct', `data-move="${move}" aria-keyshortcuts="${['attack', 'power', 'guard', 'heal'].indexOf(move) + 1}"`, off, style);
    const body = `<div class="run-floors" role="img" aria-label="Đã vượt ${run.cleared}/${d.floors} tầng">${pips}</div>
      <div class="run-enemy ${enemy.boss ? 'boss' : ''}"><b>${esc(enemy.name)}</b>${enemy.boss ? '<span class="pill">Thủ lĩnh</span>' : ''}</div>
      ${enemy.boss ? '<p class="hu-dungeon-lore">' + esc(H.STORY.DUNGEONS[d.id]?.boss || '') + '</p>' : ''}
      ${meter('Địch', run.enemyHp, run.enemyMax, 'hp')}
      <p class="run-intent ${heavy ? 'heavy' : ''}" role="status">${heavy ? '⚠ Địch dồn sức tung đòn nặng — thủ thế sẽ đỡ gần hết.' : 'Địch tung đòn thường.'}${phase ? ' <small>' + esc(phase['kỹ năng giai đoạn']) + '</small>' : ''}</p>
      ${meter('Sinh lực', s.hp, st.HP, 'hp')}${meter('Thể lực', run.sta, run.staMax, 'sta')}${meter('Linh lực', s.mp, g.maxMp(), 'mp')}
      <div class="run-actions action-group">
        ${act('attack', 'Xuất chiêu', '−' + R.attack + ' thể lực', run.sta < R.attack, 'btn-gold')}
        ${act('power', 'Trọng kích ×2,2', '−' + R.power + ' thể lực', run.sta < R.power, 'btn-gold')}
        ${act('guard', 'Thủ thế', '+' + R.guardGain + ' thể lực · đỡ đòn', false, 'btn-outline')}
        ${act('heal', 'Hồi phục', run.healCd > 0 ? 'còn ' + run.healCd + ' lượt' : Math.round(R.healMp * 100) + '% linh lực', run.healCd > 0 || s.mp < mpCost, 'btn-outline')}
      </div>
      <p class="info-note">Phím tắt 1–4. Mỗi lượt thể lực tự hồi ${R.passiveGain}, qua tầng hồi thêm ${R.floorGain}. Đang đánh bí cảnh thì sinh lực và linh lực không tự hồi.</p>
      <ol class="run-log" aria-live="polite" aria-label="Diễn biến lượt đánh">${run.log.map(v => `<li>${esc(v)}</li>`).join('')}</ol>
      <div class="action-group">${btn('Rút lui giữ thưởng đã vượt', 'dungeonRetreat', '', false, 'btn-outline')}</div>`;
    return card('Chiến đấu · ' + d.name + ' · tầng ' + run.floor + '/' + d.floors, body, { eyebrow: 'TỰ TAY CHIẾN ĐẤU · LƯỢT ' + (run.turn + 1), cls: 'run-panel' });
  }
  function dungeons() {
    const s = UI.s(), g = UI.g(), a = s.dungeon.active, active = H.DUNGEONS.find(d => d.id === a?.id), run = s.dungeon.run;
    const busy = !!a || !!run || !!s.sect.mission, hpOk = s.hp >= g.stats().HP * .5;
    return `<p class="screen-lead">Vượt từng tầng, hạ thủ lĩnh để thu Tinh hoa. Có thể để chuyến đi tự chạy (hoàn tất cả khi đóng game, chiến lực chốt lúc khởi hành) hoặc tự tay chiến đấu từng lượt: quản lý thể lực, thủ thế đúng lúc, thưởng thêm ${Math.round((H.DUNGEON_RUN.bonus - 1) * 100)}% và 1 Tinh hoa khi thông quan.</p>
      ${runPanel()}
      ${active ? card('Đang thám hiểm · ' + active.name, clock(a) + `<p>Thủ lĩnh tầng ${active.floors}: ${active.boss}</p>` + btn('Rút lui', 'dungeonAbort', '', false, 'btn-outline'), { eyebrow: 'CHUYẾN ĐI' }) : ''}
      ${s.dungeon.last ? dungeonResult(s.dungeon.last) : ''}
      ${s.sect.mission ? '<p class="info-note">Đang nhận nhiệm vụ tông môn. Hoàn tất hoặc hủy nhiệm vụ để vào bí cảnh.</p>' : !hpOk && !run ? '<p class="info-note">Cần 50% sinh lực để khởi hành. Bạn đang tự hồi phục.</p>' : ''}
      <div class="adventure-grid">${H.DUNGEONS.map(d => {
        const locked = s.realm < d.realm, r = s.dungeon.records[d.id], aff = g.affinity(d.element), off = locked || busy || !hpOk;
        return card(d.name, `<p>${esc(d.desc)}</p><p class="hu-dungeon-lore">${esc(H.STORY.DUNGEONS[d.id]?.intro || '')}</p><div class="adventure-tags"><span style="color:${color(d.element)}">${element(d.element)}</span><span>${d.floors} tầng · ${duration(d.seconds)}</span><span>${F.REALMS[d.realm]}</span></div>` +
          row('Thủ lĩnh', d.boss) + row('Tương khắc', signed(aff) + ' sát thương') +
          (locked ? '' : row('Dự kiến', g.estimateDungeon(d.id) + '/' + d.floors + ' tầng')) +
          row('Kỷ lục', (r?.best || 0) + '/' + d.floors + ' · ' + (r?.clears || 0) + ' lần thông quan') +
          `<p class="info-note">${r?.clears ? 'Thủ lĩnh cho 1–' + (d.floors >= 8 ? 3 : 2) + ' Tinh hoa.' : 'Thông quan đầu: thưởng ×2 và thêm 3 Tinh hoa.'}</p>` +
          `<div class="action-group">${btn(locked ? 'Chưa mở' : a?.id === d.id ? 'Đang thám hiểm' : 'Khởi hành tự động', 'dungeonStart', `data-id="${d.id}"`, off, 'btn-outline')}${locked ? '' : btn(run?.id === d.id ? 'Đang chiến đấu' : 'Thân chinh giao chiến', 'dungeonEnter', `data-id="${d.id}"`, off)}</div>`, { cls: locked ? 'adventure-locked' : '' });
      }).join('')}</div>`;
  }

  function encounters() {
    const e = UI.s().encounter;
    return `<p class="screen-lead">Cơ duyên sẽ hiển lộ khi một chuyến Lịch luyện gặp kỳ ngộ và kết thúc sau mười phút. Phúc Duyên giúp hành trình thêm thuận lợi, Vận Khí giúp tránh họa.</p>
      ${card('Dấu chân cơ duyên', row('Đã khám phá', Object.keys(e.journal).length + '/' + H.ENCOUNTERS.length) + row('Tổng kỳ ngộ', num(e.total)) + '<p class="info-note">Phần thưởng tự nhận và ghi vào Nhật ký tu tiên. Tu vi dừng ở ngưỡng đột phá.</p>')}
      ${card('Kỳ ngộ gần đây', e.recent.map(v => {
        const d = H.ENCOUNTERS.find(x => x.id === v.id), rarity = H.ENCOUNTER_RARITIES[d.rarity];
        return `<article class="encounter-entry"><header><b style="color:${rarity.color}">${esc(d.name)}</b><small>${date(v.at)} · ${rarity.name}</small></header><p>${esc(v.text)}</p><p class="hu-dungeon-lore">${esc(H.STORY.ENCOUNTERS[v.id] || '')}</p></article>`;
      }).join('') || empty('Hãy bước vào Lịch luyện để tìm kiếm cơ duyên.'))}
      <details class="adventure-details"><summary>Sổ khám phá · ${Object.keys(e.journal).length}/${H.ENCOUNTERS.length}</summary><div class="adventure-grid">${H.ENCOUNTERS.map(d => {
        const seen = e.journal[d.id], rarity = H.ENCOUNTER_RARITIES[d.rarity];
        return `<article class="discovery ${seen ? '' : 'undiscovered'}"><small style="color:${rarity.color}">${rarity.name}</small><h3>${seen ? d.name : 'Cơ duyên chưa biết'}</h3><p>${seen ? esc(d.desc) : 'Chờ thiên địa hé lộ.'}</p>${seen ? '<p class="hu-dungeon-lore">' + esc(H.STORY.ENCOUNTERS[d.id] || '') + '</p>' : ''}${seen ? '<small>Đã gặp ' + num(seen.count) + ' lần · ' + date(seen.lastAt) + '</small>' : ''}</article>`;
      }).join('')}</div></details>`;
  }

  function missionBoard() {
    const s = UI.s(), g = UI.g(), active = s.sect.mission, def = H.SECT_MISSIONS.find(x => x.id === active?.id), featured = g.featuredMission();
    const open = g.sectMissions(), all = g.sectMissions(true);
    const ready = active && active.end <= Date.now();
    const task = def ? card(def.name, clock(active) + row('Thưởng cống hiến', '+' + Math.round(def.contribution * (active.featured ? 1.5 : 1))) +
      row('Thành công', pct(active.chance)) + (active.featured ? '<p class="gold">★ Nổi bật · thưởng ×1,5</p>' : '') +
      `<div class="action-group">${btn('Nhận thưởng', 'sectMissionClaim', '', !ready)}${btn('Hủy nhiệm vụ', 'sectMissionAbort', '', false, 'btn-outline')}</div>`, { eyebrow: ready ? 'ĐÃ HOÀN TẤT' : 'ĐANG THỰC HIỆN' }) : '';
    return task + card('Ủy thác tông môn', `<div class="action-group">${btn(s.sect.repeat ? 'Tự lặp: Bật' : 'Tự lặp: Tắt', 'sectRepeat', `aria-pressed="${s.sect.repeat}"`, false, 'btn-outline')}</div>
      <p class="info-note">Tự lặp: tự nhận thưởng và làm lại khi đang chơi. Khi rời game chỉ hoàn tất một nhiệm vụ, không nhận chuyến mới. Thất bại sẽ tắt tự lặp.</p>
      ${s.dungeon.active ? '<p class="info-note">Đang trong bí cảnh; chờ trở về để nhận nhiệm vụ.</p>' : ''}
      ${[1, 2, 3, 4, 5].map(tier => {
        const list = all.filter(m => m.tier === tier);
        return `<details class="adventure-details" ${tier <= g.sectRank().tier ? 'open' : ''}><summary>Bậc ${tier} · ${list.filter(m => open.includes(m)).length}/${list.length} đã mở</summary>` + list.map(m => {
          const locked = !open.includes(m), bonus = featured?.id === m.id;
          return `<article class="mission-row ${locked ? 'adventure-locked' : ''}"><div><b>${m.name}${bonus ? ' <span class="gold">★ Nổi bật</span>' : ''}</b><p>${duration(m.seconds)} · ${pct(g.missionChance(m))} thành công · +${Math.round(m.contribution * (bonus ? 1.5 : 1))} cống hiến</p>
            <small>${locked ? 'Cần bậc nhiệm vụ ' + m.tier + ' · ' + F.REALMS[m.minRealm] : m.desc}${bonus ? ' · thưởng ×1,5' : ''}</small></div>${btn(locked ? 'Chưa mở' : 'Nhận', 'sectMissionStart', `data-id="${m.id}"`, locked || !!active || !!s.dungeon.active || s.hp < g.stats().HP * .4, 'btn-outline')}</article>`;
        }).join('') + '</details>';
      }).join('')}`);
  }
  function sectShop() {
    const s = UI.s(), g = UI.g();
    return `<p class="info-note">Vật phẩm gần bậc hiện tại; giá cống hiến tăng theo cảnh giới. Tiêu cống hiến không giảm chức vị.</p><div class="adventure-grid">${H.SECT_SHOP.filter(x => !x.sect || x.sect === s.sect.id).map(d => {
      const o = g.sectShopOffer(d.id);
      const buttons = d.id === 'essence' ? g.activeElements().map(i => btn(element(i), 'sectBuy', `data-id="essence" data-element="${i}"`, o.locked || s.sect.contribution < o.cost, 'btn-outline')).join('') : btn('Đổi · ' + num(o.cost), 'sectBuy', `data-id="${d.id}"`, o.locked || s.sect.contribution < o.cost);
      return card(o.item?.name || d.name, row('Số lượng', '×' + d.count) + row('Cống hiến', num(o.cost)) + `<p class="info-note">${H.SECT_RANKS[d.rank].name}${o.item ? ' · ' + F.REALMS[o.item.tier] : ''}</p><div class="action-group">${buttons}</div>`);
    }).join('')}</div>`;
  }
  function sect() {
    const s = UI.s(), g = UI.g(), d = g.sectDefinition();
    if (!d) return `<p class="screen-lead">Chọn một tông môn để nhận nguồn linh thạch định kỳ, ủy thác và quyền đổi bảo vật.</p><div class="adventure-grid">${H.SECTS.map(x => card(x.name, `<p>${x.desc}</p><p class="gold">${x.bonus}</p>` + btn('Gia nhập', 'joinSect', `data-id="${x.id}"`))).join('')}</div>`;
    const rank = g.sectRank(), sub = UI.view.sectPanel || 'missions';
    const header = card(d.name, `<p>${d.desc} <b class="gold">${d.bonus}</b></p>` + row('Chức vị', rank.name) + row('Cống hiến khả dụng', num(s.sect.contribution)) + row('Tổng đã kiếm', num(s.sect.earned)) +
      row('Linh thạch tự tích lũy', moneyHTML(g.sectIncome()) + '/giây') +
      (rank.next ? bar((s.sect.earned - rank.at) / (rank.next.at - rank.at) * 100) + `<p class="info-note">Còn ${num(rank.next.at - s.sect.earned)} cống hiến đã kiếm để lên ${rank.next.name}.</p>` : '<p class="gold">Đã đạt chức vị tối cao.</p>') +
      `<div class="action-group">${btn(s.sect.blessing ? 'Tắt chúc phúc' : 'Chúc phúc +10% tốc độ hấp thụ linh khí', 'blessing', '', false, 'btn-outline')}${btn('Cống hiến · ' + moneyHTML(F.price_ha(s.realm)), 'donate', '', s.stone < F.price_ha(s.realm), 'btn-outline')}</div>`);
    const panels = { missions: missionBoard, shop: sectShop, ranks: () => card('Lộ trình chức vị', H.SECT_RANKS.map(r => row(r.name, num(r.at) + ' tổng cống hiến · bậc ' + r.tier)).join('') + '<p class="info-note">Cống hiến đã kiếm tính cả nhiệm vụ và quyên góp. Rời tông môn sẽ đặt lại chức vị, cống hiến và chúc phúc.</p>' + btn('Rời tông môn', 'sectLeave', '', !!s.sect.mission, 'btn-outline')) };
    return header + `<div class="action-group adventure-nav" role="group" aria-label="Bảng tông môn">${[['missions', 'Nhiệm vụ'], ['shop', 'Kho tông môn'], ['ranks', 'Chức vị']].map(([id, label]) => btn(label, 'sectPanel', `data-panel="${id}" aria-pressed="${sub === id}"`, false, sub === id ? 'btn-gold' : 'btn-outline')).join('')}</div>` +
      (s.sect.last && sub === 'missions' ? `<p class="adventure-result info-note">${esc(s.sect.last.text)}</p>` : '') + panels[sub]();
  }

  /* Tổng quan linh căn, thế mạnh và cơ hội hóa Hỗn Độn. */
  function rootOverview() {
    const s = UI.s(), g = UI.g(), type = s.rootType, info = H.ROOT_TYPES[type] || { group: 'ngu_hanh', desc: '' };
    const group = H.ROOT_GROUPS.find(x => x.id === info.group);
    const combat = F.LINH_CAN_COMBAT[type] || 1, trib = F.LINH_CAN_TRIB[type] || 1;
    let extra = '';
    if (type === 'Dị') {
      const di = H.DI_LINH_CAN[s.rootSub];
      if (di) extra = `<div class="root-di"><b>${esc(di.name)} · ${esc(di.role)}</b><p>${esc(di.desc)}</p><p class="root-di-fx">Thế mạnh: ${esc(UI.rootEffectText(di.effects))}</p></div>`;
    } else if (type === 'Hỗn Độn') {
      extra = `<div class="root-di"><b>Giữ các hệ thành phần ban đầu</b><p>Không bị khắc; khắc ngũ hành và dị linh căn +10%.</p></div>`;
    } else if (g.chaosChance() > 0) {
      extra = `<div class="root-chaos"><b>Con đường Hỗn Độn</b>` + row('Cơ hội hóa Hỗn Độn (lôi kiếp kế tiếp)', pct(g.chaosChance())) +
        row('Đã vượt lôi kiếp mà chưa hóa', num(s.chaosTries || 0) + ' lần') +
        '<p class="info-note">Linh căn ngũ hành có cơ hội hóa sau khi vượt lôi kiếp đại cảnh giới. Cơ hội ban đầu là 1%; Vận Khí và kiếp vận tích lũy tăng cơ hội.</p></div>';
    }
    const body = `<p>${esc(info.desc)}</p>${row('Tốc độ hấp thụ linh khí', '×' + F.LINH_CAN_RATE[type])}${combat > 1 ? row('Chiến lực', '×' + combat) : ''}${row('Chịu lôi kiếp', '×' + trib)}${extra}`;
    const rank = (types, cur) => types.map(n => `<span class="root-chip ${cur === n ? 'is-current' : ''}">${esc(n)}</span>`).join('<span class="root-sep">›</span>');
    const classes = `<div class="root-class"><b>Ngũ hành cơ bản</b><div>${rank(['Ngụy', 'Tứ hành', 'Tam hành', 'Song', 'Thiên'], type)}</div><p class="info-note">Theo số hệ đạt 50 điểm; Thiên là một hệ thuần, không biến thể.</p></div>` +
      `<div class="root-class"><b>Dị linh căn</b><div>${H.DI_KEYS.map(k => `<span class="root-chip ${type === 'Dị' && s.rootSub === k ? 'is-current' : ''}">${esc(H.DI_LINH_CAN[k].name)}</span>`).join('<span class="root-sep">·</span>')}</div><p class="info-note">Dị khắc hệ gốc và không bị hệ gốc khắc.</p></div>` +
      `<div class="root-class"><b>Chí tôn</b><div>${rank(type === 'Âm Dương' ? ['Âm Dương', 'Hỗn Độn'] : ['Hỗn Độn'], type)}</div><p class="info-note">Hỗn Độn không gieo bẩm sinh; truyền thừa Âm Dương từ kiếp cũ vẫn được giữ.</p></div>`;
    return card(H.rootLabel(type, s.rootSub), body, { eyebrow: (group ? group.name : 'Linh căn').toUpperCase() }) + card('Phân loại linh căn', classes, { eyebrow: 'BA NHÓM' });
  }

  function roots() {
    const s = UI.s(), g = UI.g(), c = s.rootCraft, els = g.activeElements(), scale = 1 / Math.sqrt(Math.max(1, els.length));
    const labels = { attack: 'Công kích', hp: 'Sinh lực', guard: 'Phòng thủ', rate: 'Tốc độ hấp thụ linh khí', crit: 'Bạo kích', dodge: 'Né tránh', regen: 'Hồi sinh lực/giây' };
    const effectText = (i, level) => Object.entries(H.TEMPER_EFFECTS[i]).map(([k, v]) => labels[k] + ' +' + (v * level * scale * 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + (['crit', 'dodge', 'regen'].includes(k) ? ' điểm %' : '%')).join(' · ');
    return `<div class="screen-grid">${rootOverview()}</div>
      <h3 class="root-section-title">Ngũ hành · tôi luyện từng hệ <small>(tách riêng khỏi Dị linh căn)</small></h3>
      ${card('Tôi luyện linh căn', '<p>Dùng Tinh hoa cùng hệ để tôi luyện đến cấp 10. Mỗi cấp tăng chỉ số và ưu thế nguyên tố trong bí cảnh.</p><p class="info-note">Hệ từ 50 điểm mới tôi luyện được. Hiệu quả chia √số hệ để cân bằng linh căn nhiều hệ. Cấp và Tinh hoa thuộc kiếp hiện tại.</p><button class="text-btn" data-go="world:dungeons">Tìm Tinh hoa trong bí cảnh ›</button>', { eyebrow: 'NGŨ HÀNH' })}
      <div class="adventure-grid">${H.ELEMENT_NAMES.map((name, i) => {
        const on = els.includes(i), level = c.levels[i], cost = g.temperCost(i), max = level >= H.TEMPER_MAX;
        return card(`<span style="color:${color(i)}">${name}</span> · ${s.roots[i]} điểm`, row('Tôi luyện', level + '/' + H.TEMPER_MAX) + bar(level * 10) + row('Tinh hoa', num(c.essence[i])) +
          (on ? `<p>${effectText(i, level)}</p>${!max ? '<p class="info-note">Tầng tôi luyện kế tiếp: ' + effectText(i, level + 1) + '</p>' : ''}` : '<p class="info-note">Hệ này chưa đạt 50 điểm.</p>') +
          btn(!on ? 'Chưa có linh căn' : max ? 'Đã tối đa' : 'Tôi luyện · ' + cost + ' Tinh hoa', 'temperRoot', `data-index="${i}"`, !on || max || c.essence[i] < cost), { cls: on ? '' : 'adventure-locked' });
      }).join('')}</div>
      <details class="adventure-details"><summary>Ngũ hành & hệ số linh căn</summary>${card('Tương khắc', '<p>Kim → Mộc → Thổ → Thủy → Hỏa → Kim.</p><p>Khắc hệ +20%; bị khắc −20%. Dị khắc hệ gốc, Hỗn Độn khắc ngũ hành +10%.</p>')}</details>`;
  }
  function update() {
    const now = Date.now();
    document.querySelectorAll('[data-job-end]').forEach(el => {
      const start = Number(el.dataset.jobStart), end = Number(el.dataset.jobEnd);
      el.value = Math.max(0, Math.min(100, (now - start) / Math.max(1, end - start) * 100));
    });
    document.querySelectorAll('[data-act="sectMissionClaim"]').forEach(el => { el.disabled = !UI.s().sect.mission || UI.s().sect.mission.end > now; });
    document.querySelectorAll('[data-act="encounter"]').forEach(el => { el.disabled = UI.s().encounter.usedAt + 90000 > now; });
  }
  UI.adventure = { dungeons, encounters, sect, roots, update, runPanel };
  UI.action('dungeonStart', async (el, d) => { await UI.command('startDungeon', { id: d.id }); UI.toast('Đã khởi hành. Kết quả sẽ tự ghi vào nhật ký.', { type: 'gold', title: 'Bí cảnh' }); });
  UI.action('dungeonEnter', async (el, d) => {
    await UI.command('enterDungeon', { id: d.id });
    UI.toast('Vào bí cảnh. Thể lực cạn thì thủ thế để hồi sức; thấy cảnh báo đòn nặng nên thủ thế.', { type: 'gold', title: 'Bí cảnh' });
  });
  const RUN_KEYS = ['attack', 'power', 'guard', 'heal'];
  UI.action('dungeonAct', async (el, d) => {
    const r = await UI.command('dungeonAct', { action: d.move });
    if (r.ended) {
      UI.toast(r.ended.text, { type: r.ended.success ? 'loot' : r.ended.why === 'defeat' ? 'danger' : 'info', title: r.ended.success ? 'Thông quan bí cảnh' : 'Kết thúc chuyến bí cảnh' });
      if (r.ended.success) UI.vfx?.stage({ kind: 'chien_dau', variant: 'phi_thang', fps: 14, size: 'clamp(110px,18vw,190px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
    } else if (r.floorCleared) UI.toast('Qua tầng ' + r.floorCleared + '. Thể lực hồi thêm ' + H.DUNGEON_RUN.floorGain + '.', { type: 'success', title: 'Bí cảnh' });
  });
  UI.action('dungeonRetreat', async () => {
    const run = UI.s().dungeon.run;
    UI.modal('Rút lui khỏi bí cảnh?', '<p>Giữ phần thưởng của ' + (run?.cleared || 0) + ' tầng đã vượt; các tầng còn lại bỏ dở.</p>', () => {
      const r = await UI.command('dungeonAct', { action: 'retreat' });
      UI.toast(r.ended.text, { type: 'info', title: 'Rút lui' });
    }, 'Rút lui');
    return UI.KEEP;
  });
  // Phím 1–4 chọn hành động khi bảng chiến đấu đang mở và không đang gõ chữ.
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.altKey || e.metaKey || !RUN_KEYS[Number(e.key) - 1]) return;
    if (e.target.closest?.('input, textarea, select, [contenteditable]') || !document.querySelector('.run-panel')) return;
    const b = document.querySelector('.run-panel [data-act="dungeonAct"][data-move="' + RUN_KEYS[Number(e.key) - 1] + '"]');
    if (b && !b.disabled) { e.preventDefault(); b.click(); }
  });
  UI.action('dungeonAbort', async () => { UI.modal('Rút khỏi bí cảnh?', '<p>Chuyến đi hiện tại sẽ không có phần thưởng.</p>', async () => await UI.command('abortDungeon'), 'Rút lui'); return UI.KEEP; });
  UI.action('temperRoot', async (el, d) => {
    const i = Number(d.index), level = await UI.command('temperRoot', { index: i });
    UI.toast('Linh căn ' + element(i) + ' đạt cấp ' + level + '.', { type: 'gold', title: 'Tôi luyện' });
    UI.vfx?.ring('hero', color(i)); UI.vfx?.effect('qi');
  });
  UI.action('sectPanel', async (el, d) => { if (['missions', 'shop', 'ranks'].includes(d.panel)) UI.view.sectPanel = d.panel; });
  UI.action('sectRepeat', async async () => { await UI.command('setSectRepeat', { enabled: !UI.s().sect.repeat }); });
  UI.action('sectMissionAbort', async () => { UI.modal('Hủy nhiệm vụ?', '<p>Nhiệm vụ hiện tại không có phần thưởng; tự lặp sẽ tắt.</p>', async () => await UI.command('abortSectMission'), 'Hủy nhiệm vụ'); return UI.KEEP; });
  UI.action('sectLeave', async () => { UI.modal('Rời tông môn?', '<p>Chức vị, cống hiến và chúc phúc sẽ đặt lại. Sau đó có thể chọn tông môn mới.</p>', async async () => { await UI.command('leaveSect'); UI.view.sectPanel = 'missions'; }, 'Rời tông môn'); return UI.KEEP; });
  UI.action('sectBuy', async (el, d) => { const r = await UI.command('buySect', { id: d.id, ...(d.element === undefined ? {} : { element: Number(d.element) }) }); UI.toast('Nhận ' + r.name + ' ×' + r.count + '.', { type: 'loot', title: 'Kho tông môn' }); });
})(typeof window !== 'undefined' ? window : globalThis);
