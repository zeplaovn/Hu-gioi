/* Điểm vào máy chủ: phục vụ bản game tĩnh + API (/api/*). Chạy: npm start   (HOST, PORT, SECURE_COOKIES… xem server/config.js) */
'use strict';
const http = require('node:http');
const { createApp } = require('./app.js');

const app = createApp();
const server = http.createServer(app.handler);
server.requestTimeout = 15000;
server.headersTimeout = 10000;
app.outbox.start();
server.listen(app.config.port, app.config.host, () => {
  console.log(`Hư Giới tại http://${app.config.host}:${app.config.port}`);
  if (!app.deps.engine.READY) console.warn(`Engine chưa READY (${app.deps.engine.MISSING.length} mục thiếu): API gameplay trả 501 ENGINE_NOT_READY.`);
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { app.outbox.stop(); server.close(() => process.exit(0)); });
