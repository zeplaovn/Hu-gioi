/* HƯ GIỚI · MÀN LỊCH LUYỆN */
(function (root) {
  'use strict';
  const H = root.HU_GAME, F = H.F, A = root.HU_ASSETS;
  const UI = root.HU_UI;
  const { $, esc, clamp, num, money, moneyHTML, pct, duration, row, btn, card, codeAttr } = UI.kit;
  const { SKILLS } = UI.data;

  function skillbar() {
    const g = UI.g();
    return `<div class="skillbar" role="group" aria-label="Kỹ năng chiến đấu">
      ${SKILLS.map((k, i) => `<button class="skill-btn" id="skill${i}" data-act="skill" data-index="${i}" title="${esc(k.desc)}">
        <img src="${A.skillIcon(i + 1)}" alt="" loading="lazy" decoding="async"><span><b>${k.name}</b><small>${num(g.maxMp() * k.mp)} linh lực · <span data-cooldown="${i}"></span></small></span><kbd>${i + 1}</kbd>
      </button>`).join('')}
      <button class="btn btn-gold strike-btn" data-act="strike">⚔ Xuất chiêu</button>
    </div>`;
  }

  function enemyCard() {
    const s = UI.s(), g = UI.g(), enemy = g.enemy();
    const kinds = Object.keys(F.MONSTER_MULT);
    const kindNames = { 'thường': 'Yêu thú', 'tinh anh': 'Tinh anh', 'boss': 'Thủ lĩnh', 'boss kiếp': 'Kiếp chủ' };
    return card(esc(enemy.name), `
      ${row('Cảnh giới', F.REALMS[s.zone])}
      ${enemy.designId ? row('Cấp / thuộc tính', num(enemy.level)+' · '+esc(enemy.elementName)) : ''}
      ${row('Sinh lực', '<span id="enemyHpText">—</span>')}
      ${row('Chiến lực đối thủ', num(enemy.CP))}
      ${enemy.designId?.startsWith('BS') ? row('Giai đoạn', '<span id="enemyPhaseText">—</span>') : ''}
      <div class="kind-toolbar">${kinds.map(k => `<button class="btn ${k === s.enemyKind ? 'btn-gold' : 'btn-outline'}" data-act="enemyKind" data-kind="${k}">${kindNames[k] || k}</button>`).join('')}</div>
      <p class="info-note">Tinh anh, thủ lĩnh và kiếp chủ có chiến lực cao hơn, nhưng mang theo chiến lợi phẩm quý hơn. Đổi đối thủ sẽ bắt đầu trận mới.</p>`, { eyebrow: 'ĐỐI THỦ' });
  }

  function powerCard() {
    const g = UI.g(), st = g.stats(), enemy = g.enemy();
    return card('Chiến lực', `
      ${row('Chiến lực', num(st.CP))}${row('Sinh lực / Công kích / Phòng thủ', num(st.HP) + ' / ' + num(st.ATK) + ' / ' + num(st.DEF))}
      ${row('Bạo kích / Né tránh', pct(st.CRIT) + ' / ' + pct(st.DODGE))}
      ${row('Khả năng chiến thắng', pct(F.win_probability(st.CP, enemy.CP)))}`, { eyebrow: 'THÂN THỂ' });
  }

  function lootCard() {
    const s = UI.s(),enemy=UI.g().enemy();
    const drops=H.DESIGN.raw['vật phẩm rơi'].filter(d=>d['mã đối thủ']===enemy.designId).map(d=>{const x=H.item(H.DESIGN.legacy(d['mã vật phẩm']));return x?row(esc(x.name),num(d['tỉ lệ (%)'])+'%'):''}).join('');
    return card('Chiến lợi phẩm', `
      ${row('Linh thạch / thắng', moneyHTML(F.loot_linh_thach(s.zone, s.enemyKind)))}
      ${row('Cơ hội yêu đan', pct(F.yeu_dan_drop_chance(s.zone, s.enemyKind)))}
      ${row('Nhịp đánh', duration(UI.g().attackInterval()))}
      ${row('Đã hạ', '<span id="killCount">0</span>')}
      ${row('Yêu đan tích lũy', '<span id="yaoValue">0</span>')}
      ${drops}
      ${btn('Bán yêu đan', 'sellYao', '', s.yaoValue <= 0, 'btn-outline')}
      <p class="info-note">Khi bạn rời game, chế độ tự chiến vẫn săn quái theo xác suất thắng và hiệu suất bế quan.</p>`, { eyebrow: 'THU HOẠCH' });
  }

  function zoneCard() {
    const s = UI.s();
    return card('Khu vực lịch luyện', `<div class="zone-list">${H.ZONES.map(z => `
      <button class="zone-button ${z.id === s.zone ? 'active' : ''}" data-act="travel" data-index="${z.id}" ${z.realm > s.realm ? 'disabled' : ''}>
        <b>${z.name}</b><small>${z.realm > s.realm ? 'Mở ở ' + F.REALMS[z.realm] : z.desc}</small></button>`).join('')}</div>`, { eyebrow: 'BẢN ĐỒ', cls: 'zone-card' });
  }

  function logCard() {
    return card('Nhật ký chiến đấu', `<div class="journal" id="combatJournal"></div>`, { eyebrow: 'GHI CHÉP' });
  }

  function definedCard() {
    const s=UI.s(),now=Date.now();
    const manuals=s.activeManuals.map(key=>({key,x:H.item(key)})).filter(v=>v.x?.design?.group==='công pháp');
    const gear=s.equipment.map(key=>({key,x:H.item(key),effect:H.DESIGN.effects[H.item(key).code]})).filter(v=>v.effect?.['điều kiện kích hoạt']==='khi kích hoạt');
    const m=manuals.map(({key,x})=>btn(esc(x.name)+' · '+x.design['tiêu hao mp']+' linh lực','castManual',codeAttr(key),s.mp<x.design['tiêu hao mp']||now<(s.designCombat.manualCooldowns[key]||0),'btn-outline')).join('');
    const p=gear.map(({key,x})=>btn('Kích hoạt '+esc(x.name),'activateArtifact',codeAttr(key),now<(s.designCombat.itemCooldowns[key]||0),'btn-outline')).join('');
    return card('Công pháp & pháp bảo',`<div class="action-group">${m||'<p class="info-note">Chưa vận hành công pháp chủ động.</p>'}${p||''}</div><p class="info-note">Lĩnh ngộ và vận hành công pháp hoặc trang bị pháp bảo để mở kỹ năng.</p>`,{eyebrow:'KỸ NĂNG MỚI'});
  }

  function explorationCard() {
    const e = UI.s().exploration?.active;
    if (!e) {
      const last = UI.s().exploration?.last;
      return card('Lịch luyện · Mười phút', `<p>Mỗi lần xuất hành sẽ ngẫu nhiên gặp yêu thú, kỳ nhân hoặc một cơ duyên. Trong mười phút lịch luyện, tu hành và nghề phụ đều tạm ngưng.</p>
        ${last ? '<p class="info-note">Lần trước: ' + esc(last.name) + '. ' + esc(last.text) + '</p>' : ''}
        ${btn('Khởi hành lịch luyện', 'exploreStart', '', false, 'btn-gold')}`, { eyebrow: 'THÁM HIỂM BÍ CẢNH' });
    }
    return card('Lịch luyện · ' + esc(e.name), `
      ${row('Thời gian còn lại', '<strong id="explorationCountdown">10:00</strong>')}
      <div class="meter-bar"><i id="explorationProgress"></i></div>
      <p>${esc(e.text)}</p>
      <p class="info-note">Tu vi, luyện đan, linh điền và ủy thác tạm dừng. Chuyến đi không thể đổi kết quả hoặc bắt đầu lại trước khi đủ 10 phút.</p>`,
      { eyebrow: e.kind === 'monster' ? 'GẶP YÊU THÚ' : e.kind === 'npc' ? 'HỮU DUYÊN GẶP GỠ' : 'KỲ NGỘ' });
  }

  function panel() {
    const e = UI.s().exploration?.active;
    const journal = UI.lorePanels?.encounter;
    let content = explorationCard();
    if (e?.kind === 'monster' && !e.cleared) {
      content += enemyCard() + powerCard() + lootCard() + definedCard() + logCard();
    } else if (e?.kind === 'monster') {
      content += card('Đã vượt thử thách', '<p>Yêu thú đã bị đánh bại. Chiến lợi phẩm đã nhập túi. Hãy đợi hành trình kết thúc để trở về tu luyện.</p>');
    } else if (e?.kind === 'npc') {
      content += (UI.lorePanels?.npcs?.(e.npcId) || '<p>Chưa gặp được vị kỳ nhân này.</p>');
    } else if (e?.kind === 'encounter') {
      content += card('Thiên cơ chưa định', '<p>Cơ duyên sẽ kết thành quả khi chuyến lịch luyện đủ mười phút. Hãy chờ thiên cơ hiển lộ.</p>');
    } else if (journal) {
      content += journal();
    }
    return '<div class="screen-grid combat-grid">' + content + '</div>';
  }

  /* Thanh kỹ năng nằm ngoài cửa sổ, trên sân khấu; chỉ hiện khi đang ở chế độ chiến đấu. */
  function dock() {
    const d = $('skillDock');
    if (!d || !UI.s().created) return;
    const active = UI.s().exploration?.active;
    d.hidden = !active || active.kind !== 'monster' || active.cleared;
    if (d.hidden) return;
    if (!d.firstChild) d.innerHTML = skillbar();
    dockState();
  }
  function dockState() {
    const s = UI.s(), g = UI.g(), maxMp = g.maxMp(), now = Date.now();
    SKILLS.forEach((k, i) => {
      const b = $('skill' + i);
      if (!b) return;
      const cooling = now < s.cooldowns[i], short = s.mp < maxMp * k.mp;
      b.classList.toggle('cooling', cooling);
      b.classList.toggle('starved', !cooling && short);
    });
  }
  UI.skillDock = { update: dock };

  function update() {
    dock();
    const s = UI.s(), g = UI.g();
    const e = s.exploration?.active, timer = $('explorationCountdown'), progress = $('explorationProgress');
    if (e && timer) {
      const remaining = Math.max(0, Math.ceil((e.end - Date.now()) / 1000));
      timer.textContent = String(Math.floor(remaining / 60)).padStart(2, '0') + ':' + String(remaining % 60).padStart(2, '0');
      if (progress) progress.style.width = (100 - remaining / 600 * 100).toFixed(1) + '%';
    }
    const hpText = $('enemyHpText');
    if (!hpText) return;
    const st = g.stats(), enemy = g.enemy(), maxMp = g.maxMp(), now = Date.now();
    document.querySelectorAll('[data-act="castManual"]').forEach(b=>{const x=H.item(b.dataset.code);b.disabled=!x||s.mp<x.design['tiêu hao mp']||now<(s.designCombat.manualCooldowns[b.dataset.code]||0)});
    document.querySelectorAll('[data-act="activateArtifact"]').forEach(b=>{b.disabled=now<(s.designCombat.itemCooldowns[b.dataset.code]||0)});
    hpText.textContent = num(s.enemyHp || enemy.HP) + ' / ' + num(enemy.HP);
    const phase=$('enemyPhaseText');if(phase){const ratio=(s.enemyHp||enemy.HP)/enemy.HP;phase.textContent=H.DESIGN.phase(enemy.designId,ratio)?.['kỹ năng giai đoạn']||'—';}
    const kills = $('killCount'); if (kills) kills.textContent = num(s.enemyNum);
    const yao = $('yaoValue');
    if (yao) {
      const yaoText = money(s.yaoValue);
      if (yao.textContent !== yaoText) yao.innerHTML = moneyHTML(s.yaoValue);
      yao.setAttribute('aria-label', yaoText);
    }
    const log = $('combatJournal');
    if (log) log.innerHTML = s.logs.slice(0, 7).map(v => `<div><time>✦</time>${esc(v)}</div>`).join('');
  }

  function lunge() {
    const a = $('heroActor');
    if (!a || !UI.vfx?.effectsEnabled()) return;
    a.classList.remove('attack'); void a.offsetWidth; a.classList.add('attack');
  }

  let battle = null;
  const snapshot = () => {
    const s = UI.s();
    return { zone: s.zone, kind: s.enemyKind, hp: s.hp, enemyHp: s.enemyHp, kills: s.enemyNum, auto: s.auto };
  };
  function attackFx(damage, won, taken = 0, skill = false) {
    UI.heroAttack?.();
    lunge();
    UI.vfx?.effect('slash', 'enemy');
    UI.vfx?.effect('hit', 'enemy', { size: 'clamp(90px,15vmin,160px)' });
    UI.vfx?.float('−' + num(damage), 'enemy', skill ? 'skill' : '');
    if (taken > 0) {
      UI.vfx?.effect('hit', 'hero', { size: 'clamp(75px,12vmin,120px)' });
      UI.vfx?.float('−' + num(taken), 'hero');
    }
    if (won) {
      UI.vfx?.burst('enemy');
      UI.vfx?.float('Hạ yêu!', 'enemy', 'won');
    }
    battle = snapshot();
  }
  UI.combatFx = {
    sync(mode) {
      const s = UI.s(), next = snapshot();
      if (mode === 'combat' && battle?.auto && (s.auto || s.hp < battle.hp) && battle.zone === s.zone && battle.kind === s.enemyKind) {
        const won = s.enemyNum > battle.kills, damage = Math.max(0, (battle.enemyHp || UI.g().enemy().HP) - s.enemyHp);
        if (won || damage > 0) attackFx(won ? (battle.enemyHp || UI.g().enemy().HP) : damage, won, Math.max(0, battle.hp - s.hp));
      }
      battle = next;
    }
  };

  UI.register({
    id: 'combat', label: 'Lịch luyện', icon: 'ICON-MENU-002', eyebrow: 'DIỆT YÊU',
    render: panel, panel, update,
    signature: () => { const s = UI.s(), e = s.exploration?.active; return s.zone + '|' + s.enemyKind + '|' + (s.yaoValue > 0) + '|' + s.activeManuals.join(',') + '|' + s.equipment.join(',') + '|' + (e ? e.kind + ':' + e.start + ':' + e.cleared : 'none') + '|' + (s.exploration?.last?.end || 0) + '|' + s.encounter.total + '|' + s.progress.kill + '|' + Object.values(s.npcAffinities).join(','); }
  });

  UI.action('exploreStart', () => {
    const event = UI.command('startExploration');
    UI.toast('Lịch luyện · ' + event.name + '. Chuyến đi kéo dài 10 phút.', { type: 'gold', title: 'Bí cảnh' });
    UI.go('combat');
  });
  UI.action('strike', () => {
    const hp = UI.s().hp, hit = UI.command('strike');
    attackFx(hit.damage, hit.won, Math.max(0, hp - UI.s().hp));
    if (hit.won) {
      UI.toast('Hạ yêu · chiến lợi phẩm đã nhập túi.', { type: 'loot', title: 'Chiến thắng' });
    }
    return UI.SOFT;
  });
  UI.action('skill', (el, d) => {
    const s = UI.s(), before = s.enemyHp || UI.g().enemy().HP, hp = s.hp, kills = s.enemyNum, i = Number(d.index);
    UI.command('skill', { index: i });
    if (i === 2) {
      UI.vfx?.float('+' + num(s.hp - hp), 'hero', 'heal');
      UI.vfx?.effect('heal');
      UI.vfx?.ring('hero', '#63d6a3');
    } else {
      attackFx(s.enemyNum > kills ? before : Math.max(0, before - s.enemyHp), s.enemyNum > kills, Math.max(0, hp - s.hp), true);
      if (s.enemyNum > kills) {
        UI.toast('Kỹ năng hạ yêu · chiến lợi phẩm đã nhập túi.', { type: 'loot', title: 'Chiến thắng' });
      }
    }
    battle = snapshot();
    return UI.SOFT;
  });
  UI.action('castManual', (el, d) => {
    const before=UI.s().hp,result=UI.command('castManual',{code:d.code});
    if(result.damage!==undefined)attackFx(result.damage,result.won,Math.max(0,before-UI.s().hp),true);
    else UI.vfx?.effect('heal');
    UI.toast('Đã vận dụng '+H.item(d.code).name+'.',{type:'success',title:'Công pháp'});
  });
  UI.action('activateArtifact', (el, d) => {
    UI.command('activateArtifact',{code:d.code});
    UI.toast('Đã kích hoạt '+H.item(d.code).name+'.',{type:'success',title:'Pháp bảo'});
  });
  UI.action('enemyKind', (el, d) => {
    UI.command('setEnemyKind', { kind: d.kind });
    UI.toast('Đối thủ mới · ' + d.kind + '.', { type: 'info', title: 'Lịch luyện' });
  });
  UI.action('travel', (el, d) => {
    const zone = Number(d.index);
    UI.command('travel', { zone });
    UI.toast('Đã đến ' + H.ZONES[zone].name + '.', { type: 'info', title: 'Lịch luyện' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'ke_dich', fps: 14, size: 'clamp(150px,23vw,290px)', style: { left: '64%', bottom: '23%', transform: 'translateX(-50%)' } });
  });
  UI.action('sellYao', () => {
    const amount = UI.command('sellYao');
    UI.toast('Bán yêu đan · nhận ' + money(amount) + '.', { type: 'loot', title: 'Thu hoạch' });
  });
})(typeof window !== 'undefined' ? window : globalThis);
