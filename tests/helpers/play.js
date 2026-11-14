/* Bộ dựng nhỏ cho test: dịch vụ + kho in-memory + đồng hồ giả + nhân vật mẫu. */
'use strict';
const C = require('../../engine/protocol/commands.js');
const { MemoryPlayers } = require('./memory-players.js');
const { PlayerService } = require('../../server/services/player-service.js');
const { DailyService } = require('../../server/services/daily-service.js');

async function setup(owner = 'owner-1') {
  const repo = new MemoryPlayers(), clock = { now: 1_800_000_000_000 };
  const service = new PlayerService({ repository: repo, clock: () => clock.now, contentVersion: 'test', onError: e => { throw e; } });
  const daily = new DailyService({ repository: repo, playerService: service, clock: () => clock.now, contentVersion: 'test' });
  const ctx = { repo, service, daily, clock, owner, id: null, rev: 0, n: 0 };
  ctx.create = async (name = 'Vân Lam', extra = {}) => {
    const ticket = await service.previewCreation(owner);
    const made = await service.createPlayer(owner, { ticketId: ticket.ticketId, name, gender: 'nu', talent: { ngoTinh: 8 }, ...extra });
    ctx.id = made.playerId; ctx.rev = made.revision; return made;
  };
  /* Gửi một lệnh đúng quy trình: requestId mới, expectedRevision hiện tại, tự cập nhật revision. */
  ctx.cmd = async (type, payload = {}) => {
    const out = await service.command(owner, ctx.id, { protocolVersion: C.VERSION, requestId: 'req-' + String(++ctx.n).padStart(8, '0'), expectedRevision: ctx.rev, type, payload });
    ctx.rev = out.revision; return out;
  };
  ctx.tick = async (seconds = 20) => { ctx.clock.now += seconds * 1000; const out = await service.sync(owner, ctx.id, {}); ctx.rev = out.revision; return out; };
  ctx.state = async () => (await repo.get(ctx.id)).state;
  /* Sửa trực tiếp state trong kho để dựng tình huống (ví dụ nhiều linh thạch, hết thọ nguyên). */
  ctx.patch = async fn => {
    const rec = await repo.get(ctx.id);
    await repo.transact(ctx.id, async () => {
      const state = structuredClone(rec.state); fn(state);
      return { save: { state, revision: rec.revision + 1, rngCounter: rec.rngCounter, lastSeenAt: ctx.clock.now, schemaVersion: rec.schemaVersion, contentVersion: 'test' }, value: null };
    });
    ctx.rev = rec.revision + 1;
  };
  return ctx;
}
module.exports = { setup, C };
