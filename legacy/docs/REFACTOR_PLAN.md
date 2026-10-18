# Refactor Plan — Khi project lớn hơn

Đây là kế hoạch refactor **không phá runtime hiện tại**. Không phải backlog bắt buộc; chỉ áp dụng khi feature growth tạo pain thật.

## Hiện trạng

Một số file đã trở thành hotspot tự nhiên:

```text
js/systems/idle.js      ~40 KB
js/systems/meta.js      ~37 KB
js/core/game.js         ~29 KB
js/systems/sect.js      ~28 KB
js/online/auth.js       ~22 KB
```

Kích thước không tự động đồng nghĩa với code xấu, nhưng đây là các file cần review đầu tiên nếu conflict/bug/testability bắt đầu tăng.

## Phase 0 — Giữ ổn định

Trước khi tách module:

- thêm regression test cho behavior sắp sửa;
- xác định API mà code khác đang gọi trên namespace `TT`;
- không đổi tên file + đổi logic + đổi data format trong cùng một commit lớn;
- giữ backward compatibility cho save format.

## Phase 1 — Tách data khỏi behavior

Ưu tiên các file đang trộn config/data lớn với action runtime.

Ví dụ:

```text
idle.js
  -> idle_data.js        dữ liệu/công thức thuần
  -> idle.js             state/actions runtime
```

Pattern này đã có một phần và nên tiếp tục cho feature lớn khác.

Ứng viên:

```text
meta.js
  -> meta_data.js
  -> achievements.js
  -> legacy.js / reincarnation.js (khi feature đủ lớn)

sect.js
  -> sect_data.js
  -> sect_missions.js
  -> sect_shop.js
```

Chỉ tách khi mỗi phần có trách nhiệm và test riêng.

## Phase 2 — Tách domain action khỏi UI

`core/game.js` nên dần trở thành orchestration thay vì chứa mọi action.

Mục tiêu:

```text
core/
  player.js
  progression.js
  combat.js
  inventory.js
  shop.js
  game.js          orchestration/public API
```

Không cần tạo tất cả file cùng lúc. Mỗi lần sửa sâu một domain, tách domain đó nếu lợi ích rõ.

## Phase 3 — Auth/online modules

Nếu online feature tiếp tục tăng:

```text
js/online/
  config.js
  http.js
  session.js
  cloud_save.js
  leaderboard.js
  auth_ui.js
  server_status.js
```

Hiện tại `cloud.js`/`auth.js` vẫn chấp nhận được, nhưng Auction/Trade/notifications/admin-related player status không nên tiếp tục nhồi vào hai file này.

Network primitive (`fetch`, token refresh, RPC wrapper) nên có ownership duy nhất để tránh mỗi feature tự xử lý Auth theo cách khác nhau.

## Phase 4 — Feature folders

Chỉ áp dụng khi một feature có data + logic + UI riêng đủ lớn.

Ví dụ tương lai:

```text
js/features/secret_realms/
  data.js
  logic.js
  ui.js

js/features/reincarnation/
  data.js
  logic.js
  ui.js
```

Không chuyển tất cả hệ thống hiện tại sang `features/` trong một lần. Cho phép cấu trúc cũ và mới cùng tồn tại trong giai đoạn chuyển đổi.

## Phase 5 — ES modules

Chỉ nên làm khi dependency bằng `<script>` trở thành bottleneck thật.

Điều kiện nên có trước:

- test coverage đủ cho feature quan trọng;
- build pipeline ổn định;
- public API trên `TT` đã tương đối rõ;
- save compatibility test;
- deployment staging.

Khi chuyển:

```text
src/
  core/
  features/
  ui/
  platform/
```

rồi bundle về production output. Không chuyển nửa dự án sang import/export trong khi nửa còn lại phụ thuộc global load order nếu không có kế hoạch bridge rõ.

## Dashboard

Dashboard hiện vẫn nhỏ, nhưng khi thêm moderation/economy/auction nên tách `app.js` theo `Hu-gioi-dashboard/docs/ARCHITECTURE.md`.

Ưu tiên module hóa dashboard trước khi thêm framework. Framework chỉ cần khi state/UI complexity thực sự đòi hỏi.

## Wiki

Wiki phẳng vẫn hợp lý. Chỉ cần static-site generator/shared layout khi số trang tăng đến mức copy navigation/header trở thành maintenance burden.

## Thứ tự ưu tiên thực tế

Nếu phát triển tiếp ngay hôm nay, ưu tiên refactor theo pain:

1. domain nào đang được sửa để làm feature mới;
2. file nào gây conflict thường xuyên;
3. code nào khó test vì trộn DOM + game rule;
4. online code nếu thêm nhiều RPC/session behavior;
5. cuối cùng mới đổi module system/framework.

Refactor tốt là refactor giảm coupling hoặc tăng testability; không phải chỉ làm cây thư mục trông đẹp hơn.
