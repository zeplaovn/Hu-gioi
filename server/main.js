/* Điểm vào máy chủ: phục vụ bản game tĩnh và cổng API (hiện chỉ có /api/health).
   Chạy: npm start   (HOST, PORT tùy chọn; mặc định 127.0.0.1:8000) */
'use strict';
const http = require('node:http');
const { createRouter } = require('./http/router.js');

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 8000);
const server = http.createServer(createRouter());
server.listen(port, host, () => console.log(`Hư Giới tại http://${host}:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
