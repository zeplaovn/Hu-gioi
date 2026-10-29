/* HƯ GIỚI · MÀN NGHỀ PHỤ */
(function (root) {
  'use strict';
  const H = root.HU_GAME, F = H.F;
  const UI = root.HU_UI;
  const { abs, $, $$, esc, clamp, num, money, moneyHTML, pct, duration, row, btn, img, codeAttr, bar, card, empty, tabs, live } = UI.kit;
  const { lists } = UI;
  const { FARM, INK } = UI.data;

  const TABS = [
    { id: 'dan', label: 'Luyện đan', icon: '⚗' },
    { id: 'khi', label: 'Luyện khí & chế phù', icon: '⚒' },
    { id: 'dien', label: 'Linh điền', icon: '❀' }
  ];

  const alchemySkill = () => { const s = UI.s(); return s.alchemySkill + UI.g().manualEffects().alchemy + s.craftBoost; };

  function banner(tab) {
    const s = UI.s();
    const art = tab === 'dien' ? root.HU_ASSETS.BG.garden : tab === 'khi' ? UI.data.ART.talisman : UI.data.ART.workshop;
    return `<header class="workshop-banner" style="--art:url('${abs(art)}')">
      <div><span class="eyebrow gold">NGHỀ PHỤ · ${F.realm_map(s.zone).toUpperCase()}</span><h2>Đan phòng & Linh điền</h2><p>${tab === 'dien' ? 'Gieo trồng · tưới nước · bón thổ · bắt sâu · thu hoạch.' : 'Các mẻ chạy nền theo giờ thật. Xong lúc offline vẫn được nhận.'}</p></div>
      <div class="banner-stats">
        <div><small>Kỹ năng luyện đan</small><b>${alchemySkill().toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</b></div>
        <div><small>Mẻ đang luyện</small><b>${s.craftQueue.length}/3</b></div>
        <div><small>Ô đang trồng</small><b>${s.garden.length}/4</b></div>
        <div><small>Tinh hoa lò</small><b>${s.craftBoost.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}/2</b></div>
      </div></header>`;
  }

  function furnaces() {
    const s = UI.s(), g = UI.g();
    const slots = Array.from({ length: 3 }, (_, i) => {
      const j = s.craftQueue[i];
      if (!j) return `<div class="furnace idle"><div class="furnace-img" aria-hidden="true">◍</div><b>Lò ${i + 1}</b><small>Trống · xếp mẻ ở danh sách bên dưới</small></div>`;
      const r = g.recipe(j.code), start = j.end - r.time * 1000;
      return `<div class="furnace busy" data-start="${start}" data-end-at="${j.end}">${img(j.code, 'furnace-img')}<b>${esc(H.item(j.code).name)}</b>
        <small>${pct(j.success)} thành công · ${F.SUBPHAM[j.quality]} phẩm dự kiến</small>
        <div class="meter-bar job-bar"><i></i></div>${live(j.end)}</div>`;
    }).join('');
    const herbs = Object.keys(s.bag).map(H.item).filter(x => x?.kind === 'HERB').sort((a, b) => b.tier - a.tier).slice(0, 8)
      .map(x => `<span class="stock" title="${esc(x.name)}">${img(x.key, 'mini-img')}<em>×${g.count(x.key)}</em></span>`).join('');
    return `<div class="screen-grid craft-top">
      ${card('Lò luyện đan', `<div class="furnace-row">${slots}</div><p class="info-note">Mỗi mẻ dùng bốn linh thảo, cho ba viên nếu thành công. Phẩm chất được ghi riêng trong túi.</p>`, { eyebrow: `HÀNG ĐỢI ${s.craftQueue.length}/3`, cls: 'wide' })}
      ${card('Linh thảo trong túi', herbs ? `<div class="stock-row">${herbs}</div>` : empty('Chưa có linh thảo. Trồng ở tab Linh điền hoặc đi Lịch luyện.'), { eyebrow: 'NGUYÊN LIỆU' })}
    </div>`;
  }

  function recipes() {
    const s = UI.s(), g = UI.g();
    const all = H.ITEMS.filter(x => x.kind === 'PILL' && x.tier <= s.realm + 1 && lists.matches(x));
    const recipeOf = new Map(all.map(x => [x.code, g.recipe(x.code)]));
    const canMake = r => Object.entries(r.herbs).every(([k, n]) => g.ingredientCount(k) >= n) && s.stone >= r.stone;
    const xs = UI.view.onlyReady ? all.filter(x => canMake(recipeOf.get(x.code))) : all;
    const cards = lists.slice(xs).map(x => {
      const r = recipeOf.get(x.code), ok = canMake(r);
      return `<section class="card recipe ${ok ? 'ready' : ''}">
        <div class="row-wrap">${img(x.code, 'recipe-img')}<div><h3>${esc(x.name)}</h3><small class="muted">${x.realm} · ${x.grade}</small></div></div>
        <p>${esc(x.description)}</p>
        ${Object.entries(r.herbs).map(([key, n]) => row(esc(H.item(key).name), `<span class="${g.ingredientCount(key) >= n ? 'green-text' : 'danger-text'}">${g.ingredientCount(key)} / ${n}</span>`)).join('')}
        ${row('Chi phí', moneyHTML(r.stone))}${row('Thời gian', duration(r.time))}${row('Thành công', pct(g.craftChance(x.tier)))}
        ${btn('Xếp một mẻ', 'craft', codeAttr(x.code), s.craftQueue.length >= 3 || !ok)}
      </section>`;
    }).join('');
    return `<div class="list-head">${lists.controls({ categories: ['Tất cả'], placeholder: 'Tên đan hoặc mã' })}
        <button class="btn ${UI.view.onlyReady ? 'btn-gold' : 'btn-outline'}" data-act="onlyReady" aria-pressed="${!!UI.view.onlyReady}">Chỉ đan đủ nguyên liệu</button></div>
      ${lists.pager(xs.length)}
      <div class="recipe-grid">${cards || empty('Không có đan phương phù hợp.')}</div>`;
  }

  function forge() {
    const s = UI.s(), g = UI.g();
    const xs = H.ITEMS.filter(x => ['EQ', 'TAL'].includes(x.kind) && x.tier <= s.realm && lists.matches(x));
    const rows = lists.slice(xs).map(x => {
      const r=g.forgeRecipe(x.code),mat=H.item(r.herb),haveMat=mat?g.ingredientCount(mat.code):0;
      const manualOk=!r.manual||Object.keys(s.learned).some(k=>H.item(k)?.code===r.manual);
      const ok=mat&&haveMat>=r.count&&(!r.ink||g.ingredientCount(r.ink)>0)&&manualOk&&s.stone>=r.stone;
      return `<article class="shop-item">${img(x.code)}<div><h3>${esc(x.name)}</h3><p>${x.realm} · ${F.SUBPHAM[x.sub]}</p>
        <p>${r.count} ${esc(mat?.name || 'linh tài')} <span class="${haveMat >= r.count ? 'green-text' : 'danger-text'}">(${haveMat})</span>${r.ink ? ` · 1 ${esc(H.item(r.ink)?.name || 'mực')} <span class="${g.ingredientCount(r.ink) ? 'green-text' : 'danger-text'}">(${g.ingredientCount(r.ink)})</span>` : ''}${r.manual?` · ${esc(H.item(r.manual).name)} (${manualOk?'đã học':'chưa học'})`:''} · ${moneyHTML(r.stone)}</p></div>
        ${btn('Chế tạo', 'forge', codeAttr(x.code), !ok)}</article>`;
    }).join('');
    return `<p class="screen-lead">Công thức mới dùng linh thảo và bí tịch nghề; các vật phẩm chưa có công thức mới tiếp tục dùng linh tài và mực như trước. Phí 10% giá trị, chỉ chế vật cùng hoặc dưới cảnh giới.</p>
      ${lists.controls({ categories: ['Tất cả', 'Pháp bảo', 'Phù lục'] })}${lists.pager(xs.length)}
      <div class="shop-list">${rows || empty('Chưa có vật phẩm để chế tạo ở cảnh giới này.')}</div>`;
  }

  function plotArt(p, now) {
    if (!p) return FARM(10);
    const { progress, ripe } = UI.g().gardenInfo(p, now);
    return ripe ? FARM(3) : progress > .45 ? FARM(4) : FARM(8);
  }

  function garden() {
    const s = UI.s(), g = UI.g(), now = Date.now();
    const plots = Array.from({ length: 4 }, (_, i) => {
      const p = s.garden.find(p => p.slot === i);
      if (!p) return `<div class="plot empty"><img src="${FARM(10)}" alt="Ô trống" loading="lazy" decoding="async"><b>Ô ${i + 1}</b><small>${esc(s.gardenSoils[i])}</small>${btn('Đổi loại đất', 'gardenTerrain', `data-slot="${i}"`, false, 'btn-outline')}</div>`;
      const action = (key, label) => btn(label, 'gardenAct', `data-slot="${i}" data-care="${key}"`, false, key === 'harvest' ? 'btn-gold' : 'btn-outline');
      return `<div class="plot growing" data-plot="${i}" data-start="${p.plantedAt}" data-end-at="${p.end}"><img src="${plotArt(p, now)}" alt="Linh thảo" loading="lazy" decoding="async"><b>Ô ${i + 1} · ${esc(H.item(p.herb).name)}</b>
        <div class="meter-bar job-bar"><i></i></div><span class="plot-status"></span>
        <div class="farm-meters"><label>Nước <meter class="farm-water" min="0" max="1" value="${p.water}"></meter></label><label>Đất <meter class="farm-soil" min="0" max="1" value="${p.soil}"></meter></label></div><small class="farm-pest"></small>
        <div class="farm-actions">${action('water', 'Tưới nước')}${action('soil', 'Bón thổ · 1 LT')}${action('pest', 'Bắt sâu')}${action('harvest', 'Thu hoạch')}</div></div>`;
    }).join('');
    const seeds = Object.keys(s.bag).map(H.item).filter(x => x?.kind === 'SEED' && x.tier <= s.realm + 1).sort((a, b) => a.tier - b.tier);
    const seedRows = seeds.map(x => {
      const def=H.DESIGN.seedsByHerb[x.herb],needed=def?.['điều kiện đất'],available=s.gardenSoils.some((land,i)=>!s.garden.some(p=>p.slot===i)&&(!needed||land===needed));
      const yieldText=def?def['sản lượng tối thiểu']+'–'+def['sản lượng tối đa']:'2–4';
      const seconds=def?def['thời gian trồng (phút)']*60:Math.max(60,F.craft_time(x.tier)*2);
      return `<article class="shop-item">${img(x.key)}<div><h3>${esc(x.name)} <em>×${g.count(x.key)}</em></h3><p>Thu ${yieldText} ${esc(H.item(x.herb).name)} · lớn sau ${duration(seconds)}${needed?' · '+esc(needed)+' · khó '+def['độ khó']+'/5':''}</p></div>${btn('Gieo', 'consume', codeAttr(x.key), !available)}</article>`;
    }).join('');
    const ferts = Object.keys(s.bag).map(H.item).filter(x => x?.kind === 'FERT').map(x => `<article class="shop-item">${img(x.key)}<div><h3>${esc(x.name)} <em>×${g.count(x.key)}</em></h3><p>${esc(x.description)}</p></div>${btn('Bón', 'consume', codeAttr(x.key), !s.garden.length, 'btn-outline')}</article>`).join('');
    return `<p class="info-note">Cây trải qua 6 giai đoạn: nước và dưỡng chất giảm dần, có thể xuất hiện sâu. Tưới và bắt sâu để cây khỏe; bón thổ giúp tăng phẩm chất. Thiếu nước 3 giai đoạn liên tiếp sẽ héo. Khi bế quan, cây được chăm an toàn và chờ bạn thu hoạch lúc chín.</p><div class="garden-field" style="--garden-bg:url('${abs(root.HU_ASSETS.BG.garden)}')">
        <img class="decor stone" src="${FARM(1)}" alt="" loading="lazy" decoding="async"><img class="decor scarecrow" src="${FARM(2)}" alt="" loading="lazy" decoding="async">
        <div class="plot-grid">${plots}</div></div>
      <div class="screen-grid">
        ${card('Hạt giống trong túi', seedRows ? `<div class="shop-list">${seedRows}</div>` : `${empty('Chưa có hạt giống.')}<button class="btn btn-outline" data-go="world:shop">Mua ở Cửa hàng</button>`, { eyebrow: `Ô TRỐNG ${4 - s.garden.length}/4` })}
        ${card('Phân bón', ferts ? `<div class="shop-list">${ferts}</div><p class="info-note">Giảm 30% thời gian còn lại của cây đang lớn đầu tiên.</p>` : empty('Chưa có phân bón.'), { eyebrow: 'TĂNG TỐC' })}
      </div>`;
  }

  function render(tab) {
    const body = tab === 'khi' ? forge() : tab === 'dien' ? garden() : furnaces() + recipes();
    return banner(tab) + tabs(TABS, tab) + `<div class="screen-body">${body}</div>`;
  }

  function update() {
    const now = Date.now();
    $$('[data-plot]').forEach(el => {
      const p = UI.s().garden.find(p => p.slot === Number(el.dataset.plot));
      if (!p) return;
      const info = UI.g().gardenInfo(p, now);
      el.dataset.endAt = p.end;
      el.classList.toggle('ripe', info.ripe);
      el.classList.toggle('wilt', p.wilt);
      const art = el.querySelector('img'), src = plotArt(p, now);
      if (art.getAttribute('src') !== src) art.src = src;
      el.querySelector('.plot-status').textContent = p.wilt ? 'Đã héo · nhổ bỏ để gieo lại' : info.ripe ? `Chín · ${info.min}–${info.max} cây · ${F.SUBPHAM[info.quality]} phẩm` : `Chín sau ${duration((p.end - now) / 1000)}`;
      el.querySelector('.farm-water').value = p.water;
      el.querySelector('.farm-soil').value = p.soil;
      el.querySelector('.farm-pest').textContent = p.pest ? '🐛 Có sâu bệnh!' : 'Không có sâu bệnh';
      el.querySelector('[data-care="water"]').disabled = p.wilt || info.ripe || p.water >= 1;
      el.querySelector('[data-care="soil"]').disabled = p.wilt || info.ripe || p.soil >= 1 || UI.s().stone < 1;
      el.querySelector('[data-care="pest"]').disabled = p.wilt || !p.pest;
      const harvest = el.querySelector('[data-care="harvest"]');
      harvest.disabled = !p.wilt && !info.ripe;
      harvest.textContent = p.wilt ? 'Nhổ bỏ' : 'Thu hoạch';
    });
    $$('[data-start][data-end-at]').forEach(el => {
      const a = Number(el.dataset.start), b = Number(el.dataset.endAt);
      const job = el.querySelector('.job-bar i');
      if (job) job.style.width = clamp((now - a) / (b - a) * 100, 0, 100) + '%';
    });
  }

  UI.register({
    id: 'craft', label: 'Nghề phụ', icon: 'ICON-MENU-005', eyebrow: 'NGHỀ PHỤ',
    tabs: TABS, render, update,
    signature: () => { const s = UI.s(); return s.craftQueue.length + '|' + s.garden.length + '|' + s.craftQueue.map(j => j.code).join(',') + '|' + s.garden.map(p => p.herb).join(',') + '|' + s.gardenSoils.join(','); }
  });

  UI.action('craft', (el, d) => {
    UI.command('craft', { code: d.code });
    UI.toast('Đã xếp mẻ ' + H.item(d.code).name + '.', { type: 'success', title: 'Luyện đan' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_khi', fps: 12, size: 'clamp(100px,16vw,170px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('forge', (el, d) => {
    const msg = UI.command('forge', { code: d.code });
    UI.toast(msg + '.', { type: 'success', title: 'Luyện khí' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'linh_phu', fps: 12, size: 'clamp(110px,17vw,180px)', style: { left: '50%', bottom: '24%', transform: 'translateX(-50%)' } });
  });
  UI.action('onlyReady', () => { UI.view.onlyReady = !UI.view.onlyReady; UI.view.page = 0; });
  UI.action('gardenAct', (el, d) => {
    const result = UI.command('garden', { slot: Number(d.slot), action: d.care });
    UI.toast(result.message, { type: 'success', title: 'Linh điền' });
  });
  UI.action('gardenTerrain', (el, d) => {
    const slot=Number(d.slot),choices=['đất thường','linh điền','hỏa địa','hàn đàm','linh điền có trận pháp'];
    const terrain=choices[(choices.indexOf(UI.s().gardenSoils[slot])+1)%choices.length];
    const result=UI.command('garden',{slot,action:'terrain',terrain});
    UI.toast(result.message,{type:'info',title:'Linh điền'});
  });
})(typeof window !== 'undefined' ? window : globalThis);
