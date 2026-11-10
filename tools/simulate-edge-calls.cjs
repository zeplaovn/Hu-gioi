/* Ngân sách Edge Function free-tier: mô phỏng một tháng 30 ngày.
 * Chạy node tools/simulate-edge-calls.cjs [users activeHours idleHours]
 * Không nhân đôi request: lệnh thành công làm mới presence => skip sync trong 20 s.
 * Thời gian tab ẩn không gọi sync; pause 1 lần khi rời/ẩn.
 */
'use strict';
const args = process.argv.slice(2).map(Number);
const users = Number.isInteger(args[0]) && args[0] > 0 ? args[0] : 50;
const activeHours = Number.isFinite(args[1]) && args[1] >= 0 ? args[1] : 1;
const idleHours = Number.isFinite(args[2]) && args[2] >= 0 ? args[2] : 0.5;
const SYNC_MS = 20000, MONTH_DAYS = 30, QUOTA = 500000;
function session(hours, { commandEveryMs = 0 } = {}) {
  const durationMs = Math.floor(hours * 3600000);
  let calls = 1; // bootstrap trả snapshot (hoặc trả chưa có nhân vật)
  let lastCommandAt = -Infinity;
  let commands = 0, syncs = 0;
  for (let t = 1000; t < durationMs; t += 1000) {
    if (commandEveryMs && (t % commandEveryMs === 0)) {
      lastCommandAt = t;
      commands++;
    }
    if (t % SYNC_MS === 0 && (t - lastCommandAt >= SYNC_MS)) syncs++;
  }
  calls += commands + syncs;
  if (durationMs > 0) calls++; // pause khi rời tab
  return { calls, commands, syncs };
}
const active = session(activeHours, { commandEveryMs: 30000 });
const idle = session(idleHours);
const monthly = users * MONTH_DAYS * (active.calls + idle.calls);
const report = {
  model: '30 days, 20s heartbeat, 60s grace, command every 30s active',
  users, activeHoursPerDay: activeHours, idleHoursPerDay: idleHours,
  activeCallsPerPlayerHour: activeHours ? Math.ceil((active.commands + active.syncs) / activeHours) : 0,
  idleCallsPerPlayerHour: idleHours ? Math.ceil(idle.syncs / idleHours) : 0,
  active, idle, monthlyCalls: monthly, freeQuota: QUOTA,
  monthlyUtilizationPct: +(monthly / QUOTA * 100).toFixed(1),
  fitsFree: monthly <= QUOTA,
  note: 'Chưa gồm đăng ký, retry, đổi thiết bị, requests giả mạo hoặc admin; vượt quota khi nhiều người treo tab lâu.'
};
console.log(JSON.stringify(report, null, 2));
if (activeHours && report.activeCallsPerPlayerHour > 300) process.exitCode = 1;
if (idleHours && report.idleCallsPerPlayerHour > 180) process.exitCode = 1;
