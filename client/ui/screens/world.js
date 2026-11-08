/* HƯ GIỚI · MÀN THẾ GIỚI */
(function (root) {
  'use strict';
  const H = root.HU_GAME, F = H.F, A = root.HU_ASSETS;
  const UI = root.HU_UI;
  const { abs, $, esc, num, money, moneyHTML, coinLabel, pct, duration, row, btn, img, codeAttr, card, empty, tabs, live } = UI.kit;
  const { QUESTS } = UI.data;
  const { lists } = UI;

  const TABS = [
    { id: 'map', label: 'Bản đồ', icon: '✥' },
    { id: 'dungeons', label: 'Bí cảnh', icon: '⚔' },
    { id: 'quests', label: 'Nhiệm vụ', icon: '✦' },
    { id: 'sect', label: 'Tông môn', icon: '⌂' },
    { id: 'encounter', label: 'Kỳ ngộ', icon: '❂' },
    { id: 'npc', label: 'Kỳ nhân', icon: '♧' },
    { id: 'shop', label: 'Cửa hàng', icon: '◈' },
    { id: 'auction', label: 'Đấu giá', icon: '⚖' }
  ];

  const map = () => {
    const s = UI.s();
    const realms = [['Hạ Giới', 0, 'ha_gioi'], ['Linh Giới', 5, 'linh_gioi'], ['Tiên Giới', 9, 'tien_gioi']];
    const here = A.worldOf(s.realm);
    return `<p class="screen-lead">Hạ Giới: Luyện Khí–Hóa Thần · Linh Giới: Luyện Hư–Độ Kiếp · Tiên Giới: Chân Tiên–Đạo Tổ.</p>
      <div class="map-grid">${realms.map(([name, r, w]) => `<div class="realm-card ${s.realm < r ? 'locked' : ''}" style="background-image:linear-gradient(#0003,#07131bf2),url('${abs(A.BG[w])}')"><div class="realm-card-content"><h3>${name}</h3><p>Mở từ ${F.REALMS[r]}</p><span class="pill">${s.realm >= r ? 'Đã khai mở' : 'Chưa mở'}</span></div></div>`).join('')}</div>
      <figure class="world-map"><img src="${A.MAPS[here]}" alt="Bản đồ ${A.WORLD_NAME[here]}" loading="lazy" decoding="async"><figcaption>Bản đồ ${A.WORLD_NAME[here]}</figcaption></figure>
      <div class="action-group"><button class="btn btn-gold" data-go="combat">⚔ Chọn khu vực lịch luyện ›</button><button class="btn btn-outline" data-go="world:dungeons">Khám phá bí cảnh ›</button></div>`;
  };

  const quests = () => {
    const s = UI.s(), g = UI.g(), fragments = H.ITEMS.filter(x => x.kind === 'QITEM');
    return `<p class="screen-lead">Mỗi nhiệm vụ nhận thưởng một lần trong mỗi vòng tu hành.</p><div class="screen-grid">${QUESTS.map(([id, name, max, stone, pill, qty]) =>
      card(name, `${row('Tiến độ', num(Math.min(max, s.progress[id])) + ' / ' + max)}<p>${moneyHTML(stone)} · ${esc(H.item(pill).name)} ×${qty}</p>${btn(s.claimed.includes(id) ? 'Đã nhận' : 'Nhận thưởng', 'claimQuest', `data-id="${id}"`, s.claimed.includes(id) || s.progress[id] < max)}`)).join('')}
      ${card('Hợp nhất đạo ấn', `<p>Gom sáu mảnh ở kỳ ngộ Đạo Tổ để đổi 10 Đạo vận.</p>${fragments.map(x => row(x.name, g.count(x.code) + '/1')).join('')}${btn('Hợp ấn', 'fragments', '', !fragments.every(x => g.count(x.code) > 0) || s.claimed.includes('fragments'))}`)}</div>`;
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
  const npcs = () => {
    const s=UI.s(),g=UI.g();
    return `<p class="screen-lead">Gặp gỡ kỳ nhân nơi Hạ Giới. Quà yêu thích +5 thiện cảm; quà không thích −5, giới hạn 0–100. Mỗi vị có một chuỗi ủy thác riêng mở dần theo thiện cảm, và thiện cảm càng cao giá mua/học càng rẻ (tối đa −${Math.round(H.NPC_DISCOUNT_MAX*100)}%).</p><div class="adventure-grid">${Object.values(H.DESIGN.npc).map(n=>{
      const id=n['mã NPC'],like=H.item(n.likes),dislike=H.item(n.dislikes),offer=H.item(n.offer),role=n['vai trò'],disc=g.npcDiscount(id);
      const roleName = { 'giao nhiệm vụ': 'Ủy thác', 'bán đồ': 'Thương nhân', 'dạy công pháp': 'Truyền pháp', 'dạy bí tịnh': 'Truyền bí thuật', 'luyện đan thuê': 'Đan sư' }[role] || role;
      const gifts=[[like,'Tặng món thích'],[dislike,'Tặng món không thích']].map(([x,label])=>{if(!x)return '';const key=Object.keys(s.bag).find(k=>H.item(k)?.code===x.code&&!s.equipment.includes(k)&&g.count(k)>0);return btn(label,'npcGift',`data-id="${esc(id)}" ${codeAttr(key||x.code)}`,!key,'btn-outline')}).join('');
      const sells=['bán đồ','luyện đan thuê'].includes(role),teaches=['dạy công pháp','dạy bí tịnh'].includes(role),price=offer&&(sells||teaches)?g.npcPrice(id):0;
      const trade=price?btn((teaches?'Học ':'Mua ')+esc(offer.name)+' · '+moneyHTML(price)+(disc>0?' <small>(−'+Math.round(disc*100)+'%)</small>':''),'npcOffer',`data-id="${esc(id)}"`,offer.tier>s.realm+1||s.stone<price):'';
      const link=role==='giao nhiệm vụ'?'<button class="btn btn-outline" data-go="world:quests">Nhiệm vụ chung</button>':role==='luyện đan thuê'?'<button class="btn btn-outline" data-go="craft:dan">Mở luyện đan</button>':'';
      return card(esc(n['tên NPC']),`<div class="npc-profile"><img src="${esc(n.ảnh)}" alt="" loading="lazy" decoding="async"><p>${esc(n['bối cảnh'])}</p></div>`+
        row('Địa điểm',esc(n['địa điểm']))+row('Quan hệ',esc(n['quan hệ']))+row('Thân phận',esc(roleName))+row('Thiện cảm',num(s.npcAffinities[id]||0)+'/100')+
        row('Thích',esc(like?.name||'—'))+row('Không thích',esc(dislike?.name||'—'))+npcQuestBlock(n,g.npcQuestInfo(id),like)+`<div class="action-group">${gifts}${trade}${link}</div>`,{eyebrow:'KỲ NHÂN HẠ GIỚI'});
    }).join('')}</div>`;
  };

  const shop = () => {
    const s = UI.s(), g = UI.g(), v = UI.view;
    const xs = H.ITEMS.filter(x => x.kind !== 'QITEM' && x.tier <= s.realm + 1 && lists.matches(x));
    return `<p class="screen-lead">Cửa hàng có thể bán vật phẩm cao hơn cảnh giới hiện tại một bậc. Giá mua bằng 120% giá trị vật phẩm. Số dư ${moneyHTML(s.stone)}.</p>${lists.controls({ quality: true })}${lists.pager(xs.length)}
      <div class="shop-list">${lists.slice(xs).map(x => {
        const key = ['PILL', 'EQ', 'BT', 'TAL'].includes(x.kind) ? H.keyFor(x.code, v.quality) : x.code;
        return `<article class="shop-item">${img(key)}<div><h3>${esc(x.name)}</h3><p>${x.category} · ${x.realm} · ${F.SUBPHAM[H.item(key).sub]} phẩm</p><p>${esc(x.description)}</p></div>${btn(moneyHTML(F.shop_buy_price(g.price(key))), 'buy', codeAttr(key))}</article>`;
      }).join('')}</div>
      ${card('Yêu đan và linh thạch', `${row('Giá trị yêu đan', moneyHTML(s.yaoValue))}${btn('Bán yêu đan', 'sellYao', '', s.yaoValue <= 0)}<p>Hấp thu linh thạch để đổi lấy tu vi với hiệu suất 15%; loại thấp hơn cảnh giới bị giảm hiệu quả.</p><div class="action-group coin-row">${F.COINS.map(([n, val], i) => btn('Hấp thu 1 ' + coinLabel(n), 'absorb', `data-index="${i}"`, s.stone < val, 'btn-outline')).join(' ')}</div>`)}`;
  };

  const auction = () => {
    const s = UI.s(), g = UI.g();
    return `<p class="screen-lead">Phiên mô phỏng kết thúc đầu giờ tiếp theo. Đặt mỗi lô một lần; vật phẩm giao tự động khi kết phiên.</p><p>${live((s.auction.cycle + 1) * 3600000)}</p>
      <div class="auction-lots">${g.lots().map(x => `<section class="auction-lot">${img(x.code)}<h3>${esc(x.name)}</h3><p>${moneyHTML(g.price(x.code))}</p>${btn(s.auction.offers[x.code] ? 'Đã đặt' : 'Đặt giá', 'bid', codeAttr(x.code), !!s.auction.offers[x.code])}</section>`).join('')}</div>`;
  };

  const body = { map, dungeons, quests, sect, encounter, npc: npcs, shop, auction };
  UI.register({
    id: 'world', label: 'Thế giới', icon: 'ICON-MENU-007', eyebrow: 'BA GIỚI', tabs: TABS,
    render: tab => `<header class="screen-title"><span class="eyebrow gold">BA GIỚI</span><h2>Thế giới</h2></header>${tabs(TABS, tab)}<div class="screen-body">${body[tab]()}</div>`,
    update: () => UI.adventure.update(),
    signature: tab => {
      const s = UI.s(), g = UI.g();
      return [s.realm, s.stage, s.sect.joined, s.sect.id, s.sect.earned, s.sect.contribution, s.sect.mission?.id || '', s.sect.mission?.end || 0, s.sect.blessing, s.sect.last?.at, s.sect.repeat, s.meta?.points || 0,
        s.dungeon.active?.end || 0, s.dungeon.last?.at || 0, s.dungeon.run ? [s.dungeon.run.floor, s.dungeon.run.turn, Math.round(s.hp), Math.round(s.dungeon.run.sta)].join(',') : '', tab === 'npc' ? [s.progress.kill, JSON.stringify(s.npcQuests), Object.values(s.npcAffinities).join(',')].join('/') : '', s.encounter.total, Math.floor(Date.now() / 864e5),
        tab === 'dungeons' || tab === 'sect' ? Math.floor(s.hp / g.stats().HP * 10) : '', s.stone >= F.price_ha(s.realm)].join('|');
    }
  });

  UI.action('buy', (el, d) => {
    UI.command('buy', { code: d.code });
    UI.toast('Đã mua ' + H.item(d.code).name + '.', { type: 'loot', title: 'Cửa hàng' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_phu', fps: 12, size: 'clamp(100px,16vw,170px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('npcGift', (el, d) => {
    const result=UI.command('npcGift',{id:d.id,code:d.code});
    UI.toast('Thiện cảm '+(result.change>=0?'+':'')+result.change+' · '+result.affinity+'/100.',{type:'success',title:'Tặng lễ'});
  });
  UI.action('npcOffer', (el, d) => {
    const result=UI.command('npcOffer',{id:d.id});
    UI.toast((result.role==='bán đồ'?'Đã mua ':'Đã lĩnh ngộ ')+H.item(result.code).name+'.',{type:'success',title:'Gặp gỡ'});
  });
  UI.action('npcQuest', (el, d) => {
    const r = UI.command('npcQuest', { id: d.id });
    if (r.accepted) UI.toast('Đã nhận việc: ' + r.name + '. Hạ yêu thú ở Lịch luyện để hoàn thành.', { type: 'info', title: 'Nhiệm vụ NPC' });
    else {
      UI.toast(r.text, { type: 'loot', title: r.finished ? 'Hoàn tất chuỗi nhiệm vụ' : 'Nhiệm vụ NPC' });
      UI.vfx?.stage({ kind: 'chien_dau', variant: r.finished ? 'phi_thang' : 'linh_khi', fps: 12, size: 'clamp(100px,16vw,170px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
    }
  });
  UI.action('bid', (el, d) => {
    UI.command('bid', { code: d.code });
    UI.toast('Đã đặt giá ' + H.item(d.code).name + '.', { type: 'gold', title: 'Đấu giá' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_phu', fps: 12, size: 'clamp(100px,16vw,170px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('joinSect', (el, d) => {
    UI.command('joinSect', { id: d.id || 'thanhvan' });
    UI.toast('Đã gia nhập ' + UI.g().sectDefinition().name + ' · mở nguồn linh thạch định kỳ.', { type: 'success', title: 'Tông môn' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_phu', fps: 12, size: 'clamp(110px,17vw,180px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('sectMissionStart', (el, d) => {
    const m = UI.command('startSectMission', { id: d.id });
    const def = H.SECT_MISSIONS.find(x => x.id === m.id);
    UI.toast('Nhận nhiệm vụ · ' + def.name + ' · ' + duration(def.seconds) + '.', { type: 'info', title: 'Tông môn' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_khi', fps: 12, size: 'clamp(100px,16vw,170px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('sectMissionClaim', () => {
    const r = UI.command('claimSectMission');
    UI.toast(r.text, { type: r.success ? 'loot' : 'danger', title: 'Tông môn' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'phi_thang', fps: 12, size: 'clamp(100px,16vw,170px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('blessing', () => {
    const s = UI.s();
    UI.command('setBlessing', { enabled: !s.sect.blessing });
    UI.toast(s.sect.blessing ? 'Chúc phúc đã bật · tốc độ hấp thụ linh khí +10%.' : 'Chúc phúc đã tắt.', { type: s.sect.blessing ? 'success' : 'info', title: 'Tông môn' });
    if (s.sect.blessing) UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_phu', fps: 12, size: 'clamp(100px,16vw,170px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('donate', () => {
    const s = UI.s();
    UI.command('donateSect');
    UI.toast('Cống hiến +100 · tổng ' + num(s.sect.contribution) + '.', { type: 'loot', title: 'Tông môn' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_khi', fps: 12, size: 'clamp(100px,16vw,170px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('sectExchange', () => {
    const p = UI.command('buySect', { id: 'break' });
    UI.toast('Đổi ' + p.cost + ' cống hiến · nhận ' + p.name + '.', { type: 'loot', title: 'Tông môn' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_phu', fps: 12, size: 'clamp(100px,16vw,170px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('claimQuest', (el, d) => {
    const q = UI.command('claimQuest', { id: d.id });
    UI.toast('Đã nhận thưởng ' + q[1] + ' · ' + money(q[3]) + ' và ' + H.item(q[4]).name + ' ×' + q[5] + '.', { type: 'success', title: 'Nhiệm vụ' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'phi_thang', fps: 14, size: 'clamp(110px,18vw,190px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('fragments', () => {
    UI.command('claimFragments');
    UI.toast('Hợp nhất đạo ấn · +10 Đạo vận.', { type: 'gold', title: 'Đạo ấn' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'phi_thang', fps: 14, size: 'clamp(120px,19vw,200px)', style: { left: '50%', bottom: '22%', transform: 'translateX(-50%)' } });
  });
  UI.action('encounter', (el, d) => {
    const { item: x, part } = UI.command('manualEncounter', { index: Number(d.index) });
    if (x) {
      UI.toast('Cơ duyên · nhận ' + x.name + '.', { type: 'gold', title: 'Kỳ ngộ' });
    }
    if (part) {
      UI.toast('Đạo Tổ kỳ ngộ · nhận ' + part.name + '.', { type: 'gold', title: 'Kỳ ngộ' });
    }
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_khi', fps: 12, size: 'clamp(110px,17vw,180px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
})(typeof window !== 'undefined' ? window : globalThis);
