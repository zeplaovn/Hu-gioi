import { LOCATIONS, REALMS, RECIPES, SECTS } from './data.js';
import { createCharacter, emptyState, normalizeSave } from './state.js';

const addLog = (s, msg) => { s.logs = [msg, ...(s.logs || [])].slice(0, 120); };
const clone = s => structuredClone(s);
const realmCfg = p => REALMS[Math.min(p.realm, REALMS.length - 1)];
const alive = s => s.created && s.profile && s.profile.hp > 0 && s.profile.ageMonths < s.profile.lifespanMonths;

export function gameReducer(state, action) {
  if (action.type === 'RESET') return emptyState();
  if (action.type === 'HYDRATE') return normalizeSave(action.payload);
  if (action.type === 'CREATE') return createCharacter(action.payload);
  if (!alive(state)) return state;
  const s = clone(state); const p = s.profile;
  switch (action.type) {
    case 'TICK': {
      if (action.now % 5 === 0) p.qi += 1 + Math.floor(p.stats['Căn Cốt'] / 4);
      return s;
    }
    case 'TRAIN': {
      const gain = 10 + p.stats['Căn Cốt'] * 2 + p.stats['Ngộ Tính'];
      p.exp += gain; p.qi += Math.floor(gain / 3); p.ageMonths += 1;
      addLog(s, `Tu luyện một chu thiên, thu được ${gain} tu vi.`); return s;
    }
    case 'REST': {
      const healed = Math.min(p.maxHp - p.hp, 25 + p.stats['Căn Cốt'] * 2);
      p.hp += healed; addLog(s, `Tĩnh dưỡng hồi phục ${healed} khí huyết.`); return s;
    }
    case 'EXPLORE': {
      const loc = LOCATIONS.find(x => x.id === s.world.location) || LOCATIONS[0];
      const roll = Math.random(); p.ageMonths += 1;
      if (roll < 0.18) { const dmg = Math.min(p.hp - 1, 4 + loc.danger * 4); p.hp -= Math.max(0,dmg); addLog(s, `Gặp yêu thú tại ${loc.name}, mất ${dmg} khí huyết.`); }
      else if (roll < 0.55) { const herb = 1 + Math.floor(Math.random()*3); s.inventory.herb += herb; addLog(s, `Tìm được ${herb} linh thảo.`); }
      else if (roll < 0.82) { const ore = 1 + Math.floor(Math.random()*2); s.inventory.ore += ore; addLog(s, `Khai được ${ore} linh khoáng.`); }
      else { const stone = 10 + loc.danger * 8; p.spiritStones += stone; p.exp += stone; addLog(s, `Gặp kỳ ngộ, nhận ${stone} linh thạch và tu vi.`); }
      return s;
    }
    case 'BREAKTHROUGH': {
      const cfg = realmCfg(p); if (p.exp < cfg.need) { addLog(s, `Tu vi chưa đủ để đột phá ${cfg.name}.`); return s; }
      if (p.realm >= REALMS.length - 1) { addLog(s, 'Đã chạm tới cực hạn cảnh giới hiện tại.'); return s; }
      const chance = Math.min(.95, .55 + p.stats['Ngộ Tính']*.025 + p.stats['Vận Khí']*.015);
      if (Math.random() <= chance) { p.exp -= cfg.need; p.realm++; p.layer = 1; p.maxHp += 40 + p.realm*20; p.hp = p.maxHp; p.power += 20 + p.realm*12; p.lifespanMonths += 15*12; addLog(s, `Đột phá thành công: ${REALMS[p.realm].name}!`); }
      else { p.exp = Math.floor(p.exp*.9); p.hp = Math.max(1, Math.floor(p.hp*.7)); addLog(s, 'Đột phá thất bại, đạo cơ chấn động.'); }
      return s;
    }
    case 'PLANT': {
      const plot = s.farm.find(x => x.id === action.id); if (!plot || plot.crop) return s;
      if (s.inventory.herb < 1) { addLog(s,'Cần 1 linh thảo làm giống.'); return s; }
      s.inventory.herb--; plot.crop='linh-thao'; plot.readyAt=Date.now()+60000; addLog(s,`Đã gieo linh điền ô ${action.id+1}.`); return s;
    }
    case 'HARVEST': {
      const plot = s.farm.find(x => x.id === action.id); if (!plot?.crop || Date.now() < plot.readyAt) return s;
      plot.crop=null; plot.readyAt=0; s.inventory.herb += 3; addLog(s,`Thu hoạch linh điền ô ${action.id+1}: +3 linh thảo.`); return s;
    }
    case 'CRAFT': {
      const recipe = RECIPES.find(x=>x.id===action.id); if (!recipe) return s;
      if (Object.entries(recipe.cost).some(([k,v]) => (s.inventory[k]||0)<v)) { addLog(s,`Không đủ nguyên liệu cho ${recipe.name}.`); return s; }
      Object.entries(recipe.cost).forEach(([k,v])=>s.inventory[k]-=v); Object.entries(recipe.reward).forEach(([k,v])=>s.inventory[k]=(s.inventory[k]||0)+v);
      if (recipe.power) p.power += recipe.power; if (recipe.hp) { p.maxHp += recipe.hp; p.hp += recipe.hp; } if (recipe.qi) p.qi += recipe.qi;
      addLog(s,`Chế tạo thành công ${recipe.name}.`); return s;
    }
    case 'JOIN_SECT': {
      if (!SECTS.includes(action.name)) return s; s.sect.name=action.name; s.sect.reputation=10; addLog(s,`Gia nhập ${action.name}.`); return s;
    }
    case 'SECT_MISSION': {
      if (!s.sect.name) return s; s.sect.contribution += 10; s.sect.reputation += 2; p.spiritStones += 20; addLog(s,'Hoàn thành nhiệm vụ tông môn: +10 cống hiến, +20 linh thạch.'); return s;
    }
    case 'TRAVEL': {
      const loc=LOCATIONS.find(x=>x.id===action.id); if(!loc || p.realm<loc.realm) { addLog(s,'Cảnh giới chưa đủ để đến khu vực này.'); return s; }
      s.world.location=loc.id; if(!s.world.discovered.includes(loc.id)) s.world.discovered.push(loc.id); addLog(s,`Di chuyển tới ${loc.name}.`); return s;
    }
    case 'REINCARNATE': {
      if (p.realm < 4) { addLog(s,'Cần đạt Nguyên Anh trước khi chuyển thế.'); return s; }
      const destiny = s.meta.destiny + p.realm*10 + Math.floor(p.exp/1000); const reincarnations=s.meta.reincarnations+1;
      const next=createCharacter({name:p.name,race:p.race,stats:p.stats}); next.meta={...s.meta,destiny,reincarnations}; next.logs=[`Chuyển thế lần ${reincarnations}. Thiên Mệnh hiện tại: ${destiny}.`]; return next;
    }
    default: return state;
  }
}
