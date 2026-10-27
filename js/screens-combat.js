/* HƯ GIỚI · MÀN LỊCH LUYỆN */
(function (root) {
  'use strict';
  const H = root.HU_GAME, F = H.F, A = root.HU_ASSETS;
  const UI = root.HU_UI;
  const { $, esc, clamp, num, money, moneyHTML, pct, duration, row, btn, card } = UI.kit;
  const { SKILLS } = UI.data;

  function skillbar() {
    const g = UI.g();
    return `<div class="skillbar" role="group" aria-label="Kỹ năng chiến đấu">
      ${SKILLS.map((k, i) => `<button class="skill-btn" id="skill${i}" data-act="skill" data-index="${i}" title="${esc(k.desc)}">
        <img src="${A.skillIcon(i + 1)}" alt="" loading="lazy" decoding="async"><span><b>${k.name}</b><small>${num(g.maxMp() * k.mp)} linh khí · <span data-cooldown="${i}"></span></small></span><kbd>${i + 1}</kbd>
      </button>`).join('')}
      <button class="btn btn-gold strike-btn" data-act="strike">⚔ Công kích</button>
    </div>`;
  }

  function enemyCard() {
    const s = UI.s(), g = UI.g(), enemy = g.enemy();
    const kinds = Object.keys(F.MONSTER_MULT);
    return card(esc(enemy.name), `
      ${row('Cảnh giới', F.REALMS[s.zone])}
      ${row('Sinh lực', '<span id="enemyHpText">—</span>')}
      ${row('Chiến lực đối thủ', num(enemy.CP))}
      <div class="kind-toolbar">${kinds.map(k => `<button class="btn ${k === s.enemyKind ? 'btn-gold' : 'btn-outline'}" data-act="enemyKind" data-kind="${k}">${k}</button>`).join('')}</div>
      <p class="info-note">Tinh anh, boss và boss kiếp mạnh hơn nhưng rơi nhiều hơn. Đổi đối thủ sẽ làm mới trận.</p>`, { eyebrow: 'ĐỐI THỦ' });
  }

  function powerCard() {
    const g = UI.g(), st = g.stats(), enemy = g.enemy();
    return card('Chiến lực', `
      ${row('Chiến lực', num(st.CP))}${row('Sinh lực / Công kích / Phòng thủ', num(st.HP) + ' / ' + num(st.ATK) + ' / ' + num(st.DEF))}
      ${row('Bạo kích / Né', pct(st.CRIT) + ' / ' + pct(st.DODGE))}
      ${row('Kỳ vọng thắng', pct(F.win_probability(st.CP, enemy.CP)))}`, { eyebrow: 'THÂN THỂ' });
  }

  function lootCard() {
    const s = UI.s();
    return card('Chiến lợi phẩm', `
      ${row('Linh thạch / thắng', moneyHTML(F.loot_linh_thach(s.zone, s.enemyKind)))}
      ${row('Cơ hội yêu đan', pct(F.yeu_dan_drop_chance(s.zone, s.enemyKind)))}
      ${row('Nhịp đánh', duration(F.kill_time(s.zone) / 10))}
      ${row('Đã hạ', '<span id="killCount">0</span>')}
      ${row('Yêu đan tích lũy', '<span id="yaoValue">0</span>')}
      ${btn('Bán yêu đan', 'sellYao', '', s.yaoValue <= 0, 'btn-outline')}
      <p class="info-note">Khi offline, chế độ tự chiến vẫn săn quái theo xác suất thắng và hiệu suất bế quan.</p>`, { eyebrow: 'THU HOẠCH' });
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

  function panel() {
    return `${skillbar()}<div class="screen-grid combat-grid">${enemyCard()}${powerCard()}${lootCard()}${zoneCard()}${logCard()}</div>`;
  }

  function update() {
    const s = UI.s(), g = UI.g();
    const hpText = $('enemyHpText');
    if (!hpText) return;
    const st = g.stats(), enemy = g.enemy(), maxMp = g.maxMp(), now = Date.now();
    hpText.textContent = num(s.enemyHp || enemy.HP) + ' / ' + num(enemy.HP);
    const kills = $('killCount'); if (kills) kills.textContent = num(s.enemyNum);
    const yao = $('yaoValue');
    if (yao) {
      const yaoText = money(s.yaoValue);
      if (yao.textContent !== yaoText) yao.innerHTML = moneyHTML(s.yaoValue);
      yao.setAttribute('aria-label', yaoText);
    }
    SKILLS.forEach((k, i) => {
      const b = $('skill' + i);
      if (!b) return;
      const cooling = now < s.cooldowns[i], short = s.mp < maxMp * k.mp;
      b.classList.toggle('cooling', cooling);
      b.classList.toggle('starved', !cooling && short);
    });
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
    signature: () => { const s = UI.s(); return s.zone + '|' + s.enemyKind + '|' + (s.yaoValue > 0); }
  });

  UI.action('auto', () => { const s = UI.s(); s.auto = !s.auto; return UI.SOFT; });
  UI.action('strike', () => {
    const hp = UI.s().hp, hit = UI.g().strike();
    attackFx(hit.damage, hit.won, Math.max(0, hp - UI.s().hp));
    if (hit.won) {
      UI.toast('Hạ yêu · chiến lợi phẩm đã nhập túi.', { type: 'loot', title: 'Chiến thắng' });
    }
    return UI.SOFT;
  });
  UI.action('skill', (el, d) => {
    const s = UI.s(), before = s.enemyHp || UI.g().enemy().HP, hp = s.hp, kills = s.enemyNum, i = Number(d.index);
    UI.g().skill(i);
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
  UI.action('enemyKind', (el, d) => {
    UI.g().setEnemyKind(d.kind);
    UI.toast('Đối thủ mới · ' + d.kind + '.', { type: 'info', title: 'Lịch luyện' });
  });
  UI.action('travel', (el, d) => {
    const zone = Number(d.index);
    UI.g().travel(zone);
    UI.toast('Đã đến ' + H.ZONES[zone].name + '.', { type: 'info', title: 'Lịch luyện' });
    UI.vfx?.stage({ kind: 'chien_dau', variant: 'ke_dich', fps: 14, size: 'clamp(150px,23vw,290px)', style: { left: '64%', bottom: '23%', transform: 'translateX(-50%)' } });
  });
  UI.action('sellYao', () => {
    const amount = UI.g().sellYao();
    UI.toast('Bán yêu đan · nhận ' + money(amount) + '.', { type: 'loot', title: 'Thu hoạch' });
  });
})(typeof window !== 'undefined' ? window : globalThis);
