/* CPU đo tại Node24/SQLite để phát hiện regression lõi. Đây KHÔNG phải CPU Edge production. */
'use strict';
const { SqlitePlayers } = require('../server/repositories/sqlite-players.js');
const { PlayerService } = require('../server/services/player-service.js');

async function main() {
  const repo = new SqlitePlayers(':memory:');
  let clock = 1800000000000;
  const service = new PlayerService({
    repository: repo, clock: () => clock, contentVersion: 'bench',
    onError: () => { throw Error('Lỗi không xác định trong benchmark.'); }
  });
  const owner = '11111111-2222-4333-8444-555555555555';
  const pv = await service.previewCreation(owner);
  const made = await service.createPlayer(owner, {
    ticketId: pv.ticketId, name: 'Bạch Tiêu Phong', gender: 'nam', talent: { ngoTinh: 8 }, destiny: 'exp'
  });
  const cpuMicroseconds = [];
  const sync = [];
  const command = [];
  for (let i = 0; i < 40; i++) {
    clock += 20000;
    const cpu1 = process.cpuUsage(), wall1 = performance.now();
    await service.sync(owner, made.playerId);
    sync.push({ cpuMs: (process.cpuUsage(cpu1).user + process.cpuUsage(cpu1).system) / 1000, wallMs: performance.now() - wall1 });
    clock += 1000;
    const cpu2 = process.cpuUsage(), wall2 = performance.now();
    const state = await service.bootstrap(owner);
    // Không tự tạo intent: state+revision chỉ dùng trong benchmark cục bộ.
    await service.command(owner, made.playerId, {
      protocolVersion: 2, requestId: 'bench-' + i, expectedRevision: state.player.revision,
      type: 'setPreference', payload: { key: 'music', value: i % 2 === 0 }
    });
    command.push({ cpuMs: (process.cpuUsage(cpu2).user + process.cpuUsage(cpu2).system) / 1000, wallMs: performance.now() - wall2 });
  }
  const summarise = results => {
    const percent = key => {
      const sorted = results.map(x => x[key]).sort((a, b) => a - b);
      return +sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * .95) - 1)].toFixed(2);
    };
    return { count: results.length, p95CpuMs: percent('cpuMs'), p95WallMs: percent('wallMs') };
  };
  const out = { platform: 'Node24/SQLite local CI proxy, not Deno CPU', sync: summarise(sync), command: summarise(command) };
  await repo.close();
  console.log(JSON.stringify(out, null, 2));
  if (out.sync.p95CpuMs >= 2000 || out.command.p95CpuMs >= 2000)
    throw Error('Độ trễ CPU lõi vượt ngưỡng 2 giây trên Node, cần điều tra trước Edge.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
