/* Logger JSON một dòng. Không ghi mật khẩu, token, cookie hay payload lệnh; chỉ ghi metadata. */
'use strict';
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

function createLogger({ level = 'info', write = line => process.stdout.write(line + '\n'), now = Date.now } = {}) {
  const threshold = LEVELS[level] ?? LEVELS.info;
  const log = (name, message, fields) => {
    if (LEVELS[name] < threshold) return;
    write(JSON.stringify({ t: new Date(now()).toISOString(), level: name, msg: message, ...fields }));
  };
  return {
    debug: (m, f) => log('debug', m, f),
    info: (m, f) => log('info', m, f),
    warn: (m, f) => log('warn', m, f),
    error: (m, f) => log('error', m, f)
  };
}
const silentLogger = createLogger({ level: 'silent' });

module.exports = { createLogger, silentLogger };
