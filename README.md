# Thiên Vân Đại Lục – bản Web

Game tu tiên dạng idle chạy ngay trên trình duyệt, viết bằng HTML + CSS + JavaScript thuần (không framework; chạy được mà không cần build).

## Chạy
- **Cách nhanh:** mở file `index.html` bằng trình duyệt (Chrome/Edge/Firefox).
- **Hoặc chạy server cục bộ** (khuyến nghị): cần Node 18 trở lên, chạy `npm run serve` rồi vào `http://localhost:8000`.
- Đưa lên GitHub Pages / Netlify / bất kỳ static hosting nào: chỉ cần upload nguyên thư mục.

Dữ liệu lưu bằng `localStorage` (khóa `tu_tien_save_v2`) – tự lưu sau mỗi hành động, nút "Lưu game" để lưu thủ công.
Phím tắt: **T** tu luyện · **L** lịch luyện · **N** nghỉ ngơi · **D** đột phá. Minigame: **Space** hoặc chuột/chạm.

## Bản idle
- **Nhập định (idle):** tu vi tự tăng mỗi giây (10 giây = 1 tháng trong game), có thể **Tạm dừng / Tiếp tục**. Tu vi dừng ở mức viên mãn để bạn tự quyết định đột phá hoặc áp chế thêm. Game không còn chế độ "Tu luyện tự động" (bế quan tua nhanh) và nút tương ứng; các hành động thủ công Tu luyện / Lịch luyện / Nghỉ ngơi vẫn dùng bình thường.
- **Vắng mặt vẫn tu luyện:** 2 phút đầu tính đủ, sau đó 50%, tối đa 2 giờ mỗi lần; mở lại game sẽ có bảng báo cáo. Nếu thọ nguyên sắp cạn, bế quan tự dừng để không tọa hóa khi vắng mặt.
- **Đạo hiệu:** đặt tên khi tạo nhân vật (tối đa 20 ký tự, tự lọc ký tự nguy hiểm) hoặc gieo xúc xắc ra tên ngẫu nhiên.
- **Linh căn nguyên tố:** gieo khi tạo nhân vật. Thiên / Song / Tam / Tứ / Ngũ Linh Căn từ Kim, Mộc, Thủy, Hỏa, Thổ (càng ít nguyên tố càng tu nhanh nhưng đủ nguyên tố thì mạnh toàn diện), và 3% ra **Dị Linh Căn** (Lôi, Băng, Phong). Mỗi nguyên tố cho chỉ số riêng; dùng **Tinh Hoa** để tôi luyện (tối đa cấp 10, +8% hiệu quả mỗi cấp).
- **Bí cảnh:** 8 bí cảnh theo nguyên tố, mở dần theo cảnh giới. Thám hiểm chạy theo thời gian thật (cả khi đóng game), địch mạnh dần theo tầng, hạ Thủ Lĩnh được Tinh Hoa và vật phẩm. Ngũ hành tương khắc ảnh hưởng sát thương: Kim > Mộc > Thổ > Thủy > Hỏa > Kim.
- **Kỳ ngộ:** mỗi tháng có cơ hội gặp 1 trong 23 sự kiện (Thường / Hiếm / Cực hiếm / Thiên cơ, gồm cả vài tai ương nhỏ). Phúc Duyên và Vận Khí càng cao càng dễ gặp kỳ ngộ hiếm.
- **Linh điền theo thời gian thực:** 1 tháng linh điền = 1 phút thật, Linh Thảo chín sau 6 phút và đồng hồ đếm ngược hiện trên từng ô. Cây vẫn lớn khi đóng game hoặc tạm dừng nhập định; lúc vắng mặt cây chỉ lớn đến khi chín rồi chờ bạn (không sâu bệnh, khô hạn hay héo). Khi bạn có mặt vẫn cần tưới nước, bón thổ, trừ sâu. Luyện đan / vẽ phù / luyện khí vẫn là minigame hoàn thành ngay.
- **Chỉ số:** nút "Chỉ số nhân vật" hiện đủ thông tin, chỉ số gốc, chiến đấu (công, thủ, khí huyết, chí mạng, né tránh, hồi phục) và nguồn tăng tốc độ tu luyện.
- **Nhiệm vụ tông môn (thời gian thực):** bảng nhiệm vụ theo bậc (1-5) cho 3 tông môn, mỗi nhiệm vụ chạy vài chục giây đến vài phút thật, kể cả khi đóng game; có tỉ lệ thành công / "xuất sắc" (thưởng x2), mỗi ngày có 1 nhiệm vụ nổi bật (thưởng x1,5) và nút tự nhận lại. Hoàn thành nhận linh thạch, tu vi, vật phẩm và **cống hiến**. Cống hiến tổng cộng quyết định **chức vị** (Ngoại Môn → Thái Thượng Trưởng Lão: mở nhiệm vụ bậc cao, tăng tốc độ tu luyện và lương năm); cống hiến còn lại đổi vật phẩm ở **Kho tông môn**.
- **Thành tựu:** hơn 85 thành tựu chia 9 nhóm (Thiên Đạo Các). Khi mở khóa có thông báo trượt vào, tăng hiệu ứng theo bậc (mới / hiếm / huyền thoại): vòng sáng, pháo hạt và chữ nổi trong cảnh, kèm điểm Thiên Mệnh. Thành tựu chưa đạt có thanh tiến độ.
- Save cũ vẫn đọc được: nhân vật được gán tên "Đạo Hữu" và một linh căn ngẫu nhiên.

