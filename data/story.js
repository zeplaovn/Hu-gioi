/* HƯ GIỚI · VẠN KIẾP TÀNG THƯ · dữ liệu tự sự thuần.
   Xưng hô: NPC gọi người chơi là “đạo hữu” hoặc “ngươi”; Tàng Phong Lão Nhân
   dùng “đồ đệ”, người chơi xưng “ta” hay “đệ tử” theo quan hệ.
   Tên cổ là tên trong truyện, không thay tên vùng/điều kiện trong game. */
(function (root) {
  'use strict';
  const ACTS = [
  {
    "id": "ha",
    "title": "Tàn Ấn Nhân Gian",
    "world": "Hạ Giới",
    "chapters": [
      {
        "id": "ha-01",
        "title": "Khách Lạ Dưới Trời Tàn",
        "unlock": {
          "realm": 0
        },
        "zone": 0,
        "text": "Thanh Vân Sơn, cổ danh Vân Tẫn Sơn, quanh năm chìm trong những tầng mây xám. Khi dừng chân trước vách đá, đạo hữu nhận ra một nét khắc quen thuộc: chính hình dạng ấy từng phủ kín bầu trời Trái Đất, vào đêm trận văn cuốn người khỏi nhân gian. Trần Minh nói lối mòn này đã có trước cả những sơn môn đầu tiên, nhưng chẳng ai biết ai đã khắc chữ. Tiếng chuông chiều vọng qua khe núi, nhắc đạo hữu rằng đường về vẫn chưa tìm thấy. Dù vậy, lần đầu tiên kể từ ngày lạc giới, một dấu vết của cố hương đã xuất hiện giữa nơi xa lạ."
      },
      {
        "id": "ha-02",
        "title": "Trúc Hải Tàng Cơ",
        "unlock": {
          "realm": 1
        },
        "zone": 1,
        "text": "Trúc Ảnh Lâm có một khoảng rừng già, người địa phương gọi là Mặc Trúc U Lâm. Khi gió đi ngang những thân trúc rỗng, âm thanh nghe như tiếng ai đối đáp sau tấm rèm. Vũ Tiểu Thanh kể từng gặp một lữ khách không biết mình từ đâu đến, chỉ ôm chặt vật nhỏ mang theo từ quê nhà. Người ấy đã rời đi trước mùa mưa, không để lại tên họ. Đạo hữu nhìn những dấu chân bị rêu phủ, tự hỏi có bao nhiêu người cùng chịu cảnh tha hương. Không một lời đồn nào đủ thành chứng cứ, nhưng nỗi cô độc đã bớt nặng hơn một phần."
      },
      {
        "id": "ha-03",
        "title": "Một Kiếm Hỏi Chính Tà",
        "unlock": {
          "realm": 2
        },
        "zone": 2,
        "text": "Trên Vạn Kiếm Phong, cổ danh Thiên Nhẫn Kiếm Nhai, gió lướt qua vách dựng phát tiếng ngân như thép. Tô Nhược Vân tin kiếm rút ra phải biết bảo vệ ai; Diệp Hồng Y cho rằng giao đấu mới thử được lòng người. Họ tranh luận, rồi cùng im lặng trước vết nứt trên trận thạch hộ sơn. Đạo hữu nhớ lại đêm thiên biến: lúc ấy chẳng có ai đủ sức chặn những ký tự tràn xuống nhân gian. Mỗi đạo tu hành có thể chọn con đường khác nhau, nhưng khi tai kiếp đến, điều đáng hỏi không chỉ là ai thắng, mà còn là ai đứng lại giữ đường cho kẻ yếu."
      },
      {
        "id": "ha-04",
        "title": "Huyền Quy Phụ Cổ Văn",
        "unlock": {
          "realm": 3
        },
        "zone": 3,
        "text": "Từ Nguyên Anh Cốc, cổ danh Quy Văn U Cốc, đạo hữu tìm thấy bản dập được mang về từ Di tích Huyền Quy. Tạ Thiên Cơ đã đối chiếu từng nét suốt nhiều năm, riêng ký tự ở giữa vẫn khuyết một phần. Khi đạo hữu phác lại trận văn từng xuất hiện trên trời Trái Đất, khoảng khuyết bất ngờ trùng khớp. Tạ Thiên Cơ không vội kết luận, bởi một nét đúng chưa thể giải nghĩa cả trận pháp. Nhưng đạo hữu đã có lý do để tin tai biến năm ấy không hoàn toàn không dấu vết. Những người để lại bia đá có thể biết điều mà cả Hư Giới hôm nay đã quên."
      },
      {
        "id": "ha-05",
        "title": "Vạn Thệ Vấn Đạo Tâm",
        "unlock": {
          "realm": 4
        },
        "zone": 4,
        "text": "Hóa Thần Đài từng được gọi là Vạn Thệ Đài, nơi người vượt một bước lớn thường để lại lời hứa trước trời đất. Đạo hữu đã đi qua những người hộ trận ở Thanh Vân Tông, kiếm khách của Huyết Sát Môn và dược sư từ Vạn Dược Cốc. Họ không chung đường, nhưng ai cũng có điều muốn giữ. Trên bậc đá cao nhất, nỗi nhớ Trái Đất vẫn nguyên vẹn, còn Hư Giới đã không hoàn toàn xa lạ. Đạo hữu không thề quên cố hương, cũng không vội nhận nơi này làm nhà; chỉ tự nhắc rằng hành trình tìm lối về không được xem nhẹ những người đang sống bên mình.",
        "choices": [
          {
            "id": "tim-ve",
            "label": "Ta vẫn muốn tìm đường về cố hương.",
            "reply": "Lời hẹn hướng về quê nhà được lưu lại, không phủ nhận tình nghĩa ở Hư Giới."
          },
          {
            "id": "giu-loi",
            "label": "Ta muốn giữ lời với người ở lại.",
            "reply": "Lời hẹn với người ở lại được lưu lại, không xóa ký ức về quê nhà."
          }
        ]
      }
    ]
  },
  {
    "id": "linh",
    "title": "Thiên Khuyết Cựu Ước",
    "world": "Linh Giới",
    "chapters": [
      {
        "id": "linh-01",
        "title": "Hư Uyên Vô Hồi",
        "unlock": {
          "realm": 5
        },
        "zone": 5,
        "text": "Hư Không Cảnh, trong cổ lục còn gọi là Liệt Giới Uyên, mở ra như vực sâu không đáy. Phù thạch trôi qua mang chữ viết của những thời đại không ai còn nhớ. Có mảnh nhắc đến bầu trời chưa từng có trên địa đồ Hư Giới; có mảnh chỉ lưu lời người lữ khách nói mình vẫn tìm đường về nhà. Đạo hữu lần theo những dấu văn ấy và nhận ra trận pháp cổ có lẽ từng nối các cõi cách xa nhau vô tận. Nhưng không một phiến đá nào ghi rằng người viết đã trở về. Sự im lặng ấy đáng sợ hơn một lời cảnh báo, bởi con đường mở ra chưa chắc có lối quay đầu."
      },
      {
        "id": "linh-02",
        "title": "Song Mệnh Đồng Quy",
        "unlock": {
          "realm": 6
        },
        "zone": 6,
        "text": "Hợp Thể Sơn, cổ danh Song Mệnh Lĩnh, có hai dòng suối chảy cạnh nhau mà không hòa cho tới cuối núi. Một người giữ đồi kể chuyện tu sĩ sau nhiều kiếp đã quên giọng mẹ, nhưng vẫn thuộc giai điệu người từng hát. Đạo hữu chợt nghĩ ngày trở về Trái Đất, mình có thể đã thành người quá khác. Cảnh giới cao giúp nhìn xa hơn, không giữ hộ từng kỷ niệm bé nhỏ. Đêm đó, đạo hữu ghi lại vài điều của nhân gian vào Thiên Thư: một buổi chiều, một tên phố, một giọng nói. Không phải để níu thời gian, mà để nhớ vì sao bản thân bắt đầu đi tìm lối cũ."
      },
      {
        "id": "linh-03",
        "title": "Thiên Thư Vô Chủ",
        "unlock": {
          "realm": 7
        },
        "zone": 7,
        "text": "Giữa Đại Thừa Thiên có một đài quan tinh cũ, cổ danh Thái Văn Thiên. Mảnh ký lục từ Thái Cổ Tiên Phủ nói về những tu sĩ từng cùng nghiên cứu trận văn trước thời thiên đạo tái lập. Người viết không kể danh hiệu tiên nhân, chỉ ghi tên những người đã đứng giữ cửa trận khi các cõi va vào nhau. Có người muốn khép toàn bộ lối xuyên giới để ngăn tai họa; có người xin chừa đường cho kẻ bị cuốn khỏi quê nhà. Cuộc tranh luận không có câu kết. Đạo hữu hiểu rằng trật tự của ngày hôm nay có thể bắt nguồn từ một lời hẹn còn dang dở của người xưa.",
        "choices": [
          {
            "id": "mo-loi",
            "label": "Giữ một đường về cho người lạc giới.",
            "reply": "Trang sách ghi nhận mong ước mở lối, không phán ai đúng sai."
          },
          {
            "id": "ho-gioi",
            "label": "Tìm cách giữ an toàn cho các giới.",
            "reply": "Trang sách ghi nhận ý nguyện hộ giới, không phán ai đúng sai."
          }
        ]
      },
      {
        "id": "linh-04",
        "title": "Cửu Tiêu Vấn Kiếp",
        "unlock": {
          "realm": 8
        },
        "zone": 8,
        "text": "Trên Cửu Cửu Kiếp Đài, cổ danh Cửu Tiêu Lôi Quan, tầng mây kiếp cuộn thành những lớp cửa thành. Từ xa, Thiên Môn Kiếp Hải vọng tiếng sấm không dứt. Giữa một phiến đá nứt, đạo hữu đọc được câu chữ cổ: thiên kiếp thử đạo tâm, không thay sinh linh chọn đường. Không ai biết người khắc lời ấy đã vượt qua được biển kiếp hay chưa. Đứng trước trời cao, đạo hữu không cầu một lời phán rằng mình phải trở về hay ở lại. Nếu thiên đạo đang được dựng lại, điều quan trọng hơn cả là người đi trên tiên lộ có dám nhận lấy hậu quả từ lựa chọn của mình."
      }
    ]
  },
  {
    "id": "tien",
    "title": "Hồng Mông Vấn Đạo",
    "world": "Tiên Giới",
    "chapters": [
      {
        "id": "tien-01",
        "title": "Tiên Khuyết Vô Danh",
        "unlock": {
          "realm": 9
        },
        "zone": 9,
        "text": "Chân Tiên Điện, cổ danh Khuyết Tượng Tiên Điện, không dựng tượng của một vị chủ nhân nào. Trên tường là những ô trống khắc tên người từng góp sức sửa những lối qua hư không. Họ khác quê quán, khác tiếng nói, có người thậm chí không cùng một bầu trời sinh trưởng. Đạo hữu tìm mãi mà chẳng thấy tên người đứng đầu để trách hay cảm tạ. Có lẽ thiên đạo tái lập không bắt đầu từ một mệnh lệnh duy nhất, mà từ vô số bàn tay giữ cho thế giới khỏi đổ vỡ. Trước những tấm bia lặng im, đạo hữu cúi đầu với những người đã đi trước, không hỏi họ thuộc chính đạo hay tà đạo."
      },
      {
        "id": "tien-02",
        "title": "Vạn Hải Tầm Cố Hương",
        "unlock": {
          "realm": 10
        },
        "zone": 10,
        "text": "Kim Tiên Hải có một vùng nước tĩnh, cổ danh Hoài Ức Hải. Kẻ soi xuống thường không thấy dung nhan, mà thấy một cảnh nhỏ tưởng đã quên: tiếng mưa bên cửa kính, con đường về nhà, chiếc bàn còn dở bữa cơm. Đạo hữu đứng rất lâu mà không đưa tay khuấy nước. Nỗi nhớ Trái Đất không còn là cơn đau dữ dội của kẻ mới lạc giới, nhưng vẫn bền bỉ như một lời nhắc. Muốn trở về là điều chính đáng; muốn bảo vệ những người từng giúp mình trên tiên lộ cũng vậy. Mặt biển không chọn thay ai, chỉ giữ cả hai điều trong cùng một khoảng lặng."
      },
      {
        "id": "tien-03",
        "title": "Cổ Khế Phong Thiên",
        "unlock": {
          "realm": 11
        },
        "zone": 11,
        "text": "Ở Thái Ất Cung, cổ danh Thệ Thiên Cổ Cung, đạo hữu đọc được hai bản của một giao ước. Bản đầu khuyên đóng mọi nẻo xuyên giới, tránh tai họa lan sang nơi khác. Bản sau xin để lại lối về cho những người bị trận văn cuốn khỏi cố hương. Cả hai đều mang dấu sửa dở, không bản nào ghi lời chấp thuận cuối. Đạo hữu hiểu trật tự không thể được giữ bằng cách bỏ mặc kẻ lạc đường, nhưng mở hết cửa cũng có thể mang nguy hiểm đến những người chưa chuẩn bị. Thiên đạo tái lập chưa chắc là câu trả lời trọn vẹn; có khi chỉ là cơ hội để muôn sinh linh cùng tìm đáp án."
      },
      {
        "id": "tien-04",
        "title": "Đại Đạo Quy Nhất",
        "unlock": {
          "realm": 12
        },
        "zone": 12,
        "text": "Đại La Thiên, cổ danh Vạn Ảnh Thiên, không có gương mà lại hiện ra muôn dáng người. Đạo hữu thấy mình khi vừa rơi vào Hư Giới, thấy những lần lạc đường và những lời hứa từng giữ. Mỗi bóng hình đều muốn kể rằng con đường của mình mới đúng. Nhưng một đời tu hành không thể thu lại thành một lần thắng bại, cũng không thể xóa hết nợ ân tình nhờ cảnh giới cao. Đạo hữu nhìn những hình bóng tan dần rồi giữ lại một điều: thành tiên không phải quên mình từng là người. Con đường vô tận chỉ có ý nghĩa khi chính kẻ bước đi biết vì sao phải đi tiếp."
      },
      {
        "id": "tien-05",
        "title": "Một Nét Định Hồng Mông",
        "unlock": {
          "realm": 13
        },
        "zone": 13,
        "text": "Hồng Mông Đạo Vực, cổ danh Sơ Nguyên Đạo Vực, mở ra không bờ bến mà chẳng vang lời tuyên cáo của đấng tối cao. Trong khoảng trống chỉ còn một nét trận văn chưa viết trọn, giống dấu khuyết Tạ Thiên Cơ từng tìm trên bản dập Huyền Quy. Đạo hữu biết mình không thể thay muôn sinh linh định đoạt tương lai, càng không thể cưỡng ép trời đất mở cửa về cố thổ. Nét bút cuối vì thế không phải mệnh lệnh, mà là lời hẹn: để kẻ đến sau vẫn có quyền tìm kiếm và lựa chọn. Vạn kiếp còn dài, song từ đây đạo hữu đã có câu trả lời cho chính mình.",
        "choices": [
          {
            "id": "mo-duong",
            "label": "Để lại một lối cho người đi sau.",
            "reply": "Lời hẹn được lưu lại, không ép thiên địa phải nghe theo."
          },
          {
            "id": "giu-ky-uc",
            "label": "Giữ ký ức người lạc giới.",
            "reply": "Lời hẹn được lưu lại, không ép thiên địa phải nghe theo."
          }
        ]
      }
    ]
  }
];
  const NPCS = {};
  const DUNGEONS = {};
  const ENCOUNTERS = {};
  const TRIBULATION = {};
  const data = { ACTS, NPCS, DUNGEONS, ENCOUNTERS, TRIBULATION };
  root.HU_STORY_DATA = data;
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
})(typeof window !== 'undefined' ? window : globalThis);
