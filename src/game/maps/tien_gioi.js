/* Tiên Giới: map lớn độc lập. Nội dung đã chia theo vực/địa điểm nhưng vẫn preview-only cho tới khi flow Phi Thăng được mở. */
"use strict";
(function () {
  if (!window.TT?.maps) return;

  const S = (id, name, kind, danger, desc, monsters, resources, npcs, boss = null) => ({
    id, name, kind, danger, desc, monsters, resources, npcs, boss,
  });
  const R = (id, name, tier, biome, danger, desc, faction, resources, sites) => ({
    id, name, tier, biome, danger, desc, faction, resources, sites,
  });

  TT.maps.register({
    id: "tien_gioi",
    name: "Tiên Giới",
    subtitle: "Cửu Thiên Tiên Vực",
    playable: false,
    status: "preview",
    preview: "assets/maps/tien_world.webp",
    unlockText: "Mở sau Phi Thăng — dữ liệu khu vực đã tách sẵn, nhưng gameplay Tiên Giới chưa được kích hoạt.",
    desc: "Thượng giới phía trên Thiên Môn. Bốn tiên vực đầu tiên đã có sinh cảnh, địa điểm, thế lực, tài nguyên và BOSS dự kiến để phát triển độc lập với Hạ Giới.",
    regions: [
      R("vanhai", "Vân Hải Tiên Môn", 1, "tiên môn · vân hải", 9,
        "Cửa ngõ của người vừa phi thăng, nơi tiên kiều nối giữa những đảo mây và vô số tiếp dẫn trận.",
        "Tiếp Dẫn Tiên Điện", ["Vân tinh", "Tiên lộ", "Thanh ngọc"], [
          S("vanhai_tiepdan", "Tiếp Dẫn Thiên Đài", "tiên đài", 9, "Đài tiếp dẫn tiếp nhận tu sĩ vượt Thiên Môn, tiên quang và pháp trận vận hành không ngừng.", ["Vân Linh", "Hộ Đài Tiên Khôi"], ["Tiếp dẫn phù", "Vân tinh"], ["Tiếp Dẫn Sứ", "Tiên Lại Thanh Hà"]),
          S("vanhai_kieu", "Bạch Vân Tiên Kiều", "tiên kiều", 9, "Cầu dài xuyên biển mây, đôi khi xuất hiện khe gió chứa mảnh tiên lực tinh thuần.", ["Phong Vân Điểu", "Vân Linh"], ["Phong ngọc", "Tiên vân sa"], ["Tuần Kiều Tiên Vệ"]),
          S("vanhai_dien", "Vân Hải Ngoại Điện", "tiên điện", 10, "Ngoại điện quản lý thân phận người mới phi thăng và cất giữ cổ vật thất lạc từ Hạ Giới.", ["Hộ Điện Tiên Khôi", "Lưu Quang Linh"], ["Tiên văn mảnh", "Thanh ngọc"], ["Điện Chủ Mạc Vân"], "Vân Hải Hộ Pháp"),
        ]),
      R("xichha", "Xích Hà Tiên Vực", 2, "hỏa vực · phù đảo", 10,
        "Vạn đảo lơ lửng dưới ráng đỏ. Hỏa tiên lực dày đặc, thích hợp luyện khí và tôi thể.",
        "Xích Hà Tiên Cung", ["Xích tinh", "Hỏa tiên thạch", "Hà quang tủy"], [
          S("xichha_cang", "Xích Hà Vân Cảng", "vân cảng", 10, "Bến đậu của tiên chu xuyên giữa các phù đảo, thương hội và luyện khí sư tụ tập đông đúc.", ["Hỏa Vũ Yến", "Xích Giáp Linh Thú"], ["Xích tinh", "Tiên chu mộc"], ["Chủ Cảng Lạc Dương", "Thương Hội Tử Hà"]),
          S("xichha_lo", "Cửu Diễm Luyện Lô", "luyện khí địa", 10, "Cụm địa hỏa lô khổng lồ được dẫn trực tiếp từ hỏa mạch của tiên vực.", ["Diễm Linh", "Hỏa Tinh Khôi"], ["Hỏa tiên thạch", "Cửu diễm sa"], ["Luyện Khí Đại Sư Xích Lăng"]),
          S("xichha_dao", "Hà Quang Chủ Đảo", "tiên đảo", 11, "Chủ đảo chìm trong xích hà, trung tâm quyền lực của tiên cung và nơi cất giữ Hà Quang Tủy.", ["Xích Giáp Linh Thú", "Diễm Linh"], ["Hà quang tủy", "Xích ngọc"], ["Xích Hà Tiên Quan"], "Cửu Diễm Xích Loan"),
        ]),
      R("nguyethoa", "Nguyệt Hoa Thiên Đài", 3, "nguyệt vực · tinh đài", 11,
        "Thiên đài dưới nguyệt sắc, tinh quang và vân khí giao hòa; nhiều trận sư và quan tinh giả cư ngụ.",
        "Nguyệt Hoa Các", ["Nguyệt tinh", "Tinh sa", "Hàn quang ngọc"], [
          S("nguyethoa_quan", "Quan Tinh Trường Lang", "tinh lộ", 11, "Trường lang treo giữa hư không, dùng để quan sát tinh tượng và biến động của các giới.", ["Tinh Quang Điệp", "Nguyệt Linh"], ["Tinh sa", "Quan tinh kính mảnh"], ["Quan Tinh Sư Tô Nguyệt"]),
          S("nguyethoa_ho", "Nguyệt Kính Tiên Hồ", "tiên hồ", 11, "Mặt hồ như gương, mỗi đêm phản chiếu tinh đồ khác nhau và kết tinh nguyệt lực.", ["Nguyệt Lộc", "Hàn Quang Ngư"], ["Nguyệt tinh", "Ngân liên"], ["Hồ Chủ Bạch Nghi"]),
          S("nguyethoa_dai", "Thái Âm Thiên Đài", "đạo đài", 12, "Đạo đài cao nhất của Nguyệt Hoa, nơi thái âm lực hội tụ thành từng vòng nguyệt triều.", ["Thái Âm Linh", "Tinh Quang Điệp"], ["Hàn quang ngọc", "Thái âm tinh"], ["Các Chủ Nguyệt Hoa"], "Thái Âm Huyền Thú"),
        ]),
      R("hanthien", "Hàn Thiên Cổ Thành", 4, "băng vực · cổ thành", 12,
        "Cổ thành phía bắc tiên vực, mây bạc phủ trên những dãy tiên sơn và cổ trận đóng băng từ thời thượng cổ.",
        "Hàn Thiên Thành Phủ", ["Băng phách", "Hàn tiên ngọc", "Cổ trận tinh"], [
          S("hanthien_mon", "Bắc Thiên Thành Môn", "cổ thành", 12, "Cổng thành khổng lồ khắc cổ văn, luôn có hàn phong quét qua chiến lũy.", ["Băng Giáp Vệ", "Hàn Phong Linh"], ["Băng phách", "Cổ thiết tiên giới"], ["Trấn Bắc Tiên Tướng"]),
          S("hanthien_kho", "Phong Tuyết Cổ Khố", "cổ khố", 12, "Kho tàng bị băng phong, còn lưu lại trận bàn và khí phôi từ nhiều kỷ nguyên trước.", ["Băng Khôi", "Hàn Phong Linh"], ["Cổ trận tinh", "Khí phôi băng ngọc"], ["Khố Quan Lãnh Sương"]),
          S("hanthien_cung", "Hàn Thiên Nội Cung", "tiên cung", 13, "Nội cung sâu nhất, nơi hàn mạch và thành trận hợp thành một lĩnh vực gần như bất động.", ["Băng Giáp Vệ", "Thái Cổ Băng Linh"], ["Hàn tiên ngọc", "Băng tâm"], ["Hàn Thiên Thành Chủ"], "Thái Cổ Băng Ly"),
        ]),
    ],
  });
})();
