# Đợt 1 / Nền vòng đời: tọa hóa chỉ sau xác nhận online

Phụ thuộc [PR #30](https://github.com/zeplaovn/Hu-gioi/pull/30) và bộ dữ liệu v1.6.1. Chỉ sửa quy tắc tử vong vì thọ nguyên; đại đột phá, kinh tế và mọi luật khác giữ nguyên.

## Dữ liệu và công thức

- Bảng `game.lifespan_intents`: `intent_id`, `life_id`, `created_at`, `expires_at`, `consumed_at`, `outcome`. Một kiếp chỉ có tối đa một intent chưa dùng. RLS `ENABLE + FORCE`, không policy; chỉ `service_role` được quyền truy cập.
- Không backfill hay thay tài sản người chơi. Trạng thái cạn thọ nguyên được **suy ra** từ `credited_s` và `lifespan_cap(stage_idx)`, nên save cũ được bảo toàn.
- Trần thời gian được tính: `cap_seconds = lifespan_cap_years / use_years_per_credited_day * 86400`; cạn khi `credited_s >= cap_seconds - 1e-6`.
- `settle_life` vẫn giới hạn phần thời gian được tính, thưởng tầng 1–8 và dừng tầng 9 theo XP v1.6.1; **không** gọi `end_life` khi thọ nguyên cạn.
- Khi nhân vật đã cạn, chủ nhân có thể đột phá nếu đủ điều kiện để mở trần thọ nguyên mới, hoặc chủ động tọa hóa. Không có job nền thực thi tử vong.

## RPC, API, UI

| RPC (schema `game`) | API | Luật |
|---|---|---|
| `get_state` (wrapper `get_state_v161`) | `GET /state` | Trả `life.lifespan.exhausted`, `pending_lifespan_intent` |
| `lifespan_prepare(account)` | `POST /lifespan/prepare` | Khóa life, xét cạn, ghi intent 120 giây; tự hủy intent trước |
| `lifespan_confirm(account,intent)` | `POST /lifespan/confirm` | Khóa life rồi intent, xác minh sở hữu/TTL/trạng thái, tiêu intent; gọi `end_life('lifespan')` một lần |

Edge `auth.getUser` xác minh Bearer JWT; chỉ chuyển `p_account` từ token, input chỉ có UUID intent ở bước 2. SQL chạy trong transaction của RPC, kiểm quyền sở hữu theo account/life, và bảng intent khóa replay. Rate limit 6 yêu cầu/phút cho nhóm `lifespan`.

Giao diện hiển thị cảnh báo trong bảng nhập định; dùng `createDialog`, checkbox xác nhận mất tài sản và nút từ chối. Mobile dùng cùng layout dialog đã có. Không render HTML từ chuỗi mạng.

## Test và rollback

- DB: dừng lúc cap sau offline, không mất tài sản/TM; chưa cạn bị từ chối; đúng owner, sai owner; supersede, expiry, replay; chỉ confirm mới xóa tài sản; giữ TM/stat.
- API: JWT, lỗi 400/404/409/429, UUID, không tin `p_account` ở body. Web: trạng thái cạn, gọi intent, hiển thị lỗi.
- Chạy `pnpm gen:check`, `pnpm test`, `pnpm build:web`; chụp 1366px/390px trước merge.
- Rollback **không tự động đảo migration** sau khi đã có người tọa hóa. Để tắt UI/route, revert commit ứng dụng; giữ bảng intent và các bản ghi `life_history` đã chốt. Nếu cần khôi phục luật cũ, chỉ phát hành migration mới sau khi sao lưu và chấp thuận; tuyệt đối không xóa lịch sử hoặc hồi sinh tài sản.
