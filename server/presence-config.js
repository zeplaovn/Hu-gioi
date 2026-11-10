/* Nhịp heartbeat do Node quyết định; FE đọc nextSyncInMs trong phản hồi API. */
'use strict';
const SYNC_INTERVAL_MS = 5000;
const ONLINE_GRACE_MS = 15000;
module.exports = { SYNC_INTERVAL_MS, ONLINE_GRACE_MS };
