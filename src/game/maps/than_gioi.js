/* Thần Giới: map lớn độc lập dành cho expansion sau Tiên Giới. Dữ liệu khu vực đã dựng trước nhưng vẫn preview-only. */
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
    id: "than_gioi",
    name: "Thần Giới",
    subtitle: "Thái Sơ Thần Vực",
    playable: false,
    status: "preview",
    preview: "assets/maps/than_world.webp",
    unlockText: "Chưa mở — tuyến Thần Giới đã tách module và quy hoạch khu vực, nhưng progression sau Tiên Giới chưa được kích hoạt.",
    desc: "Thần vực cao hơn Tiên Giới. Bốn khu vực đầu tiên đã có địa điểm, thế lực, tài nguyên và BOSS dự kiến để expansion sau này không phải nhét vào gameplay Hạ Giới.",
    regions: [
      R("nhatdieu", "Nhật Diệu Thần Đình", 1, "thần đình · nhật vực", 13,
        "Thần đình đón bình minh trên vô tận vân hải, mọi kiến trúc đều vận hành bằng nhật diệu thần quang.",
        "Nhật Diệu Thần Đình", ["Nhật diệu tinh", "Thần kim", "Dương viêm tủy"], [
          S("nhatdieu_mon", "Kim Quang Thần Môn", "thần môn", 13, "Cổng ngoài của thần đình, nơi thần quang tạo thành từng tầng kết giới vàng rực.", ["Kim Quang Thần Vệ", "Nhật Linh"], ["Thần kim", "Nhật diệu tinh"], ["Thần Môn Chấp Sự"]),
          S("nhatdieu_dai", "Cửu Nhật Quang Đài", "thần đài", 13, "Chín vòng quang luân treo trên thần đài, dùng để tôi luyện thần thể và pháp khí.", ["Dương Viêm Linh", "Quang Giáp Khôi"], ["Dương viêm tủy", "Quang tinh"], ["Quang Đài Tư Tế"]),
          S("nhatdieu_dien", "Nhật Diệu Chính Điện", "thần điện", 14, "Chính điện ở tâm thần vực, thần uy dày đến mức không gian cũng bị ép thành từng tầng sóng sáng.", ["Kim Quang Thần Vệ", "Dương Viêm Linh"], ["Nhật diệu thần tinh", "Thần văn vàng"], ["Nhật Diệu Điện Chủ"], "Cửu Dương Thần Điểu"),
        ]),
      R("tinhhoan", "Tinh Hoàn Thần Khuyết", 2, "tinh vực · thần khuyết", 14,
        "Thần khuyết giữa tinh hoàn, nguyệt luân và cổ trận treo trên trời cao, chuyên quản thần trận và tinh lộ.",
        "Tinh Hoàn Thần Khuyết", ["Tinh hoàn ngọc", "Thần trận sa", "Nguyệt hạch"], [
          S("tinhhoan_lo", "Tinh Hoàn Cổ Lộ", "tinh lộ", 14, "Con đường lát bằng tinh ngọc, mỗi bước đi qua một lớp trọng lực và tinh áp khác nhau.", ["Tinh Giáp Thần Khôi", "Tinh Thực Linh"], ["Tinh hoàn ngọc", "Tinh trần"], ["Tinh Lộ Dẫn Giả"]),
          S("tinhhoan_tran", "Vạn Tượng Thần Trận", "trận vực", 14, "Đại trận mô phỏng chuyển động của hàng nghìn tinh thể, dùng để diễn hóa và phá giải thần thuật.", ["Trận Linh", "Tinh Thực Linh"], ["Thần trận sa", "Trận tâm mảnh"], ["Đại Trận Sư Cơ Huyền"]),
          S("tinhhoan_khuyet", "Tinh Hoàn Chủ Khuyết", "thần khuyết", 15, "Chủ khuyết nằm trong vòng tinh hoàn lớn nhất, nơi cổ trận và thần hạch liên kết thành một ý chí thống nhất.", ["Tinh Giáp Thần Khôi", "Trận Linh"], ["Nguyệt hạch", "Tinh thần ngọc"], ["Tinh Hoàn Khuyết Chủ"], "Tinh Hà Cổ Thú"),
        ]),
      R("nganha", "Ngân Hà Thần Vực", 3, "ngân hà · băng tinh", 15,
        "Vực trời băng ngân, tinh hà xoáy quanh những thần điện cổ; thời gian và không gian có những vùng sai lệch bất thường.",
        "Ngân Hà Cổ Điện", ["Ngân hà tinh", "Không thần thạch", "Thời sa"], [
          S("nganha_ben", "Ngân Hà Thần Bến", "thần bến", 15, "Bến đậu cho thần chu vượt tinh hà, neo bằng xích không gian thay vì dây cáp thông thường.", ["Tinh Hà Du Linh", "Không Gian Thú"], ["Ngân hà tinh", "Không thần thạch"], ["Thần Chu Chủ Bạch Tinh"]),
          S("nganha_vuc", "Thời Sa Hư Vực", "hư vực", 15, "Một dải hư không nơi thời sa chảy ngược từng nhịp, cực khó duy trì thần thức ổn định.", ["Thời Sa Linh", "Không Gian Thú"], ["Thời sa", "Hư tinh"], ["Thời Vực Quan Sát Giả"]),
          S("nganha_dien", "Ngân Hà Cổ Điện", "cổ thần điện", 16, "Cổ điện trôi giữa tinh hà, các cột đá khắc thần văn đã tồn tại từ trước khi nhiều tiên vực hình thành.", ["Tinh Hà Du Linh", "Thời Sa Linh"], ["Ngân hà thần tinh", "Cổ thần văn"], ["Cổ Điện Thủ Hộ Giả"], "Ngân Hà Thần Long"),
        ]),
      R("thaiso", "Thái Sơ Thiên Cung", 4, "thái sơ · thiên cung", 16,
        "Thiên cung cực bắc, thần quang trắng bạc xuyên qua biển mây; vật chất và linh lực đều trở nên gần với trạng thái nguyên sơ.",
        "Thái Sơ Thiên Cung", ["Thái sơ tinh", "Hỗn nguyên ngọc", "Thiên cung thần tủy"], [
          S("thaiso_giai", "Thái Sơ Thần Giai", "thần giai", 16, "Bậc thang trắng kéo dài qua biển mây, mỗi tầng làm suy yếu pháp tắc ngoại lai.", ["Thái Sơ Linh", "Hỗn Nguyên Khôi"], ["Thái sơ tinh", "Bạch thần ngọc"], ["Thần Giai Thủ Vệ"]),
          S("thaiso_vien", "Hỗn Nguyên Thần Viện", "thần viện", 16, "Thần viện nghiên cứu pháp tắc nguyên sơ, nơi các dòng thần lực chưa phân hóa thành thuộc tính cụ thể.", ["Hỗn Nguyên Linh", "Thái Sơ Linh"], ["Hỗn nguyên ngọc", "Pháp tắc mảnh"], ["Viện Chủ Vô Cực"]),
          S("thaiso_cung", "Thái Sơ Thiên Cung", "thiên cung", 17, "Trung tâm cao nhất của tuyến Thần Giới hiện được quy hoạch; mọi thần lực xung quanh đều quy về một điểm nguyên sơ.", ["Hỗn Nguyên Khôi", "Hỗn Nguyên Linh"], ["Thiên cung thần tủy", "Thái sơ thần hạch"], ["Thái Sơ Cung Chủ"], "Thái Sơ Thần Hoàng"),
        ]),
    ],
  });
})();
