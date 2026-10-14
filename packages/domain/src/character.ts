import { RACES, STATS, type Character, type RaceName, type StatName } from "./model.js";
import { cleanRoot, rollRoot, rootBonus, type Rng } from "./root.js";

export interface CreateCharacterInput {
  name: string;
  gender: "Nam" | "Nữ";
  age: number;
  race: RaceName;
  alloc: Partial<Record<StatName, number | undefined>>;
  root?: unknown;
}

const cleanName = (raw: string) => raw.normalize("NFC").replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2060\ufeff<>&"'`\[\]]/g, "").replace(/\s+/g, " ").trim().slice(0, 20).trim();

export function createCharacter(input: CreateCharacterInput, rng: Rng = Math.random): Character {
  if (!(input.race in RACES)) throw new Error("invalid_race");
  if (input.gender !== "Nam" && input.gender !== "Nữ") throw new Error("invalid_gender");
  if (!Number.isInteger(input.age) || input.age < 14 || input.age > 30) throw new Error("invalid_age");
  const race = RACES[input.race];
  const raceBonus = race.bonus as Partial<Record<StatName, number>>;
  const stats = {} as Record<StatName, number>;
  for (const stat of STATS) {
    const allocated = Math.max(0, Math.min(40, Math.trunc(input.alloc[stat] ?? 0)));
    stats[stat] = Math.max(1, 5 + allocated + (raceBonus[stat] ?? 0));
  }
  const root = cleanRoot(input.root) ?? rollRoot(rng);
  const lifespan = race.lifespan + Math.floor(rng() * 16) - 5;
  const character: Character = {
    name: cleanName(input.name) || "Đạo Hữu",
    gender: input.gender,
    age: input.age,
    race: input.race,
    root,
    stats,
    lifespan,
    realm: 0,
    tang: 1,
    exp: 0,
    hp: 1,
    stone: 15,
    months: 0,
    world: "ha_gioi",
    region: "pham",
    site: "pham_thanh",
  };
  character.hp = maxHp(character);
  return character;
}

export function maxHp(p: Character): number {
  const base = 80 + p.stats["Căn Cốt"] * 8 + p.realm * 40;
  return Math.round(base * (1 + rootBonus(p.root, "hp")));
}

export function power(p: Character): number {
  const level = p.realm * 9 + p.tang;
  const base = level * 3 + p.stats["Căn Cốt"] * 2 + 5;
  return Math.round(base * (1 + rootBonus(p.root, "atk")));
}

export function defense(p: Character): number {
  const level = p.realm * 9 + p.tang;
  const base = 6 + level * 1.1 + p.stats["Căn Cốt"] * 1.5 + p.realm * 4;
  return Math.round(base * (1 + rootBonus(p.root, "def")));
}

export function derivedStats(p: Character) {
  return {
    maxHp: maxHp(p),
    power: power(p),
    defense: defense(p),
    crit: Math.min(0.6, 0.05 + p.stats["Vận Khí"] * 0.004 + rootBonus(p.root, "crit")),
    dodge: Math.min(0.42, 0.03 + p.stats["Phúc Duyên"] * 0.005 + rootBonus(p.root, "dodge")),
    regen: 0.04 * (1 + rootBonus(p.root, "regen")),
  };
}
