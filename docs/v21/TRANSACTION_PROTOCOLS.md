# Giao thức giao dịch theo tính năng

| Handler | Khóa và kiểm tra | Commit duy nhất | Không được làm |
|---|---|---|---|
| Exchange | life alive, quyền giới, hai ví, amount nguyên đủ bội | debit+credit+hai ledger+receipt | làm tròn/đổi ngầm khi mua |
| NPC buy/sell | life, stock/account quota, ví, item ownership/bind, price_book | tiền+item+quota+receipt | bán đồ khóa hoặc trả giá cao hơn trần |
| Garden unlock/sow | life, plot version, cảnh giới, ô trước, ví/hạt | mở ô hoặc tạo một crop_cycle | mở miễn phí khi đủ cảnh giới |
| Garden care | cycle GROWING/READY phù hợp, cờ chăm, nguồn phân | một cờ/thời gian/vật tư | trừ vật tư khi đã chăm hoặc không có sâu |
| Harvest | cycle READY, inventory capacity, life | output+EXP+HARVESTED | thu hai lần, tự xóa cây khi túi đầy |
| Craft start | knowledge,level,stage,exact inputs,catalyst,queue,quota | trừ vật tư/phí, giữ lượt, snapshot+private RNG | tiêu đồ từ escrow hoặc lộ kết quả sớm |
| Craft finish | life alive, ends_at, RUNNING, unique completion | output/inbox+EXP+final state | chạy lại tạo thêm đồ/EXP |
| Quest claim | READY, group/period not paid, reward_world locked | mọi thưởng+cờ+claim+receipt | trả thêm bảng thưởng cũ |
| Social choice/gift | presence, quota, previous_scene, gift ownership/cooldown | điểm clamp+consume+cờ/intent | tặng xa, reset lượt bằng chết hoặc mở quest bằng intent |
| Auction list | life,item,trade unlock,age72h,giới tiền,price cap,quota5 | fee+escrow item+ACTIVE | tự đổi tiền, bán vật chứng/đồ tông/TM |
| Auction bid | session server, life, auction ACTIVE/time/version, max outflow reservation | giữ tiền mới, hoàn leader cũ đúng một lần, update leader+bid | giữ cả giá cũ và giá mới khi tự nâng |
| Auction settle | khóa seller/bidder life trước auction; chỉ terminal một lần | chuyển item+gross-tax+spent escrow+receipt/outbox | hồi sinh hàng của người bán đã chết |
| Real death | account+life+mọi escrow/job/crop/delivery liên quan | kết thúc asset ownership, hoàn tiền người khác sống, hủy job/cây; giữ quota account | tạo đời mới trước khi xử lý escrow |

## Chốt đấu giá

1. Nếu seller đã chết trước commit: CANCELLED_DEATH, item LOST, hoàn bid nếu bidder còn sống; bidder cũng chết thì held money LOST.
2. Nếu leader chết trước commit: escrow LOST, bid LOST, clear leader/current price về start, không kích hoạt lại bid từng được hoàn. Phiên vẫn có thể nhận bid mới tới ends_at.
3. Nếu cả hai còn sống: bidder escrow→SPENT; seller nhận gross rồi trừ ceil5% tax; item đổi owner_life, location inbox, trade_unlock_at=now+24h; auction→SOLD. Toàn bộ cùng một transaction. SOLD trước death thì chỉ mất tài sản đang thuộc đời chết, không thu hồi đồ từ người mua còn sống.
4. Bid trong120 giây cuối thêm120 giây, tổng gia hạn tối đa600 giây so với original_ends_at. Bid sau hết hạn không được nhận chỉ vì worker chưa chạy. Mua ngay dùng cùng thủ tục đóng, giải phóng leader cũ hoặc chỉ giữ delta nếu chính leader mua.

## Hạn mức rút tài sản20%

Chụp ngân sách đầu ngày theo LT_HP-equivalent: ví thanh khoản+escrow đang giữ+giá chuẩn item còn sở hữu. Không tăng ngân sách bằng các khoản nhận trong ngày. Duy trì spent_net_outflow và held_reservations riêng; bid mới phải đủ phần còn lại sau các reservation. Khi vượt giá giải phóng reservation, không tạo ngân sách mới. Khi chốt chuyển reservation thành spent; nếu qua ngày, chuyển reservation còn sống sang ngày mới với phần sở hữu escrow được đưa vào snapshot để không biến reset thành cách bid vượt hạn mức. Đổi tiền không là outflow vì tổng giá trị bảo toàn.

## Tử vong và Quy Phàm

Đóng đời có idempotency theo death_event_id, ghi loại DEATH hoặc RETURN_HOME riêng. RETURN_HOME chỉ sau ending disclosure+explicit confirmation và luật Quy Phàm, không tăng thống kê tử trận. Việc mất tài sản vật lý vẫn có biên nhận; không copy job, túi, ví, đất hoặc escrow sang đời mới. Token memory_echo đã tiêu PILL-051 là ngoại lệ phi vật lý có whitelist riêng, không cho phép bất kỳ buff nào tự đi xuyên kiếp.

## Trường hợp crash

Crash trước commit: rollback; retry cùng key. Crash sau commit trước response: đọc operations trả receipt. Worker crash sau ghi outbox trước gửi: unique source_operation ngăn duplicate delivery. Kết quả RNG đã commit từ start không reroll sau reconnect. Restore không được dùng backup balances mới với ledger/escrow cũ.
