-- Giới hạn lời truyền âm còn 80 ký tự. NOT VALID: áp dụng cho mọi tin mới, không quét/xóa tin cũ dài hơn.
ALTER TABLE game.world_chat_messages
  ADD CONSTRAINT world_chat_messages_body_max80 CHECK (length(body) <= 80) NOT VALID;

-- Chỉ chữ ASCII, chữ tiếng Việt (NFC), chữ số; giữa các từ đúng 1 dấu cách. NOT VALID: không quét tin cũ.
ALTER TABLE game.world_chat_messages
  ADD CONSTRAINT world_chat_messages_body_charset CHECK (
    body ~ '^[0-9A-Za-zÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ]+( [0-9A-Za-zÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ]+)*$'
  ) NOT VALID;
