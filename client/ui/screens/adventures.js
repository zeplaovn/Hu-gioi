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
  function dungeons() {
    const s = UI.s(), g = UI.g(), a = s.dungeon.active, active = H.DUNGEONS.find(d => d.id === a?.id);
    const busy = !!a || !!s.sect.mission, hpOk = s.hp >= g.stats().HP * .5;
    return `<p class="screen-lead">Vượt từng tầng, hạ thủ lĩnh để thu Tinh hoa. Chuyến đi hoàn tất tự động cả khi đóng game; chiến lực được chốt lúc khởi hành.</p>
      ${active ? card('Đang thám hiểm · ' + active.name, clock(a) + `<p>Thủ lĩnh tầng ${active.floors}: ${active.boss}</p>` + btn('Rút lui', 'dungeonAbort', '', false, 'btn-outline'), { eyebrow: 'CHUYẾN ĐI' }) : ''}
      ${s.dungeon.last ? dungeonResult(s.dungeon.last) : ''}
      ${s.sect.mission ? '<p class="info-note">Đang nhận nhiệm vụ tông môn. Hoàn tất hoặc hủy nhiệm vụ để vào bí cảnh.</p>' : !hpOk ? '<p class="info-note">Cần 50% sinh lực để khởi hành. Bạn đang tự hồi phục.</p>' : ''}
      <div class="adventure-grid">${H.DUNGEONS.map(d => {
        const locked = s.realm < d.realm, r = s.dungeon.records[d.id], aff = g.affinity(d.element);
        return card(d.name, `<p>${d.desc}</p><div class="adventure-tags"><span style="color:${color(d.element)}">${element(d.element)}</span><span>${d.floors} tầng · ${duration(d.seconds)}</span><span>${F.REALMS[d.realm]}</span></div>` +
          row('Thủ lĩnh', d.boss) + row('Tương khắc', signed(aff) + ' sát thương') +
          (locked ? '' : row('Dự kiến', g.estimateDungeon(d.id) + '/' + d.floors + ' tầng')) +
          row('Kỷ lục', (r?.best || 0) + '/' + d.floors + ' · ' + (r?.clears || 0) + ' lần thông quan') +
          `<p class="info-note">${r?.clears ? 'Thủ lĩnh cho 1–' + (d.floors >= 8 ? 3 : 2) + ' Tinh hoa.' : 'Thông quan đầu: thưởng ×2 và thêm 3 Tinh hoa.'}</p>` +
          btn(locked ? 'Chưa mở' : a?.id === d.id ? 'Đang thám hiểm' : 'Khởi hành', 'dungeonStart', `data-id="${d.id}"`, locked || busy || !hpOk), { cls: locked ? 'adventure-locked' : '' });
      }).join('')}</div>`;
  }

  function encounters() {
    const s = UI.s(), e = s.encounter, end = e.usedAt + 90000;
    return `<p class="screen-lead">Mỗi ${duration(H.ENCOUNTER_INTERVAL)} bế quan hiệu dụng có ${pct(UI.g().encounterChance())} cơ hội gặp kỳ ngộ. Phúc Duyên tăng cơ hội hiếm; Vận Khí giúp tránh họa. Offline áp dụng giới hạn và hiệu suất bế quan.</p>
      ${card('Dấu chân cơ duyên', row('Đã khám phá', Object.keys(e.journal).length + '/' + H.ENCOUNTERS.length) + row('Tổng kỳ ngộ', num(e.total)) + '<p class="info-note">Phần thưởng tự nhận và ghi vào Nhật ký thông báo. Tu vi dừng ở ngưỡng đột phá.</p>')}
      ${card('Kỳ ngộ gần đây', e.recent.map(v => {
        const d = H.ENCOUNTERS.find(x => x.id === v.id), rarity = H.ENCOUNTER_RARITIES[d.rarity];
        return `<article class="encounter-entry"><header><b style="color:${rarity.color}">${esc(d.name)}</b><small>${date(v.at)} · ${rarity.name}</small></header><p>${esc(v.text)}</p></article>`;
      }).join('') || empty('Tiếp tục tu luyện, cơ duyên sẽ tự tìm đến.'))}
      <details class="adventure-details"><summary>Sổ khám phá · ${Object.keys(e.journal).length}/${H.ENCOUNTERS.length}</summary><div class="adventure-grid">${H.ENCOUNTERS.map(d => {
        const seen = e.journal[d.id], rarity = H.ENCOUNTER_RARITIES[d.rarity];
        return `<article class="discovery ${seen ? '' : 'undiscovered'}"><small style="color:${rarity.color}">${rarity.name}</small><h3>${seen ? d.name : 'Cơ duyên chưa biết'}</h3><p>${seen ? esc(d.desc) : 'Chờ thiên địa hé lộ.'}</p>${seen ? '<small>Đã gặp ' + num(seen.count) + ' lần · ' + date(seen.lastAt) + '</small>' : ''}</article>`;
      }).join('')}</div></details>
      ${card(e.index % 2 ? 'Tần Trường Ca' : 'Mộc Uyển Nhi', '<p class="quote">“Đạo hữu, hôm nay muốn tìm điều gì?”</p><div class="action-group">' + ['Tìm linh thảo', 'Tìm linh tài', 'Luận đạo'].map((n, i) => btn(n, 'encounter', `data-index="${i}"`, Date.now() < end)).join('') + '</div><p>' + live(end) + '</p><p class="info-note">Cơ duyên chủ động: một lựa chọn mỗi 90 giây.</p>', { eyebrow: 'GẶP GỠ' })}`;
  }

  function missionBoard() {
    const s = UI.s(), g = UI.g(), active = s.sect.mission, def = H.SECT_MISSIONS.find(x => x.id === active?.id), featured = g.featuredMission();
    const open = g.sectMissions(), all = g.sectMissions(true);
    const ready = active && active.end <= Date.now();
    const task = def ? card(def.name, clock(active) + row('Thưởng cống hiến', '+' + Math.round(def.contribution * (active.featured ? 1.5 : 1))) +
      row('Thành công', pct(active.chance)) + (active.featured ? '<p class="gold">★ Nổi bật · thưởng ×1,5</p>' : '') +
      `<div class="action-group">${btn('Nhận thưởng', 'sectMissionClaim', '', !ready)}${btn('Hủy nhiệm vụ', 'sectMissionAbort', '', false, 'btn-outline')}</div>`, { eyebrow: ready ? 'ĐÃ HOÀN TẤT' : 'ĐANG THỰC HIỆN' }) : '';
    return task + card('Ủy thác tông môn', `<div class="action-group">${btn(s.sect.repeat ? 'Tự lặp: Bật' : 'Tự lặp: Tắt', 'sectRepeat', `aria-pressed="${s.sect.repeat}"`, false, 'btn-outline')}</div>
      <p class="info-note">Tự lặp: tự nhận thưởng và làm lại khi đang chơi. Offline chỉ hoàn tất một nhiệm vụ, không nhận chuyến mới. Thất bại sẽ tắt tự lặp.</p>
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
    if (!d) return `<p class="screen-lead">Chọn một tông môn để nhận thu nhập thụ động, ủy thác và quyền đổi bảo vật.</p><div class="adventure-grid">${H.SECTS.map(x => card(x.name, `<p>${x.desc}</p><p class="gold">${x.bonus}</p>` + btn('Gia nhập', 'joinSect', `data-id="${x.id}"`))).join('')}</div>`;
    const rank = g.sectRank(), sub = UI.view.sectPanel || 'missions';
    const header = card(d.name, `<p>${d.desc} <b class="gold">${d.bonus}</b></p>` + row('Chức vị', rank.name) + row('Cống hiến khả dụng', num(s.sect.contribution)) + row('Tổng đã kiếm', num(s.sect.earned)) +
      row('Thu nhập thụ động', moneyHTML(g.sectIncome()) + '/giây') +
      (rank.next ? bar((s.sect.earned - rank.at) / (rank.next.at - rank.at) * 100) + `<p class="info-note">Còn ${num(rank.next.at - s.sect.earned)} cống hiến đã kiếm để lên ${rank.next.name}.</p>` : '<p class="gold">Đã đạt chức vị tối cao.</p>') +
      `<div class="action-group">${btn(s.sect.blessing ? 'Tắt chúc phúc' : 'Chúc phúc +10% tốc tu', 'blessing', '', false, 'btn-outline')}${btn('Cống hiến · ' + moneyHTML(F.price_ha(s.realm)), 'donate', '', s.stone < F.price_ha(s.realm), 'btn-outline')}</div>`);
    const panels = { missions: missionBoard, shop: sectShop, ranks: () => card('Lộ trình chức vị', H.SECT_RANKS.map(r => row(r.name, num(r.at) + ' tổng cống hiến · bậc ' + r.tier)).join('') + '<p class="info-note">Cống hiến đã kiếm tính cả nhiệm vụ và quyên góp. Rời tông môn sẽ đặt lại chức vị, cống hiến và chúc phúc.</p>' + btn('Rời tông môn', 'sectLeave', '', !!s.sect.mission, 'btn-outline')) };
    return header + `<div class="action-group adventure-nav" role="group" aria-label="Bảng tông môn">${[['missions', 'Nhiệm vụ'], ['shop', 'Kho tông môn'], ['ranks', 'Chức vị']].map(([id, label]) => btn(label, 'sectPanel', `data-panel="${id}" aria-pressed="${sub === id}"`, false, sub === id ? 'btn-gold' : 'btn-outline')).join('')}</div>` +
      (s.sect.last && sub === 'missions' ? `<p class="adventure-result info-note">${esc(s.sect.last.text)}</p>` : '') + panels[sub]();
  }

  /* Tổng quan linh căn: loại + nhóm, thế mạnh Dị / Hỗn Độn, cơ hội Ngụy -> Hỗn Độn, và bảng phân loại ba nhóm. */
  function rootOverview() {
    const s = UI.s(), g = UI.g(), type = s.rootType, info = H.ROOT_TYPES[type] || { group: 'ngu_hanh', desc: '' };
    const group = H.ROOT_GROUPS.find(x => x.id === info.group);
    const combat = F.LINH_CAN_COMBAT[type] || 1, trib = F.LINH_CAN_TRIB[type] || 1;
    let extra = '';
    if (type === 'Dị') {
      const di = H.DI_LINH_CAN[s.rootSub];
      if (di) extra = `<div class="root-di"><b>${esc(di.name)} · ${esc(di.role)}</b><p>${esc(di.desc)}</p><p class="root-di-fx">Thế mạnh: ${esc(UI.rootEffectText(di.effects))}</p></div>`;
    } else if (type === 'Hỗn Độn') {
      extra = `<div class="root-di"><b>Bao trùm ngũ hành và cả bốn Dị linh căn</b><p>Nhận 50% thế mạnh của mỗi loại:</p>` +
        H.DI_KEYS.map(k => `<p class="root-di-fx">${esc(H.DI_LINH_CAN[k].name)}: ${esc(UI.rootEffectText(H.DI_LINH_CAN[k].effects, .5))}</p>`).join('') + '</div>';
    } else if (type === 'Ngụy') {
      extra = `<div class="root-chaos"><b>Con đường Hỗn Độn</b>` + row('Cơ hội hóa Hỗn Độn (lôi kiếp kế tiếp)', pct(g.chaosChance())) +
        row('Đã vượt lôi kiếp mà chưa hóa', num(s.chaosTries || 0) + ' lần') +
        '<p class="info-note">Chỉ Tạp linh căn mới có cơ hội này, và chỉ khi vượt lôi kiếp đại cảnh giới (từ Kết Đan trở lên). Mỗi lần vượt kiếp chưa hóa sẽ cộng dồn bảo hiểm; Vận Khí tăng tỉ lệ.</p></div>';
    }
    const body = `<p>${esc(info.desc)}</p>${row('Tốc tu nền', '×' + F.LINH_CAN_RATE[type] / 2)}${combat > 1 ? row('Chiến lực', '×' + combat) : ''}${row('Chịu lôi kiếp', '×' + trib)}${extra}`;
    const rank = (types, cur) => types.map(n => `<span class="root-chip ${cur === n ? 'is-current' : ''}">${esc(n)}</span>`).join('<span class="root-sep">›</span>');
    const classes = `<div class="root-class"><b>Ngũ hành cơ bản</b><div>${rank(['Ngụy', 'Tứ hành', 'Tam hành', 'Song', 'Thiên'], type)}</div><p class="info-note">Theo số hệ đạt 50 điểm; Thiên là một hệ thuần, không biến thể.</p></div>` +
      `<div class="root-class"><b>Dị linh căn</b><div>${H.DI_KEYS.map(k => `<span class="root-chip ${type === 'Dị' && s.rootSub === k ? 'is-current' : ''}">${esc(H.DI_LINH_CAN[k].name)}</span>`).join('<span class="root-sep">·</span>')}</div><p class="info-note">Biến thể cao cấp của một hệ gốc; tốc tu ngang Thiên nhưng chiến lực ×1,5 và có thế mạnh riêng. Khác Thiên linh căn.</p></div>` +
      `<div class="root-class"><b>Chí tôn</b><div>${rank(['Âm Dương', 'Hỗn Độn'], type)}</div><p class="info-note">Âm Dương gieo khi tạo nhân vật (rất hiếm). Hỗn Độn không gieo được: chỉ Ngụy hóa thành sau lôi kiếp.</p></div>`;
    return card(H.rootLabel(type, s.rootSub), body, { eyebrow: (group ? group.name : 'Linh căn').toUpperCase() }) + card('Phân loại linh căn', classes, { eyebrow: 'BA NHÓM' });
  }

  function roots() {
    const s = UI.s(), g = UI.g(), c = s.rootCraft, els = g.activeElements(), scale = 1 / Math.sqrt(Math.max(1, els.length));
    const labels = { attack: 'Công kích', hp: 'Sinh lực', guard: 'Phòng thủ', rate: 'Tốc tu', crit: 'Bạo kích', dodge: 'Né tránh', regen: 'Hồi sinh lực/giây' };
    const effectText = (i, level) => Object.entries(H.TEMPER_EFFECTS[i]).map(([k, v]) => labels[k] + ' +' + (v * level * scale * 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + (['crit', 'dodge', 'regen'].includes(k) ? ' điểm %' : '%')).join(' · ');
    return `<div class="screen-grid">${rootOverview()}</div>
      ${card('Tôi luyện linh căn', '<p>Dùng Tinh hoa cùng hệ để tôi luyện đến cấp 10. Mỗi cấp tăng chỉ số và ưu thế nguyên tố trong bí cảnh.</p><p class="info-note">Hệ từ 50 điểm mới tôi luyện được. Hiệu quả chia √số hệ để cân bằng linh căn nhiều hệ. Cấp và Tinh hoa thuộc kiếp hiện tại.</p><button class="text-btn" data-go="world:dungeons">Tìm Tinh hoa trong bí cảnh ›</button>', { eyebrow: 'NGŨ HÀNH' })}
      <div class="adventure-grid">${H.ELEMENT_NAMES.map((name, i) => {
        const on = els.includes(i), level = c.levels[i], cost = g.temperCost(i), max = level >= H.TEMPER_MAX;
        return card(`<span style="color:${color(i)}">${name}</span> · ${s.roots[i]} điểm`, row('Tôi luyện', level + '/' + H.TEMPER_MAX) + bar(level * 10) + row('Tinh hoa', num(c.essence[i])) +
          (on ? `<p>${effectText(i, level)}</p>${!max ? '<p class="info-note">Cấp kế: ' + effectText(i, level + 1) + '</p>' : ''}` : '<p class="info-note">Hệ này chưa đạt 50 điểm.</p>') +
          btn(!on ? 'Chưa có linh căn' : max ? 'Đã tối đa' : 'Tôi luyện · ' + cost + ' Tinh hoa', 'temperRoot', `data-index="${i}"`, !on || max || c.essence[i] < cost), { cls: on ? '' : 'adventure-locked' });
      }).join('')}</div>
      <details class="adventure-details"><summary>Ngũ hành & hệ số linh căn</summary>${card('Tương khắc', '<p>Kim → Mộc → Thổ → Thủy → Hỏa → Kim.</p><p>Đồng hệ +20%, khắc địch +30%, bị khắc −25%; chia √số hệ. Mỗi cấp tôi luyện tăng 8% phần ưu thế của hệ đó. Tổng sát thương nguyên tố giới hạn −35% đến +60%.</p>')}</details>`;
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
  UI.adventure = { dungeons, encounters, sect, roots, update };
  UI.action('dungeonStart', (el, d) => { UI.command('startDungeon', { id: d.id }); UI.toast('Đã khởi hành. Kết quả sẽ tự ghi vào nhật ký.', { type: 'gold', title: 'Bí cảnh' }); });
  UI.action('dungeonAbort', () => { UI.modal('Rút khỏi bí cảnh?', '<p>Chuyến đi hiện tại sẽ không có phần thưởng.</p>', () => UI.command('abortDungeon'), 'Rút lui'); return UI.KEEP; });
  UI.action('temperRoot', (el, d) => {
    const i = Number(d.index), level = UI.command('temperRoot', { index: i });
    UI.toast('Linh căn ' + element(i) + ' đạt cấp ' + level + '.', { type: 'gold', title: 'Tôi luyện' });
    UI.vfx?.ring('hero', color(i)); UI.vfx?.effect('qi');
  });
  UI.action('sectPanel', (el, d) => { if (['missions', 'shop', 'ranks'].includes(d.panel)) UI.view.sectPanel = d.panel; });
  UI.action('sectRepeat', () => { UI.command('setSectRepeat', { enabled: !UI.s().sect.repeat }); });
  UI.action('sectMissionAbort', () => { UI.modal('Hủy nhiệm vụ?', '<p>Nhiệm vụ hiện tại không có phần thưởng; tự lặp sẽ tắt.</p>', () => UI.command('abortSectMission'), 'Hủy nhiệm vụ'); return UI.KEEP; });
  UI.action('sectLeave', () => { UI.modal('Rời tông môn?', '<p>Chức vị, cống hiến và chúc phúc sẽ đặt lại. Sau đó có thể chọn tông môn mới.</p>', () => { UI.command('leaveSect'); UI.view.sectPanel = 'missions'; }, 'Rời tông môn'); return UI.KEEP; });
  UI.action('sectBuy', (el, d) => { const r = UI.command('buySect', { id: d.id, ...(d.element === undefined ? {} : { element: Number(d.element) }) }); UI.toast('Nhận ' + r.name + ' ×' + r.count + '.', { type: 'loot', title: 'Kho tông môn' }); });
})(typeof window !== 'undefined' ? window : globalThis);