## Cấu trúc
```
index.html            trang chính
css/style.css         toàn bộ giao diện (máy tính / máy tính bảng / điện thoại có thanh thao tác nhanh)
js/data.js            dữ liệu thế giới + nghề phụ + tiện ích
js/assets.js          nạp ảnh + bảng ánh xạ icon (kể cả asset mới)
js/player.js          nhân vật + save/load
js/ui.js              helper DOM, modal, hộp xác nhận, thông báo, thanh tiến độ
js/scene.js           cảnh canvas: parallax, sprite, VFX
js/minigames.js       giữ lửa / bấm nhịp / kéo phù văn
js/game.js            lõi: hành động, chiến đấu, đột phá, túi đồ, cửa hàng, công pháp, gia nhập / rời tông môn
js/screens.js         màn tạo nhân vật, màn chính, hộp thoại
js/farm.js            linh điền
js/crafts.js          luyện đan / vẽ phù / luyện khí
js/train.js           công thức tu vi mỗi tháng của nhập định, hộp thoại đạt điều kiện đột phá
js/idle_data.js       dữ liệu + công thức idle: nguyên tố, linh căn, tên, bí cảnh (không đụng DOM)
js/idle.js            nhập định, kỳ ngộ, bí cảnh, bảng Chỉ số / Linh căn / Bí cảnh / Kỳ ngộ
js/sect.js            tông môn nâng cao: nhiệm vụ thời gian thật, chức vị, cống hiến, kho tông môn
js/meta.js            Thiên Mệnh, thành tựu (+ hiệu ứng mở khóa), lịch sử các kiếp, xuất/nhập save
js/security.js        chữ ký save, kiểm tra tính hợp lý, sao lưu, chặn đa tab (chống sửa save)
js/ux.js              ấn Đột phá hiển thị tiến độ, chỉ báo trạng thái lưu
js/config.js          địa chỉ + khóa công khai của Supabase (build thay vào)
js/cloud.js           đăng nhập, đồng bộ lên Supabase, xử lý xung đột (gọi REST bằng fetch, không cần SDK)
js/auth.js            màn đăng nhập / đăng ký, hộp thoại xử lý dữ liệu lệch nhau, đăng xuất
supabase/migrations/  bảng player_saves + save_game, delete_account, bảng xếp hạng (RLS) — chạy theo thứ tự tên file
supabase/tests/       kiểm thử SQL
tools/serve.mjs       server tĩnh cục bộ bằng Node (npm run serve)
tools/sim_balance.mjs mô phỏng cân bằng bí cảnh bằng node (node tools/sim_balance.mjs)
tools/gen_leaderboard_bounds.mjs sinh bảng số tháng tu tối thiểu theo cấp cho bảng xếp hạng (chạy lại khi đổi công thức tu vi)
tools/sim_progress.mjs mô phỏng tiến độ tu hành (node tools/sim_progress.mjs): % đạt từng cảnh giới, thời gian thật, tử vong
tools/build.mjs       build bản phát hành (gộp + nén + làm rối, chèn khóa TVDL_SALT) -> dist/
tools/test_security.mjs, tools/test_cloud.mjs  kiểm thử: npm test
tools/mock_supabase.mjs Supabase giả để thử cục bộ: npm run mock
assets/               toàn bộ ảnh (cũ + mới)
assets_src/           3 ảnh sheet gốc của bản cập nhật asset
tools/slice_sheets.py cắt sheet -> sprite lẻ (tuỳ chọn, chỉ dùng khi thay ảnh sheet; cần Python + pillow, numpy, scipy)
tools/make_frames.py  cắt assets_src/frames_sheet.png -> assets/ui/frame/* (tuỳ chọn, cần Python + pillow; game và build không cần)
```

