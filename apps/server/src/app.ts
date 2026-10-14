import Fastify from "fastify";
import { z } from "zod";
import { STATS, RACES, WORLDS, createCharacter, derivedStats, rollRoot, rootInfo, canTravel, regionById, siteById } from "../../../packages/domain/src/index.js";
import { StaticAuthVerifier, type AuthContext, type AuthVerifier } from "./auth.js";
import { MemoryGameStateRepository, type GameStateRepository } from "./state.js";

const statShape = Object.fromEntries(STATS.map(s => [s, z.number().int().min(0).max(40)])) as Record<(typeof STATS)[number], z.ZodNumber>;
const createSchema = z.object({
  revision: z.number().int().min(0),
  name: z.string().max(40),
  gender: z.enum(["Nam", "Nữ"]),
  age: z.number().int().min(14).max(30),
  race: z.enum(Object.keys(RACES) as [keyof typeof RACES, ...(keyof typeof RACES)[]]),
  alloc: z.object(statShape).partial(),
}).strict();

const travelSchema = z.object({
  revision: z.number().int().min(0),
  world: z.string().min(1).max(40),
  region: z.string().min(1).max(40),
  site: z.string().min(1).max(40).optional(),
}).strict();

export interface AppDependencies {
  auth: AuthVerifier;
  state: GameStateRepository;
}

export function buildApp(deps: Partial<AppDependencies> = {}) {
  const auth = deps.auth ?? new StaticAuthVerifier();
  const state = deps.state ?? new MemoryGameStateRepository();
  const app = Fastify({ logger: false, bodyLimit: 64 * 1024 });

  const requireAuth = async (header: string | undefined): Promise<AuthContext | null> => auth.verifyAuthorization(header);

  app.get("/api/v2/health", async () => ({ ok: true, runtime: "node", authoritative: true }));
  app.get("/api/v2/rules", async () => ({ stats: STATS, races: RACES, worlds: WORLDS }));

  app.post("/api/v2/root/roll", async (request, reply) => {
    const session = await requireAuth(request.headers.authorization);
    if (!session) return reply.code(401).send({ error: "unauthorized" });
    const root = rollRoot();
    return { root, info: rootInfo(root) };
  });

  app.get("/api/v2/state", async (request, reply) => {
    const session = await requireAuth(request.headers.authorization);
    if (!session) return reply.code(401).send({ error: "unauthorized" });
    const stored = await state.get(session);
    return { revision: stored.revision, state: stored.state, derived: stored.state.character ? derivedStats(stored.state.character) : null };
  });

  app.post("/api/v2/characters", async (request, reply) => {
    const session = await requireAuth(request.headers.authorization);
    if (!session) return reply.code(401).send({ error: "unauthorized" });
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_character", issues: parsed.error.issues });
    try {
      const current = await state.get(session);
      if (current.revision !== parsed.data.revision) return reply.code(409).send({ error: "state_conflict", revision: current.revision });
      if (current.state.character) return reply.code(409).send({ error: "character_exists", revision: current.revision });
      const character = createCharacter(parsed.data);
      const saved = await state.compareAndSet(session, current.revision, { ...current.state, character });
      return reply.code(201).send({ revision: saved.revision, character, derived: derivedStats(character) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "invalid_character";
      if (message === "state_conflict") return reply.code(409).send({ error: message });
      return reply.code(400).send({ error: message });
    }
  });

  app.post("/api/v2/world/travel", async (request, reply) => {
    const session = await requireAuth(request.headers.authorization);
    if (!session) return reply.code(401).send({ error: "unauthorized" });
    const parsed = travelSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_travel", issues: parsed.error.issues });
    const current = await state.get(session);
    if (current.revision !== parsed.data.revision) return reply.code(409).send({ error: "state_conflict", revision: current.revision });
    const character = current.state.character;
    if (!character) return reply.code(404).send({ error: "character_not_found" });
    const { world, region, site } = parsed.data;
    if (!canTravel(character.realm, world, region)) return reply.code(403).send({ error: "travel_locked" });
    const targetRegion = regionById(world, region);
    if (!targetRegion) return reply.code(404).send({ error: "region_not_found" });
    const targetSite = site ? siteById(world, region, site) : targetRegion.sites[0] ?? null;
    if (!targetSite) return reply.code(404).send({ error: "site_not_found" });
    const nextCharacter = { ...character, world, region, site: targetSite.id };
    try {
      const saved = await state.compareAndSet(session, current.revision, { ...current.state, character: nextCharacter });
      return { revision: saved.revision, character: nextCharacter, derived: derivedStats(nextCharacter) };
    } catch (error) {
      if (error instanceof Error && error.message === "state_conflict") return reply.code(409).send({ error: "state_conflict" });
      throw error;
    }
  });

  app.setErrorHandler((error, request, reply) => {
    reply.code(500).send({ error: "internal_error", requestId: request.id });
    app.log.error(error);
  });

  return app;
}
