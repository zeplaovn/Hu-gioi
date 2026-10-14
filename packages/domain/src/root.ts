import { ELEMENTS, FIVE, RARE_ELEMENTS, RARE_ROOT, ROOT_TYPES, type ElementName, type Root, type RootType } from "./model.js";

export type Rng = () => number;
const randInt = (rng: Rng, min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;

export function cleanRoot(raw: unknown): Root | null {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as { els?: unknown }).els)) return null;
  const input = (raw as { els: unknown[] }).els;
  const valid = [...new Set(input.filter((v): v is ElementName => typeof v === "string" && Object.hasOwn(ELEMENTS, v)))];
  const rare = valid.find(v => (RARE_ELEMENTS as readonly string[]).includes(v));
  if (rare) return { els: [rare] };
  const five = FIVE.filter(v => valid.includes(v));
  return five.length ? { els: [...five] } : null;
}

export function rootInfo(root: Root): RootType {
  const rare = root.els.some(v => (RARE_ELEMENTS as readonly string[]).includes(v));
  if (rare) return { ...RARE_ROOT };
  const n = Math.min(5, Math.max(1, root.els.length));
  return { ...ROOT_TYPES[n - 1]! };
}

export function rollRoot(rng: Rng = Math.random): Root {
  if (randInt(rng, 1, 100) <= 3) {
    return { els: [RARE_ELEMENTS[randInt(rng, 0, RARE_ELEMENTS.length - 1)]!] };
  }
  let ticket = randInt(rng, 1, 97);
  let count = 3;
  for (const type of ROOT_TYPES) {
    if (ticket <= type.weight) { count = type.n; break; }
    ticket -= type.weight;
  }
  const pool = [...FIVE];
  const selected: ElementName[] = [];
  while (selected.length < count) {
    const i = randInt(rng, 0, pool.length - 1);
    selected.push(pool.splice(i, 1)[0]!);
  }
  return { els: FIVE.filter(v => selected.includes(v)) };
}

export function rootBonus(root: Root, key: "atk" | "def" | "hp" | "exp" | "crit" | "dodge" | "regen", temper: Partial<Record<ElementName, number>> = {}): number {
  const info = rootInfo(root);
  let total = 0;
  for (const el of root.els) {
    const value = ELEMENTS[el][key];
    if (typeof value === "number") total += value * info.scale * (1 + 0.08 * (temper[el] ?? 0));
  }
  return total;
}
