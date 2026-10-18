# Thiên Vân Địa Đồ — kiến trúc map

## Nguyên tắc

Mỗi **đại thế giới** là một module độc lập. Không đặt dữ liệu Hạ Giới, Tiên Giới và Thần Giới chung trong một feature file.

```text
src/game/maps/
  registry.js       # contract chung: register/get/travel
  ha_gioi.js        # Hạ Giới — playable
  tien_gioi.js      # Tiên Giới — expansion riêng
  than_gioi.js      # Thần Giới — expansion riêng
  world_map_ui.js   # UI điều hướng giữa các đại thế giới
```

`registry.js` chỉ quản lý metadata và điều hướng. Gameplay đặc thù của từng thế giới phải nằm trong module/feature của thế giới đó, không thêm nhánh `if (world === ...)` ngày càng lớn vào core game.

## Trạng thái hiện tại

### Hạ Giới

Hạ Giới là map đang playable và giữ nguyên 9 khu vực/progression hiện hành. `TT.HA_GIOI_REGIONS` được giữ tạm làm compatibility bridge cho combat/explore cũ; nguồn dữ liệu mới là `src/game/maps/ha_gioi.js`.

### Tiên Giới

Tiên Giới đã có module riêng và asset preview riêng nhưng đang `playable: false`. Flow Phi Thăng hiện tại chưa bị thay đổi trong phase kiến trúc map.

### Thần Giới

Thần Giới đã có module riêng và asset preview riêng, cũng đang `playable: false`. Đây là expansion sau Tiên Giới.

## Save contract

State map dùng hai field trên player:

```text
world   # id đại thế giới, mặc định ha_gioi
region  # id khu vực trong đại thế giới
```

`TT.maps.currentWorld()` có fallback về `ha_gioi` để save cũ vẫn đọc được. `TT.maps.currentRegion()` áp unlock rule trước khi trả khu vực hiện tại.

## Asset contract

Runtime chỉ tải asset đã tối ưu trong `assets/maps/`. Bộ source parallax độ phân giải cao không được đưa nguyên khối vào bundle production.

Asset parallax nguồn được tổ chức theo từng thế giới và ba lớp:

```text
far
mid
fore
```

Khi Tiên Giới/Thần Giới chuyển sang playable, scene renderer của từng thế giới có thể dùng ba lớp này độc lập mà không thay đổi registry hoặc Hạ Giới.

## Quy tắc mở rộng

1. Thêm đại thế giới mới bằng file map mới và `TT.maps.register()`.
2. Region id chỉ cần unique trong đại thế giới của nó.
3. Unlock/travel phải qua registry; UI không tự sửa player state.
4. Gameplay/quái/tài nguyên/bí cảnh riêng của thế giới đặt trong module riêng.
5. Không bật `playable: true` cho world mới trước khi có progression, persistence và regression test tương ứng.
6. Không sửa flow Phi Thăng chỉ để hiển thị preview map.