## Tu hành & độ khó (cân bằng lại)
Mọi số liệu nằm trong `TT.PROG` (`js/data.js`); công thức ở `TT.needExp`, `Player.monthGain / breakChance / failKeep`.

- **Tu vi cần để lên tầng** tính theo "số tháng tu luyện" của từng cảnh giới × tu vi/tháng tham chiếu, nên chậm hơn nhiều và luôn tăng dần (kể cả khi sang cảnh giới mới). Tầng 9 đắt hơn ×1,4.
- **Tu vi/tháng** = (4 + Căn Cốt×1,5 + Ngộ Tính×2 + cấp×1,5) × hệ số công pháp/linh căn × ngẫu nhiên 0,8–1,3.
- **Đột phá** gốc 50%, cộng Ngộ Tính, Vận Khí, Tâm Cảnh, đan dược và tích lũy thất bại; đại cảnh giới bị trừ 8%; kẹp 8%–90%. Thất bại giữ lại 70% (tầng nhỏ) / 60% (đại cảnh giới) tu vi và mất sinh lực.
- **Thọ nguyên** cộng khi đại đột phá: 70 / 120 / 270 / 600 / 950 / 1250 / 1550 / 1800 năm. Vật phẩm, kỳ ngộ tăng thêm 50% mỗi cảnh giới. 1 năm game = 120 giây idle, nên thọ nguyên là bức tường thật sự.
- Tụ Khí Đan hồi 10% tu vi cần để lên tầng.
- **Mục tiêu thời gian thật (build trung bình):** Luyện Khí ~15 phút, Trúc Cơ ~1,5 giờ, Kim Đan ~5 giờ, Nguyên Anh ~13 giờ, Hóa Thần ~1,2 ngày, Đại Thừa ~4 ngày, Độ Kiếp ~6 ngày. Phi thăng cần build mạnh (~5–6 ngày). Người chơi mới thường chết già quanh Nguyên Anh và phải luân hồi với bản thân mạnh hơn.
- Chạy `node tools/sim_progress.mjs` sau khi chỉnh số để kiểm tra lại.

## Asset mới (cập nhật)
| Sheet | Thư mục | Dùng ở đâu |
|---|---|---|
| `frames_sheet.png` (khung dọc + khung ngang) | `assets/ui/frame/` | **Khung họa tiết** hoa sen / mây / ngọc: viền mọi hộp thoại, khung cảnh và cột nhân vật (CSS trong `css/style.css`, xếp bằng nhiều lớp nền nên co giãn theo mọi kích thước). Chạy lại `python3 tools/make_frames.py` nếu đổi ảnh gốc |
| `plants_sheet.png` (12 linh thảo) | `assets/plants/` | Biểu tượng **Linh Thảo** theo phẩm chất (cỏ → nhân sâm → linh chi → sen băng), Trường Thọ Quả, huy hiệu phẩm chất dự kiến trên ô đất chín |
| `farm_sheet.png` (12 ô đất / đồ trang trí) | `assets/farm/` | **Linh điền**: ô trống → hạt → mầm → lớn → chín → héo; hiệu ứng tưới nước / bón thổ; bù nhìn, bia đá, hàng rào, máng nước trang trí |
| `skills_sheet.png` (12 huy hiệu) | `assets/skills/` | Biểu tượng **công pháp** (5 huy hiệu), **tông môn** (sách xanh/đỏ/lục), nhiệm vụ tông môn, nút Công pháp, Luyện đan/Vẽ phù/Luyện khí |

