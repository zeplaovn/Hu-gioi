/* Hạ Giới: dữ liệu map gameplay độc lập. Mỗi vực có các địa điểm riêng để mở rộng quái, tài nguyên, NPC và sự kiện. */
"use strict";
(function () {
  if (!window.TT?.maps) return;

  const S = (id, name, kind, reward, danger, desc, monsters, resources, npcs) => ({
    id, name, kind, reward, danger, desc, monsters, resources, npcs,
  });
  const R = (id, name, realm, reward, danger, desc, biome, sites) => ({
    id, name, realm, reward, danger, desc, biome, sites,
  });

  const world = TT.maps.register({
    id: "ha_gioi",
    name: "Hạ Giới",
    subtitle: "Thiên Vân Đại Lục",
    playable: true,
    desc: "Cửu vực từ phàm tục tới Thiên Môn. Mỗi vực có địa điểm, sinh vật, tài nguyên và nhân vật riêng; cảnh giới càng cao thì lợi ích và hiểm nguy càng lớn.",
    regions: [
      R("pham", "Phàm Nhân Thành", 0, 1.00, 0, "Thành trấn và núi rừng quanh nơi nhập đạo.", "nhân gian", [
        S("pham_thanh", "Thanh Khê Thành", "thành trấn", 1.00, 0, "Chợ phàm, khách điếm và những con đường dẫn tới tiên đồ.", ["Hắc Lang", "Hoang Thử Yêu"], ["Dược thảo thường", "Khoáng thạch thô"], ["Lão Dược Sư", "Tiểu Nhị Khách Điếm"]),
        S("pham_rung", "Thanh Khê Lâm", "hoang dã", 1.03, 1, "Rừng ngoại thành, nơi yêu thú non thường xuất hiện.", ["Hắc Lang", "Độc Xà"], ["Thanh Diệp Thảo", "Mộc linh quả"], ["Thợ Săn Họ Tần"]),
        S("pham_mieu", "Cổ Miếu Vô Danh", "di tích", 1.06, 1, "Ngôi miếu đổ nát có dấu tích của một vị tán tu đã mất.", ["Hoang Thử Yêu", "Độc Xà"], ["Mảnh phù cũ", "Linh sa"], ["Du Phương Đạo Sĩ"]),
      ]),
      R("thanhvan", "Thanh Vân Sơn", 1, 1.08, 1, "Linh mạch sơ khai, yêu thú Luyện Khí thường lui tới.", "linh sơn", [
        S("thanhvan_chan", "Thanh Vân Sơn Môn", "sơn môn", 1.00, 0, "Chân núi tụ tập tán tu và thương đội đổi vật tư.", ["Thiết Giáp Hùng", "Huyết Điêu"], ["Hạ phẩm linh thảo", "Thanh linh thạch"], ["Chấp Sự Thanh Vân", "Tán Tu Lục An"]),
        S("thanhvan_khe", "Linh Tuyền Khê", "linh địa", 1.04, 1, "Khe suối linh khí đậm, thích hợp tìm linh dược sơ cấp.", ["Huyết Điêu", "Kiếm Xỉ Hổ"], ["Linh Tuyền Thảo", "Ngọc Lộ Hoa"], ["Dược Đồng A Ninh"]),
        S("thanhvan_dinh", "Vọng Vân Đài", "hiểm địa", 1.08, 2, "Vách đá cao đón thiên phong, thường có yêu cầm làm tổ.", ["Huyết Điêu", "Kiếm Xỉ Hổ"], ["Phong linh vũ", "Vân tinh"], ["Kiếm Tu Mạc Vân"]),
      ]),
      R("vanyeu", "Vạn Yêu Lâm", 2, 1.16, 2, "Rừng yêu khí dày đặc, tài nguyên Trúc Cơ phong phú.", "yêu lâm", [
        S("vanyeu_ngoai", "Ngoại Lâm", "rừng rậm", 1.00, 1, "Tầng rừng ngoài cùng, dấu chân yêu thú phủ kín lối mòn.", ["Ma Hầu", "Thanh Giao"], ["Yêu huyết thảo", "Thiết mộc"], ["Liệp Yêu Nhân Cố Tam"]),
        S("vanyeu_hothuy", "Hồ Thúy Tâm", "hồ linh", 1.05, 2, "Hồ sâu giữa rừng, thủy linh khí và yêu khí giao thoa.", ["Thanh Giao", "Hỏa Lân Thú"], ["Thủy linh liên", "Giao lân vụn"], ["Yêu Tu Bạch Ly"]),
        S("vanyeu_cay", "Cổ Thụ Yêu Đình", "yêu địa", 1.10, 3, "Cổ thụ ngàn năm che kín bầu trời, yêu khí mạnh hơn hẳn ngoại vi.", ["Ma Hầu", "Hỏa Lân Thú"], ["Mộc tâm", "Yêu đan mảnh"], ["Mộc Linh Ông"]),
      ]),
      R("hacphong", "Hắc Phong Cốc", 3, 1.25, 3, "Kim Đan tu sĩ tranh đoạt di tích trong cốc sâu.", "hắc cốc", [
        S("hacphong_cua", "Phong Khẩu", "cốc khẩu", 1.00, 2, "Hắc phong quét qua khe đá, thích hợp cho tu sĩ mới bước vào Kim Đan.", ["Cửu Vĩ Hồ", "Kim Dực Bằng"], ["Hắc phong thạch", "Kim sa"], ["Tán Tu Hàn Phong"]),
        S("hacphong_mo", "Cổ Khoáng Động", "khoáng động", 1.05, 3, "Khoáng động cổ có dấu vết trận pháp bị phá.", ["Huyền Quy", "Cửu Vĩ Hồ"], ["Huyền thiết", "Tinh kim"], ["Luyện Khí Sư Lương Hạo"]),
        S("hacphong_dai", "Tàn Trận Đài", "di tích", 1.10, 4, "Trận đài hoang phế vẫn còn dư uy Kim Đan.", ["Kim Dực Bằng", "Huyền Quy"], ["Trận kỳ tàn", "Kim đan sa"], ["Trận Sư Tử Mặc"]),
      ]),
      R("thienha", "Thiên Hà Hải", 4, 1.35, 4, "Hải vực Nguyên Anh, linh triều và hải thú cùng tồn tại.", "linh hải", [
        S("thienha_cang", "Thiên Hà Cảng", "hải cảng", 1.00, 3, "Bến tàu của tu sĩ Nguyên Anh và thương hội xuyên hải vực.", ["Thôn Thiên Mãng", "Long Tử"], ["Hải linh châu", "Lam tinh thạch"], ["Thuyền Chủ Tô Hải", "Thương Nhân Kỷ Lam"]),
        S("thienha_dao", "Lưu Vân Quần Đảo", "quần đảo", 1.05, 4, "Các đảo nhỏ nổi theo linh triều, tài nguyên biến đổi theo thủy vận.", ["Long Tử", "Phượng Hoàng Ảnh"], ["Hải tâm thảo", "Vân san hô"], ["Đảo Chủ Lạc Hà"]),
        S("thienha_vuc", "Hải Nhãn Thâm Uyên", "thâm uyên", 1.10, 5, "Hải nhãn xoáy sâu, linh áp cực lớn và hải thú mạnh thường tuần du.", ["Thôn Thiên Mãng", "Phượng Hoàng Ảnh"], ["Hải nhãn tinh", "Long tức thạch"], ["Ẩn Tu Hải Lão"]),
      ]),
      R("hoangco", "Hoang Cổ Chi Địa", 5, 1.46, 5, "Di tích Hóa Thần, cổ thi và dị tượng không ngừng xuất hiện.", "hoang cổ", [
        S("hoangco_bien", "Hoang Cổ Biên Thành", "cứ điểm", 1.00, 4, "Cứ điểm cuối cùng trước vùng di tích cổ.", ["Hư Không Ma Ảnh", "Lôi Giao"], ["Cổ thiết", "Lôi văn thạch"], ["Trấn Thủ Vệ Dương"]),
        S("hoangco_mo", "Cổ Mộ Quần", "cổ mộ", 1.06, 5, "Mộ táng của các tông môn đã biến mất trong lịch sử.", ["Vạn Niên Cổ Thi", "Hư Không Ma Ảnh"], ["Âm linh ngọc", "Cổ văn mảnh"], ["Khảo Cổ Tu Sĩ Mạnh Huyền"]),
        S("hoangco_dien", "Thái Cổ Tàn Điện", "di tích", 1.12, 6, "Tàn điện Hóa Thần, dị tượng thường xuất hiện vào lúc linh triều đổi hướng.", ["Lôi Giao", "Vạn Niên Cổ Thi"], ["Thần văn thạch", "Cổ bảo mảnh"], ["Tàn Hồn Cổ Tu"]),
      ]),
      R("hukhong", "Hư Không Liệt Cốc", 6, 1.58, 6, "Không gian rạn vỡ, chỉ Luyện Hư mới đủ sức đặt chân.", "hư không", [
        S("hukhong_tram", "Liệt Không Trạm", "tiền đồn", 1.00, 5, "Tiền đồn được dựng trên một mảnh không gian tương đối ổn định.", ["Thái Hư Cổ Thú", "Hư Không Liệt Ma"], ["Không gian tinh", "Hư linh sa"], ["Không Gian Sư Phong Tịch"]),
        S("hukhong_cau", "Đoạn Không Kiều", "hư lộ", 1.06, 6, "Cầu đá gãy nối giữa các mảnh không gian trôi nổi.", ["Hư Không Liệt Ma", "Kim Sí Thiên Bằng"], ["Hư không thạch", "Phong giới tinh"], ["Du Hành Giả Vô Danh"]),
        S("hukhong_tam", "Hư Không Tâm Nhãn", "liệt vực", 1.12, 7, "Tâm điểm vết nứt, không gian chi lực có thể xé nát hộ thể linh quang.", ["Thái Hư Cổ Thú", "Kim Sí Thiên Bằng"], ["Giới tinh", "Thái hư mảnh"], ["Hư Ảnh Đạo Nhân"]),
      ]),
      R("dangthien", "Đăng Thiên Cổ Lộ", 7, 1.72, 7, "Con đường Đại Thừa hướng tới Thiên Môn.", "cổ lộ", [
        S("dangthien_chan", "Cổ Lộ Khởi Điểm", "thiên lộ", 1.00, 6, "Bậc đá đầu tiên của con đường từng có vô số Đại Thừa đi qua.", ["Hoang Cổ Chân Long Ảnh", "Đại Thừa Khôi Lỗi"], ["Thiên lộ thạch", "Long văn mảnh"], ["Thủ Lộ Nhân"]),
        S("dangthien_dai", "Vấn Đạo Thiên Đài", "đạo đài", 1.06, 7, "Đạo đài thử tâm, nơi chấp niệm của người đi trước còn lưu lại.", ["Đại Thừa Khôi Lỗi", "Vô Tướng Ma Quân"], ["Đạo văn tinh", "Tâm ngọc"], ["Vấn Đạo Lão Nhân"]),
        S("dangthien_cua", "Thiên Môn Ngoại Quan", "cửa ải", 1.12, 8, "Cửa ải cuối của cổ lộ, đã có thể cảm nhận lôi kiếp từ Thiên Môn.", ["Hoang Cổ Chân Long Ảnh", "Vô Tướng Ma Quân"], ["Kiếp lôi tinh", "Thiên môn ngọc"], ["Ngoại Quan Trấn Sứ"]),
      ]),
      R("thienmon", "Thiên Môn Sơn", 8, 1.88, 8, "Đỉnh Hạ Giới, nơi lôi kiếp và khí tức phi thăng giao nhau.", "thiên môn", [
        S("thienmon_chan", "Thiên Môn Sơn Đạo", "sơn đạo", 1.00, 7, "Sơn đạo phủ lôi vân, mỗi bước đều chịu thiên uy áp chế.", ["Cửu Tiêu Lôi Linh", "Thiên Môn Thủ Vệ"], ["Lôi tinh", "Thiên vân ngọc"], ["Hộ Sơn Linh"]),
        S("thienmon_kiep", "Cửu Tiêu Kiếp Hải", "kiếp địa", 1.06, 8, "Lôi hải quanh đỉnh núi, nơi Độ Kiếp tu sĩ rèn thân trước phi thăng.", ["Cửu Tiêu Lôi Linh", "Kiếp Hải Ma Thần"], ["Kiếp lôi châu", "Cửu tiêu tinh"], ["Độ Kiếp Tán Tu Cố Thanh"]),
        S("thienmon_dinh", "Phi Thăng Đài", "thiên đài", 1.12, 9, "Đỉnh cao nhất Hạ Giới, Thiên Môn hiện ra sau tầng tầng lôi vân.", ["Thiên Môn Thủ Vệ", "Kiếp Hải Ma Thần"], ["Phi thăng ngọc", "Thiên đạo mảnh"], ["Thiên Môn Dẫn Lộ Sứ"]),
      ]),
    ],
  });

  // Compatibility bridge cho gameplay cũ; nguồn dữ liệu thật nằm duy nhất trong module map này.
  TT.HA_GIOI_REGIONS = world.regions;
})();
