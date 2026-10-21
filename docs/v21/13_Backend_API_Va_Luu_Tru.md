# Hợp đồng backend và lưu trữ

## Deliverable kỹ thuật

07_BACKEND/openapi.json mô tả62 route; schema.sql tạo được database SQLite tham chiếu với khóa/constraint/index; service_reference.py chạy các giao dịch cốt lõi; error_catalog.json chuẩn hóa lỗi. Đây là mã tham chiếu kiểm được cục bộ, chưa là HTTP server đã triển khai, hệ đăng nhập production hoặc bằng chứng chịu tải.

API lấy account_id/server_id/current_life từ phiên xác thực phía server. Body không nhận balance, reward, rarity, RNG hoặc cờ completed do client tự khai. Session bearer phải được kiểm chữ ký/hết hạn và quyền account trước domain handler; không lấy thông tin tài khoản từ query để quyết định ownership. Không đưa endpoint internal game_events hoặc craft_finish ra mạng công khai.

## Quote và idempotency

Quote sống tối đa300 giây, khóa config_version cùng version ví/item/auction/life. Xác nhận kiểm alive/owner/quota/thời gian và fingerprint payload trong cùng giao dịch. Cùng account+request_id và cùng payload trả biên nhận bất biến; cùng key khác payload là409. Không bỏ guard để retry. Các thao tác có phí/vật tư phải rollback toàn bộ nếu một điều kiện sai.

Lưu quote/outcome riêng; GET job chỉ trả trạng thái, thời điểm xong và thông tin recipe công khai, không trả private_outcome_json trước hoàn tất. Tỷ lệ/RNG do server quản; client không gửi seed. Worker có request_id cố định theo job để chạy lại không nhân output.

## Schema và số lớn

Ví lưu chuỗi thập phân chuẩn tối đa78 chữ số trong schema tham chiếu; mã dùng Python int, tuyệt đối không SUM/CAST sang floating point trong SQL. Database production có thể dùng kiểu số nguyên chính xác tương đương; giữ cùng constraint và giao dịch. Ledger bất biến: không UPDATE/DELETE, điều chỉnh bằng bút toán mới. Item đã tiêu/mất giữ tombstone location consumed/lost để lịch sử đấu giá không bị khóa ngoại gãy.

Một nhân vật sống/tài khoản, một cây hoạt động/ô, một job hoạt động/nghề, một bid HELD/phiên và một escrow HELD/owner được bảo vệ bằng index. Daily/weekly claim theo account; quan hệ, vật phẩm và job theo life. Thông tin tri thức recipe và TM tài khoản giữ riêng khỏi nghề của kiếp.

## Phạm vi mã tham chiếu

service_reference.py thực thi ví/đổi tiền, học recipe, nhận nhiệm vụ, sự kiện nội bộ, trả thưởng, bắt đầu/kết thúc craft và đóng đời không có auction đang hoạt động. Khi có auction, code tham chiếu từ chối đóng đời nếu chưa gọi handler escrow, để không âm thầm mất tiền người khác. Hợp đồng auction/death đầy đủ và ca kiểm bắt buộc nằm trong TRANSACTION_PROTOCOLS.md; không coi phần chưa có HTTP adapter là endpoint đã chạy.

Bản production thực hiện tất cả handler theo OpenAPI và protocol, đồng thời nối auth/session, worker, catalog version, ảnh/icon và client. Những việc đó là triển khai sản phẩm từ đặc tả này; không được ghi PASS production chỉ vì schema hoặc reference tests chạy.

## Đồng thời, lỗi và khôi phục

Thứ tự khóa: quota account→life theo ID tăng→wallet theo currency→item theo ID→auction/plot/job. SQLite reference dùng BEGIN IMMEDIATE để kiểm đúng rollback và idempotency; không dùng đó làm số đo tải server nhiều người. Transaction gửi outbox; worker xử lý at-least-once với unique source_operation. Tránh gọi dịch vụ ngoài giữa lúc giữ khóa DB.

503 retry cùng key;409 version/quote yêu cầu xin quote mới;403 không tự nâng quyền;429 hiện kỳ reset của server. Túi đầy không xóa cây/output; output vật lý ở inbox vẫn mất khi chết. Backup cần giữ balances+ledger+operations+escrow+jobs nhất quán cùng snapshot; phục hồi xong đối chiếu bất biến trước mở giao dịch.

## Quan sát và vận hành

Log operation_id, config_version, lý do cộng/trừ, life, server và thời gian; không log bearer hoặc seed RNG nội bộ. Metric: tiền phát/sink theo từng currency, số bid giữ/hoàn, job quá hạn, outbox pending, duplicate retries, fail recipe, từ chối quota, tỷ lệ mất output và tử vong. Có cờ khóa mutation theo feature khi bảo toàn tài sản bị vi phạm; đọc trạng thái và nhận biên nhận vẫn hoạt động.