Thay ảnh trong `assets_src/` (giữ bố cục lưới 4×3) rồi chạy `python tools/slice_sheets.py` để cập nhật (đây là công cụ làm ảnh duy nhất cần Python; game và build không cần).

## Tính năng bản nâng cấp
- **Thiên Kiếp:** đại đột phá lên Kim Đan trở lên phải chịu nhiều đạo lôi (3 + cảnh giới/2 đạo). Khí huyết về 0 là chết; Hộ Thân Phù và chiến lực giúp giảm sát thương. Vượt kiếp được +1 chỉ số ngẫu nhiên. Game cảnh báo nếu khí huyết quá thấp.
- **Thiên Mệnh (xuyên kiếp):** chết hoặc phi thăng sẽ nhận điểm Thiên Mệnh, dùng để nâng cấp vĩnh viễn: Thiên Tư (+điểm chỉ số), Túi Càn Khôn (+linh thạch), Trường Sinh (+thọ nguyên), Đạo Tâm (+% tu luyện), Thiên Vận (+Vận Khí). Trùng sinh giữa chừng chỉ nhận một nửa điểm.
- **Thành tựu:** hơn 85 thành tựu chia 9 nhóm (cảnh giới, chiến đấu, kỳ ngộ, bí cảnh, linh căn, tông môn, nghề phụ...), mỗi cái thưởng điểm Thiên Mệnh (xem mục Bản idle).
- **Kiếp trước:** bảng lịch sử 20 kiếp gần nhất.
- **Dữ liệu:** sao chép / tải file / nhập / xóa save ngay trong game (mục "Thiên Đạo Các" > "Dữ liệu").
- Dữ liệu xuyên kiếp lưu ở khóa `tu_tien_meta_v1` (tách khỏi `tu_tien_save_v2`, save cũ vẫn dùng được).

## Giao diện
- Bố cục 3 cột trên máy tính; trên điện thoại thông tin nhân vật lên đầu, **thanh thao tác nhanh** (Tu luyện, Lịch luyện, Nghỉ ngơi, Đột phá, Thêm) cố định ở đáy màn hình, cửa sổ trượt lên từ đáy.
- **Nút Đột phá** hiển thị % tu vi và sáng lên khi đủ điều kiện.
- Thanh trên cùng có chỉ báo **Đã lưu hh:mm** (đổi sang đỏ nếu không lưu được). Mọi xác nhận (trùng sinh, rút bí cảnh, bỏ nhiệm vụ, Thiên Kiếp, nhập/xóa dữ liệu) là hộp thoại trong game.
- Dùng được bằng bàn phím và trình đọc màn hình (modal giữ focus, Esc để đóng); tôn trọng chế độ giảm chuyển động của hệ điều hành.

## Tài khoản và lưu trên máy chủ (Supabase, tuỳ chọn)
Khi cấu hình Supabase, người chơi **đăng ký / đăng nhập bằng email + mật khẩu** (Supabase Auth), tiến trình và Thiên Mệnh được lưu trên tài khoản và chơi tiếp được trên mọi thiết bị. Không cấu hình thì game chạy ngoại tuyến như cũ (chỉ lưu trên máy).

