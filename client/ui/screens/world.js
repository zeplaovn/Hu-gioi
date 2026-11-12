/* HƯ GIỚI · MÀN THẾ GIỚI */
(function (root) {
  'use strict';
  const H = root.HU_GAME, F = H.F, A = root.HU_ASSETS;
  const UI = root.HU_UI;
  const { abs, $, esc, num, money, moneyHTML, coinLabel, pct, duration, row, btn, img, codeAttr, bar, card, empty, tabs, live } = UI.kit;
  const { QUESTS } = UI.data;
  const { lists } = UI;

  const TABS = [
    { id: 'map', label: 'Bản đồ', icon: '✥' },
    { id: 'dungeons', label: 'Bí cảnh', icon: '⚔' },
    { id: 'sect', label: 'Tông môn', icon: '⌂' },
    { id: 'shop', label: 'Cửa hàng', icon: '◈' },
    { id: 'auction', label: 'Đấu giá', icon: '⚖' }
  ];

  const mapView = { zoom: 1, x: 0, y: 0 };
  const map = () => {
    const s = UI.s(), here = A.worldOf(s.realm);
    return `<figure class="world-map interactive-map" style="--map-wallpaper:url('${abs(A.MAPS[here])}')">
      <div class="map-toolbar" role="group" aria-label="Điều khiển bản đồ">
        <button type="button" data-map-zoom="in" aria-label="Phóng to bản đồ">＋</button>
        <button type="button" data-map-zoom="out" aria-label="Thu nhỏ bản đồ">−</button>
        <button type="button" data-map-zoom="reset" aria-label="Đưa bản đồ về vị trí ban đầu">⟲</button>
        <span class="map-zoom-label" aria-live="polite">100%</span>
      </div>
      <div class="map-viewport" tabindex="0" role="img" aria-label="Bản đồ ${A.WORLD_NAME[here]}; kéo để di chuyển, cuộn để phóng to hoặc dùng phím mũi tên">
        <img class="map-image" src="${A.MAPS[here]}" alt="Bản đồ ${A.WORLD_NAME[here]}" draggable="false" loading="lazy" decoding="async">
      </div>
      <figcaption>${A.WORLD_NAME[here]} · Kéo để khám phá, cuộn hoặc dùng nút ＋/− để phóng to và thu nhỏ</figcaption>
    </figure>`;
  };

  function mapMount(tab) {
    if (tab !== 'map') return;
    const viewport = root.document.querySelector('.interactive-map .map-viewport');
    if (!viewport) return;
    const host = viewport.closest('.interactive-map'), image = viewport.querySelector('.map-image');
    const label = host.querySelector('.map-zoom-label');
    const clampMap = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
    const apply = () => {
      const r = viewport.getBoundingClientRect();
      // object-fit:cover có phần ảnh vượt khung ngay cả ở zoom 100%.
      // Kẹp theo kích thước ảnh thật để kéo được tới cả bốn rìa bản đồ.
      const baseScale = image.naturalWidth && image.naturalHeight
        ? Math.max(r.width / image.naturalWidth, r.height / image.naturalHeight) : 1;
      const coverWidth = (image.naturalWidth || r.width) * baseScale;
      const coverHeight = (image.naturalHeight || r.height) * baseScale;
      image.style.width = coverWidth + 'px';
      image.style.height = coverHeight + 'px';
      const boundX = Math.max(0, (coverWidth * mapView.zoom - r.width) / 2);
      const boundY = Math.max(0, (coverHeight * mapView.zoom - r.height) / 2);
      mapView.x = clampMap(mapView.x, -boundX, boundX);
      mapView.y = clampMap(mapView.y, -boundY, boundY);
      image.style.transform = 'translate3d(calc(-50% + ' + mapView.x + 'px),calc(-50% + ' + mapView.y + 'px),0) scale(' + mapView.zoom.toFixed(2) + ')';
      label.textContent = Math.round(mapView.zoom * 100) + '%';
    };
    const zoom = factor => { mapView.zoom = clampMap(Math.round(mapView.zoom * factor * 100) / 100, 1, 4); apply(); };
    host.querySelectorAll('[data-map-zoom]').forEach(button => button.addEventListener('click', () => {
      const action = button.dataset.mapZoom;
      if (action === 'reset') { mapView.zoom = 1; mapView.x = 0; mapView.y = 0; apply(); }
      else zoom(action === 'in' ? 1.25 : 1 / 1.25);
    }));
    viewport.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.18 : 1 / 1.18); }, { passive: false });
    let drag = null;
    viewport.addEventListener('pointerdown', e => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, px: mapView.x, py: mapView.y };
      viewport.setPointerCapture(e.pointerId);
      viewport.classList.add('dragging');
    });
    viewport.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      mapView.x = drag.px + e.clientX - drag.x;
      mapView.y = drag.py + e.clientY - drag.y;
      apply();
    });
    const finish = () => { drag = null; viewport.classList.remove('dragging'); };
    viewport.addEventListener('pointerup', finish);
    viewport.addEventListener('pointercancel', finish);
    viewport.addEventListener('lostpointercapture', finish);
    viewport.addEventListener('keydown', e => {
      if (['+', '='].includes(e.key)) { e.preventDefault(); zoom(1.25); }
      else if (['-', '_'].includes(e.key)) { e.preventDefault(); zoom(1 / 1.25); }
      else if (e.key === '0') { e.preventDefault(); mapView.zoom = 1; mapView.x = mapView.y = 0; apply(); }
      else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        mapView.x += e.key === 'ArrowLeft' ? 35 : e.key === 'ArrowRight' ? -35 : 0;
        mapView.y += e.key === 'ArrowUp' ? 35 : e.key === 'ArrowDown' ? -35 : 0;
        apply();
      }
    });
    image.addEventListener('load', apply, { once: true });
    apply();
  }

  const quests = () => {
    const s = UI.s(), g = UI.g(), fragments = H.ITEMS.filter(x => x.kind === 'QITEM');
    const novice = g.noviceQuestInfo(), q = novice.quest;
    const guide = q ? card(q.name, `<p>${esc(q.desc)}</p>${row('Mục tiêu', esc(q.goal))}${row('Tiến độ', (novice.index + 1) + ' / ' + H.NOVICE_QUESTS.length)}${bar(novice.index / H.NOVICE_QUESTS.length * 100, 'novice-quest-progress')}<p>${moneyHTML(q.stone)} · ${esc(H.item(q.item).name)} ×${q.qty}</p><div class="action-group">${novice.ready ? btn('Nhận thưởng', 'claimQuest', `data-id="${esc(q.id)}"`) : `<button class="btn btn-outline" data-go="${esc(q.go)}">Đi thực hiện</button>`}</div>`, { eyebrow: 'ĐƯỜNG ĐẾN TRÚC CƠ' })
      : card('Đã hoàn thành hành trình tân thủ', '<p>Bạn đã bước vào Trúc Cơ. Con đường tu hành vẫn còn rộng mở.</p>', { eyebrow: 'ĐƯỜNG ĐẾN TRÚC CƠ' });
    return `${guide}<p class="screen-lead">Mỗi nhiệm vụ chỉ có thể nhận thưởng một lần với nhân vật hiện tại.</p><div class="screen-grid">${QUESTS.map(([id, name, max, stone, pill, qty]) =>
      card(name, `${row('Tiến độ', num(Math.min(max, s.progress[id])) + ' / ' + max)}${bar(Math.min(max, s.progress[id]) / max * 100, 'quest-progress')}<p>${moneyHTML(stone)} · ${esc(H.item(pill).name)} ×${qty}</p>${btn(s.claimed.includes(id) ? 'Đã nhận' : s.progress[id] < max ? 'Chưa đủ tiến độ' : 'Nhận thưởng', 'claimQuest', `data-id="${id}"`, s.claimed.includes(id) || s.progress[id] < max)}`)).join('')}
      ${card('Hợp nhất đạo ấn', `<p>Gom sáu mảnh ở kỳ ngộ Đạo Tổ để nhận 10 Thiên Tinh vào tài khoản.</p>${fragments.map(x => row(x.name, g.count(x.code) + '/1')).join('')}${btn('Hợp ấn', 'fragments', '', !fragments.every(x => g.count(x.code) > 0) || s.claimed.includes('fragments'))}`)}</div>`;
  };

  const sect = () => UI.adventure.sect();
  const encounter = () => UI.adventure.encounters();
  const dungeons = () => UI.adventure.dungeons();
  /* Khối nhiệm vụ riêng của NPC: bước hiện tại, điều kiện, phần thưởng và nút nhận/hoàn thành. */
  const npcQuestBlock = (n, q, like) => {
    const g = UI.g(), s = UI.s();
    if (q.done) return '<div class="npc-quest done"><b>✔ Đã hoàn tất chuỗi nhiệm vụ</b><small>Vẫn có thể tặng quà để tăng thiện cảm và hưởng ưu đãi.</small></div>';
    const d = q.def, r = d.reward, need = d.need;
    const desc = d.desc.replace('{npc}', n['tên NPC']).replace('{likes}', like?.name || 'món yêu thích');
    const progress = need.type === 'kill' ? (q.accepted ? `Đã hạ ${num(q.progress)}/${num(q.target)} yêu thú` : `Cần hạ ${num(q.target)} yêu thú sau khi nhận việc`)
      : need.type === 'gift' ? `Có ${num(q.progress)}/${num(q.target)} ${esc(like?.name || 'món yêu thích')}`
        : `Học phí ${moneyHTML(q.cost)}`;
    const item = r.item?.pill ? `${esc(H.item(H.pill(r.item.pill)).name)} ×${r.item.count || 1}`
      : r.item?.offer ? `${esc(H.item(n.offer)?.name || 'vật phẩm của vị đạo hữu')} ×${r.item.offer}`
        : r.item?.mastery ? `Lĩnh ngộ ${esc(H.item(n.offer)?.name || 'công pháp')} +${Math.round(r.item.mastery * 100)}%` : '';
    const rewards = [`thiện cảm +${r.affinity}`, r.stone ? moneyHTML(F.income_rate(s.realm) * r.stone) : '', r.exp ? `tu vi +${pct(r.exp)} cần thiết` : '', item].filter(Boolean).join(' · ');
    const label = q.locked ? `Cần thiện cảm ${d.minAffinity}` : need.type === 'kill' && !q.accepted ? 'Nhận việc' : 'Hoàn thành';
    return `<div class="npc-quest"><span class="eyebrow">NHIỆM VỤ ${q.step + 1}/${q.total}</span><b>${esc(d.name)}</b><p>${esc(desc)}</p>
      <p class="npc-quest-need">${progress}</p><p class="npc-quest-reward">Thưởng: ${rewards}</p>
      ${btn(label, 'npcQuest', `data-id="${esc(n['mã NPC'])}"`, q.locked || (q.accepted || need.type !== 'kill' ? !q.ready : false), 'btn-outline')}</div>`;
  };
  const npcs = (chosenId = '') => {
    const s=UI.s(),g=UI.g();
    return `<p class="screen-lead">Gặp gỡ kỳ nhân nơi Hạ Giới. Quà yêu thích +5 thiện cảm; quà không thích −5, giới hạn 0–100. Mỗi vị có một chuỗi ủy thác riêng mở dần theo thiện cảm, và thiện cảm càng cao giá mua/học càng rẻ (tối đa −${Math.round(H.NPC_DISCOUNT_MAX*100)}%).</p><div class="adventure-grid">${Object.values(H.DESIGN.npc).filter(n => !chosenId || n['mã NPC'] === chosenId).map(n=>{
      const id=n['mã NPC'],like=H.item(n.likes),dislike=H.item(n.dislikes),offer=H.item(n.offer),role=n['vai trò'],disc=g.npcDiscount(id);
      const roleName = { 'giao nhiệm vụ': 'Ủy thác', 'bán đồ': 'Thương nhân', 'dạy công pháp': 'Truyền pháp', 'dạy bí tịch': 'Truyền bí thuật', 'luyện đan thuê': 'Đan sư' }[role] || role;
      const gifts=[[like,'Tặng món thích'],[dislike,'Tặng món không thích']].map(([x,label])=>{if(!x)return '';const key=Object.keys(s.bag).find(k=>H.item(k)?.code===x.code&&!s.equipment.includes(k)&&g.count(k)>0);return btn(label,'npcGift',`data-id="${esc(id)}" ${codeAttr(key||x.code)}`,!key,'btn-outline')}).join('');
      const sells=['bán đồ','luyện đan thuê'].includes(role),teaches=['dạy công pháp','dạy bí tịch'].includes(role),price=offer&&(sells||teaches)?g.npcPrice(id):0;
      const trade=price?btn((teaches?'Học ':'Mua ')+esc(offer.name)+' · '+moneyHTML(price)+(disc>0?' <small>(−'+Math.round(disc*100)+'%)</small>':''),'npcOffer',`data-id="${esc(id)}"`,offer.tier>s.realm+1||s.stone<price):'';
      const link=role==='giao nhiệm vụ'?'<button class="btn btn-outline" data-go="quests">Nhiệm vụ chung</button>':role==='luyện đan thuê'?'<button class="btn btn-outline" data-go="craft:dan">Mở luyện đan</button>':'';
      return card(esc(n['tên NPC']),`<div class="npc-profile"><img src="${esc(n.ảnh)}" alt="" loading="lazy" decoding="async"><p>${esc(n['bối cảnh'])}</p></div>`+
        row('Địa điểm',esc(n['địa điểm']))+row('Quan hệ',esc(n['quan hệ']))+row('Thân phận',esc(roleName))+row('Thiện cảm',num(s.npcAffinities[id]||0)+'/100')+
        row('Thích',esc(like?.name||'—'))+row('Không thích',esc(dislike?.name||'—'))+npcQuestBlock(n,g.npcQuestInfo(id),like)+`<div class="action-group">${btn('Trò chuyện', 'openNpcDialogue', `data-id="${esc(id)}"`, false, 'btn-gold')}${gifts}${trade}${link}</div>`,{eyebrow:'KỲ NHÂN HẠ GIỚI'});
    }).join('')}</div>`;
  };

  const shop = () => {
    const s = UI.s(), g = UI.g(), v = UI.view;
    const xs = H.ITEMS.filter(x => x.kind !== 'QITEM' && x.tier <= s.realm + 1 && lists.matches(x));
    return `<p class="screen-lead">Cửa hàng có thể bán vật phẩm cao hơn cảnh giới hiện tại một bậc. Giá mua bằng 120% giá trị vật phẩm. Số dư ${moneyHTML(s.stone)}.</p>${lists.controls({ quality: true })}${lists.pager(xs.length)}
      <div class="shop-list">${lists.slice(xs).map(x => {
        const key = ['PILL', 'EQ', 'BT', 'TAL'].includes(x.kind) ? H.keyFor(x.code, v.quality) : x.code;
        return `<article class="shop-item">${img(key)}<div><h3>${esc(x.name)}</h3><p>${x.category} · ${x.realm} · ${F.SUBPHAM[H.item(key).sub]} phẩm</p><p>${esc(x.description)}</p></div>${btn('Mua · ' + moneyHTML(F.shop_buy_price(g.price(key))), 'buy', codeAttr(key))}</article>`;
      }).join('')}</div>
      ${card('Yêu đan và linh thạch', `${row('Giá trị yêu đan', moneyHTML(s.yaoValue))}${btn('Bán yêu đan', 'sellYao', '', s.yaoValue <= 0)}<p>Hấp thu linh thạch để đổi lấy tu vi với hiệu suất 15%; loại thấp hơn cảnh giới bị giảm hiệu quả.</p><div class="action-group coin-row">${F.COINS.map(([n, val], i) => btn('Hấp thu 1 ' + coinLabel(n), 'absorb', `data-index="${i}"`, s.stone < val, 'btn-outline')).join(' ')}</div>`)}`;
  };

  const auction = () => {
    const s = UI.s(), g = UI.g();
    return `<p class="screen-lead">Phiên mô phỏng kết thúc đầu giờ tiếp theo. Đặt mỗi lô một lần; vật phẩm giao tự động khi kết phiên.</p><p>${live((s.auction.cycle + 1) * 3600000)}</p>
      <div class="auction-lots">${g.lots().map(x => `<section class="auction-lot">${img(x.code)}<h3>${esc(x.name)}</h3><p>${moneyHTML(g.price(x.code))}</p>${btn(s.auction.offers[x.code] ? 'Đã đặt' : 'Đặt giá', 'bid', codeAttr(x.code), !!s.auction.offers[x.code])}</section>`).join('')}</div>`;
  };

  UI.lorePanels = { npcs, encounter };
  const body = { map, dungeons, sect, shop, auction };
  UI.register({
    id: 'world', label: 'Thế giới', icon: 'ICON-MENU-007', eyebrow: 'BA GIỚI', tabs: TABS,
    render: tab => `<header class="screen-title"><span class="eyebrow gold">BA GIỚI</span><h2>Thế giới</h2></header>${tabs(TABS, tab)}<div class="screen-body">${UI.release.notice(tab)}${body[tab]()}</div>`,
    mount: mapMount,
    update: () => UI.adventure.update(),
    signature: tab => {
      const s = UI.s(), g = UI.g();
      return [s.realm, s.stage, s.sect.joined, s.sect.id, s.sect.earned, s.sect.contribution, s.adventurePoints || 0, s.borrowedBook || '', s.sect.mission?.id || '', s.sect.mission?.end || 0, s.sect.blessing, s.sect.last?.at, s.sect.repeat, s.meta?.points || 0,
        s.dungeon.active?.end || 0, s.dungeon.last?.at || 0, s.dungeon.run ? [s.dungeon.run.floor, s.dungeon.run.turn, Math.round(s.hp), Math.round(s.dungeon.run.sta)].join(',') : '', tab === 'npc' ? [s.progress.kill, JSON.stringify(s.npcQuests), Object.values(s.npcAffinities).join(',')].join('/') : '', s.encounter.total, Math.floor(Date.now() / 864e5),
        tab === 'dungeons' || tab === 'sect' ? Math.floor(s.hp / g.stats().HP * 10) : '', s.stone >= F.price_ha(s.realm)].join('|');
    }
  });

  // Nhiệm vụ là một màn độc lập trong menu chính, không nằm lẫn với bản đồ.
  UI.register({
    id: 'quests', label: 'Nhiệm vụ', icon: '✦', eyebrow: 'NHIỆM VỤ',
    render: () => '<header class="screen-title"><span class="eyebrow gold">TU HÀNH</span><h2>Nhiệm vụ</h2></header><div class="screen-body">' + quests() + '</div>',
    signature: () => {
      const s = UI.s();
      return [JSON.stringify(s.progress), s.claimed.join(','), s.stone, s.realm, s.stage, s.sect.joined, s.sect.missionsDone, s.exploration.last?.end, UI.session.pavilion?.balance || 0, Object.entries(s.bag)
        .filter(([code]) => H.item(code)?.kind === 'QITEM').map(([code, n]) => code + ':' + n).join(',')].join('|');
    }
  });

  UI.action('buy', async (el, d) => {
    await UI.command('buy', { code: d.code });
    UI.toast('Đã mua ' + H.item(d.code).name + '.', { type: 'loot', title: 'Cửa hàng' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_phu', fps: 12, size: 'clamp(100px,16vw,170px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('npcGift', async (el, d) => {
    const result=await UI.command('npcGift',{id:d.id,code:d.code});
    UI.toast('Thiện cảm '+(result.change>=0?'+':'')+result.change+' · '+result.affinity+'/100.',{type:'success',title:'Tặng lễ'});
  });
  UI.action('npcOffer', async (el, d) => {
    const result=await UI.command('npcOffer',{id:d.id});
    UI.toast((result.role==='bán đồ'?'Đã mua ':'Đã lĩnh ngộ ')+H.item(result.code).name+'.',{type:'success',title:'Gặp gỡ'});
  });
  UI.action('npcQuest', async (el, d) => {
    const r = await UI.command('npcQuest', { id: d.id });
    if (r.accepted) UI.toast('Đã nhận ủy thác: ' + r.name + '. Hạ yêu thú ở Lịch luyện để hoàn thành.', { type: 'info', title: 'Ủy thác kỳ nhân' });
    else {
      UI.toast(r.text, { type: 'loot', title: r.finished ? 'Hoàn tất chuỗi nhiệm vụ' : 'Nhiệm vụ NPC' });
      UI.vfx?.stage({ kind: 'chien_dau', variant: r.finished ? 'phi_thang' : 'linh_khi', fps: 12, size: 'clamp(100px,16vw,170px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
    }
  });
  UI.action('bid', async (el, d) => {
    await UI.command('bid', { code: d.code });
    UI.toast('Đã đặt giá ' + H.item(d.code).name + '.', { type: 'gold', title: 'Đấu giá' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_phu', fps: 12, size: 'clamp(100px,16vw,170px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('joinSect', async (el, d) => {
    await UI.command('joinSect', { id: d.id || 'thanhvan' });
    UI.toast('Đã gia nhập ' + UI.g().sectDefinition().name + ' · mở nguồn linh thạch định kỳ.', { type: 'success', title: 'Tông môn' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_phu', fps: 12, size: 'clamp(110px,17vw,180px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('sectMissionStart', async (el, d) => {
    const m = await UI.command('startSectMission', { id: d.id });
    const def = H.SECT_MISSIONS.find(x => x.id === m.id);
    UI.toast('Nhận nhiệm vụ · ' + def.name + ' · ' + duration(def.seconds) + '.', { type: 'info', title: 'Tông môn' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_khi', fps: 12, size: 'clamp(100px,16vw,170px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('sectMissionClaim', async () => {
    const r = await UI.command('claimSectMission');
    UI.toast(r.text, { type: r.success ? 'loot' : 'danger', title: 'Tông môn' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'phi_thang', fps: 12, size: 'clamp(100px,16vw,170px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('blessing', async () => {
    const s = UI.s();
    await UI.command('setBlessing', { enabled: !s.sect.blessing });
    UI.toast(s.sect.blessing ? 'Chúc phúc đã bật · tốc độ hấp thụ linh khí +10%.' : 'Chúc phúc đã tắt.', { type: s.sect.blessing ? 'success' : 'info', title: 'Tông môn' });
    if (s.sect.blessing) UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_phu', fps: 12, size: 'clamp(100px,16vw,170px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('donate', async () => {
    const s = UI.s();
    await UI.command('donateSect');
    UI.toast('Cống hiến +100 · tổng ' + num(s.sect.contribution) + '.', { type: 'loot', title: 'Tông môn' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_khi', fps: 12, size: 'clamp(100px,16vw,170px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('sectExchange', async () => {
    const p = await UI.command('buySect', { id: 'break' });
    UI.toast('Đổi ' + p.cost + ' cống hiến · nhận ' + p.name + '.', { type: 'loot', title: 'Tông môn' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_phu', fps: 12, size: 'clamp(100px,16vw,170px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('claimQuest', async (el, d) => {
    const q = await UI.command('claimQuest', { id: d.id });
    UI.toast('Đã nhận thưởng ' + q[1] + ' · ' + money(q[3]) + ' và ' + H.item(q[4]).name + ' ×' + q[5] + '.', { type: 'success', title: 'Nhiệm vụ' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'phi_thang', fps: 14, size: 'clamp(110px,18vw,190px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('fragments', async () => {
    await UI.command('claimFragments');
    UI.toast('Hợp nhất đạo ấn · +10 Thiên Tinh.', { type: 'gold', title: 'Đạo ấn' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'phi_thang', fps: 14, size: 'clamp(120px,19vw,200px)', style: { left: '50%', bottom: '22%', transform: 'translateX(-50%)' } });
  });
  UI.action('encounter', async (el, d) => {
    const { item: x, part } = await UI.command('manualEncounter', { index: Number(d.index) });
    if (x) {
      UI.toast('Cơ duyên · nhận ' + x.name + '.', { type: 'gold', title: 'Kỳ ngộ' });
    }
    if (part) {
      UI.toast('Đạo Tổ kỳ ngộ · nhận ' + part.name + '.', { type: 'gold', title: 'Kỳ ngộ' });
    }
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_khi', fps: 12, size: 'clamp(110px,17vw,180px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
})(typeof window !== 'undefined' ? window : globalThis);
