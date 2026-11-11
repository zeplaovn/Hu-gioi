'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

test('chính sách hiển thị quyền của người chơi, không yêu cầu gọi API thủ công', () => {
  const privacy = read('client/legal/privacy.html');
  assert.match(privacy, /Chính sách quyền riêng tư/);
  assert.match(privacy, /91\/2025\/QH15/);
  assert.match(privacy, /356\/2025\/NĐ-CP/);
  assert.match(privacy, /yêu cầu xóa dữ liệu/);
  assert.match(privacy, /mailto:zeplaovn@proton\.me/);
  assert.doesNotMatch(privacy, /(?:GET|POST)\s+\/api\//);
  assert.doesNotMatch(privacy, /delete-my-(?:game-data|account)/);
});

test('điều khoản và hướng dẫn cùng mô tả tiến trình tạm dừng khi rời game', () => {
  const terms = read('client/legal/release.html');
  const settings = read('client/ui/screens/settings.js');
  const loader = read('client/platform/loader.js');
  assert.match(terms, /Không có phần thưởng tích lũy khi ngoại tuyến/);
  assert.match(terms, /Một đạo thân|hành trình|trọng sinh/);
  assert.match(settings, /Nghề phụ.*tạm dừng/);
  assert.match(settings, /Nhiệm vụ tông môn.*chỉ tiếp tục tính thời gian/);
  assert.match(loader, /Nghề phụ tạm dừng khi rời game/);
  assert.doesNotMatch(settings + loader, /Nghề phụ vẫn (?:chạy|hoạt động) khi (?:bạn )?(?:offline|vắng mặt)/);
});

test('màn đồng ý giữ hai ô lựa chọn riêng và lời thoại không lộ thuật ngữ kỹ thuật', () => {
  const html = read('index.html');
  const auth = read('client/auth/auth.js');
  const provider = read('client/auth/supabase.js');
  const loader = read('client/platform/loader.js');
  assert.match(html, /id="authPrivacy" type="checkbox" required/);
  assert.match(html, /id="authRelease" type="checkbox" required/);
  assert.match(html, /id="authConsentPrivacy" type="checkbox"/);
  assert.match(html, /id="authConsentRelease" type="checkbox"/);
  assert.match(html, /Chính sách quyền riêng tư/);
  assert.doesNotMatch(html, /bản ghi chấp thuận chính sách hiện hành/);
  assert.doesNotMatch(auth, /Không kết nối được Supabase/);
  assert.doesNotMatch(provider, /data\?\.(?:msg|message|error_description)\s*\|\|/);
  assert.doesNotMatch(loader, /(?:đang khởi tạo engine|Engine chưa sẵn sàng|xác thực engine)/);
});
