# Hư Giới · Tiên Lộ Vô Tận

Game idle tu tiên bằng tiếng Việt, chạy trên trình duyệt với giao diện tiên hiệp tông tối. Người chơi tạo đạo thân, tu luyện, lịch luyện, vượt thiên kiếp và tích lũy Thiên mệnh qua nhiều kiếp.

**Hiện trạng:** bản chơi một người dùng lưu trữ trên thiết bị. Mã nguồn đã tách thành `client / shared / server`, có nền tảng dịch vụ người chơi để phát triển bản online.

Repository: [zeplaovn/Hu-gioi](https://github.com/zeplaovn/Hu-gioi).

## Bắt đầu chơi

### Mở trực tiếp

1. Tải hoặc clone repository, giữ nguyên cấu trúc thư mục.
2. Mở [index.html](index.html) bằng trình duyệt hiện đại có bật JavaScript; hỗ trợ `file://`.
3. Tạo nhân vật, xem intro rồi làm quen qua hướng dẫn tân thủ. Intro tự chuyển cảnh, không có nút: chạm/Enter/→ chuyển cảnh, Space tạm dừng, Esc bỏ qua. Chọn **Tiếp tục** để nạp nhân vật đã lưu.

Game dùng HTML, CSS và JavaScript với classic scripts; không cần build hoặc cài thư viện để chơi. Nhạc nền bắt đầu sau tương tác của người chơi.

### Chạy qua HTTP trên máy

Nếu có Python 3, chạy tại thư mục gốc repository:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Mở <http://127.0.0.1:8000>. Đây là máy chủ phục vụ bản game tĩnh; dịch vụ gameplay online được phát triển riêng trong `server/`.

### Chơi cùng chat online demo

Với **Node.js 20+**, chạy tại thư mục gốc:

```sh
npm run demo
```

Mở <http://127.0.0.1:8000>, vào game rồi chọn **Thêm → Chat online**. Dùng hai trình duyệt hoặc hai hồ sơ trình duyệt để thử nhắn tin qua lại; mỗi hồ sơ có bản lưu game riêng. Máy chủ cung cấp cả game tĩnh và chat HTTP/SSE, không cần cài thư viện.

Để thử trên hai thiết bị cùng mạng, chạy `HOST=0.0.0.0 PORT=8000 npm run demo`, rồi mở `http://<IP-máy-chủ>:8000` trên cả hai thiết bị. Có thể đổi `PORT` nếu cổng đang được dùng.

Chat có trạng thái online, kết nối lại, giữ bản nháp, giới hạn 400 ký tự/tin và 2 giây giữa các tin. Đây là kênh demo dùng đạo hiệu hiển thị, chưa có tài khoản xác thực; 100 tin gần nhất nằm trong RAM và mất khi khởi động lại máy chủ. Gameplay tiếp tục dùng phiên offline. Khi mở `file://` hoặc máy chủ Python, màn chat hiển thị hướng dẫn chạy demo.

## Tính năng hiện có

| Nhóm | Nội dung |
|---|---|
| Khởi nguyên | Intro cinematic 5 chương; loading tối thiểu 10,9 giây. Tạo đạo hiệu, giới tính, tuổi, chủng tộc, linh căn và phân bổ thiên phú. Nhấn ô chủng tộc hoặc linh căn để xem giải thích. Không còn gieo Âm Dương khi tạo mới; bản lưu cũ vẫn được giữ. |
| Tu luyện | Tự tăng tu vi, bế quan khi vắng mặt, báo cáo tiến trình và giới hạn tu vi tại ngưỡng đột phá. |
| Cảnh giới | Đột phá tiểu cảnh giới trực tiếp; đại cảnh giới có xác nhận, trang độ kiếp riêng, hiệu ứng và kết quả. VFX đột phá nhỏ và giai đoạn tụ linh quang trên độ kiếp đài kéo dài thêm 5 giây; chế độ giảm chuyển động vẫn được tôn trọng. |
| Lịch luyện | Công kích, kỹ năng, chiến đấu tự động, yêu thú, chiến lợi phẩm, Sinh lực và Linh khí. |
| Nhân vật | Hành trang, trang bị pháp bảo, công pháp chủ động, linh căn ngũ hành và Dị linh căn Băng/Lôi/Phong/Độc. Ngũ hành có cơ hội hóa Hỗn Độn khi vượt lôi kiếp; Dị khắc hệ gốc. |
| Nghề phụ | Luyện đan, rèn pháp bảo, chế phù và linh điền. Hạt trong bộ dữ liệu mới có thời gian, loại đất, độ khó và sản lượng riêng; các hạt còn lại tiếp tục dùng luật cũ. Cây được chăm an toàn khi bế quan. |
| Thế giới | Nhiệm vụ, bí cảnh, kỳ ngộ, tông môn và NPC Hạ Giới có quan hệ, vai trò, sở thích và thiện cảm. |
| Xuyên kiếp | Thọ nguyên, tọa hóa, chuyển thế, thành tựu, nâng cấp vĩnh viễn và lịch sử kiếp trước. Trọng sinh nằm trong **Thiên mệnh → Trọng sinh**. |
| Trải nghiệm | Nhật ký tu tiên chữ lớn, nhạc nền, chuyển cảnh bốn mùa/ngày–đêm, tùy chọn giảm chuyển động, giao diện desktop/mobile và một cửa sổ con tại một thời điểm. |

Menu **Thêm** gồm: **Chat online · Tri kỷ · Đạo hữu · Tông môn · PvP · Bảng xếp hạng**. Giao du, PvP, bảng xếp hạng và đấu giá hiện phục vụ chế độ mô phỏng một người chơi.

Hạ Giới và Linh Giới dùng ảnh `.webp` trong `media/assets/world/bg/<giới>/<day|night>/<xuan|ha|thu|dong>.webp`. Mỗi mùa tự động dài 15 phút tiến trình tu luyện, chia đều ngày/đêm. Tiên Giới dùng duy nhất `tien_gioi/bg.webp`. Có thể chọn mùa cố định tại **Cài đặt → Tứ thời**.

## Lưu và chuyển tiến trình

- Game tự lưu bằng `localStorage`; vào **Cài đặt → Bản lưu** để **Lưu ngay**, **Xuất JSON** hoặc **Nhập JSON**.
- Tệp xuất có tên `hu-gioi-save.json`. Nhập bản lưu hỗ trợ V4, V5, V6 và V7, chuyển về schema **V7**.
- Khóa chính: `huGioiWorkspaceV1`; khóa dự phòng: `huGioiWorkspaceV1Backup`. Bản hiện tại được giữ thêm trước khi nhập JSON.
- Dữ liệu gắn với trình duyệt và địa chỉ chạy game. Dùng xuất/nhập JSON khi đổi thiết bị, trình duyệt hoặc chuyển giữa `file://` và HTTP.
- Thiên mệnh được giữ qua trọng sinh; **Xóa tiến trình** trong Cài đặt xóa cả bản lưu và tiến trình xuyên kiếp trên thiết bị.

## Cấu trúc mã nguồn

```text
index.html                 Điểm vào trình duyệt và thứ tự nạp scripts
client/
  assets/                  Đường dẫn ảnh, chỉ mục vật phẩm/animation, preload
  platform/                Loading, âm thanh, bảo vệ nội dung trình duyệt
  persistence/             localStorage, dự phòng, xuất/nhập JSON offline
  session/                 LocalSession và ChatSession HTTP/SSE độc lập
  ui/
    screens/               Tu luyện, chiến đấu, nghề phụ, nhân vật, thế giới…
    onboarding.js          Intro và hướng dẫn tân thủ
    core.js                Bộ dựng giao diện và cầu nối phiên chơi
    shell.js               Điều hướng, cửa sổ, nhật ký và trình diễn độ kiếp
    environment.js         Chuyển cảnh mùa/ngày–đêm và sự kiện cảnh sắc
    boot.js                Khởi tạo, tiếp tục game và vòng đời trang
    vfx.js                 Hiệu ứng hình ảnh
  main.js                  Khởi động giao diện
shared/
  data/                    Cân bằng, vật phẩm, linh căn, nhân vật, thế giới
  state/                   Schema V7 và chuyển bản lưu V4–V7
  rules/                   Luật tu luyện, chiến đấu, chế tạo, phần thưởng, thời gian
  protocol/                Danh sách lệnh và kiểm tra payload
  game.js                  Điểm vào luật dùng chung cho browser và Node
server/
  demo.js                  Chạy máy chủ game tĩnh + chat demo
  chat/                    API chat, phiên demo, SSE, lịch sử trong RAM
  services/                PlayerService: tạo, đồng bộ và xử lý lệnh người chơi
  repositories/            Kho thử nghiệm trong bộ nhớ, giao dịch theo playerId
tools/                     Kiểm tra mã, sinh preload và công cụ tài nguyên
docs/                      Kiến trúc hiện tại và kế hoạch backend
css/                       Giao diện responsive
media/                     Hình ảnh và âm thanh
_headers                   Cấu hình HTTP headers cho nền tảng hosting hỗ trợ
```

## Phát triển và kiểm tra

Các công cụ JavaScript yêu cầu **Node.js 20 trở lên**. Chạy tại thư mục gốc; hiện không cần `npm install`.

| Lệnh | Công dụng |
|---|---|
| `npm run check` | Kiểm tra cú pháp JavaScript và đường dẫn script trong `index.html`. |
| `npm test` | Kiểm tra tương thích bản lưu và các luật tích hợp dữ liệu mới. |
| `npm run preload` | Sinh lại `client/assets/preload-manifest.js` theo cấu hình trong `tools/gen-preload.mjs`. |
| `npm run demo` | Chạy game và chat demo tại cổng 8000; hỗ trợ biến `HOST`, `PORT`. |

Luồng thay đổi gameplay:

```text
Giao diện → UI.command(type, payload) → LocalSession
         → shared/protocol/commands → shared/rules → state
```

- Viết luật và tính phần thưởng trong `shared/`; giao diện gửi lệnh và hiển thị kết quả. Các cài đặt trình bày dùng `UI.preference()`.
- `shared/` dùng được trong Node qua `require('./shared/game.js')`, không phụ thuộc DOM hay `localStorage`.
- Khi thêm module, cập nhật điểm ghép module và thứ tự script trong `index.html` để cả Node lẫn `file://` nạp đúng.
- Khi thay ảnh, cập nhật ánh xạ trong `client/assets/` và cấu hình preload rồi chạy `npm run preload`. Intro được nạp riêng khi bắt đầu nhân vật.

## Nền tảng online

`server/services/player-service.js` đã có:

- State riêng theo người chơi, với đồng hồ và bộ sinh số ngẫu nhiên do máy chủ cung cấp.
- Kiểm tra lệnh, điều kiện gameplay, tạo nhân vật và tính tiến trình bế quan.
- `expectedRevision` để phát hiện cập nhật đồng thời; `requestId` và lịch sử kết quả để xử lý retry không cấp thưởng hoặc trừ tiền lặp.
- Giao dịch hoàn tác khi lỗi và snapshot kết quả không chứa seed bí cảnh.

`MemoryPlayers` là kho thử nghiệm trong một tiến trình, mất dữ liệu khi tiến trình dừng. Bản web hiện kết nối `LocalSession`; API gameplay HTTP/WebSocket, đăng nhập, database bền vững và gameplay nhiều người là các bước tiếp theo. Chat demo có API riêng cùng origin; không nối `PlayerService` ra mạng. Stack nêu trong kế hoạch backend đang ở mức đề xuất.

## Tài liệu liên quan

- [Tích hợp dữ liệu game](docs/design-integration.md): phạm vi, cách ánh xạ dữ liệu mới và những giới hạn còn lại.
- [Kiến trúc hiện tại](docs/architecture.md): ranh giới client/shared/server, ánh xạ file cũ → mới, hợp đồng lệnh và ví dụ `PlayerService`.
- [Kế hoạch backend online](docs/backend-plan.md): đề xuất stack, schema dữ liệu, API, xác thực, triển khai và lộ trình nhiều người chơi.
