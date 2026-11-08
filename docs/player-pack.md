# Bộ nhân vật bán hiện thực — Hư Giới

Nguồn ảnh: `player.zip` do chủ repo cung cấp. Các khung gốc không bị thay đổi nội dung, chỉ chuẩn hóa ảnh 512×512 và nén WebP có alpha. Male death có khung gốc 526×564, được co đúng tỉ lệ và canh chân ở đáy khung.

## Thiết kế FE

- `client/assets/player-preload.js` nạp ngay sau manifest và trước loader để không tải trước nhiều sprite pixel cũ.
- `client/ui/player-pack.js` nạp **sau** `client/ui/boot.js`, **trước** `client/main.js`.
- Gắn cùng API `HU_ASSETS.heroSrc`, `heroFrames`, `preloadHero`, `heroPortrait` mà các màn hiện có sử dụng.
- `HU_UI.heroAttack`, action `travel`, `onDeath`, `reincarnate` được bọc để phát animation, nhưng kết quả game engine và bản lưu không bị sửa.
- `css/player-pack.css` điều chỉnh kích thước nhân vật trên desktop, portrait/mobile và độ kiếp; giữ khung alpha, không pixel hóa.
- Bộ mới chỉ kích hoạt khi khung `thien_dinh/00.webp` tải thành công; nếu bộ asset chưa có trong nhánh, giao diện vẫn dùng ảnh cũ.

## Lệnh kiểm tra

```sh
node --test tests/player-pack.test.cjs
npm test
npm run check
npm start
```

Mở `/demo/player-pack-preview.html` để thử 2 giới tính, 4 trạng thái và tốc độ. Chạy server HTTP để kiểm tra tải ảnh trong trình duyệt. Bộ ảnh khoảng 1,5 MB tổng dung lượng, có thể cache theo tên file ổn định. Bộ gốc PNG trong `player.zip` không bị xóa.

**Giới hạn:** Sprite 6 khung dùng biến đổi tư thế từ ảnh nguồn; không có nội suy xương/3D. Việc kiểm tra cuối cùng trên nhiều máy và mạng chậm cần được thực hiện khi deploy.
