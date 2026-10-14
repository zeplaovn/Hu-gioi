/* Tiên Giới: map lớn độc lập. Hiện chỉ mở chế độ xem trước, chưa đổi flow phi thăng. */
"use strict";
(function () {
  if (!window.TT?.maps) return;
  const A = "assets/maps/tien_gioi/";
  TT.maps.register({
    id: "tien_gioi",
    name: "Tiên Giới",
    subtitle: "Cửu Thiên Tiên Vực",
    playable: false,
    status: "preview",
    unlockText: "Mở sau Phi Thăng — gameplay Tiên Giới sẽ được kích hoạt ở giai đoạn kế tiếp.",
    desc: "Thượng giới phía trên Thiên Môn. Bốn tiên vực đã được tách riêng để có thể phát triển nội dung, quái, tài nguyên và cơ chế độc lập.",
    regions: [
      { id: "vanhai", name: "Vân Hải Tiên Môn", desc: "Tiên môn giữa biển mây, ánh bình minh phủ khắp quần sơn.", preview: A + "tien_far_0.webp" },
      { id: "xichha", name: "Xích Hà Tiên Vực", desc: "Vạn đảo lơ lửng dưới ráng đỏ, tiên quang tụ thành trường hà.", preview: A + "tien_far_1.webp" },
      { id: "nguyethoa", name: "Nguyệt Hoa Thiên Đài", desc: "Thiên đài dưới nguyệt sắc, tinh quang và vân khí giao hòa.", preview: A + "tien_far_2.webp" },
      { id: "hanthien", name: "Hàn Thiên Cổ Thành", desc: "Cổ thành phía bắc tiên vực, mây bạc phủ trên những dãy tiên sơn.", preview: A + "tien_far_3.webp" },
    ],
  });
})();
