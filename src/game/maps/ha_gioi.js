/* Hạ Giới: map gameplay hiện hành. Dữ liệu tách khỏi file hardening. */
"use strict";
(function () {
  if (!window.TT?.maps) return;
  const R = (id, name, realm, reward, danger, desc, pos) => ({ id, name, realm, reward, danger, desc, pos });
  const world = TT.maps.register({
    id: "ha_gioi",
    name: "Hạ Giới",
    subtitle: "Thiên Vân Đại Lục",
    playable: true,
    desc: "Cửu vực từ phàm tục tới Thiên Môn. Cảnh giới càng cao, tài nguyên càng dồi dào nhưng hiểm nguy cũng tăng theo.",
    regions: [
      R("pham", "Phàm Nhân Thành", 0, 1.00, 0, "Thành trấn và núi rừng quanh nơi nhập đạo.", 0),
      R("thanhvan", "Thanh Vân Sơn", 1, 1.08, 1, "Linh mạch sơ khai, yêu thú Luyện Khí thường lui tới.", 1),
      R("vanyeu", "Vạn Yêu Lâm", 2, 1.16, 2, "Rừng yêu khí dày đặc, tài nguyên Trúc Cơ phong phú.", 2),
      R("hacphong", "Hắc Phong Cốc", 3, 1.25, 3, "Kim Đan tu sĩ tranh đoạt di tích trong cốc sâu.", 3),
      R("thienha", "Thiên Hà Hải", 4, 1.35, 4, "Hải vực Nguyên Anh, linh triều và hải thú cùng tồn tại.", 4),
      R("hoangco", "Hoang Cổ Chi Địa", 5, 1.46, 5, "Di tích Hóa Thần, cổ thi và dị tượng không ngừng xuất hiện.", 5),
      R("hukhong", "Hư Không Liệt Cốc", 6, 1.58, 6, "Không gian rạn vỡ, chỉ Luyện Hư mới đủ sức đặt chân.", 6),
      R("dangthien", "Đăng Thiên Cổ Lộ", 7, 1.72, 7, "Con đường Đại Thừa hướng tới Thiên Môn.", 7),
      R("thienmon", "Thiên Môn Sơn", 8, 1.88, 8, "Đỉnh Hạ Giới, nơi lôi kiếp và khí tức phi thăng giao nhau.", 8),
    ],
  });

  // Compatibility cho logic chiến đấu/lịch luyện hiện tại trong ha_gioi_fix.js.
  TT.HA_GIOI_REGIONS = world.regions;
})();
