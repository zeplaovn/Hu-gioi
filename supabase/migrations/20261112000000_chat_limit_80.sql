-- Giới hạn lời truyền âm còn 80 ký tự. NOT VALID: áp dụng cho mọi tin mới, không quét/xóa tin cũ dài hơn.
ALTER TABLE game.world_chat_messages
  ADD CONSTRAINT world_chat_messages_body_max80 CHECK (length(body) <= 80) NOT VALID;
