/* Thần Giới: map lớn độc lập, dành cho expansion sau Tiên Giới. */
"use strict";
(function () {
  if (!window.TT?.maps) return;
  TT.maps.register({
    id: "than_gioi",
    name: "Thần Giới",
    subtitle: "Thái Sơ Thần Vực",
    playable: false,
    status: "preview",
    preview: "assets/maps/than_world.webp",
    unlockText: "Chưa mở — tuyến Thần Giới được tách sẵn để phát triển sau Tiên Giới.",
    desc: "Thần vực cao hơn Tiên Giới. Kiến trúc map đã độc lập ngay từ đầu để không phải nhét toàn bộ thế giới vào một file gameplay khổng lồ.",
    regions: [
      { id: "nhatdieu", name: "Nhật Diệu Thần Đình", desc: "Thần đình đón bình minh trên vô tận vân hải." },
      { id: "tinhhoan", name: "Tinh Hoàn Thần Khuyết", desc: "Thần khuyết giữa tinh hoàn, nguyệt luân và cổ trận treo trên trời cao." },
      { id: "nganha", name: "Ngân Hà Thần Vực", desc: "Vực trời băng ngân, tinh hà xoáy quanh những thần điện cổ." },
      { id: "thaiso", name: "Thái Sơ Thiên Cung", desc: "Thiên cung cực bắc, thần quang trắng bạc xuyên qua biển mây." },
    ],
  });
})();
