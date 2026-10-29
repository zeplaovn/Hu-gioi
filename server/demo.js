'use strict';
const { createDemoServer } = require('./chat/demo-server.js');
const host = process.env.HOST || '127.0.0.1', port = Number(process.env.PORT || 8000);
const server = createDemoServer();
server.on('error', error => { console.error('Không thể mở chat demo:', error.message); process.exitCode = 1; });
server.listen(port, host, () => console.log(`Hư Giới + chat demo: http://${host}:${server.address().port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { server.closeAllConnections(); server.close(); });
