-- Hư Giới: phiên bản chính sách 11/11/2026-v6 mô tả chat và bảng xếp hạng thật.
-- Mở rộng danh sách version được phép, giữ nguyên v1-v5 và tất cả xác nhận cũ.
ALTER TABLE public.policy_acceptances
  DROP CONSTRAINT policy_acceptances_policy_version_check,
  ADD CONSTRAINT policy_acceptances_policy_version_check
    CHECK (policy_version IN (
      '2026-11-09', '2026-11-09-v2', '2026-11-09-v3',
      '2026-11-09-v4', '2026-11-10-v5', '2026-11-11-v6'
    ));