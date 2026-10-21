# v2.1 — triển khai game

Nguồn thiết kế hiện hành: `docs/v21/`, dữ liệu: `data/v21/`. Các CSV và tài liệu v1.6.1 được giữ để tái lập migration lịch sử; không dùng chúng để tạo luật chơi mới.

## Kiến trúc

Client gửi ý định tới `GET /play`, `POST /play/action`. Edge xác thực JWT, giới hạn đầu vào và truyền account từ token. PostgreSQL chạy luật, khóa và ghi giao dịch. Mỗi thao tác có `life_id`, UUID `request_id`, version và args. Gửi lại đúng thao tác trả đúng receipt; dùng lại UUID với dữ liệu khác bị từ chối. Tiền được tính bằng numeric nguyên và trả chuỗi thập phân.

Các hệ thống mới dùng `play_lives` theo kiếp, `play_accounts` cho công thức đã học, `play_quotas` cho lượt/EXP theo tài khoản và ngày Việt Nam. Kết quả RNG craft được giữ kín trên server cho tới lúc hoàn tất. Túi đầy chuyển output sang hộp nhận của kiếp.

Đấu giá và các đường tử vong dùng cùng advisory transaction lock trong bản beta đầu để tránh chốt/hoàn tiền chồng nhau. Đây là cách ưu tiên tính đúng cho tải nhỏ; cần đo tải trước khi thay bằng khóa nhiều hàng theo thứ tự. Không tuyên bố đã chịu tải production.

## Chuyển dữ liệu

- Giữ nguyên index1–14 của các cảnh giới đang dùng; tài khoản Phàm Nhân còn sống chuyển sang HG01. Index0 chỉ còn để các khóa ngoại lịch sử đọc được, không tạo kiếp mới ở đó.
- Kiếp mới bắt đầu HG01 tầng1,3 LT_HP; tiền cũ LS/LT/TN lần lượt ánh xạ LT_HP/LT_TP/TN, không xóa ví hoặc TM. Thiên Mệnh đã nhận ở Phàm Nhân trước nâng cấp cũng được giữ; kiếp mới có126 mốc.
- Dữ liệu19 NPC cũ được chụp vào `social_v11_archive`; các quan hệ của năm NPC còn hoạt động được ánh xạ sang NPC-01..05. Offer cũ bị vô hiệu để tránh chọn sai cảnh. Bốn NPC còn lại dùng nội dung Linh/Tiên Giới mới.
- Chỉ giờ reset tương lai dùng Asia/Ho_Chi_Minh; quota tương tác hiện tại được chuyển sang khóa tài khoản, không làm mới sau chết.
- Khi chết, túi, hộp nhận, đất/cây, job, nghề và đấu giá của kiếp được đóng; kiến thức công thức, TM và quota tài khoản giữ lại.

## Kiểm tra

`pnpm gen:check`, `pnpm test:content`, `pnpm test`, `pnpm build:web`. DB runner kiểm cả trạng thái trước nâng cấp bằng các test cũ, sau đó áp migration2.1 và kiểm luật mới; parity TS↔SQL chạy trên luật hiện hành. CI giao diện chụp desktop/mobile và xác nhận16 ô đất với2 ô mở.

Không áp migration vào database live chỉ để thử nghiệm. Sao lưu, thử nâng cấp trên bản sao và triển khai API/database trước web tương ứng. Không đảo ngược lịch sử tiền/đồ bằng cách revert migration sau khi người chơi đã giao dịch.

## Phạm vi cần xác nhận trước phát hành rộng

Các hệ thống có test riêng và trạng thái CI trong PR. Thông số cân bằng mới vẫn là đề xuất trong tài liệu; cần beta về tiến độ, nguồn–tiêu tiền và boss. PvP, Lục Mệnh6 người và nội dung Hỗn Độn không thuộc giao diện PvE của bản này. Handler hiệu ứng đặc biệt chỉ được mở khi thực thi đủ; hiệu ứng chưa hỗ trợ bị từ chối trước khi trừ vật phẩm. Hiện dùng ngoài trận có đan tăng tiến độ và đan chuẩn bị đột phá; trong trận có hồi phục, phù giảm sát thương, sát thương, giải trạng thái và khiên. Chưa mở toàn bộ đan tăng thọ/chỉ số, pháp tướng, pháp tắc, affix/set bonus và hiệu ứng độc bản. Combat đã nối giao dịch vào game, nhưng chưa chứng nhận parity toàn bộ với mô hình tham chiếu hoặc cân bằng beta.
