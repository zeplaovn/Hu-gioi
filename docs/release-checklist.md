# Checklist phát hành thử nghiệm giới hạn

> Trạng thái: Hiện hành. Tất cả mục chưa hoàn thành; chỉ chủ dự án có thể xác nhận bằng bằng chứng ngoài Git.

- [ ] **1. Cloudflare Workers Builds:** Mở log Workers Builds của `hugioi`, tìm nguyên nhân, gửi log đã che secret để sửa build hoặc Dashboard đúng chỗ; không suy luận chỉ từ build local.
- [ ] **2. Deploy Edge thủ công:** Tạo GitHub Actions Secret `SUPABASE_ACCESS_TOKEN`; sau khi check xanh, tự chạy workflow `.github/workflows/edge-bundle-build.yml` bằng `workflow_dispatch`. Không dán secret vào chat hoặc repo.
- [ ] **3. Consent và index migration:** Xác minh bằng truy vấn đọc constraint `public.policy_acceptances.policy_version` cho `2026-11-10-v5`; xác nhận backup và lịch sử migration rồi mới phê duyệt áp dụng `supabase/migrations/20261110095400_game_cleanup_indexes.sql` lên database thật. Không chạy lại migration một cách mù quáng.
- [ ] **4. Edge environment:** Xác minh `SUPABASE_URL`, cấu hình `HU_DB_POOLER_URL` đúng transaction pooler cổng 6543 và `HU_ALLOWED_ORIGINS` theo origin frontend được phép (không dùng wildcard).
- [ ] **5. Supabase Auth:** Xác minh và cấu hình giới hạn tốc độ đăng nhập/đăng ký/email, CAPTCHA, xác nhận email, Site URL và redirect allowlist trong Dashboard.
- [ ] **6. Hạn mức/cảnh báo:** Cấu hình cảnh báo số lượt gọi Edge Functions và dung lượng PostgreSQL. Edge API công khai nên request rác vẫn có thể được tính vào hạn mức.
- [ ] **7. Branch protection:** Bắt buộc `security`, `browser-proof` và `Workers Builds: hugioi` xanh trước merge; không bỏ qua check đỏ để phát hành.
- [ ] **8. Smoke sau deploy:** Kiểm staging/production bằng tài khoản thử riêng: OPTIONS/JWT/consent, bootstrap, preview, tạo nhân vật, vài lệnh, idle, reload, API 503/retry, metrics, rollback. Không thao tác trên tài khoản người chơi thật.
- [ ] **9. Duyệt gameplay:** Chủ dự án duyệt 30 P0 và 14 P1 trong [sổ quyết định](gameplay-decisions.md), cùng [bản nháp cao giới](content-draft-realms-5-13.md) và [sách nghề](profession-manuals-proposal.md); ngoài phạm vi phát hành thử nghiệm.

**Không tự tích ô nào khi chưa có bằng chứng.** Xem [runbook Edge](edge-deployment.md).
