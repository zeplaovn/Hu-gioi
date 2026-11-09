/* Phiên bản nội dung = băm data/ + engine/ tại thời điểm khởi động. Client lệch phiên bản phải tải lại. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function listJs(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(e => {
    const file = path.join(dir, e.name);
    return e.isDirectory() ? listJs(file) : e.name.endsWith('.js') ? [file] : [];
  });
}
function computeContentVersion(root = path.resolve(__dirname, '..')) {
  const hash = crypto.createHash('sha256');
  for (const dir of ['data', 'engine']) {
    for (const file of listJs(path.join(root, dir))) {
      hash.update(path.relative(root, file).split(path.sep).join('/')).update('\0').update(fs.readFileSync(file)).update('\0');
    }
  }
  return hash.digest('hex').slice(0, 16);
}
module.exports = { computeContentVersion };
