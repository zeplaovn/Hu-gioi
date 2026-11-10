/* Store exact charged cost inside a receipt fingerprint without a schema
 * migration. Historical kind:key receipts still replay with unknown cost. */
'use strict';
const { GameError } = require('../errors.js');
function reused() { return new GameError('REQUEST_ID_REUSED', 'Mã yêu cầu đã dùng cho giao dịch khác.'); }
function encodePavilionReceipt(kind, key, cost) {
  if (!Number.isSafeInteger(cost) || cost < 0) throw Error('Chi phí giao dịch không hợp lệ.');
  return kind + ':' + key + '#' + cost;
}
function decodePavilionReceipt(fingerprint, kind, key) {
  // Prevent new-format "kind:key#cost" from being mistaken for a legacy
  // intent whose untrusted key itself contains the receipt separator.
  if (!['upgrade', 'relic'].includes(kind) || typeof key !== 'string' || /[:#]/.test(key))
    throw reused();
  const prefix = kind + ':' + key;
  if (fingerprint === prefix) return null; // old receipt without cost
  if (typeof fingerprint !== 'string' || !fingerprint.startsWith(prefix + '#')) throw reused();
  const amount = fingerprint.slice(prefix.length + 1);
  if (!/^(?:0|[1-9][0-9]*)$/.test(amount) || !Number.isSafeInteger(Number(amount))) throw reused();
  return Number(amount);
}
module.exports = { encodePavilionReceipt, decodePavilionReceipt };
