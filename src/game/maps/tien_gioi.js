/* Tiên Giới: map lớn độc lập. Hiện chỉ mở chế độ xem trước, chưa đổi flow phi thăng. */
"use strict";
(function () {
  if (!window.TT?.maps) return;
  TT.maps.register({
    id: "tien_gioi",
    name: "Tiên Giới",
    subtitle: "Cửu Thiên Tiên Vực",
    playable: false,
    status: "preview",
    preview: "assets/maps/tien_world.webp",
    unlockText: "Mở sau Phi Thăng — gameplay Tiên Giới sẽ được kích hoạt ở giai đoạn kế tiếp.",
    desc: "Thượng giới phía trên Thiên Môn. Bốn tiên vực đã được tách riêng để có thể phát triển nội dung, quái, tài nguyên và cơ chế độc lập.",
    regions: [
      { id: "vanhai", name: "Vân Hải Tiên Môn", desc: "Tiên môn giữa biển mây, ánh bình minh phủ khắp quần sơn." },
      { id: "xichha", name: "Xích Hà Tiên Vực", desc: "Vạn đảo lơ lửng dưới ráng đỏ, tiên quang tụ thành trường hà." },
      { id: "nguyethoa", name: "Nguyệt Hoa Thiên Đài", desc: "Thiên đài dưới nguyệt sắc, tinh quang và vân khí giao hòa." },
      { id: "hanthien", name: "Hàn Thiên Cổ Thành", desc: "Cổ thành phía bắc tiên vực, mây bạc phủ trên những dãy tiên sơn." },
    ],
  });
})();
