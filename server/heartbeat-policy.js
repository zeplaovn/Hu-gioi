/* Chính sách heartbeat online — MỘT nguồn số cho PlayerService, limiter và test.
   5 giây = 12 lượt/phút; jitter -30% = 17,15 lượt/phút.
   24/phút chừa ~40% dự phòng; grace 20s > 3×6,5s. */
'use strict';
const HEARTBEAT = Object.freeze({
  nextSyncInMs: 5000,
  onlineGraceMs: 20000,
  sync: Object.freeze({ capacity: 8, perMinute: 24 }),
  pause: Object.freeze({ capacity: 3, perMinute: 6 })
});
function onlineGrace(raw) {
  if (raw === undefined || raw === null || raw === '') return HEARTBEAT.onlineGraceMs;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < HEARTBEAT.nextSyncInMs * 3)
    throw Error('HU_ONLINE_GRACE_MS phải >= 3 lần chu kỳ sync (15000 ms).');
  return value;
}
module.exports = { HEARTBEAT, onlineGrace };
