import { RACES, STATS } from './data.js';

export function emptyState() {
  return {
    version: 2,
    created: false,
    profile: null,
    inventory: { herb:0, ore:0, pill:0, talisman:0, sword:0 },
    farm: Array.from({ length: 6 }, (_, id) => ({ id, crop:null, readyAt:0 })),
    sect: { name:null, reputation:0, contribution:0 },
    meta: { reincarnations:0, destiny:0, achievements:[] },
    world: { location:'thanh-van', discovered:['thanh-van','u-minh'] },
    logs: ['Một đạo thần thức vừa thức tỉnh giữa Thiên Vân Đại Lục.']
  };
}

export function createCharacter({ name, race, stats }) {
  const base = emptyState();
  const cfg = RACES[race] || RACES['Nhân'];
  const normalized = Object.fromEntries(STATS.map(k => [k, Math.max(1, Number(stats?.[k] || 5) + Number(cfg.bonus[k] || 0))]));
  base.created = true;
  base.profile = {
    name: String(name || 'Vô Danh').slice(0, 24), race: race in RACES ? race : 'Nhân', stats: normalized,
    realm:0, layer:1, exp:0, qi:0, hp:100, maxHp:100, power:10 + normalized['Căn Cốt'] * 2,
    spiritStones:100, ageMonths:16 * 12, lifespanMonths:cfg.lifespan * 12
  };
  base.logs = [`${base.profile.name} bước lên tiên lộ.`];
  return base;
}

export function normalizeSave(raw) {
  if (!raw) return emptyState();
  const candidate = raw.state || raw;
  if (candidate.version === 2 && candidate.profile) return { ...emptyState(), ...candidate };
  const p = candidate.player || candidate.p || candidate;
  if (!p || typeof p !== 'object') return emptyState();
  const migrated = createCharacter({ name:p.name || p.n || 'Đạo Hữu', race:p.race || 'Nhân', stats:p.stats || {} });
  migrated.profile.realm = Math.max(0, Number(p.realm ?? p.r ?? 0));
  migrated.profile.layer = Math.max(1, Number(p.layer ?? p.lv ?? 1));
  migrated.profile.exp = Math.max(0, Number(p.exp ?? p.xp ?? 0));
  migrated.profile.qi = Math.max(0, Number(p.qi ?? p.energy ?? 0));
  migrated.profile.hp = Math.max(1, Number(p.hp ?? migrated.profile.hp));
  migrated.profile.maxHp = Math.max(migrated.profile.hp, Number(p.maxHp ?? p.hpMax ?? migrated.profile.maxHp));
  migrated.profile.spiritStones = Math.max(0, Number(p.spiritStones ?? p.stone ?? p.money ?? 0));
  migrated.logs.unshift('Đã nhập dữ liệu nhân vật từ định dạng legacy; một số trường có thể cần hiệu chỉnh.');
  return migrated;
}
