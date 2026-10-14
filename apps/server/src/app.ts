import Fastify from "fastify";
import { z } from "zod";
import { STATS, RACES, WORLDS, createCharacter, derivedStats, rollRoot, rootInfo, canTravel, regionById, siteById } from "../../../packages/domain/src/index.js";

const statShape = Object.fromEntries(STATS.map(s => [s, z.number().int().min(0).max(40)])) as Record<(typeof STATS)[number], z.ZodNumber>;
const createSchema = z.object({
  name: z.string().max(40),
  gender: z.enum(["Nam", "Nữ"]),
  age: z.number().int().min(14).max(30),
  race: z.enum(Object.keys(RACES) as [keyof typeof RACES, ...(keyof typeof RACES)[]]),
  alloc: z.object(statShape).partial(),
  root: z.unknown().optional(),
});

const travelSchema = z.object({ realm: z.number().int().min(0).max(99), world: z.string().min(1).max(40), region: z.string().min(1).max(40), site: z.string().min(1).max(40).optional() });

export function buildApp() {
  const app = Fastify({ logger: false, bodyLimit: 64 * 1024 });

  app.get("/api/v2/health", async () => ({ ok: true, runtime: "node", authoritative: true }));
  app.get("/api/v2/rules", async () => ({ stats: STATS, races: RACES, worlds: WORLDS }));

  app.post("/api/v2/root/roll", async () => {
    const root = rollRoot();
    return { root, info: rootInfo(root) };
  });

  app.post("/api/v2/characters", async (request, reply) => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_character", issues: parsed.error.issues });
    try {
      const character = createCharacter(parsed.data);
      return reply.code(201).send({ character, derived: derivedStats(character) });
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : "invalid_character" });
    }
  });

  app.post("/api/v2/world/travel/validate", async (request, reply) => {
    const parsed = travelSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_travel", issues: parsed.error.issues });
    const { realm, world, region, site } = parsed.data;
    if (!canTravel(realm, world, region)) return reply.code(403).send({ error: "travel_locked" });
    const targetRegion = regionById(world, region)!;
    const targetSite = site ? siteById(world, region, site) : targetRegion.sites[0] ?? null;
    if (!targetSite) return reply.code(404).send({ error: "site_not_found" });
    return { ok: true, target: { world, region, site: targetSite.id } };
  });

  app.setErrorHandler((error, _request, reply) => {
    reply.code(500).send({ error: "internal_error", requestId: reply.request.id });
    app.log.error(error);
  });

  return app;
}
