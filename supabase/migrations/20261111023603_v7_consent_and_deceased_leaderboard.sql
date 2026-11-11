-- Hư Giới: v7 chấp thuận chính sách (chat 4 kênh, bắt đầu lại từ đầu).
-- Giữ lại mọi phiên bản cũ để lịch sử đồng ý vẫn được đối soát.
ALTER TABLE public.policy_acceptances
  DROP CONSTRAINT policy_acceptances_policy_version_check,
  ADD CONSTRAINT policy_acceptances_policy_version_check
    CHECK (policy_version IN (
      '2026-11-09','2026-11-09-v2','2026-11-09-v3','2026-11-09-v4',
      '2026-11-10-v5','2026-11-11-v6','2026-11-11-v7'
    ));
-- Không hiển thị nhân vật đã tử vong trong các bảng xếp hạng.
DELETE FROM game.player_leaderboard l
USING game.players p
WHERE p.id = l.player_id
  AND p.state->'death' IS NOT NULL
  AND p.state->'death' <> 'null'::jsonb;
