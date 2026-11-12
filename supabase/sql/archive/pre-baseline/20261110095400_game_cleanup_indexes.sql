-- B1: chỉ số phục vụ cleanup cơ hội theo người chơi/tài khoản, không sửa migration đã deploy.
-- Có thể chạy lặp lại an toàn; chỉ tác động cấu trúc index, không thay đổi schema V9.
CREATE INDEX IF NOT EXISTS game_player_receipts_player_expires
  ON game.player_receipts (player_id, expires_at);
CREATE INDEX IF NOT EXISTS game_creation_tickets_owner_expires
  ON game.creation_tickets (owner_id, expires_at);