**Cài đặt (một lần):**
1. Tạo dự án trên [supabase.com](https://supabase.com). Vào *SQL Editor*, dán và chạy lần lượt **cả ba** file trong `supabase/migrations/` theo thứ tự tên (`20261011…player_saves`, `20261012…delete_account_and_checks`, `20261013…leaderboard`), hoặc dùng `supabase db push`. File này tạo bảng `player_saves` có Row Level Security (mỗi người chỉ đọc được dòng của mình, **không ghi trực tiếp được**) và hàm `save_game()` làm nơi ghi duy nhất, có kiểm tra kích thước, tần suất và phiên bản.
2. *Authentication > Sign In / Providers*: bật Email, đặt độ dài mật khẩu tối thiểu **8**, nên bật **Confirm email**. *Authentication > URL Configuration*: đặt Site URL là địa chỉ game. Trên Vercel, build tự xuất `.vercel/output` (Build Output API) để CSP `connect-src` có đúng địa chỉ Supabase; `vercel.json` / `_headers` ở gốc cho phép `https://*.supabase.co` (Vercel chỉ đọc file gốc, không đọc `dist/`); bản build thu hẹp lại đúng project của bạn trong `index.html` (meta) và `.vercel/output`. Sau khi deploy, kiểm tra header `Content-Security-Policy` của trang có `connect-src https://<project>.supabase.co`. Chưa bật CAPTCHA của Supabase, vì client hiện chưa gửi mã CAPTCHA (bật thì đăng ký sẽ lỗi).
3. *Project Settings > API*: lấy **Project URL** và khóa **anon / publishable**. Trên Vercel / Cloudflare đặt hai biến môi trường `SUPABASE_URL` và `SUPABASE_ANON_KEY` (cùng với `TVDL_SALT`). Khóa này công khai theo thiết kế của Supabase; **không bao giờ** dùng khóa `service_role` hay `sb_secret_`: build sẽ từ chối.
4. `npm run build` tự thay cấu hình vào `js/config.js` và mở CSP `connect-src` đúng địa chỉ dự án (không có Supabase thì CSP vẫn chặn mọi kết nối mạng).

**Cách hoạt động:**
- Mở game lần đầu: hiện màn đăng nhập / đăng ký. Đăng ký xong vào thẳng màn tạo nhân vật.
- `localStorage` là bộ nhớ đệm; mỗi lần game lưu, thay đổi được gom lại và đẩy lên máy chủ sau vài giây, và khi đóng hoặc ẩn tab. Mất mạng vẫn chơi được, có mạng lại tự đồng bộ. Thanh trên cùng hiện trạng thái: *Đã đồng bộ / Đang đồng bộ / Ngoại tuyến*.
- **Hai thiết bị cùng chơi:** mỗi lần ghi mang theo số phiên bản (`rev`); nếu máy chủ đã có bản mới hơn, game hỏi bạn giữ bản nào thay vì âm thầm ghi đè.
- **Người chơi cũ:** lần đăng nhập đầu, nếu máy có save ngoại tuyến và tài khoản còn trống, game đề nghị tải save đó lên tài khoản.
- Đăng xuất: đẩy phần chưa đồng bộ, rồi xóa bản lưu tạm trên máy (không để lộ sang người dùng kế tiếp).
- Dữ liệu từ máy chủ vẫn đi qua bước kiểm tra và làm sạch như save trên máy.

**Thử cục bộ không cần dự án thật:** `npm run mock` chạy một Supabase giả (cổng 54321), rồi `SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=local-dev-anon-key-0123456789 npm run build && npm run serve -- dist`.

### Bảng xếp hạng
Nút **Bảng xếp hạng** (chỉ hiện khi đã đăng nhập) liệt kê top 50 và dòng của bạn. Xếp theo cảnh giới cao nhất từng đạt, bằng nhau thì ai tu ít tháng hơn xếp trên; mỗi tài khoản giữ thành tích tốt nhất. Dữ liệu do trigger `lb_sync` lấy từ save mỗi lần `save_game()` ghi, client không ghi trực tiếp được, và bị xóa cùng tài khoản. Đạo hiệu hiển thị công khai. Máy chủ chỉ loại giá trị vô lý (số tháng tu thấp hơn mức tối thiểu của cấp), không kiểm tra được luật chơi, nên đây là bảng giải trí, đừng gắn phần thưởng thật.

## Phát triển và phát hành
- Chạy thử: `npm run serve`. Kiểm thử: `npm test` (bảo mật + đồng bộ Supabase, chạy bằng Node). Kiểm thử SQL: `psql -v ON_ERROR_STOP=1 -f supabase/tests/player_saves.test.sql` trên một database Postgres trống (file tự dựng bản giả lập `auth`). Mô phỏng cân bằng bí cảnh: `node tools/sim_balance.mjs`.
- Build bản phát hành: `npm i && TVDL_SALT=<chuỗi bí mật ≥ 32 ký tự> npm run build`, rồi deploy thư mục `dist/` (kèm `_headers` / `vercel.json`). Khóa ký save **không nằm trong repo**: trên Vercel / Cloudflare hãy đặt `TVDL_SALT` trong Environment Variables, thiếu thì build trên CI sẽ dừng. Tạo khóa: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- Save, Thiên Mệnh và file xuất đều có chữ ký HMAC; save bị sửa hoặc vô lý sẽ bị từ chối (có bản sao lưu tự động để khôi phục). Chi tiết và giới hạn: xem [SECURITY.md](SECURITY.md).
